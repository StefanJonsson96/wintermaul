// Prismatic: living geometry. Pale hexagonal platforms ringed with light, and faceted gems that
// float, split and orbit with every tier.
import {
  alpha,
  type Build,
  contactShadow,
  crystal,
  type Ctx,
  ellipse,
  gem,
  glow,
  outline,
  polySlab,
  roundRect,
  runeRing,
  shade,
  type Spec,
  taperedPrism,
} from './common';

const PALE = '#ece6f4';
const PALE_SHADE = '#b6aecb';
const PINK = '#ff8fd0';
const VIOLET = '#b890ff';
const CYAN = '#8ff0ff';

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  const rx = 48 + Math.min(tier, 4) * 1.5;
  const ry = 30 + Math.min(tier, 4);
  contactShadow(ctx, X, Y + 6, rx * 2, ry * 2);
  polySlab(ctx, X, Y + 5, rx, ry, 12, 6, PALE, PALE_SHADE, 0);
  // prismatic inlay: a ring in three colours
  for (const [k, c] of [
    [0.78, PINK],
    [0.68, VIOLET],
    [0.58, CYAN],
  ] as const) runeRing(ctx, X, Y + 5, rx * k, ry * k, c, 0);
  // small gem studs on the front edges
  for (let i = 0; i < Math.min(4, tier); i++) {
    const x = X + (i - (Math.min(4, tier) - 1) / 2) * 13;
    gem(ctx, x, Y + 5 + ry + 6, 6, 9, [PINK, VIOLET, CYAN, '#fff08a'][i]);
  }
}

function pedestal(ctx: Ctx, x: number, baseY: number, w: number, h: number): void {
  taperedPrism(ctx, x, baseY, w, w * 0.6, h, PALE, 0);
}

