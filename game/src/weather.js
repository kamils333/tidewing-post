// One weather event per flight, drawn from the route's weatherTable and placed somewhere in the
// cruise, well clear of the dock. ramp() reports how strong it is right now (0..1, up then down
// over WEATHER.rampSeconds at each end) so flight.js can fold it into the physics and render.js
// can fade the overlay in and out instead of snapping it.
import { WEATHER } from './config.js';

export const KIND_CLEAR = 'clear';
export const KIND_CROSSWIND = 'crosswind';
export const KIND_FOG = 'fog';
export const KIND_STORM = 'storm';

/** Pick this flight's weather and where, in metres from launch, it starts and ends. */
export function scheduleWeather(route, random) {
  const forced = route.forcedWeather ?? null;
  const table = route.weatherTable && route.weatherTable.length > 0 ? route.weatherTable : [KIND_CLEAR];
  const kind = forced ?? table[Math.floor(random() * table.length)];
  if (kind === KIND_CLEAR || !Number.isFinite(route.distance)) {
    return { kind: KIND_CLEAR, start: Infinity, end: -Infinity, span: 0 };
  }
  const span = route.distance * (0.3 + random() * 0.18);
  const latestStart = Math.max(120, route.distance - span - 220);
  const start = 180 + random() * Math.max(40, latestStart - 180);
  return { kind, start, end: start + span, span };
}

/** 0 outside the window, ramping to 1 across the middle, in metres of travel `x`. */
export function weatherStrength(weather, x, speed) {
  if (weather.kind === KIND_CLEAR || x < weather.start || x > weather.end) return 0;
  const rampMetres = Math.max(1, speed * WEATHER.rampSeconds);
  const intoIt = Math.min(1, (x - weather.start) / rampMetres);
  const outOfIt = Math.min(1, (weather.end - x) / rampMetres);
  return Math.max(0, Math.min(1, Math.min(intoIt, outOfIt)));
}

export function weatherLabel(kind) {
  if (kind === KIND_CROSSWIND) return 'Crosswind';
  if (kind === KIND_FOG) return 'Fog bank';
  if (kind === KIND_STORM) return 'Storm cell';
  return 'Clear sky';
}
