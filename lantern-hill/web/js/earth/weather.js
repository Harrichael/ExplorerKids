// The weather on the real Earth right now, from Open-Meteo (open-meteo.com: free, no key, and it
// works from a web page), and how a child might make sense of it: words for the sky, the feel of a
// temperature, a breeze's name, which kind of cloud is overhead, and why it's hot or cold here. Also
// Hoot's weather missions: find somewhere on Earth where it's snowing, say, right now, checked
// against the real weather there; and what his sky lessons need: the jet stream's pull on a
// plane, and the places a raindrop's journey passes through.
//
//   const w = await weatherAt(64.1, -21.9);   // {temperature, feelsLike, wind, from, jet, jetFrom, rain, snow, clouds, low, mid, high, code, day, …}
//   sky(w)                                   // {icon: '🌧️', words: 'Light rain'}
//   const g = await weatherGrid();            // the whole world every 15°, for painting it
//   const up = await weatherGrid('jet');      // the wind 10 km up, the same way
//   g.at(51.5, 0).temperature
//
// Open-Meteo asks that its free API be used non-commercially, and credited.

export const CREDIT = 'Weather: Open-Meteo.com, CC BY 4.0';
const API = 'https://api.open-meteo.com/v1/forecast';
// The free API counts every place asked about as a call, and more than ten things about each as more
// than one, with a limit of 600 calls a minute. So the whole world's maps ask only what painting them
// needs, every 15 degrees, and the wind up high is its own map, asked for only when it's wanted; one
// spot asks everything. The jet stream blows about 10 km up, where the air pressure is a quarter of
// the ground's: 250 hPa.
const MAPS = {surface: 'temperature_2m,precipitation,snowfall,cloud_cover,wind_speed_10m,wind_direction_10m,is_day,weather_code', jet: 'wind_speed_250hPa,wind_direction_250hPa'};
const NOW = `${MAPS.surface},${MAPS.jet},apparent_temperature,cloud_cover_low,cloud_cover_mid,cloud_cover_high`;
// the service can be slow when busy; better to say so than to wait for ever
const json = url => fetch(url, {signal: AbortSignal.timeout(45000)}).then(r => r.ok ? r.json() : Promise.reject(new Error(`weather: ${r.status}`)));
const read = d => ({temperature: d.current.temperature_2m, feelsLike: d.current.apparent_temperature, rain: d.current.precipitation, snow: d.current.snowfall,
  clouds: d.current.cloud_cover, layers: {low: d.current.cloud_cover_low, mid: d.current.cloud_cover_mid, high: d.current.cloud_cover_high},
  wind: d.current.wind_speed_10m, from: d.current.wind_direction_10m, jet: d.current.wind_speed_250hPa, jetFrom: d.current.wind_direction_250hPa,
  day: !!d.current.is_day, code: d.current.weather_code, elevation: d.elevation, time: d.current.time, offset: d.utc_offset_seconds,
  high: d.daily?.temperature_2m_max?.[0], low: d.daily?.temperature_2m_min?.[0]});

// the weather a short while ago at one spot, which is as "now" as a forecast gets
export async function weatherAt(lat, lon){
  return read(await json(`${API}?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=${NOW}&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`));
}

