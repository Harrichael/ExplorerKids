%% The server's one job today: hand the browser the game, with content types it will accept.
%% Browsers refuse to run an ES module served under a non-JavaScript type, so a wrong
%% mimetype is a blank page, not a warning. Each case boots the real app on a random port.
-module(lantern_hill_SUITE).
-include_lib("stdlib/include/assert.hrl").

-export([all/0, init_per_suite/1, end_per_suite/1]).
-export([serves_the_game_with_types_the_browser_accepts/1, serves_nothing_outside_the_web_root/1]).

all() -> [serves_the_game_with_types_the_browser_accepts, serves_nothing_outside_the_web_root].

init_per_suite(Config) ->
    {ok, _} = application:ensure_all_started(inets),
    ok = application:load(lantern_hill),
    ok = application:set_env(lantern_hill, port, 0),
    {ok, _} = application:ensure_all_started(lantern_hill),
    [{base, "http://localhost:" ++ integer_to_list(ranch:get_port(lantern_hill_http))} | Config].

end_per_suite(_Config) ->
    application:stop(lantern_hill).

serves_the_game_with_types_the_browser_accepts(Config) ->
    {200, "text/html", Page} = get(Config, "/"),
    ?assertNotEqual(nomatch, string:find(Page, "<script type=\"module\" src=\"js/main.js\">")),
    [?assertMatch({200, JS, _} when JS =:= "text/javascript"; JS =:= "application/javascript",
                  get(Config, Module))
     || Module <- ["/js/main.js", "/js/trips/tectonics/index.js"]],
    {200, "text/css", _} = get(Config, "/css/lantern-hill.css"),
    {200, "application/json", _} = get(Config, "/audio/phonograms/index.json"),
    {200, "audio/mpeg", _} = get(Config, "/audio/phonograms/sounds/th-voiced.mp3").

serves_nothing_outside_the_web_root(Config) ->
    {404, _, _} = get(Config, "/js/no-such-module.js"),
    {Status, _, _} = get(Config, "/../server/rebar.config"),
    ?assert(Status =:= 400 orelse Status =:= 404).

get(Config, Path) ->
    {ok, {{_, Status, _}, Headers, Body}} =
        httpc:request(get, {proplists:get_value(base, Config) ++ Path, []}, [], []),
    Type = case proplists:get_value("content-type", Headers) of
               undefined -> undefined;
               T -> hd(string:split(T, ";"))
           end,
    {Status, Type, Body}.
