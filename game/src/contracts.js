// The manifest: every delivery contract Tidewing Post can fly, with the route it rides on, its
// cargo weight and whether rough handling can break it. Pure data and small lookups; accepting
// and completing a contract is the campaign's job (campaign.js), not this file's.

export const CONTRACTS = [
  {
    id: 'welcome-parcel',
    route: 'driftwood',
    client: 'cobb',
    title: 'Welcome Aboard Parcel',
    cargoKg: 8,
    fragile: false,
    brief: 'A spare compass for the new hire. Old Cobb wants it there before the morning run.',
  },
  {
    id: 'spare-nets',
    route: 'driftwood',
    client: 'mirei',
    title: 'Spare Nets',
    cargoKg: 22,
    fragile: false,
    brief: "Mirei's crew lost two nets to a shark last week. These are the replacements.",
  },
  {
    id: 'kelp-starters',
    route: 'kelp',
    client: 'benno',
    title: 'Kelp Starter Jars',
    cargoKg: 16,
    fragile: true,
    brief: "Live kelp spores in brine jars. Benno's whole next harvest rides in your hold.",
  },
  {
    id: 'birthday-parcel',
    route: 'kelp',
    client: 'wren',
    title: "Wren's Birthday Parcel",
    cargoKg: 3,
    fragile: true,
    brief: "A music box from the mainland. Wren has asked after it every run for a month.",
  },
  {
    id: 'lamp-oil',
    route: 'thornback',
    client: 'sera',
    title: 'Lamp Oil Drum',
    cargoKg: 58,
    fragile: false,
    brief: 'Fuel for the Thornback light. Heavy, and the light cannot go dark on your account.',
  },
  {
    id: 'logbook-return',
    route: 'thornback',
    client: 'sera',
    title: "Logbook Return",
    cargoKg: 4,
    fragile: false,
    brief: "Forty years of wreck sightings, in Sera's own hand. The harbourmaster needs it signed.",
  },
  {
    id: 'windmill-gears',
    route: 'windlass',
    client: 'dez',
    title: 'Windmill Gears',
    cargoKg: 64,
    fragile: true,
    brief: "Cast gears, machined to the thousandth. Dez says a crack in one costs him a season.",
  },
  {
    id: 'storm-flags',
    route: 'windlass',
    client: 'dez',
    title: 'Storm Warning Flags',
    cargoKg: 6,
    fragile: false,
    brief: 'Signal flags for the mill tower, wanted before the weather turns.',
  },
  {
    id: 'ash-masks',
    route: 'ashfall',
    client: 'nat',
    title: 'Ash-Filter Masks',
    cargoKg: 11,
    fragile: false,
    brief: "The miners are coughing. Nat asked for these three runs ago.",
  },
  {
    id: 'ore-sample',
    route: 'ashfall',
    client: 'nat',
    title: 'Ore Sample Crate',
    cargoKg: 46,
    fragile: true,
    brief: 'A crate of raw ore for the assay office. Rough rock, but it chips if it is dropped.',
  },
  {
    id: 'medicine-chest',
    route: 'lastlight',
    client: 'priya',
    title: 'Medicine Chest',
    cargoKg: 19,
    fragile: true,
    brief: "Priya's dispensary is down to its last week of stock. This is the whole order.",
  },
  {
    id: 'radio-parts',
    route: 'lastlight',
    client: 'priya',
    title: 'Spare Radio Parts',
    cargoKg: 13,
    fragile: false,
    brief: "The atoll's radio has been dead for a week. These parts are the fix.",
  },
  {
    id: 'reef-survey',
    route: 'lastlight',
    client: 'sera',
    title: 'Reef Survey Charts',
    cargoKg: 5,
    fragile: false,
    brief: 'Sera traced new shoals around the atoll. Priya needs the charts before the next storm season.',
  },
  {
    id: 'serum-run',
    route: 'finale',
    client: 'priya',
    title: 'Emergency Serum Run',
    cargoKg: 9,
    fragile: true,
    brief: 'Fever on the atoll, and the serum will not keep until the storm clears. Fly it tonight.',
  },
];

export function contractsForRoute(routeId) {
  return CONTRACTS.filter((contract) => contract.route === routeId);
}

export function findContract(id) {
  return CONTRACTS.find((contract) => contract.id === id) ?? null;
}

export const CONTRACT_COUNT = CONTRACTS.length;
