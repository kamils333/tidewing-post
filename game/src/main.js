// Boot and the one loop. Four screens: title, the Saltmere Harbor dispatch board, a route's
// briefing, and the flight itself (which keeps showing its last result, and any feat toast,
// until the pilot confirms and the board takes over again). ?shot=cover|storm|harbor|finale
// (with &seed=N) stages one frame for a screenshot instead of running the game; see shots.js.
import { STEP, FLIGHT } from './config.js';
import { createRandom, freshSeed } from './random.js';
import { ROUTES, ISLANDS, findRoute, createEndlessLeg } from './geo.js';
import { contractsForRoute } from './contracts.js';
import { createCampaign, campaignStats, buyUpgrade, canBuyUpgrade, recordFlightResult, routeIsUnlocked, comboMultiplier } from './campaign.js';
import { createFlight, stepFlight, flightWeatherStrength, PHASE_LANDED, PHASE_CRASHED } from './flight.js';
import { createInput, pointInRect, pointInCircle } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_HARBOR, SCREEN_BRIEFING, SCREEN_FLIGHT, HARBOR_LAYOUT, mapScreenPoint, MAP_MARKER_RADIUS } from './render.js';
import { UPGRADES } from './upgrades.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const seed = Number.isInteger(seedParam) ? seedParam : 1;
  const staged = stageShot(name, createRandom(seed));
  let painted = 0;
  function paint() {
    renderer.draw(staged);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const audio = createAudio();
  const input = createInput(canvas, renderer, () => audio.unlock());
  const campaign = createCampaign();
  const rollWeather = () => Math.random();
  let warningBeepTimer = 0;

  let screen = SCREEN_TITLE;
  let ui = { campaign, selectedRouteId: null, selectedContractId: null, hoverUpgrade: null };
  let flight = null;
  let flightRecorded = false;
  let popupAge = 0;
  let endlessRun = 0;
  const toastQueue = [];
  let currentToast = null;
  let blinkClock = 0;

  function announceScreen(name) {
    if (name === SCREEN_TITLE) announce('Tidewing Post. Press Space or click to open the dispatch board.');
    else if (name === SCREEN_HARBOR) announce('Saltmere Harbor dispatch board. Pick a route and a contract, then Fly.');
    else if (name === SCREEN_BRIEFING) announce('Briefing. Press Space or click to take off.');
  }

  function goHarbor() {
    audio.stopEngine();
    screen = SCREEN_HARBOR;
    flight = null;
    if (!ui.selectedRouteId || !routeIsUnlocked(ui.campaign, ui.selectedRouteId)) selectRoute('driftwood');
    announceScreen(screen);
  }

  function selectRoute(routeId) {
    const route = findRoute(routeId);
    if (!route || !routeIsUnlocked(ui.campaign, routeId)) return;
    ui.selectedRouteId = routeId;
    const contracts = route.isEndless ? [] : contractsForRoute(routeId);
    ui.selectedContractId = contracts.length > 0 ? contracts[0].id : null;
  }

  function selectContract(contractId) {
    ui.selectedContractId = contractId;
  }

  function launchFlight(route, contract) {
    const stats = campaignStats(ui.campaign);
    flight = createFlight(route, contract, stats, rollWeather);
    flightRecorded = false;
    popupAge = 0;
    warningBeepTimer = 0;
    screen = SCREEN_FLIGHT;
    audio.startEngine();
    announce(`Airborne for ${route.name}.`);
  }

  function goBriefing(routeId) {
    const route = findRoute(routeId);
    if (!route) return;
    const contract = route.isEndless ? null : contractsForRoute(routeId).find((c) => c.id === ui.selectedContractId);
    if (!route.isEndless && !contract) return;
    screen = SCREEN_BRIEFING;
    ui.briefRoute = route;
    ui.briefContract = contract;
    announceScreen(screen);
  }

  function handleHarborClick(point) {
    const L = HARBOR_LAYOUT;
    ROUTES.forEach((route, i) => {
      const y = L.routes.yStart + i * L.routes.rowH;
      if (pointInRect(point, L.routes.x, y - 22, L.routes.width, L.routes.rowH - 4)) selectRoute(route.id);
    });
    const route = findRoute(ui.selectedRouteId);
    if (route && !route.isEndless) {
      contractsForRoute(route.id).forEach((contract, i) => {
        const y = L.contracts.yStart + i * L.contracts.rowH;
        if (pointInRect(point, L.contracts.x - 16, y - 24, L.contracts.width, L.contracts.rowH - 6)) selectContract(contract.id);
      });
    }
    UPGRADES.forEach((upgrade, i) => {
      const y = L.shop.yStart + i * L.shop.rowH;
      if (pointInRect(point, L.shop.x - 10, y - 20, L.shop.width, L.shop.rowH - 4)) {
        ui.hoverUpgrade = upgrade.id;
        if (canBuyUpgrade(ui.campaign, upgrade.id)) {
          buyUpgrade(ui.campaign, upgrade.id);
          audio.playClickTick();
        }
      }
    });
    ISLANDS.forEach((island) => {
      const islandRoute = ROUTES.find((r) => r.island === island.id && !r.isFinale);
      if (!islandRoute) return;
      const marker = mapScreenPoint(island.map);
      if (pointInCircle(point, marker.x, marker.y, MAP_MARKER_RADIUS)) selectRoute(islandRoute.id);
    });
    if (pointInRect(point, L.flyButton.x, L.flyButton.y, L.flyButton.width, L.flyButton.height) && route) {
      if (route.isEndless || ui.selectedContractId) goBriefing(route.id);
    }
  }

  function queueAchievementToasts(unlocked) {
    for (const achievement of unlocked) {
      toastQueue.push(achievement);
      audio.playAchievementChime();
    }
  }

  function playLandingSound(result) {
    const vyIntensity = Math.min(1, result.verticalSpeed / 15);
    if (result.delivered) {
      audio.playSplash(vyIntensity);
      audio.playDeliveryJingle(result.grade);
    } else if (result.reason.includes('ditched') || result.reason.includes('hull gave out')) {
      audio.playSplash(Math.max(0.6, vyIntensity));
      audio.playCrashThud();
    } else if (result.reason.startsWith('struck')) {
      audio.playCrashThud();
    }
  }

  function finishFlightIfNeeded() {
    if (!flight || flightRecorded) return;
    if (flight.phase !== PHASE_LANDED && flight.phase !== PHASE_CRASHED) return;
    flightRecorded = true;
    audio.stopEngine();
    playLandingSound(flight.result);
    const routeForRecord = flight.route;
    const { unlocked, award } = recordFlightResult(ui.campaign, routeForRecord, flight.result);
    if (award) Object.assign(flight.result, award);
    queueAchievementToasts(unlocked);
    if (routeForRecord.isEndless) endlessRun = flight.result.delivered ? endlessRun + 1 : 0;
    announce(flight.result.delivered ? `Delivered. +${flight.result.awardedScore} credits.` : `Flight lost: ${flight.result.reason}.`);
  }

  function proceedAfterFlight() {
    const route = flight.route;
    if (route.isEndless && flight.result.delivered) {
      const nextRoute = createEndlessLeg(endlessRun, rollWeather);
      launchFlight(nextRoute, null);
      return;
    }
    goHarbor();
  }

  function handleConfirm() {
    if (screen === SCREEN_TITLE) {
      goHarbor();
    } else if (screen === SCREEN_BRIEFING) {
      launchFlight(ui.briefRoute, ui.briefContract);
    } else if (screen === SCREEN_FLIGHT && flight && (flight.phase === PHASE_LANDED || flight.phase === PHASE_CRASHED)) {
      proceedAfterFlight();
    }
  }

  function handleClick(point) {
    if (screen === SCREEN_HARBOR) handleHarborClick(point);
    else if (screen === SCREEN_FLIGHT || screen === SCREEN_BRIEFING || screen === SCREEN_TITLE) handleConfirm();
  }

  function stepFrame(dt) {
    blinkClock += dt;
    if (currentToast) {
      currentToast.age += dt;
      if (currentToast.age > 3.8) currentToast = toastQueue.length > 0 ? { achievement: toastQueue.shift(), age: 0 } : null;
    } else if (toastQueue.length > 0) {
      currentToast = { achievement: toastQueue.shift(), age: 0 };
    }

    if (screen !== SCREEN_FLIGHT || !flight) return;
    if (flight.phase === PHASE_LANDED || flight.phase === PHASE_CRASHED) {
      popupAge += dt;
      return;
    }
    const controls = input.flightControls();
    stepFlight(flight, controls, dt);
    const aircraft = flight.aircraft;
    audio.updateEngine(aircraft.throttle, aircraft.stalled);
    const fuelFrac = aircraft.fuel / aircraft.stats.fuelCapacity;
    const warning = aircraft.stalled || fuelFrac < FLIGHT.criticalFuelFraction || fuelFrac < FLIGHT.lowFuelFraction;
    warningBeepTimer -= dt;
    if (warning && warningBeepTimer <= 0) {
      audio.playWarningBeep();
      warningBeepTimer = 1.6;
    } else if (!warning) {
      warningBeepTimer = 0;
    }
    finishFlightIfNeeded();
  }

  function splashIntensity() {
    if (!flight) return 0;
    const a = flight.aircraft;
    if (a.altitude > 3) return 0;
    return Math.min(1, a.speed / a.stats.maxSpeed) * (flight.phase === 'taxi' ? 0.7 : 1);
  }

  function weatherStrengthNow() {
    return flight ? flightWeatherStrength(flight) : 0;
  }

  function frameState() {
    if (screen === SCREEN_FLIGHT && flight) {
      return {
        screen,
        scene: {
          flight,
          blink: Math.floor(blinkClock * 3) % 2 === 0,
          splash: splashIntensity(),
          popupAge,
          toast: currentToast,
          lightning: flight.weather.kind === 'storm' && weatherStrengthNow() > 0.4 && Math.random() < 0.02,
          weatherStrength: weatherStrengthNow(),
          combo: ui.campaign.combo,
          comboMultiplier: comboMultiplier(ui.campaign.combo),
          muted: audio.isMuted(),
        },
      };
    }
    if (screen === SCREEN_BRIEFING) return { screen, ui: { route: ui.briefRoute, contract: ui.briefContract, campaign: ui.campaign } };
    if (screen === SCREEN_HARBOR) return { screen, ui };
    return { screen, campaign: ui.campaign };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += dt;
    if (input.takeConfirm()) handleConfirm();
    if (input.takeMuteToggle()) audio.toggleMute();
    const clickedPoint = input.takeClick();
    if (clickedPoint) handleClick(clickedPoint);
    while (accumulator >= STEP) {
      stepFrame(STEP);
      accumulator -= STEP;
    }
    renderer.draw(frameState());
  }

  let last = performance.now();
  let accumulator = 0;
  announceScreen(screen);
  requestAnimationFrame(frame);
  window.__tidewingDebug = () => ({
    screen,
    flight: flight ? { phase: flight.phase, x: flight.aircraft.x, altitude: flight.aircraft.altitude, speed: flight.aircraft.speed, vy: flight.aircraft.vy, distance: flight.route.distance, weather: flight.weather.kind, hazards: flight.route.hazards, result: flight.result } : null,
    cleared: [...ui.campaign.clearedRoutes],
    money: ui.campaign.money,
    achievements: [...ui.campaign.unlockedAchievements],
  });
}

if (shotName) runShot(shotName);
else runGame();
