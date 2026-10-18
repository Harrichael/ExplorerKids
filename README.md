# ExplorerKids

A cozy, storybook science adventure for kids, built as a single-page three.js game.

## What's here

- **`lantern-hill/`** — *Lantern Hill HQ*, the game. Open `lantern-hill/index.html` in a browser (it loads three.js from a CDN). Explore the cottage, garden and treehouse, dress up your explorer, chat with Professor Hoot, Ms. Pembrook, Dr. Vega Sparks, Pip, Juniper and Biscuit, practice phonics flashcards, and take the Wonder Bus on a plate-tectonics field trip.
- **`marble-lab/`** — a throwaway Node tool for designing *Marble Run Rescue* levels (a physics mini-game planned for the toy blocks in the hearth room). It uses Matter.js to simulate levels, searches for solutions, groups them into distinct "route families", and can evolve level layouts with simulated annealing. `out/marble-lab.html` replays the found solutions.

### Marble Lab quick start

```sh
cd marble-lab && npm install
node try.js drawbridge           # solve + score one level
node sample.js nap 120           # brute-force candidate finder for 120 s
node evolve.js snack 60          # simulated annealing over the level layout
node merge.js && node build_viewer.js   # build out/marble-lab.html
```
