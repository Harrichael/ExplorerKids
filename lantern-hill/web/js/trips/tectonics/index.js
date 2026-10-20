// The plate tectonics field trip: why the ground shakes and how mountains grow, told as one ride.
// The class lands on a volcano and wonders why it stands in a row with others; drills down through
// the crust into the mantle, too hot and soft to drill, and watches it turn over; rides it up to a ridge on the sea floor where
// plates pull apart; flies the map to where plates crash and crumple up mountains; then picks one more
// adventure: where plates slide past each other, or a volcano island far from any plate edge, over a
// plume; and on the way home, sees the volcano again and knows why it is there. The place not picked
// waits in Juniper's notebook for next time.
//
// This file is the storyboard: the rides, with what is said and shown, and the order of the places.
// What happens at each place lives with the place.

import { Sound } from '../../core/sound.js';
import { load, save } from '../../save.js';
import { game } from '../../state.js';
import { cabin } from '../cabin.js';
import { notebook } from '../notebook.js';
import { puffs } from '../stop-kit.js';
import { diagram } from './diagram.js';
import { buildMantle } from './mantle.js';
import { PAGES } from './pages.js';
import { quiz } from './quiz.js';
import { buildRidge } from './ridge.js';
import { buildRim } from './rim.js';
import { buildFault } from './fault.js';
import { buildHotspot } from './hotspot.js';
import { buildValley } from './valley.js';
import { wonders } from './wonders.js';

// A question about the place just left. A wrong answer gets a hint and another go; a second miss
// gets the answer, so every explorer ends on the right idea without getting stuck.
async function check(t, who, q, answers, right, hint, yay){
  for (let miss = 0; ; miss++) {
    const i = await t.ask(who, q, answers);
    if (i === right) { await t.say([[who, yay]]); return; }
    if (miss) { await t.say([['sparks', `Here's the answer: ${answers[right].toLowerCase()}!`], [who, yay]]); return; }
    await t.say([['sparks', hint]]);
  }
}

// The fork after the crash: one more adventure, and the other waits for another trip.
const PICK = {slide:{page:4, build:buildFault, name:'where plates slide'}, hotspot:{page:5, build:buildHotspot, name:'the hotspot island'}};
const skipped = s => s.pick && PICK[s.pick === 'slide' ? 'hotspot' : 'slide'].page;
// every page this trip visited, filled with every find
const full = s => !!s && PAGES.every((pg, i) => { if (i === skipped(s)) return true; const n = s.places[i] && s.places[i].tally(); return n && n.seen === n.of; });

// Juniper's notebook keeps what was found at each place from trip to trip, so the page skipped this
// time shows what was found there before, or waits for next time.
const KEPT = 'tectonicsNotebook';
async function stick(s, page){
  const kept = (load('trips') || {})[KEPT] || {}, now = s.places[page].tally();
  const best = (a, b) => !a ? b : {seen:Math.max(a.seen, b.seen), of:b.of, curios:{seen:Math.max(a.curios ? a.curios.seen : 0, b.curios.seen), of:b.curios.of}};
  save('trips', {[KEPT]: {...kept, [page]: best(kept[page], now)}});
  const later = skipped(s);
  await notebook(PAGES, page, PAGES.map((pg, i) => s.places[i] ? s.places[i].tally() : i === later ? kept[i] || 'later' : undefined));
}
async function visit(t, s, page, place, next){
  await place.arrive();
  await place.explore(next);
  s.places[page] = place.cls; await stick(s, page);
  await place.depart();
}

