// Fourteen feats. Each one's `check(campaign, debrief)` reads the campaign's running totals and
// the debrief of the flight that just ended (null between flights) and returns true once it is
// earned; evaluateAchievements (campaign.js calls it after every landing) is the only place these
// run. "Ace of the Amberreach" deliberately depends on the others, so it always unlocks last.

export const ACHIEVEMENTS = [
  {
    id: 'first-wings',
    name: 'First Wings',
    detail: 'Complete your first delivery.',
    check: (campaign) => campaign.totals.deliveries >= 1,
  },
  {
    id: 'feather-touch',
    name: 'Feather Touch',
    detail: 'Touch down at under 1 m/s of sink.',
    check: (campaign, debrief) => Boolean(debrief && debrief.landedClean && debrief.verticalSpeed < 1),
  },
  {
    id: 'storm-rider',
    name: 'Storm Rider',
    detail: 'Deliver a contract while flying through a storm.',
    check: (campaign, debrief) => Boolean(debrief && debrief.delivered && debrief.weatherSeen.has('storm')),
  },
  {
    id: 'fog-pilot',
    name: 'Fog Pilot',
    detail: 'Deliver a contract through fog.',
    check: (campaign, debrief) => Boolean(debrief && debrief.delivered && debrief.weatherSeen.has('fog')),
  },
  {
    id: 'crosswind-veteran',
    name: 'Crosswind Veteran',
    detail: 'Land safely with a strong crosswind running.',
    check: (campaign, debrief) => Boolean(debrief && debrief.landedClean && debrief.weatherSeen.has('crosswind')),
  },
  {
    id: 'heavy-hauler',
    name: 'Heavy Hauler',
    detail: 'Deliver a contract of 40 kg or more.',
    check: (campaign, debrief) => Boolean(debrief && debrief.delivered && debrief.cargoKg >= 40),
  },
  {
    id: 'fuel-sipper',
    name: 'Fuel Sipper',
    detail: 'Land a long haul with over half your fuel still in the tank.',
    check: (campaign, debrief) => Boolean(debrief && debrief.delivered && debrief.fuelFraction > 0.5 && debrief.distance >= 1500),
  },
  {
    id: 'red-line',
    name: 'Red Line',
    detail: 'Land with under 8% fuel left.',
    check: (campaign, debrief) => Boolean(debrief && debrief.landedClean && debrief.fuelFraction < 0.08),
  },
  {
    id: 'island-hopper',
    name: 'Island Hopper',
    detail: 'Open every route in the Amberreach Isles.',
    check: (campaign) => campaign.clearedRoutes.size >= 6,
  },
  {
    id: 'fully-rigged',
    name: 'Fully Rigged',
    detail: 'Fit every upgrade in the hangar.',
    check: (campaign, _debrief, upgradeCount) => campaign.ownedUpgrades.size >= upgradeCount,
  },
  {
    id: 'steady-hands',
    name: 'Steady Hands',
    detail: 'String together five landings with no hull damage.',
    check: (campaign) => campaign.totals.cleanStreak >= 5,
  },
  {
    id: 'long-night',
    name: 'Long Night',
    detail: 'Fly the Long Night Run to the atoll.',
    check: (campaign) => campaign.clearedRoutes.has('finale'),
  },
  {
    id: 'mail-marathon',
    name: 'Mail Marathon',
    detail: 'Reach ten deliveries in one Night Mail Marathon run.',
    check: (campaign) => campaign.totals.bestEndlessRun >= 10,
  },
  {
    id: 'ace-amberreach',
    name: 'Ace of the Amberreach',
    detail: 'Earn every other feat.',
    check: (campaign) => campaign.unlockedAchievements.size >= ACHIEVEMENTS.length - 1,
  },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;

export function findAchievement(id) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id) ?? null;
}
