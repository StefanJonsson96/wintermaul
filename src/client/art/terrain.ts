import {
  BUILD_MAX_X,
  BUILD_MIN_X,
  GATE_MAX_Y,
  GATE_MIN_Y,
  LANE_GAP,
  LANE_H,
  LANE_MARGIN_X,
  LANE_W,
  laneOriginY,
  WORLD_W,
} from '../../shared/constants';
import { alpha, ellipse, fbm, glow, makeCanvas, outline, roundRect, seeded, shade, SP, valueNoise, type Ctx } from './util';

/** Terrain resolution (pixels per cell). */
export const TP = 32;

const noise = valueNoise(1337);
const noise2 = valueNoise(4242);

/**
 * Terrain for one lane: the ridge above it plus the lane itself (and its forest margins).
 * World rect: x ∈ [0, WORLD_W), y ∈ [laneOriginY(lane) - LANE_GAP, laneOriginY(lane) + LANE_H).
 */
export function renderLaneChunk(lane: number): HTMLCanvasElement {
  const rows = LANE_GAP + LANE_H;
  const W = WORLD_W * TP;
  const H = rows * TP;
  const [canvas, ctx] = makeCanvas(W, H);
  const oy = laneOriginY(lane) - LANE_GAP; // world y of chunk top
  const rnd = seeded(lane * 977 + 5);

  // 1) snow everywhere (low-res noise upscaled)
  paintSnow(ctx, W, H, oy);

  // 2) the lane field
  const fx = LANE_MARGIN_X * TP;
  const fy = LANE_GAP * TP;
  const fw = LANE_W * TP;
  const fh = LANE_H * TP;
  // build zone: slightly brighter packed snow
  ctx.fillStyle = 'rgba(210,228,248,0.16)';
  ctx.fillRect(fx + BUILD_MIN_X * TP, fy, (BUILD_MAX_X - BUILD_MIN_X + 1) * TP, fh);
  // subtle placement grid
  ctx.strokeStyle = 'rgba(40,70,110,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = BUILD_MIN_X; x <= BUILD_MAX_X + 1; x++) {
    ctx.moveTo(fx + x * TP + 0.5, fy);
    ctx.lineTo(fx + x * TP + 0.5, fy + fh);
  }
  for (let y = 0; y <= LANE_H; y++) {
    ctx.moveTo(fx + BUILD_MIN_X * TP, fy + y * TP + 0.5);
    ctx.lineTo(fx + (BUILD_MAX_X + 1) * TP, fy + y * TP + 0.5);
  }
  ctx.stroke();
  // sparkles / wind ripples
  for (let i = 0; i < 160; i++) {
    const x = fx + rnd() * fw;
    const y = fy + rnd() * fh;
    ctx.fillStyle = `rgba(255,255,255,${0.12 + rnd() * 0.25})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const x = fx + rnd() * fw;
    const y = fy + rnd() * fh;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 20, y - 4, x + 44 + rnd() * 30, y + 2);
    ctx.stroke();
  }

  // 3) spawn apron (dark runed stone) and exit apron (ice)
  paintApron(ctx, fx, fy + (GATE_MIN_Y - 2) * TP, 3 * TP, (GATE_MAX_Y - GATE_MIN_Y + 5) * TP, '#3a4466', '#b98cff', rnd);
  paintApron(ctx, fx + (LANE_W - 3) * TP, fy + (GATE_MIN_Y - 2) * TP, 3 * TP, (GATE_MAX_Y - GATE_MIN_Y + 5) * TP, '#4d6d96', '#7ff3ff', rnd);

  // 4) lane edges: a low wall of frosty stones along top and bottom
  stoneBorder(ctx, fx - 6, fy - 6, fw + 12, rnd);
  stoneBorder(ctx, fx - 6, fy + fh - 6, fw + 12, rnd);

  // 5) the ridge above the lane
  paintRidge(ctx, 0, 0, W, LANE_GAP * TP, rnd, lane);

  // 6) forest margins left & right of the field
  forest(ctx, 0, fy, fx - 10, fh, rnd, 'left');
  forest(ctx, fx + fw + 10, fy, W - fx - fw - 10, fh, rnd, 'right');

  return canvas;
}

/** The ridge below the last lane. */
export function renderBottomRidge(): HTMLCanvasElement {
  const W = WORLD_W * TP;
  const H = LANE_GAP * TP;
  const [canvas, ctx] = makeCanvas(W, H);
  paintSnow(ctx, W, H, 0);
  paintRidge(ctx, 0, 0, W, H, seeded(99), 99);
  return canvas;
}

function paintSnow(ctx: Ctx, W: number, H: number, oy: number): void {
  const q = 4;
  const w = Math.ceil(W / q);
  const h = Math.ceil(H / q);
  const [small, sctx] = makeCanvas(w, h);
  const img = sctx.createImageData(w, h);
  const scale = q / TP;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = x * scale;
      const wy = y * scale + oy;
      const n = fbm(noise, wx * 0.18, wy * 0.18, 4);
      const d = noise2(wx * 0.9, wy * 0.9);
      const v = 0.82 + (n - 0.5) * 0.22 + (d - 0.5) * 0.05;
      const i = (y * w + x) * 4;
      img.data[i] = 150 * v + 18;
      img.data[i + 1] = 170 * v + 22;
      img.data[i + 2] = 196 * v + 30;
      img.data[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, w * q, h * q);
}

function paintApron(ctx: Ctx, x: number, y: number, w: number, h: number, stone: string, rune: string, rnd: () => number): void {
  ctx.save();
  // worn, darker ground fading out at the ends
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, alpha(stone, 0));
  g.addColorStop(0.2, alpha(stone, 0.55));
  g.addColorStop(0.8, alpha(stone, 0.55));
  g.addColorStop(1, alpha(stone, 0));
  ctx.fillStyle = g;
  roundRect(ctx, x + 4, y, w - 8, h, 18);
  ctx.fill();
  // scattered flat stones
  for (let i = 0; i < 14; i++) {
    const sx = x + 10 + rnd() * (w - 20);
    const sy = y + 24 + rnd() * (h - 48);
    ctx.fillStyle = shade(stone, 0.15 + rnd() * 0.15, 0.75);
    ellipse(ctx, sx, sy, 7 + rnd() * 6, 4 + rnd() * 3);
    ctx.fill();
  }
  // glowing runes
  ctx.strokeStyle = alpha(rune, 0.6);
  ctx.shadowColor = rune;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const rx = x + 14 + rnd() * (w - 28);
    const ry = y + 34 + (i * (h - 68)) / 3;
    ctx.beginPath();
    ctx.moveTo(rx - 5, ry + 5);
    ctx.lineTo(rx, ry - 6);
    ctx.lineTo(rx + 5, ry + 5);
    ctx.moveTo(rx - 3, ry + 1);
    ctx.lineTo(rx + 3, ry + 1);
    ctx.stroke();
  }
  ctx.restore();
}

function stoneBorder(ctx: Ctx, x: number, y: number, w: number, rnd: () => number): void {
  let cx = x;
  while (cx < x + w) {
    const sw = 10 + rnd() * 12;
    const sh = 8 + rnd() * 5;
    ctx.fillStyle = shade('#6f809c', (rnd() - 0.5) * 0.25);
    roundRect(ctx, cx, y + 2 + rnd() * 3, sw, sh, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,18,34,0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(236,244,255,0.8)';
    roundRect(ctx, cx + 1, y + 1 + rnd() * 2, sw - 2, 3, 2);
    ctx.fill();
    cx += sw - 1;
  }
}

function paintRidge(ctx: Ctx, x: number, y: number, w: number, h: number, rnd: () => number, lane: number): void {
  // rocky band
  ctx.save();
  const top = y + h * 0.12;
  const bottom = y + h * 0.9;
  ctx.beginPath();
  ctx.moveTo(x, bottom);
  for (let px = 0; px <= w; px += 24) {
    ctx.lineTo(x + px, top + fbm(noise2, (px / TP) * 0.25, lane * 3.1, 3) * h * 0.35);
  }
  for (let px = w; px >= 0; px -= 24) {
    ctx.lineTo(x + px, bottom - fbm(noise, (px / TP) * 0.3, lane * 7.7 + 11, 3) * h * 0.2);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#6c7f9f');
  g.addColorStop(0.5, '#4f6182');
  g.addColorStop(1, '#3b4a67');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,18,34,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.clip();
  // rock facets and snow
  for (let i = 0; i < w / 40; i++) {
    const rx = x + rnd() * w;
    const ry = top + rnd() * (bottom - top);
    const rs = 12 + rnd() * 26;
    ctx.fillStyle = shade('#5a6c8e', (rnd() - 0.5) * 0.3, 0.85);
    ctx.beginPath();
    ctx.moveTo(rx - rs, ry + rs * 0.5);
    ctx.lineTo(rx - rs * 0.3, ry - rs * 0.6);
    ctx.lineTo(rx + rs * 0.6, ry - rs * 0.3);
    ctx.lineTo(rx + rs, ry + rs * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(232,242,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(rx - rs * 0.55, ry - rs * 0.2);
    ctx.lineTo(rx - rs * 0.3, ry - rs * 0.6);
    ctx.lineTo(rx + rs * 0.6, ry - rs * 0.3);
    ctx.lineTo(rx + rs * 0.2, ry - rs * 0.12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // pine clusters on the ridge
  const trees: [number, number, number][] = [];
  for (let i = 0; i < w / 90; i++) trees.push([x + rnd() * w, y + h * (0.35 + rnd() * 0.5), (0.9 + rnd() * 0.9) * TP]);
  trees.sort((a, b) => a[1] - b[1]);
  for (const [tx, ty, th] of trees) pine(ctx, tx, ty, th * 1.8, rnd);
}

function forest(ctx: Ctx, x: number, y: number, w: number, h: number, rnd: () => number, side: 'left' | 'right'): void {
  if (w <= 0) return;
  // keep the gate area clear (portal/gate stand at the field edge)
  const gateTop = y + (GATE_MIN_Y - 3) * TP;
  const gateBottom = y + (GATE_MAX_Y + 4) * TP;
  const items: [number, number, number, 'tree' | 'rock'][] = [];
  for (let i = 0; i < (w * h) / 2600; i++) {
    const tx = x + rnd() * w;
    const ty = y + rnd() * h;
    const nearField = side === 'left' ? tx > x + w - TP * 2.5 : tx < x + TP * 2.5;
    if (ty > gateTop && ty < gateBottom && nearField) continue;
    items.push([tx, ty, (0.8 + rnd() * 0.9) * TP, rnd() < 0.8 ? 'tree' : 'rock']);
  }
  items.sort((a, b) => a[1] - b[1]);
  for (const [tx, ty, s, kind] of items) {
    if (kind === 'tree') pine(ctx, tx, ty, s * 1.9, rnd);
    else rock(ctx, tx, ty, s * 0.45, rnd);
  }
}

export function pine(ctx: Ctx, x: number, y: number, h: number, rnd: () => number): void {
  const w = h * 0.52;
  // shadow
  ctx.fillStyle = 'rgba(30,50,90,0.28)';
  ellipse(ctx, x + w * 0.2, y + 2, w * 0.55, w * 0.18);
  ctx.fill();
  ctx.fillStyle = '#4a3526';
  ctx.fillRect(x - w * 0.07, y - h * 0.16, w * 0.14, h * 0.18);
  const tiers = 3 + (rnd() < 0.4 ? 1 : 0);
  const base = shade('#1f4a4f', (rnd() - 0.5) * 0.2);
  for (let i = 0; i < tiers; i++) {
    const ty = y - h * 0.12 - (i * h * 0.78) / tiers;
    const tw = w * (1 - i * 0.2);
    const th = (h * 0.95) / tiers + h * 0.08;
    const g = ctx.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
    g.addColorStop(0, shade(base, 0.15));
    g.addColorStop(1, shade(base, -0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - tw / 2, ty);
    ctx.lineTo(x, ty - th);
    ctx.lineTo(x + tw / 2, ty);
    ctx.quadraticCurveTo(x, ty + th * 0.12, x - tw / 2, ty);
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,16,26,0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // snow on the tier
    ctx.fillStyle = 'rgba(236,244,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(x - tw * 0.36, ty - th * 0.24);
    ctx.lineTo(x, ty - th);
    ctx.lineTo(x + tw * 0.1, ty - th * 0.62);
    ctx.quadraticCurveTo(x - tw * 0.05, ty - th * 0.35, x - tw * 0.36, ty - th * 0.24);
    ctx.fill();
  }
}

function rock(ctx: Ctx, x: number, y: number, r: number, rnd: () => number): void {
  ctx.fillStyle = 'rgba(30,50,90,0.25)';
  ellipse(ctx, x + r * 0.3, y + r * 0.3, r * 1.2, r * 0.4);
  ctx.fill();
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const rr = r * (0.8 + rnd() * 0.35);
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75);
  }
  ctx.closePath();
  ctx.fillStyle = shade('#6d7c96', (rnd() - 0.5) * 0.2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,18,34,0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(236,244,255,0.85)';
  ellipse(ctx, x - r * 0.1, y - r * 0.45, r * 0.6, r * 0.22);
  ctx.fill();
}

// ─────────────────────────────────────────────────────────── pillars
let pillarCache: HTMLCanvasElement | null = null;
/** A weathered rune pillar stump on a 2x2 footprint (kept low so towers behind stay visible). Ground centre at (64, 150). */
export function pillarSprite(): HTMLCanvasElement {
  if (pillarCache) return pillarCache;
  const [c, ctx] = makeCanvas(128, 200);
  const X = 64;
  const G = 150;
  ctx.fillStyle = 'rgba(20,34,60,0.32)';
  ellipse(ctx, X + 6, G + 24, 56, 20);
  ctx.fill();
  // plinth
  ctx.fillStyle = '#4f5b73';
  roundRect(ctx, X - 54, G - 30, 108, 70, 16);
  ctx.fill();
  outline(ctx, 2);
  const pg = ctx.createLinearGradient(0, G - 40, 0, G + 20);
  pg.addColorStop(0, '#8591a8');
  pg.addColorStop(1, '#646f86');
  ctx.fillStyle = pg;
  roundRect(ctx, X - 54, G - 40, 108, 66, 16);
  ctx.fill();
  outline(ctx, 2);
  // broken column stump
  const g = ctx.createLinearGradient(X - 30, 0, X + 30, 0);
  g.addColorStop(0, '#56627b');
  g.addColorStop(0.4, '#9aa8c0');
  g.addColorStop(1, '#48546b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(X - 30, G - 14);
  ctx.lineTo(X - 28, G - 70);
  ctx.lineTo(X - 12, G - 78);
  ctx.lineTo(X + 2, G - 70);
  ctx.lineTo(X + 16, G - 80);
  ctx.lineTo(X + 28, G - 72);
  ctx.lineTo(X + 30, G - 14);
  ctx.quadraticCurveTo(X, G - 4, X - 30, G - 14);
  ctx.fill();
  outline(ctx, 2);
  ctx.strokeStyle = 'rgba(30,40,60,0.4)';
  ctx.lineWidth = 1.5;
  for (const dx of [-14, 0, 14]) {
    ctx.beginPath();
    ctx.moveTo(X + dx, G - 18);
    ctx.lineTo(X + dx * 0.95, G - 66);
    ctx.stroke();
  }
  // snow on the broken top
  ctx.fillStyle = '#eef5ff';
  ctx.beginPath();
  ctx.moveTo(X - 29, G - 70);
  ctx.lineTo(X - 12, G - 79);
  ctx.lineTo(X + 2, G - 71);
  ctx.lineTo(X + 16, G - 81);
  ctx.lineTo(X + 29, G - 72);
  ctx.quadraticCurveTo(X, G - 58, X - 29, G - 70);
  ctx.fill();
  outline(ctx, 1.2);
  // snow drift on the plinth
  ctx.fillStyle = 'rgba(238,245,255,0.9)';
  ellipse(ctx, X - 30, G - 30, 18, 6);
  ctx.fill();
  // glowing rune
  ctx.save();
  ctx.strokeStyle = '#8fe8ff';
  ctx.shadowColor = '#7ff3ff';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(X - 7, G - 28);
  ctx.lineTo(X, G - 48);
  ctx.lineTo(X + 7, G - 28);
  ctx.moveTo(X - 5, G - 36);
  ctx.lineTo(X + 5, G - 36);
  ctx.stroke();
  ctx.restore();
  pillarCache = c;
  return c;
}

// ─────────────────────────────────────────────────────────── portal & gate (animated, world units)
export function drawPortal(ctx: Ctx, x: number, y: number, t: number, color: string): void {
  // (x, y) = centre of the portal mouth; world units
  const h = 3.2;
  const w = 1.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, 3.2, '#9a6bff', 0.35);
  ctx.restore();
  // swirling vortex
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.72, h * 0.42, 0, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(x, y, 0.05, x, y, h * 0.45);
  g.addColorStop(0, '#f2e6ff');
  g.addColorStop(0.3, '#b98cff');
  g.addColorStop(1, '#2a1650');
  ctx.fillStyle = g;
  ctx.fillRect(x - w, y - h, w * 2, h * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.06;
  for (let i = 0; i < 5; i++) {
    const a = t * 1.6 + i * 1.25;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, h * (0.12 + i * 0.06), 0, a, a + 2.2);
    ctx.stroke();
  }
  ctx.restore();
  // stone arch
  ctx.lineWidth = 0.22;
  ctx.strokeStyle = '#3d4763';
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.82, h * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 0.08;
  ctx.strokeStyle = alpha(color, 0.9);
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.82, h * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  // standing stones
  for (const dy of [-1, 1]) {
    const sy = y + dy * h * 0.55;
    ctx.fillStyle = '#56627b';
    roundRect(ctx, x - 0.35, sy - 0.35, 0.7, 0.7, 0.15);
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,14,28,0.7)';
    ctx.lineWidth = 0.05;
    ctx.stroke();
    ctx.fillStyle = '#eef5ff';
    ellipse(ctx, x, sy - 0.3, 0.3, 0.1);
    ctx.fill();
  }
}

export function drawGate(ctx: Ctx, x: number, y: number, t: number): void {
  const h = 3.4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, 3, '#7ff3ff', 0.3 + 0.05 * Math.sin(t * 2));
  ctx.restore();
  // shimmering veil
  const g = ctx.createLinearGradient(x - 0.5, 0, x + 0.5, 0);
  g.addColorStop(0, 'rgba(127,243,255,0)');
  g.addColorStop(0.5, `rgba(180,250,255,${0.35 + 0.1 * Math.sin(t * 3)})`);
  g.addColorStop(1, 'rgba(127,243,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 0.5, y - h * 0.45, 1, h * 0.9);
  // ice crystals framing the gate
  for (const dy of [-1, 1]) {
    const cy = y + dy * h * 0.52;
    ctx.fillStyle = '#bfe6ff';
    ctx.beginPath();
    ctx.moveTo(x - 0.45, cy + 0.4);
    ctx.lineTo(x - 0.15, cy - 1.1);
    ctx.lineTo(x + 0.1, cy - 0.2);
    ctx.lineTo(x + 0.35, cy - 0.8);
    ctx.lineTo(x + 0.5, cy + 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,14,28,0.7)';
    ctx.lineWidth = 0.05;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(x - 0.35, cy + 0.3);
    ctx.lineTo(x - 0.15, cy - 1.0);
    ctx.lineTo(x - 0.05, cy - 0.4);
    ctx.closePath();
    ctx.fill();
  }
}

export const PILLAR_SPRITE_GROUND = { x: 64, y: 150 };
export { SP };
