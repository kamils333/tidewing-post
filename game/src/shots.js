// The screenshot scenes behind ?shot=cover|storm|harbor|finale (with &seed=N). cover, storm and
// finale fly a real flight forward under a simple deterministic autopilot (hold cruise altitude
// and speed, cancel any heading drift) so the frame is what the game really looks like in the
// air; harbor stages the dispatch board with a few routes already flown and upgrades fitted, to
// show what a season of deliveries looks like without having to fly one first. The same seed
// always gives the same frame.
import { createFlight, stepFlight, flightWeatherStrength, PHASE_FLYING } from './flight.js';
import { findRoute } from './geo.js';
import { AIRCRAFT_BASE } from './config.js';
import { applyUpgrades } from './upgrades.js';
import { contractsForRoute } from './contracts.js';
import { createCampaign } from './campaign.js';
import { SCREEN_FLIGHT, SCREEN_HARBOR } from './render.js';
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
  return flyToward(flight, random, (f) => flightWeatherStrength(f) > 0.6, false);
}

function stageFinale(random) {
  const route = findRoute('finale');
  const contract = contractsForRoute('finale')[0];
  const flight = createFlight(route, contract, stockStats(), random);
  return flyToward(flight, random, (f) => flightWeatherStrength(f) > 0.5 || route.distance - f.aircraft.x < 180, false);
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
  if (name === 'harbor') return stageHarbor();
  return { screen: SCREEN_FLIGHT, scene: stageCover(random) };
}