// The whole world's weather every 15 degrees, asked for in one go, and kept for the hour: enough to
// paint the globe with, smoothed in between. `at` blends the four nearest points, wrapping round the
// date line; the sky's code isn't a number to blend, so it's the nearest point's.
export const GRID = {step: 15, south: -75, lats: 11, lons: 24};   // -75…75, -180…165
const {step: STEP, south: SOUTH, lats: LATS, lons: LONS} = GRID;
const grids = {};
export function weatherGrid(kind = 'surface'){
  const hour = new Date().toISOString().slice(0, 13), was = grids[kind];
  if (was && was.hour === hour) return was.p;
  const lats = [], lons = [];
  for (let j = 0; j < LATS; j++) for (let i = 0; i < LONS; i++) { lats.push(SOUTH + j*STEP); lons.push(-180 + i*STEP); }
  const p = json(`${API}?latitude=${lats.join(',')}&longitude=${lons.join(',')}&current=${MAPS[kind]}&timezone=GMT`).then(list => makeGrid(list.map(read)));
  grids[kind] = {hour, p}; p.catch(() => { if (grids[kind]?.p === p) delete grids[kind]; });
  return p;
}
export function makeGrid(points){
  const cell = (j, i) => points[Math.max(0, Math.min(LATS - 1, j))*LONS + ((i % LONS) + LONS) % LONS];
  function at(lat, lon){
    const y = (lat - SOUTH)/STEP, x = (lon + 180)/STEP, j = Math.floor(y), i = Math.floor(x), fy = Math.max(0, Math.min(1, y - j)), fx = x - i;
    const a = cell(j, i), b = cell(j, i + 1), c = cell(j + 1, i), d = cell(j + 1, i + 1);
    const mix = k => (a[k]*(1 - fx) + b[k]*fx)*(1 - fy) + (c[k]*(1 - fx) + d[k]*fx)*fy;
    // wind blends as a pair of arrows, not as angles, or north-west and north-east would average to south
    const blow = (speed, from) => {
      const arrow = p => { const r = (p[from] + 180)*Math.PI/180; return [Math.sin(r)*p[speed], Math.cos(r)*p[speed]]; };
      const [ae, an] = arrow(a), [be, bn] = arrow(b), [ce, cn] = arrow(c), [de, dn] = arrow(d);
      return [(ae*(1 - fx) + be*fx)*(1 - fy) + (ce*(1 - fx) + de*fx)*fy, (an*(1 - fx) + bn*fx)*(1 - fy) + (cn*(1 - fx) + dn*fx)*fy];
    };
    const [east, north] = blow('wind', 'from'), [jetEast, jetNorth] = blow('jet', 'jetFrom');
    const near = cell(Math.round(y), Math.round(x));
    return {temperature: mix('temperature'), rain: mix('rain'), snow: mix('snow'), clouds: mix('clouds'), east, north, jetEast, jetNorth, code: near.code, day: near.day};
  }
  // the points themselves, for finding one where something's true
  const spots = points.map((p, k) => ({...p, lat: SOUTH + Math.floor(k/LONS)*STEP, lon: -180 + (k % LONS)*STEP}));
  return {at, spots};
}

// ---------- making sense of it ----------
// WMO weather codes, as Open-Meteo gives them
const SKIES = [
  [[0], '☀️', '🌙', 'Clear sky'], [[1], '🌤️', '🌙', 'Mostly clear'], [[2], '⛅', '☁️', 'Partly cloudy'], [[3], '☁️', '☁️', 'Cloudy'],
  [[45, 48], '🌫️', '🌫️', 'Foggy'], [[51, 53, 55, 56, 57], '🌦️', '🌧️', 'Drizzle'], [[61, 80], '🌦️', '🌧️', 'Light rain'], [[63, 81], '🌧️', '🌧️', 'Rain'],
  [[65, 82], '🌧️', '🌧️', 'Heavy rain'], [[66, 67], '🌧️', '🌧️', 'Freezing rain'], [[71, 85], '🌨️', '🌨️', 'Light snow'], [[73, 75, 77, 86], '❄️', '❄️', 'Snow'],
  [[95, 96, 99], '⛈️', '⛈️', 'Thunderstorm'],
];
export function sky(w){
  const s = SKIES.find(([codes]) => codes.includes(w.code)) || SKIES[3];
  return {icon: w.day ? s[1] : s[2], words: s[3]};
}
export const isRaining = w => w.rain > 0 || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(w.code);
export const isSnowing = w => w.snow > 0 || [71, 73, 75, 77, 85, 86].includes(w.code);

// how a temperature feels, the five steps Hoot asks a child to guess between
export const FEELS = [
  {id: 'freezing', name: 'Freezing', icon: '🥶', below: 0}, {id: 'cold', name: 'Cold', icon: '🧥', below: 10}, {id: 'mild', name: 'Mild', icon: '🙂', below: 20},
  {id: 'warm', name: 'Warm', icon: '😎', below: 28}, {id: 'hot', name: 'Hot', icon: '🥵', below: Infinity},
];
export const feel = t => FEELS.find(f => t < f.below);

// the Beaufort scale's names, in a child's words
const BREEZES = [[2, 'Calm: smoke rises straight up'], [12, 'A light breeze: leaves rustle'], [29, 'A gentle wind: flags flap'], [39, 'A fresh wind: small trees sway'],
  [62, 'A strong wind: hard to hold an umbrella'], [88, 'A gale: hard to walk against'], [118, 'A storm: trees blow down'], [Infinity, 'Hurricane-strength wind!']];
export const breeze = kmh => BREEZES.find(([top]) => kmh < top)[1];
// where the wind blows from, which is what weather people say: a north wind comes from the north
const POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
export const compass = deg => POINTS[Math.round(((deg % 360) + 360) % 360/45) % 8];

