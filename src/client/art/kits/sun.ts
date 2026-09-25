// Sunguard: the paladins of the dawn. White limestone and gold, blue banners, domes, winged
// statues and a sun that never sets on their spires.
import {
  banner,
  block,
  type Build,
  cone,
  contactShadow,
  type Ctx,
  cylinder,
  dome,
  ellipse,
  glow,
  outline,
  shade,
  slab,
  type Spec,
  star,
  taperedPrism,
  window_,
} from './common';

const LIME = '#f2ecdf';
const LIME_SHADE = '#c9bea4';
const GOLD = '#e8b830';
const BLUE = '#3a5aa8';

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  const w = 94 + Math.min(tier, 4) * 3;
  const h = 60 + Math.min(tier, 4) * 2;
  contactShadow(ctx, X, Y + 6, w, h);
  slab(ctx, X, Y + 9, w + 6, h + 4, 7, LIME_SHADE, shade(LIME_SHADE, -0.25), 12);
  slab(ctx, X, Y + 3, w - 8, h - 6, 7, LIME, LIME_SHADE, 10);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.2;
  ctx.strokeRect(X - (w - 8) / 2 + 6, Y + 3 - (h - 6) / 2 + 5, w - 20, h - 16);
  // a gilded sun on the front step
  ctx.fillStyle = GOLD;
  star(ctx, X, Y + 3 + (h - 6) / 2 + 12, 6, 3, 8);
  ctx.fill();
  outline(ctx, 1.2);
  for (let i = 0; i < Math.min(4, tier); i++) {
    for (const side of [-1, 1]) {
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.arc(X + side * (14 + i * 9), Y + 3 + (h - 6) / 2 + 12, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function wing(ctx: Ctx, x: number, y: number, dir: number, len: number): void {
  ctx.fillStyle = '#fbf8f0';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dir * len * 0.6, y - len * 0.9, x + dir * len, y - len * 0.8);
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    ctx.lineTo(x + dir * len * (0.95 - t * 0.35), y - len * (0.55 - t * 0.45));
    ctx.lineTo(x + dir * len * (0.8 - t * 0.35), y - len * (0.5 - t * 0.45));
  }
  ctx.lineTo(x + dir * len * 0.15, y + len * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
}

/** A robed figure with a halo, standing on a pedestal. */
function statue(ctx: Ctx, x: number, baseY: number, h: number, wings: boolean, holy: string): number {
  const w = h * 0.38;
  if (wings) {
    wing(ctx, x - w * 0.2, baseY - h * 0.72, -1, h * 0.55);
    wing(ctx, x + w * 0.2, baseY - h * 0.72, 1, h * 0.55);
  }
  ctx.fillStyle = LIME;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, baseY);
  ctx.lineTo(x - w * 0.28, baseY - h * 0.72);
  ctx.lineTo(x + w * 0.28, baseY - h * 0.72);
  ctx.lineTo(x + w * 0.5, baseY);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, shade(LIME, 0.1));
  g.addColorStop(1, shade(LIME_SHADE, -0.2));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, 1.8);
  ctx.strokeStyle = LIME_SHADE;
  ctx.lineWidth = 1.2;
  for (const k of [-0.2, 0.05, 0.25]) {
    ctx.beginPath();
    ctx.moveTo(x + k * w, baseY - h * 0.68);
    ctx.lineTo(x + k * w * 1.6, baseY - 2);
    ctx.stroke();
  }
  const hy = baseY - h * 0.82;
  ctx.fillStyle = LIME;
  ellipse(ctx, x, hy, w * 0.2, w * 0.22);
  ctx.fill();
  outline(ctx, 1.4);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ellipse(ctx, x, hy - w * 0.28, w * 0.26, w * 0.08);
  ctx.stroke();
  glow(ctx, x, hy - w * 0.28, w * 0.5, holy, 0.5);
  return hy;
}

