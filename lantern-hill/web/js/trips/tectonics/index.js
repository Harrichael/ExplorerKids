// The plate tectonics field trip: why the ground shakes and how mountains grow, told as one ride.
// The class lands on a volcano and wonders why it stands in a row with others; drills down through
// the crust into the mantle and watches it turn over; rides it up to a ridge on the sea floor where
// plates pull apart; flies the map to where they crash and slide; and on the way home, sees the
// volcano again and knows why it is there.
//
// This file is the storyboard: the rides, with what is said and shown, and the order of the places.
// What happens at each place lives with the place.

import { Sound } from '../../core/sound.js';
import { game } from '../../state.js';
import { cabin } from '../cabin.js';
import { notebook } from '../notebook.js';
import { puffs } from '../stop-kit.js';
import { diagram } from './diagram.js';
import { buildMantle } from './mantle.js';
import { PAGES } from './pages.js';
import { buildRidge } from './ridge.js';
import { buildRim } from './rim.js';
import { buildValley } from './valley.js';
import { worries } from './worries.js';

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

// every page of Juniper's notebook filled with every find
const full = s => !!s && s.places.length === PAGES.length && s.places.every(c => { const n = c.tally(); return n.seen === n.of; });

export const tectonics = {
  id: 'tectonics',
  intro: [['sparks', "All aboard the Wonder Bus, {name}! Basil and Mo are coming too."],
          ['pip', "Window seat!"]],
  // what every chapter shares: the bus's inside, the diagram, the volcano, seen again at the end, and each
  // place's class in notebook order, remembering what the explorer saw there
  setup: t => ({cab:cabin(), dg:diagram(), rim:buildRim(t), seat:{seated:true}, places:[]}),
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
      await t.say([['basil', "I knew I should have stayed home."], ['basil', "I made a worry list. Just in case."]]);
      worries();
      await t.say([['sparks', "Let's see how many we can cross off today, Basil!"]]);
    }],
    ['the volcano rim', async (t, {cab, dg, rim, seat, places}) => {
      await rim.arrive();
      await rim.explore();
      places[0] = rim.cls; await notebook(PAGES, 0, places.map(c => c.tally()));
      await rim.depart();
    }],
    ['the drill dive', async (t, {cab, dg, rim, seat}) => {
      const S = dg.S; S.mode = 'earth'; S.gear = 'drill'; S.depth = true; S.bus = [dg.VOLCANO, 60];
      t.watch(dg.world, dg.frame(800, 300, 1.7));
      const dive = dg.travel([[dg.VOLCANO, 60], [dg.VOLCANO, 120], [dg.VOLCANO, dg.surfaceY(dg.VOLCANO) + 18], [dg.VOLCANO + 6, 330]], 6);
      await t.say([['sparks', "Here's us, class, drilling down through the volcano!"]]);
      await dive;
      cab.view('rock'); t.watch(cab.world, cab.shot('window'), seat);
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
      const dust = puffs(cab.world, 2, 1.3, 0, {rate:0, rise:.3, size:1.3, color:0x8a6a5a, opacity:.6, spread:1.8, life:1.6});
      dust.burst = .5; game.camShake = 3; S.gear = null;
      Sound.tone(110, {type:'sawtooth', dur:.5, vol:.12, f2:45, cut:600}); Sound.hiss({dur:.6, vol:.16, type:'lowpass', freq:500}); Sound.tone(1500, {type:'square', t:.08, dur:.05, vol:.03, cut:3000});
      await t.wait(1);
      await t.say([['pip', "Uh oh. The drill bit just snapped off!"], ['basil', "I KNEW I should have stayed home."],
                   ['sparks', "No drill? Then we'll let the Earth carry us up!"], ['sparks', "Heat bubble, on!"]]);
    }],
    ['the mantle', async (t, {cab, dg, rim, seat, places}) => {
      const mantle = buildMantle(t);
      await mantle.arrive();
      await mantle.explore();
      places[1] = mantle.cls; await notebook(PAGES, 1, places.map(c => c.tally()));
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
    ['the ridge', async (t, {cab, dg, rim, seat, places}) => {
      const ridge = buildRidge(t);
      await ridge.arrive();
      await ridge.explore();
      places[2] = ridge.cls; await notebook(PAGES, 2, places.map(c => c.tally()));
      await ridge.depart();
    }],
    ['the map flight', async (t, {cab, dg, rim, seat}) => {
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
      await t.say([['sparks', "If plates pull apart here, they must crash together somewhere else. Let's go see!"]]);
    }],
    ['where plates crash and slide', async (t, {cab, dg, rim, seat, places}) => {
      const valley = buildValley(t);
      await valley.arrive();
      await valley.explore();
      places[3] = valley.cls; await notebook(PAGES, 3, places.map(c => c.tally()));
      await valley.depart();
    }],
    ['home, past the volcano', async (t, {cab, dg, rim, seat, places}) => {
      const S = dg.S, saw = name => !!places[3] && places[3].saw(name);
      cab.view('sunset'); t.watch(cab.world, cab.shot('class'), seat);
      // the hint is whatever the explorer saw crumple in the valley
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
      S.melt = false;
      t.watch(cab.world, cab.shot('teacher'), seat);
      await t.say([['sparks', "Splendid exploring, class. Wonder Bus, take us home!"]]);
    }],
  ],
  outro: [['sparks', "Home sweet Lantern Hill! So, {name}: the ground shakes and mountains grow because Earth's crust is broken into plates."],
          ['sparks', "And they're always moving, very, very slowly."],
          ['basil', "Can we go on another field trip tomorrow?"]],
  badge: {title:'Plate Tectonics Explorer', draw: (c, s) => drawBadge(c, full(s)),
    text: (name, s) => `You stood on a volcano, rode the mantle up to the sea floor, and made mountains rise and faults snap. Splendid work, ${name}!` +
      (full(s) ? " And you found every single thing in Juniper's notebook!" : "")}
};

function drawBadge(c, gold){
  const g = c.getContext('2d'), s = c.width/360; g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, 360, 360); g.translate(180, 170);
  g.lineJoin = 'round';
  // a full notebook earns a golden burst behind the badge
  if (gold) { g.beginPath(); for (let k = 0; k < 32; k++) { const r = k % 2 ? 140 : 168, a = k*Math.PI/16; g.lineTo(Math.cos(a)*r, Math.sin(a)*r); } g.closePath();
    g.fillStyle = '#ffd36b'; g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 5; g.stroke(); }
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
