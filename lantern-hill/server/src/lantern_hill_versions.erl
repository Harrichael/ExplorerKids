%% Owns which version of the frontend is live. A version is a content hash of the web root;
%% each one is frozen as a snapshot directory named by that hash, so a tab that loaded version A
%% keeps lazy-loading A's files after B goes live. The newest ?KEEP snapshots are retained,
%% including ones left by an earlier run, since tabs outlive server restarts too.
-module(lantern_hill_versions).
-behaviour(gen_server).

-export([start_link/0, refresh/0, current/0, subscribe/0, web_root/0, snapshot_root/0]).
-export([init/1, handle_call/3, handle_cast/2, code_change/3]).

-define(KEEP, 5).
-define(SUBSCRIBERS, lantern_hill_subscribers).
-define(LIVE, {?MODULE, live}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% Rehash the web root; a change becomes the current version and is announced to subscribers.
refresh() -> gen_server:call(?MODULE, refresh, infinity).

%% Read without asking the owner, which is busy for seconds while it snapshots a new version:
%% every page load asks, and none should wait on a publish. The call only answers for a node
%% hot-loaded from before the live version was kept here, until its next refresh.
current() ->
    case persistent_term:get(?LIVE, undefined) of
        undefined -> gen_server:call(?MODULE, current);
        V -> V
    end.

%% The caller receives {lantern_hill_version, Version} whenever the version changes.
subscribe() -> pg:join(?SUBSCRIBERS, version, self()).

%% priv/web is a symlink to ../web, so a dev build serves the frontend source as it is edited.
%% Looked up on every refresh: a release upgrade moves priv_dir to the new lib directory.
web_root() ->
    case application:get_env(lantern_hill, web_root) of
        {ok, Dir} -> Dir;
        undefined -> filename:join(code:priv_dir(lantern_hill), "web")
    end.

snapshot_root() ->
    filename:absname(application:get_env(lantern_hill, snapshot_dir, "snapshots")).

init([]) ->
    Root = snapshot_root(),
    ok = filelib:ensure_path(Root),
    {ok, update(#{root => Root, versions => adopt(Root)})}.

handle_call(refresh, _From, State0) ->
    State = #{versions := [V | _]} = update(State0),
    {reply, V, State};
handle_call(current, _From, State = #{versions := [V | _]}) ->
    {reply, V, State}.

handle_cast(_Msg, State) -> {noreply, State}.

code_change(_OldVsn, State, _Extra) -> {ok, State}.

update(State = #{root := Root, versions := Versions}) ->
    Files = read_tree(web_root()),
    V = hash(Files),
    case Versions of
        [V | _] -> persistent_term:put(?LIVE, V), State;
        _ ->
            Dir = filename:join(Root, V),
            case filelib:is_dir(Dir) of
                true -> ok = file:change_time(Dir, calendar:local_time());
                false -> write_snapshot(Dir, Files)
            end,
            Keep = lists:sublist([V | lists:delete(V, Versions)], ?KEEP),
            prune(Root, Keep),
            %% before the announcement, so a tab told about V finds V at /
            persistent_term:put(?LIVE, V),
            [Pid ! {lantern_hill_version, V} || Pid <- pg:get_members(?SUBSCRIBERS, version)],
            logger:notice("Lantern Hill frontend version ~ts", [V]),
            State#{versions := Keep}
    end.

%% Snapshots from an earlier run, newest first.
adopt(Root) ->
    {ok, Names} = file:list_dir(Root),
    Dated = [{filelib:last_modified(filename:join(Root, N)), N} || N <- Names, is_version(N)],
    [N || {_, N} <- lists:reverse(lists:sort(Dated))].

is_version(Name) -> length(Name) =:= 16 andalso lists:all(fun(C) -> lists:member(C, "0123456789abcdef") end, Name).

%% Hash and snapshot come from the same bytes, so an edit landing mid-refresh can't
%% put one version's content under another's name.
read_tree(Web) ->
    Paths = filelib:fold_files(Web, "", true, fun(P, Acc) -> [P | Acc] end, []),
    lists:sort([begin {ok, Bin} = file:read_file(P), {relative(P, Web), Bin} end
                || P <- Paths, not hidden(relative(P, Web))]).

relative(Path, Root) -> string:prefix(Path, Root ++ "/").

hidden(Rel) -> lists:any(fun([$. | _]) -> true; (_) -> false end, filename:split(Rel)).

hash(Files) ->
    Digest = erlang:md5([[Rel, 0, integer_to_list(byte_size(Bin)), 0, Bin] || {Rel, Bin} <- Files]),
    lists:sublist(binary_to_list(binary:encode_hex(Digest, lowercase)), 16).

%% Written aside and renamed into place, so a crash never leaves a half snapshot under a version's name.
write_snapshot(Dir, Files) ->
    Tmp = Dir ++ ".tmp",
    _ = file:del_dir_r(Tmp),
    [begin Out = filename:join(Tmp, Rel), ok = filelib:ensure_dir(Out), ok = file:write_file(Out, Bin) end
     || {Rel, Bin} <- Files],
    ok = file:rename(Tmp, Dir).

prune(Root, Keep) ->
    {ok, Names} = file:list_dir(Root),
    [ok = file:del_dir_r(filename:join(Root, N)) || N <- Names, not lists:member(N, Keep)],
    ok.
