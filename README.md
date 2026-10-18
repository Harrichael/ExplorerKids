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

The frontend is plain ES modules with no build step; three.js comes from a CDN through the import map in `web/index.html`. `web/js/main.js` is the entry point:

- `core/`: renderer, sound, the mesh/material build kit, world building blocks
- `hq/`: the home world (cottage, garden, hills, residents), built on import
- `characters/`, `props/`: models and the cast of speaking characters
- `ui/`: dialogue, wardrobe, page turns
- `state.js` holds the few pieces of frame state several modules write; `save.js` owns localStorage
- `learn/` (phonogram flashcards) and `trips/` (the Wonder Bus field trip) load only when used, and the phonogram audio in `web/audio/` is fetched clip by clip

### Marble Lab quick start

```sh
cd marble-lab && npm install
node try.js drawbridge           # solve + score one level
node sample.js nap 120           # brute-force candidate finder for 120 s
node evolve.js snack 60          # simulated annealing over the level layout
node merge.js && node build_viewer.js   # build out/marble-lab.html
```
