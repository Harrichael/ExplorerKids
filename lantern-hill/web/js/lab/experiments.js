// Dr. Sparks' experiment book: what each experiment sets out on the desk, the steps she walks the
// explorer through (each finished when the desk shows it happened), and what she says along the way.
// They unlock in order; Free Lab opens after three.
//
// A step's `done` and `count` read the desk. `react` hears desk events and `tick` runs every frame;
// either may return [key, lines], and each key is only said once per run.

import * as chem from './chem.js';
import { desk, find } from './desk.js';

const amt = (id, k) => chem.amount(find(id).c, k);
const inside = (id, host) => { const it = find(id); return it && it.state === 'in' && it.host === find(host); };
const cups = () => desk.items.filter(v => v.type === 'cup');
const cupWith = k => cups().find(v => chem.amount(v.c, k) >= (k === 'oil' ? 10 : 4));
const S = text => ['sparks', text];

const SINKERS = ['apple', 'rock', 'cork', 'coin', 'duck'];
const IRON = ['paperclip', 'nail', 'key'];

export const EXPERIMENTS = [
  {id:'sinkfloat', title:'Sink or Float?', grade:'K–1', blurb:'Which treasures float in a tub of water?',
    setup:[['tub', 'tub', 0, .04, {fill:{water:750}}], ['apple', 'apple', -.56, -.28], ['rock', 'rock', -.62, .2], ['cork', 'cork', .55, -.32], ['coin', 'coin', .6, .22], ['duck', 'duck', -.4, .38]],
    intro:[S("Experiment number one, {name}! Here's a tub of water and a pile of treasures."),
           S("Pick each one up and drop it in the tub. Before you let go, make a guess: will it sink or float?")],
    steps:[{do:'Drop every treasure into the tub', count: () => [SINKERS.filter(id => inside(id, 'tub') && find(id).settled).length, 5],
      done: () => SINKERS.every(id => inside(id, 'tub') && find(id).settled)}],
    react: ev => ev.type === 'settle' && ev.v.id === 'tub' && {
      apple: ['apple', [S("The apple floats! An apple is about one quarter air inside, like a tiny life jacket.")]],
      rock: ['rock', [S("Plop! The rock sinks right to the bottom. It's heavy for its size.")]],
      cork: ['cork', [S("Cork is full of teeny pockets of air. It bobs like a champ!")]],
      coin: ['coin', [S("Even that tiny coin sinks! Being small doesn't make you floaty. It's about how heavy you are for your size.")]],
      duck: ['duck', [S("Quack! The duck is hollow, full of air, so it floats.")]]
    }[ev.it.id],
    outro:[S("Wonderful! Things that are heavy for their size sink. Things that are light for their size float."),
           S("Scientists have a word for how heavy something is for its size: density. You just tested it!")]},

  {id:'magnets', title:'Magnet Hunt', grade:'1', blurb:'What will a magnet pick up?',
    setup:[['magnet', 'magnet', 0, .32], ['paperclip', 'paperclip', -.5, -.22], ['nail', 'nail', -.15, -.36], ['key', 'key', .38, -.26], ['coin', 'coin', .62, .06],
           ['foil', 'foil', -.62, .14], ['crayon', 'crayon', .2, -.04], ['button', 'button', -.25, .08]],
    intro:[S("This red horseshoe is a magnet, {name}. Magnets pull on some things, but not others."),
           S("Pick up the magnet and wave it close to each thing on the desk. What jumps up to say hello?")],
    steps:[{do:'Find everything the magnet can pick up', count: () => [IRON.filter(id => find(id).state === 'stuck').length, 3],
      done: () => IRON.every(id => find(id).state === 'stuck')}],
    react: ev => {
      if (ev.type === 'stick') return {paperclip: ['clip', [S("Click! Paperclips are made of steel, and steel is mostly iron.")]],
        nail: ['nail', [S("The nail jumped right up! Nails are iron through and through.")]],
        key: ['key', [S("This key is steel, so the magnet grabs it.")]]}[ev.it.id];
      if (ev.type === 'snub') return {coin: ['coin', [S("Hmm, the coin didn't budge. It's metal, but it isn't iron!")]],
        foil: ['foil', [S("Foil is metal too, but it's aluminum. Magnets don't pull on aluminum.")]],
        crayon: ['crayon', [S("Nothing. Crayons are made of wax.")]], button: ['button', [S("The plastic button just sits there.")]]}[ev.it.id];
    },
    outro:[S("You found them all! Magnets pull on things made with iron, like steel paperclips, nails and keys."),
           S("Lots of other things, even some metals like coins and foil, don't feel a magnet's pull at all.")]},

  {id:'volcano', title:'Fizzy Volcano', grade:'1–2', blurb:'Make a foamy eruption!',
    setup:[['volcano', 'volcano', 0, -.04], ['soda', 'soda', -.52, -.26], ['red', 'red', -.55, .24], ['soap', 'soap', .5, -.28], ['vinegar', 'vinegar', .56, .16]],
    intro:[S("Every lab needs a volcano, {name}! This one erupts with foam instead of lava."),
           S("To pour, pick something up and hold Space, the right mouse button, or the Tip button.")],
    steps:[
      {do:'Tip baking soda into the volcano', count: () => [Math.min(12, Math.round(amt('volcano', 'soda'))), 12], done: () => amt('volcano', 'soda') >= 12},
      {do:'Add a squirt of soap and a few red drops', say:[S("Now a squirt of dish soap, and a few drops of red, for lava color.")],
        done: () => amt('volcano', 'soap') >= 2 && (amt('volcano', 'red') >= 2 || find('volcano').stats.dye.has('red'))},
      {do:'Pour in the vinegar, then stand back!', say:[S("Last one: vinegar. Pour it in the top, and stand back!")], done: () => find('volcano').stats.gas >= 20}
    ],
    outro:[S("KABOOM! Well, more of a FOOSH. Vinegar is an acid and baking soda is a base."),
           S("When they meet, they make a gas called carbon dioxide. The soap traps the gas in bubbles, so we get a mountain of foam!")]},

  {id:'rainbow', title:'Rainbow Milk', grade:'2', blurb:'Make colors dance on milk.',
    setup:[['dish', 'dish', 0, .02], ['milk', 'milk', -.55, -.22], ['red', 'red', .3, -.38], ['yellow', 'yellow', .42, -.38], ['blue', 'blue', .54, -.38],
           ['saucer', 'saucer', .56, .22], ['swab', 'swab', .36, .32]],
    intro:[S("Get ready for my favorite, {name}: rainbow milk!")],
    steps:[
      {do:'Pour milk into the dish', count: () => [Math.min(70, Math.round(amt('dish', 'milk'))), 70], done: () => amt('dish', 'milk') >= 70},
      {do:'Drip all three colors onto the milk', say:[S("Now tip each little bottle over the milk to squeeze out some drops. Try all three colors!")],
        count: () => [find('dish').stats.dye.size, 3], done: () => find('dish').stats.dye.size >= 3},
      {do:'Dip the swab in the soap dish, then touch the milk', say:[S("Pick up the cotton swab, dip it in the soap dish, then poke it into the milk. Ready?")],
        done: () => find('dish').stats.bursts >= 1}
    ],
    outro:[S("Whoa! Milk has tiny drops of fat in it, and a stretchy skin on top called surface tension."),
           S("Soap breaks the skin and chases the fat around. As it zooms, it pushes the colors along for the ride! Try another poke.")]},

  {id:'egg', title:'The Floating Egg', grade:'2–3', blurb:'Can salt make an egg float?',
    setup:[['jar', 'jar', 0, 0, {fill:{water:170}}], ['egg', 'egg', -.42, .22], ['salt', 'salt', .4, -.26], ['spoon', 'spoon', .45, .22]],
    intro:[S("Here's a puzzle, {name}. Can you make an egg float without touching it?")],
    steps:[
      {do:'Gently drop the egg into the water', done: () => inside('egg', 'jar') && find('egg').settled,
        after:[S("Down it goes. The egg is a little heavier than the same amount of plain water.")]},
      {do:'Shake salt into the water', say:[S("Let's change the water. Turn the salt shaker upside down and shake, shake, shake!")],
        count: () => [Math.min(8, Math.round(amt('jar', 'salt'))), 8], done: () => amt('jar', 'salt') >= 8},
      {do:'Stir with the spoon and watch the egg', say:[S("Now stir it with the spoon until the salt disappears. Keep your eye on the egg!")],
        done: () => inside('egg', 'jar') && find('egg').floating && find('egg').settled}
    ],
    outro:[S("It floats! Salt makes the water heavier for its size, so the water pushes up on the egg harder."),
           S("That's why it's easier to float in the salty ocean than in a swimming pool.")]},

  {id:'dissolve', title:'Dissolve Detective', grade:'3', blurb:'What disappears in water?',
    setup:[['c1', 'cup', -.4, .2, {fill:{water:110}}], ['c2', 'cup', 0, .2, {fill:{water:110}}], ['c3', 'cup', .4, .2, {fill:{water:110}}],
           ['sugar', 'sugar', -.45, -.3], ['sand', 'sand', -.05, -.32], ['oil', 'oil', .32, -.32], ['spoon', 'spoon', .66, .02]],
    intro:[S("Time to be a detective, {name}. When you put something in water, does it disappear, or can you still see it?")],
    steps:[
      {do:'Put sugar, sand and oil each in its own cup', count: () => [['sugar', 'sand', 'oil'].filter(cupWith).length, 3],
        done: () => { const a = cupWith('sugar'), b = cupWith('sand'), c = cupWith('oil'); return a && b && c && new Set([a, b, c]).size === 3; }},
      {do:'Stir each cup with the spoon', say:[S("Now stir each cup with the spoon. Which ones vanish?")],
        count: () => [['sugar', 'sand', 'oil'].filter(k => cupWith(k) && cupWith(k).stats.stir > .5).length, 3],
        done: () => ['sugar', 'sand', 'oil'].every(k => cupWith(k) && cupWith(k).stats.stir > .5) && !(cupWith('sugar').c.p.sugar > .5)}
    ],
    react: ev => ev.type === 'dissolved' && ev.sub === 'sugar' && ['sugar', [S("The sugar vanished! It's still in there, just broken into pieces too tiny to see. That water would taste sweet!")]],
    tick: () => {
      const b = cupWith('sand'), c = cupWith('oil');
      if (b && b.stats.stir > .5) return ['sand', [S("The sand swirls around, but it settles right back to the bottom. Sand doesn't dissolve.")]];
      if (c && c.stats.stir > .5) return ['oil', [S("Look, the oil breaks into little drops, then floats back up to the top. Oil and water don't mix!")]];
    },
    outro:[S("Case closed! When something dissolves, it spreads through the water so well you can't see it anymore. Scientists call that a solution."),
           S("Sand and oil don't dissolve. They make a mixture, and you can still see every bit.")]},

  {id:'balloon', title:'Balloon Blow-Up', grade:'3–4', blurb:'Blow up a balloon without blowing.',
    setup:[['bottle', 'bottle', 0, 0], ['balloon', 'balloon', -.4, .26], ['soda', 'soda', -.52, -.26], ['vinegar', 'vinegar', .46, -.22]],
    intro:[S("Can you blow up a balloon without using your breath, {name}? Let's find out.")],
    steps:[
      {do:'Pour vinegar into the bottle', count: () => [Math.min(30, Math.round(amt('bottle', 'vinegar'))), 30], done: () => amt('bottle', 'vinegar') >= 30},
      {do:'Tip baking soda into the balloon', say:[S("Next, tip some baking soda into the balloon. Not the bottle!")],
        count: () => [Math.min(8, Math.round(amt('balloon', 'soda'))), 8], done: () => amt('balloon', 'soda') >= 8},
      {do:"Put the balloon on the bottle's neck", say:[S("Now carefully carry the balloon over and let go right on top of the bottle.")], done: () => find('balloon').state === 'attached'},
      {do:'Lift the balloon up so the soda falls in', say:[S("Grab the floppy balloon and hold it up, so the baking soda falls into the vinegar.")], done: () => find('balloon').inflate >= .8}
    ],
    outro:[S("It blew itself up! The fizzing made carbon dioxide gas, and the gas needed somewhere to go, so it filled the balloon."),
           S("Gas takes up space, even though you can't see it.")]},

  {id:'lava', title:'Lava Lamp', grade:'4', blurb:'Oil, water and a fizzy surprise.',
    setup:[['jar', 'jar', 0, 0], ['pitcher', 'pitcher', -.46, -.22], ['oil', 'oil', .42, -.3], ['blue', 'blue', -.46, .26], ['red', 'red', -.34, .34],
           ['t1', 'tablet', .42, .22], ['t2', 'tablet', .55, .3]],
    intro:[S("Let's build a groovy lava lamp, {name}. It starts with plain old water.")],
    steps:[
      {do:'Fill the jar about a third of the way with water', count: () => [Math.min(70, Math.round(amt('jar', 'water'))), 70], done: () => amt('jar', 'water') >= 70},
      {do:'Pour in oil until the jar is nearly full', say:[S("Now pour in the oil. Watch where it goes!")], count: () => [Math.min(100, Math.round(amt('jar', 'oil'))), 100], done: () => amt('jar', 'oil') >= 100},
      {do:'Squeeze in a few drops of color', count: () => [Math.min(3, Math.round(amt('jar', 'red') + amt('jar', 'blue'))), 3], done: () => amt('jar', 'red') + amt('jar', 'blue') >= 3},
      {do:'Drop in a fizzy tablet!', say:[S("And now for the magic: drop in a fizzy tablet.")], done: () => find('jar').stats.blobs >= 10}
    ],
    react: ev => ev.type === 'sink-drop' && ['drop', [S("See the drops sink right through the oil? Food coloring is mostly water, so it skips the oil and joins the water.")]],
    tick: () => amt('jar', 'oil') > 25 && amt('jar', 'water') > 25 && ['layer', [S("The oil floats on top! Oil is lighter for its size than water, and the two won't mix.")]],
    outro:[S("Far out! The tablet makes bubbles of gas. Each bubble grabs a blob of colored water and floats it up through the oil."),
           S("At the top the bubble pops, and the heavy blob sinks back down. Up and down, round and round!")]},

  {id:'cabbage', title:'Cabbage Color Detective', grade:'5', blurb:'A purple juice that changes color.',
    setup:[['k1', 'cup', -.4, .2, {fill:{cabbage:110}}], ['k2', 'cup', 0, .2, {fill:{cabbage:110}}], ['k3', 'cup', .4, .2, {fill:{cabbage:110}}],
           ['lemon', 'lemon', -.52, -.3], ['pitcher', 'pitcher', 0, -.32], ['soda', 'soda', .52, -.3]],
    intro:[S("This purple juice came from boiled red cabbage, {name}. It's a secret detector called an indicator."),
           S("It changes color to tell us if something is an acid or a base. Let's test!")],
    steps:[
      {do:'Squeeze lemon juice into one cup', done: () => cups().some(v => chem.ph(v.c) < 5),
        after:[S("Pink! Lemon juice is an acid. Acids turn cabbage juice pink and red.")]},
      {do:'Tip baking soda into a different cup', done: () => cups().some(v => chem.ph(v.c) > 9),
        after:[S("Green! Baking soda is a base. Bases turn cabbage juice blue and green.")]},
      {do:'Pour plain water into the last cup', done: () => cups().some(v => v.c.l.cabbage && (v.c.l.water || 0) >= 30 && Math.abs(chem.ph(v.c) - 7) < 1),
        after:[S("It stays purple. Water is neutral: not an acid, not a base. A cup like that is called the control.")]}
    ],
    outro:[S("Great detective work! Acids like lemon juice and vinegar turn it pink. Bases like baking soda and soap turn it blue or green."),
           S("Here's a challenge: add baking soda to your pink cup and watch what happens!")]}
];