// What makes it hot or cold here, most telling first: how high the sun gets (nearness to the equator
// and the season), height above the sea, day or night. `month` is 0–11.
export function why(w, lat, month){
  const out = [], a = Math.abs(lat), north = lat >= 0;
  const summer = north ? month >= 5 && month <= 7 : month === 11 || month <= 1, winter = north ? month === 11 || month <= 1 : month >= 5 && month <= 7;
  if (a < 23.5) out.push('This spot is in the tropics, near the equator. The sun shines down from high overhead all year round, so it is warm all year, even in "winter".');
  else if (a > 66.5) out.push(`This spot is near the ${north ? 'North' : 'South'} Pole. The sun stays low in the sky, so its light is spread out thin and weak, and it is cold most of the year.`);
  else if (summer) out.push(`It's summer in the ${north ? 'north' : 'south'}ern half of the Earth right now. That half is tipped towards the sun, so the sun climbs high and the days are long.`);
  else if (winter) out.push(`It's winter in the ${north ? 'north' : 'south'}ern half of the Earth right now. That half is tipped away from the sun, so the sun stays low and the days are short.`);
  else out.push(`It's ${north === (month >= 2 && month <= 4) ? 'spring' : 'autumn'} in the ${north ? 'north' : 'south'}ern half of the Earth: halfway between summer and winter.`);
  if (w.elevation > 1500) out.push(`This spot is ${Math.round(w.elevation).toLocaleString()} metres up. The higher you go, the colder the air gets: about 6 degrees colder for every 1,000 metres.`);
  if (!w.day) out.push("It's night here. With the sun gone, the ground and the air are cooling down.");
  if (isSnowing(w)) out.push('Snow falls when the air up in the clouds is below freezing, so the water in them freezes into ice crystals.');
  else if (isRaining(w)) out.push('Rain falls when the tiny drops in a cloud bump together and grow too heavy to float.');
  return out;
}

// ---------- Hoot's weather missions ----------
// `lens` is the map that helps find one; `close` is a near miss worth saying so about
export const MISSIONS = [
  {id: 'freezing', icon: '🥶', name: 'Below freezing', lens: 'temp', ok: w => w.temperature < 0, close: w => w.temperature < 5,
    ask: 'Find somewhere it is below freezing right now: colder than 0 °C, cold enough for water to turn to ice.',
    think: 'Where do you think it is coldest? Think about which parts of the Earth get the least sun.',
    hint: 'Look at the temperature map. The blues and purples are below freezing.',
    learn: 'The poles get the least sunlight: the sun stays low and its light is spread thin. High mountains are cold too, even near the equator!'},
  {id: 'hot', icon: '🥵', name: 'Hotter than 30 °C', lens: 'temp', ok: w => w.temperature > 30, close: w => w.temperature > 25,
    ask: 'Find somewhere hotter than 30 °C right now. That is hot enough to want to sit in the shade!',
    think: 'Where do you think it is hottest? Think about where the sun shines down from high overhead, and where it is daytime.',
    hint: 'Look at the temperature map. The reds and oranges are the hottest, and they are on the side of the Earth where it is daytime.',
    learn: 'The hottest places are near the equator, where the sun is high, and in dry deserts, where no clouds shade the ground. And it is hottest in the afternoon!'},
  {id: 'rain', icon: '🌧️', name: 'Raining', lens: 'rain', ok: isRaining,
    ask: 'Find somewhere it is raining right now!',
    think: 'Rain falls from clouds. Where do you think there are lots of clouds today?',
    hint: 'Look at the rain map: the blue patches are where rain is falling.',
    learn: 'Rain comes from clouds, and clouds come from water that the sun warmed into vapour, mostly from the sea. It rains, the water runs back to the sea, and round it goes: the water cycle!'},
  {id: 'snow', icon: '🌨️', name: 'Snowing', lens: 'rain', ok: isSnowing, close: w => isRaining(w) || w.temperature < 0,
    ask: 'Find somewhere it is snowing right now! That is a hard one.',
    think: 'Snow needs two things: clouds, and air below freezing. Where might you find both?',
    hint: 'Look at the rain map for white patches: that is snow. It is likeliest near the poles, or on high mountains, in winter.',
    learn: 'Snow is rain that froze before it landed. Each snowflake is made of tiny ice crystals, and no two are quite the same.'},
  {id: 'night', icon: '🌙', name: 'Night-time', lens: null, ok: w => !w.day,
    ask: "Find somewhere it is night-time right now, where it's dark and people are asleep.",
    think: 'The sun only lights up one half of the Earth at a time. Which half is dark?',
    hint: 'Look for the shadow on the globe. Everywhere in it, the sun has set.',
    learn: 'The Earth spins round once a day. Half of it always faces the sun, in daytime, and half faces away, in night. As it spins, night sweeps round the world.'},
  {id: 'windy', icon: '🌬️', name: 'Windy', lens: 'wind', ok: w => w.wind > 30, close: w => w.wind > 20,
    ask: 'Find somewhere really windy right now: wind faster than 30 kilometres an hour.',
    think: 'Wind is air on the move. Where do you think the air can rush along with nothing to slow it down?',
    hint: 'Look at the wind map. The fastest streaks are the strongest winds, and they are often out at sea.',
    learn: 'Wind blows from where the air is pressing down hard to where it is pressing less. Out at sea, with no hills or trees to slow it, it blows hardest of all.'},
  {id: 'clear', icon: '☀️', name: 'Clear sky', lens: 'clouds', ok: w => w.clouds < 15, close: w => w.clouds < 40,
    ask: 'Find somewhere with a clear sky right now, with hardly a cloud.',
    think: 'Clouds need water in the air. Where is the air very dry?',
    hint: 'Look at the real clouds. Find a patch where you can see the ground: deserts are a good bet.',
    learn: 'Deserts have clear skies because the air there is dry, with too little water in it to make clouds. That is why it hardly ever rains there.'},
];
export const missionBy = id => MISSIONS.find(m => m.id === id);

