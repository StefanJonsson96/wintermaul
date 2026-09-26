// Frostborn: a frozen citadel. Dark blue stone footings rimmed with icicles, towers of clear
// glacial ice with glowing runes, and crystals that grow wilder with every tier.
import {
  alpha,
  block,
  type Build,
  contactShadow,
  crystal,
  type Ctx,
  cylinder,
  ellipse,
  glow,
  outline,
  polySlab,
  rune,
  roundRect,
  seeded,
  shade,
  type Spec,
  taperedPrism,
  window_,
} from './common';

const ICE = '#d6f1ff';
const ICE_MID = '#8fcaf0';
const ICE_DEEP = '#3f7fc4';
const STONE = '#2f4a70';
const STONE_TOP = '#5f7fa8';
const RUNE = '#8ff0ff';

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  const rx = 50 + Math.min(tier, 4) * 1.5;
  const ry = 31 + Math.min(tier, 4);
  contactShadow(ctx, X, Y + 6, rx * 2, ry * 2);
  polySlab(ctx, X, Y + 5, rx, ry, 13, 8, STONE_TOP, STONE, Math.PI / 8);
  // snow cap on the slab
  ctx.fillStyle = 'rgba(240,248,255,0.85)';
  ellipse(ctx, X - rx * 0.35, Y + 5 - ry * 0.55, rx * 0.3, 4);
  ctx.fill();
  ellipse(ctx, X + rx * 0.4, Y + 5 - ry * 0.45, rx * 0.18, 3);
  ctx.fill();
  // icicles hanging off the front edge
  const rnd = seeded(tier * 31 + p.def.id.length);
  for (let i = 0; i < 9; i++) {
    const x = X - rx * 0.8 + (i / 8) * rx * 1.6;
    const top = Y + 5 + ry * 0.92 + 11 - Math.abs(x - X) * 0.12;
    const len = 5 + rnd() * 9;
    ctx.fillStyle = alpha(ICE, 0.95);
    ctx.beginPath();
    ctx.moveTo(x - 2.5, top);
    ctx.lineTo(x, top + len);
    ctx.lineTo(x + 2.5, top);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,14,28,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // runes on the skirt
  for (let i = 0; i < Math.min(3, tier); i++) rune(ctx, X - 14 + i * 14, Y + 5 + ry + 4, 6, RUNE, i + tier);
}

function iceTower(ctx: Ctx, x: number, baseY: number, rx: number, h: number): void {
  cylinder(ctx, x, baseY, rx, h, ICE_MID, ICE);
  // frosted bands
  ctx.strokeStyle = alpha('#ffffff', 0.55);
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x, baseY - (h * i) / 3, rx, rx * 0.42, 0, 0.05, Math.PI - 0.05);
    ctx.stroke();
  }
}

function shards(ctx: Ctx, x: number, baseY: number, w: number, h: number, n: number, seed: number): void {
  const rnd = seeded(seed);
  const list: [number, number, number, number][] = [];
  for (let i = 1; i < n; i++) {
    const side = i % 2 ? -1 : 1;
    const off = side * (10 + ((i + 1) >> 1) * w * 0.45);
    list.push([x + off, h * (0.45 + rnd() * 0.25), w * (0.6 + rnd() * 0.2), side * (6 + rnd() * 8)]);
  }
  list.sort((a, b) => Math.abs(b[0] - x) - Math.abs(a[0] - x));
  for (const [sx, sh, sw, lean] of list) crystal(ctx, sx, baseY + 2, sw, sh, lean, ICE, ICE_DEEP);
  crystal(ctx, x, baseY + 4, w, h, 2, shade(ICE, 0.2), ICE_DEEP);
}

