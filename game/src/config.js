// Every tuning number, in one place. Distances are metres along a route, altitude is metres
// above sea level, speed is metres per second; the fixed step keeps the sim's numbers (and the
// seeded screenshot scenes) independent of the display's frame rate.

export const TITLE = 'Tidewing Post';
export const SUBTITLE = 'Seaplane mail & cargo of the Amberreach Isles';

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const SEA_LEVEL = 0;
export const GRAVITY = 9.8;

export const AIRCRAFT_BASE = {
  name: 'Halcyon Mk.I',
  mass: 820, // kg, empty
  thrust: 5200, // N at full throttle, stock engine
  dragCoef: 0.6,
  stallSpeed: 21, // m/s airspeed below which lift collapses
  maxSpeed: 92,
  climbAuthority: 1.0, // how fast pitch input changes climb rate; upgraded by avionics
  turnRate: 46, // degrees/second of heading correction from yaw input
  fuelCapacity: 180, // litres
  burnRate: 2.1, // litres/second at full throttle, stock tank
  hullIntegrity: 100,
  impactTolerance: 3.6, // m/s vertical speed a stock float gear absorbs with no damage
  damagePerMs: 9, // integrity lost per m/s of vertical speed beyond tolerance
  crosswindGrip: 1.0, // divides the lateral push crosswind applies; higher is steadier
  visibilityBase: 620, // metres of clear draw distance, cut by fog
  cargoCapacity: 90, // kg
};

export const CONTROL = {
  pitchRate: 38, // degrees/second the stick moves the nose
  throttleRate: 0.6, // fraction/second
  yawAuthorityScale: 1, // multiplies AIRCRAFT_BASE.turnRate
};

export const FLIGHT = {
  cruiseAltitudeHint: 140,
  approachAltitude: 36, // below this, over the dock zone, is "on approach"
  perfectTouchdownSpeed: 1.2, // m/s vertical speed at or under which a landing grades Perfect
  safeTouchdownSpeed: 3.0, // m/s vertical speed at or under which a landing grades Smooth, not Rough
  driftDangerDeg: 26, // heading deviation past which a touchdown is read as crosswind-crossed
  lowFuelFraction: 0.22,
  criticalFuelFraction: 0.08,
};

/** Consecutive Perfect/Smooth landings build a score multiplier; one Rough landing resets it. */
export const COMBO = {
  stepPerLanding: 0.12,
  maxMultiplier: 2.5,
};

export const WEATHER = {
  crosswindPush: 9, // degrees/second of heading deviation at full crosswind strength
  stormTurbulence: 14, // m/s^2 of random vertical jitter at full storm strength
  fogVisibility: 220, // metres of draw distance inside fog
  rampSeconds: 3.5, // how long an event takes to build to full strength and fade out
};

export const SCORE = {
  baseDelivery: 120,
  perKg: 1.4,
  cleanLandingBonus: 60,
  fragileIntact: 90,
  fragileBroken: -70,
  lowFuelBonus: 40,
  weatherBonus: 50, // per distinct weather type survived this flight
  damagePenaltyPerPoint: 2,
};

export const PALETTE = {
  duskTop: '#2b1f45',
  duskUpper: '#6a3b63',
  duskLower: '#d1683f',
  duskHorizon: '#ffb259',
  sea: '#163249',
  seaFar: '#1f4663',
  seaFoam: 'rgba(255, 244, 214, 0.85)',
  islandFar: '#3c2f52',
  islandNear: '#241a30',
  hull: '#e8ddbf',
  hullShade: '#b39f74',
  engine: '#5a5f6b',
  float: '#2f4a52',
  cabinGlow: '#ffdd8a',
  livery: '#c9502f',
  liveryDark: '#8a3620',
  windowFrame: '#2a2018',
  text: '#f4ecd8',
  muted: '#b8ac92',
  warn: '#ff6b5e',
  good: '#8fe3a0',
  panel: 'rgba(20, 16, 28, 0.86)',
  panelEdge: '#5a4a63',
  ring: '#ffd27a',
};

export const FONT = '"Courier New", ui-monospace, monospace';

export const SAVE_KEY = 'tidewing-post.campaign.v1';
