// Arcanum: high mages. White marble daises inlaid with gold, slender spires with gilded
// filigree, and violet crystals that float on their own.
import {
  alpha,
  type Build,
  cone,
  contactShadow,
  type Ctx,
  cylinder,
  ellipse,
  gem,
  glow,
  outline,
  polySlab,
  rune,
  runeRing,
  shade,
  type Spec,
  taperedPrism,
  window_,
} from './common';

const MARBLE = '#ece8f2';
const MARBLE_SHADE = '#b4acc8';
const GOLD = '#e2b24a';
const VIOLET = '#a46bff';
const CRYSTAL = '#c9a2ff';

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  const rx = 48 + Math.min(tier, 4) * 1.5;
  const ry = 30 + Math.min(tier, 4);
  contactShadow(ctx, X, Y + 6, rx * 2, ry * 2);
  polySlab(ctx, X, Y + 8, rx + 4, ry + 2, 7, 20, MARBLE_SHADE, shade(MARBLE_SHADE, -0.25));
  polySlab(ctx, X, Y + 3, rx - 4, ry - 3, 7, 20, MARBLE, MARBLE_SHADE);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ellipse(ctx, X, Y + 3, (rx - 4) * 0.94, (ry - 3) * 0.94);
  ctx.stroke();
  runeRing(ctx, X, Y + 3, (rx - 4) * 0.72, (ry - 3) * 0.72, p.glow, 10);
  for (let i = 0; i < Math.min(4, tier); i++) {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(X + (i - (Math.min(4, tier) - 1) / 2) * 12, Y + 3 + ry + 6, 2.6, 0, Math.PI * 2);
    ctx.fill();
    outline(ctx, 1);
  }
}

function column(ctx: Ctx, x: number, baseY: number, r: number, h: number): void {
  cylinder(ctx, x, baseY, r * 1.35, 6, MARBLE_SHADE);
  cylinder(ctx, x, baseY - 6, r, h - 12, MARBLE);
  ctx.strokeStyle = alpha(MARBLE_SHADE, 0.9);
  ctx.lineWidth = 1.2;
  for (const k of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(x + k * r, baseY - 8);
    ctx.lineTo(x + k * r, baseY - h + 8);
    ctx.stroke();
  }
  cylinder(ctx, x, baseY - h + 6, r * 1.35, 6, GOLD);
}

function prongs(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  for (const side of [-1, 1]) {
    for (const [lw, col] of [
      [6, 'rgba(8,14,28,0.7)'],
      [3.5, GOLD],
    ] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x + side * w * 0.3, y);
      ctx.quadraticCurveTo(x + side * w, y - h * 0.4, x + side * w * 0.6, y - h);
      ctx.stroke();
    }
  }
}

