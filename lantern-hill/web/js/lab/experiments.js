// Dr. Sparks' experiment book. Every experiment is a few rounds of: a question, the explorer's
// prediction, a free test with everything on the desk, and what actually happened. Nothing is a
// checklist: a round ends when the desk shows the answer, however the explorer got there.
//
// A round predicts one of two ways:
//   choose: picture cards; observe() returns the id of the card that came true
//   sort:   put each thing in the tray for your guess; observe() returns {thing: bin} for things tested so far
// hints are offered one at a time, only to an explorer who seems stuck or asks.
//
// The book is a tree, not a list: an experiment opens once everything in its `after` is done, and is
// listed after those. What an experiment puts on the desk is what finishing it stocks in the Free
// Lab's cabinet.

import * as chem from './chem.js';
import { desk, find, isVessel, poleMeets, restingIn, totalGas, weighing } from './desk.js';
import { ITEMS } from './stuff.js';

const S = text => ['sparks', text];
const wet = () => desk.items.filter(v => !v.gone && isVessel(v) && chem.waterVol(v.c) > 20);
const containers = () => desk.items.filter(v => !v.gone && isVessel(v));
const count = stat => containers().reduce((n, v) => n + v.stats[stat], 0);
const settled = id => { const it = find(id), s = it && it.settled; return s && chem.waterVol(s.v.c) > 20 ? s : null; };
const shade = c => { const p = chem.ph(c); return p < 5.5 ? 'pink' : p > 8.5 ? 'green' : 'purple'; };
// a color counts once the juice has really changed; staying purple only counts after plenty went in
const settledShade = (c, added, plenty) => { const sh = shade(c); return sh !== 'purple' || added > plenty ? sh : null; };
const COLORS = [{id:'pink', label:'Pink', swatch:'#e2457f'}, {id:'purple', label:'Stays purple', swatch:'#6e45a8'}, {id:'green', label:'Green', swatch:'#5cb83a'}];
const MIXES = [{id:'orange', label:'Orange', swatch:'#ef8a2c'}, {id:'green', label:'Green', swatch:'#4fa23a'}, {id:'purple', label:'Purple', swatch:'#7a4aa8'}];
const DYES = ['red', 'yellow', 'blue'];
function hue(col){
  const r = (col >> 16 & 255)/255, g = (col >> 8 & 255)/255, b = (col & 255)/255, hi = Math.max(r, g, b), d = hi - Math.min(r, g, b);
  if (d < .08) return -1;
  return ((hi === r ? (g - b)/d : hi === g ? (b - r)/d + 2 : (r - g)/d + 4)*60 + 360) % 360;
}
// the color a cup of exactly these two dyes has come out, once there's enough of each to tell
function mixed(a, b){
  for (const v of wet()) {
    const l = v.c.l; if (!(l[a] >= 1.5 && l[b] >= 1.5) || DYES.some(k => k !== a && k !== b && l[k] > .2)) continue;
    const h = hue(chem.look(v.c).col);
    const name = h >= 3 && h < 50 ? 'orange' : h >= 60 && h < 175 ? 'green' : h >= 240 && h < 335 ? 'purple' : null;
    if (name) return name;
  }
  return null;
}
// a cup is full of a powder when no more of it will dissolve, and some is left lying on the bottom
const full = (v, k) => (v.c.p[k] || 0) > 1 && chem.SUB[k].sol*chem.waterVol(v.c) - (v.c.l[k] || 0) < .3;
// what a penny is soaking in, if it's one of the baths being compared
function bath(c){
  const wv = chem.waterVol(c); if (wv < 20) return null;
  const p = chem.ph(c), salt = (c.l.salt || 0)/wv, salty = salt > .01, plain = salt < .003;
  return p < 4 ? (salty ? 'salty' : plain ? 'vinegar' : null) : p > 6.5 ? (salty ? 'saltwater' : plain ? 'water' : null) : null;
}
const pennies = () => desk.items.filter(it => !it.gone && it.tarnish !== undefined);
const SHINY = .25;
const clips = () => desk.items.filter(it => !it.gone && it.type === 'paperclip');
const apart = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// what the test strip read in a cup that had just one thing poured in (plain water counts as one, and
// a powder needs water to be tested in), once it had finished dissolving and fizzing
const TESTS = ['lemon', 'vinegar', 'water', 'soap', 'soda'];
const PH_BIN = p => p < 6.5 ? 'acid' : p > 7.5 ? 'base' : 'neutral';
const magnets = () => desk.items.filter(it => !it.gone && it.def.tool === 'magnet');
// which way a thing lying on the mat points, as an angle around the up axis
const yaw = it => { const q = it.body.rotation(); return Math.atan2(-2*(q.x*q.z - q.w*q.y), 1 - 2*(q.y*q.y + q.z*q.z)); };
const turned = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
// a balance with one thing in each pan that has stopped swinging: which side is down, if either
function weighed(){
  const w = weighing('balance'); if (!w || w.calm < 1 || w.left.length !== 1 || w.right.length !== 1) return null;
  const [l, r] = [w.left[0], w.right[0]];
  return Math.abs(w.tilt) < .02 ? {level:true, l, r} : w.tilt > 0 ? {down:r, up:l} : {down:l, up:r};
}
// How many pennies a boat carried while it still floated steady, once it has gone under (null till then).
// A penny that lands and sinks it at once never floated with it, so it doesn't count.
function carried(id, run, key){
  const b = find(id); if (!b) return null;
  if (chem.liquidVol(b.c) > b.cap*.5) return run[key] === undefined ? null : run[key];
  if (b.still > .5 && b.settled && b.settled.floating) run[key] = desk.items.filter(c => !c.gone && c.type === 'coin' && restingIn(c.id) === id).length;
  return null;
}
const HOW_MANY = n => n <= 2 ? 'few' : n <= 5 ? 'some' : 'lots';

