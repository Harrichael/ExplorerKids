# How to build a field trip

For agents making a new trip. It comes from what Michael (the owner) asked for while the
tectonics trip was rebuilt. His words are in quotes. Points marked *(pattern)* are how the
tectonics trip does it, not a rule he gave. For code style, comments, tests and git, follow
his global CLAUDE.md; this file does not repeat it.

## The core

A trip is the Magic School Bus: one ride, full of danger and wonder, where the child finds
things out for themselves. It is not "a fancy way to go through dialogue". The class goes off
and explores; the explorer goes to them. Lots to read is fine, but only as a story, and only
if the child gets to do things. Never cut content to make a trip shorter. Make it optional.

## Story

- **Magic School Bus.** "Think how immersive magic school bus was." One continuous trip. The
  bus flies, digs and dives; dialogue plays while it flies.
- **Danger.** "At the rim of the volcano, there was no sense of danger. But it was incredibly
  dangerous!" Someone should say how wild and unusual this trip is.
- **Real story.** "Lots to read is okay if it has normal story components like conflict,
  mystery, and excitement. And if its not just a click maze, but actually interactable."
- *(pattern)* Open on a mystery and close on its answer. Tectonics asks "why are the
  volcanoes in a row?" at the rim and answers it on the way home.
- *(pattern)* Classmates hold the wrong ideas, and the explorer proves them wrong.
- **Curiosity, not worry.** A worry list "encourages too much worrying. Maybe I'd rather be a
  curiosity list." Give the class a list of "I wonder…" questions that the trip answers.
- **Leaving a place** sounds like a teacher: "Alright class, next stop <blank>! Juniper, Mo,
  and <Explorer's Name>, when you are done come to the bus!" Use `cls.leaving(next)`. No
  game words the child won't know ("I don't know what 'call the bus' means").
- **Names.** Never name anyone "Theo". It is his son's name. The cast is Dr. Vega Sparks,
  Pip, Juniper, Basil and Mo. He calls Dr. Sparks "she", and Basil is "he" in the code.
  Don't invent pronouns for anyone else; write around them.

## Exploration

- **The class roams.** "A class should go explore and see stuff, and not follow you around.
  You can interact with them and talk with them."
- **Curiosity first.** "I really want field trips to maximize curiosity." Every place needs
  optional things to find. The deep-sea creatures at the ridge are the model he liked.
- **Finds belong to their place.** A find can teach any science (an echo off canyon walls is
  fine), and a joke is fine if it's done with care. What he called "filler and not as
  exciting as the deep sea stuff" was the hawk and ground squirrels at the fault: animal
  trivia that could sit anywhere. Wildlife earns a find when the place shapes it (vent
  creatures, goats on cliff ledges, fuzzy alpine flowers); otherwise let it be scenery.
- **No signs.** "I don't like the signs. It's too telly, too contrived, too limited and
  walled." A spot worth visiting should draw the eye by itself (a jutting ledge, a glow, a
  classmate peering over), never a "Lookout" or "Planted 1975" board.
- **No invisible walls.** "Invisible wall is bad game design... but its okay if you give a
  big area for the kid to explore, reward curiosity." Bound a place with rock, cliff, water
  or bushes. No square edges, no flat fields.
- **No pruning.** "Can we do this not to cut or prune any content, but to make the shortest
  runtime approachable?" and later "I said no pruning?" Keep a short required path, and put
  the rest behind choices: one key find per place, `t.more()` for "Tell me more!", side
  finds the child may skip. Dropping a stop that adds nothing is fine if its lesson moves
  somewhere else ("Can that be streamlined? Keep the educational info").
- **Choice and forks.** He likes the child steering the trip by what they choose to talk
  about, and wants real forks: "I'm actually A-okay with a fork ... If we add enough
  curiosity and we make this fun enough and beautiful enough, it'll be really fun to replay
  again." A place skipped this time is a reason to come back.
