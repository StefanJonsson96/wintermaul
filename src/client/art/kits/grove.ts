// Wildgrove: the forest walks. Mossy mounds knotted with roots, thorny saplings that grow into
// treants with glowing eyes, bramble thickets and giant mushrooms.
import {
  alpha,
  type Build,
  contactShadow,
  type Ctx,
  ellipse,
  foliage,
  glow,
  outline,
  seeded,
  shade,
  type Spec,
  trunk,
} from './common';

const BARK = '#6b4a30';
const LEAF = '#4f9a3a';
const LEAF_DARK = '#2f6a2a';
const MOSS = '#7ab04a';
const EARTH = '#5a4430';
const FLOWER = '#ff9ad8';

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  const rx = 50 + Math.min(tier, 4) * 1.5;
  const ry = 30 + Math.min(tier, 4);
  contactShadow(ctx, X, Y + 6, rx * 2, ry * 2);
  ctx.fillStyle = shade(EARTH, -0.2);
  ellipse(ctx, X, Y + 12, rx, ry * 0.88);
  ctx.fill();
  outline(ctx, 2);
  const g = ctx.createRadialGradient(X - rx * 0.3, Y - ry * 0.2, 4, X, Y + 6, rx);
  g.addColorStop(0, shade(MOSS, 0.15));
  g.addColorStop(1, shade(MOSS, -0.3));
  ctx.fillStyle = g;
  ellipse(ctx, X, Y + 5, rx * 0.95, ry * 0.8);
  ctx.fill();
  outline(ctx, 2);
  // roots spilling over the edge
  ctx.strokeStyle = shade(BARK, -0.1);
  ctx.lineWidth = 3.5;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (0.12 + i * 0.25);
    ctx.beginPath();
    ctx.moveTo(X + Math.cos(a) * rx * 0.3, Y + 5 + Math.sin(a) * ry * 0.3);
    ctx.quadraticCurveTo(X + Math.cos(a) * rx * 0.8, Y + 2 + Math.sin(a) * ry * 0.6, X + Math.cos(a) * rx * 1.02, Y + 12 + Math.sin(a) * ry * 0.75);
    ctx.stroke();
  }
  const rnd = seeded(tier * 3 + p.def.id.length * 11);
  for (let i = 0; i < 4 + tier; i++) {
    const x = X + (rnd() - 0.5) * rx * 1.6;
    const y = Y + 5 + (rnd() - 0.3) * ry * 1.1;
    ctx.fillStyle = rnd() > 0.5 ? FLOWER : '#fff0a0';
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function thorns(ctx: Ctx, x: number, y: number, h: number, rnd: () => number): void {
  ctx.fillStyle = '#d8c79a';
  for (let i = 0; i < 6; i++) {
    const ty = y - rnd() * h;
    const side = i % 2 ? -1 : 1;
    const tx = x + side * (4 + rnd() * 4);
    ctx.beginPath();
    ctx.moveTo(tx, ty - 2);
    ctx.lineTo(tx + side * 7, ty - 5);
    ctx.lineTo(tx, ty + 2);
    ctx.fill();
  }
}

/** Treant face: knots for eyes that glow, a gnarled mouth. */
function face(ctx: Ctx, x: number, y: number, r: number, eye: string): void {
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#1e140c';
    ellipse(ctx, x + side * r * 0.42, y, r * 0.24, r * 0.2);
    ctx.fill();
    glow(ctx, x + side * r * 0.42, y, r * 0.35, eye, 1);
    ctx.strokeStyle = shade(BARK, -0.45);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + side * r * 0.75, y - r * 0.35);
    ctx.lineTo(x + side * r * 0.15, y - r * 0.18);
    ctx.stroke();
  }
  ctx.fillStyle = '#1e140c';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.35, y + r * 0.45);
  ctx.quadraticCurveTo(x, y + r * 0.3, x + r * 0.35, y + r * 0.5);
  ctx.quadraticCurveTo(x, y + r * 0.72, x - r * 0.35, y + r * 0.45);
  ctx.fill();
}

function branch(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number): void {
  for (const [lw, col] of [
    [w + 3, 'rgba(8,14,28,0.75)'],
    [w, BARK],
  ] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, y0 - Math.abs(x1 - x0) * 0.35, x1, y1);
    ctx.stroke();
  }
}

