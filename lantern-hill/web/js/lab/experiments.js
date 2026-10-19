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
import { desk, find, isVessel, totalGas } from './desk.js';
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

  {id:'cabbage', after:['volcano'], title:'Cabbage Color Detective', grade:'5', blurb:'A purple juice that changes color.',
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
    explain:[S("Acids like lemon juice and vinegar turn it pink. Bases like baking soda and soap turn it green."), S("Here's a challenge: add baking soda to your pink cup and watch what happens!")]}
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