export const tectonics = {
  id: 'tectonics',
  intro: [['sparks', "All aboard the Wonder Bus, {name}! Basil and Mo are coming too."],
          ['pip', "Window seat!"]],
  // what every chapter shares: the bus's inside, the diagram, the volcano, seen again at the end, each
  // place's class in notebook order, remembering what the explorer saw there, and the adventure picked
  // after the crash
  setup: t => ({cab:cabin(), dg:diagram(), rim:buildRim(t), seat:{seated:true}, places:[], pick:null}),
  chapters: [
    ['over the sea', async (t, {cab, dg, rim, seat}) => {
      cab.view('sea'); t.watch(cab.world, cab.shot('class'), seat);
      await t.say([['sparks', "Welcome aboard, class! Today we have a big question."],
                   ['sparks', "Why does the ground shake? And how do mountains grow?"]]);
      t.cut(cab.shot('window'));
      await t.say([['basil', "Um… is that smoke out there?"], ['mo', "Maybe the island is making toast."]]);
      t.cut(cab.shot('teacher'));
      await t.say([['sparks', "That's a volcano! And that's where we're landing."]]);
      t.cut(cab.shot('class'));
      await t.say([['basil', "I knew I should have stayed home."], ['basil', "I made a list of things I wonder about. Just in case."]]);
      wonders();
      await t.say([['sparks', "Wonderful questions, Basil! Let's see how many this trip can answer."], ['basil', "Answers I can handle. It's the surprises I'm not sure about."]]);
    }],
    ['the volcano rim', async (t, s) => {
      const {rim, places} = s;
      await rim.arrive();
      await rim.explore();
      places[0] = rim.cls; await stick(s, 0);
      await rim.depart();
    }],
    ['the drill dive', async (t, {cab, dg, rim, seat}) => {
      const S = dg.S; S.mode = 'earth'; S.gear = 'drill'; S.depth = true; S.bus = [dg.VOLCANO, 60];
      t.watch(dg.world, dg.frame(800, 300, 1.7));
      const dive = dg.travel([[dg.VOLCANO, 60], [dg.VOLCANO, 120], [dg.VOLCANO, dg.surfaceY(dg.VOLCANO) + 18], [dg.VOLCANO + 6, 330]], 6);
      await t.say([['sparks', "Here's us, class, drilling down through the volcano, nose first!"]]);
      await dive;
      cab.view('rock'); cab.gear('drill'); t.watch(cab.world, cab.shot('window'), seat);
      await t.say([['mo', "Rocks! Rocks everywhere!"]]);
      t.cut(cab.shot('teacher'));
      await t.say([['sparks', "This is the crust, Earth's rocky skin. It's thin, like the skin of a peach."]]);
      cab.view('magma'); t.cut(cab.shot('window'));
      await t.say([['juniper', "Look! A cave full of melted rock!"], ['sparks', "The magma chamber! This is where the volcano's lava comes from."],
                   ['pip', "Wait. Is it magma or lava?"],
                   ['sparks', "Both! Melted rock is called magma while it's still under the ground."],
                   ['sparks', "When it comes out of the ground, we call it lava. Same stuff, new name."],
                   ['mo', "Like me! Indoor Mo, outdoor Mo. Still Mo."]]);
      await check(t, 'mo', "So this melted rock, deep under the ground. What do we call it?", ["Magma", "Lava"], 0,
        "Is it under the ground, or out in the open air?", "Magma! It only gets called lava once it's out.");
      cab.view('mantle');
      const thick = await t.ask('juniper', "Next is the mantle. Which layer do you think is thicker?", ["The crust", "The mantle"]);
      t.watch(dg.world, dg.frame(800, 560, 1));
      const deeper = dg.travel([[dg.VOLCANO + 6, 330], [dg.VOLCANO + 10, 520]], 4);
      await t.say([['sparks', "Look how far down the mantle goes!"],
                   ['juniper', thick ? "You were right. The mantle is HUGE! The crust is just a thin skin." : "Whoa, the mantle is way thicker! The crust is just a thin skin."]]);
      await deeper;
      t.watch(cab.world, cab.shot('class'), seat);
      await t.say([['basil', "It's getting hot in here. Is the bus going to melt?"]]);
      // the drill whirs on, but the hot rock only smears round it, like toothpaste, and the bus slows to a crawl
      const goo = puffs(cab.world, 2, 1.3, 0, {rate:0, rise:.2, size:1.1, color:0xb0503a, opacity:.5, spread:1.8, life:1.8});
      cab.view('stuck'); goo.burst = .4; game.camShake = 1.2;
      Sound.tone(150, {type:'sawtooth', dur:1.6, vol:.06, f2:70, cut:500, vib:[6, 8]}); Sound.hiss({dur:1.2, vol:.08, type:'lowpass', freq:350});
      await t.wait(1.2);
      await t.say([['pip', "The drill's still spinning, but we're hardly moving!"], ['mo', "It sounds like a straw at the bottom of a milkshake."],
                   ['sparks', "That's the mantle for you! Down here, the rock is so hot it's gone soft, like warm toothpaste."],
                   ['sparks', "It squeezes in round the drill as fast as we dig. A drill needs hard, crunchy rock to bite."],
                   ['basil', "So we're STUCK? I KNEW I should have stayed home."]]);
      if (await t.more('sparks', "Want to hear about the deepest hole anyone has ever dug?"))
        await t.say([['sparks', "Scientists in Russia drilled for twenty years, more than twelve kilometers down."],
                     ['sparks', "Then the rock got so hot it went squishy, like ours. The hole kept squeezing shut, so they had to stop."],
                     ['juniper', "And that was still only the crust? Nobody has ever drilled all the way to the mantle?"], ['sparks', "Nobody but us!"]]);
      await t.say([['sparks', "We're not stuck, Basil. If we can't dig, we'll ride!"],
                   ['sparks', "Some of this hot rock is slowly rising. We'll float up with it, like a raft on a river."]]);
      S.gear = null; cab.gear(null); Sound.tone(1046, {type:'triangle', dur:.2, vol:.07}); Sound.tone(523, {type:'triangle', t:.15, dur:.3, vol:.07});
      await t.say([['sparks', "Drill in! Heat bubble, on!"]]);
    }],
    ['the mantle', async (t, s) => {
      const {places} = s;
      const mantle = buildMantle(t);
      await mantle.arrive();
      await mantle.explore();
      places[1] = mantle.cls; await stick(s, 1);
      await mantle.depart();
    }],
    ['up the current to the sea floor', async (t, {cab, dg, rim, seat}) => {
      const S = dg.S;
      cab.view('rising'); t.watch(cab.world, cab.shot('class'), seat);
      await check(t, 'mo', "Quick, before I forget! What does the hot rock in the mantle do?", ["It rises up", "It sinks down", "It stays still"], 0,
        "Remember the time goggles? The hot rock went up, and the cool rock went down.", "It rises! And we're riding it!");
      S.gear = null; t.watch(dg.world, dg.frame(990, 520, 1.25));
      const rise = dg.travel([[dg.VOLCANO + 10, 520], [960, 790], [1160, 700], [1250, 420], [dg.RIDGE, dg.surfaceY(dg.RIDGE) + 12], [dg.RIDGE + 4, dg.surfaceY(dg.RIDGE) - 26]], 7);
      await t.say([['sparks', "Hot rock rises, all the way up to the bottom of the sea."], ['mo', "Wait. The SEA?"],
                   ['sparks', "Near the top, there's less rock pressing down on it. So the hot rock melts into magma!"]]);
      await rise; S.labels.add('ridge');
      cab.view('magmaUp'); t.watch(cab.world, cab.shot('window'), seat);
      await t.say([['juniper', "We're riding the magma up! It's whooshing down past us!"]]);
      t.cut(cab.shot('teacher'));
      await t.say([['sparks', "Hold on tight, class! We're about to burst out through the sea floor!"]]);
    }],
    ['the ridge', async (t, s) => {
      const {places} = s;
      const ridge = buildRidge(t);
      await ridge.arrive();
      await ridge.explore();
      places[2] = ridge.cls; await stick(s, 2);
      await ridge.depart();
    }],
    ['the map flight', async (t, s) => {
      const {cab, dg, seat} = s;
      const S = dg.S;
      cab.view('sky'); t.watch(cab.world, cab.shot('class'), seat);
      await check(t, 'basil', "What happened to your pebble at the ridge?", ["The crack swallowed it", "New rock carried it away", "Nothing at all"], 1,
        "Think back to the time goggles. Where did your pebble end up?", "New rock carried it away from the crack. Slowly!");
      await t.say([['sparks', "Here we are, way up high! Look down."]]);
      S.mode = 'map'; S.sep = 1; S.gear = null; S.depth = false; S.labels.clear(); S.labels.add('ridge'); S.bus = [1500, 900];
      t.watch(dg.world, dg.frame(800, 500, 1));
      const over = dg.travel([[1500, 900], [1100, 760], [820, 560], [580, 250]], 9, false);
      await t.say([['sparks', "That glowing line is the ridge. It runs right down the middle of the ocean."]]);
      if (await t.more('sparks', "Want to see what this ocean looked like long, long ago?")) {
        S.labels.add('years');
        await t.tween(2.5, k => { S.sep = 1 - k; });
        await t.say([['juniper', "Africa and South America… they fit together like puzzle pieces!"],
                     ['sparks', "Long ago, they were joined. Then the ridge slowly pushed them apart."], ['mo', "Whole continents move? Whoa!"]]);
        await t.tween(2.5, k => { S.sep = k; });
      }
      await over;
      t.watch(cab.world, cab.shot('teacher'), seat);
      await t.say([['sparks', "If plates pull apart here, they must meet somewhere else."],
                   ['sparks', "In some places, they crash head on. In others, they slide past each other."],
                   ['sparks', "First stop: where they crash!"],
                   ['pip', "Crashing! Like bumper cars!"], ['basil', "Can we pick the one with less crashing?"], ['sparks', "Very, very slow crashing, Basil. You'll see!"]]);
      cab.view('peaks'); t.cut(cab.shot('window'));
      await t.say([['pip', "Snowy mountains, way out there! Is that where we're going?"]]);
      t.cut(cab.shot('teacher'));
      await t.say([['sparks', "It is! Over there, two plates crash head on."], ['mo', "Slow, slow bumper cars."]]);
    }],
    ['where plates crash', async (t, s) => { await visit(t, s, 3, buildValley(t), "next stop: you get to choose! I have two adventures up my sleeve."); }],
    // The fork: one more adventure, and the one not picked is still there for another trip.
    ['the fork', async (t, s) => {
      const {cab, seat} = s;
      cab.view('sky'); t.watch(cab.world, cab.shot('class'), seat);
      await t.say([['pip', "Crumpled-up mountains! What could beat that?"], ['basil', "Nothing. Let's have nothing beat it. Let's go home."]]);
      t.cut(cab.shot('teacher'));
      await t.say([['sparks', "Not yet, Basil! I have two adventures up my sleeve, and just enough time today for one of them."],
                   ['sparks', "One: golden hills with a long crack across them, where two plates slide past each other. Smoothly, too. Most of the time…"],
                   ['basil', "Most of the time?!"],
                   ['sparks', "Two: a volcano island, smoking away in the middle of the ocean, thousands of kilometers from where any plates meet."],
                   ['juniper', "But volcanoes are where plates meet. We've seen it all day!"],
                   ['sparks', "Exactly. It's a mystery!"]]);
      const island = await t.ask('sparks', "Which adventure shall we go on, {name}?", ["Where plates SLIDE past each other!", "To the volcano ISLAND out at sea!"]);
      s.pick = island ? 'hotspot' : 'slide';
      t.cut(cab.shot('class'));
      await t.say(island ? [['pip', "A mystery island! Like a treasure map!"], ['mo', "Do mystery islands have snacks?"]] : [['pip', "Sliding! Like a playground!"], ['mo', "Do sliding hills have snacks?"]]);
      await t.say([['sparks', "And the other adventure will wait for us. We can go another day!"]]);
      cab.view(island ? 'sea' : 'hills'); t.cut(cab.shot('window'));
      await t.say([island ? ['juniper', "Look, islands! A whole row of them, way out in the sea. And the end one is smoking!"]
                          : ['juniper', "Look, the hills down there are all gold. And there's a long crack running across them!"]]);
      t.cut(cab.shot('teacher'));
      await t.say(island ? [['sparks', "That's where we're going! Hold on tight. We'll fly in right along the row."]]
                         : [['sparks', "That's where we're going! That crack is where two plates slide past each other."], ['sparks', "Watch for things that don't line up."]]);
    }],
    ['the adventure picked', async (t, s) => { s.pick = s.pick || 'slide'; const {page, build} = PICK[s.pick]; await visit(t, s, page, build(t), "time to fly home! We'll pass an old friend on the way."); }],
    ['home, past the volcano', async (t, s) => {
      const {cab, dg, rim, seat, places} = s;
      const S = dg.S, saw = name => !!places[3] && places[3].saw(name), slid = name => !!places[4] && places[4].saw(name), isle = s.pick === 'hotspot';
      cab.view('sunset'); t.watch(cab.world, cab.shot('class'), seat);
      if (!isle) await t.say([['basil', "My knees are STILL wobbly."], ['mo', "And I still can't find my snack."]]);
      if (isle) await check(t, 'basil', "Can I ask one first? Why did the ground shake on the island?", ["Magma squeezed in and cracked the rock", "Two plates bumped", "A whale bumped the island"], 0,
        "There was no plate edge there. Remember what the goggles showed under the volcano?",
        "Magma squeezed in, the ground swelled up like a balloon, and the rock cracked! And I know what to do.");
      else await check(t, 'basil', "Can I ask one first? Why did the ground shake at the fault?", ["Stuck plates bent, then snapped", "A giant stomped on it", "The bus landed too hard"], 0,
        slid('quake') ? "Remember the fence you pushed and pushed?" : "Think of the crack across the road.",
        "Stuck plates bend and bend, then SNAP! That's an earthquake. And I know what to do.");
      // the hint is whatever the explorer saw crumple where the plates crash
      const recall = [saw('rug') && 'the rug', saw('shell') ? 'the shell on the mountain top' : saw('peaks') && 'the mountains in the time goggles'].filter(Boolean);
      await check(t, 'juniper', "Last one for my notebook! What happens when two plates crash?", ["The ground crumples up into mountains", "The plates melt into lava", "Nothing happens"], 0,
        recall.length ? `Remember ${recall.join(', and ')}?` : "Think of the tall mountains in the valley.",
        saw('peaks') ? "Mountains! Even the sea floor got pushed up high." : "Mountains! The ground crumples up, like a pushed rug.");
      const by = rim.flyby();
      await t.say([['pip', "Hey, look! It's our volcano!"]]);
      await by;
      S.mode = 'earth'; S.gear = null; S.bus = null; S.depth = false; S.labels.clear(); S.melt = true; ['trench', 'plates'].forEach(l => S.labels.add(l));
      t.watch(dg.world, dg.frame(860, 300, 1.6, .3));
      await t.say([['sparks', "Here's the volcano's secret. See the plate under the sea?"],
                   ['sparks', "It dives down, under the island."],
                   ['basil', "It's sinking, like the cool slab I saw in the mantle!"],
                   ['sparks', "Deep down, it's so hot that rock melts. Then the melted rock rises up…"]]);
      const pick = await t.ask('pip', "So why are the volcanoes in a row?", ["They're all along the edge where the plates meet", "Somebody planted them", "The sea made them"]);
      await t.say([['basil', pick === 0 ? "Yes! They line up where one plate dives under the other!" :
                            "I know this one! They line up where one plate dives under the other!"],
                   ['juniper', "That answers our very first question!"]]);
      if (isle) await t.say([['pip', "But the islands at the hotspot were in a row too, and no plate was diving there!"],
                             ['sparks', "Right! Those lined up because the plate slid over the plume, like paper over a candle. Two different ways to make a row of volcanoes!"]]);
      S.melt = false;
      t.watch(cab.world, cab.shot('teacher'), seat);
      await t.say([['sparks', "Splendid exploring, class. Wonder Bus, take us home!"]]);
    }],
  ],
  outro: [['sparks', "Home sweet Lantern Hill! So, {name}: the ground shakes and mountains grow because Earth's crust is broken into plates."],
          ['sparks', "And they're always moving, very, very slowly."],
          ['basil', "Can we go on another field trip tomorrow?"]],
  badge: {title:'Plate Tectonics Explorer', draw: (c, s) => drawBadge(c, full(s), aced()),
    text: (name, s) => `You stood on a volcano, rode the mantle up to the sea floor, and made mountains rise` +
      (s && s.pick === 'hotspot' ? ", and watched a new island grow over a plume" : " and a fault snap") + `. Splendid work, ${name}!` +
      (full(s) ? " And you found every single thing in Juniper's notebook!" : "") + (aced() ? " And you aced Dr. Sparks's Explorer Check!" : "") +
      (s && s.pick && !((load('trips') || {})[KEPT] || {})[skipped(s)] ? ` Next time: ${PICK[s.pick === 'slide' ? 'hotspot' : 'slide'].name}!` : "")},
  quiz,
};
// every star in Dr. Sparks's Explorer Check, on some try
const aced = () => ((load('trips') || {})[quiz.key] || 0) >= quiz.questions().length;

