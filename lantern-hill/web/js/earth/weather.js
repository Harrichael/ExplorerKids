// The weather on the real Earth right now, from Open-Meteo (open-meteo.com: free, no key, and it
// works from a web page), and how a child might make sense of it: words for the sky, the feel of a
// temperature, a breeze's name, and why it's hot or cold here. Also Hoot's weather missions: find
// somewhere on Earth where it's snowing, say, right now, checked against the real weather there.
//
//   const w = await weatherAt(64.1, -21.9);   // {temperature, feelsLike, wind, from, rain, snow, clouds, code, day, high, low, elevation, time}
//   sky(w)                                   // {icon: '🌧️', words: 'Light rain'}
//   const g = await weatherGrid();            // the whole world every 10°, for painting it
//   g.at(51.5, 0).temperature
//
// Open-Meteo asks that its free API be used non-commercially, and credited.

export const CREDIT = 'Weather: Open-Meteo.com, CC BY 4.0';
const API = 'https://api.open-meteo.com/v1/forecast';
const NOW = 'temperature_2m,apparent_temperature,precipitation,rain,snowfall,cloud_cover,wind_speed_10m,wind_direction_10m,is_day,weather_code';

const json = url => fetch(url).then(r => r.ok ? r.json() : Promise.reject(new Error(`weather: ${r.status}`)));
const read = d => ({temperature: d.current.temperature_2m, feelsLike: d.current.apparent_temperature, rain: d.current.precipitation, snow: d.current.snowfall,
  clouds: d.current.cloud_cover, wind: d.current.wind_speed_10m, from: d.current.wind_direction_10m, day: !!d.current.is_day, code: d.current.weather_code,
  elevation: d.elevation, time: d.current.time, offset: d.utc_offset_seconds,
  high: d.daily?.temperature_2m_max?.[0], low: d.daily?.temperature_2m_min?.[0]});

// the weather a short while ago at one spot, which is as "now" as a forecast gets
export async function weatherAt(lat, lon){
  return read(await json(`${API}?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=${NOW}&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`));
}

// The whole world's weather every 10 degrees, asked for in one go, and kept for the hour: plenty to
// paint the globe with, smoothed in between. `at` blends the four nearest points, wrapping round the
// date line; the sky's code isn't a number to blend, so it's the nearest point's.
const STEP = 10, LATS = 17, LONS = 36;   // -80…80, -180…170
let grid = null;
export function weatherGrid(){
  const hour = new Date().toISOString().slice(0, 13);
  if (grid && grid.hour === hour) return grid.p;
  const lats = [], lons = [];
  for (let j = 0; j < LATS; j++) for (let i = 0; i < LONS; i++) { lats.push(-80 + j*STEP); lons.push(-180 + i*STEP); }
  const p = json(`${API}?latitude=${lats.join(',')}&longitude=${lons.join(',')}&current=${NOW}&timezone=GMT`).then(list => makeGrid(list.map(read)));
  grid = {hour, p}; p.catch(() => { if (grid && grid.p === p) grid = null; });
  return p;
}
export function makeGrid(points){
  const cell = (j, i) => points[Math.max(0, Math.min(LATS - 1, j))*LONS + ((i % LONS) + LONS) % LONS];
  function at(lat, lon){
    const y = (lat + 80)/STEP, x = (lon + 180)/STEP, j = Math.floor(y), i = Math.floor(x), fy = Math.max(0, Math.min(1, y - j)), fx = x - i;
    const a = cell(j, i), b = cell(j, i + 1), c = cell(j + 1, i), d = cell(j + 1, i + 1);
    const mix = k => (a[k]*(1 - fx) + b[k]*fx)*(1 - fy) + (c[k]*(1 - fx) + d[k]*fx)*fy;
    // wind blends as a pair of arrows, not as angles, or north-west and north-east would average to south
    const toward = p => { const r = (p.from + 180)*Math.PI/180; return [Math.sin(r)*p.wind, Math.cos(r)*p.wind]; };
    const [ae, an] = toward(a), [be, bn] = toward(b), [ce, cn] = toward(c), [de, dn] = toward(d);
    const east = (ae*(1 - fx) + be*fx)*(1 - fy) + (ce*(1 - fx) + de*fx)*fy, north = (an*(1 - fx) + bn*fx)*(1 - fy) + (cn*(1 - fx) + dn*fx)*fy;
    const near = cell(Math.round(y), Math.round(x));
    return {temperature: mix('temperature'), rain: mix('rain'), snow: mix('snow'), clouds: mix('clouds'), east, north, code: near.code, day: near.day};
  }
  // the points themselves, for finding one where something's true
  const spots = points.map((p, k) => ({...p, lat: -80 + Math.floor(k/LONS)*STEP, lon: -180 + (k % LONS)*STEP}));
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
