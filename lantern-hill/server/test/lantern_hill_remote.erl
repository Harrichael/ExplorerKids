%% A branch to follow, for the suites that follow one: a local bare repository stands in for the
%% remote, and a clone of it holding a real copy of this server is where a teammate pushes from.
-module(lantern_hill_remote).
-include_lib("stdlib/include/assert.hrl").

-export([new/1, server/1, write/3, push/2, page/1, has/2, sh/2, wait/1]).

%% The remote's path and the clone's, made in Dir, with a first commit serving page("first").
new(Dir) ->
    ok = filelib:ensure_path(Dir),
    sh(Dir, "git init --quiet --bare --initial-branch=main remote.git && git clone --quiet remote.git dev"),
    Dev = filename:join(Dir, "dev"),
    Src = code:lib_dir(lantern_hill) ++ "/../../../..",
    sh(Dir, io_lib:format("mkdir -p ~ts && cd ~ts && cp -R src config bin rebar.config rebar.lock .gitignore ~ts/",
                           [server(Dev), Src, server(Dev)])),
    write(Dev, "lantern-hill/web/index.html", page("first")),
    push(Dev, "first"),
    {filename:join(Dir, "remote.git"), Dev}.

server(Dev) -> filename:join([Dev, "lantern-hill", "server"]).

write(Dev, Rel, Content) ->
    Path = filename:join(Dev, Rel),
    ok = filelib:ensure_dir(Path),
    ok = file:write_file(Path, Content).

%% Returns the commit pushed.
push(Dev, Msg) ->
    sh(Dev, "git add -A && git -c user.name=t -c user.email=t@t commit --quiet -m " ++ Msg ++ " && git push --quiet origin HEAD:main"),
    string:trim(os:cmd("cd " ++ Dev ++ " && git rev-parse HEAD")).

page(Marker) -> "<!doctype html><html><head><title>" ++ Marker ++ "</title></head><body></body></html>\n".

has(Body, Marker) -> string:find(Body, "<title>" ++ Marker ++ "</title>") =/= nomatch.

sh(Dir, Cmd) ->
    Out = os:cmd("cd " ++ Dir ++ " && (" ++ lists:flatten(Cmd) ++ ") 2>&1; echo \"exit:$?\""),
    ?assertMatch({match, _}, re:run(Out, "exit:0\n$"), Out).

%% Generous: a deploy may rebuild the whole server.
wait(Pred) -> wait(Pred, 480).
wait(Pred, 0) -> ?assert(Pred());
wait(Pred, N) -> case Pred() of true -> ok; _ -> timer:sleep(500), wait(Pred, N - 1) end.
