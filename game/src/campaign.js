// The pilot's logbook: what is unlocked, owned, flown and earned, between flights. Nothing here
// touches physics (aircraft.js, flight.js) or drawing (render.js); it only keeps score. Saved to
// this browser's storage so a visit can pick up where the last one left off.
import { ROUTES, findRoute } from './geo.js';
import { applyUpgrades, findUpgrade, UPGRADE_COUNT } from './upgrades.js';
import { AIRCRAFT_BASE, SAVE_KEY, COMBO } from './config.js';
import { ACHIEVEMENTS, ACHIEVEMENT_COUNT } from './achievements.js';

export function createCampaign() {
  const campaign = {
    clearedRoutes: new Set(),
    ownedUpgrades: new Set(),
    unlockedAchievements: new Set(),
    completedContracts: new Set(),
    money: 220,
    endlessRun: 0,
    combo: 0,
    totals: { deliveries: 0, crashes: 0, cleanStreak: 0, bestEndlessRun: 0 },
    lastDebrief: null,
  };
  load(campaign);
  return campaign;
}

/** A clean landing streak's reward: +12% a landing, capped at 2.5x, reset by any Rough one. */
export function comboMultiplier(combo) {
  return Math.min(COMBO.maxMultiplier, 1 + combo * COMBO.stepPerLanding);
}

export function campaignStats(campaign) {
  return applyUpgrades(AIRCRAFT_BASE, campaign.ownedUpgrades);
}

export function canBuyUpgrade(campaign, upgradeId) {
  const upgrade = findUpgrade(upgradeId);
  if (!upgrade || campaign.ownedUpgrades.has(upgradeId)) return false;
  if (upgrade.requires && !campaign.ownedUpgrades.has(upgrade.requires)) return false;
  return campaign.money >= upgrade.cost;
}

export function buyUpgrade(campaign, upgradeId) {
  if (!canBuyUpgrade(campaign, upgradeId)) return false;
  const upgrade = findUpgrade(upgradeId);
  campaign.money -= upgrade.cost;
  campaign.ownedUpgrades.add(upgradeId);
  save(campaign);
  return true;
}

export function routeIsUnlocked(campaign, routeId) {
  const route = findRoute(routeId);
  if (!route) return false;
  return route.unlockRequires === null || campaign.clearedRoutes.has(route.unlockRequires);
}

/**
 * Fold one flight's debrief into the logbook: money (with the combo multiplier a Perfect or
 * Smooth landing streak has earned), delivery totals, streaks and unlocks. Returns the
 * achievements newly earned this call (for a toast) and the award this landing paid out (for
 * the score popup), or null awards for a crash.
 */
export function recordFlightResult(campaign, route, debrief) {
  campaign.lastDebrief = debrief;
  let award = null;
  if (debrief.delivered) {
    if (debrief.grade === 'rough') campaign.combo = 0;
    else campaign.combo += 1;
    const multiplier = debrief.grade === 'rough' ? 1 : comboMultiplier(campaign.combo);
    const awardedScore = Math.round(debrief.score * multiplier);
    award = { baseScore: debrief.score, multiplier, combo: campaign.combo, awardedScore };
    campaign.money += awardedScore;
    campaign.totals.deliveries += 1;
    campaign.totals.cleanStreak = debrief.landedClean ? campaign.totals.cleanStreak + 1 : 0;
    if (debrief.contractId) campaign.completedContracts.add(debrief.contractId);
    campaign.clearedRoutes.add(route.id);
    if (route.isEndless) {
      campaign.endlessRun += 1;
      campaign.totals.bestEndlessRun = Math.max(campaign.totals.bestEndlessRun, campaign.endlessRun);
    }
  } else {
    campaign.combo = 0;
    campaign.totals.crashes += 1;
    campaign.totals.cleanStreak = 0;
    if (route.isEndless) campaign.endlessRun = 0;
  }
  const unlocked = evaluateAchievements(campaign);
  save(campaign);
  return { unlocked, award };
}

function evaluateAchievements(campaign) {
  const unlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (campaign.unlockedAchievements.has(achievement.id)) continue;
    if (achievement.check(campaign, campaign.lastDebrief, UPGRADE_COUNT)) {
      campaign.unlockedAchievements.add(achievement.id);
      unlocked.push(achievement);
    }
  }
  return unlocked;
}

export function clearedCount(campaign) {
  return ROUTES.filter((route) => !route.isEndless && campaign.clearedRoutes.has(route.id)).length;
}

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENT_COUNT;
export const TOTAL_UPGRADES = UPGRADE_COUNT;

function save(campaign) {
  try {
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        clearedRoutes: [...campaign.clearedRoutes],
        ownedUpgrades: [...campaign.ownedUpgrades],
        unlockedAchievements: [...campaign.unlockedAchievements],
        completedContracts: [...campaign.completedContracts],
        money: campaign.money,
        combo: campaign.combo,
        totals: campaign.totals,
      }),
    );
  } catch {
    // Private browsing or a full quota: the run still plays, just without memory of itself.
  }
}

function load(campaign) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    campaign.clearedRoutes = new Set(data.clearedRoutes ?? []);
    campaign.ownedUpgrades = new Set(data.ownedUpgrades ?? []);
    campaign.unlockedAchievements = new Set(data.unlockedAchievements ?? []);
    campaign.completedContracts = new Set(data.completedContracts ?? []);
    campaign.money = typeof data.money === 'number' ? data.money : campaign.money;
    campaign.combo = typeof data.combo === 'number' ? data.combo : campaign.combo;
    if (data.totals) Object.assign(campaign.totals, data.totals);
  } catch {
    // A corrupt or foreign save is treated as none: start fresh rather than throw.
  }
}

export function resetCampaign(campaign) {
  campaign.clearedRoutes.clear();
  campaign.ownedUpgrades.clear();
  campaign.unlockedAchievements.clear();
  campaign.completedContracts.clear();
  campaign.money = 220;
  campaign.endlessRun = 0;
  campaign.combo = 0;
  campaign.totals.deliveries = 0;
  campaign.totals.crashes = 0;
  campaign.totals.cleanStreak = 0;
  campaign.totals.bestEndlessRun = 0;
  campaign.lastDebrief = null;
  save(campaign);
}
