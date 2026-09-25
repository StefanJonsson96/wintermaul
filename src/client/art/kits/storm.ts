// Stormcallers: storm engineers. Round slate plinths with copper rings, glass insulators,
// wound copper coils and glass globes with a storm trapped inside.
import {
  alpha,
  type Build,
  contactShadow,
  type Ctx,
  cylinder,
  ellipse,
  glow,
  outline,
  polySlab,
  roundRect,
  shade,
  type Spec,
  taperedPrism,
} from './common';

const SLATE = '#394258';
const SLATE_TOP = '#5c6780';
const COPPER = '#c8773a';
const COPPER_LIGHT = '#eaa266';
const GLASS = '#bfe6ff';

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  const rx = 48 + Math.min(tier, 4) * 1.5;
  const ry = 30 + Math.min(tier, 4);
  contactShadow(ctx, X, Y + 6, rx * 2, ry * 2);
  polySlab(ctx, X, Y + 5, rx, ry, 13, 16, SLATE_TOP, SLATE);
  // copper ring inlaid in the top
  ctx.strokeStyle = 'rgba(8,14,28,0.6)';
  ctx.lineWidth = 5;
  ellipse(ctx, X, Y + 5, rx * 0.72, ry * 0.72);
  ctx.stroke();
  ctx.strokeStyle = COPPER;
  ctx.lineWidth = 3;
  ellipse(ctx, X, Y + 5, rx * 0.72, ry * 0.72);
  ctx.stroke();
  // insulators around the rim
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 0.05 + (i / 5) * Math.PI * 0.9;
    const x = X + Math.cos(a) * rx * 0.9;
    const y = Y + 5 + Math.sin(a) * ry * 0.88;
    insulator(ctx, x, y, 4.5, 3);
  }
  for (let i = 0; i < Math.min(4, tier); i++) {
    ctx.fillStyle = p.glow;
    ctx.beginPath();
    ctx.arc(X + (i - (Math.min(4, tier) - 1) / 2) * 12, Y + 5 + ry + 7, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function insulator(ctx: Ctx, x: number, y: number, r: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const yy = y - i * r * 1.1;
    ctx.fillStyle = alpha(GLASS, 0.95);
    ellipse(ctx, x, yy, r * (1 - i * 0.12), r * 0.42);
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,14,28,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** A copper coil wound around a rod. */
function coil(ctx: Ctx, x: number, baseY: number, rx: number, h: number, rings: number): void {
  cylinder(ctx, x, baseY, rx * 0.32, h, SLATE_TOP);
  for (let i = 0; i < rings; i++) {
    const ry = baseY - 6 - (i * (h - 10)) / rings;
    const rr = rx * (1 - (i / rings) * 0.35);
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = shade(COPPER, -0.35);
    ellipse(ctx, x, ry + 1.5, rr, rr * 0.38);
    ctx.stroke();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = i % 2 ? COPPER : COPPER_LIGHT;
    ellipse(ctx, x, ry, rr, rr * 0.38);
    ctx.stroke();
  }
}

function torus(ctx: Ctx, x: number, y: number, rx: number): void {
  ctx.lineWidth = rx * 0.42;
  ctx.strokeStyle = 'rgba(8,14,28,0.75)';
  ellipse(ctx, x, y, rx, rx * 0.36);
  ctx.stroke();
  ctx.lineWidth = rx * 0.34;
  const g = ctx.createLinearGradient(x - rx, y - rx, x + rx, y + rx);
  g.addColorStop(0, '#e8eef6');
  g.addColorStop(1, '#6c7a8e');
  ctx.strokeStyle = g;
  ellipse(ctx, x, y, rx, rx * 0.36);
  ctx.stroke();
}

export function drawStorm(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot, glow: bolt } = p;
  const fx: Build['fx'] = [];
  let muzzle = Y - 60;
  switch (slot) {
    case '1': {
      coil(ctx, X, Y, 18 * s, 48 * s, 4);
      muzzle = Y - 58 * s;
      fx.push({ k: 'spark', x: X, y: muzzle, r: 12, color: bolt });
      break;
    }
    case '2a': {
      cylinder(ctx, X, Y + 2, 24 * s, 10 * s, SLATE_TOP);
      coil(ctx, X, Y - 8 * s, 22 * s, 66 * s, 6);
      torus(ctx, X, Y - 80 * s, 20 * s);
      muzzle = Y - 90 * s;
      fx.push({ k: 'spark', x: X, y: muzzle, r: 14, color: bolt });
      break;
    }
    case '3a': {
      // two coils bridged by a copper arc
      for (const dx of [-24, 24]) {
        coil(ctx, X + dx * s, Y + 2, 15 * s, 76 * s, 6);
        torus(ctx, X + dx * s, Y - 78 * s, 12 * s);
      }
      ctx.strokeStyle = 'rgba(8,14,28,0.7)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(X - 24 * s, Y - 86 * s);
      ctx.quadraticCurveTo(X, Y - 108 * s, X + 24 * s, Y - 86 * s);
      ctx.stroke();
      ctx.strokeStyle = COPPER;
      ctx.lineWidth = 4;
      ctx.stroke();
      muzzle = Y - 100 * s;
      fx.push({ k: 'spark', x: X, y: muzzle, r: 16, color: bolt });
      fx.push({ k: 'spark', x: X - 24 * s, y: Y - 80 * s, r: 9, color: bolt });
      fx.push({ k: 'spark', x: X + 24 * s, y: Y - 80 * s, r: 9, color: bolt });
      break;
    }
    case '4a': {
      // a tall spire that wears a storm cloud as its crown
      taperedPrism(ctx, X, Y + 2, 46 * s, 20 * s, 104 * s, SLATE_TOP, 10 * s);
      for (let i = 0; i < 4; i++) {
        const y = Y - 18 * s - i * 22 * s;
        const w = (40 - i * 5) * s;
        ctx.fillStyle = COPPER;
        ctx.fillRect(X - w / 2, y, w, 5);
        ctx.strokeStyle = 'rgba(8,14,28,0.6)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(X - w / 2, y, w, 5);
      }
      cloud(ctx, X, Y - 128 * s, 44 * s);
      muzzle = Y - 128 * s;
      fx.push({ k: 'spark', x: X, y: Y - 118 * s, r: 20, color: bolt });
      break;
    }
    case '2b': {
      // an ion rod: a mast stacked with insulators and a needle tip
      cylinder(ctx, X, Y + 2, 20 * s, 10 * s, SLATE_TOP);
      cylinder(ctx, X, Y - 8 * s, 5 * s, 78 * s, COPPER);
      for (let i = 0; i < 4; i++) insulator(ctx, X, Y - 20 * s - i * 16 * s, 11 * s, 2);
      ctx.fillStyle = COPPER_LIGHT;
      ctx.beginPath();
      ctx.moveTo(X - 4 * s, Y - 86 * s);
      ctx.lineTo(X, Y - 112 * s);
      ctx.lineTo(X + 4 * s, Y - 86 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.4);
      muzzle = Y - 112 * s;
      fx.push({ k: 'spark', x: X, y: muzzle, r: 10, color: bolt });
      break;
    }
    case '3b': {
      // the Thunder Rod: a massive rod under a copper anvil
      cylinder(ctx, X, Y + 2, 28 * s, 12 * s, SLATE_TOP);
      cylinder(ctx, X, Y - 10 * s, 10 * s, 62 * s, SLATE);
      for (let i = 0; i < 3; i++) insulator(ctx, X, Y - 18 * s - i * 18 * s, 15 * s, 2);
      ctx.fillStyle = COPPER;
      ctx.beginPath();
      ctx.moveTo(X - 34 * s, Y - 78 * s);
      ctx.lineTo(X + 34 * s, Y - 78 * s);
      ctx.lineTo(X + 20 * s, Y - 90 * s);
      ctx.lineTo(X + 26 * s, Y - 100 * s);
      ctx.lineTo(X - 26 * s, Y - 100 * s);
      ctx.lineTo(X - 20 * s, Y - 90 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = COPPER_LIGHT;
      ctx.fillRect(X - 24 * s, Y - 99 * s, 48 * s, 4);
      muzzle = Y - 104 * s;
      fx.push({ k: 'spark', x: X, y: muzzle, r: 18, color: bolt });
      break;
    }
    case '4b': {
      // the Stormeye: a glass globe in a copper cage
      cylinder(ctx, X, Y + 2, 26 * s, 14 * s, SLATE_TOP);
      cylinder(ctx, X, Y - 12 * s, 12 * s, 26 * s, COPPER);
      const cy = Y - 74 * s;
      const r = 30 * s;
      ctx.fillStyle = alpha('#10203a', 0.85);
      ellipse(ctx, X, cy, r, r);
      ctx.fill();
      ctx.strokeStyle = 'rgba(8,14,28,0.8)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      for (const k of [-0.6, 0, 0.6]) {
        ctx.strokeStyle = COPPER;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(X, cy, r * Math.abs(Math.cos(k * 1.2)) + 1, r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = alpha('#ffffff', 0.35);
      ellipse(ctx, X - r * 0.4, cy - r * 0.45, r * 0.25, r * 0.15, -0.5);
      ctx.fill();
      muzzle = cy;
      fx.push({ k: 'orb', x: X, y: cy, r: 12 * s, color: bolt, bob: 2 });
      fx.push({ k: 'spark', x: X, y: cy, r: 16, color: bolt });
      break;
    }
    case 'L': {
      // the Sky Hammer: a great coil tower under a floating hammer of stormglass
      cylinder(ctx, X, Y + 4, 34 * s, 14 * s, SLATE_TOP);
      coil(ctx, X, Y - 10 * s, 28 * s, 92 * s, 8);
      const hy = Y - 132 * s;
      ctx.save();
      ctx.shadowColor = bolt;
      ctx.shadowBlur = 14;
      ctx.fillStyle = shade(COPPER, -0.1);
      roundRect(ctx, X - 40 * s, hy - 16 * s, 80 * s, 32 * s, 8);
      ctx.fill();
      ctx.restore();
      outline(ctx, 2.2);
      ctx.fillStyle = COPPER_LIGHT;
      ctx.fillRect(X - 40 * s, hy - 16 * s, 80 * s, 6);
      ctx.fillStyle = alpha(GLASS, 0.9);
      roundRect(ctx, X - 10 * s, hy - 12 * s, 20 * s, 24 * s, 4);
      ctx.fill();
      muzzle = hy;
      fx.push({ k: 'spark', x: X, y: hy, r: 22, color: bolt });
      fx.push({ k: 'spark', x: X, y: Y - 108 * s, r: 14, color: bolt });
      break;
    }
  }
  return { muzzle, fx };
}

function cloud(ctx: Ctx, x: number, y: number, r: number): void {
  glow(ctx, x, y, r * 1.6, '#8fd8ff', 0.3);
  const puffs: [number, number, number][] = [
    [-0.55, 0.1, 0.45],
    [0.55, 0.12, 0.42],
    [-0.2, -0.2, 0.55],
    [0.25, -0.15, 0.5],
    [0, 0.2, 0.5],
  ];
  for (const [dx, dy, pr] of puffs) {
    const g = ctx.createRadialGradient(x + dx * r - pr * r * 0.3, y + dy * r - pr * r * 0.4, 2, x + dx * r, y + dy * r, pr * r);
    g.addColorStop(0, '#8a96b0');
    g.addColorStop(1, '#2c3448');
    ctx.fillStyle = g;
    ellipse(ctx, x + dx * r, y + dy * r, pr * r, pr * r * 0.8);
    ctx.fill();
    outline(ctx, 1.6);
  }
  ctx.save();
  ctx.shadowColor = '#fff6a0';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#fff6a0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.1, y + r * 0.2);
  ctx.lineTo(x + r * 0.08, y + r * 0.45);
  ctx.lineTo(x - r * 0.05, y + r * 0.5);
  ctx.lineTo(x + r * 0.12, y + r * 0.8);
  ctx.stroke();
  ctx.restore();
}
