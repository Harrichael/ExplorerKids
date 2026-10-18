-module(lantern_hill_app).
-behaviour(application).

-export([start/2, stop/1, upgraded/0]).

start(_Type, _Args) ->
    {ok, Sup} = lantern_hill_sup:start_link(),
    {ok, _} = cowboy:start_clear(lantern_hill_http, [{port, port()}],
                                 #{env => #{dispatch => dispatch()}}),
    logger:notice("Lantern Hill serving ~ts on http://localhost:~b/",
                  [lantern_hill_versions:web_root(), ranch:get_port(lantern_hill_http)]),
    {ok, Sup}.

stop(_State) ->
    cowboy:stop_listener(lantern_hill_http).

%% The last step of every release upgrade (see ebin/lantern_hill.appup): the listener outlives
%% the upgrade, so it needs the new routes, and the new release's web root may hold a new frontend.
upgraded() ->
    ok = cowboy:set_env(lantern_hill_http, dispatch, dispatch()),
    lantern_hill_versions:refresh(),
    ok.

dispatch() ->
    cowboy_router:compile([{'_', [{"/updates", lantern_hill_updates, []} | lantern_hill_frontend:routes()]}]).

port() ->
    case os:getenv("PORT") of
        false -> application:get_env(lantern_hill, port, 8080);
        Port -> list_to_integer(Port)
    end.
