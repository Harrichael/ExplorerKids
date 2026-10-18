%% Following a branch: the app is started against a local bare repository standing in for the
%% remote, and each case pushes commits to it the way a teammate would, then watches the running
%% node take them up. The repository holds a real copy of this server's code, so server pushes
%% go through the real rebuild and hot load. Cases run in order: each builds on the last push.
-module(lantern_hill_follow_SUITE).
-include_lib("stdlib/include/assert.hrl").

-export([all/0, init_per_suite/1, end_per_suite/1]).
-export([serves_the_branch_it_follows/1, a_pushed_frontend_change_reaches_open_tabs/1,
         pushed_server_code_goes_live_without_a_restart/1, a_broken_push_is_held_back_until_fixed/1]).

all() -> [serves_the_branch_it_follows, a_pushed_frontend_change_reaches_open_tabs,
          pushed_server_code_goes_live_without_a_restart, a_broken_push_is_held_back_until_fixed].

init_per_suite(Config) ->
    Priv = proplists:get_value(priv_dir, Config),
    Remote = filename:join(Priv, "remote.git"), Dev = filename:join(Priv, "dev"),
    sh(Priv, "git init --quiet --bare --initial-branch=main remote.git && git clone --quiet remote.git dev"),
    Server = filename:join([Dev, "lantern-hill", "server"]),
    Src = code:lib_dir(lantern_hill) ++ "/../../../..",
    sh(Priv, io_lib:format("mkdir -p ~ts && cd ~ts && cp -R src config rebar.config rebar.lock ~ts/",
                           [Server, Src, Server])),
    write(Dev, "lantern-hill/web/index.html", page("first")),
    push(Dev, "first"),
    {ok, _} = application:ensure_all_started(inets),
    ok = application:load(lantern_hill),
    [ok = application:set_env(lantern_hill, K, V)
     || {K, V} <- [{port, 0}, {follow_branch, "main"}, {follow_remote, Remote}, {follow_interval, 3},
                   {follow_dir, filename:join(Priv, "follow")}, {snapshot_dir, filename:join(Priv, "snapshots")}]],
    {ok, _} = application:ensure_all_started(lantern_hill),
    persistent_term:put(?MODULE, ranch:get_port(lantern_hill_http)),
    [{dev, Dev} | Config].

end_per_suite(_Config) ->
    application:stop(lantern_hill),
    application:unload(lantern_hill).

serves_the_branch_it_follows(_Config) ->
    wait(fun() -> has(fetch("/"), "first") end).

a_pushed_frontend_change_reaches_open_tabs(Config) ->
    Tab = open_updates(), Old = next_version(Tab),
    write(dev(Config), "lantern-hill/web/index.html", page("second")),
    push(dev(Config), "second"),
    ?assertNotEqual(Old, next_version(Tab)),
    ?assert(has(fetch("/"), "second")),
    gen_tcp:close(Tab).

pushed_server_code_goes_live_without_a_restart(Config) ->
    Owner = whereis(lantern_hill_versions), Tab = open_updates(), _ = next_version(Tab),
    write(dev(Config), "lantern-hill/server/src/lantern_hill_hello.erl",
          "-module(lantern_hill_hello).\n-export([hi/0]).\nhi() -> hello.\n"),
    push(dev(Config), "hello"),
    wait(fun() -> catch lantern_hill_hello:hi() =:= hello end),
    ?assertEqual(Owner, whereis(lantern_hill_versions)),
    write(dev(Config), "lantern-hill/web/index.html", page("third")),
    push(dev(Config), "third"),
    _ = next_version(Tab),
    gen_tcp:close(Tab).

a_broken_push_is_held_back_until_fixed(Config) ->
    write(dev(Config), "lantern-hill/web/index.html", page("broken")),
    write(dev(Config), "lantern-hill/server/src/lantern_hill_hello.erl", "-module(lantern_hill_hello).\nhi( ->\n"),
    Broken = push(dev(Config), "broken"),
    wait(fun() -> maps:get(failed, sys:get_state(lantern_hill_follow)) =:= Broken end),
    ?assert(has(fetch("/"), "third")),
    ?assertEqual(hello, lantern_hill_hello:hi()),
    write(dev(Config), "lantern-hill/server/src/lantern_hill_hello.erl",
          "-module(lantern_hill_hello).\n-export([hi/0]).\nhi() -> fixed.\n"),
    push(dev(Config), "fixed"),
    wait(fun() -> catch lantern_hill_hello:hi() =:= fixed end),
    ?assert(has(fetch("/"), "broken")).

page(Marker) -> "<!doctype html><html><head><title>" ++ Marker ++ "</title></head><body></body></html>\n".

dev(Config) -> proplists:get_value(dev, Config).

write(Dev, Rel, Content) ->
    Path = filename:join(Dev, Rel),
    ok = filelib:ensure_dir(Path),
    ok = file:write_file(Path, Content).

push(Dev, Msg) ->
    sh(Dev, "git add -A && git -c user.name=t -c user.email=t@t commit --quiet -m " ++ Msg ++ " && git push --quiet origin HEAD:main"),
    string:trim(os:cmd("cd " ++ Dev ++ " && git rev-parse HEAD")).

sh(Dir, Cmd) ->
    Out = os:cmd("cd " ++ Dir ++ " && (" ++ lists:flatten(Cmd) ++ ") 2>&1; echo \"exit:$?\""),
    ?assertMatch({match, _}, re:run(Out, "exit:0\n$"), Out).

%% Generous: the first deploy rebuilds the whole server.
wait(Pred) -> wait(Pred, 240).
wait(Pred, 0) -> ?assert(Pred());
wait(Pred, N) -> case Pred() of true -> ok; _ -> timer:sleep(500), wait(Pred, N - 1) end.

has(Body, Marker) -> string:find(Body, "<title>" ++ Marker ++ "</title>") =/= nomatch.

fetch(Path) ->
    Url = "http://localhost:" ++ integer_to_list(persistent_term:get(?MODULE)) ++ Path,
    {ok, {{_, 200, _}, _, Body}} = httpc:request(get, {Url, []}, [], []),
    Body.

open_updates() ->
    {ok, S} = gen_tcp:connect("localhost", persistent_term:get(?MODULE), [binary, {active, true}]),
    ok = gen_tcp:send(S, "GET /updates HTTP/1.1\r\nhost: localhost\r\naccept: text/event-stream\r\n\r\n"),
    S.

next_version(S) ->
    receive
        {tcp, S, Data} ->
            case re:run(Data, "data: ([0-9a-f]+)\n\n", [{capture, all_but_first, list}]) of
                {match, [V]} -> V;
                nomatch -> next_version(S)
            end
    after 120000 -> error(no_update_event)
    end.
