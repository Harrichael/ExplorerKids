// Boot: build HQ, dress the hero, drop them by the hearth (or back where an update found them) and start the clock.

import { HQ } from './hq/index.js';
import { enterWorld, start } from './play.js';
import { buildHero } from './player.js';
import { followUpdates, resume } from './updates.js';

buildHero();
enterWorld(HQ, resume() || [0, 2.6, Math.PI]);
start();
followUpdates();
