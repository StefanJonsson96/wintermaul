// Emberforge: a dwarven forge. Riveted black iron, brass bands, furnace mouths and chimneys,
// and molten seams glowing through every plate.
import {
  alpha,
  block,
  type Build,
  contactShadow,
  type Ctx,
  cylinder,
  dome,
  ellipse,
  glow,
  outline,
  pipe,
  rivets,
  roundRect,
  seeded,
  shade,
  slab,
  type Spec,
  taperedPrism,
  window_,
} from './common';

const IRON = '#3b3534';
const IRON_TOP = '#5c5450';
const BRASS = '#c8943a';
const LAVA = '#ff7a2a';
const EMBER = '#ffc05a';

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  const w = 96 + Math.min(tier, 4) * 3;
  const h = 62 + Math.min(tier, 4) * 2;
  contactShadow(ctx, X, Y + 6, w, h);
  slab(ctx, X, Y + 6, w, h, 14, IRON_TOP, IRON, 8);
  // molten seam along the front plate
  ctx.save();
  ctx.shadowColor = LAVA;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = LAVA;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(X - w / 2 + 10, Y + 6 + h / 2 + 8);
  for (let i = 1; i <= 6; i++) ctx.lineTo(X - w / 2 + 10 + (i * (w - 20)) / 6, Y + 6 + h / 2 + (i % 2 ? 5 : 9));
  ctx.stroke();
  ctx.restore();
  // brass corner caps and rivets
  for (const side of [-1, 1]) {
    ctx.fillStyle = BRASS;
    roundRect(ctx, X + side * (w / 2 - 7) - 6, Y + 6 - h / 2 + 4, 12, h - 8, 4);
    ctx.fill();
    outline(ctx, 1.4);
  }
  rivets(ctx, X - w / 2 + 16, Y + 6 - h / 2 + 7, X + w / 2 - 16, Y + 6 - h / 2 + 7, 6, '#8d8580', 1.8);
  // plate seams on top
  ctx.strokeStyle = 'rgba(12,10,10,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X - 8, Y + 6 - h / 2 + 2);
  ctx.lineTo(X - 8, Y + 6 + h / 2 - 2);
  ctx.stroke();
  // tier pips as glowing coals
  for (let i = 0; i < Math.min(4, tier); i++) {
    const x = X + (i - (Math.min(4, tier) - 1) / 2) * 12;
    ctx.fillStyle = EMBER;
    ctx.beginPath();
    ctx.arc(x, Y + 6 + h / 2 + 12, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function brassBand(ctx: Ctx, x: number, y: number, rx: number): void {
  ctx.strokeStyle = 'rgba(8,14,28,0.75)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.42, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 4;
  ctx.stroke();
}

function bowl(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.fillStyle = shade(IRON, -0.2);
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.bezierCurveTo(x - r * 0.8, y + r * 0.8, x + r * 0.8, y + r * 0.8, x + r, y);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = BRASS;
  ellipse(ctx, x, y, r, r * 0.34);
  ctx.fill();
  outline(ctx, 2);
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, '#fff3c4');
  g.addColorStop(0.35, EMBER);
  g.addColorStop(1, '#8a2a0a');
  ctx.fillStyle = g;
  ellipse(ctx, x, y, r * 0.84, r * 0.27);
  ctx.fill();
}

export function drawFire(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot } = p;
  const fx: Build['fx'] = [];
  let muzzle = Y - 60;
  let head: number | undefined;
  switch (slot) {
    case '1': {
      // a cinder pot on three stubby legs
      for (const dx of [-16, 0, 16]) {
        ctx.fillStyle = shade(IRON, -0.3);
        ctx.fillRect(X + dx * s - 3, Y - 12 * s, 6, 14 * s);
      }
      bowl(ctx, X, Y - 22 * s, 30 * s);
      muzzle = Y - 34 * s;
      fx.push({ k: 'flame', x: X, y: Y - 24 * s, w: 30 * s, h: 26 * s, n: 3, color: LAVA, core: EMBER });
      break;
    }
    case '2a': {
      cylinder(ctx, X, Y + 2, 22 * s, 12 * s, IRON_TOP);
      cylinder(ctx, X, Y - 10 * s, 13 * s, 48 * s, IRON);
      brassBand(ctx, X, Y - 22 * s, 13 * s);
      brassBand(ctx, X, Y - 44 * s, 13 * s);
      bowl(ctx, X, Y - 62 * s, 34 * s);
      muzzle = Y - 82 * s;
      fx.push({ k: 'flame', x: X, y: Y - 64 * s, w: 38 * s, h: 40 * s, n: 4, color: LAVA, core: EMBER });
      break;
    }
    case '3a': {
      // a pit of lava with a salamander coiled on the rim
      ctx.fillStyle = shade(IRON, -0.1);
      ellipse(ctx, X, Y - 4, 44 * s, 22 * s);
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = IRON_TOP;
      ellipse(ctx, X, Y - 10 * s, 44 * s, 20 * s);
      ctx.fill();
      outline(ctx, 2);
      const g = ctx.createRadialGradient(X - 8, Y - 14 * s, 2, X, Y - 10 * s, 38 * s);
      g.addColorStop(0, '#fff0b0');
      g.addColorStop(0.4, EMBER);
      g.addColorStop(1, '#a8300a');
      ctx.fillStyle = g;
      ellipse(ctx, X, Y - 10 * s, 36 * s, 15 * s);
      ctx.fill();
      rivets(ctx, X - 36 * s, Y - 2, X + 36 * s, Y - 2, 7, '#8d8580', 1.6);
      // salamander
      ctx.fillStyle = '#e0501a';
      ctx.beginPath();
      ctx.moveTo(X + 30 * s, Y - 16 * s);
      ctx.quadraticCurveTo(X + 42 * s, Y - 40 * s, X + 18 * s, Y - 46 * s);
      ctx.quadraticCurveTo(X + 8 * s, Y - 48 * s, X + 4 * s, Y - 40 * s);
      ctx.quadraticCurveTo(X + 20 * s, Y - 40 * s, X + 26 * s, Y - 20 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.6);
      ctx.fillStyle = '#ffd35a';
      ctx.beginPath();
      ctx.arc(X + 10 * s, Y - 44 * s, 2.4, 0, Math.PI * 2);
      ctx.fill();
      muzzle = Y - 40 * s;
      fx.push({ k: 'bubbles', x: X, y: Y - 12 * s, r: 30 * s, color: EMBER });
      fx.push({ k: 'flame', x: X - 10 * s, y: Y - 12 * s, w: 30 * s, h: 22 * s, n: 3, color: LAVA, core: EMBER });
      break;
    }
    case '4a': {
      // the Inferno Engine: a furnace block with chimneys and a flamethrower on top
      block(ctx, X - 2, Y + 4, 64 * s, 44 * s, 20 * s, IRON);
      window_(ctx, X - 2, Y - 14 * s, 26 * s, 22 * s, LAVA, '#1a1414');
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 3;
      ctx.strokeRect(X - 34 * s, Y - 40 * s, 64 * s, 44 * s);
      rivets(ctx, X - 28 * s, Y - 34 * s, X + 24 * s, Y - 34 * s, 5, '#b8b0a8', 1.8);
      pipe(ctx, [[X - 26 * s, Y - 40 * s], [X - 26 * s, Y - 78 * s]], 9 * s, IRON_TOP);
      pipe(ctx, [[X + 22 * s, Y - 40 * s], [X + 22 * s, Y - 70 * s]], 8 * s, IRON_TOP);
      cylinder(ctx, X, Y - 40 * s, 16 * s, 8 * s, BRASS);
      head = Y - 56 * s;
      muzzle = head;
      fx.push({ k: 'smoke', x: X - 26 * s, y: Y - 80 * s });
      fx.push({ k: 'smoke', x: X + 22 * s, y: Y - 72 * s });
      fx.push({ k: 'glow', x: X - 2, y: Y - 14 * s, r: 30 * s, color: LAVA });
      break;
    }
    case '2b': {
      // an iron observatory with a brass telescope aimed at the sky
      cylinder(ctx, X, Y + 2, 30 * s, 34 * s, IRON);
      window_(ctx, X - 10 * s, Y - 14 * s, 8 * s, 12 * s, LAVA, '#1a1414');
      dome(ctx, X, Y - 32 * s, 30 * s, 24 * s, BRASS);
      ctx.save();
      ctx.translate(X + 6 * s, Y - 46 * s);
      ctx.rotate(-0.9);
      ctx.fillStyle = shade(BRASS, -0.15);
      roundRect(ctx, -6 * s, -7 * s, 46 * s, 14 * s, 4);
      ctx.fill();
      outline(ctx, 1.8);
      ctx.fillStyle = '#1a1414';
      ellipse(ctx, 40 * s, 0, 3, 7 * s);
      ctx.fill();
      ctx.restore();
      muzzle = Y - 84 * s;
      fx.push({ k: 'glow', x: X + 26 * s, y: Y - 80 * s, r: 18, color: EMBER });
      break;
    }
    case '3b': {
      // a squat bunker for the magma mortar
      block(ctx, X - 2, Y + 4, 62 * s, 26 * s, 18 * s, IRON);
      ctx.fillStyle = BRASS;
      ctx.fillRect(X - 33 * s, Y - 16 * s, 62 * s, 5);
      rivets(ctx, X - 28 * s, Y - 6 * s, X + 24 * s, Y - 6 * s, 6, '#b8b0a8', 1.8);
      cylinder(ctx, X, Y - 22 * s, 22 * s, 8 * s, IRON_TOP);
      head = Y - 36 * s;
      muzzle = head;
      break;
    }
    case '4b': {
      // a volcano in an iron ring
      const rnd = seeded(91);
      ctx.fillStyle = '#4a3a36';
      ctx.beginPath();
      ctx.moveTo(X - 54 * s, Y + 6);
      ctx.lineTo(X - 14 * s, Y - 72 * s);
      ctx.lineTo(X + 16 * s, Y - 72 * s);
      ctx.lineTo(X + 54 * s, Y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2c2220';
      ctx.beginPath();
      ctx.moveTo(X + 2, Y + 8);
      ctx.lineTo(X + 16 * s, Y - 72 * s);
      ctx.lineTo(X + 54 * s, Y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X - 54 * s, Y + 6);
      ctx.lineTo(X - 14 * s, Y - 72 * s);
      ctx.lineTo(X + 16 * s, Y - 72 * s);
      ctx.lineTo(X + 54 * s, Y + 6);
      outline(ctx, 2.2);
      ctx.fillStyle = EMBER;
      ellipse(ctx, X + 1, Y - 72 * s, 15 * s, 5 * s);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = LAVA;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = LAVA;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X - 6 * s, Y - 68 * s);
      ctx.lineTo(X - 16 * s, Y - 36 * s + rnd() * 6);
      ctx.lineTo(X - 12 * s, Y - 8 * s);
      ctx.moveTo(X + 6 * s, Y - 66 * s);
      ctx.lineTo(X + 18 * s, Y - 30 * s);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(X, Y, 50 * s, 12 * s, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
      muzzle = Y - 76 * s;
      fx.push({ k: 'glow', x: X, y: Y - 76 * s, r: 40, color: LAVA });
      fx.push({ k: 'smoke', x: X, y: Y - 80 * s, color: '#3a3238' });
      break;
    }
    case 'L': {
      // the Phoenix Aerie: a forged spire crowned by a firebird's nest
      taperedPrism(ctx, X, Y + 4, 60 * s, 50 * s, 18 * s, IRON_TOP);
      taperedPrism(ctx, X, Y - 12 * s, 38 * s, 24 * s, 92 * s, IRON);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = BRASS;
        ctx.fillRect(X - (19 - i * 2) * s, Y - (30 + i * 26) * s, (38 - i * 4) * s, 5);
      }
      window_(ctx, X - 4 * s, Y - 50 * s, 8 * s, 16 * s, LAVA, '#1a1414');
      // wings of flame
      for (const side of [-1, 1]) {
        const g = ctx.createLinearGradient(X, Y - 110 * s, X + side * 60 * s, Y - 140 * s);
        g.addColorStop(0, EMBER);
        g.addColorStop(1, alpha(LAVA, 0.2));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(X + side * 8 * s, Y - 108 * s);
        ctx.quadraticCurveTo(X + side * 40 * s, Y - 150 * s, X + side * 66 * s, Y - 146 * s);
        ctx.quadraticCurveTo(X + side * 44 * s, Y - 128 * s, X + side * 52 * s, Y - 118 * s);
        ctx.quadraticCurveTo(X + side * 30 * s, Y - 112 * s, X + side * 12 * s, Y - 100 * s);
        ctx.closePath();
        ctx.fill();
      }
      bowl(ctx, X, Y - 104 * s, 30 * s);
      muzzle = Y - 128 * s;
      fx.push({ k: 'flame', x: X, y: Y - 106 * s, w: 36 * s, h: 50 * s, n: 5, color: LAVA, core: EMBER });
      break;
    }
  }
  return { muzzle, head, fx };
}

