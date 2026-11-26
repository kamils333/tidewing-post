// Every pixel on screen. World state (from flight.js) and campaign state (from campaign.js) in,
// a frame out; nothing here changes either. The flight scene uses a fixed camera: the Halcyon
// sits still on screen and the sea, sky and islands move past it, so altitude and speed read as
// how far the horizon and the water are, not as the plane sliding around the canvas.
import { FIELD, PALETTE, FONT, TITLE, SUBTITLE, AIRCRAFT_BASE } from './config.js';
import { ROUTES, ISLANDS, HOME, findIsland } from './geo.js';
import { NPCS } from './npcs.js';
import { contractsForRoute } from './contracts.js';
import { UPGRADES } from './upgrades.js';
import { ACHIEVEMENTS } from './achievements.js';
import { KIND_CROSSWIND, KIND_FOG, KIND_STORM } from './weather.js';
import {
  drawAltitudeTape,
  drawAirspeedTape,
  drawHeadingTape,
  drawFuelGauge,
  drawCargoReadout,
  drawWarningBanner,
  drawDestinationBanner,
  drawScorePopup,
  drawAchievementToast,
  drawComboBadge,
  drawMuteIndicator,
} from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_HARBOR = 'harbor';
export const SCREEN_BRIEFING = 'briefing';
export const SCREEN_FLIGHT = 'flight';
export const SCREEN_DEBRIEF = 'debrief';

const PLANE_SCREEN_X = FIELD.width * 0.34;
const SEA_SCREEN_Y = 534;

/** Click targets on the harbour board; input.js hit-tests against the same numbers this draws. */
export const HARBOR_LAYOUT = {
  routes: { x: 56, yStart: 128, rowH: 36, width: 420 },
  contracts: { x: 484, yStart: 126, rowH: 92, width: 420 },
  shop: { x: 930, yStart: 112, rowH: 34, width: 280 },
  map: { x: 56, y: 468, width: 1154, height: 148 },
  flyButton: { x: 940, y: FIELD.height - 70, width: 180, height: 40 },
};

export const MAP_MARKER_RADIUS = 15;

/** Where a point normalised 0..1 (an island or HOME's `map`) lands inside the chart panel. */
export function mapScreenPoint(point) {
  const m = HARBOR_LAYOUT.map;
  return { x: m.x + point.x * m.width, y: m.y + point.y * m.height };
}

