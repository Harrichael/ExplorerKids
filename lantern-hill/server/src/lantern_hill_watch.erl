%% Dev only: notices edits under the web root and refreshes the version, so open tabs pick
%% them up. Polls file mtimes and sizes, which is cheap; only a change pays for a full rehash.
-module(lantern_hill_watch).
-behaviour(gen_server).
-include_lib("kernel/include/file.hrl").

-export([start_link/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2]).

-define(POLL, 1000).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

init([]) ->
    erlang:send_after(?POLL, self(), poll),
    {ok, stamp()}.

handle_info(poll, Stamp) ->
    erlang:send_after(?POLL, self(), poll),
    case stamp() of
        Stamp -> {noreply, Stamp};
        New -> lantern_hill_versions:refresh(), {noreply, New}
    end.

handle_call(_Req, _From, Stamp) -> {reply, ok, Stamp}.
handle_cast(_Msg, Stamp) -> {noreply, Stamp}.

stamp() ->
    lists:sort(filelib:fold_files(lantern_hill_versions:web_root(), "", true, fun(P, Acc) ->
        case file:read_file_info(P, [{time, posix}]) of
            {ok, #file_info{mtime = M, size = S}} -> [{P, M, S} | Acc];
            {error, _} -> Acc
        end
    end, [])).