export function drawFrost(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot } = p;
  const fx: Build['fx'] = [];
  let muzzle = Y - 60;
  let head: number | undefined;
  switch (slot) {
    case '1': {
      glow(ctx, X, Y - 30, 50, RUNE, 0.3);
      shards(ctx, X, Y, 26 * s, 62 * s, 3, 11);
      muzzle = Y - 62 * s;
      break;
    }
    case '2a': {
      taperedPrism(ctx, X, Y + 2, 50 * s, 44 * s, 14 * s, shade(STONE_TOP, -0.1));
      iceTower(ctx, X, Y - 10 * s, 19 * s, 62 * s);
      window_(ctx, X - 6 * s, Y - 40 * s, 7 * s, 12 * s, RUNE);
      window_(ctx, X + 8 * s, Y - 52 * s, 6 * s, 10 * s, RUNE);
      crystal(ctx, X, Y - 70 * s, 34 * s, 46 * s, 1, ICE, ICE_DEEP);
      muzzle = Y - 112 * s;
      fx.push({ k: 'glow', x: X, y: muzzle + 10, r: 26, color: RUNE });
      break;
    }
    case '3a': {
      taperedPrism(ctx, X, Y + 2, 56 * s, 50 * s, 14 * s, shade(STONE_TOP, -0.15));
      taperedPrism(ctx, X, Y - 12 * s, 36 * s, 16 * s, 96 * s, ICE_MID, 18 * s);
      for (let i = 0; i < 4; i++) rune(ctx, X - 7 * s, Y - 30 * s - i * 20 * s, 8 * s, RUNE, i);
      crystal(ctx, X - 30 * s, Y + 2, 12 * s, 34 * s, -6, ICE, ICE_DEEP);
      crystal(ctx, X + 28 * s, Y + 2, 10 * s, 28 * s, 5, ICE, ICE_DEEP);
      muzzle = Y - 128 * s;
      fx.push({ k: 'orbit', x: X, y: Y - 88 * s, r: 30 * s, color: ICE, n: 3, size: 5 });
      fx.push({ k: 'glow', x: X, y: muzzle + 8, r: 28, color: RUNE });
      break;
    }
    case '4a': {
      // a jagged citadel of three spires
      glow(ctx, X, Y - 70 * s, 90 * s, RUNE, 0.25);
      crystal(ctx, X - 30 * s, Y + 2, 26 * s, 92 * s, -8, ICE, ICE_DEEP);
      crystal(ctx, X + 30 * s, Y + 2, 24 * s, 84 * s, 8, ICE, ICE_DEEP);
      shards(ctx, X, Y, 34 * s, 138 * s, 5, 47);
      crystal(ctx, X - 12 * s, Y + 6, 14 * s, 40 * s, -4, ICE, ICE_MID);
      crystal(ctx, X + 14 * s, Y + 6, 12 * s, 34 * s, 4, ICE, ICE_MID);
      muzzle = Y - 138 * s;
      fx.push({ k: 'orbit', x: X, y: Y - 100 * s, r: 42 * s, color: ICE, n: 5, size: 5 });
      fx.push({ k: 'snow', x: X, y: Y - 70 * s, r: 55 * s });
      fx.push({ k: 'glow', x: X, y: muzzle + 12, r: 36, color: RUNE });
      break;
    }
    case '2b': {
      // an ice-block pedestal for a snowball catapult
      block(ctx, X, Y + 2, 46 * s, 22 * s, 16 * s, ICE_MID);
      ctx.fillStyle = alpha('#ffffff', 0.5);
      ctx.fillRect(X - 20 * s, Y - 16 * s, 40 * s, 3);
      block(ctx, X - 16 * s, Y - 20 * s, 8 * s, 18 * s, 6, '#6b4a2e');
      block(ctx, X + 14 * s, Y - 20 * s, 8 * s, 18 * s, 6, '#6b4a2e');
      head = Y - 44 * s;
      muzzle = head;
      break;
    }
    case '3b': {
      // a pole wrapped in rings of ice, a storm of snow above
      cylinder(ctx, X, Y + 2, 22 * s, 10 * s, shade(STONE_TOP, -0.1));
      cylinder(ctx, X, Y - 8 * s, 6 * s, 86 * s, '#8aa7c4');
      for (let i = 0; i < 3; i++) {
        const ry = Y - 26 * s - i * 24 * s;
        const rr = (24 - i * 4) * s;
        ctx.lineWidth = 7 * s;
        ctx.strokeStyle = ICE_DEEP;
        ellipse(ctx, X, ry + 2, rr, rr * 0.36);
        ctx.stroke();
        ctx.lineWidth = 5 * s;
        ctx.strokeStyle = ICE;
        ellipse(ctx, X, ry, rr, rr * 0.36);
        ctx.stroke();
      }
      crystal(ctx, X, Y - 90 * s, 14 * s, 24 * s, 0, ICE, ICE_DEEP);
      muzzle = Y - 110 * s;
      fx.push({ k: 'snow', x: X, y: Y - 60 * s, r: 48 * s });
      fx.push({ k: 'glow', x: X, y: Y - 104 * s, r: 30, color: RUNE });
      break;
    }
    case '4b': {
      // four ice pillars guarding a floating heart of winter
      for (const [dx, dy, h] of [
        [-30, -10, 78],
        [30, -10, 72],
        [-36, 10, 62],
        [36, 10, 58],
      ] as const) {
        taperedPrism(ctx, X + dx * s, Y + dy * s * 0.6, 14 * s, 9 * s, h * s, ICE_MID, 8 * s);
      }
      muzzle = Y - 88 * s;
      fx.push({ k: 'orb', x: X, y: muzzle, r: 17 * s, color: ICE, ring: true, bob: 4 });
      fx.push({ k: 'snow', x: X, y: Y - 50 * s, r: 50 * s });
      break;
    }
    case 'L': {
      // the Glacial Colossus: a mountain of ice with a crown of shards
      block(ctx, X, Y + 4, 84 * s, 14 * s, 18, STONE_TOP);
      glow(ctx, X, Y - 90, 110, RUNE, 0.28);
      shards(ctx, X, Y - 10 * s, 46 * s, 128 * s, 6, 77);
      crystal(ctx, X - 44 * s, Y - 4, 22 * s, 70 * s, -10, ICE, ICE_DEEP);
      crystal(ctx, X + 44 * s, Y - 4, 22 * s, 64 * s, 10, ICE, ICE_DEEP);
      muzzle = Y - 136 * s;
      fx.push({ k: 'orbit', x: X, y: Y - 104 * s, r: 50 * s, color: ICE, n: 6, size: 6 });
      fx.push({ k: 'snow', x: X, y: Y - 80 * s, r: 70 * s });
      fx.push({ k: 'glow', x: X, y: muzzle + 14, r: 44, color: RUNE });
      break;
    }
  }
  return { muzzle, head, fx };
}

/** Snowball catapult arm. */
export function frostHead(ctx: Ctx, p: Spec): void {
  const s = p.s;
  ctx.fillStyle = '#7a5634';
  roundRect(ctx, 50, 60, 44 * s, 8, 3);
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = '#5a3d24';
  ctx.beginPath();
  ctx.arc(52, 64, 9, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx, 1.6);
  const bx = 50 + 44 * s;
  ctx.fillStyle = '#4a3420';
  ellipse(ctx, bx, 64, 11, 9);
  ctx.fill();
  const g = ctx.createRadialGradient(bx - 4, 60, 2, bx, 64, 12);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#a8d4f2');
  ctx.fillStyle = g;
  ellipse(ctx, bx, 62, 10, 9.5);
  ctx.fill();
  outline(ctx, 1.4);
}