export const EXPERIMENTS = [
  {id:'sinkfloat', after:[], title:'Sink or Float?', grade:'K–1', blurb:'Which treasures float in a tub of water?',
    setup:[['tub', 'tub', .38, -.14, {fill:{water:1050}}], ['float', 'tray', -.48, .33, {label:'FLOAT?', color:0x2f8f8a}], ['sink', 'tray', -.12, .33, {label:'SINK?', color:0x6d3b5e}],
           ['apple', 'apple', -.62, -.3], ['rock', 'rock', -.45, -.36], ['cork', 'cork', -.3, -.28], ['coin', 'coin', -.15, -.36], ['duck', 'duck', -.02, -.26]],
    rounds:[{
      q:"Which treasures will float, and which will sink?", ask:[S("Experiment number one, {name}! A tub of water, and five treasures."), S("Which ones will float, and which will sink? Put each treasure in the tray that matches your guess.")],
      sort:{bins:{float:'Float', sink:'Sink'}, things:{apple:'Apple', rock:'Rock', cork:'Cork', coin:'Coin', duck:'Duck'}},
      test:[S("Great guesses! Now let's find out. Drop each treasure into the tub and watch.")],
      hints:[[S("Pick a treasure out of its tray and let go over the tub.")], [S("Wait until it stops bobbing. Is it at the top, or on the bottom?")]],
      observe: () => { const r = {}; for (const id of ['apple', 'rock', 'cork', 'coin', 'duck']) { const s = settled(id); if (s) r[id] = s.floating ? 'float' : 'sink'; } return r; },
      why:{apple:"Apples float! An apple is about one quarter air inside, like a tiny life jacket.", rock:"The rock sinks. It's heavy for its size.",
        cork:"Cork is full of teeny pockets of air, so it floats.", coin:"Even a tiny coin sinks! Small doesn't mean floaty. It's how heavy you are for your size.",
        duck:"The duck is hollow and full of air, so it floats."}}],
    explain:[S("Things that are heavy for their size sink. Things that are light for their size float."), S("Scientists call how heavy something is for its size its density. You just tested it!")]},

  {id:'colors', after:['sinkfloat'], title:'Color Mixer', grade:'K–1', blurb:'What new colors can you make?',
    setup:[['c1', 'cup', -.4, .1, {fill:{water:80}}], ['c2', 'cup', 0, .1, {fill:{water:80}}], ['c3', 'cup', .4, .1, {fill:{water:80}}],
           ['red', 'red', -.2, -.32], ['yellow', 'yellow', 0, -.34], ['blue', 'blue', .2, -.32]],
    rounds:[
      {q:"What color will red and yellow make?", ask:[S("Three cups of water and three colors, {name}: red, yellow and blue."), S("What color will you get if you mix red and yellow?")],
        choose:MIXES, test:[S("Drip some red and some yellow into the same cup and see!")],
        hints:[[S("Tip the red dropper over a cup for a few drops. Then the yellow, into the same cup.")], [S("Still mostly one color? Add a drop more of the other.")]],
        observe: () => mixed('red', 'yellow'), say:{orange:"Orange! Red and yellow make orange."}},
      {q:"What color will blue and yellow make?", ask:[S("Now a fresh cup. What will blue and yellow make?")],
        choose:MIXES, test:[S("Drip blue and yellow into a cup that's still clear.")],
        hints:[[S("Use a clear cup, so the red doesn't join in.")], [S("Still mostly one color? Add a drop more of the other.")]],
        observe: () => mixed('blue', 'yellow'), say:{green:"Green! Blue and yellow make green."}},
      {q:"What color will red and blue make?", ask:[S("Last one. What will red and blue make?")],
        choose:MIXES, test:[S("Drip red and blue into the last clear cup.")],
        hints:[[S("Use the cup that's still clear.")], [S("No clear cups left? Press Start over for fresh water.")]],
        observe: () => mixed('red', 'blue'), say:{purple:"Purple! Red and blue make purple."}}],
    explain:[S("Red, yellow and blue are called primary colors. Mix any two and you get a brand new color."),
             S("Each color in the water soaks up some of the light. What's left over for your eyes is the new color!")]},

  {id:'balance', after:['sinkfloat'], title:'Balance Scale', grade:'K–2', blurb:'Which is heavier?',
    setup:[['balance', 'balance', .12, .1], ['apple', 'apple', -.52, .38], ['rock', 'rock', -.3, .4], ['duck', 'duck', .3, .4], ['coin', 'coin', .52, .4]],
    rounds:[
      {q:"Which is heavier, the apple or the rock?", ask:[S("This is a balance, {name}. The heavier side goes down, and when both sides weigh the same, it sits level."), S("Which is heavier: the apple, or the rock?")],
        choose:[{id:'apple', label:'The apple', icon:'🍎'}, {id:'rock', label:'The rock', icon:'🪨'}, {id:'same', label:'They weigh the same', icon:'⚖️'}],
        test:[S("Put the apple in one pan and the rock in the other. Wait for the balance to stop swinging.")],
        hints:[[S("Carry the apple over one pan and let go. Then the rock over the other pan.")], [S("Just one thing in each pan. Then wait until it stops swinging.")]],
        observe: () => { const w = weighed(), ids = w && [w.l || w.down, w.r || w.up].map(o => o.id).sort().join(); return ids !== 'apple,rock' ? null : w.level ? 'same' : w.down.id; },
        say:{apple:"The apple is heavier! It's big and full of juice. You can't always tell by looking: that's why we weigh things.", rock:"The rock is heavier. Small, but packed tight.", same:"They balance! Just the same."}},
      {q:"Is the bigger thing always the heavier one?", ask:[S("Here's a tricky one. Is the bigger thing always heavier?")],
        choose:[{id:'yes', label:'Yes, always', icon:'🐘'}, {id:'no', label:'No, not always', icon:'🪶'}],
        test:[S("Test it! Put something big in one pan and something small in the other. Try the duck!")],
        hints:[[S("Take out the apple. Then try the big duck against the little rock.")], [S("One thing in each pan, and wait for it to stop swinging.")]],
        // one small thing outweighing a bigger one shows it; any number of big ones winning can't show "always"
        observe: () => { const w = weighed(); return w && !w.level && w.down.size < w.up.size*.8 ? 'no' : null; },
        say:{no:"The smaller thing is heavier! Being big doesn't make something heavy. What it's made of matters too."}}],
    explain:[S("A balance compares weights. The heavier side goes down, and when both sides weigh the same, the beam sits level."),
             S("Big things can be light, like a duck full of air. Small things can be heavy, like a rock packed tight. To know for sure, weigh it!")]},

  {id:'magnets', after:['sinkfloat'], title:'Magnet Hunt', grade:'1', blurb:'What will a magnet pick up?',
    setup:[['yes', 'tray', -.46, .34, {label:'STICKS?', color:0xd8303a}], ['no', 'tray', -.1, .34, {label:'NOPE?', color:0x34406b}], ['magnet', 'magnet', .6, .3],
           ['paperclip', 'paperclip', -.62, -.25], ['nail', 'nail', -.4, -.36], ['key', 'key', -.18, -.28], ['coin', 'coin', .02, -.38],
           ['foil', 'foil', .2, -.26], ['crayon', 'crayon', .4, -.36], ['button', 'button', .6, -.24], ['cork', 'cork', .55, .0]],
    rounds:[{
      q:"Which things will stick to the magnet?", ask:[S("This red horseshoe is a magnet, {name}. Magnets pull on some things, but not others."), S("Which of these will stick to it? Sort them into the trays first.")],
      sort:{bins:{yes:'Sticks', no:'Nope'}, things:{paperclip:'Paperclip', nail:'Nail', key:'Key', coin:'Coin', foil:'Foil', crayon:'Crayon', button:'Button', cork:'Cork'}},
      test:[S("Now pick up the magnet and bring it close to each thing. What happens?")],
      hints:[[S("Hold the magnet just above a thing, nice and close.")], [S("Try every single thing, even the shiny ones!")]],
      observe: () => { const r = {}; for (const it of desk.items) { if (it.stuck) r[it.id] = 'yes'; else if (it.snubbed) r[it.id] = 'no'; } return r; },
      why:{paperclip:"Paperclips are steel, and steel is mostly iron. Click!", nail:"Nails are iron through and through.", key:"This key is steel, so the magnet grabs it.",
        coin:"The coin is metal, but it isn't iron, so the magnet doesn't care about it.", foil:"Foil is aluminum. Shiny and metal, but magnets don't pull on it!",
        crayon:"Crayons are wax. No pull at all.", button:"Plastic buttons don't feel a magnet.", cork:"Cork comes from a tree. Nothing magnetic there."}}],
    explain:[S("Magnets pull on things made with iron, like steel paperclips, nails and keys."), S("Lots of other things, even metals like coins and foil, don't feel a magnet's pull at all.")]},

  {id:'makemagnet', after:['magnets'], title:'Make a Magnet', grade:'2–3', blurb:'Turn a plain nail into a magnet.',
    setup:[['bar', 'bar', 0, -.05, {rot:Math.PI/2}], ['nail', 'nail', -.45, .25], ['pc1', 'paperclip', .42, .26], ['pc2', 'paperclip', .56, .33], ['pc3', 'paperclip', .52, .15]],
    rounds:[
      {q:"Will a plain nail pick up a paperclip?", ask:[S("Here's a plain steel nail, {name}, and a bar magnet. Magnets pull on steel, remember?"), S("But can the nail pick up a paperclip all by itself?")],
        choose:[{id:'yes', label:'Yes, it picks one up', icon:'📎'}, {id:'no', label:"No, it can't", icon:'🚫'}],
        test:[S("Pick up the nail and hold it right over the paperclips.")], hints:[[S("Carry the nail over a paperclip and hold it there for a moment.")]],
        observe: run => {
          const n = find('nail'); if (!n) return null;
          if (clips().some(c => c.clingTo === n)) return 'yes';
          const near = desk.held === n && clips().some(c => apart(c.body.translation(), n.body.translation()) < .05);
          run.near = near ? (run.near || 0) + desk.t - (run.at || desk.t) : 0; run.at = desk.t;
          return run.near > 2 ? 'no' : null;
        },
        say:{no:"Nothing at all. The nail is steel, so a magnet pulls on it. But on its own, the nail isn't a magnet.", yes:"It picked one up! This nail must already be a little bit magnetic."}},
      {q:"What happens if we stroke the nail along the magnet, again and again?", ask:[S("Now a trick. We'll slide the nail across one end of the magnet, the same way, over and over."), S("What do you think will happen to the nail?")],
        choose:[{id:'magnet', label:'It becomes a magnet!', icon:'🧲'}, {id:'nothing', label:'Nothing changes', icon:'😶'}, {id:'stuck', label:'It sticks to the magnet for good', icon:'🔒'}],
        test:[S("Try it! Slide the nail across one end of the magnet, lift it away, and come back around to the start. At least ten times, always the same way!")],
        hints:[[S("Slide the nail from one side to the other, right across one end of the bar magnet.")], [S("Always go the same way! Back and forth undoes it. Swing around the side to start again.")],
               [S("After ten or more strokes, touch the point of the nail to a paperclip.")]],
        baseline: () => Object.fromEntries(clips().map(c => [c.id, {...c.body.translation()}])),
        observe: r => { const n = find('nail'); return n && clips().some(c => c.clingTo === n && r.base[c.id] && apart(c.body.translation(), r.base[c.id]) > .06) ? 'magnet' : null; },
        say:{magnet:"It's a magnet now! It carried a paperclip away. Stroking lined up the steel's tiny magnetic bits, all pointing the same way."}}],
    explain:[S("Steel is full of tiny magnetic regions called domains. Usually they point every which way, so they cancel out."),
             S("Stroking with a magnet, always the same way, lines them up. Rubbing back and forth mixes them up again, so it barely works."),
             S("Your nail magnet is weaker than the real one, because only some of its domains lined up.")]},

  {id:'poles', after:['makemagnet'], title:'Magnet Poles', grade:'2–3', blurb:'Do magnets pull, or push?',
    setup:[['bar', 'bar', -.45, .3], ['b1', 'bar', -.05, .02], ['b2', 'bar', .45, .02, {rot:Math.PI}], ['dish', 'dish', .38, .27, {fill:{water:90}}], ['clip', 'paperclip', .445, .27, {y:.008}], ['magnet', 'magnet', .66, .44]],
    rounds:[
      {q:"What happens when a north pole meets a south pole?", ask:[S("These are bar magnets, {name}. Each end is a pole: the red end is north, N, and the blue end is south, S."),
          S("What will happen if the north end of one magnet meets the south end of another?")],
        choose:[{id:'pull', label:'They pull together', icon:'🧲'}, {id:'push', label:'They push apart', icon:'↔️'}, {id:'nothing', label:'Nothing happens', icon:'😶'}],
        test:[S("Pick up a magnet and slide it end first, slowly, toward the other color end of another magnet.")],
        hints:[[S("Slide your magnet along the mat, end first, toward the end of another one.")], [S("Red goes to blue! Bring them really close.")]],
        observe: () => poleMeets().some(m => !m.like && m.d < .025) ? 'pull' : null,
        say:{pull:"Click! A north pole and a south pole pull each other together."}},
      {q:"What happens when two north poles meet?", ask:[S("Now, what if two north poles meet? Or two south poles?")],
        choose:[{id:'pull', label:'They pull together', icon:'🧲'}, {id:'push', label:'They push apart', icon:'↔️'}, {id:'nothing', label:'Nothing happens', icon:'😶'}],
        test:[S("Find two red ends, or two blue ends, and slowly bring them together. Watch the magnet you're not holding!")],
        hints:[[S("The magnet on the right is turned around: its red end is on its right.")], [S("Go slowly, end first, and watch the other magnet closely.")]],
        baseline: () => Object.fromEntries(magnets().map(m => { const t = m.body.translation(); return [m.id, {x:t.x, z:t.z, yaw:yaw(m)}]; })),
        // a free magnet that slid or turned while a like pole was close, and isn't stuck on anything
        observe: r => {
          const meets = poleMeets(), stuck = id => meets.some(m => !m.like && m.d < .03 && (m.a === id || m.b === id));
          for (const m of meets) {
            if (!m.like || m.d > .08) continue;
            for (const id of [m.a, m.b]) {
              const it = find(id), b = r.base[id]; if (!it || it === desk.held || !b || stuck(id)) continue;
              const t = it.body.translation(); if (Math.hypot(t.x - b.x, t.z - b.z) > .03 || turned(yaw(it), b.yaw) > .5) return 'push';
            }
          }
          return null;
        },
        say:{push:"Whoa! Like poles push each other away. Two norths, or two souths, always push apart."}},
      {q:"Can a magnet pull through glass and water?", ask:[S("There's a paperclip lying in this dish of water. Can a magnet pull it through the side of the glass, and through the water too?")],
        choose:[{id:'yes', label:'Yes, right through', icon:'✅'}, {id:'no', label:'No, the glass blocks it', icon:'🚫'}],
        test:[S("Slide the horseshoe magnet along the mat, right up against the outside of the dish, next to the paperclip.")],
        hints:[[S("Pick up the red horseshoe magnet and slide it along the mat until it touches the dish, near the paperclip.")], [S("Now move the magnet slowly around the dish. Does the paperclip follow?")]],
        // a paperclip resting under water starts moving with a magnet close by, outside its cup
        observe: run => {
          run.at = run.at || {};
          for (const p of desk.items.filter(it => !it.gone && it.type === 'paperclip')) {
            if (!p.soakIn || p === desk.held) { delete run.at[p.id]; continue; }
            const t = p.body.translation();
            if (!run.at[p.id]) { if (p.soakT > 1) run.at[p.id] = {x:t.x, z:t.z}; continue; }
            const near = magnets().some(m => { const mt = m.body.translation(); return restingIn(m.id) !== p.soakIn.id && Math.hypot(mt.x - t.x, mt.z - t.z) < .14; });
            if (near && Math.hypot(t.x - run.at[p.id].x, t.z - run.at[p.id].z) > .02) return 'yes';
          }
          return null;
        },
        say:{yes:"It moves! A magnet's pull goes right through glass and water."}}],
    explain:[S("Every magnet has a north pole and a south pole. Unlike poles pull together, and like poles push apart."),
             S("A magnet's pull goes through glass, water, paper and plastic. Only things made of iron or steel get in its way, because the magnet pulls on them instead."),
             S("The whole Earth is a giant magnet too. That's what a compass needle lines up with!")]},

  {id:'volcano', after:['sinkfloat'], title:'Fizzy Volcano', grade:'1–2', blurb:'What happens when vinegar meets baking soda?',
    setup:[['volcano', 'volcano', 0, -.08], ['soda', 'soda', -.55, -.25], ['vinegar', 'vinegar', .55, -.22], ['soap', 'soap', .45, .2], ['red', 'red', -.5, .24]],
    rounds:[{
      q:"What happens when vinegar meets baking soda?", ask:[S("Here's a big question, {name}. What happens when vinegar meets baking soda?")],
      choose:[{id:'still', label:'Nothing at all', icon:'😶'}, {id:'fizz', label:'It fizzes and foams up!', icon:'🫧'}, {id:'ice', label:'It freezes solid', icon:'🧊'}],
      test:[S("Let's test it! Mix them any way you like. The volcano is there if you want it.")],
      hints:[[S("Baking soda is the white powder in the orange box. Vinegar is in the white bottle.")], [S("Tip some baking soda into the volcano, then pour vinegar on top.")],
             [S("For a really big eruption, add a squirt of dish soap and some red drops first!")]],
      baseline: totalGas, observe: r => totalGas() - r.base > 10 ? 'fizz' : null,
      say:{fizz:"FOOSH! Vinegar is an acid and baking soda is a base. When they meet, they make a gas called carbon dioxide."}}],
    explain:[S("All those bubbles are carbon dioxide gas. With soap in there, the gas gets trapped in foam, and up it goes like lava!")]},

  {id:'rainbow', after:['volcano'], title:'Rainbow Milk', grade:'2', blurb:'Can soap make colors dance?',
    setup:[['dish', 'dish', 0, .02], ['milk', 'milk', -.55, -.22], ['red', 'red', .3, -.38], ['yellow', 'yellow', .42, -.38], ['blue', 'blue', .54, -.38],
           ['saucer', 'saucer', .56, .22], ['swab', 'swab', .36, .32]],
    rounds:[{
      prep:{do:'Pour milk in the dish and drip on some colors', say:[S("First, pour milk into the dish, and drip a few colors onto it.")],
        done: () => { const d = find('dish'); return d && chem.amount(d.c, 'milk') > 50 && desk.fx.hasFilm(d) && desk.fx.film(d).has(); }},
      q:"What will the colors do when soap touches the milk?", ask:[S("Pretty! Now, what do you think will happen to the colors when soap touches the milk?")],
      choose:[{id:'stay', label:'Nothing, they sit still', icon:'😴'}, {id:'zoom', label:'They zoom and swirl!', icon:'🌀'}, {id:'sink', label:'They sink to the bottom', icon:'⬇️'}],
      test:[S("Try it! The cotton swab and the soap dish are right there.")],
      hints:[[S("Dip the cotton swab in the soap dish so its tip gets soapy.")], [S("Now poke the soapy tip into the milk, right near the colors.")]],
      baseline: () => count('bursts'), observe: r => count('bursts') > r.base ? 'zoom' : null,
      say:{zoom:"Whoa! Milk has a stretchy skin on top called surface tension. Soap breaks it and chases the fat around, pushing the colors along for the ride."}}],
    explain:[S("Soap grabs onto fat. Every time you poke, the soap races out across the milk and the colors swirl. Try another poke!")]},

  {id:'pepper', after:['rainbow'], title:'Pepper Run-Away', grade:'2', blurb:'What does soap do to pepper on water?',
    setup:[['dish', 'dish', 0, .02, {fill:{water:110}}], ['pepper', 'pepper', -.5, -.25], ['saucer', 'saucer', .5, .2], ['swab', 'swab', .36, .32]],
    rounds:[{
      prep:{do:'Shake pepper onto the water', say:[S("First, shake lots of pepper onto the water.")],
        done: () => { const d = find('dish'); return d && desk.fx.hasFilm(d) && desk.fx.film(d).flakes.length > 25; }},
      q:"What will the pepper do when a soapy swab touches the water?", ask:[S("Look at all those flakes, floating on top! What will the pepper do when a soapy swab touches the water?")],
      choose:[{id:'sink', label:'It sinks', icon:'⬇️'}, {id:'edges', label:'It rushes to the edges!', icon:'💨'}, {id:'stick', label:'It sticks to the swab', icon:'🪄'}],
      test:[S("Try it! Dip the swab in the soap, then touch it to the middle of the water.")],
      hints:[[S("Dip the cotton swab in the soap dish so its tip gets soapy.")], [S("Now touch the soapy tip to the water, right in the middle.")]],
      observe: () => {
        const d = find('dish'); if (!d || !desk.fx.hasFilm(d)) return null;
        const f = desk.fx.film(d); if (!f.soaps || f.flakes.length < 10) return null;
        return f.flakes.reduce((s, p) => s + Math.hypot(p.x, p.y), 0)/f.flakes.length > .7 ? 'edges' : null;
      },
      say:{edges:"Whoosh! Water has a stretchy skin on top called surface tension. Soap weakens the skin where it touches, and the stronger skin all around pulls the pepper away."}}],
    explain:[S("The pepper isn't scared of soap. The water's skin pulled it to the edges!"),
             S("Poke again and it barely moves: once the soap has spread, the skin is weak everywhere. Fresh water makes it work again.")]},

  {id:'egg', after:['sinkfloat'], title:'The Floating Egg', grade:'2–3', blurb:'Can salt make an egg float?',
    setup:[['jar', 'jar', 0, -.02, {fill:{water:170}}], ['egg', 'egg', -.42, .22], ['salt', 'salt', .4, -.26], ['spoon', 'spoon', .45, .22]],
    rounds:[
      {q:"Will an egg sink or float in plain water?", ask:[S("Here's an egg and a jar of plain water, {name}. Will the egg sink or float?")],
        choose:[{id:'sink', label:'It sinks', icon:'⬇️'}, {id:'float', label:'It floats', icon:'🛟'}],
        test:[S("Gently drop it in and see!")],
        hints:[[S("Carry the egg over the jar and let go.")]],
        observe: () => { const s = settled('egg'); return s ? (s.floating ? 'float' : 'sink') : null; },
        say:{sink:"Down it goes. An egg is a little heavier than the same amount of plain water.", float:"It floats! That must be a very old egg."}},
      {q:"What will the egg do if we stir lots of salt into the water?", ask:[S("Now a trickier one. What will happen if we stir lots of salt into the water?")],
        choose:[{id:'stay', label:'It stays on the bottom', icon:'⬇️'}, {id:'float', label:'It floats up!', icon:'⬆️'}, {id:'crack', label:'The shell cracks', icon:'🥚'}],
        test:[S("Let's find out. The salt shaker and the spoon are yours.")],
        hints:[[S("Turn the salt shaker upside down and shake it over the jar. Lots of shakes!")], [S("Stir with the spoon until the salt disappears.")], [S("Keep adding salt and stirring. Watch the egg closely!")]],
        observe: () => { const s = settled('egg'); return s && s.floating && chem.amount(s.v.c, 'salt') > 3 ? 'float' : null; },
        say:{float:"It floats! Salt makes the water heavier for its size, so it pushes up on the egg harder."}}],
    explain:[S("That's why it's easier to float in the salty ocean than in a swimming pool!")]},

  {id:'boat', after:['egg'], title:'Foil Boat', grade:'2–4', blurb:'How many pennies can a foil boat carry?',
    setup:[['tub1', 'tub', -.34, .08, {fill:{water:1050}}], ['tub2', 'tub', .34, .08, {fill:{water:1050}}], ['boat', 'boat', -.34, -.3], ['wideboat', 'wideboat', .34, -.3],
           ...[-.6, -.4, -.2, 0, .2, .4, .6].flatMap((x, i) => [['p' + i, 'coin', x, .36], ['q' + i, 'coin', x, .46]])],
    rounds:[
      {q:"How many pennies can the foil boat carry?", ask:[S("Here's a little boat folded from foil, {name}, and a tub of water."), S("How many pennies do you think it can carry before it sinks?")],
        choose:[{id:'few', label:'1 or 2', icon:'🪙'}, {id:'some', label:'3 to 5', icon:'🪙'}, {id:'lots', label:'6 or more', icon:'💰'}],
        test:[S("Set the little boat on the water. Then add pennies one at a time, and count!")],
        hints:[[S("Carry the little foil boat over a tub and let go.")], [S("Drop a penny right into the middle of the boat. Then another.")], [S("Keep going until the water spills in!")]],
        observe: run => { const n = carried('boat', run, 'small'); return n === null ? null : HOW_MANY(n); },
        say:{few:"Glug! It only carried a couple before the water rushed in.", some:"Glug! It carried a few pennies, then the water rushed in over the edge.", lots:"Glug! It carried lots of pennies before the water rushed in."}},
      {q:"Will a wider boat carry more pennies?", ask:[S("Now the wide boat. Will it carry more pennies than the little one, or fewer?")],
        choose:[{id:'more', label:'More pennies', icon:'⬆️'}, {id:'same', label:'The same', icon:'🟰'}, {id:'fewer', label:'Fewer pennies', icon:'⬇️'}],
        test:[S("Float the wide boat in the other tub, and count pennies again.")],
        hints:[[S("Put the wide boat in the tub that doesn't have a sunken boat in it.")], [S("Add pennies one at a time, right in the middle.")], [S("Out of pennies? Fish some out of the first tub.")]],
        observe: run => { const n = carried('wideboat', run, 'wide'); return n === null || run.small === undefined ? null : n > run.small ? 'more' : n < run.small ? 'fewer' : 'same'; },
        say:{more:"More! The wide boat pushes aside more water before its edge goes under, so the water pushes up on it harder.",
             same:"The same this time! Were the pennies piled near one edge? That tips a boat so its edge goes under sooner.", fewer:"Fewer! Were the pennies piled near one edge? That tips a boat so its edge goes under sooner."}}],
    explain:[S("A boat sinks into the water until the water it pushes aside weighs as much as the boat and everything in it."),
             S("Each penny makes it sit a little lower. When the edge dips under, water pours in, and down it goes!"),
             S("A wider boat pushes aside more water before its edge goes under, so it can carry more. That's one reason big ships are so wide.")]},

  {id:'dissolve', after:['egg'], title:'Dissolve Detective', grade:'3', blurb:'What disappears in water?',
    setup:[['c1', 'cup', -.45, .02, {fill:{water:110}}], ['c2', 'cup', -.15, .02, {fill:{water:110}}], ['c3', 'cup', .15, .02, {fill:{water:110}}],
           ['sugar', 'sugar', -.62, -.34], ['sand', 'sand', -.35, -.36], ['oil', 'oil', -.12, -.36], ['spoon', 'spoon', .62, .0],
           ['gone', 'tray', -.4, .36, {label:'VANISHES?', color:0x2f8f8a}], ['stays', 'tray', -.04, .36, {label:'STAYS?', color:0xb5552f}]],
    rounds:[{
      q:"Which will vanish in water, and which will stay?", ask:[S("Time to be a detective, {name}. If you stir these into water, which will disappear, and which will you still be able to see?"), S("Put each one in a tray to show your guess.")],
      sort:{bins:{gone:'Vanishes', stays:'Stays'}, things:{sugar:'Sugar', sand:'Sand', oil:'Oil'}},
      test:[S("Now test them. Put each one in its own cup of water, and stir!")],
      hints:[[S("Tip a little of each into a different cup.")], [S("Then stir each cup with the spoon, round and round.")]],
      observe: () => {
        const r = {};
        for (const v of wet()) {
          if ((v.c.l.sugar || 0) > 2 && !(v.c.p.sugar > .5)) r.sugar = 'gone';
          if ((v.c.p.sand || 0) > 2 && v.stats.stir > .3) r.sand = 'stays';
          if (chem.oilVol(v.c) > 8 && v.stats.stir > .3) r.oil = 'stays';
        }
        return r;
      },
      why:{sugar:"The sugar vanished! It's still there, just in pieces too tiny to see. That water would taste sweet.", sand:"The sand swirls around, then settles right back down. Sand doesn't dissolve.",
        oil:"The oil breaks into drops, then floats back to the top. Oil and water won't mix!"}}],
    explain:[S("When something dissolves, it spreads through the water so well you can't see it anymore. That's called a solution."), S("Sand and oil don't dissolve. They make a mixture, and you can still see every bit.")]},

  {id:'saturate', after:['dissolve'], title:'How Much Dissolves?', grade:'3', blurb:'Can water hold salt forever?',
    setup:[['c1', 'cup', -.22, .05, {fill:{water:60}}], ['c2', 'cup', .22, .05, {fill:{water:60}}], ['saltbox', 'saltbox', -.55, -.28], ['sugar', 'sugar', .55, -.28], ['spoon', 'spoon', 0, -.3]],
    rounds:[
      {q:"Will salt keep dissolving forever?", ask:[S("A little cup of water and a box of salt, {name}. We'll stir in one spoonful at a time."), S("Will the salt keep disappearing forever?")],
        choose:[{id:'one', label:'Only one spoonful', icon:'1️⃣'}, {id:'few', label:'A few, then it stops', icon:'🧂'}, {id:'forever', label:'It vanishes forever', icon:'♾️'}],
        test:[S("Let's find out! Dip the spoon in the salt box, then into a cup, and stir until it vanishes. Then another!")],
        hints:[[S("Hold the spoon over the salt box. It scoops up a spoonful by itself.")], [S("Carry it to a cup and stir round and round.")],
               [S("Keep going, one spoonful at a time, until some salt won't vanish however much you stir.")]],
        observe: run => { for (const v of wet()) if (full(v, 'salt') && v.stats.spoons.salt) { run.salt = v.stats.spoons.salt; return run.salt > 1 ? 'few' : 'one'; } return null; },
        say:{few:"It stopped! Some salt stays on the bottom however much you stir. The water is holding all the salt it can: we say it's saturated.", one:"Just one! The water is holding all the salt it can: we say it's saturated."}},
      {q:"Will more spoonfuls of sugar dissolve, or fewer?", ask:[S("Now sugar, in the other cup. Will more spoonfuls of sugar dissolve than salt, or fewer?")],
        choose:[{id:'fewer', label:'Fewer than salt', icon:'⬇️'}, {id:'same', label:'The same', icon:'🟰'}, {id:'more', label:'More than salt', icon:'⬆️'}],
        test:[S("Scoop sugar into the other cup, one spoonful at a time, and stir. Count as you go!")],
        hints:[[S("The sugar box is the white one. Use the cup with no salt in it.")], [S("Keep adding and stirring. Has it passed the salt yet?")]],
        observe: run => { for (const v of wet()) if (!chem.amount(v.c, 'salt') && (v.stats.spoons.sugar || 0) > (run.salt || 4) && !(v.c.p.sugar > .3)) return 'more'; return null; },
        say:{more:"Still vanishing! Water holds far more sugar than salt. This little cup could take more than twenty spoonfuls."}}],
    explain:[S("Water can only hold so much of something dissolved in it, and how much depends on what it is."),
             S("Warm water holds even more sugar. That's how syrup is made!")]},

  {id:'balloon', after:['volcano'], title:'Balloon Blow-Up', grade:'3–4', blurb:'Blow up a balloon without blowing.',
    setup:[['bottle', 'bottle', 0, 0], ['balloon', 'balloon', -.4, .26], ['soda', 'soda', -.55, -.26], ['vinegar', 'vinegar', .46, -.22]],
    rounds:[{
      q:"What will happen to the balloon?", ask:[S("Vinegar goes in the bottle. Baking soda goes in the balloon. Then the balloon goes on the bottle, and we tip the soda in."), S("What will happen to the balloon?")],
      choose:[{id:'nothing', label:'Nothing', icon:'😶'}, {id:'inflate', label:'It blows itself up!', icon:'🎈'}, {id:'pop', label:'It pops right away', icon:'💥'}],
      test:[S("Let's try it! See if you can blow up the balloon without using your breath.")],
      hints:[[S("Pour some vinegar into the bottle first. About a third full.")], [S("Tip baking soda into the balloon. Not the bottle!")],
             [S("Carry the balloon over and let go right on top of the bottle's neck.")], [S("Now grab the floppy balloon and lift it up, so the soda falls in.")]],
      observe: () => { const b = find('balloon'); return b && b.inflate >= .5 ? 'inflate' : null; },
      say:{inflate:"It blew itself up! The fizzing made carbon dioxide gas, and the gas needed somewhere to go."}}],
    explain:[S("Gas takes up space, even though you can't see it. Enough gas can fill a whole balloon!")]},

  {id:'cork', after:['balloon'], title:'Pop the Cork', grade:'3–4', blurb:'What happens when gas has nowhere to go?',
    setup:[['bottle', 'bottle', 0, 0, {fill:{water:40}}], ['cork', 'cork', -.36, .26], ['t1', 'tablet', .4, .2], ['t2', 'tablet', .52, .28]],
    rounds:[{
      q:"What will happen when the gas has nowhere to go?", ask:[S("A fizzy tablet goes in this bottle of water, {name}. Then we push a cork in the top, quick!"), S("The fizz makes gas. What will happen when the gas has nowhere to go?")],
      choose:[{id:'stop', label:'Nothing, it just stops', icon:'😶'}, {id:'pop', label:'The cork pops off!', icon:'🍾'}, {id:'leak', label:'It leaks out slowly', icon:'💧'}],
      test:[S("Let's find out! Drop a tablet in the bottle, then push the cork into the neck.")],
      hints:[[S("Carry a fizzy tablet, the white disc, over the bottle and let go.")], [S("Now grab the cork and let go of it right on top of the bottle's neck.")],
             [S("Did the fizzing finish first? Drop in the other tablet and be quicker with the cork.")]],
      observe: () => { const c = find('cork'); return c && c.popped ? 'pop' : null; },
      say:{pop:"POP! The gas piled up in the bottle with nowhere to go. It pushed harder and harder on the cork, until the cork couldn't hold on."}}],
    explain:[S("A fizzy tablet is baking soda and a dry acid pressed together. Water lets them meet, and they make gas."),
             S("Gas squeezed into a small space pushes on everything around it. That push is called pressure."),
             S("Pressure pops corks, blows up balloons, and makes a soda bottle hiss when you open it.")]},

  {id:'lava', after:['dissolve', 'volcano'], title:'Lava Lamp', grade:'4', blurb:'Oil, water and a fizzy surprise.',
    setup:[['jar', 'jar', 0, 0, {fill:{water:90}}], ['oil', 'oil', .42, -.3], ['blue', 'blue', -.46, .26], ['red', 'red', -.34, .34], ['t1', 'tablet', .42, .22], ['t2', 'tablet', .55, .3]],
    rounds:[
      {q:"Where will oil go when we pour it on water?", ask:[S("This jar has plain water in it, {name}. Where will the oil go when we pour it in?")],
        choose:[{id:'sink', label:'It sinks underneath', icon:'⬇️'}, {id:'float', label:'It floats on top', icon:'⬆️'}, {id:'mix', label:'It mixes right in', icon:'🔀'}],
        test:[S("Pour in the oil and watch where it goes. Fill the jar most of the way!")],
        hints:[[S("Tip the oil bottle over the jar and hold it there.")]],
        observe: () => wet().some(v => chem.oilVol(v.c) > 40) ? 'float' : null,
        say:{float:"It floats on top! Oil is lighter for its size than water, and the two won't mix."}},
      {q:"What will a fizzy tablet do in there?", ask:[S("Now squeeze in some color if you like. Then the big question: what will a fizzy tablet do in there?")],
        choose:[{id:'sit', label:'Sit on the bottom', icon:'🪨'}, {id:'blobs', label:'Make blobs bubble up and down', icon:'🫧'}, {id:'nothing', label:'Disappear, nothing else', icon:'😶'}],
        test:[S("Drop in a fizzy tablet and see!")],
        hints:[[S("Pick up a fizzy tablet, the white disc, and drop it in the jar.")], [S("Out of tablets? Press Start over for fresh supplies.")]],
        baseline: () => count('blobs'), observe: r => count('blobs') - r.base >= 6 ? 'blobs' : null,
        say:{blobs:"Far out! The tablet makes bubbles of gas. Each bubble grabs a blob of colored water and floats it up through the oil, then the blob sinks back down."}}],
    explain:[S("Oil floats, water sinks, and gas bubbles carry the water up for a ride. That's a lava lamp!")]},

  {id:'fizztest', after:['volcano'], title:'Fizz Test', grade:'2–3', blurb:'Which liquids fizz with baking soda?',
    setup:[['s1', 'cup', -.5, .02, {fill:{soda:12}}], ['s2', 'cup', -.2, .02, {fill:{soda:12}}], ['s3', 'cup', .1, .02, {fill:{soda:12}}], ['s4', 'cup', .4, .02, {fill:{soda:12}}],
           ['vinegar', 'vinegar', -.62, -.33], ['lemon', 'lemon', -.4, -.34], ['soap', 'soap', -.2, -.33], ['water', 'cup', .05, -.34, {fill:{water:70}}],
           ['fizz', 'tray', -.44, .35, {label:'FIZZES?', color:0xb5552f}], ['none', 'tray', -.08, .35, {label:'NO FIZZ?', color:0x34406b}]],
    rounds:[{
      q:"Which liquids will fizz with baking soda?", ask:[S("Each of these cups has a spoonful of baking soda, {name}. Vinegar fizzes with it. What about the others?"), S("Put each liquid in the tray for your guess.")],
      sort:{bins:{fizz:'Fizzes', none:'No fizz'}, things:{vinegar:'Vinegar', lemon:'Lemon juice', soap:'Soap', water:'Water'}},
      test:[S("Now test them! Pour each liquid into its own cup of baking soda.")],
      hints:[[S("Pour a little of one liquid into a cup of baking soda, and watch.")], [S("Use a different cup for each liquid, so you know which one did it.")]],
      // a cup counts for the one liquid poured into it: fizz soon, or a few quiet seconds
      observe: () => {
        const r = {};
        for (const v of containers()) {
          if (!v.full.soda) continue;
          const got = ['vinegar', 'lemon', 'soap', 'water'].filter(k => v.stats.got[k] !== undefined);
          if (got.length !== 1) continue;
          if (v.stats.gas > 1) r[got[0]] = 'fizz'; else if (desk.t - v.stats.got[got[0]] > 3) r[got[0]] = 'none';
        }
        return r;
      },
      why:{vinegar:"Vinegar fizzes! It's an acid, and acids fizz with baking soda.", lemon:"Lemon juice fizzes too. It's an acid, just like vinegar.",
        soap:"No fizz from soap. Soap is a base, like baking soda itself, so they don't react.", water:"Water doesn't fizz. It's neutral: not an acid, and not a base."}}],
    explain:[S("Baking soda is an acid detector! The common things that fizz with it are acids."), S("Acids and bases are opposites. When they meet, they react, and baking soda's reaction makes bubbles of gas.")]},

  {id:'pennies', after:['fizztest'], title:'Shiny Pennies', grade:'2–3', blurb:'What makes an old penny shine?',
    setup:[['d1', 'dish', -.5, .02, {fill:{water:90}}], ['d2', 'dish', 0, .02, {fill:{vinegar:90}}], ['d3', 'dish', .5, .02, {fill:{vinegar:90}}],
           ['p1', 'coin', -.2, .34, {tarnish:1}], ['p2', 'coin', -.07, .38, {tarnish:1}], ['p3', 'coin', .07, .38, {tarnish:1}], ['p4', 'coin', .2, .34, {tarnish:1}],
           ['vinegar', 'vinegar', -.55, -.3], ['saltbox', 'saltbox', .5, -.3], ['spoon', 'spoon', .25, -.32]],
    rounds:[
      {q:"Which will make a dull penny shiny fastest?", ask:[S("These old pennies are dull and brown, {name}. Let's make them shiny again!"), S("Here's plain water, vinegar, and more vinegar we can add salt to. Which will make a penny shiny fastest?")],
        choose:[{id:'water', label:'Plain water', icon:'💧'}, {id:'vinegar', label:'Vinegar', icon:'🫙'}, {id:'salty', label:'Vinegar and salt', icon:'🧂'}],
        test:[S("Let's race them! Stir a spoonful of salt into one vinegar dish. Then drop a penny in each dish.")],
        hints:[[S("Hold the spoon over the salt box to scoop up a spoonful. Then stir it into one of the vinegar dishes.")], [S("Now give every dish a penny: water, vinegar, and salty vinegar.")],
               [S("Watch closely. Which penny turns bright first?")]],
        // the race is on once every bath has a penny in it; the brightest one leads
        observe: () => {
          const by = {};
          for (const p of pennies()) { const b = p.soakIn && bath(p.soakIn.c); if (b && (!by[b] || p.tarnish < by[b].tarnish)) by[b] = p; }
          if (!by.water || !by.vinegar || !by.salty) return null;
          const lead = ['water', 'vinegar', 'salty'].reduce((a, k) => by[k].tarnish < by[a].tarnish ? k : a);
          return by[lead].tarnish < SHINY ? lead : null;
        },
        say:{salty:"Vinegar and salt wins! The acid in vinegar dissolves the dull coating, and the salt speeds it way up.", vinegar:"Plain vinegar got there first this time! Its acid dissolves the dull coating, just slowly.",
             water:"The water penny shone first? Plain water can't dissolve the coating. Look closely at that dish!"}},
      {q:"Will salt in plain water make a penny shiny?", ask:[S("So is it the salt that does the cleaning? What if we put salt in plain water, with no vinegar?")],
        choose:[{id:'shiny', label:'Yes, it shines', icon:'✨'}, {id:'dull', label:'No, it stays dull', icon:'🟤'}],
        test:[S("Stir a spoonful of salt into the dish of plain water. Is there a dull penny in it? Watch it for a little while.")],
        hints:[[S("Scoop a spoonful of salt from the box and stir it into the water dish.")], [S("Make sure a dull penny is lying in the salty water. Then wait.")]],
        observe: run => {
          run.soaks = run.soaks || new Map();
          for (const p of pennies()) {
            if (!(p.soakIn && bath(p.soakIn.c) === 'saltwater')) { run.soaks.delete(p); continue; }
            if (!run.soaks.has(p)) run.soaks.set(p, {t:desk.t, was:p.tarnish});
            const s = run.soaks.get(p);
            if (s.was > .5 && desk.t - s.t > 12) return s.was - p.tarnish > .3 ? 'shiny' : 'dull';
          }
          return null;
        },
        say:{dull:"Still dull! Salt can't do it alone. It takes an acid, like vinegar, to dissolve the coating. The salt just helps the acid along.", shiny:"It's shining! Is there some vinegar in that dish?"}}],
    explain:[S("The brown on an old penny is copper oxide: copper that has joined up with oxygen from the air."),
             S("Acids like vinegar dissolve copper oxide, so the bright copper underneath shows through. Salt makes the acid work much faster."),
             S("Plain water and salt water can't dissolve it, so those pennies stay dull.")]},

  {id:'cabbage', after:['fizztest'], title:'Cabbage Color Detective', grade:'5', blurb:'A purple juice that changes color.',
    setup:[['k1', 'cup', -.4, .2, {fill:{cabbage:110}}], ['k2', 'cup', 0, .2, {fill:{cabbage:110}}], ['k3', 'cup', .4, .2, {fill:{cabbage:110}}],
           ['lemon', 'lemon', -.52, -.3], ['pitcher', 'pitcher', 0, -.32], ['soda', 'soda', .52, -.3]],
    rounds:[
      {q:"What color will cabbage juice turn with lemon juice?", ask:[S("This purple juice came from boiled red cabbage, {name}. It's a secret detector called an indicator."), S("What color will it turn if we add lemon juice?")],
        choose:COLORS, test:[S("Squeeze some lemon juice into one cup and see!")], hints:[[S("Tip the yellow lemon over one of the cups.")]],
        observe: () => { for (const v of containers()) if (v.c.l.cabbage && v.c.l.lemon > 1) { const sh = settledShade(v.c, v.c.l.lemon, 25); if (sh) return sh; } return null; },
        say:{pink:"Pink! Lemon juice is an acid. Acids turn cabbage juice pink and red."}},
      {q:"What color will it turn with baking soda?", ask:[S("What color will it turn with baking soda?")],
        choose:COLORS, test:[S("Tip a little baking soda into a different cup.")], hints:[[S("The baking soda is in the orange box. Pick a cup that's still purple.")], [S("No purple cups left? Press Start over for fresh ones.")]],
        observe: () => { for (const v of containers()) if (v.c.l.cabbage && !v.c.l.lemon && chem.amount(v.c, 'soda') > .5) { const sh = settledShade(v.c, v.c.l.soda || 0, 8); if (sh) return sh; } return null; },
        say:{green:"Green! Baking soda is a base. Bases turn cabbage juice blue and green."}},
      {q:"What color will it turn with plain water?", ask:[S("And plain water? What color will that make it?")],
        choose:COLORS, test:[S("Pour some plain water into the last purple cup.")], hints:[[S("The water pitcher is in the back. Pick the cup that's still purple.")], [S("No purple cups left? Press Start over for fresh ones.")]],
        observe: () => { const v = containers().find(v => v.c.l.cabbage && (v.c.l.water || 0) > 30 && !v.c.l.lemon && !chem.amount(v.c, 'soda')); return v ? shade(v.c) : null; },
        say:{purple:"It stays purple. Water is neutral: not an acid, not a base. A cup like that is called the control."}}],
    explain:[S("Acids like lemon juice and vinegar turn it pink. Bases like baking soda and soap turn it green."), S("Here's a challenge: add baking soda to your pink cup and watch what happens!")]},

  {id:'ph', after:['cabbage'], title:'pH Test Kit', grade:'4–5', blurb:'Measure acids and bases with a test strip.',
    setup:[['acid', 'tray', -.52, .35, {label:'ACID?', color:0xb5552f}], ['neutral', 'tray', -.2, .35, {label:'NEUTRAL?', color:0x2f8f4a}], ['base', 'tray', .12, .35, {label:'BASE?', color:0x34406b}], ['chart', 'chart', .56, .36],
           ['c1', 'cup', -.56, .02], ['c2', 'cup', -.28, .02], ['c3', 'cup', 0, .02], ['c4', 'cup', .28, .02], ['c5', 'cup', .56, .02],
           ['lemon', 'lemon', -.62, -.33], ['vinegar', 'vinegar', -.42, -.33], ['water', 'cup', -.18, -.33, {fill:{water:150}}], ['soap', 'soap', .06, -.33], ['soda', 'soda', .3, -.32], ['strip', 'strip', .4, .19]],
    rounds:[
      {q:"Which are acids, which are bases, and which is neutral?", ask:[S("Scientists measure acids and bases with a number called pH, {name}. Below 7 is an acid, 7 is neutral, and above 7 is a base."),
          S("Which of these are acids, which are bases, and which is neutral? Sort them into the trays.")],
        sort:{bins:{acid:'Acid', neutral:'Neutral', base:'Base'}, things:{lemon:'Lemon juice', vinegar:'Vinegar', water:'Water', soap:'Soap', soda:'Baking soda'}},
        test:[S("Now test them! Pour each one into its own cup, dip the test strip in, and match its color to the chart.")],
        hints:[[S("Pour a little of one liquid into an empty cup. Then dip the tip of the strip in.")], [S("Baking soda is a powder. Pour water into a cup first, then tip some baking soda in.")],
               [S("Match the strip's color to the chart. Red and orange are acids, green is neutral, blue and purple are bases.")]],
        observe: () => {
          const r = {};
          for (const v of containers()) {
            const d = v.stats.dip; if (!d || !d.steady) continue;
            const got = TESTS.filter(k => v.stats.got[k] !== undefined), other = got.filter(k => k !== 'water');
            const thing = other.length === 1 ? other[0] : got.length && !other.length ? 'water' : null;
            if (thing) r[thing] = PH_BIN(d.ph);
          }
          return r;
        },
        why:{lemon:"Lemon juice is about pH 2. A very sour acid!", vinegar:"Vinegar is between 2 and 3. It's an acid too.", water:"Pure water is 7, right in the middle. Neutral!",
          soap:"Soap is about 10, a base. Bases feel slippery.", soda:"Baking soda water is about 9. A gentle base."}},
      {q:"What will baking soda do to lemon juice's pH?", ask:[S("Here's a puzzle. Lemon juice is an acid, and baking soda is a base. What will happen to the lemon juice's pH if we add baking soda?")],
        choose:[{id:'up', label:'The number goes up', icon:'⬆️'}, {id:'down', label:'The number goes down', icon:'⬇️'}, {id:'same', label:'It stays the same', icon:'🟰'}],
        test:[S("Tip baking soda into your cup of lemon juice. When the fizzing stops, test it with the strip!")],
        hints:[[S("Pour baking soda into the cup with lemon juice in it.")], [S("Wait for the fizzing to stop, then dip the strip.")], [S("Still red? Add more baking soda and test again.")]],
        observe: () => { for (const v of containers()) { const g = v.stats.got, d = v.stats.dip; if (g.lemon !== undefined && g.soda !== undefined && d && d.steady && d.t > g.soda && d.ph > 4.5) return 'up'; } return null; },
        say:{up:"Up it goes! A base cancels out an acid. That fizz was the lemon juice and the baking soda using each other up. Scientists call it neutralizing."}}],
    explain:[S("Acids are below 7, bases are above 7, and pure water sits right at 7."),
             S("Each step on the pH scale is ten times stronger. Lemon juice at 2 is about a hundred thousand times more acidic than water!")]}
];

export const opened = (e, done) => done.has(e.id) || e.after.every(id => done.has(id));

// Trays only show a guess, so they stay behind. What was poured in for the explorer counts too: a jar
// that came full of water stocks the water pitcher.
const SUPPLY_OF = {};
for (const k in ITEMS) if (ITEMS[k].supply) for (const sub in ITEMS[k].fill) SUPPLY_OF[sub] = k;
export function stocked(done){
  const got = new Set();
  for (const e of EXPERIMENTS) if (done.has(e.id)) for (const [, type, , , o] of e.setup) {
    if (type !== 'tray') got.add(type);
    for (const sub in (o && o.fill) || {}) if (SUPPLY_OF[sub]) got.add(SUPPLY_OF[sub]);
  }
  return got;
}

export const FREE = {id:'free', title:'Free Lab', grade:'Any', free:true, setup:[],
  intro:[S("The lab is yours, {name}! Everything from my experiments that you've finished is in the cabinet behind the mat."),
         S("Tap a shelf to open it, then pick what you want. A real scientist asks, 'What happens if...?' Make a guess, then try it!")]};