- **Each place teaches its own thing, its own way.** "Almost all of the kids are noticing the
  same thing in different ways ... I don't like that it teaches the same thing over and
  over." One strong demonstration per idea; the other finds should open new ideas.
- **Never trap the explorer.** A find must not block talking to others for long, must not
  need a pixel-exact spot, and must always have a way out. A stuck find once forced him to
  leave the trip.
- **Notebook.** *(pattern)* Juniper's notebook gets a sticker per place, with a star per find,
  so a page with gaps is a reason to play again (`notebook.js`, `tectonics/pages.js`).
- **Collectibles are quick, and mostly hidden.** "We already have so much text." Samples for
  the microscope at home are found with a "You found a sample!" note (sometimes "3 samples"),
  a happy sound and no dialogue; Dr. Sparks remarks only on the first two or three. Almost all
  are tucked away to reward wandering, placed with taste, not scattered. They ride home in
  the backpack as unlabelled jars, a small mystery ("I wonder what it looks like?") that the
  microscope answers. The microscope shows "N of M" with empty slots, and stays hidden until
  the first sample.
- **Quiz.** After the trip, Dr. Sparks offers an optional quiz. "Our first playtester ... really
  enjoyed the quiz." Make it engaging. On the telescope he asked that kids can't just spam
  clicks through things: "require more clicks to prevent spam, not confirmation, thats weak".
  Build a big question pool and draw from what this explorer actually did: "It should sort of
  unlock questions ... some questions should be like more minor questions and some questions
  more key questions. And we should have a higher chance to get key questions".

## Science

- **Real and right.** "Make sure they're real experiments and not made up." Teach the true
  fine points ("Can we teach the difference in lava and magma?"). Real maps: "we have a globe
  with realistic boundaries ... No political boundaries though."
- **Show, don't tell.** If an idea matters, show it moving ("Not well emphasized ... that the
  magma was coming up. Find somewhere to show this (animation) and a subtle 'tell' if
  needed"). Physics should look right: steam from a hot crack, a bus that comes up from
  below if it rode the magma up, a bus that dives nose first (and the window view agrees),
  rocks that look anchored rather than about to fall, water that flows downhill from its
  spring.
- **Magic to reveal, not to decorate.** The bus's gadgets exist to let the child see what
  is really there: the heat bubble, or a fan that blows away scalding murk so the magma
  shows. "Hey, this is too hot ... but we're going to peer through that to really show you
  the underlying science." Not a gadget for its own sake, and not a needless mishap (the
  drill bit snapping off felt "weird").
- **Predict first.** For the lab and the globe he asked for a "predict first model" instead
  of "click mazey". *(pattern)* In trips: guess, then watch, then Sparks ties the guess to
  what happened (`t.ask`, then `goggles()`, then `t.say`).
- **Tie into the lab.** He wants trips and science-desk experiments to unlock each other.
  The tectonics trip waits until the Fizzy Volcano is done (`hq/index.js`) and saves
  `save('trips', {heatRises:true})` to open the heat-rises experiment. In the lab, "locked
  stuff should not show when locked, it should just appear when unlocked."

## Look

- "Warm, inviting, cozy storybook with Zelda Wind Waker inspiration." Toon shading, ink
  outlines, chunky soft shapes, warm dusk light. "Make it look cool and real (not
  photorealistic)."
- No emoji as art. "Don't use emojis, plan to replace them with storybook look art." Quiz
  cards, icons and pictures are drawn in the game's style, so nothing changes from device
  to device and no card stands out from the rest.
- Judge every scene by eye, not by "it renders". Things he caught: flat 2D backdrops, a bare
  sky, thin smoke, smooth surfaces, straight lines, mauve or washed-out colours, people
  standing inside the bus, heads in the roof, flickering trim (z-fighting).
- Make it alive. Smoke that "burps" at random, lava you can "look down" at, rugs that get
  unrolled. Long or random loops, not a short repeat.
