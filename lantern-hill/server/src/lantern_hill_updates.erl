%% Server-Sent Events telling open tabs which frontend version is live. Each connection gets
%% the current version straight away, so a tab reconnecting after a restart or upgrade catches
%% up, then one event per change. These connections live for hours across hot code loads; they
%% stay safe because cowboy_loop calls info/3 as a remote call and nothing here loops locally.
-module(lantern_hill_updates).
-behaviour(cowboy_loop).

-export([init/2, info/3]).

%% under the idle timeouts of common proxies
-define(HEARTBEAT, 25000).

init(Req0, State) ->
    ok = lantern_hill_versions:subscribe(),
    cowboy_req:cast({set_options, #{idle_timeout => infinity}}, Req0),
    Req = cowboy_req:stream_reply(200, #{<<"content-type">> => <<"text/event-stream">>,
                                         <<"cache-control">> => <<"no-cache">>}, Req0),
    send(Req, lantern_hill_versions:current()),
    erlang:send_after(?HEARTBEAT, self(), heartbeat),
    {cowboy_loop, Req, State, hibernate}.

info({lantern_hill_version, V}, Req, State) ->
    send(Req, V),
    {ok, Req, State, hibernate};
info(heartbeat, Req, State) ->
    cowboy_req:stream_body(<<":\n\n">>, nofin, Req),
    erlang:send_after(?HEARTBEAT, self(), heartbeat),
    {ok, Req, State, hibernate};
info(_Msg, Req, State) ->
    {ok, Req, State, hibernate}.

send(Req, V) -> cowboy_req:stream_body(["data: ", V, "\n\n"], nofin, Req).