export function drawGrove(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot, glow: wisp } = p;
  const fx: Build['fx'] = [];
  const rnd = seeded(p.def.id.length * 17 + p.tier);
  let muzzle = Y - 60;
  switch (slot) {
    case '1': {
      // a thorny sapling
      trunk(ctx, X, Y + 2, 12 * s, 7 * s, 40 * s, BARK, 3);
      thorns(ctx, X + 1, Y - 6 * s, 30 * s, rnd);
      foliage(ctx, X + 3 * s, Y - 50 * s, 22 * s, LEAF, rnd, 5);
      muzzle = Y - 56 * s;
      break;
    }
    case '2a': {
      // the Briar Archer: a leaning tree that draws its branches like a bow
      trunk(ctx, X, Y + 2, 18 * s, 10 * s, 58 * s, BARK, 6);
      thorns(ctx, X + 2, Y - 10 * s, 44 * s, rnd);
      ctx.strokeStyle = 'rgba(8,14,28,0.75)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(X - 16 * s, Y - 84 * s);
      ctx.quadraticCurveTo(X + 30 * s, Y - 62 * s, X - 14 * s, Y - 34 * s);
      ctx.stroke();
      ctx.strokeStyle = BARK;
      ctx.lineWidth = 4.5;
      ctx.stroke();
      ctx.strokeStyle = '#e8e0c8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(X - 16 * s, Y - 84 * s);
      ctx.lineTo(X - 14 * s, Y - 34 * s);
      ctx.stroke();
      foliage(ctx, X + 6 * s, Y - 70 * s, 26 * s, LEAF, rnd, 6);
      muzzle = Y - 74 * s;
      break;
    }
    case '3a': {
      // the Elder Treant, face in the bark and arms like clubs
      trunk(ctx, X, Y + 2, 36 * s, 26 * s, 76 * s, BARK);
      branch(ctx, X - 12 * s, Y - 50 * s, X - 42 * s, Y - 30 * s, 8 * s);
      branch(ctx, X + 12 * s, Y - 54 * s, X + 44 * s, Y - 36 * s, 8 * s);
      face(ctx, X, Y - 44 * s, 16 * s, wisp);
      foliage(ctx, X, Y - 90 * s, 36 * s, LEAF_DARK, rnd, 7);
      muzzle = Y - 96 * s;
      fx.push({ k: 'glow', x: X, y: Y - 44 * s, r: 26, color: wisp });
      break;
    }
    case '4a': {
      // the Ancient of Wrath: arms raised, crown of leaves ablaze with spirit lights
      trunk(ctx, X, Y + 4, 48 * s, 34 * s, 92 * s, shade(BARK, -0.05));
      branch(ctx, X - 16 * s, Y - 70 * s, X - 56 * s, Y - 100 * s, 11 * s);
      branch(ctx, X + 16 * s, Y - 74 * s, X + 56 * s, Y - 106 * s, 11 * s);
      foliage(ctx, X - 52 * s, Y - 108 * s, 20 * s, LEAF, rnd, 4);
      foliage(ctx, X + 52 * s, Y - 114 * s, 20 * s, LEAF, rnd, 4);
      face(ctx, X, Y - 50 * s, 20 * s, wisp);
      foliage(ctx, X, Y - 116 * s, 42 * s, LEAF_DARK, rnd, 8);
      muzzle = Y - 120 * s;
      fx.push({ k: 'wisps', x: X, y: Y - 100 * s, r: 50 * s, color: wisp, n: 4 });
      fx.push({ k: 'glow', x: X, y: Y - 50 * s, r: 30, color: wisp });
      break;
    }
    case '2b': {
      // a giant spore mushroom
      ctx.fillStyle = '#e6dcc0';
      ctx.beginPath();
      ctx.moveTo(X - 12 * s, Y + 2);
      ctx.quadraticCurveTo(X - 6 * s, Y - 20 * s, X - 9 * s, Y - 44 * s);
      ctx.lineTo(X + 9 * s, Y - 44 * s);
      ctx.quadraticCurveTo(X + 6 * s, Y - 20 * s, X + 12 * s, Y + 2);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.8);
      const cy = Y - 44 * s;
      const r = 36 * s;
      const g = ctx.createRadialGradient(X - r * 0.35, cy - r * 0.5, 2, X, cy - r * 0.2, r * 1.1);
      g.addColorStop(0, '#d8a0ff');
      g.addColorStop(1, '#6a3a9a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(X - r, cy + 2);
      ctx.bezierCurveTo(X - r, cy - r * 1.05, X + r, cy - r * 1.05, X + r, cy + 2);
      ctx.quadraticCurveTo(X, cy + r * 0.3, X - r, cy + 2);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = alpha(wisp, 0.9);
      for (const [dx, dy, rr] of [
        [-0.45, -0.3, 0.13],
        [0.15, -0.6, 0.11],
        [0.5, -0.25, 0.1],
      ] as const) {
        ellipse(ctx, X + dx * r, cy + dy * r, rr * r, rr * r * 0.8);
        ctx.fill();
      }
      muzzle = cy - r * 0.7;
      fx.push({ k: 'bubbles', x: X, y: cy - r * 0.5, r: 30 * s, color: wisp });
      break;
    }
    case '3b': {
      // the Bramble Weaver: a thicket of thorny vines
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.9 + i * 0.3;
        const len = (40 + (i % 3) * 14) * s;
        branch(ctx, X + (i - 3) * 5 * s, Y + 2, X + Math.cos(a) * len * 0.8, Y + Math.sin(a) * len, 4 * s);
      }
      foliage(ctx, X, Y - 36 * s, 30 * s, LEAF_DARK, rnd, 6);
      thorns(ctx, X, Y - 10 * s, 50 * s, rnd);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = FLOWER;
        ctx.beginPath();
        ctx.arc(X + (rnd() - 0.5) * 50 * s, Y - 20 * s - rnd() * 40 * s, 3.5, 0, Math.PI * 2);
        ctx.fill();
        outline(ctx, 1);
      }
      muzzle = Y - 58 * s;
      break;
    }
    case '4b': {
      // the World Tree: a broad canopy full of lights
      trunk(ctx, X, Y + 4, 34 * s, 22 * s, 70 * s, BARK);
      branch(ctx, X - 8 * s, Y - 60 * s, X - 44 * s, Y - 78 * s, 7 * s);
      branch(ctx, X + 8 * s, Y - 62 * s, X + 46 * s, Y - 82 * s, 7 * s);
      foliage(ctx, X - 36 * s, Y - 92 * s, 30 * s, LEAF, rnd, 6);
      foliage(ctx, X + 38 * s, Y - 96 * s, 30 * s, LEAF, rnd, 6);
      foliage(ctx, X, Y - 112 * s, 40 * s, shade(LEAF, 0.08), rnd, 7);
      muzzle = Y - 118 * s;
      fx.push({ k: 'wisps', x: X, y: Y - 100 * s, r: 56 * s, color: wisp, n: 5 });
      break;
    }
    case 'L': {
      // the Heart of the Forest: an ancient tree with a glowing heart in its trunk
      trunk(ctx, X, Y + 6, 60 * s, 34 * s, 84 * s, shade(BARK, -0.1));
      ctx.fillStyle = '#1e140c';
      ellipse(ctx, X, Y - 44 * s, 14 * s, 20 * s);
      ctx.fill();
      glow(ctx, X, Y - 44 * s, 34 * s, wisp, 1);
      ctx.fillStyle = shade(wisp, 0.4);
      ctx.beginPath();
      ctx.moveTo(X, Y - 34 * s);
      ctx.bezierCurveTo(X - 14 * s, Y - 46 * s, X - 6 * s, Y - 60 * s, X, Y - 50 * s);
      ctx.bezierCurveTo(X + 6 * s, Y - 60 * s, X + 14 * s, Y - 46 * s, X, Y - 34 * s);
      ctx.fill();
      for (const side of [-1, 1]) {
        branch(ctx, X + side * 14 * s, Y - 74 * s, X + side * 58 * s, Y - 96 * s, 10 * s);
        foliage(ctx, X + side * 54 * s, Y - 104 * s, 24 * s, LEAF, rnd, 5);
      }
      foliage(ctx, X, Y - 112 * s, 42 * s, LEAF_DARK, rnd, 9);
      muzzle = Y - 118 * s;
      fx.push({ k: 'wisps', x: X, y: Y - 96 * s, r: 62 * s, color: wisp, n: 6 });
      fx.push({ k: 'glow', x: X, y: Y - 44 * s, r: 40, color: wisp });
      break;
    }
  }
  return { muzzle, fx };
}
