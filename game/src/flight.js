// One sortie: launch, cruise, weather, the dock. flight.js owns the rules that aircraft.js does
// not know about (the route, the wind, the reef, what counts as a landing); render.js only reads
// what this returns. Nothing here is seeded beyond the weather roll, so a real flight never
// repeats, but shots.js can still drive it with a seeded random for a repeatable screenshot.
import { createAircraft, stepAircraft, touchdownDamage, fuelFraction } from './aircraft.js';
import { scheduleWeather, weatherStrength, KIND_CROSSWIND, KIND_STORM, KIND_FOG, KIND_CLEAR } from './weather.js';
import { WEATHER, FLIGHT, SCORE } from './config.js';

export const PHASE_TAXI = 'taxi';
export const PHASE_FLYING = 'flying';
export const PHASE_LANDED = 'landed';
export const PHASE_CRASHED = 'crashed';

const LIFTOFF_SPEED_FACTOR = 1.12;
const DOCK_HALF_WIDTH = 120;

export function createFlight(route, contract, stats, random) {
  const cargoKg = contract ? contract.cargoKg : 0;
  const aircraft = createAircraft(stats, cargoKg);
  const weather = scheduleWeather(route, random);
  const windSign = random() < 0.5 ? -1 : 1;
  return {
    route,
    contract,
    aircraft,
    weather,
    windSign,
    phase: PHASE_TAXI,
    everAirborne: false,
    weatherSeen: new Set(),
    elapsed: 0,
    result: null, // filled once phase is landed or crashed
    hazardLabel: null,
  };
}

/** How strongly this flight's weather is acting right now (0..1); render.js reads this too. */
export function flightWeatherStrength(flight) {
  return weatherStrength(flight.weather, flight.aircraft.x, Math.max(20, flight.aircraft.speed));
}

/** Degrees/second the current weather pushes the heading this instant, signed by windSign. */
function windPush(flight, strength) {
  if (strength <= 0) return 0;
  if (flight.weather.kind === KIND_CROSSWIND) return flight.windSign * WEATHER.crosswindPush * strength;
  if (flight.weather.kind === KIND_STORM) return flight.windSign * WEATHER.crosswindPush * 0.6 * strength;
  return 0;
}

function activeHazard(route, x) {
  return route.hazards.find((hazard) => x >= hazard.start && x <= hazard.end) ?? null;
}

function finish(flight, outcome) {
  const aircraft = flight.aircraft;
  const landedClean = outcome.delivered && Math.abs(aircraft.vy) < FLIGHT.safeTouchdownSpeed && aircraft.integrity >= 100;
  flight.phase = outcome.delivered ? PHASE_LANDED : PHASE_CRASHED;
  flight.result = {
    delivered: outcome.delivered,
    reason: outcome.reason,
    landedClean,
    verticalSpeed: Math.abs(aircraft.vy),
    fuelFraction: fuelFraction(aircraft),
    weatherSeen: flight.weatherSeen,
    contractId: flight.contract ? flight.contract.id : null,
    cargoKg: flight.contract ? flight.contract.cargoKg : 0,
    fragile: flight.contract ? flight.contract.fragile : false,
    cargoBroken: outcome.cargoBroken ?? false,
    distance: flight.route.distance,
    integrity: aircraft.integrity,
    score: outcome.delivered ? scoreDelivery(flight, landedClean, outcome.cargoBroken) : 0,
  };
  return flight.result;
}

function scoreDelivery(flight, landedClean, cargoBroken) {
  const contract = flight.contract;
  let score = SCORE.baseDelivery;
  if (contract) score += contract.cargoKg * SCORE.perKg;
  if (landedClean) score += SCORE.cleanLandingBonus;
  if (contract && contract.fragile) score += cargoBroken ? SCORE.fragileBroken : SCORE.fragileIntact;
  if (fuelFraction(flight.aircraft) > 0.5) score += SCORE.lowFuelBonus;
  score += flight.weatherSeen.size * SCORE.weatherBonus;
  return Math.max(0, Math.round(score));
}

/**
 * Advance one fixed step. Returns null mid-flight, or the debrief object once the flight has
 * ended (also stored at flight.result from then on, so a caller that missed the return can
 * still read it).
 */
export function stepFlight(flight, controls, dt) {
  if (flight.phase === PHASE_LANDED || flight.phase === PHASE_CRASHED) return flight.result;
  const aircraft = flight.aircraft;
  flight.elapsed += dt;

  const strength = flightWeatherStrength(flight);
  if (strength > 0.08) flight.weatherSeen.add(flight.weather.kind);
  const wind = windPush(flight, strength);
  const turbulence = flight.weather.kind === KIND_STORM ? (pseudoNoise(flight.elapsed) * WEATHER.stormTurbulence * strength) : 0;

  if (flight.phase === PHASE_TAXI) {
    stepAircraft(aircraft, { ...controls, pitch: Math.max(0, controls.pitch) }, dt, 0);
    aircraft.altitude = 0;
    aircraft.vy = 0;
    if (aircraft.speed >= aircraft.stats.stallSpeed * LIFTOFF_SPEED_FACTOR && controls.pitch >= 0) {
      flight.phase = PHASE_FLYING;
      flight.everAirborne = true;
    }
    return null;
  }

  stepAircraft(aircraft, controls, dt, wind);
  aircraft.vy += turbulence;
  // Turbulence shakes the plane but, on its own, never halves the altitude it had a moment ago:
  // a gust can rattle a cruising flight without a stray dice roll ditching it in open water.
  const turbulenceDelta = Math.max(turbulence * dt, -aircraft.altitude * 0.5);
  aircraft.altitude = Math.max(0, aircraft.altitude + turbulenceDelta);

  const hazard = activeHazard(flight.route, aircraft.x);
  flight.hazardLabel = hazard ? hazard.label : null;
  if (hazard && aircraft.altitude < hazard.minAltitude) {
    return finish(flight, { delivered: false, reason: `struck ${hazard.label}` });
  }

  if (aircraft.altitude <= 0) {
    const damage = touchdownDamage(aircraft);
    aircraft.integrity = Math.max(0, aircraft.integrity - damage);
    const nearDock = Math.abs(aircraft.x - flight.route.distance) <= DOCK_HALF_WIDTH;
    if (!nearDock) return finish(flight, { delivered: false, reason: 'ditched short of the island' });
    if (aircraft.integrity <= 0) return finish(flight, { delivered: false, reason: 'the hull gave out on touchdown' });
    const fragileThreshold = FLIGHT.safeTouchdownSpeed * 1.8 * (aircraft.stats.fragileToleranceBonus ?? 1);
    const cargoBroken = Boolean(flight.contract && flight.contract.fragile && Math.abs(aircraft.vy) > fragileThreshold);
    return finish(flight, { delivered: true, reason: 'delivered', cargoBroken });
  }

  if (aircraft.x > flight.route.distance + DOCK_HALF_WIDTH * 2 && flight.phase === PHASE_FLYING) {
    return finish(flight, { delivered: false, reason: 'overflew the dock with no fuel to turn back' });
  }

  return null;
}

function pseudoNoise(t) {
  return Math.sin(t * 17.3) * 0.5 + Math.sin(t * 41.7) * 0.3 + Math.sin(t * 93.1) * 0.2;
}

export function isInDockZone(flight) {
  return Math.abs(flight.aircraft.x - flight.route.distance) <= DOCK_HALF_WIDTH;
}

export { KIND_CLEAR, KIND_CROSSWIND, KIND_FOG, KIND_STORM };
