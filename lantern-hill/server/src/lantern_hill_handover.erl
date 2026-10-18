%% This node's side of bin/follow, which runs the server as a line of generations so that a push
%% no node can take in place (an upgraded dependency) still goes live without the port closing.
%% bin/follow describes the protocol; outside it, everything here is off.
-module(lantern_hill_handover).

-export([enabled/0, socket_opts/0, serving/0, request/1, step_down/0, start_link/0]).

enabled() -> application:get_env(lantern_hill, handover, false).

%% Two generations hold the port at once while one takes over from the other.
socket_opts() -> [{reuseport, true} || enabled()].

serving() -> enabled() andalso say("serving").

%% Asks for a successor started from the server code in Dir.
request(Dir) -> say("handover " ++ Dir).

say(Line) -> io:format(user, "lantern_hill ~ts~n", [Line]).

%% Closing the listening socket hands every new connection to the successor sharing the port;
%% responses already under way get a moment to finish before the node stops.
step_down() ->
    enabled() andalso begin ok = ranch:suspend_listener(lantern_hill_http), timer:sleep(2000) end.

%% Listens to bin/follow: "stay" means the successor failed to start, and the end of input
%% means stop, whether this node was replaced or bin/follow itself is gone.
start_link() -> {ok, proc_lib:spawn_link(fun listen/0)}.

listen() ->
    case io:get_line(user, "") of
        "stay\n" -> lantern_hill_follow ! successor_failed, listen();
        Line when is_list(Line) -> listen();
        _Eof -> init:stop()
    end.
