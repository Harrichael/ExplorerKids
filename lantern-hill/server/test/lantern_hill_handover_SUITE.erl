%% Following a branch under bin/follow, run as an operator would, against a stand-in remote (see
%% lantern_hill_remote). The server depends on lh_fake, a small app in a local git repository,
%% so a push can upgrade a dependency the way `rebar3 upgrade` would, which no node can load in
%% place. The cases watch what browsers would see: the page, update streams, and whether any
%% request was ever refused. Cases run in order: each builds on the last push.
-module(lantern_hill_handover_SUITE).
-include_lib("stdlib/include/assert.hrl").
-import(lantern_hill_remote, [write/3, push/2, page/1, has/2, sh/2, wait/1]).

-export([all/0, init_per_suite/1, end_per_suite/1]).
-export([a_new_dependency_loads_in_place/1, a_successor_that_cannot_start_leaves_the_old_one_serving/1,
         a_dependency_upgrade_hands_over_without_refusing_a_request/1]).

all() -> [a_new_dependency_loads_in_place, a_successor_that_cannot_start_leaves_the_old_one_serving,
          a_dependency_upgrade_hands_over_without_refusing_a_request].

init_per_suite(Config) ->
    %% suites in one run share priv_dir
    Priv = filename:join(proplists:get_value(priv_dir, Config), ?MODULE),
    {_Remote, Dev} = lantern_hill_remote:new(Priv),
    sh(Priv, "git init --quiet --bare --initial-branch=main fake.git && git clone --quiet fake.git fake"),
    Fake = filename:join(Priv, "fake"),
    Refs = [begin
                write(Fake, "src/lh_fake.app.src",
                      "{application, lh_fake, [{vsn, \"" ++ Vsn ++ "\"}, {applications, [kernel, stdlib]}]}.\n"),
                {Vsn, push(Fake, Vsn)}
            end || Vsn <- ["1.0.0", "2.0.0"]],
    {ok, _} = application:ensure_all_started(inets),
    Port = free_port(),
    persistent_term:put(?MODULE, Port),
    Launcher = launch(lantern_hill_remote:server(Dev), Port),
    wait(fun() -> catch has(fetch("/"), "first") end),
    [{dev, Dev}, {fake, "file://" ++ filename:join(Priv, "fake.git")}, {refs, Refs}, {launcher, Launcher} | Config].

end_per_suite(Config) ->
    proplists:get_value(launcher, Config) ! stop.

a_new_dependency_loads_in_place(Config) ->
    Sha = push_with_lh_fake("1.0.0", Config, "lh_fake_1"),
    wait(fun() -> logged(string:slice(Sha, 0, 8) ++ " is live") end),
    ?assertNot(logged("taking over")).

a_successor_that_cannot_start_leaves_the_old_one_serving(Config) ->
    App = filename:join(lantern_hill_remote:server(dev(Config)), "src/lantern_hill_app.erl"),
    {ok, Good} = file:read_file(App),
    ok = file:write_file(App, string:replace(Good, "start(_Type, _Args) ->", "start(_Type, _Args) ->\n    exit(broken),")),
    write(dev(Config), "lantern-hill/web/index.html", page("broken")),
    push_with_lh_fake("2.0.0", Config, "broken"),
    wait(fun() -> logged("stays on") end),
    ?assert(has(fetch("/"), "first")),
    ok = file:write_file(App, Good).

%% Tabs on the old generation lose their update stream when it stops; a browser reconnects,
%% here by hand, and the successor tells it about the new version.
a_dependency_upgrade_hands_over_without_refusing_a_request(Config) ->
    Tab = open_updates(), Old = next_version(Tab),
    Visitor = spawn_link(fun() -> visit([]) end),
    write(dev(Config), "lantern-hill/web/index.html", page("fourth")),
    push_with_lh_fake("2.0.0", Config, "fourth"),
    wait(fun() -> has(fetch("/"), "fourth") end),
    ?assert(logged("taking over")),
    receive {tcp_closed, Tab} -> ok after 10000 -> error(old_stream_still_open) end,
    ?assertNotEqual(Old, next_version(open_updates())),
    Visitor ! {done, self()},
    receive {refused, Refused} -> ?assertEqual([], Refused) end.

dev(Config) -> proplists:get_value(dev, Config).

%% Pins lh_fake in both rebar.config and rebar.lock, as `rebar3 upgrade` leaves them.
push_with_lh_fake(Vsn, Config, Msg) ->
    Server = lantern_hill_remote:server(dev(Config)),
    Source = {git, proplists:get_value(fake, Config), {ref, proplists:get_value(Vsn, proplists:get_value(refs, Config))}},
    {ok, Terms} = file:consult(filename:join(Server, "rebar.config")),
    Deps = lists:keystore(lh_fake, 1, proplists:get_value(deps, Terms), {lh_fake, Source}),
    ok = file:write_file(filename:join(Server, "rebar.config"),
                         [io_lib:format("~p.~n", [T]) || T <- lists:keystore(deps, 1, Terms, {deps, Deps})]),
    {ok, [{LockVsn, Locked} | Rest]} = file:consult(filename:join(Server, "rebar.lock")),
    Lock = lists:keystore(<<"lh_fake">>, 1, Locked, {<<"lh_fake">>, Source, 0}),
    ok = file:write_file(filename:join(Server, "rebar.lock"),
                         [io_lib:format("~p.~n", [T]) || T <- [{LockVsn, Lock} | Rest]]),
    push(dev(Config), Msg).

launch(Server, Port) ->
    Self = self(),
    Pid = spawn(fun() ->
        P = open_port({spawn_executable, filename:join(Server, "bin/follow")},
                      [{args, ["main", "3"]}, {cd, Server}, {env, [{"PORT", integer_to_list(Port)}]},
                       {line, 4096}, exit_status, stderr_to_stdout, binary]),
        Self ! launched,
        collect(P, [])
    end),
    receive launched -> register(launcher, Pid), Pid end.

collect(P, Lines) ->
    receive
        {P, {data, {_, Line}}} -> ct:log("~ts", [Line]), collect(P, [Line | Lines]);
        {P, {exit_status, S}} -> ct:log("bin/follow exited ~b", [S]), collect(undefined, Lines);
        {logged, From} -> From ! {logged, Lines}, collect(P, Lines);
        stop when is_port(P) -> os:cmd("kill " ++ integer_to_list(element(2, erlang:port_info(P, os_pid))));
        stop -> ok
    end.

logged(Text) ->
    launcher ! {logged, self()},
    receive {logged, Lines} -> lists:any(fun(L) -> string:find(L, Text) =/= nomatch end, Lines) end.

free_port() ->
    {ok, S} = gen_tcp:listen(0, []), {ok, Port} = inet:port(S), ok = gen_tcp:close(S), Port.

%% A new visitor every few milliseconds, each on a connection of its own.
visit(Refused) ->
    R = httpc:request(get, {url("/"), [{"connection", "close"}]}, [], []),
    Now = case R of {ok, {{_, 200, _}, _, _}} -> Refused; Other -> [Other | Refused] end,
    receive {done, From} -> From ! {refused, Now} after 20 -> visit(Now) end.

url(Path) -> "http://localhost:" ++ integer_to_list(persistent_term:get(?MODULE)) ++ Path.

fetch(Path) ->
    {ok, {{_, 200, _}, _, Body}} = httpc:request(get, {url(Path), []}, [], []),
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
