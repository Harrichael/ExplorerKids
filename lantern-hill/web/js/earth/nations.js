// What a child might ask about a country: its flag, how many people live there, its money, its
// cities, who runs it and how, and when it became a country. From data/nations.json (built by
// tools/earth/build.mjs from Wikidata and Natural Earth), keyed by the `id` of geography.json's countries.
//
//   const nations = await loadNations();
//   const japan = nations.JPN;               // {name: 'Japan', capital: 'Tokyo', currency: [{name: 'Japanese yen', …}], …}
//   governmentOf(japan.government).means     // 'A king, queen or emperor is the head of the country, but …'
//   foundedSaying(nations.USA)               // '1776, when it broke away from Great Britain'

let loading = null;
export function loadNations(){
  if (!loading) {
    loading = fetch('data/nations.json').then(r => r.ok ? r.json() : Promise.reject(new Error(`nations.json: ${r.status}`)));
    loading.catch(() => { loading = null; });
  }
  return loading;
}

// Kept small on purpose: a child needs the big idea of who's in charge, not every textbook label.
// A country is filed under how its government is set up on paper.
export const GOVERNMENTS = {
  presidential: {name: 'Republic with a president', means: 'The people vote for a president, who leads the country and runs its government.'},
  parliamentary: {name: 'Parliamentary republic', means: 'The people vote for a parliament, and the parliament chooses a prime minister to run the country. A president has a smaller job.'},
  'semi-presidential': {name: 'Republic with a president and a prime minister', means: 'The people vote for a president, who shares the job of running the country with a prime minister.'},
  'constitutional-monarchy': {name: 'Constitutional monarchy', means: 'A king, queen or emperor is the head of the country, but the people vote for a parliament that makes the laws.'},
  'absolute-monarchy': {name: 'Absolute monarchy', means: 'A king, sultan or emir runs the country and makes the laws. The job passes down in the family.'},
  'one-party': {name: 'One-party state', means: 'Only one political party is allowed to run the country, so people can\'t vote for a different one.'},
  theocracy: {name: 'Run by religious leaders', means: 'Religious leaders have the final say over how the country is run.'},
  council: {name: 'Republic run by a council', means: 'The parliament chooses seven people who run the country together, and they take turns being president for a year.'},
  military: {name: 'Military government', means: 'The army has taken charge of the country, for now.'},
  divided: {name: 'Divided by war', means: 'Two rival groups each say they are the real government, and fight over who runs the country.'},
  territory: {name: 'Territory', means: 'It isn\'t a country of its own. It belongs to another country, which looks after things like its defence.'},
  shared: {name: 'Shared by many countries', means: 'No country owns it. Many countries agreed to share it, for science and peace.'},
};
export const governmentOf = key => GOVERNMENTS[key] || null;

const year = y => y < 0 ? `${-y} BC` : `${y}`;
const SAY = {
  independence: f => `${year(f.year)}, when it broke away from ${f.from}`,
  unification: f => `${year(f.year)}, when its lands came together as one country`,
  revolution: f => `${year(f.year)}, after a revolution`,
  republic: f => `${year(f.year)}, as a republic`,
  union: f => `${year(f.year)}, when ${f.from} joined together`,
  split: f => `${year(f.year)}, when ${f.from} split apart`,
  ancient: () => 'very long ago: it is one of the oldest countries in the world',
  founded: f => year(f.year),
};
export function foundedSaying(nation){
  const f = nation && nation.founded;
  if (!f || f.year == null) return null;
  return (SAY[f.how] || SAY.founded)(f);
}
