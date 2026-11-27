// The screenshot scenes behind ?shot=cover|storm|harbor|finale|splash (with &seed=N). cover, storm,
// finale and splash fly a real flight forward under a simple deterministic autopilot (hold cruise
// altitude and speed, cancel any heading drift; splash also flares the landing) so the frame is
// what the game really looks like in the air; harbor stages the dispatch board with a few routes
// already flown and upgrades fitted, to show what a season of deliveries looks like without having
// to fly one first. The same seed always gives the same frame.
import { createFlight, stepFlight, flightWeatherStrength, PHASE_FLYING } from './flight.js';
import { findRoute } from './geo.js';
import { AIRCRAFT_BASE } from './config.js';
import { applyUpgrades } from './upgrades.js';
import { contractsForRoute } from './contracts.js';
import { createCampaign, comboMultiplier } from './campaign.js';
import { findAchievement } from './achievements.js';
import { SCREEN_FLIGHT, SCREEN_HARBOR, SCREEN_TITLE } from './render.js';
import { STEP } from './config.js';

const MAX_SECONDS = 90;
const CRUISE_ALTITUDE = 130;
const CRUISE_SPEED = 62;

function autopilot(flight) {
  const a = flight.aircraft;
  const pitch = a.altitude < CRUISE_ALTITUDE - 6 ? 1 : a.altitude > CRUISE_ALTITUDE + 6 ? -1 : 0;
  const yaw = a.courseDeviation > 2 ? -1 : a.courseDeviation < -2 ? 1 : 0;
  const throttle = a.speed < CRUISE_SPEED - 4 ? 1 : a.speed > CRUISE_SPEED + 4 ? -1 : 0;
  return { pitch, yaw, throttle };
}

function flyToward(flight, random, stopCondition, forceLightning) {
  for (let i = 0; i < MAX_SECONDS / STEP; i += 1) {
    if (stepFlight(flight, autopilot(flight), STEP)) break;
    if (flight.phase === PHASE_FLYING && stopCondition(flight)) break;
  }
  return {
    flight,
    blink: true,
    splash: 0,
    popupAge: 0,
    toast: null,
    lightning: Boolean(forceLightning),
    weatherStrength: flightWeatherStrength(flight),
  };
}

function stockStats() {
  return applyUpgrades(AIRCRAFT_BASE, new Set());
}

/** A gentler approach than the cruise autopilot: slows down early and flares right at the water. */
function landingAutopilot(flight, tuning) {
  const { commitDistance, approachSpeed, flareVy } = tuning;
  const a = flight.aircraft;
  const route = flight.route;
  const distanceLeft = route.distance - a.x;
  const hazards = route.hazards;
  const lastHazardEnd = hazards.reduce((end, h) => Math.max(end, h.end), 0);
  const clearOfHazards = a.x > lastHazardEnd + 20;
  const hazardCeiling = hazards.reduce((min, h) => Math.min(min, h.minAltitude + 28), CRUISE_ALTITUDE);
  const wantAlt = !clearOfHazards ? hazardCeiling : distanceLeft < commitDistance ? 0 : Math.min(hazardCeiling, distanceLeft * (CRUISE_ALTITUDE / 200));
  const wantSpeed = clearOfHazards && distanceLeft < 650 ? approachSpeed : CRUISE_SPEED;
  const nearGround = a.altitude < 14;
  const pitch = nearGround && a.vy < flareVy ? 1 : a.altitude < wantAlt - 3 ? 1 : a.altitude > wantAlt + 3 ? -1 : 0;
  const yaw = a.courseDeviation > 2 ? -1 : a.courseDeviation < -2 ? 1 : 0;
  const throttle = nearGround ? -1 : a.speed < wantSpeed - 3 ? 1 : a.speed > wantSpeed + 3 ? -1 : 0;
  return { pitch, yaw, throttle };
}

const LANDING_TUNINGS = [
  { commitDistance: 260, approachSpeed: 26, flareVy: -2 },
  { commitDistance: 220, approachSpeed: 26, flareVy: -2 },
  { commitDistance: 300, approachSpeed: 24, flareVy: -2 },
  { commitDistance: 240, approachSpeed: 28, flareVy: -2.5 },
  { commitDistance: 280, approachSpeed: 22, flareVy: -1.5 },
  { commitDistance: 200, approachSpeed: 24, flareVy: -2 },
  { commitDistance: 320, approachSpeed: 26, flareVy: -2 },
  { commitDistance: 260, approachSpeed: 30, flareVy: -3 },
];

