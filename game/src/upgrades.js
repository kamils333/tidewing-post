// The hangar: every upgrade the Halcyon can take, what it costs and the stat it actually
// changes on the aircraft (applyUpgrades, below, is the only place that math happens). Ten
// upgrades across five systems; the campaign decides which are owned, this file only describes
// them.

export const UPGRADES = [
  {
    id: 'engine-ii',
    system: 'Engine',
    name: 'Radial Engine Mk.II',
    cost: 180,
    detail: '+22% thrust. The stock engine struggles with a full hold past Kelp Hollow.',
    effect: { thrust: 1.22 },
  },
  {
    id: 'engine-iii',
    system: 'Engine',
    name: 'Twin-Row Engine Mk.III',
    cost: 340,
    detail: '+45% thrust over stock. Needs the Mk.II block first.',
    requires: 'engine-ii',
    effect: { thrust: 1.45 },
  },
  {
    id: 'floats-reinforced',
    system: 'Floats',
    name: 'Reinforced Floats',
    cost: 150,
    detail: 'Doubles the impact a landing can take before the hull is damaged.',
    effect: { impactTolerance: 2.0 },
  },
  {
    id: 'floats-long',
    system: 'Floats',
    name: 'Long-Hull Floats',
    cost: 220,
    detail: 'Slicker in the water and the air alike: -18% drag, higher top speed.',
    effect: { dragCoef: 0.82 },
  },
  {
    id: 'cargo-rack',
    system: 'Cargo',
    name: 'Cargo Rack Extension',
    cost: 160,
    detail: '+35% cargo capacity for the heavier contracts out past Thornback.',
    effect: { cargoCapacity: 1.35 },
  },
  {
    id: 'cargo-padded',
    system: 'Cargo',
    name: 'Padded Cargo Hold',
    cost: 190,
    detail: 'Straps and padding: fragile cargo survives a harder landing.',
    effect: { fragileToleranceBonus: 1.6 },
  },
  {
    id: 'fuel-aux',
    system: 'Fuel',
    name: 'Auxiliary Fuel Tank',
    cost: 170,
    detail: '+40% fuel capacity. The Last Light run is thirsty without it.',
    effect: { fuelCapacity: 1.4 },
  },
  {
    id: 'fuel-injector',
    system: 'Fuel',
    name: 'Efficiency Injector',
    cost: 230,
    detail: '-20% burn at any throttle setting.',
    effect: { burnRate: 0.8 },
  },
  {
    id: 'avionics-vane',
    system: 'Avionics',
    name: 'Wind Vane Stabiliser',
    cost: 150,
    detail: 'Crosswind pushes the heading half as hard.',
    effect: { crosswindGrip: 1.5 },
  },
  {
    id: 'avionics-lamp',
    system: 'Avionics',
    name: 'Long-Reach Landing Lamp',
    cost: 150,
    detail: 'Cuts through fog: the dock and the gauges read clearly much further out.',
    effect: { visibilityBase: 1.55 },
  },
];

export function findUpgrade(id) {
  return UPGRADES.find((upgrade) => upgrade.id === id) ?? null;
}

export const UPGRADE_COUNT = UPGRADES.length;

/**
 * Fold every owned upgrade's effect into a fresh stats object derived from AIRCRAFT_BASE.
 * Multiplicative fields multiply (several engines would too, but requires enforces one path);
 * fragileToleranceBonus is additive on top of 1 and read by flight.js directly.
 */
export function applyUpgrades(base, ownedIds) {
  const stats = { ...base, fragileToleranceBonus: 1 };
  for (const id of ownedIds) {
    const upgrade = findUpgrade(id);
    if (!upgrade) continue;
    for (const [key, factor] of Object.entries(upgrade.effect)) {
      stats[key] = (stats[key] ?? 1) * factor;
    }
  }
  return stats;
}
