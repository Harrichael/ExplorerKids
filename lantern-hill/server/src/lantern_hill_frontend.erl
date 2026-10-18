%% Serves the frontend at versioned URLs. The page at / is pinned to the current version with
%% a <base href="/v/Version/">, so every relative URL the game resolves (modules, css, audio,
%% book pages) lands in that version's snapshot. Those files never change, so browsers may keep
%% them forever; only / is revalidated.
-module(lantern_hill_frontend).

-export([routes/0, init/2, upgrade/4]).

-define(IMMUTABLE, <<"public, max-age=31536000, immutable">>).

routes() ->
    %% the default `web` table lacks .json, which the phonogram clip manifest needs
    Types = [{mimetypes, cow_mimetypes, all}],
    [{"/", ?MODULE, page},
     {"/v/[...]", ?MODULE, {dir, lantern_hill_versions:snapshot_root(), Types}}].

init(Req, page) ->
    V = lantern_hill_versions:current(),
    {ok, Html} = file:read_file(filename:join([lantern_hill_versions:snapshot_root(), V, "index.html"])),
    Page = binary:replace(Html, <<"<head>">>, iolist_to_binary(["<head>\n<base href=\"/v/", V, "/\">"])),
    {ok, cowboy_req:reply(200, #{<<"content-type">> => <<"text/html; charset=utf-8">>,
                                 <<"cache-control">> => <<"no-cache">>}, Page, Req), page};
init(Req, Static) ->
    {?MODULE, cowboy_req:set_resp_header(<<"cache-control">>, ?IMMUTABLE, Req), Static}.

%% cowboy_static has no option for extra headers, so files go through it as a sub protocol,
%% with the cache header already on the request.
upgrade(Req, Env, _Handler, Static) ->
    cowboy_handler:execute(Req, Env#{handler => cowboy_static, handler_opts => Static}).
