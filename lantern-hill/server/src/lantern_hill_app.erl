-module(lantern_hill_app).
-behaviour(application).

-export([start/2, stop/1]).

start(_Type, _Args) ->
    Web = web_root(),
    %% the default `web` table lacks .json, which the phonogram clip manifest needs
    Types = [{mimetypes, cow_mimetypes, all}],
    Dispatch = cowboy_router:compile([
        {'_', [{"/", cowboy_static, {file, filename:join(Web, "index.html"), Types}},
               {"/[...]", cowboy_static, {dir, Web, Types}}]}
    ]),
    {ok, _} = cowboy:start_clear(lantern_hill_http, [{port, port()}],
                                 #{env => #{dispatch => Dispatch}}),
    logger:notice("Lantern Hill serving ~ts on http://localhost:~b/",
                  [Web, ranch:get_port(lantern_hill_http)]),
    lantern_hill_sup:start_link().

stop(_State) ->
    cowboy:stop_listener(lantern_hill_http).

port() ->
    case os:getenv("PORT") of
        false -> application:get_env(lantern_hill, port, 8080);
        Port -> list_to_integer(Port)
    end.

%% priv/web is a symlink to ../web, so a dev build serves the frontend source as it is edited.
web_root() ->
    case application:get_env(lantern_hill, web_root) of
        {ok, Dir} -> Dir;
        undefined -> filename:join(code:priv_dir(lantern_hill), "web")
    end.