export function drawPrism(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot } = p;
  const fx: Build['fx'] = [];
  let muzzle = Y - 60;
  let head: number | undefined;
  switch (slot) {
    case '1': {
      pedestal(ctx, X, Y + 2, 26 * s, 12 * s);
      glow(ctx, X, Y - 44 * s, 36 * s, PINK, 0.45);
      gem(ctx, X, Y - 44 * s, 26 * s, 38 * s, PINK);
      muzzle = Y - 44 * s;
      break;
    }
    case '2a': {
      // a triangular prism throwing a rainbow
      pedestal(ctx, X, Y + 2, 30 * s, 16 * s);
      const cy = Y - 56 * s;
      glow(ctx, X, cy, 44 * s, VIOLET, 0.4);
      ctx.fillStyle = shade(VIOLET, 0.35);
      ctx.beginPath();
      ctx.moveTo(X, cy - 26 * s);
      ctx.lineTo(X - 22 * s, cy + 16 * s);
      ctx.lineTo(X + 4 * s, cy + 20 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(VIOLET, -0.2);
      ctx.beginPath();
      ctx.moveTo(X, cy - 26 * s);
      ctx.lineTo(X + 4 * s, cy + 20 * s);
      ctx.lineTo(X + 22 * s, cy + 12 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X, cy - 26 * s);
      ctx.lineTo(X - 22 * s, cy + 16 * s);
      ctx.lineTo(X + 4 * s, cy + 20 * s);
      ctx.lineTo(X + 22 * s, cy + 12 * s);
      ctx.closePath();
      outline(ctx, 1.8);
      for (const [i, c] of [PINK, '#ffd35a', '#7dff8a', CYAN].entries()) {
        ctx.strokeStyle = alpha(c, 0.8);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(X + 16 * s, cy + 6 * s + i * 3);
        ctx.lineTo(X + 40 * s, cy + (14 + i * 6) * s);
        ctx.stroke();
      }
      muzzle = cy;
      break;
    }
    case '3a': {
      // the Refractor: a central gem with satellites
      pedestal(ctx, X, Y + 2, 32 * s, 22 * s);
      const cy = Y - 66 * s;
      glow(ctx, X, cy, 50 * s, CYAN, 0.4);
      gem(ctx, X, cy, 30 * s, 44 * s, CYAN);
      muzzle = cy;
      fx.push({ k: 'orbit', x: X, y: cy, r: 36 * s, color: PINK, n: 3, size: 6 });
      break;
    }
    case '4a': {
      // the Kaleidoscope: a ring of crystals around a great gem
      pedestal(ctx, X, Y + 2, 36 * s, 28 * s);
      const cy = Y - 80 * s;
      glow(ctx, X, cy, 64 * s, VIOLET, 0.45);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        gem(ctx, X + Math.cos(a) * 34 * s, cy + Math.sin(a) * 30 * s, 12 * s, 20 * s, [PINK, VIOLET, CYAN, '#ffd35a', '#7dff8a'][i]);
      }
      gem(ctx, X, cy, 32 * s, 48 * s, PALE);
      muzzle = cy;
      fx.push({ k: 'orbit', x: X, y: cy, r: 46 * s, color: CYAN, n: 5, size: 4 });
      break;
    }
    case '2b': {
      // a split geode cradling the cannon
      ctx.fillStyle = '#6a6070';
      ctx.beginPath();
      ctx.moveTo(X - 36 * s, Y + 4);
      ctx.bezierCurveTo(X - 40 * s, Y - 36 * s, X + 40 * s, Y - 36 * s, X + 36 * s, Y + 4);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = '#2a2034';
      ellipse(ctx, X, Y - 10 * s, 28 * s, 16 * s);
      ctx.fill();
      for (let i = 0; i < 6; i++) crystal(ctx, X - 20 * s + i * 8 * s, Y - 4 * s, 7 * s, (10 + (i % 3) * 6) * s, (i - 2.5) * 2, PINK, VIOLET);
      head = Y - 30 * s;
      muzzle = head;
      break;
    }
    case '3b': {
      // the Diamond Lance: a tall diamond needle
      pedestal(ctx, X, Y + 2, 34 * s, 16 * s);
      glow(ctx, X, Y - 80 * s, 50 * s, CYAN, 0.35);
      crystal(ctx, X, Y - 12 * s, 26 * s, 112 * s, 0, '#f4fbff', '#8fc0e8');
      muzzle = Y - 124 * s;
      fx.push({ k: 'glow', x: X, y: muzzle + 6, r: 28, color: CYAN });
      break;
    }
    case '4b': {
      // the Heartstone: a pulsing heart-cut gem
      pedestal(ctx, X, Y + 2, 40 * s, 20 * s);
      const cy = Y - 64 * s;
      const r = 32 * s;
      glow(ctx, X, cy, r * 2.2, PINK, 0.5);
      ctx.fillStyle = shade(PINK, 0.1);
      ctx.beginPath();
      ctx.moveTo(X, cy + r);
      ctx.bezierCurveTo(X - r * 1.4, cy + r * 0.1, X - r * 1.1, cy - r * 1.1, X, cy - r * 0.45);
      ctx.bezierCurveTo(X + r * 1.1, cy - r * 1.1, X + r * 1.4, cy + r * 0.1, X, cy + r);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 2);
      ctx.strokeStyle = alpha('#ffffff', 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X, cy - r * 0.45);
      ctx.lineTo(X, cy + r);
      ctx.moveTo(X - r * 0.8, cy - r * 0.2);
      ctx.lineTo(X, cy + r * 0.2);
      ctx.lineTo(X + r * 0.8, cy - r * 0.2);
      ctx.stroke();
      ctx.fillStyle = alpha('#ffffff', 0.6);
      ellipse(ctx, X - r * 0.45, cy - r * 0.4, r * 0.18, r * 0.1, -0.5);
      ctx.fill();
      muzzle = cy;
      fx.push({ k: 'glow', x: X, y: cy, r: 44, color: PINK });
      break;
    }
    case 'L': {
      // the Prismatic Singularity: a great gem with a swarm of satellites
      pedestal(ctx, X, Y + 4, 44 * s, 34 * s);
      const cy = Y - 100 * s;
      glow(ctx, X, cy, 80 * s, VIOLET, 0.5);
      gem(ctx, X, cy, 44 * s, 70 * s, shade(VIOLET, 0.2));
      gem(ctx, X, cy, 22 * s, 36 * s, PALE);
      muzzle = cy;
      fx.push({ k: 'orbit', x: X, y: cy, r: 52 * s, color: PINK, n: 4, size: 6 });
      fx.push({ k: 'orbit', x: X, y: cy + 6, r: 38 * s, color: CYAN, n: 4, size: 4 });
      break;
    }
  }
  return { muzzle, head, fx };
}

/** The Geode Cannon's crystal barrel. */
export function prismHead(ctx: Ctx, p: Spec): void {
  const s = p.s;
  ctx.fillStyle = '#6a6070';
  roundRect(ctx, 46, 52, 28, 24, 8);
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = shade(PINK, 0.1);
  ctx.beginPath();
  ctx.moveTo(66, 56);
  ctx.lineTo(66 + 34 * s, 60);
  ctx.lineTo(70 + 36 * s, 64);
  ctx.lineTo(66 + 34 * s, 68);
  ctx.lineTo(66, 72);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.strokeStyle = alpha('#ffffff', 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(68, 60);
  ctx.lineTo(64 + 34 * s, 62);
  ctx.stroke();
}
