// Boot: build HQ, dress the hero, drop them by the hearth and start the clock.

import { HQ } from './hq/index.js';
import { enterWorld, start } from './play.js';
import { buildHero } from './player.js';

buildHero();
enterWorld(HQ, [0, 2.6, Math.PI]);
start();