function hashTile(i) {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    ctx.font = `${weight ?? ''} ${size}px ${FONT}`.trim();
    ctx.fillStyle = color;
    ctx.textAlign = align ?? 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  // ---- sky, sea and the islands sliding past --------------------------------------------------

  function drawSky(night) {
    const grad = ctx.createLinearGradient(0, 0, 0, SEA_SCREEN_Y);
    if (night) {
      grad.addColorStop(0, '#060814');
      grad.addColorStop(0.55, '#141032');
      grad.addColorStop(1, '#33264a');
    } else {
      grad.addColorStop(0, PALETTE.duskTop);
      grad.addColorStop(0.45, PALETTE.duskUpper);
      grad.addColorStop(0.8, PALETTE.duskLower);
      grad.addColorStop(1, PALETTE.duskHorizon);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, SEA_SCREEN_Y);
    if (night) {
      for (let i = 0; i < 46; i += 1) {
        const sx = (i * 173) % FIELD.width;
        const sy = 20 + ((i * 97) % 300);
        ctx.fillStyle = `rgba(255,255,255,${0.3 + hashTile(i) * 0.5})`;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.fillStyle = 'rgba(230,230,245,0.9)';
      ctx.beginPath();
      ctx.arc(FIELD.width - 160, 110, 36, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255, 221, 150, 0.9)';
      ctx.beginPath();
      ctx.arc(FIELD.width * 0.72, SEA_SCREEN_Y - 6, 46, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFarIslands(x) {
    for (let i = -1; i < 8; i += 1) {
      const spacing = 420;
      const tileIndex = Math.floor(x / spacing) + i;
      const wobble = hashTile(tileIndex);
      const screenX = PLANE_SCREEN_X - 900 + ((tileIndex * spacing - x) * 0.35) + wobble * 40;
      if (screenX < -200 || screenX > FIELD.width + 200) continue;
      const h = 30 + wobble * 50;
      const w = 90 + wobble * 70;
      ctx.fillStyle = PALETTE.islandFar;
      ctx.beginPath();
      ctx.moveTo(screenX, SEA_SCREEN_Y);
      ctx.quadraticCurveTo(screenX + w * 0.3, SEA_SCREEN_Y - h, screenX + w * 0.5, SEA_SCREEN_Y - h * 0.9);
      ctx.quadraticCurveTo(screenX + w * 0.75, SEA_SCREEN_Y - h * 0.5, screenX + w, SEA_SCREEN_Y);
      ctx.closePath();
      ctx.fill();
      // A hut or two on every third isle, so the chain reads as lived-in, not just scenery.
      if (tileIndex % 3 === 0) {
        const hutX = screenX + w * 0.4;
        const hutY = SEA_SCREEN_Y - h * 0.62;
        ctx.fillStyle = PALETTE.hullShade;
        ctx.fillRect(hutX, hutY, 10, 8);
        ctx.fillStyle = PALETTE.hull;
        ctx.beginPath();
        ctx.moveTo(hutX - 2, hutY);
        ctx.lineTo(hutX + 5, hutY - 6);
        ctx.lineTo(hutX + 12, hutY);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawClouds(x) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 244, 232, 0.8)';
    for (let i = -1; i < 8; i += 1) {
      const spacing = 900;
      const tileIndex = Math.floor(x / spacing) + i;
      const wobble = hashTile(tileIndex + 97);
      const screenX = PLANE_SCREEN_X - 700 + (tileIndex * spacing - x) * 0.2 + wobble * 120;
      if (screenX < -220 || screenX > FIELD.width + 220) continue;
      const cy = 60 + wobble * 170;
      const scale = 0.9 + wobble * 0.9;
      for (const [dx, dy, r] of [[0, 0, 26], [22, -8, 20], [-24, -4, 18], [10, 8, 22], [-10, 10, 16]]) {
        ctx.beginPath();
        ctx.ellipse(screenX + dx * scale, cy + dy * scale, r * scale, r * scale * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBirds(x) {
    ctx.strokeStyle = 'rgba(40, 30, 50, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const spacing = 340;
      const tileIndex = Math.floor(x / spacing) + i;
      const wobble = hashTile(tileIndex + 211);
      if (wobble > 0.6) continue;
      const screenX = PLANE_SCREEN_X - 500 + ((tileIndex * spacing - x) * 0.5);
      if (screenX < -40 || screenX > FIELD.width + 40) continue;
      const by = 150 + wobble * 220;
      const flap = Math.sin(performance.now() / 260 + tileIndex) * 5;
      ctx.beginPath();
      ctx.moveTo(screenX - 10, by - flap);
      ctx.quadraticCurveTo(screenX, by + 4, screenX + 10, by - flap);
      ctx.stroke();
    }
  }

  function drawSea(x) {
    const grad = ctx.createLinearGradient(0, SEA_SCREEN_Y, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.seaFar);
    grad.addColorStop(1, PALETTE.sea);
    ctx.fillStyle = grad;
    ctx.fillRect(0, SEA_SCREEN_Y, FIELD.width, FIELD.height - SEA_SCREEN_Y);
    ctx.strokeStyle = 'rgba(255, 235, 200, 0.18)';
    ctx.lineWidth = 2;
    for (let band = 0; band < 5; band += 1) {
      const speed = 0.4 + band * 0.22;
      const y = SEA_SCREEN_Y + 18 + band * 34;
      const offset = (x * speed) % 160;
      ctx.beginPath();
      for (let sx = -160 + offset; sx < FIELD.width + 160; sx += 160) {
        ctx.moveTo(sx, y);
        ctx.quadraticCurveTo(sx + 40, y - 6, sx + 80, y);
        ctx.quadraticCurveTo(sx + 120, y + 6, sx + 160, y);
      }
      ctx.stroke();
    }
  }

  /** Each isle's own silhouette behind its dock, so the world is more than six blank docks. */
  function drawIslandLandmark(profile, x, baseY) {
    const spin = performance.now() / 1000;
    if (profile === 'reef') {
      // Thornback Shoal: Sera's lighthouse, with a beam that sweeps past the dock.
      ctx.fillStyle = PALETTE.hull;
      ctx.fillRect(x + 54, baseY - 54, 10, 48);
      ctx.fillStyle = PALETTE.livery;
      ctx.fillRect(x + 54, baseY - 54, 10, 10);
      ctx.fillRect(x + 54, baseY - 34, 10, 10);
      ctx.fillStyle = PALETTE.cabinGlow;
      ctx.beginPath();
      ctx.arc(x + 59, baseY - 58, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(x + 59, baseY - 58);
      ctx.rotate(Math.sin(spin * 0.6) * 0.9);
      const beam = ctx.createLinearGradient(0, 0, 70, 0);
      beam.addColorStop(0, 'rgba(255, 221, 150, 0.45)');
      beam.addColorStop(1, 'rgba(255, 221, 150, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(70, -14);
      ctx.lineTo(70, 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (profile === 'ridge') {
      // Windlass Point: Dez's windmill, blades always turning.
      ctx.fillStyle = PALETTE.hullShade;
      ctx.fillRect(x + 56, baseY - 44, 8, 40);
      ctx.save();
      ctx.translate(x + 60, baseY - 44);
      ctx.rotate(spin * 1.6);
      ctx.strokeStyle = PALETTE.hull;
      ctx.lineWidth = 4;
      for (let blade = 0; blade < 4; blade += 1) {
        const a = (blade * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
        ctx.stroke();
      }
      ctx.restore();
    } else if (profile === 'lagoon') {
      // Kelp Hollow: Benno's drying racks, strands hanging to cure in the wind.
      ctx.strokeStyle = PALETTE.hullShade;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 50, baseY - 30);
      ctx.lineTo(x + 92, baseY - 30);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.good;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        const sx = x + 56 + i * 10;
        ctx.beginPath();
        ctx.moveTo(sx, baseY - 30);
        ctx.quadraticCurveTo(sx + 3, baseY - 16, sx, baseY - 4);
        ctx.stroke();
      }
    } else if (profile === 'volcanic') {
      // Ashfall Rock: Nat's mine mouth, a steady wisp of ash smoke.
      ctx.fillStyle = PALETTE.islandNear;
      ctx.beginPath();
      ctx.arc(x + 60, baseY - 8, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(180, 176, 170, 0.5)';
      for (let i = 0; i < 3; i += 1) {
        const puff = (spin * 10 + i * 7) % 24;
        ctx.beginPath();
        ctx.arc(x + 60 + Math.sin(spin + i) * 4, baseY - 22 - puff, 5 + puff * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Driftwood Cay and Last Light Atoll: a lamp post and a low hut, the common dockside mark.
      ctx.fillStyle = PALETTE.hull;
      ctx.fillRect(x + 56, baseY - 26, 18, 18);
      ctx.fillStyle = PALETTE.hullShade;
      ctx.beginPath();
      ctx.moveTo(x + 52, baseY - 26);
      ctx.lineTo(x + 65, baseY - 36);
      ctx.lineTo(x + 78, baseY - 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.cabinGlow;
      ctx.beginPath();
      ctx.arc(x + 60, baseY - 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDestination(route, island, distanceLeft, visibleRange) {
    if (!island || distanceLeft > visibleRange) return 0;
    const t = Math.max(0, Math.min(1, distanceLeft / visibleRange));
    const screenX = PLANE_SCREEN_X + 220 + t * (FIELD.width - PLANE_SCREEN_X - 260);
    const fade = Math.min(1, (visibleRange - distanceLeft) / (visibleRange * 0.3));
    ctx.save();
    ctx.globalAlpha = Math.max(0.15, fade);
    ctx.fillStyle = PALETTE.islandNear;
    ctx.beginPath();
    ctx.moveTo(screenX - 70, SEA_SCREEN_Y);
    ctx.quadraticCurveTo(screenX - 20, SEA_SCREEN_Y - 92, screenX + 10, SEA_SCREEN_Y - 78);
    ctx.quadraticCurveTo(screenX + 55, SEA_SCREEN_Y - 40, screenX + 90, SEA_SCREEN_Y);
    ctx.closePath();
    ctx.fill();
    // The dock: a short pier reaching into the water, with the island's own landmark behind it.
    ctx.fillStyle = PALETTE.hullShade;
    ctx.fillRect(screenX - 10, SEA_SCREEN_Y - 4, 70, 8);
    drawIslandLandmark(island.profile, screenX, SEA_SCREEN_Y);
    if (distanceLeft < visibleRange * 0.55) {
      const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 220);
      ctx.strokeStyle = `rgba(255, 210, 122, ${0.5 + pulse * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(screenX + 15, SEA_SCREEN_Y - 6, 46 + pulse * 6, 16 + pulse * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return screenX;
  }

  function drawHazardMarker(label, visible) {
    if (!visible) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 107, 94, 0.22)';
    ctx.fillRect(0, SEA_SCREEN_Y - 6, FIELD.width, 14);
    text(`CAUTION: ${label.toUpperCase()}`, FIELD.width / 2, SEA_SCREEN_Y - 14, 15, PALETTE.warn, 'center', 'bold');
    ctx.restore();
  }

  // ---- the aircraft itself ----------------------------------------------------------------------

  function drawAircraftSprite(screenY, pitchDeg, throttle, splash) {
    ctx.save();
    ctx.translate(PLANE_SCREEN_X, screenY);
    ctx.rotate((-pitchDeg * Math.PI) / 180);
    // Float, below and behind the hull.
    ctx.fillStyle = PALETTE.float;
    ctx.beginPath();
    ctx.ellipse(-4, 30, 58, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-8, 8, 6, 22);
    ctx.fillRect(28, 8, 6, 22);
    // Tail boom and fin, in the livery colour so the tail reads from a distance.
    ctx.fillStyle = PALETTE.hullShade;
    ctx.beginPath();
    ctx.moveTo(-54, 2);
    ctx.lineTo(-30, -6);
    ctx.lineTo(-30, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.livery;
    ctx.fillRect(-58, -26, 8, 24);
    ctx.fillStyle = PALETTE.cabinGlow;
    ctx.beginPath();
    ctx.arc(-54, -16, 3, 0, Math.PI * 2);
    ctx.fill();
    // Fuselage.
    ctx.fillStyle = PALETTE.hull;
    ctx.beginPath();
    ctx.moveTo(-34, 4);
    ctx.quadraticCurveTo(10, -22, 58, -4);
    ctx.quadraticCurveTo(44, 10, -34, 12);
    ctx.closePath();
    ctx.fill();
    // The livery stripe runs the hull's length, Tidewing Post's rust-red on cream.
    ctx.fillStyle = PALETTE.livery;
    ctx.beginPath();
    ctx.moveTo(-32, 5);
    ctx.quadraticCurveTo(10, -10, 52, 0);
    ctx.lineTo(52, 4);
    ctx.quadraticCurveTo(10, -6, -32, 9);
    ctx.closePath();
    ctx.fill();
    // Three round cabin windows, each lit from inside.
    ctx.fillStyle = PALETTE.windowFrame;
    for (const wx of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.arc(wx, -10, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.cabinGlow;
    for (const wx of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.arc(wx, -10, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wing, high enough to read as a parasol wing above the hull, with a dark anti-glare stripe.
    ctx.fillStyle = PALETTE.hullShade;
    ctx.fillRect(-46, -30, 96, 8);
    ctx.fillStyle = PALETTE.liveryDark;
    ctx.fillRect(-46, -30, 96, 3);
    ctx.fillStyle = PALETTE.hullShade;
    ctx.fillRect(-4, -24, 6, 10);
    // Engine cowl and a spinning prop disc (a faint blurred ellipse at speed, spokes when slow).
    ctx.fillStyle = PALETTE.engine;
    ctx.beginPath();
    ctx.ellipse(56, -2, 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    const spin = (performance.now() / 1000) * (4 + throttle * 26);
    if (throttle > 0.08) {
      ctx.strokeStyle = 'rgba(230, 230, 230, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(70, -2, 3, 15, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#d8d8d8';
      ctx.lineWidth = 2;
      for (let blade = 0; blade < 2; blade += 1) {
        const a = spin + blade * Math.PI;
        ctx.beginPath();
        ctx.moveTo(70, -2);
        ctx.lineTo(70 + Math.cos(a) * 16, -2 + Math.sin(a) * 16);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (splash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, splash);
      ctx.fillStyle = PALETTE.seaFoam;
      const spread = 30 + splash * 50;
      for (let i = 0; i < 7; i += 1) {
        const dx = (i - 3) * (spread / 6);
        const h = 10 + Math.abs(Math.sin(i * 1.7 + performance.now() / 90)) * 18 * splash;
        ctx.beginPath();
        ctx.ellipse(PLANE_SCREEN_X - 10 + dx, SEA_SCREEN_Y - h * 0.4, 7, h, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---- weather dressing ---------------------------------------------------------------------

  function drawWeatherOverlay(kind, strength, windSign) {
    if (strength <= 0) return;
    ctx.save();
    if (kind === KIND_FOG) {
      const grad = ctx.createRadialGradient(PLANE_SCREEN_X, SEA_SCREEN_Y - 120, 60, PLANE_SCREEN_X, SEA_SCREEN_Y - 120, 560);
      grad.addColorStop(0, `rgba(210, 214, 220, 0)`);
      grad.addColorStop(1, `rgba(210, 214, 220, ${0.55 + strength * 0.4})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    } else if (kind === KIND_STORM) {
      ctx.fillStyle = `rgba(8, 10, 16, ${0.22 + strength * 0.48})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.strokeStyle = `rgba(205, 218, 232, ${0.5 * strength})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 140 * strength; i += 1) {
        const rx = (i * 61 + performance.now() * 0.5) % (FIELD.width + 80);
        const ry = (i * 43 + performance.now() * 0.85) % FIELD.height;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 18, ry + 34);
        ctx.stroke();
      }
    } else if (kind === KIND_CROSSWIND) {
      ctx.strokeStyle = `rgba(230, 236, 230, ${0.25 * strength})`;
      ctx.lineWidth = 2;
      const phase = (performance.now() / 6) * (windSign >= 0 ? 1 : -1);
      for (let i = 0; i < 10; i += 1) {
        const y = 60 + i * 60;
        const offset = (phase % (FIELD.width + 120) + FIELD.width + 120) % (FIELD.width + 120);
        ctx.beginPath();
        ctx.moveTo(offset - 120, y);
        ctx.lineTo(offset - 60, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawLightning(on) {
    if (!on) return;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  // ---- the flight screen ---------------------------------------------------------------------

  function drawFlightScene(scene) {
    const { flight, blink, splash, popupAge, toast, lightning } = scene;
    const aircraft = flight.aircraft;
    const stats = aircraft.stats;
    const route = flight.route;
    const island = findIsland(route.island);
    const night = Boolean(route.isFinale);
    const visibleRange = (stats.visibilityBase ?? AIRCRAFT_BASE.visibilityBase) * (flight.weather.kind === 'fog' ? 0.42 : 1);

    drawSky(night);
    if (!night) drawClouds(aircraft.x);
    drawBirds(aircraft.x);
    drawFarIslands(aircraft.x);
    const displayAlt = Math.min(aircraft.altitude, 260) + Math.max(0, aircraft.altitude - 260) * 0.15;
    const horizonShift = Math.min(70, displayAlt * 0.2);
    ctx.save();
    ctx.translate(0, -horizonShift);
    drawSea(aircraft.x);
    const distanceLeft = route.distance - aircraft.x;
    drawDestination(route, island, distanceLeft, visibleRange);
    drawHazardMarker(flight.hazardLabel, Boolean(flight.hazardLabel));
    ctx.restore();

    const screenY = SEA_SCREEN_Y - horizonShift - displayAlt;
    drawAircraftSprite(screenY, aircraft.pitchDeg, aircraft.throttle, splash);
    drawWeatherOverlay(flight.weather.kind, scene.weatherStrength, flight.windSign);
    drawLightning(lightning);

    drawAltitudeTape(ctx, aircraft.altitude, Boolean(flight.hazardLabel));
    drawAirspeedTape(ctx, aircraft.speed, aircraft.stalled);
    drawHeadingTape(ctx, route.heading, aircraft.courseDeviation, 26);
    drawFuelGauge(ctx, aircraft.fuel / stats.fuelCapacity);
    drawCargoReadout(ctx, aircraft.cargoKg, flight.contract ? flight.contract.fragile : false);
    drawComboBadge(ctx, scene.combo ?? 0, scene.comboMultiplier ?? 1);
    drawMuteIndicator(ctx, Boolean(scene.muted));
    if (island) drawDestinationBanner(ctx, island.name, Math.max(0, distanceLeft));

    if (aircraft.stalled && blink) drawWarningBanner(ctx, 'STALL - NOSE DOWN', true);
    else if (aircraft.fuel / stats.fuelCapacity < 0.08 && blink) drawWarningBanner(ctx, 'FUEL CRITICAL', true);
    else if (aircraft.fuel / stats.fuelCapacity < 0.22 && blink) drawWarningBanner(ctx, 'LOW FUEL', true);

    if (flight.phase === 'landed' || flight.phase === 'crashed') drawScorePopup(ctx, flight.result, popupAge);
    if (toast) drawAchievementToast(ctx, toast.achievement, toast.age);

    if (night) {
      text('THE LONG NIGHT RUN', FIELD.width / 2, 170, 20, PALETTE.ring, 'center', 'bold');
    }
  }

  // ---- title, harbor and briefing screens ----------------------------------------------------

  function drawTitleScreen(campaign) {
    drawSky(false);
    drawClouds(performance.now() / 40);
    drawBirds(performance.now() / 40);
    drawFarIslands(performance.now() / 40);
    drawSea(performance.now() / 40);
    text(TITLE, FIELD.width / 2, 300, 64, PALETTE.text, 'center', 'bold');
    text(SUBTITLE, FIELD.width / 2, 340, 22, PALETTE.ring, 'center');
    const lines = [
      'Climb with W/Up, dive with S/Down.',
      'Steer with A/D or Left/Right against the wind.',
      'Throttle up with E, back with Q. Mute the engine and the rest with M.',
      '',
      `${campaign.totals.deliveries} deliveries flown - ${campaign.unlockedAchievements.size}/${ACHIEVEMENTS.length} feats earned`,
    ];
    lines.forEach((line, i) => text(line, FIELD.width / 2, 420 + i * 30, 18, PALETTE.muted, 'center'));
    text('Click or press Space to open the harbour board', FIELD.width / 2, 620, 22, PALETTE.ring, 'center');
  }

  function routeStatusLabel(route, campaign) {
    if (route.isEndless) return campaign.clearedRoutes.has('finale') ? 'OPEN' : 'LOCKED';
    if (campaign.clearedRoutes.has(route.id)) return 'CLEARED';
    const unlocked = route.unlockRequires === null || campaign.clearedRoutes.has(route.unlockRequires);
    return unlocked ? 'OPEN' : 'LOCKED';
  }

  function drawArchipelagoMap(campaign, selectedRouteId) {
    const m = HARBOR_LAYOUT.map;
    panel(m.x, m.y, m.width, m.height);
    text('THE AMBERREACH ISLES', m.x + 14, m.y + 20, 13, PALETTE.muted, 'left');

    ctx.save();
    ctx.beginPath();
    ctx.rect(m.x + 2, m.y + 2, m.width - 4, m.height - 4);
    ctx.clip();

    const home = mapScreenPoint(HOME.map);
    const time = performance.now();

    for (const island of ISLANDS) {
      const route = ROUTES.find((r) => r.island === island.id && !r.isFinale);
      if (!route) continue;
      const point = mapScreenPoint(island.map);
      const status = routeStatusLabel(route, campaign);
      const selected = route.id === selectedRouteId;
      const lineColor = status === 'LOCKED' ? 'rgba(130, 120, 140, 0.35)' : status === 'CLEARED' ? 'rgba(143, 227, 160, 0.55)' : 'rgba(255, 210, 122, 0.6)';
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = selected ? 3 : 1.6;
      ctx.setLineDash(status === 'LOCKED' ? [5, 5] : []);
      ctx.beginPath();
      ctx.moveTo(home.x, home.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const island of ISLANDS) {
      const route = ROUTES.find((r) => r.island === island.id && !r.isFinale);
      if (!route) continue;
      const point = mapScreenPoint(island.map);
      const status = routeStatusLabel(route, campaign);
      const selected = route.id === selectedRouteId;
      const finaleHere = island.id === 'lastlight' && campaign.clearedRoutes.has('lastlight');

      if (selected) {
        const pulse = 0.5 + 0.5 * Math.sin(time / 200);
        ctx.strokeStyle = `rgba(255, 210, 122, ${0.5 + pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, MAP_MARKER_RADIUS + 5 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = status === 'LOCKED' ? PALETTE.islandFar : status === 'CLEARED' ? PALETTE.good : PALETTE.ring;
      ctx.beginPath();
      ctx.arc(point.x, point.y, MAP_MARKER_RADIUS * 0.5, 0, Math.PI * 2);
      ctx.fill();
      if (finaleHere) {
        ctx.fillStyle = PALETTE.cabinGlow;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - 16);
        ctx.lineTo(point.x + 4, point.y - 9);
        ctx.lineTo(point.x - 4, point.y - 9);
        ctx.closePath();
        ctx.fill();
      }
      const labelColor = status === 'LOCKED' ? PALETTE.muted : PALETTE.text;
      text(status === 'LOCKED' ? `[locked] ${island.name}` : island.name, point.x, point.y + 24, 12, labelColor, 'center');
    }

    ctx.fillStyle = PALETTE.ring;
    ctx.beginPath();
    ctx.arc(home.x, home.y, 5, 0, Math.PI * 2);
    ctx.fill();
    text('Saltmere', home.x, home.y - 10, 12, PALETTE.ring, 'center');
    ctx.restore();
  }

  function drawHarborScreen(ui) {
    const { campaign, selectedRouteId, selectedContractId, hoverUpgrade } = ui;
    const L = HARBOR_LAYOUT;
    drawSky(false);
    drawSea(80);
    panel(40, 30, FIELD.width - 80, FIELD.height - 60);
    text('SALTMERE HARBOR - TIDEWING POST DISPATCH', 64, 66, 24, PALETTE.text, 'left', 'bold');
    text(`${campaign.money} credits`, FIELD.width - 64, 66, 22, PALETTE.ring, 'right');

    // Routes column.
    text('ROUTES', L.routes.x, 108, 16, PALETTE.muted, 'left');
    ROUTES.forEach((route, i) => {
      const y = L.routes.yStart + i * L.routes.rowH;
      const status = routeStatusLabel(route, campaign);
      const selected = route.id === selectedRouteId;
      if (selected) {
        ctx.fillStyle = 'rgba(255, 210, 122, 0.14)';
        ctx.fillRect(L.routes.x, y - 22, L.routes.width, L.routes.rowH - 4);
      }
      const color = status === 'LOCKED' ? PALETTE.muted : status === 'CLEARED' ? PALETTE.good : PALETTE.text;
      text(`${status === 'LOCKED' ? '[locked] ' : status === 'CLEARED' ? '[done] ' : ''}${route.name}`, L.routes.x + 8, y, 17, color, 'left');
    });

    // Contract board for the selected route.
    text('MANIFEST', L.contracts.x, 108, 16, PALETTE.muted, 'left');
    const route = ROUTES.find((r) => r.id === selectedRouteId);
    const contracts = route && !route.isEndless ? contractsForRoute(route.id) : [];
    if (route && route.isEndless) {
      text('Night Mail Marathon: no manifest, just the next island in the dark.', L.contracts.x, 150, 16, PALETTE.muted, 'left');
      text(`Best run so far: ${campaign.totals.bestEndlessRun} deliveries`, L.contracts.x, 180, 16, PALETTE.text, 'left');
    } else {
      contracts.forEach((contract, i) => {
        const y = L.contracts.yStart + i * L.contracts.rowH;
        const npc = NPCS[contract.client];
        const selected = contract.id === selectedContractId;
        if (selected) {
          ctx.fillStyle = 'rgba(143, 227, 160, 0.12)';
          ctx.fillRect(L.contracts.x - 16, y - 24, L.contracts.width, L.contracts.rowH - 6);
        }
        const done = campaign.completedContracts.has(contract.id);
        text(`${contract.title}${done ? '  (flown)' : ''}`, L.contracts.x, y, 18, done ? PALETTE.good : PALETTE.text, 'left', 'bold');
        text(`${npc.name}, ${npc.role}`, L.contracts.x, y + 20, 13, PALETTE.muted, 'left');
        text(`"${done ? npc.returnLine : npc.line}"`, L.contracts.x, y + 38, 13, PALETTE.ring, 'left');
        text(`${contract.cargoKg} kg${contract.fragile ? ' - fragile' : ''}`, L.contracts.x, y + 56, 13, PALETTE.muted, 'left');
      });
    }

    // Hangar / upgrade shop.
    text('HANGAR', L.shop.x, 96, 16, PALETTE.muted, 'left');
    UPGRADES.forEach((upgrade, i) => {
      const y = L.shop.yStart + i * L.shop.rowH;
      const owned = campaign.ownedUpgrades.has(upgrade.id);
      const lockedBy = upgrade.requires && !campaign.ownedUpgrades.has(upgrade.requires);
      const hovered = hoverUpgrade === upgrade.id;
      if (hovered && !owned && !lockedBy) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(L.shop.x - 10, y - 20, L.shop.width, L.shop.rowH - 4);
      }
      const color = owned ? PALETTE.good : lockedBy ? PALETTE.muted : PALETTE.text;
      const mark = owned ? '[x]' : lockedBy ? '[-]' : `[${upgrade.cost}c]`;
      text(`${mark} ${upgrade.name}`, L.shop.x, y, 13, color, 'left');
    });

    // The Fly button, live only once a flight can actually launch.
    const canFly = Boolean(route) && (route.isEndless || Boolean(selectedContractId));
    ctx.fillStyle = canFly ? 'rgba(143, 227, 160, 0.85)' : 'rgba(90, 90, 100, 0.5)';
    ctx.fillRect(L.flyButton.x, L.flyButton.y, L.flyButton.width, L.flyButton.height);
    text('FLY', L.flyButton.x + L.flyButton.width / 2, L.flyButton.y + L.flyButton.height / 2 + 6, 20, '#1a1410', 'center', 'bold');

    drawArchipelagoMap(campaign, selectedRouteId);
    text('Click a route or an isle, then a contract, then Fly. Click a hangar row to fit it.', 64, FIELD.height - 26, 15, PALETTE.muted, 'left');
  }

  function drawBriefingScreen(ui) {
    const { route, contract, campaign } = ui;
    drawSky(Boolean(route.isFinale));
    drawSea(60);
    panel(FIELD.width / 2 - 360, 150, 720, 420);
    text(route.name, FIELD.width / 2, 210, 30, PALETTE.text, 'center', 'bold');
    if (contract) {
      const npc = NPCS[contract.client];
      const done = campaign.completedContracts.has(contract.id);
      text(contract.title, FIELD.width / 2, 260, 22, PALETTE.ring, 'center');
      text(contract.brief, FIELD.width / 2, 300, 16, PALETTE.muted, 'center');
      text(`${npc.name} - "${done ? npc.returnLine : npc.line}"`, FIELD.width / 2, 340, 16, PALETTE.text, 'center');
      text(`${contract.cargoKg} kg aboard${contract.fragile ? ', handle with care' : ''}`, FIELD.width / 2, 380, 16, PALETTE.muted, 'center');
    } else if (route.isEndless) {
      text('Every leg a little harder than the last. Land clean to keep the run alive.', FIELD.width / 2, 300, 16, PALETTE.muted, 'center');
    } else if (route.isFinale) {
      text('A storm over open water, and no daylight left to wait it out.', FIELD.width / 2, 300, 16, PALETTE.muted, 'center');
    }
    text('Press Space or click to take off', FIELD.width / 2, 520, 20, PALETTE.ring, 'center');
  }

  function draw(state) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#060814';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);

    if (state.screen === SCREEN_TITLE) drawTitleScreen(state.campaign);
    else if (state.screen === SCREEN_HARBOR) drawHarborScreen(state.ui);
    else if (state.screen === SCREEN_BRIEFING) drawBriefingScreen(state.ui);
    else if (state.screen === SCREEN_FLIGHT || state.screen === SCREEN_DEBRIEF) drawFlightScene(state.scene);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toCanvasPoint: (x, y) => ({ x: (x - view.x) / view.scale, y: (y - view.y) / view.scale }) };
}
