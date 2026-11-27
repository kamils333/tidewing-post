// The Amberreach Isles: the archipelago's geography. Pure data plus small readers; nothing here
// touches a canvas or the flight sim. Each route is one leg, Saltmere Harbor to one island or (for
// the finale and the endless run) a longer leg built from the routes already flown.

export const HOME = { id: 'saltmere', name: 'Saltmere Harbor', map: { x: 0.5, y: 0.54 } };

// map: a point in the 0..1 square the harbour's chart draws into (render.js's drawArchipelagoMap
// is the only reader); placed to spread the isles out, not to be a precise compass.
export const ISLANDS = [
  { id: 'driftwood', name: 'Driftwood Cay', profile: 'low', keeper: 'mirei', map: { x: 0.8, y: 0.36 } },
  { id: 'kelp', name: 'Kelp Hollow', profile: 'lagoon', keeper: 'benno', map: { x: 0.74, y: 0.62 } },
  { id: 'thornback', name: 'Thornback Shoal', profile: 'reef', keeper: 'sera', map: { x: 0.44, y: 0.68 } },
  { id: 'windlass', name: 'Windlass Point', profile: 'ridge', keeper: 'dez', map: { x: 0.15, y: 0.6 } },
  { id: 'ashfall', name: 'Ashfall Rock', profile: 'volcanic', keeper: 'nat', map: { x: 0.18, y: 0.3 } },
  { id: 'nightfall', name: 'Nightfall Spit', profile: 'reef', keeper: 'joss', map: { x: 0.33, y: 0.08 } },
  { id: 'farhaven', name: 'Farhaven Reach', profile: 'low', keeper: 'oskar', map: { x: 0.93, y: 0.46 } },
  { id: 'lastlight', name: 'Last Light Atoll', profile: 'atoll', keeper: 'priya', map: { x: 0.56, y: 0.2 } },
];

/**
 * One leg of flight. `distance` is metres of cruise before the approach zone begins at
 * `distance - FLIGHT.approachAltitude`-scale range; `hazards` are x-ranges (metres from launch)
 * where altitude under `minAltitude` reads as striking the reef or rock, not landing.
 */
