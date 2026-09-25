// Venomkin: the swamp that grows. Mud mounds knotted with roots and bones, pitcher plants,
// fungal stalks and cauldrons of glowing green.
import {
  alpha,
  type Build,
  contactShadow,
  type Ctx,
  cylinder,
  ellipse,
  glow,
  outline,
  pipe,
  roundRect,
  seeded,
  shade,
  skull,
  type Spec,
} from './common';

const MUD = '#4a3a2a';
const MUD_TOP = '#6a5438';
const BOG = '#34402c';
const PLANT = '#5c8a3a';
const PURPLE = '#8a4ab0';
const BONE = '#e2dac2';

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  const rx = 50 + Math.min(tier, 4) * 1.5;
  const ry = 30 + Math.min(tier, 4);
  contactShadow(ctx, X, Y + 6, rx * 2, ry * 2);
  // a lumpy mud mound
  ctx.fillStyle = shade(MUD, -0.25);
  ellipse(ctx, X, Y + 12, rx, ry * 0.9);
  ctx.fill();
  outline(ctx, 2);
  const g = ctx.createRadialGradient(X - rx * 0.3, Y - ry * 0.3, 4, X, Y + 4, rx);
  g.addColorStop(0, shade(MUD_TOP, 0.2));
  g.addColorStop(1, MUD);
  ctx.fillStyle = g;
  ellipse(ctx, X, Y + 5, rx * 0.96, ry * 0.86);
  ctx.fill();
  outline(ctx, 2);
  // a puddle of slime
  ctx.fillStyle = alpha(p.glow, 0.55);
  ellipse(ctx, X + rx * 0.45, Y + 10, rx * 0.26, ry * 0.2);
  ctx.fill();
  // roots and bones poking out
  const rnd = seeded(tier * 5 + p.def.id.length);
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const a = Math.PI * (0.15 + i * 0.35);
    ctx.beginPath();
    ctx.moveTo(X + Math.cos(a) * rx * 0.5, Y + 5 + Math.sin(a) * ry * 0.4);
    ctx.quadraticCurveTo(X + Math.cos(a) * rx * 0.9, Y + 5 + Math.sin(a) * ry * 0.5 - 6, X + Math.cos(a) * rx * 1.05, Y + 10 + Math.sin(a) * ry * 0.7);
    ctx.stroke();
  }
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 3;
  const bx = X - rx * 0.55 + rnd() * 6;
  ctx.beginPath();
  ctx.moveTo(bx, Y + 14);
  ctx.lineTo(bx + 14, Y + 6);
  ctx.stroke();
  for (let i = 0; i < Math.min(4, tier); i++) {
    ctx.fillStyle = p.glow;
    ctx.beginPath();
    ctx.arc(X + (i - (Math.min(4, tier) - 1) / 2) * 12, Y + 5 + ry * 0.9 + 9, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A carnivorous pitcher with an open, fanged mouth. */
function pitcher(ctx: Ctx, x: number, baseY: number, w: number, h: number, slime: string): number {
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, shade(PLANT, 0.25));
  g.addColorStop(1, shade(PLANT, -0.45));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, baseY);
  ctx.bezierCurveTo(x - w * 1.1, baseY - h * 0.3, x - w * 0.9, baseY - h * 0.9, x - w * 0.55, baseY - h);
  ctx.lineTo(x + w * 0.55, baseY - h);
  ctx.bezierCurveTo(x + w * 0.9, baseY - h * 0.9, x + w * 1.1, baseY - h * 0.3, x + w * 0.35, baseY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  // purple veins and spots
  ctx.fillStyle = alpha(PURPLE, 0.8);
  for (const [dx, dy, r] of [
    [-0.3, 0.45, 0.12],
    [0.25, 0.3, 0.1],
    [0.1, 0.65, 0.08],
  ] as const) {
    ellipse(ctx, x + dx * w, baseY - dy * h, r * w, r * w * 0.8);
    ctx.fill();
  }
  // the lip and mouth
  const my = baseY - h;
  ctx.fillStyle = '#2a0f2a';
  ellipse(ctx, x, my, w * 0.6, w * 0.24);
  ctx.fill();
  ctx.fillStyle = alpha(slime, 0.8);
  ellipse(ctx, x, my + 1, w * 0.4, w * 0.12);
  ctx.fill();
  ctx.strokeStyle = shade(PURPLE, -0.1);
  ctx.lineWidth = 3;
  ellipse(ctx, x, my, w * 0.62, w * 0.25);
  ctx.stroke();
  ctx.fillStyle = BONE;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.1 + i * 0.16);
    const tx = x + Math.cos(a) * w * 0.58;
    const ty = my + Math.sin(a) * w * 0.22;
    ctx.beginPath();
    ctx.moveTo(tx - 2, ty);
    ctx.lineTo(tx, ty - 6);
    ctx.lineTo(tx + 2, ty);
    ctx.fill();
  }
  return my;
}