- Show what happens. The kids run onto the bus and go in through the door, Sparks gets on
  "excitedly".

## Building blocks

Read the header comment of each file before using it. Reuse; don't rebuild.

- `field-trip.js`: the director `t`. `watch` / `cut` (cutscenes), `play` (explorer has
  control), `say`, `ask` (answers shuffled), `more`, `use`, `free`, `until`, `wait`,
  `tween`, `hold` / `drop`, `goal`, `onEnd`. `startTrip(trip, from)` can start at a chapter.
- `tectonics/index.js`: the storyboard to copy. A trip is `{id, intro, setup, chapters,
  outro, badge}`. Each place lives in its own file and returns `{world, bus, cls, arrive(),
  explore(next), depart()}`. The `check()` helper retries a missed question with a hint.
- `class.js`: `classmates()`, `cls.find()`, `cls.arrive()`, `cls.saw()`, `cls.tally()`,
  `cls.leaving()`, `cls.gather()`, `cls.board()`.
- `bus.js`: `tripBus()`, `gear('drill' | 'sub' | 'bubble')`, `fly()`, `boarding()`.
- `cabin.js`: inside the bus, `view()` and `shot('class' | 'teacher' | 'window')`.
- `goggles.js`: time goggles for slow things, with a still side-on camera.
- `notebook.js`, `stop-kit.js` (`tripWorld`, `puffs`, `spawnNPC`, `signpost`),
  `core/kit.js` (shapes, `outline`, `tex`).
- The trip button lives in `hq/index.js`; finished trips are saved under `load('trips')`.

## Testing and shipping

- **Sound off.** "make sure any runs have sound turned off for now": launch Chrome with
  `--mute-audio` and call `setSound(false)` from `js/input.js` first.
- **One browser at a time.** "you froze my computer with too much going on in parallel" and
  "only one claude in chrome at a time". Few agents at once. Use 127.0.0.1, not localhost.
- Play the whole trip headless to the badge with no page errors, and look at screenshots
  of every place. Test both fork orders and the paths where finds are skipped.
  `tools/phone.mjs` drives a phone.
- Check syntax: `node --check --input-type=module < file.js`.
- For a long list of fixes: "triage the list first and categorize it into batches", and use
  subagents so you don't run out of context partway.
- **Shipping** only when he says "ship it" or "commit merge and push to origin main":
  commit on the branch, merge `origin/main` keeping both sides' intent, check syntax, then
  `git push origin HEAD:main`. Ship in pieces that never leave the game broken. A trivial
  upstream change needs only a syntax check, not a full run.
- Before you stop: "make sure all servers are not running, claude in chrome is off".

## Checklist before calling a trip done

- [ ] It opens with a mystery and answers it before home.
- [ ] Someone says how dangerous and amazing this is.
- [ ] The class roams and calls the explorer over. Nobody follows the explorer.
- [ ] The required path is short; everything else is optional, and nothing was cut.
- [ ] Every place has optional finds, and the notebook counts them.
- [ ] No invisible walls or square edges; every bound can be seen.
- [ ] Each big idea is shown moving, and the child predicts before watching.
- [ ] The science is true, fine points too (magma vs lava, real coastlines, no country lines).
- [ ] An optional quiz from Dr. Sparks at the end, hard to spam through.
- [ ] Lab tie-ins: what unlocks the trip, and what the trip unlocks. Locked things stay hidden.
- [ ] No signs. No find can trap the explorer, and each place teaches something new.
- [ ] Nobody is named Theo, and no new pronouns are guessed.
- [ ] Warm Wind Waker storybook look. No one clips into the bus, no flicker, no bare skies.
- [ ] Leaving lines sound like a teacher ("Alright class, next stop ...").
- [ ] A full headless run reaches the badge with no errors, sound off, one browser.
- [ ] Servers and browsers are shut down. Nothing is committed until he says "ship it".