export const ROUTES = [
  {
    id: 'driftwood',
    island: 'driftwood',
    name: 'Saltmere -> Driftwood Cay',
    heading: 84,
    distance: 950,
    weatherTable: ['clear'],
    timeOfDay: 'dawn',
    hazards: [],
    unlockRequires: null,
  },
  {
    id: 'kelp',
    island: 'kelp',
    name: 'Saltmere -> Kelp Hollow',
    heading: 142,
    distance: 1180,
    weatherTable: ['clear', 'fog', 'crosswind'],
    timeOfDay: 'dawn',
    hazards: [],
    unlockRequires: 'driftwood',
  },
  {
    id: 'thornback',
    island: 'thornback',
    name: 'Saltmere -> Thornback Shoal',
    heading: 201,
    distance: 1380,
    weatherTable: ['crosswind', 'storm'],
    hazards: [{ start: 1080, end: 1200, minAltitude: 48, label: 'the Thornback reef' }],
    unlockRequires: 'kelp',
    gimmick: { name: 'Reef Gauntlet', hint: 'Hold height over the shoal, then dive hard for the dock.' },
  },
  {
    id: 'windlass',
    island: 'windlass',
    name: 'Saltmere -> Windlass Point',
    heading: 297,
    distance: 1520,
    weatherTable: ['crosswind', 'crosswind', 'storm'],
    forcedWeather: 'crosswind',
    hazards: [],
    unlockRequires: 'thornback',
    gimmick: { name: 'Crosswind Valley', hint: 'The wind never lets up here. Correct early, correct often.' },
  },
  {
    id: 'ashfall',
    island: 'ashfall',
    name: 'Saltmere -> Ashfall Rock',
    heading: 18,
    distance: 1720,
    weatherTable: ['fog', 'fog', 'storm'],
    forcedWeather: 'fog',
    hazards: [{ start: 1420, end: 1540, minAltitude: 40, label: 'the Ashfall shelf' }],
    unlockRequires: 'windlass',
    gimmick: { name: 'Ash Whiteout', hint: 'The haze hides the dock until you are nearly on it. Trust the gauges.' },
  },
  {
    id: 'nightfall',
    island: 'nightfall',
    name: 'Saltmere -> Nightfall Spit',
    heading: 95,
    distance: 1650,
    weatherTable: ['clear', 'fog'],
    isNight: true,
    hazards: [{ start: 1150, end: 1420, minAltitude: 44, label: 'the Nightfall shoal' }],
    unlockRequires: 'ashfall',
    gimmick: { name: 'Night Approach', hint: 'Only the lighthouse beam and your own landing lamp show you the dock in the dark.' },
  },
  {
    id: 'farhaven',
    island: 'farhaven',
    name: 'Saltmere -> Farhaven Reach',
    heading: 330,
    distance: 3600,
    weatherTable: ['clear', 'fog', 'crosswind'],
    timeOfDay: 'dawn',
    waypoint: { x: 1700, radius: 110 },
    hazards: [],
    unlockRequires: 'nightfall',
    gimmick: { name: 'Fuel Relay', hint: 'Touch down at Windlass Point to refuel partway, or you will not have the legs for the rest.' },
  },
  {
    id: 'lastlight',
    island: 'lastlight',
    name: 'Saltmere -> Last Light Atoll',
    heading: 249,
    distance: 2080,
    weatherTable: ['storm', 'crosswind', 'fog'],
    hazards: [{ start: 1760, end: 1900, minAltitude: 52, label: 'the Last Light bar' }],
    unlockRequires: 'farhaven',
  },
  {
    id: 'finale',
    island: 'lastlight',
    name: 'The Long Night Run',
    heading: 249,
    distance: 2320,
    weatherTable: ['storm'],
    forcedWeather: 'storm',
    hazards: [{ start: 1960, end: 2140, minAltitude: 58, label: 'the Last Light bar, in the dark' }],
    unlockRequires: 'lastlight',
    isFinale: true,
  },
  {
    id: 'endless',
    island: null,
    name: 'Night Mail Marathon',
    heading: 0,
    distance: 0,
    weatherTable: ['clear', 'crosswind', 'fog', 'storm'],
    hazards: [],
    unlockRequires: 'finale',
    isEndless: true,
  },
];

const ENDLESS_WEATHER_LADDER = [
  ['clear', 'clear', 'crosswind'],
  ['clear', 'crosswind', 'fog'],
  ['crosswind', 'fog', 'storm'],
  ['fog', 'storm', 'storm'],
];

/** One leg of the Night Mail Marathon: harder with every delivery (`run` is 0 on the first leg). */
export function createEndlessLeg(run, random) {
  const island = ISLANDS[Math.floor(random() * ISLANDS.length)];
  const ladder = ENDLESS_WEATHER_LADDER[Math.min(ENDLESS_WEATHER_LADDER.length - 1, Math.floor(run / 3))];
  return {
    id: 'endless',
    island: island.id,
    name: `Night run to ${island.name}`,
    heading: Math.floor(random() * 360),
    distance: 820 + Math.min(900, run * 70),
    weatherTable: ladder,
    hazards: [],
    unlockRequires: 'finale',
    isEndless: true,
  };
}

export function findRoute(id) {
  return ROUTES.find((route) => route.id === id) ?? null;
}

export function findIsland(id) {
  return ISLANDS.find((island) => island.id === id) ?? null;
}

/** A route is open once its prerequisite leg has been delivered at least once. */
export function isRouteUnlocked(route, clearedRouteIds) {
  if (route.unlockRequires === null) return true;
  return clearedRouteIds.has(route.unlockRequires);
}

/** The first route that is open but not yet delivered: the one the map should point to next. */
export function suggestedRoute(clearedRouteIds) {
  return ROUTES.find((route) => isRouteUnlocked(route, clearedRouteIds) && !clearedRouteIds.has(route.id)) ?? null;
}