export const FREE = {id:'free', title:'Free Lab', grade:'Any', free:true,
  setup:[
    ['pitcher', 'pitcher', -.7, -.42], ['milk', 'milk', -.55, -.42], ['vinegar', 'vinegar', -.44, -.42], ['lemon', 'lemon', -.35, -.42], ['soap', 'soap', -.26, -.42],
    ['oil', 'oil', -.18, -.42], ['cabbage', 'cabbage', -.07, -.42], ['soda', 'soda', .07, -.42], ['sugar', 'sugar', .21, -.42], ['sand', 'sand', .33, -.42],
    ['salt', 'salt', .42, -.42], ['pepper', 'pepper', .49, -.42], ['red', 'red', .57, -.42], ['yellow', 'yellow', .63, -.42], ['blue', 'blue', .69, -.42],
    ['c1', 'cup', -.62, -.14], ['c2', 'cup', -.47, -.14], ['jar', 'jar', -.32, -.14], ['dish', 'dish', -.1, -.12], ['bottle', 'bottle', .14, -.14],
    ['balloon', 'balloon', .27, -.14], ['saucer', 'saucer', .42, -.14], ['c3', 'cup', .58, -.14],
    ['tub', 'tub', -.56, .32, {fill:{water:600}}], ['egg', 'egg', -.27, .2], ['t1', 'tablet', -.17, .3], ['t2', 'tablet', -.1, .4], ['coin', 'coin', -.27, .42],
    ['cork', 'cork', 0, .24], ['rock', 'rock', .06, .42], ['spoon', 'spoon', .14, .24], ['swab', 'swab', .21, .38], ['magnet', 'magnet', .3, .22],
    ['paperclip', 'paperclip', .33, .44], ['volcano', 'volcano', .6, .3]],
  intro:[S("The whole lab is yours, {name}! Mix anything with anything."),
         S("A real scientist asks, 'What happens if...?' Then tries it! Press Clean up whenever you want a fresh desk.")],
  steps:[]};
