// Everything the garden can grow, in the order its seeds are earned, and what a kid learns from each.
// Seasons are the ones it is sown in outdoors on a Utah hillside; hours are real hours of growing
// with damp soil, where nothing slows it down.
//
// look: how plants.js builds it. tall: shades the plot behind it. sunny: grows slower in shade.
// fruit: needs bees to carry pollen. feeds: beans and peas, which put food back in the soil.
// again: harvesting leaves the plant, which flowers and fruits once more.

export const CROPS = [
  {id:'radish', name:'Radish', plural:'radishes', seasons:['spring', 'autumn'], hours:1.5, unlock:0, look:'root', sunny:true,
    colors:{leaf:0x5b9a4a, crop:0xd8405a, flower:0xf0e0f0},
    facts:["Radishes are roots! The round red part grows down in the dark soil, and the leaves stay up in the sunshine.",
      "Radishes grow super fast. That's why gardeners call them a speedy starter.",
      "Roots drink water from the soil and send it all the way up to the leaves."]},
  {id:'lettuce', name:'Lettuce', plural:'heads of lettuce', seasons:['spring', 'autumn'], hours:3, unlock:0, look:'leafy',
    colors:{leaf:0x8cc45a, crop:0x6aaa48},
    facts:["Lettuce leaves are little food factories. They catch sunlight and turn it into food for the plant. That's called photosynthesis!",
      "Lettuce likes cool weather. When it gets hot, it shoots up tall to make flowers and seeds. Gardeners call that bolting!",
      "Lettuce doesn't mind a little shade, so it's happy behind tall plants."]},
  {id:'sunflower', name:'Sunflower', plural:'sunflowers', seasons:['summer'], hours:10, unlock:0, look:'sunflower', tall:true, sunny:true,
    colors:{leaf:0x4f8a3e, crop:0xf2c230, flower:0x5a3418},
    facts:["Young sunflowers turn to follow the sun across the sky, east in the morning and west at night!",
      "A grown-up sunflower stops turning and faces east, toward the sunrise. And each one holds hundreds of seeds!",
      "Sunflowers grow so tall they shade whatever is planted right behind them."]},
  {id:'beans', name:'Beans', plural:'beans', seasons:['summer'], hours:6, unlock:0, look:'vine', feeds:true, sunny:true,
    colors:{leaf:0x5a9a44, crop:0x6cb04a, flower:0xf4f0e0},
    facts:["Bean roots have tiny bumps full of helpful germs. They pull food out of the air and put it in the soil!",
      "Plants growing next to beans get extra food from the soil, so they grow faster.",
      "A bean pod is a fruit, and every bean inside is a seed you could plant!"]},
  {id:'kale', name:'Kale', plural:'bunches of kale', seasons:['autumn', 'winter'], hours:6, unlock:0, look:'leafy', curly:true,
    colors:{leaf:0x3e6a52, crop:0x4a7a5e},
    facts:["Kale is tough! It can grow even when it's cold and frosty.",
      "A frost makes kale taste sweeter. The plant turns starch into sugar so it won't freeze. It's like plant antifreeze!",
      "Kale is a leaf you eat, and it's packed with vitamins."]},
  {id:'carrot', name:'Carrot', plural:'carrots', seasons:['spring', 'summer', 'autumn'], hours:6, unlock:3, look:'root', feathery:true, sunny:true,
    colors:{leaf:0x5aa040, crop:0xf08a2a},
    facts:["The orange carrot you eat is the plant's root. It stores food underground for later.",
      "Long ago most carrots were purple or yellow! Orange carrots came later.",
      "Carrot leaves are feathery and lacy, so they catch sunlight from every side."]},
  {id:'marigold', name:'Marigold', plural:'marigolds', seasons:['spring', 'summer'], hours:4, unlock:6, look:'flower', flower:true,
    colors:{leaf:0x4a8a3a, crop:0xf29a1e, flower:0xf2c22e},
    facts:["Bees love flowers! Plant flowers next to fruits and vegetables, and the bees will visit them too.",
      "Marigolds smell strong, and lots of pesky bugs stay away from them.",
      "Many flowers close up at night and open again when the sun comes back."]},
  {id:'peas', name:'Peas', plural:'pea pods', seasons:['spring'], hours:5, unlock:10, look:'vine', climb:true, feeds:true, sunny:true,
    colors:{leaf:0x6aaa50, crop:0x7cc050, flower:0xf8f4f8},
    facts:["Pea plants grab onto things with curly little tendrils, like tiny green hands, and climb up.",
      "Peas love cool spring days. Summer heat makes them stop growing.",
      "Like beans, peas put food back in the soil for their neighbors."]},
  {id:'strawberry', name:'Strawberry', plural:'strawberries', seasons:['spring', 'summer'], hours:8, unlock:15, look:'berry', fruit:true, again:true, sunny:true,
    colors:{leaf:0x3f8a3e, crop:0xe0303a, flower:0xffffff},
    facts:["A strawberry wears its seeds on the outside! There are about two hundred on every berry.",
      "Each strawberry starts as a white flower. A bee brings pollen, and the flower turns into a berry.",
      "Strawberry plants keep making berries again and again, so you can pick them more than once."]},
  {id:'tomato', name:'Tomato', plural:'tomatoes', seasons:['summer'], hours:12, unlock:21, look:'tomato', tall:true, fruit:true, again:true, sunny:true,
    colors:{leaf:0x4a8a3a, crop:0xe0402a, flower:0xf2d22e},
    facts:["A tomato is really a fruit, because it has seeds inside!",
      "Bumblebees shake tomato flowers by buzzing, and the pollen falls out. It's called buzz pollination!",
      "Tomatoes keep ripening all summer long. Pick the red ones and more will come."]},
  {id:'spinach', name:'Spinach', plural:'bunches of spinach', seasons:['winter', 'spring', 'autumn'], hours:3, unlock:28, look:'leafy', smooth:true,
    colors:{leaf:0x2f6a3a, crop:0x3a7a44},
    facts:["Spinach grows best when the days are short and cool.",
      "Spinach leaves are dark green because they're full of chlorophyll, the green stuff that catches sunlight.",
      "You can plant spinach as soon as the snow melts in spring."]},
  {id:'corn', name:'Corn', plural:'ears of corn', seasons:['summer'], hours:14, unlock:36, look:'corn', tall:true, sunny:true,
    colors:{leaf:0x5a9a3a, crop:0xf2d25a, flower:0xd8b85a},
    facts:["Corn is a giant grass! Its pollen blows on the wind from the tassels at the top to the silks below.",
      "Every strand of corn silk leads to one kernel. No silk, no kernel!",
      "Long ago, Native American farmers grew corn, beans and squash together. They called them the Three Sisters."]},
  {id:'garlic', name:'Garlic', plural:'heads of garlic', seasons:['autumn', 'winter'], hours:18, unlock:45, look:'root', spiky:true,
    colors:{leaf:0x6a9a5a, crop:0xf2ead8},
    facts:["Garlic is planted in autumn and sleeps under the snow all winter.",
      "One clove of garlic grows into a whole new head with lots of cloves. One becomes many!",
      "Garlic needs a long cold winter to split into cloves."]},
  {id:'pumpkin', name:'Pumpkin', plural:'pumpkins', seasons:['summer'], hours:24, unlock:55, look:'pumpkin', fruit:true, sunny:true,
    colors:{leaf:0x4a8a3a, crop:0xe8862a, flower:0xf2c22e},
    facts:["A pumpkin vine can grow longer than a school bus!",
      "Pumpkin flowers open for just one morning. The bees have to hurry!",
      "Pumpkins are planted in early summer so they're big and orange by autumn."]}
];
export const CROP = Object.fromEntries(CROPS.map(c => [c.id, c]));

// The ways a garden's neighbours change how it grows, each found out the first time it happens.
export const SECRETS = {
  season:{icon:'🍂', name:'Every plant has its season', text:"Each plant grows best in its own season. Out of season it grows slowly, so check the seed packet!"},
  shade:{icon:'⛅', name:'Tall plants make shade', text:"The sun shines from the south, so tall plants shade the spot right behind them. Sun-loving plants grow slower there. Put tall ones at the back!"},
  beans:{icon:'🫘', name:'Beans feed the soil', text:"Beans and peas put food in the soil. Plants right next to them grow faster."},
  bees:{icon:'🐝', name:'Flowers bring bees', text:"Fruits need bees to carry pollen from flower to flower. Plant flowers next to them and you'll pick twice as many!"}
};