function drawBadge(c, gold, ring){
  const g = c.getContext('2d'), s = c.width/360; g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, 360, 360); g.translate(180, 170);
  g.lineJoin = 'round';
  // a full notebook earns a golden burst behind the badge
  if (gold) { g.beginPath(); for (let k = 0; k < 32; k++) { const r = k % 2 ? 140 : 168, a = k*Math.PI/16; g.lineTo(Math.cos(a)*r, Math.sin(a)*r); } g.closePath();
    g.fillStyle = '#ffd36b'; g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 5; g.stroke(); }
  // a perfect Explorer Check rings it with stars
  if (ring) for (let k = 0; k < 16; k++) { const a = k*Math.PI/8 - Math.PI/2; if (Math.abs(Math.sin(a)) > .9 && Math.sin(a) > 0) continue;
    g.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 6 : 14, b = j*Math.PI/5 - Math.PI/2; g.lineTo(Math.cos(a)*150 + Math.cos(b)*r, Math.sin(a)*150 + Math.sin(b)*r); }
    g.closePath(); g.fillStyle = '#ffd36b'; g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 2.5; g.stroke(); }
  g.fillStyle = '#b5552f'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx*34, 70); g.lineTo(sx*70, 180); g.lineTo(sx*46, 160); g.lineTo(sx*24, 182); g.closePath(); g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 5; g.stroke(); }
  g.fillStyle = '#d9a441'; g.beginPath(); g.arc(0, 0, 128, 0, 7); g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#2f5552'; g.beginPath(); g.arc(0, 0, 100, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, 100, 0, 7); g.clip();
  g.fillStyle = '#f2963a'; g.fillRect(-100, 36, 200, 70);
  g.fillStyle = '#6b5a52'; g.beginPath(); g.moveTo(-100, 38); g.lineTo(-46, -34); g.lineTo(-12, 6); g.lineTo(22, -58); g.lineTo(68, 12); g.lineTo(100, -12); g.lineTo(100, 38); g.closePath(); g.fill();
  g.fillStyle = '#f6ecd6'; g.beginPath(); g.moveTo(22, -58); g.lineTo(8, -34); g.lineTo(36, -34); g.closePath(); g.fill();
  g.strokeStyle = '#1a1320'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 38); g.lineTo(-9, 58); g.lineTo(7, 74); g.lineTo(-5, 104); g.stroke();
  g.restore();
  for (let i = 0; i < 3; i++) { g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 6 : 14, a = k*Math.PI/5 - Math.PI/2; g.lineTo(-50 + i*50 + Math.cos(a)*r, -74 + Math.sin(a)*r); } g.closePath(); g.fillStyle = '#ffd36b'; g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 2.5; g.stroke(); }
}