/** Fly the same approach under each tuning (the seed never changes) and keep the best touchdown. */
function flyLanding(routeId, contractIndex, random) {
  let best = null;
  for (const tuning of LANDING_TUNINGS) {
    const route = findRoute(routeId);
    const contract = contractsForRoute(routeId)[contractIndex];
    const flight = createFlight({ ...route, weatherTable: ['clear'] }, contract, stockStats(), random);
    for (let i = 0; i < MAX_SECONDS / STEP; i += 1) {
      if (stepFlight(flight, landingAutopilot(flight, tuning), STEP)) break;
    }
    if (flight.result && flight.result.delivered && (!best || flight.result.verticalSpeed < best.result.verticalSpeed)) best = flight;
    if (best && best.result.grade === 'perfect') break;
  }
  return best ?? null;
}

function stageCover(random) {
  const route = findRoute('kelp');
  const contract = contractsForRoute('kelp')[0];
  const flight = createFlight({ ...route, weatherTable: ['clear'] }, contract, stockStats(), random);
  return flyToward(flight, random, (f) => route.distance - f.aircraft.x < 320, false);
}

function stageStorm(random) {
  const route = findRoute('windlass');
  const contract = contractsForRoute('windlass')[0];
  const forced = { ...route, weatherTable: ['storm'], forcedWeather: 'storm' };
  const flight = createFlight(forced, contract, stockStats(), random);
  return flyToward(flight, random, (f) => flightWeatherStrength(f) > 0.7, false);
}

function stageFinale(random) {
  const route = findRoute('finale');
  const contract = contractsForRoute('finale')[0];
  const flight = createFlight(route, contract, stockStats(), random);
  return flyToward(flight, random, (f) => flightWeatherStrength(f) > 0.65, false);
}

/** The moment a touchdown reveals its grade: early in the result panel's rise, combo included. */
function stageSplash(random) {
  const flight = flyLanding('driftwood', 0, random) ?? flyLanding('kelp', 0, random);
  if (flight && flight.result && flight.result.delivered) {
    const combo = 3;
    const multiplier = comboMultiplier(combo);
    flight.result.combo = combo;
    flight.result.multiplier = multiplier;
    flight.result.awardedScore = Math.round(flight.result.score * multiplier);
  }
  return {
    flight,
    blink: true,
    splash: 1,
    popupAge: 0.9,
    toast: { achievement: findAchievement('first-wings'), age: 0.5 },
    lightning: false,
    weatherStrength: 0,
    combo: 3,
    comboMultiplier: flight && flight.result ? flight.result.multiplier ?? 1 : 1,
    campaign: createCampaign(),
    shake: 0,
    flash: 0,
  };
}

function stageTitle() {
  const campaign = createCampaign();
  campaign.totals.deliveries = 7;
  campaign.unlockedAchievements.add('first-wings');
  campaign.unlockedAchievements.add('feather-touch');
  campaign.unlockedAchievements.add('storm-rider');
  return { screen: SCREEN_TITLE, campaign };
}

function stageResult(random) {
  const flight = flyLanding('kelp', 0, random) ?? flyLanding('driftwood', 0, random);
  const campaign = createCampaign();
  campaign.clearedRoutes.add('driftwood');
  campaign.clearedRoutes.add('kelp');
  return {
    flight,
    blink: true,
    splash: 0,
    popupAge: 1.2,
    toast: null,
    lightning: false,
    weatherStrength: 0,
    combo: 0,
    comboMultiplier: 1,
    campaign,
    shake: 0,
    flash: 0,
  };
}

function stageHarbor() {
  const campaign = createCampaign();
  campaign.clearedRoutes.add('driftwood');
  campaign.clearedRoutes.add('kelp');
  campaign.completedContracts.add('welcome-parcel');
  campaign.completedContracts.add('spare-nets');
  campaign.completedContracts.add('kelp-starters');
  campaign.ownedUpgrades.add('engine-ii');
  campaign.ownedUpgrades.add('floats-reinforced');
  campaign.ownedUpgrades.add('fuel-aux');
  campaign.money = 640;
  campaign.totals.deliveries = 3;
  const contracts = contractsForRoute('thornback');
  return {
    screen: SCREEN_HARBOR,
    ui: { campaign, selectedRouteId: 'thornback', selectedContractId: contracts[0].id, hoverUpgrade: 'avionics-vane' },
  };
}

/** Build the scene (and screen) for a named shot; anything but cover/storm/harbor/finale is cover. */
export function stageShot(name, random) {
  if (name === 'storm') return { screen: SCREEN_FLIGHT, scene: stageStorm(random) };
  if (name === 'finale') return { screen: SCREEN_FLIGHT, scene: stageFinale(random) };
  if (name === 'splash') return { screen: SCREEN_FLIGHT, scene: stageSplash(random) };
  if (name === 'result') return { screen: SCREEN_FLIGHT, scene: stageResult(random) };
  if (name === 'title') return stageTitle();
  if (name === 'harbor') return stageHarbor();
  return { screen: SCREEN_FLIGHT, scene: stageCover(random) };
}