export function drawArcane(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot, glow: arc } = p;
  const fx: Build['fx'] = [];
  let muzzle = Y - 60;
  switch (slot) {
    case '1': {
      column(ctx, X, Y, 9 * s, 30 * s);
      const ty = Y - 56 * s;
      glow(ctx, X, ty, 34 * s, arc, 0.5);
      ctx.fillStyle = shade(VIOLET, -0.15);
      ctx.beginPath();
      ctx.moveTo(X - 12 * s, ty - 16 * s);
      ctx.lineTo(X + 12 * s, ty - 16 * s);
      ctx.lineTo(X + 12 * s, ty + 12 * s);
      ctx.lineTo(X, ty + 18 * s);
      ctx.lineTo(X - 12 * s, ty + 12 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.8);
      rune(ctx, X, ty, 11 * s, '#ffffff', 1);
      muzzle = ty;
      fx.push({ k: 'glow', x: X, y: ty, r: 24, color: arc });
      break;
    }
    case '2a': {
      column(ctx, X, Y, 10 * s, 56 * s);
      prongs(ctx, X, Y - 56 * s, 16 * s, 22 * s);
      muzzle = Y - 76 * s;
      fx.push({ k: 'orb', x: X, y: muzzle, r: 12 * s, color: CRYSTAL });
      break;
    }
    case '3a': {
      // the Ley Lance: a slender gilded spire
      taperedPrism(ctx, X, Y + 2, 34 * s, 14 * s, 112 * s, MARBLE, 20 * s);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const y = Y - t * 108 * s;
        const w = (17 - t * 10) * s;
        const x = X + Math.sin(t * Math.PI * 5) * w * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      gem(ctx, X, Y - 128 * s, 16 * s, 26 * s, CRYSTAL);
      muzzle = Y - 128 * s;
      fx.push({ k: 'glow', x: X, y: muzzle, r: 30, color: arc });
      break;
    }
    case '4a': {
      // the Astral Ray: a spire wrapped in golden rings around a great orb
      taperedPrism(ctx, X, Y + 2, 40 * s, 22 * s, 84 * s, MARBLE, 10 * s);
      window_(ctx, X - 4 * s, Y - 40 * s, 7 * s, 14 * s, arc);
      prongs(ctx, X, Y - 88 * s, 22 * s, 30 * s);
      muzzle = Y - 118 * s;
      fx.push({ k: 'orb', x: X, y: muzzle, r: 17 * s, color: CRYSTAL, ring: true });
      fx.push({ k: 'orbit', x: X, y: muzzle, r: 34 * s, color: GOLD, n: 3, size: 4 });
      break;
    }
    case '2b': {
      // the Hex Prism: a violet prism hovering over a gilded claw
      column(ctx, X, Y, 12 * s, 22 * s);
      prongs(ctx, X, Y - 22 * s, 14 * s, 16 * s);
      glow(ctx, X, Y - 58 * s, 40 * s, arc, 0.45);
      gem(ctx, X, Y - 58 * s, 26 * s, 42 * s, VIOLET);
      muzzle = Y - 58 * s;
      fx.push({ k: 'glow', x: X, y: muzzle, r: 30, color: arc });
      break;
    }
    case '3b': {
      // the Warding Obelisk
      taperedPrism(ctx, X, Y + 2, 44 * s, 20 * s, 98 * s, MARBLE, 14 * s);
      for (let i = 0; i < 4; i++) rune(ctx, X - 6 * s, Y - 22 * s - i * 20 * s, 8 * s, GOLD, i);
      gem(ctx, X, Y - 118 * s, 14 * s, 20 * s, CRYSTAL);
      muzzle = Y - 118 * s;
      fx.push({ k: 'glow', x: X, y: Y - 60 * s, r: 40, color: arc });
      break;
    }
    case '4b': {
      // the Nexus of Power: three columns and a floating crystal heart
      for (const [dx, dy] of [
        [-30, -8],
        [30, -8],
        [0, 12],
      ] as const) {
        column(ctx, X + dx * s, Y + dy * s * 0.6, 8 * s, (dy > 0 ? 56 : 64) * s);
      }
      glow(ctx, X, Y - 92 * s, 60 * s, arc, 0.45);
      gem(ctx, X, Y - 92 * s, 30 * s, 50 * s, CRYSTAL);
      muzzle = Y - 92 * s;
      fx.push({ k: 'orbit', x: X, y: muzzle, r: 38 * s, color: CRYSTAL, n: 4, size: 5 });
      break;
    }
    case 'L': {
      // the Archmage Spire: a wizard's tower with a balcony and a violet roof
      cylinder(ctx, X, Y + 2, 28 * s, 78 * s, MARBLE);
      for (const y of [Y - 26 * s, Y - 54 * s]) window_(ctx, X - 6 * s, y, 8 * s, 16 * s, arc);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      for (const y of [Y - 16 * s, Y - 42 * s, Y - 68 * s]) {
        ctx.beginPath();
        ctx.ellipse(X, y, 28 * s, 11 * s, 0, 0.1, Math.PI - 0.1);
        ctx.stroke();
      }
      cylinder(ctx, X, Y - 76 * s, 36 * s, 6, GOLD);
      cone(ctx, X, Y - 82 * s, 34 * s, 58 * s, VIOLET, 6 * s);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(X + 6 * s, Y - 140 * s, 5, 0, Math.PI * 2);
      ctx.fill();
      outline(ctx, 1.2);
      muzzle = Y - 128 * s;
      fx.push({ k: 'orbit', x: X, y: Y - 104 * s, r: 48 * s, color: CRYSTAL, n: 6, size: 5 });
      fx.push({ k: 'glow', x: X, y: Y - 140 * s, r: 26, color: arc });
      break;
    }
  }
  return { muzzle, fx };
}
