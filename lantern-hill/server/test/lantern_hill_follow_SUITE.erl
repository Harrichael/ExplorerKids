%% Following a branch: the app is started in this node against a stand-in remote (see
%% lantern_hill_remote), and each case pushes commits to it the way a teammate would, then
%% watches the running node take them up. The repository holds a real copy of this server's
%% code, so server pushes go through the real rebuild and hot load. Cases run in order: each
%% builds on the last push.
-module(lantern_hill_follow_SUITE).
-include_lib("stdlib/include/assert.hrl").
-import(lantern_hill_remote, [write/3, push/2, page/1, has/2, wait/1]).

-export([all/0, init_per_suite/1, end_per_suite/1]).
-export([serves_the_branch_it_follows/1, a_pushed_frontend_change_reaches_open_tabs/1,
         pushed_server_code_goes_live_without_a_restart/1, a_broken_push_is_held_back_until_fixed/1]).

all() -> [serves_the_branch_it_follows, a_pushed_frontend_change_reaches_open_tabs,
          pushed_server_code_goes_live_without_a_restart, a_broken_push_is_held_back_until_fixed].

init_per_suite(Config) ->
    %% suites in one run share priv_dir
    Priv = filename:join(proplists:get_value(priv_dir, Config), ?MODULE),
    {Remote, Dev} = lantern_hill_remote:new(Priv),
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

dev(Config) -> proplists:get_value(dev, Config).

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