// ---------- clouds ----------
// The five kinds a child can learn to spot, from the top of the sky down. `level` is how high they
// float; `wiki` is the article their photo comes from.
export const CLOUDS = [
  {id: 'cirrus', name: 'Cirrus', icon: '🪶', level: 'high', wiki: 'Cirrus cloud', looks: 'Thin, wispy streaks, like feathers or horses\' tails.',
    about: 'Cirrus clouds float so high, 6 to 12 kilometres up, that they are made of tiny ice crystals, not water. They often come a day before a change in the weather.',
    where: 'Cirrus float high above other clouds, so look where the sky is clear down low. They often stream ahead of a storm.'},
  {id: 'altostratus', name: 'Middle clouds', icon: '🌥️', level: 'mid', wiki: 'Altostratus cloud', looks: 'A grey-blue sheet, with the sun shining through it like a blurry torch.',
    about: 'Middle clouds float 2 to 6 kilometres up. Their names start with "alto", which means high. A sheet of them often means rain is on its way.',
    where: 'Middle clouds come before a storm arrives. Look next to places where it is raining.'},
  {id: 'cumulus', name: 'Cumulus', icon: '☁️', level: 'low', wiki: 'Cumulus cloud', looks: 'Puffy white heaps with flat bottoms, like cotton wool.',
    about: 'Cumulus clouds grow when the sun warms the ground and bubbles of warm air rise up. Cumulus means "heap". Small ones mean fair weather.',
    where: 'Cumulus grow on sunny days, when warm air bubbles up from the ground. Look where it is daytime.'},
  {id: 'stratus', name: 'Stratus', icon: '🌫️', level: 'low', wiki: 'Stratus cloud', looks: 'A flat grey blanket covering the whole sky. Fog is stratus touching the ground!',
    about: 'Stratus means "layer". These low, flat clouds cover everything in grey and can bring drizzle. When stratus sinks all the way down, we call it fog.',
    where: 'Stratus like cool, damp places: look along cold coasts, and where it is drizzly or foggy.'},
  {id: 'cumulonimbus', name: 'Cumulonimbus', icon: '⛈️', level: 'all', wiki: 'Cumulonimbus cloud', looks: 'A gigantic tower, dark at the bottom, often with a flat top like an anvil.',
    about: 'Cumulonimbus are the biggest clouds of all, as tall as 15 kilometres, taller than Mount Everest! They are thunderstorm clouds: lightning, thunder, heavy rain and sometimes hail.',
    where: 'Thunderstorm clouds need lots of warm, wet air. Look in the tropics, near the equator, especially in the afternoon.'},
];
export const cloudBy = id => CLOUDS.find(c => c.id === id);
// The kind of cloud most likely overhead, from how much of the sky each layer covers. Weather
// reports don't name the cloud, so this is a good guess, the way a forecaster would make one.
export function cloudKind(w){
  const {low = 0, mid = 0, high = 0} = w.layers || {};
  if ([95, 96, 99].includes(w.code)) return cloudBy('cumulonimbus');
  if (Math.max(low, mid, high) < 15) return null;
  if (low >= mid && low >= high) return cloudBy(low >= 80 || [45, 48, 51, 53, 55, 56, 57].includes(w.code) || (isRaining(w) && low >= 60) ? 'stratus' : 'cumulus');
  return cloudBy(mid >= high ? 'altostratus' : 'cirrus');
}