function mushroom(ctx: Ctx, x: number, baseY: number, stemW: number, stemH: number, capR: number, cap: string, spots: string): number {
  ctx.fillStyle = '#d8cfb0';
  ctx.beginPath();
  ctx.moveTo(x - stemW / 2, baseY);
  ctx.quadraticCurveTo(x - stemW * 0.2, baseY - stemH * 0.5, x - stemW * 0.35, baseY - stemH);
  ctx.lineTo(x + stemW * 0.35, baseY - stemH);
  ctx.quadraticCurveTo(x + stemW * 0.2, baseY - stemH * 0.5, x + stemW / 2, baseY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  const cy = baseY - stemH;
  const g = ctx.createRadialGradient(x - capR * 0.35, cy - capR * 0.5, 2, x, cy - capR * 0.2, capR * 1.1);
  g.addColorStop(0, shade(cap, 0.35));
  g.addColorStop(1, shade(cap, -0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - capR, cy + 2);
  ctx.bezierCurveTo(x - capR, cy - capR * 1.1, x + capR, cy - capR * 1.1, x + capR, cy + 2);
  ctx.quadraticCurveTo(x, cy + capR * 0.28, x - capR, cy + 2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = spots;
  for (const [dx, dy, r] of [
    [-0.45, -0.3, 0.14],
    [0.1, -0.6, 0.12],
    [0.5, -0.25, 0.1],
    [-0.1, -0.2, 0.09],
  ] as const) {
    ellipse(ctx, x + dx * capR, cy + dy * capR, r * capR, r * capR * 0.8);
    ctx.fill();
  }
  return cy - capR * 0.8;
}

function serpent(ctx: Ctx, x0: number, y0: number, hx: number, hy: number, w: number, color: string, eye: string): void {
  pipe(ctx, [[x0, y0], [x0 - w * 0.6, (y0 + hy) / 2], [hx - w * 0.5, hy + w * 0.3]], w, color);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(hx - w * 0.9, hy - w * 0.6);
  ctx.lineTo(hx + w * 1.4, hy);
  ctx.lineTo(hx - w * 0.7, hy + w * 0.7);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = '#2a0f14';
  ctx.beginPath();
  ctx.moveTo(hx - w * 0.2, hy + w * 0.1);
  ctx.lineTo(hx + w * 1.3, hy + w * 0.05);
  ctx.lineTo(hx + w * 0.8, hy + w * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.moveTo(hx + w * 0.6, hy + w * 0.05);
  ctx.lineTo(hx + w * 0.72, hy + w * 0.4);
  ctx.lineTo(hx + w * 0.84, hy + w * 0.05);
  ctx.fill();
  glow(ctx, hx - w * 0.1, hy - w * 0.25, w * 0.7, eye, 1);
}

export function drawVenom(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot, glow: slime } = p;
  const fx: Build['fx'] = [];
  let muzzle = Y - 50;
  let head: number | undefined;
  switch (slot) {
    case '1': {
      muzzle = pitcher(ctx, X, Y + 2, 24 * s, 54 * s, slime);
      fx.push({ k: 'bubbles', x: X, y: muzzle, r: 12 * s, color: slime });
      break;
    }
    case '2a': {
      // a twisted fungal stalk with a glowing cap
      const top = mushroom(ctx, X, Y + 2, 16 * s, 70 * s, 34 * s, BOG, slime);
      mushroom(ctx, X - 26 * s, Y + 4, 8 * s, 18 * s, 12 * s, BOG, slime);
      mushroom(ctx, X + 24 * s, Y + 4, 7 * s, 14 * s, 10 * s, BOG, slime);
      muzzle = top;
      fx.push({ k: 'glow', x: X, y: Y - 84 * s, r: 34, color: slime });
      fx.push({ k: 'bubbles', x: X, y: Y - 66 * s, r: 24 * s, color: slime });
      break;
    }
    case '3a': {
      // the Plague Cauldron on bone legs
      for (const dx of [-24, 0, 24]) {
        ctx.strokeStyle = 'rgba(8,14,28,0.75)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(X + dx * s, Y + 4);
        ctx.lineTo(X + dx * s * 0.8, Y - 20 * s);
        ctx.stroke();
        ctx.strokeStyle = BONE;
        ctx.lineWidth = 4.5;
        ctx.stroke();
      }
      const cy = Y - 32 * s;
      const r = 36 * s;
      ctx.fillStyle = '#2c2a30';
      ctx.beginPath();
      ctx.moveTo(X - r, cy);
      ctx.bezierCurveTo(X - r * 1.1, cy + r * 0.9, X + r * 1.1, cy + r * 0.9, X + r, cy);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 2.2);
      ctx.fillStyle = '#4a4850';
      ellipse(ctx, X, cy, r, r * 0.32);
      ctx.fill();
      outline(ctx, 2);
      const g = ctx.createRadialGradient(X - 6, cy - 2, 2, X, cy, r);
      g.addColorStop(0, shade(slime, 0.5));
      g.addColorStop(1, shade(slime, -0.4));
      ctx.fillStyle = g;
      ellipse(ctx, X, cy + 1, r * 0.84, r * 0.25);
      ctx.fill();
      skull(ctx, X, cy + r * 0.42, 7 * s, BONE);
      muzzle = cy - 10 * s;
      fx.push({ k: 'bubbles', x: X, y: cy, r: 28 * s, color: slime });
      fx.push({ k: 'smoke', x: X, y: cy - 8 * s, color: shade(slime, -0.5) });
      break;
    }
    case '4a': {
      // the Blight Colossus: a totem of bone, fungus and a great skull
      cylinder(ctx, X, Y + 2, 24 * s, 88 * s, '#5a4a36');
      for (let i = 0; i < 4; i++) {
        const y = Y - 16 * s - i * 20 * s;
        ctx.fillStyle = BONE;
        ctx.fillRect(X - 24 * s, y, 48 * s, 5);
        ctx.strokeStyle = 'rgba(8,14,28,0.6)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(X - 24 * s, y, 48 * s, 5);
      }
      mushroom(ctx, X - 26 * s, Y - 40 * s, 6 * s, 10 * s, 14 * s, BOG, slime);
      mushroom(ctx, X + 26 * s, Y - 60 * s, 6 * s, 10 * s, 12 * s, PURPLE, slime);
      skull(ctx, X, Y - 104 * s, 20 * s, BONE, slime);
      for (const side of [-1, 1]) {
        ctx.strokeStyle = 'rgba(8,14,28,0.75)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(X + side * 14 * s, Y - 116 * s);
        ctx.quadraticCurveTo(X + side * 40 * s, Y - 124 * s, X + side * 36 * s, Y - 150 * s);
        ctx.stroke();
        ctx.strokeStyle = BONE;
        ctx.lineWidth = 4.5;
        ctx.stroke();
      }
      muzzle = Y - 108 * s;
      fx.push({ k: 'glow', x: X, y: muzzle, r: 38, color: slime });
      break;
    }
    case '2b': {
      // a bone frame for the sludge catapult
      for (const dx of [-16, 16]) {
        ctx.strokeStyle = 'rgba(8,14,28,0.75)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(X + dx * s, Y + 4);
        ctx.lineTo(X + dx * s * 0.4, Y - 28 * s);
        ctx.stroke();
        ctx.strokeStyle = BONE;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      skull(ctx, X, Y - 4 * s, 9 * s, BONE);
      head = Y - 34 * s;
      muzzle = head;
      break;
    }
    case '3b': {
      // the Crawler Nest: a hive mound riddled with glowing holes
      ctx.fillStyle = '#5a4630';
      ctx.beginPath();
      ctx.moveTo(X - 44 * s, Y + 4);
      ctx.bezierCurveTo(X - 44 * s, Y - 70 * s, X + 44 * s, Y - 70 * s, X + 44 * s, Y + 4);
      ctx.closePath();
      const g = ctx.createRadialGradient(X - 12 * s, Y - 44 * s, 4, X, Y - 20 * s, 50 * s);
      g.addColorStop(0, '#8a6e48');
      g.addColorStop(1, '#3e3020');
      ctx.fillStyle = g;
      ctx.fill();
      outline(ctx, 2.2);
      const holes: [number, number, number][] = [
        [-18, -18, 8],
        [14, -28, 7],
        [-4, -44, 6],
        [24, -8, 6],
      ];
      for (const [dx, dy, r] of holes) {
        ctx.fillStyle = '#140c08';
        ellipse(ctx, X + dx * s, Y + dy * s, r * s, r * s * 0.7);
        ctx.fill();
        glow(ctx, X + dx * s - 1.5, Y + dy * s, r * s * 0.7, slime, 0.9);
        glow(ctx, X + dx * s + 2, Y + dy * s, r * s * 0.7, slime, 0.9);
      }
      muzzle = Y - 50 * s;
      fx.push({ k: 'glow', x: X, y: Y - 30 * s, r: 30, color: slime });
      break;
    }
    case '4b': {
      // the Hydra Den: three serpents rising from the mound
      ctx.fillStyle = '#4a3a2a';
      ellipse(ctx, X, Y - 6 * s, 40 * s, 18 * s);
      ctx.fill();
      outline(ctx, 2);
      serpent(ctx, X - 16 * s, Y - 6 * s, X - 26 * s, Y - 70 * s, 11 * s, PLANT, slime);
      serpent(ctx, X + 16 * s, Y - 6 * s, X + 20 * s, Y - 62 * s, 11 * s, shade(PLANT, -0.1), slime);
      serpent(ctx, X, Y - 4 * s, X - 2 * s, Y - 96 * s, 13 * s, shade(PLANT, 0.1), slime);
      muzzle = Y - 96 * s;
      break;
    }
    case 'L': {
      // the Mother of Plagues: a pulsing brood bulb in a nest of roots
      const cy = Y - 56 * s;
      const r = 44 * s;
      const g = ctx.createRadialGradient(X - r * 0.3, cy - r * 0.4, 4, X, cy, r * 1.1);
      g.addColorStop(0, shade(slime, 0.3));
      g.addColorStop(0.4, PLANT);
      g.addColorStop(1, '#23301c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(X - r * 0.6, Y + 4);
      ctx.bezierCurveTo(X - r * 1.3, cy + r * 0.2, X - r * 0.9, cy - r * 1.1, X, cy - r);
      ctx.bezierCurveTo(X + r * 0.9, cy - r * 1.1, X + r * 1.3, cy + r * 0.2, X + r * 0.6, Y + 4);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 2.4);
      ctx.strokeStyle = alpha(PURPLE, 0.8);
      ctx.lineWidth = 3;
      for (const k of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(X + k * r, Y);
        ctx.quadraticCurveTo(X + k * r * 1.4, cy, X + k * r * 0.4, cy - r * 0.9);
        ctx.stroke();
      }
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.9 + i * 0.45;
        ctx.fillStyle = shade(slime, 0.2);
        ellipse(ctx, X + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.6 + 10, 5 * s, 4 * s);
        ctx.fill();
      }
      muzzle = cy - r * 0.9;
      fx.push({ k: 'bubbles', x: X, y: cy - r * 0.6, r: 40 * s, color: slime });
      fx.push({ k: 'glow', x: X, y: cy, r: 60, color: slime });
      break;
    }
  }
  return { muzzle, head, fx };
}

/** Bone catapult arm with a sack of sludge. */
export function venomHead(ctx: Ctx, p: Spec): void {
  const s = p.s;
  ctx.strokeStyle = 'rgba(8,14,28,0.75)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(52, 64);
  ctx.lineTo(52 + 42 * s, 64);
  ctx.stroke();
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 6;
  ctx.stroke();
  const bx = 58 + 42 * s;
  ctx.fillStyle = '#2a3a1a';
  ellipse(ctx, bx, 64, 12, 10);
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = shade(p.glow, 0.1);
  ellipse(ctx, bx, 61, 9, 6);
  ctx.fill();
  ctx.fillStyle = BONE;
  roundRect(ctx, 44, 57, 14, 14, 5);
  ctx.fill();
  outline(ctx, 1.4);
}
