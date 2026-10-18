# ExplorerKids

A cozy, storybook science adventure for kids, built as a single-page three.js game.

## What's here

- **`lantern-hill/`** — *Lantern Hill HQ*, the game: a three.js frontend in `web/`, served by a small Erlang/Cowboy app in `server/`. Explore the cottage, garden and treehouse, dress up your explorer, chat with Professor Hoot, Ms. Pembrook, Dr. Vega Sparks, Pip, Juniper and Biscuit, practice phonics flashcards, spin the Explorer's Globe to solve Professor Hoot's biome riddles and guess who eats whom in pop-up food web dioramas, and take the Wonder Bus on a plate-tectonics field trip.
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

To keep a server on whatever a branch says, follow it (from `lantern-hill/server`):

```sh
bin/follow main 5      # branch, then poll interval in seconds, 3-10, default 5
```

The server checks the branch out into `server/follow/` (never your working copy) and polls the remote. Each new commit goes live whole or not at all: frontend changes publish like any edit, and when `server/` changed it runs `rebar3 compile` on the checkout and hot-loads the new code; the supervision tree then reconciles itself, starting, stopping or restarting children to match. A new dependency is added and started. A commit that fails to compile is logged and held back; the node stays on the last good commit until the branch moves again.

A commit that upgrades a dependency (`rebar3 upgrade cowboy`, say) can't be loaded into a running node, so `bin/follow` runs the server as a line of generations, numbered in its output. The old generation asks for a successor; the successor builds and starts from the new commit and binds the same port (`SO_REUSEPORT`); once it is serving, the old one closes its listening socket, gives requests under way two seconds, and stops. No request is refused, and open tabs reconnect to the successor and turn the page onto the new version. If the successor fails to start, the old generation stays on and holds the commit back. `FOLLOW_BRANCH=main rebar3 shell` follows too, with a shell to poke at, but holds dependency upgrades back for a manual restart.

The frontend is plain ES modules with no build step; three.js and Matter.js come from a CDN through the import map in `web/index.html`. `web/js/main.js` is the entry point:

- `core/`: renderer, sound, the mesh/material build kit, world building blocks
- `hq/`: the home world (cottage, garden, hills, residents), built on import
- `characters/`, `props/`: models and the cast of speaking characters
- `ui/`: dialogue, wardrobe, page turns
- `state.js` holds the few pieces of frame state several modules write; `save.js` owns localStorage
- `earth/` is the world model: `model.js` answers what is at any latitude and longitude (sea or land, ecoregion, biome, and which food web to show), from `data/earth.json` and the hand-written biomes and food webs in `biomes.js`
- `learn/` (phonogram flashcards), `library/` (the story-corner book reader), `globe/` (the Explorer's Globe, played on the real globe in the Library Nook), `tower/` (Block Tower, with Matter.js) and `trips/` (the Wonder Bus field trip) load only when used; each takes over the screen through `game.activity` or a cutscene. Phonogram audio in `web/audio/` is fetched clip by clip, book pages from `web/books/` page by page

### The world model's data

`web/data/earth.json` is generated: RESOLVE Ecoregions 2017 (CC BY 4.0) on a half-degree grid, Natural Earth coastlines and lakes, the seas named by flood fill, and hand-traced coral reef zones. To rebuild it and check the model (sources, ~150 MB, download once into `tools/earth/cache/`):

```sh
cd lantern-hill
node tools/earth/build.mjs
node --test tools/earth/*.test.mjs
```

#### Testing on a phone

Many players are on phones, and the touch UI only switches on when the page loads on a touch screen (`input.js` reads `(pointer: coarse)` once), so a narrow desktop window doesn't show it. Two ways to check a change:

**Emulated, scriptable.** `lantern-hill/tools/phone.mjs` (no dependencies, Node 22+) starts the installed Chrome headless as a phone: viewport, pixel ratio, touch, and notch insets (`env(safe-area-inset-*)`), all set before the page loads. Taps and drags are real touch events.

```sh
node lantern-hill/tools/phone.mjs http://localhost:8080/ --device iphone-15 --landscape --out shot.png
```

Devices are `iphone-15` (notch), `iphone-se` (small, no notch) and `pixel-7`; check portrait and landscape. For a walkthrough, import `phone()` in a script and use `tap`, `tapOn(selector)`, `drag`, `box(selector)`, `eval` and `shot` (see the top of the file). A fresh profile starts at the explorer creator, so `tapOn('#wDone')` first. Scripts can jump the explorer next to something with `eval` (import `js/player.js` relative to `document.baseURI` and set `player.x`/`player.z`), and check fit by projecting world points through `camera` from `js/core/render.js`. It renders on this computer's GPU, so it says nothing about a phone's frame rate.

**A real phone**, for frame rate, how things feel under a thumb, and Safari's quirks. `rebar3 shell` listens on every interface, so on the same Wi-Fi open `http://<this Mac's LAN IP>:8080/` (`ipconfig getifaddr en0`); edits in `web/` reach the phone live. For the console, connect by cable: Safari's Develop menu (iPhone) or `chrome://inspect` (Android).

### Marble Lab quick start

```sh
cd marble-lab && npm install
node try.js drawbridge           # solve + score one level
node sample.js nap 120           # brute-force candidate finder for 120 s
node evolve.js snack 60          # simulated annealing over the level layout
node merge.js && node build_viewer.js   # build out/marble-lab.html
```
