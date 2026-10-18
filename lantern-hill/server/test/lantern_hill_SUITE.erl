%% The server hands the browser the game and keeps open tabs on the newest version of it.
%%
%% Browsers refuse to run an ES module served under a non-JavaScript type, so a wrong mimetype
%% is a blank page, not a warning. Every file lives under /v/<version>/, pinned by the <base>
%% of the page at /, so a tab that loaded one version keeps lazy-loading that version's files
%% after the next one goes live; the update stream tells it when to move.
%%
%% The suite boots the real app on a random port over a copy of web/, which the update cases
%% edit, and talks to it over HTTP like a browser would.
-module(lantern_hill_SUITE).
-include_lib("stdlib/include/assert.hrl").

-export([all/0, init_per_suite/1, end_per_suite/1]).
-export([serves_the_game_with_types_the_browser_accepts/1, serves_nothing_outside_a_version/1,
         an_edit_reaches_open_tabs_while_old_tabs_keep_their_version/1,
         keeps_recent_versions_across_restarts_and_drops_older_ones/1,
         update_streams_survive_repeated_hot_loads/1]).

all() -> [serves_the_game_with_types_the_browser_accepts, serves_nothing_outside_a_version,
          an_edit_reaches_open_tabs_while_old_tabs_keep_their_version,
          keeps_recent_versions_across_restarts_and_drops_older_ones,
          update_streams_survive_repeated_hot_loads].

init_per_suite(Config) ->
    Priv = proplists:get_value(priv_dir, Config),
    Web = filename:join(Priv, "web"),
    [] = os:cmd("cp -R " ++ filename:join(code:priv_dir(lantern_hill), "web") ++ "/ " ++ Web),
    {ok, _} = application:ensure_all_started(inets),
    ok = application:load(lantern_hill),
    ok = application:set_env(lantern_hill, port, 0),
    ok = application:set_env(lantern_hill, web_root, Web),
    ok = application:set_env(lantern_hill, snapshot_dir, filename:join(Priv, "snapshots")),
    start(),
    [{web, Web} | Config].

end_per_suite(_Config) ->
    application:stop(lantern_hill),
    application:unload(lantern_hill).

serves_the_game_with_types_the_browser_accepts(_Config) ->
    {200, "text/html", Page, "no-cache"} = fetch("/"),
    V = base_version(Page),
    ?assertNotEqual(nomatch, string:find(Page, "<script type=\"module\" src=\"js/main.js\">")),
    [?assertMatch({200, JS, _, "public, max-age=31536000, immutable"}
                  when JS =:= "text/javascript"; JS =:= "application/javascript",
                  fetch(versioned(V, Module)))
     || Module <- ["js/main.js", "js/trips/tectonics/index.js"]],
    {200, "text/css", _, _} = fetch(versioned(V, "css/lantern-hill.css")),
    {200, "application/json", _, _} = fetch(versioned(V, "audio/phonograms/index.json")),
    {200, "audio/mpeg", _, _} = fetch(versioned(V, "audio/phonograms/sounds/th-voiced.mp3")).

serves_nothing_outside_a_version(_Config) ->
    V = current_version(),
    {404, _, _, _} = fetch(versioned(V, "js/no-such-module.js")),
    {404, _, _, _} = fetch("/js/main.js"),
    {404, _, _, _} = fetch("/v/0123456789abcdef/js/main.js"),
    {Status, _, _, _} = fetch(versioned(V, "../../server/rebar.config")),
    ?assert(Status =:= 400 orelse Status =:= 404).

an_edit_reaches_open_tabs_while_old_tabs_keep_their_version(Config) ->
    Old = current_version(),
    {200, _, OldMain, _} = fetch(versioned(Old, "js/main.js")),
    Tab = open_updates(),
    Old = next_version(Tab),

    New = edit(Config),
    ?assertNotEqual(Old, New),
    New = next_version(Tab),
    New = current_version(),
    {200, _, OldMain, _} = fetch(versioned(Old, "js/main.js")),
    {200, _, NewMain, _} = fetch(versioned(New, "js/main.js")),
    ?assertNotEqual(OldMain, NewMain),
    gen_tcp:close(Tab).

keeps_recent_versions_across_restarts_and_drops_older_ones(Config) ->
    Versions = [edit(Config) || _ <- lists:seq(1, 6)],
    [Dropped | Kept] = Versions,
    {404, _, _, _} = fetch(versioned(Dropped, "js/main.js")),
    application:stop(lantern_hill),
    start(),
    ?assertEqual(lists:last(Kept), current_version()),
    [{200, _, _, _} = fetch(versioned(V, "js/main.js")) || V <- Kept].

update_streams_survive_repeated_hot_loads(Config) ->
    Tab = open_updates(),
    _ = next_version(Tab),
    Owner = whereis(lantern_hill_versions),
    {ok, Modules} = application:get_key(lantern_hill, modules),
    [begin code:purge(M), {module, M} = code:load_file(M) end || _ <- [1, 2], M <- Modules],
    Owner = whereis(lantern_hill_versions),
    New = edit(Config),
    New = next_version(Tab),
    gen_tcp:close(Tab).

start() ->
    {ok, _} = application:ensure_all_started(lantern_hill),
    persistent_term:put(?MODULE, ranch:get_port(lantern_hill_http)).

%% Each edit makes the web root's content new, so it is a new version.
edit(Config) ->
    Main = filename:join(proplists:get_value(web, Config), "js/main.js"),
    ok = file:write_file(Main, io_lib:format("// edit ~b~n", [erlang:unique_integer([positive])]), [append]),
    lantern_hill_versions:refresh().

current_version() ->
    {200, _, Page, _} = fetch("/"),
    base_version(Page).

base_version(Page) ->
    {match, [V]} = re:run(Page, "<base href=\"/v/([0-9a-f]+)/\">", [{capture, all_but_first, list}]),
    V.

versioned(V, Path) -> "/v/" ++ V ++ "/" ++ Path.

%% A bare socket rather than httpc: it reads the event stream exactly as it arrives.
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
    after 5000 -> error(no_update_event)
    end.

fetch(Path) ->
    Url = "http://localhost:" ++ integer_to_list(persistent_term:get(?MODULE)) ++ Path,
    {ok, {{_, Status, _}, Headers, Body}} = httpc:request(get, {Url, []}, [], []),
    Type = case proplists:get_value("content-type", Headers) of
               undefined -> undefined;
               T -> hd(string:split(T, ";"))
           end,
    {Status, Type, Body, proplists:get_value("cache-control", Headers)}.
