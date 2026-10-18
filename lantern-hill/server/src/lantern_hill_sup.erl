-module(lantern_hill_sup).
-behaviour(supervisor).

-export([start_link/0, init/1, reconcile/0]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% The HTTP listener lives in ranch's own supervision tree. Subscribers sit in their own pg
%% scope so open update streams stay subscribed even if the version owner restarts. A followed
%% branch is checked out before the version owner starts, since it moves the web root there.
init([]) ->
    {ok, {#{strategy => one_for_one}, children()}}.

children() ->
    [#{id => lantern_hill_handover, start => {lantern_hill_handover, start_link, []}} || lantern_hill_handover:enabled()] ++
    [#{id => lantern_hill_follow, start => {lantern_hill_follow, start_link, []}} || lantern_hill_follow:enabled()] ++
    [#{id => lantern_hill_subscribers, start => {pg, start_link, [lantern_hill_subscribers]}},
     #{id => lantern_hill_versions, start => {lantern_hill_versions, start_link, []}}] ++
    [#{id => lantern_hill_watch, start => {lantern_hill_watch, start_link, []}}
     || application:get_env(lantern_hill, watch_web, false), not lantern_hill_follow:enabled()].

%% Brings the running tree in line with children() after new code is loaded: starts children
%% that are new, stops ones that are gone, and restarts any whose spec changed. This is what a
%% hot upgrade needs instead of hand-written start and stop steps.
reconcile() ->
    Want = children(),
    Running = [Id || {Id, _, _, _} <- supervisor:which_children(?MODULE)],
    [begin ok = supervisor:terminate_child(?MODULE, Id), ok = supervisor:delete_child(?MODULE, Id) end
     || Id <- Running, not lists:keymember(Id, 1, [{maps:get(id, S)} || S <- Want])],
    [reconcile_child(Spec) || Spec <- Want],
    ok.

%% A release upgrade's {update, Sup, supervisor} step registers new specs without starting
%% them, so a matching spec still has to be checked for a running process.
reconcile_child(Spec = #{id := Id}) ->
    case supervisor:get_childspec(?MODULE, Id) of
        {error, not_found} ->
            {ok, _} = supervisor:start_child(?MODULE, Spec);
        {ok, Old} ->
            case maps:with([start], Old) =:= maps:with([start], Spec) of
                true ->
                    case lists:keyfind(Id, 1, supervisor:which_children(?MODULE)) of
                        {Id, undefined, _, _} -> {ok, _} = supervisor:restart_child(?MODULE, Id);
                        _ -> ok
                    end;
                false ->
                    ok = supervisor:terminate_child(?MODULE, Id), ok = supervisor:delete_child(?MODULE, Id),
                    {ok, _} = supervisor:start_child(?MODULE, Spec)
            end
    end.