export function drawSun(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot, glow: holy } = p;
  const fx: Build['fx'] = [];
  let muzzle = Y - 60;
  switch (slot) {
    case '1': {
      // a small shrine with a candle
      block(ctx, X, Y + 2, 30 * s, 26 * s, 12 * s, LIME);
      window_(ctx, X, Y - 12 * s, 10 * s, 14 * s, holy);
      cone(ctx, X + 3 * s, Y - 26 * s, 22 * s, 18 * s, GOLD);
      cylinder(ctx, X + 3 * s, Y - 44 * s, 4 * s, 10 * s, '#fff8e8');
      muzzle = Y - 58 * s;
      fx.push({ k: 'flame', x: X + 3 * s, y: Y - 54 * s, w: 6 * s, h: 14 * s, n: 1, color: '#ffc84a', core: '#fffbe0' });
      break;
    }
    case '2a': {
      // the Dawn Warden: a white watchtower under a golden dome
      cylinder(ctx, X, Y + 2, 24 * s, 64 * s, LIME);
      window_(ctx, X - 7 * s, Y - 34 * s, 8 * s, 16 * s, holy);
      ctx.fillStyle = GOLD;
      ctx.fillRect(X - 24 * s, Y - 60 * s, 48 * s, 5);
      dome(ctx, X, Y - 64 * s, 26 * s, 26 * s, GOLD);
      banner(ctx, X + 12 * s, Y - 50 * s, 14 * s, 30 * s, BLUE, GOLD, (cx, cy) => {
        ctx.fillStyle = GOLD;
        star(ctx, cx, cy, 4, 2, 5);
        ctx.fill();
      });
      muzzle = Y - 96 * s;
      fx.push({ k: 'glow', x: X, y: Y - 92 * s, r: 24, color: holy });
      break;
    }
    case '3a': {
      // the Seraph: a winged statue on a column
      cylinder(ctx, X, Y + 2, 16 * s, 34 * s, LIME);
      ctx.fillStyle = GOLD;
      ctx.fillRect(X - 16 * s, Y - 34 * s, 32 * s, 5);
      const hy = statue(ctx, X, Y - 34 * s, 66 * s, true, holy);
      muzzle = hy - 8 * s;
      fx.push({ k: 'glow', x: X, y: hy - 10 * s, r: 30, color: holy });
      break;
    }
    case '4a': {
      // the Archon: a radiant avatar with a sword of light
      taperedPrism(ctx, X, Y + 2, 44 * s, 38 * s, 22 * s, LIME);
      const hy = statue(ctx, X, Y - 20 * s, 98 * s, true, holy);
      ctx.save();
      ctx.shadowColor = holy;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath();
      ctx.moveTo(X + 16 * s, Y - 60 * s);
      ctx.lineTo(X + 21 * s, Y - 130 * s);
      ctx.lineTo(X + 26 * s, Y - 60 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = GOLD;
      ctx.fillRect(X + 12 * s, Y - 62 * s, 18 * s, 4);
      muzzle = hy - 12 * s;
      fx.push({ k: 'rays', x: X, y: hy - 6 * s, r: 40 * s, color: holy });
      break;
    }
    case '2b': {
      // the Beacon of Valor: a golden brazier on a white column
      cylinder(ctx, X, Y + 2, 14 * s, 50 * s, LIME);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(X - 28 * s, Y - 52 * s);
      ctx.lineTo(X + 28 * s, Y - 52 * s);
      ctx.lineTo(X + 14 * s, Y - 40 * s);
      ctx.lineTo(X - 14 * s, Y - 40 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.8);
      ctx.fillStyle = shade(GOLD, 0.2);
      ellipse(ctx, X, Y - 52 * s, 28 * s, 8 * s);
      ctx.fill();
      outline(ctx, 1.6);
      muzzle = Y - 70 * s;
      fx.push({ k: 'flame', x: X, y: Y - 54 * s, w: 30 * s, h: 34 * s, n: 4, color: '#ffc84a', core: '#fffbe0' });
      fx.push({ k: 'rays', x: X, y: Y - 66 * s, r: 30 * s, color: holy });
      break;
    }
    case '3b': {
      // the Gatekeeper: a gate arch holding a sun disk
      for (const side of [-1, 1]) {
        taperedPrism(ctx, X + side * 28 * s, Y + 2, 18 * s, 14 * s, 72 * s, LIME);
        ctx.fillStyle = GOLD;
        ctx.fillRect(X + side * 28 * s - 8 * s, Y - 72 * s, 16 * s, 5);
      }
      ctx.fillStyle = LIME;
      ctx.beginPath();
      ctx.moveTo(X - 38 * s, Y - 70 * s);
      ctx.quadraticCurveTo(X, Y - 104 * s, X + 38 * s, Y - 70 * s);
      ctx.lineTo(X + 38 * s, Y - 60 * s);
      ctx.quadraticCurveTo(X, Y - 90 * s, X - 38 * s, Y - 60 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.8);
      const cy = Y - 50 * s;
      ctx.fillStyle = GOLD;
      star(ctx, X, cy, 18 * s, 11 * s, 12);
      ctx.fill();
      outline(ctx, 1.6);
      ctx.fillStyle = '#fff4c0';
      ellipse(ctx, X, cy, 9 * s, 9 * s);
      ctx.fill();
      muzzle = cy;
      fx.push({ k: 'rays', x: X, y: cy, r: 36 * s, color: holy });
      break;
    }
    case '4b': {
      // the Sun Cathedral
      block(ctx, X - 4 * s, Y + 4, 70 * s, 50 * s, 22 * s, LIME);
      window_(ctx, X - 22 * s, Y - 22 * s, 8 * s, 18 * s, holy);
      window_(ctx, X + 14 * s, Y - 22 * s, 8 * s, 18 * s, holy);
      // rose window
      ctx.fillStyle = BLUE;
      ellipse(ctx, X - 4 * s, Y - 34 * s, 9 * s, 9 * s);
      ctx.fill();
      outline(ctx, 1.4);
      ctx.fillStyle = GOLD;
      star(ctx, X - 4 * s, Y - 34 * s, 7 * s, 3 * s, 8);
      ctx.fill();
      dome(ctx, X + 2 * s, Y - 46 * s, 30 * s, 30 * s, GOLD);
      cylinder(ctx, X + 2 * s, Y - 80 * s, 4 * s, 16 * s, GOLD);
      ctx.fillStyle = GOLD;
      star(ctx, X + 2 * s, Y - 102 * s, 8 * s, 3 * s, 4);
      ctx.fill();
      outline(ctx, 1.2);
      muzzle = Y - 102 * s;
      fx.push({ k: 'rays', x: X + 2 * s, y: Y - 102 * s, r: 30 * s, color: holy });
      fx.push({ k: 'glow', x: X - 4 * s, y: Y - 30 * s, r: 36, color: holy });
      break;
    }
    case 'L': {
      // the Dawnbringer: a spire crowned with the sun itself
      taperedPrism(ctx, X, Y + 4, 50 * s, 30 * s, 96 * s, LIME, 0);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = GOLD;
        ctx.fillRect(X - (24 - i * 3) * s, Y - (24 + i * 26) * s, (48 - i * 6) * s, 5);
      }
      window_(ctx, X - 4 * s, Y - 54 * s, 10 * s, 22 * s, holy);
      for (const side of [-1, 1]) wing(ctx, X + side * 12 * s, Y - 90 * s, side, 36 * s);
      const cy = Y - 122 * s;
      ctx.fillStyle = GOLD;
      star(ctx, X, cy, 26 * s, 16 * s, 16);
      ctx.fill();
      outline(ctx, 1.8);
      ctx.fillStyle = '#fff6c8';
      ellipse(ctx, X, cy, 13 * s, 13 * s);
      ctx.fill();
      muzzle = cy;
      fx.push({ k: 'rays', x: X, y: cy, r: 54 * s, color: holy });
      break;
    }
  }
  return { muzzle, fx };
}