export function fireHead(ctx: Ctx, p: Spec): void {
  const s = p.s;
  if (p.slot === '4a') {
    // flamethrower nozzle with a fuel tank
    ctx.fillStyle = shade(IRON, 0.1);
    roundRect(ctx, 40, 52, 30, 24, 8);
    ctx.fill();
    outline(ctx, 1.8);
    ctx.fillStyle = '#b8301a';
    roundRect(ctx, 34, 56, 10, 16, 4);
    ctx.fill();
    outline(ctx, 1.4);
    ctx.fillStyle = BRASS;
    roundRect(ctx, 64, 58, 34 * s, 12, 3);
    ctx.fill();
    outline(ctx, 1.6);
    ctx.fillStyle = '#1a1414';
    roundRect(ctx, 62 + 34 * s, 56, 8, 16, 3);
    ctx.fill();
    ctx.fillStyle = EMBER;
    ellipse(ctx, 70 + 34 * s, 64, 3, 5);
    ctx.fill();
    return;
  }
  // magma mortar: a fat barrel with a glowing mouth
  const len = 30 * s;
  ctx.fillStyle = shade(IRON, 0.05);
  roundRect(ctx, 56, 50, len, 28, 8);
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = BRASS;
  ctx.fillRect(60, 50, 5, 28);
  ctx.fillRect(56 + len - 10, 50, 5, 28);
  ctx.fillStyle = '#1a1010';
  ellipse(ctx, 56 + len, 64, 5, 12);
  ctx.fill();
  ctx.fillStyle = LAVA;
  ellipse(ctx, 56 + len, 64, 3, 8);
  ctx.fill();
  ctx.fillStyle = IRON_TOP;
  ctx.beginPath();
  ctx.arc(60, 64, 14, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx, 1.8);
  glow(ctx, 56 + len, 64, 14, LAVA, 0.5);
}