// ---------- the world's winds ----------
// how hard the wind blows from the west, on average, in a band of latitude: positive is west to
// east. `up` is the jet stream's height instead of the ground's.
export function westerly(grid, from, to, up = false){
  let sum = 0, n = 0;
  for (const s of grid.spots) if (s.lat >= from && s.lat <= to) { const v = grid.at(s.lat, s.lon); sum += up ? v.jetEast : v.east; n++; }
  return n ? sum/n : 0;
}
// the fastest wind up high anywhere, and where
export function fastestJet(grid){
  return grid.spots.reduce((b, s) => s.jet > (b ? b.jet : -1) ? s : b, null);
}

// The great-circle path between two places, as `n` steps of [lat, lon]
const RAD = Math.PI/180;
export function route(a, b, n = 48){
  const v = ([lat, lon]) => [Math.cos(lat*RAD)*Math.cos(lon*RAD), Math.cos(lat*RAD)*Math.sin(lon*RAD), Math.sin(lat*RAD)];
  const p = v(a), q = v(b), w = Math.acos(Math.max(-1, Math.min(1, p[0]*q[0] + p[1]*q[1] + p[2]*q[2])));
  return Array.from({length: n + 1}, (_, i) => {
    const t = i/n, s = Math.sin(w), ka = Math.sin((1 - t)*w)/s, kb = Math.sin(t*w)/s;
    const x = ka*p[0] + kb*q[0], y = ka*p[1] + kb*q[1], z = ka*p[2] + kb*q[2];
    return [Math.atan2(z, Math.hypot(x, y))/RAD, Math.atan2(y, x)/RAD];
  });
}
// How long a jet takes to fly a route, in hours, with the wind up high pushing it along or holding it
// back: the plane's own speed through the air, plus the part of the wind blowing its way.
export const CRUISE = 900;
export function flightHours(grid, a, b){
  const path = route(a, b), km = (p, q) => 6371*Math.acos(Math.min(1, Math.sin(p[0]*RAD)*Math.sin(q[0]*RAD) + Math.cos(p[0]*RAD)*Math.cos(q[0]*RAD)*Math.cos((q[1] - p[1])*RAD)));
  let hours = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    const p = path[i], q = path[i + 1], d = km(p, q); if (!d) continue;
    const mid = [(p[0] + q[0])/2, (p[1] + q[1])/2], v = grid.at(...mid);
    // which way the plane is heading, as east and north
    const north = (q[0] - p[0]), east = ((q[1] - p[1] + 540) % 360 - 180)*Math.cos(mid[0]*RAD), len = Math.hypot(north, east) || 1;
    hours += d/Math.max(300, CRUISE + (v.jetEast*east + v.jetNorth*north)/len);
  }
  return hours;
}
// the races Hoot can set: of these, the one today's jet stream makes the most of
export const RACES = [
  {a: {name: 'New York', at: [40.64, -73.78]}, b: {name: 'London', at: [51.47, -0.45]}},
  {a: {name: 'Tokyo', at: [35.55, 139.78]}, b: {name: 'San Francisco', at: [37.62, -122.38]}},
  {a: {name: 'Buenos Aires', at: [-34.82, -58.54]}, b: {name: 'Cape Town', at: [-33.97, 18.6]}},
];

// ---------- a raindrop's journey ----------
// From the warm Bay of Bengal, up into a cloud, north on the summer monsoon to the Khasi Hills, where
// Cherrapunji is one of the rainiest places on Earth, then down the Surma and Meghna rivers home.
export const RAINDROP = {
  sea: {name: 'the Bay of Bengal', at: [15, 88.5]},
  sky: [[15, 88.5], [18.5, 89.4], [21.8, 90.6], [24.2, 91.4], [25.27, 91.73]],
  rain: {name: 'Cherrapunji', at: [25.27, 91.73]},
  river: {name: 'the Meghna River', path: [[25.27, 91.73], [24.9, 91.87], [24.55, 91.4], [24.0, 91.0], [23.55, 90.75], [23.2, 90.62], [22.6, 90.65], [22.1, 90.75], [21.4, 90.6], [20.2, 90.0], [17.5, 89.2], [15, 88.5]]},
};
