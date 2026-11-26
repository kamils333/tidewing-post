// The instrument panel: altitude and airspeed tapes, the heading compass, the fuel and cargo
// readouts, the warning banner and the delivery score popup. Every function here only draws; the
// numbers it draws come from flight.js and campaign.js.
import { FIELD, PALETTE, FONT, FLIGHT } from './config.js';

const TAPE = { width: 86, height: 320, top: 190 };

function panelRect(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function label(ctx, text, x, y, size, color, align) {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

/** A vertical tape gauge: the current value centred, ticks every `step`, newest-reads-up. */
function drawTape(ctx, x, value, step, digits, title, danger, flip) {
  panelRect(ctx, x, TAPE.top, TAPE.width, TAPE.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, TAPE.top, TAPE.width, TAPE.height);
  ctx.clip();
  const centreY = TAPE.top + TAPE.height / 2;
  const pxPerUnit = 2.1;
  const base = Math.floor(value / step) * step;
  for (let i = -6; i <= 6; i += 1) {
    const tickValue = base + i * step;
    const dir = flip ? -1 : 1;
    const ty = centreY + dir * (tickValue - value) * pxPerUnit;
    if (ty < TAPE.top - 10 || ty > TAPE.top + TAPE.height + 10) continue;
    ctx.strokeStyle = PALETTE.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, ty);
    ctx.lineTo(x + (tickValue % (step * 2) === 0 ? 30 : 20), ty);
    ctx.stroke();
    if (tickValue % (step * 2) === 0) label(ctx, String(Math.round(tickValue)), x + 36, ty + 5, 15, PALETTE.muted, 'left');
  }
  ctx.restore();
  const readoutColor = danger ? PALETTE.warn : PALETTE.good;
  ctx.fillStyle = readoutColor;
  ctx.fillRect(x - 6, centreY - 15, TAPE.width + 6, 30);
  label(ctx, Math.round(value).toFixed(digits), x + TAPE.width / 2, centreY + 6, 20, '#1a1410', 'center');
  label(ctx, title, x + TAPE.width / 2, TAPE.top - 10, 15, PALETTE.muted, 'center');
}

export function drawAltitudeTape(ctx, altitude, hazardNear) {
  drawTape(ctx, FIELD.width - 110, altitude, 20, 0, 'ALT m', hazardNear, true);
}

export function drawAirspeedTape(ctx, speed, stalled) {
  drawTape(ctx, 24, speed, 10, 0, 'SPD m/s', stalled, true);
}

export function drawHeadingTape(ctx, baseHeading, deviation, dangerDeg) {
  const width = 420;
  const x = FIELD.width / 2 - width / 2;
  panelRect(ctx, x, 20, width, 54);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, 20, width, 54);
  ctx.clip();
  const heading = ((baseHeading + deviation) % 360 + 360) % 360;
  const centreX = x + width / 2;
  const pxPerDeg = 3.6;
  for (let d = -40; d <= 40; d += 10) {
    const deg = (Math.round(heading / 10) * 10 + d + 360) % 360;
    const dx = centreX + (deg - heading <= -180 ? deg - heading + 360 : deg - heading >= 180 ? deg - heading - 360 : deg - heading) * pxPerDeg;
    ctx.strokeStyle = PALETTE.muted;
    ctx.beginPath();
    ctx.moveTo(dx, 46);
    ctx.lineTo(dx, 58);
    ctx.stroke();
    label(ctx, String(deg).padStart(3, '0'), dx, 40, 14, PALETTE.muted, 'center');
  }
  ctx.restore();
  const danger = Math.abs(deviation) > dangerDeg;
  ctx.fillStyle = danger ? PALETTE.warn : PALETTE.good;
  ctx.beginPath();
  ctx.moveTo(centreX - 10, 20);
  ctx.lineTo(centreX + 10, 20);
  ctx.lineTo(centreX, 34);
  ctx.closePath();
  ctx.fill();
  label(ctx, `HDG ${String(Math.round(heading)).padStart(3, '0')}`, centreX, 68, 15, PALETTE.muted, 'center');
}

export function drawFuelGauge(ctx, fraction) {
  const x = 24;
  const y = 530;
  const width = 200;
  const height = 26;
  panelRect(ctx, x, y, width, height + 20);
  const danger = fraction < FLIGHT.criticalFuelFraction;
  const warn = fraction < FLIGHT.lowFuelFraction;
  ctx.fillStyle = danger ? PALETTE.warn : warn ? '#e3b655' : PALETTE.good;
  ctx.fillRect(x + 8, y + 6, Math.max(2, (width - 16) * Math.max(0, fraction)), height - 12);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect(x + 8, y + 6, width - 16, height - 12);
  label(ctx, `FUEL ${Math.round(fraction * 100)}%`, x + 8, y + height + 16, 15, PALETTE.muted, 'left');
}

