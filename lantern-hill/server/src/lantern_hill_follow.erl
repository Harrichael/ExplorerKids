%% Follows a git branch: polls the remote every few seconds and puts each new commit live on
%% this running node. The frontend moves through the version owner like any other edit; server
%% code is rebuilt and hot-loaded. A commit goes live whole or not at all: if anything fails
%% (a compile error, old code still running, a changed dependency) the node stays on the last
%% good commit and waits for the branch to move again.
%%
%% Run with FOLLOW_BRANCH=<branch> (and optionally FOLLOW_INTERVAL=<seconds>, 3-10, default 5).
%% The branch is checked out in a directory of its own, never the working copy you edit.
-module(lantern_hill_follow).
-behaviour(gen_server).

-export([enabled/0, start_link/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2]).

enabled() -> branch() =/= undefined.

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

branch() -> setting("FOLLOW_BRANCH", follow_branch, undefined).

interval() ->
    S = case setting("FOLLOW_INTERVAL", follow_interval, 5) of
            I when is_integer(I) -> I;
            L -> list_to_integer(L)
        end,
    1000 * max(3, min(10, S)).

setting(Var, Key, Default) ->
    case os:getenv(Var) of
        false -> application:get_env(lantern_hill, Key, Default);
        V -> V
    end.

%% The checkout happens here, before the version owner starts, because it moves the web root.
init([]) ->
    Dir = filename:absname(application:get_env(lantern_hill, follow_dir, "follow")),
    Remote = remote(),
    case filelib:is_dir(filename:join(Dir, ".git")) of
        true -> ok;
        false -> {0, _} = git(".", ["clone", "--quiet", "--branch", branch(), "--single-branch", Remote, Dir])
    end,
    ok = application:set_env(lantern_hill, web_root, filename:join([Dir, "lantern-hill", "web"])),
    self() ! poll,
    {ok, #{dir => Dir, remote => Remote, live => none, failed => none}}.

%% The supervisor starts the version owner after this process; a deploy needs it.
handle_info(poll, State) ->
    case whereis(lantern_hill_versions) of
        undefined -> erlang:send_after(100, self(), poll), {noreply, State};
        _ -> erlang:send_after(interval(), self(), poll), {noreply, poll(State)}
    end;
handle_info(_Msg, State) -> {noreply, State}.

poll(State = #{remote := Remote, live := Live, failed := Failed}) ->
    case git(".", ["ls-remote", Remote, "refs/heads/" ++ branch()]) of
        {0, [_ | _] = Out} ->
            case hd(string:split(Out, "\t")) of
                Sha when Sha =:= Live; Sha =:= Failed -> State;
                Sha -> deploy(Sha, State)
            end;
        Other ->
            logger:warning("following ~ts: cannot reach ~ts: ~p", [branch(), Remote, Other]),
            State
    end.

handle_call(_Req, _From, State) -> {reply, ok, State}.
handle_cast(_Msg, State) -> {noreply, State}.

deploy(Sha, State = #{dir := Dir, live := Live}) ->
    {0, _} = git(Dir, ["fetch", "--quiet", "origin", branch()]),
    {0, _} = git(Dir, ["reset", "--hard", "--quiet", Sha]),
    case server_changed(Dir, Live, Sha) andalso hot_load(filename:join([Dir, "lantern-hill", "server"])) of
        Result when Result =:= false; Result =:= ok ->
            lantern_hill_app:upgraded(),
            logger:notice("following ~ts: ~ts is live", [branch(), short(Sha)]),
            State#{live := Sha};
        {error, Why} ->
            logger:error("following ~ts: ~ts not applied, staying on ~ts: ~p", [branch(), short(Sha), short(Live), Why]),
            Live =/= none andalso git(Dir, ["reset", "--hard", "--quiet", Live]),
            State#{failed := Sha}
    end.

%% The first deploy always rebuilds: the node may have been started from any commit.
server_changed(_Dir, none, _Sha) -> true;
server_changed(Dir, Live, Sha) ->
    element(1, git(Dir, ["diff", "--quiet", Live, Sha, "--", "lantern-hill/server"])) =/= 0.

%% Order matters: new dependencies run before the code that needs them, every changed module
%% loads at once or none do, running servers convert their state, and only then does the
%% supervision tree reshape itself to the new code.
hot_load(Server) ->
    maybe
        {0, _} ?= run(os:find_executable("rebar3"), ["compile"], Server),
        Lib = filename:join([Server, "_build", "default", "lib"]),
        Apps = [list_to_atom(filename:basename(A)) || A <- filelib:wildcard(filename:join(Lib, "*")),
                                                      filelib:is_dir(filename:join(A, "ebin"))],
        Running = [App || {App, _, _} <- application:loaded_applications()],
        {New, Old} = lists:partition(fun(App) -> not lists:member(App, Running) end, Apps),
        Ebin = fun(App) -> filename:join([Lib, atom_to_list(App), "ebin"]) end,
        [] ?= [App || App <- Old, App =/= lantern_hill, vsn(Ebin(App), App) =/= application:get_key(App, vsn)],
        Changed = changed(Ebin(lantern_hill)),
        [] ?= [M || M <- Changed, not code:soft_purge(M)],
        [code:add_patha(Ebin(App)) || App <- New],
        [{ok, _} = application:ensure_all_started(App) || App <- New, App =/= lantern_hill],
        true ?= code:replace_path(lantern_hill, Ebin(lantern_hill)),
        ok ?= code:atomic_load(Changed),
        [convert(Pid, Mod) || {_, Pid, worker, [Mod]} <- supervisor:which_children(lantern_hill_sup),
                              is_pid(Pid), Pid =/= self(), lists:member(Mod, Changed)],
        lantern_hill_sup:reconcile()
    else
        {Status, Out} when is_integer(Status) -> {error, {compile_failed, Out}};
        [_ | _] = Blocked when is_atom(hd(Blocked)) -> {error, {needs_restart_or_busy, Blocked}};
        Error -> {error, Error}
    end.

%% Our modules whose compiled code differs from what is loaded (or isn't loaded at all).
changed(Ebin) ->
    [M || Beam <- filelib:wildcard(filename:join(Ebin, "*.beam")),
          M <- [list_to_atom(filename:basename(Beam, ".beam"))],
          {ok, {_, Md5}} <- [beam_lib:md5(Beam)],
          not (code:is_loaded(M) =/= false andalso M:module_info(md5) =:= Md5)].

%% A dependency counts as upgraded by its version, not its bytes: the same version built in
%% another directory doesn't compile to identical beams.
vsn(Ebin, App) ->
    {ok, [{application, App, Props}]} = file:consult(filename:join(Ebin, atom_to_list(App) ++ ".app")),
    {ok, proplists:get_value(vsn, Props)}.

convert(Pid, Mod) ->
    ok = sys:suspend(Pid),
    ok = sys:change_code(Pid, Mod, undefined, []),
    ok = sys:resume(Pid).

remote() ->
    case application:get_env(lantern_hill, follow_remote) of
        {ok, R} -> R;
        undefined -> {0, Url} = git(".", ["remote", "get-url", "origin"]), string:trim(Url)
    end.

short(none) -> "nothing yet";
short(Sha) -> string:slice(Sha, 0, 8).

git(Dir, Args) -> run(os:find_executable("git"), Args, Dir).

run(Exe, Args, Dir) ->
    Port = open_port({spawn_executable, Exe}, [{args, Args}, {cd, Dir}, exit_status, stderr_to_stdout, binary]),
    collect(Port, []).

collect(Port, Acc) ->
    receive
        {Port, {data, D}} -> collect(Port, [Acc, D]);
        {Port, {exit_status, S}} -> {S, unicode:characters_to_list(Acc)}
    end.
