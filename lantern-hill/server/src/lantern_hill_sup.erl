-module(lantern_hill_sup).
-behaviour(supervisor).

-export([start_link/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% Nothing to supervise yet: the HTTP listener lives in ranch's own supervision tree.
init([]) ->
    {ok, {#{strategy => one_for_one}, []}}.
