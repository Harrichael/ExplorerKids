# ExplorerKids

A cozy, storybook science adventure for kids, built as a single-page three.js game.

## What's here

- **`lantern-hill/`** — *Lantern Hill HQ*, the game: a three.js frontend in `web/`, served by a small Erlang/Cowboy app in `server/`. Explore the cottage, garden and treehouse, dress up your explorer, chat with Professor Hoot, Ms. Pembrook, Dr. Vega Sparks, Pip, Juniper and Biscuit, practice phonics flashcards, and take the Wonder Bus on a plate-tectonics field trip.
- **`marble-lab/`** — a throwaway Node tool for designing *Marble Run Rescue* levels (a physics mini-game planned for the toy blocks in the hearth room). It uses Matter.js to simulate levels, searches for solutions, groups them into distinct "route families", and can evolve level layouts with simulated annealing. `out/marble-lab.html` replays the found solutions.

### Lantern Hill quick start

Needs Erlang/OTP and rebar3 (`brew install erlang rebar3`).

```sh
cd lantern-hill/server
rebar3 shell                     # http://localhost:8080 (PORT=... to change); serves web/ live
rebar3 ct                        # server tests
rebar3 as prod release           # self-contained release with a copy of web/ inside
```

Updates go live without a restart, and open tabs follow them. The page at `/` is pinned to a content hash of `web/` (`<base href="/v/<hash>/">`), each hash is kept as a snapshot under `server/snapshots/` (the last five), and `/updates` tells tabs over Server-Sent Events when a new one is live; a tab moves onto it once the player is back in HQ with nothing open, behind a storybook page turn, and lands where they stood. In `rebar3 shell`, saving a file in `web/` publishes it within a second, and `r3:compile()` hot-loads server code. In production, ship a release upgrade: bump the version in `src/lantern_hill.app.src` and `rebar.config`, add the step to `ebin/lantern_hill.appup` (load what changed, `lantern_hill_sup:reconcile()`, then `lantern_hill_app:upgraded()`), then

```sh
rebar3 as prod release && rebar3 as prod relup -n lantern_hill -v NEW -u OLD && rebar3 as prod tar -n lantern_hill -v NEW
cp _build/prod/rel/lantern_hill/lantern_hill-NEW.tar.gz <installed release>/releases/
<installed release>/bin/lantern_hill upgrade NEW
```

The old release must be in `_build/prod/rel/lantern_hill` when the relup is built.

To keep a server on whatever a branch says, follow it:

```sh
FOLLOW_BRANCH=main FOLLOW_INTERVAL=5 rebar3 shell     # interval in seconds, 3-10, default 5
```

The server checks the branch out into `server/follow/` (never your working copy) and polls the remote. Each new commit goes live whole or not at all: frontend changes publish like any edit, and when `server/` changed it runs `rebar3 compile` on the checkout and hot-loads the new code; the supervision tree then reconciles itself, starting, stopping or restarting children to match. A new dependency is added and started. A commit that fails to compile, or that upgrades an existing dependency (Cowboy, say), is logged and held back; the node stays on the last good commit until the branch moves again. An upgraded dependency needs a restart, which open tabs ride out (snapshots outlive the node and the update stream reconnects); a zero-gap handover, starting the new node on the same port with `SO_REUSEPORT` while the old one drains, is a possible follow-up.

The frontend is plain ES modules with no build step; three.js and Matter.js come from a CDN through the import map in `web/index.html`. `web/js/main.js` is the entry point:

- `core/`: renderer, sound, the mesh/material build kit, world building blocks
- `hq/`: the home world (cottage, garden, hills, residents), built on import
- `characters/`, `props/`: models and the cast of speaking characters
- `ui/`: dialogue, wardrobe, page turns
- `state.js` holds the few pieces of frame state several modules write; `save.js` owns localStorage
- `learn/` (phonogram flashcards), `library/` (the story-corner book reader), `tower/` (Block Tower, with Matter.js) and `trips/` (the Wonder Bus field trip) load only when used; each takes over the screen through `game.activity` or a cutscene. Phonogram audio in `web/audio/` is fetched clip by clip, book pages from `web/books/` page by page

### Marble Lab quick start

```sh
cd marble-lab && npm install
node try.js drawbridge           # solve + score one level
node sample.js nap 120           # brute-force candidate finder for 120 s
node evolve.js snack 60          # simulated annealing over the level layout
node merge.js && node build_viewer.js   # build out/marble-lab.html
```
