// The Halcyon's flight model: throttle, pitch and yaw in, a new speed/altitude/heading/fuel out.
// No route, no weather and no canvas in here; flight.js supplies the wind and decides what a
// touchdown or a reef means. Units: metres, metres/second, seconds, litres, degrees.
import { GRAVITY, CONTROL } from './config.js';

const DEG = Math.PI / 180;
const MAX_PITCH_DEG = 34;
const MIN_PITCH_DEG = -28;
const STALL_LIFT_FACTOR = 0.22;
const STALL_NOSE_DROP = 24; // degrees/second the nose falls on its own once stalled
// A nose-down attitude already bleeds altitude through vy (speed*sin(pitch)); letting the same
// dive also add its full weight to forward-speed gravity would double-spend that energy and let
// a hard dive snowball into an unrecoverable sink rate. Only a share of it feeds speed.
const GRAVITY_ALONG_PATH_SHARE = 0.16;

export function createAircraft(stats, cargoKg) {
  return {
    stats,
    cargoKg,
    x: 0,
    altitude: 0,
    speed: stats.stallSpeed + 4,
    pitchDeg: 4,
    throttle: 0.55,
    courseDeviation: 0,
    fuel: stats.fuelCapacity,
    integrity: 100,
    vy: 0,
    stalled: false,
  };
}

/**
 * One fixed step. `controls` is { pitch, yaw, throttle } each -1, 0 or 1. `windDegPerSec` is the
 * crosswind's current pull on heading (already scaled by strength and sign in flight.js); it is
 * divided by the airframe's crosswindGrip before it is added.
 */
export function stepAircraft(aircraft, controls, dt, windDegPerSec) {
  const stats = aircraft.stats;
  const mass = stats.mass + aircraft.cargoKg;

  aircraft.throttle = clamp(aircraft.throttle + controls.throttle * CONTROL.throttleRate * dt, 0, 1);
  aircraft.pitchDeg = clamp(aircraft.pitchDeg + controls.pitch * CONTROL.pitchRate * dt, MIN_PITCH_DEG, MAX_PITCH_DEG);

  aircraft.stalled = aircraft.speed < stats.stallSpeed;
  if (aircraft.stalled) aircraft.pitchDeg = Math.max(MIN_PITCH_DEG, aircraft.pitchDeg - STALL_NOSE_DROP * dt);

  const hasFuel = aircraft.fuel > 0;
  const pitchRad = aircraft.pitchDeg * DEG;
  const thrustForce = hasFuel ? aircraft.throttle * stats.thrust : 0;
  const dragForce = stats.dragCoef * aircraft.speed * aircraft.speed * (mass / stats.mass);
  const alongPathGravity = GRAVITY * Math.sin(pitchRad) * mass * GRAVITY_ALONG_PATH_SHARE;
  const accel = (thrustForce - dragForce - alongPathGravity) / mass;
  aircraft.speed = Math.max(0, Math.min(stats.maxSpeed * 1.12, aircraft.speed + accel * dt));

  const liftFactor = aircraft.stalled ? STALL_LIFT_FACTOR : 1;
  aircraft.vy = aircraft.speed * Math.sin(pitchRad) * liftFactor * stats.climbAuthority;
  aircraft.altitude = Math.max(0, aircraft.altitude + aircraft.vy * dt);

  aircraft.courseDeviation += controls.yaw * stats.turnRate * CONTROL.yawAuthorityScale * dt;
  aircraft.courseDeviation += (windDegPerSec / stats.crosswindGrip) * dt;
  aircraft.courseDeviation = clamp(aircraft.courseDeviation, -90, 90);

  if (hasFuel) {
    const burn = stats.burnRate * (0.35 + 0.65 * aircraft.throttle) * dt;
    aircraft.fuel = Math.max(0, aircraft.fuel - burn);
  }

  aircraft.x += aircraft.speed * dt;
  return aircraft;
}

/** Damage (0..100 points of integrity) a touchdown of this sink rate deals; 0 below tolerance. */
export function touchdownDamage(aircraft) {
  const stats = aircraft.stats;
  const excess = Math.max(0, aircraft.vy < 0 ? -aircraft.vy - stats.impactTolerance : 0);
  return excess * stats.damagePerMs;
}

export function fuelFraction(aircraft) {
  return aircraft.stats.fuelCapacity > 0 ? aircraft.fuel / aircraft.stats.fuelCapacity : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