export function drawCargoReadout(ctx, kg, fragile) {
  const x = FIELD.width - 230;
  const y = 530;
  panelRect(ctx, x, y, 206, 46);
  label(ctx, `CARGO ${kg} kg${fragile ? ' - FRAGILE' : ''}`, x + 12, y + 29, 16, fragile ? PALETTE.ring : PALETTE.text, 'left');
}

export function drawWarningBanner(ctx, text, blinkOn) {
  if (!blinkOn) return;
  const width = 360;
  const x = FIELD.width / 2 - width / 2;
  ctx.fillStyle = 'rgba(255, 90, 76, 0.88)';
  ctx.fillRect(x, 110, width, 40);
  label(ctx, text, FIELD.width / 2, 137, 20, '#1a1410', 'center');
}

export function drawDestinationBanner(ctx, islandName, distanceLeft) {
  const text = distanceLeft > 0 ? `${islandName} - ${Math.round(distanceLeft)} m` : islandName;
  const width = 280;
  const x = FIELD.width / 2 - width / 2;
  ctx.fillStyle = 'rgba(20, 16, 28, 0.6)';
  ctx.fillRect(x, 80, width, 26);
  label(ctx, text, FIELD.width / 2, 98, 14, PALETTE.ring, 'center');
}

const GRADE_LABEL = { perfect: 'PERFECT!', smooth: 'SMOOTH', rough: 'ROUGH' };
const GRADE_COLOR = { perfect: '#ffd27a', smooth: '#8fe3a0', rough: '#e3b655' };

export function drawScorePopup(ctx, debrief, age) {
  const alpha = Math.max(0, 1 - age / 2.6);
  if (alpha <= 0) return;
  const rise = Math.min(40, age * 30);
  ctx.save();
  ctx.globalAlpha = alpha;
  const title = debrief.delivered ? GRADE_LABEL[debrief.grade] : 'FLIGHT LOST';
  const color = debrief.delivered ? GRADE_COLOR[debrief.grade] : PALETTE.warn;
  const scalePop = debrief.grade === 'perfect' ? 1 + Math.max(0, 0.25 - age) : 1;
  ctx.save();
  ctx.translate(FIELD.width / 2, 250 - rise);
  ctx.scale(scalePop, scalePop);
  label(ctx, title, 0, 0, 44, color, 'center');
  ctx.restore();
  if (debrief.delivered) {
    label(ctx, `+${debrief.awardedScore ?? debrief.score} credits`, FIELD.width / 2, 300 - rise, 26, PALETTE.text, 'center');
    let nextY = 332 - rise;
    if (debrief.multiplier > 1) {
      label(ctx, `x${debrief.multiplier.toFixed(2)} combo - streak ${debrief.combo}`, FIELD.width / 2, nextY, 18, PALETTE.ring, 'center');
      nextY += 24;
    }
    if (debrief.fragile && debrief.cargoBroken) label(ctx, 'Cargo rattled apart', FIELD.width / 2, nextY, 18, PALETTE.warn, 'center');
  } else {
    label(ctx, debrief.reason, FIELD.width / 2, 300 - rise, 20, PALETTE.muted, 'center');
    label(ctx, 'Combo streak lost', FIELD.width / 2, 328 - rise, 16, PALETTE.muted, 'center');
  }
  ctx.restore();
}

export function drawMuteIndicator(ctx, muted) {
  if (!muted) return;
  label(ctx, 'SOUND MUTED (M)', FIELD.width - 24, FIELD.height - 10, 13, PALETTE.muted, 'right');
}

export function drawComboBadge(ctx, combo, multiplier) {
  if (combo <= 0) return;
  const x = 1000;
  const y = 20;
  panelRect(ctx, x, y, 210, 46);
  label(ctx, `COMBO x${combo}`, x + 12, y + 20, 16, PALETTE.ring, 'left');
  label(ctx, `${multiplier.toFixed(2)}x score`, x + 12, y + 38, 13, PALETTE.muted, 'left');
}

export function drawAchievementToast(ctx, achievement, age) {
  const alpha = age < 0.3 ? age / 0.3 : Math.max(0, 1 - (age - 3.2) / 0.6);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const width = 360;
  const x = FIELD.width - width - 24;
  const y = 130;
  panelRect(ctx, x, y, width, 60);
  label(ctx, 'FEAT EARNED', x + 16, y + 22, 13, PALETTE.ring, 'left');
  label(ctx, achievement.name, x + 16, y + 44, 19, PALETTE.text, 'left');
  ctx.restore();
}
