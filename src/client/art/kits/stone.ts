// Stonewardens: an old druidic order. Mossy flagstone circles, rough-hewn standing stones and
// carvings whose runes glow amber when the earth wakes up.
import {
  alpha,
  type Build,
  contactShadow,
  type Ctx,
  ellipse,
  glow,
  outline,
  rune,
  roundRect,
  seeded,
  shade,
  type Spec,
  taperedPrism,
} from './common';

const GRANITE = '#8c867a';
const GRANITE_DARK = '#5c574f';
const MOSS = '#6d9c4a';
const AMBER = '#ffc86a';
const WOOD = '#7a5634';

/** A rough, irregular stone outline. */
function boulder(ctx: Ctx, x: number, y: number, r: number, rnd: () => number, color = GRANITE, snow = true): void {
  const n = 8;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2;
    const rr = r * (0.8 + rnd() * 0.3);
    const px = x + Math.cos(ang) * rr;
    const py = y + Math.sin(ang) * rr * 0.8;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, shade(color, 0.25));
  g.addColorStop(1, shade(color, -0.4));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, 2);
  if (snow) {
    ctx.fillStyle = 'rgba(240,248,255,0.85)';
    ellipse(ctx, x - r * 0.1, y - r * 0.6, r * 0.5, r * 0.18);
    ctx.fill();
  }
  ctx.fillStyle = alpha(MOSS, 0.85);
  ellipse(ctx, x + r * 0.3, y + r * 0.35, r * 0.28, r * 0.12);
  ctx.fill();
}

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  contactShadow(ctx, X, Y + 6, 104, 66);
  // a ring of flagstones
  const rnd = seeded(tier * 7 + p.def.id.length * 3);
  const stones: [number, number, number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    stones.push([X + Math.cos(a) * 34, Y + 6 + Math.sin(a) * 20, 17 + rnd() * 5, 11 + rnd() * 3]);
  }
  stones.push([X, Y + 6, 26, 15]);
  stones.sort((a, b) => a[1] - b[1]);
  for (const [sx, sy, w, h] of stones) {
    ctx.fillStyle = shade(GRANITE_DARK, -0.1);
    ellipse(ctx, sx, sy + 5, w, h);
    ctx.fill();
    outline(ctx, 1.5);
    const g = ctx.createLinearGradient(0, sy - h, 0, sy + h);
    g.addColorStop(0, shade(GRANITE, 0.2));
    g.addColorStop(1, shade(GRANITE, -0.15));
    ctx.fillStyle = g;
    ellipse(ctx, sx, sy, w, h);
    ctx.fill();
    outline(ctx, 1.5);
  }
  // moss and pebbles
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = alpha(MOSS, 0.8);
    ellipse(ctx, X + (rnd() - 0.5) * 80, Y + 6 + (rnd() - 0.2) * 30, 7 + rnd() * 5, 3 + rnd() * 2);
    ctx.fill();
  }
  for (let i = 0; i < Math.min(4, tier); i++) rune(ctx, X - 18 + i * 12, Y + 36, 6, AMBER, i);
}

export function drawStone(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot } = p;
  const fx: Build['fx'] = [];
  const rnd = seeded(p.def.id.length * 13 + p.tier);
  let muzzle = Y - 50;
  let head: number | undefined;
  switch (slot) {
    case '1': {
      // a heap of rubble
      boulder(ctx, X - 20 * s, Y - 4 * s, 16 * s, rnd);
      boulder(ctx, X + 20 * s, Y - 2 * s, 15 * s, rnd);
      boulder(ctx, X, Y - 18 * s, 22 * s, rnd);
      muzzle = Y - 36 * s;
      break;
    }
    case '2a': {
      // a stone platform with a sling on two posts
      taperedPrism(ctx, X, Y + 2, 56 * s, 50 * s, 20 * s, GRANITE);
      for (const dx of [-18, 18]) taperedPrism(ctx, X + dx * s, Y - 16 * s, 8 * s, 7 * s, 20 * s, WOOD);
      head = Y - 42 * s;
      muzzle = head;
      break;
    }
    case '3a': {
      // a granite fist bursting from the ground
      boulder(ctx, X - 26 * s, Y, 12 * s, rnd);
      boulder(ctx, X + 28 * s, Y + 2, 10 * s, rnd);
      taperedPrism(ctx, X, Y + 2, 34 * s, 30 * s, 40 * s, GRANITE_DARK);
      const fy = Y - 38 * s;
      ctx.fillStyle = GRANITE;
      roundRect(ctx, X - 26 * s, fy - 44 * s, 52 * s, 46 * s, 12 * s);
      ctx.fill();
      outline(ctx, 2.2);
      ctx.strokeStyle = shade(GRANITE, -0.45);
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(X - 26 * s + i * 13 * s, fy - 44 * s);
        ctx.lineTo(X - 26 * s + i * 13 * s, fy - 24 * s);
        ctx.stroke();
      }
      ctx.fillStyle = shade(GRANITE, 0.1);
      roundRect(ctx, X - 30 * s, fy - 24 * s, 18 * s, 20 * s, 7 * s);
      ctx.fill();
      outline(ctx, 2);
      rune(ctx, X + 6 * s, fy - 10 * s, 10 * s, AMBER, 2);
      muzzle = fy - 48 * s;
      fx.push({ k: 'glow', x: X + 6 * s, y: fy - 10 * s, r: 22, color: AMBER });
      break;
    }
    case '4a': {
      // the Mountain Heart: a peak with a glowing heart in its cave
      ctx.fillStyle = GRANITE;
      ctx.beginPath();
      ctx.moveTo(X - 56 * s, Y + 6);
      ctx.lineTo(X - 30 * s, Y - 60 * s);
      ctx.lineTo(X - 12 * s, Y - 50 * s);
      ctx.lineTo(X + 4 * s, Y - 104 * s);
      ctx.lineTo(X + 26 * s, Y - 66 * s);
      ctx.lineTo(X + 36 * s, Y - 74 * s);
      ctx.lineTo(X + 56 * s, Y + 6);
      ctx.closePath();
      const g = ctx.createLinearGradient(X - 50 * s, Y - 100 * s, X + 50 * s, Y);
      g.addColorStop(0, shade(GRANITE, 0.25));
      g.addColorStop(1, shade(GRANITE, -0.45));
      ctx.fillStyle = g;
      ctx.fill();
      outline(ctx, 2.2);
      ctx.fillStyle = 'rgba(240,248,255,0.92)';
      ctx.beginPath();
      ctx.moveTo(X - 6 * s, Y - 86 * s);
      ctx.lineTo(X + 4 * s, Y - 104 * s);
      ctx.lineTo(X + 16 * s, Y - 84 * s);
      ctx.lineTo(X + 8 * s, Y - 88 * s);
      ctx.lineTo(X + 2 * s, Y - 82 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a140e';
      ctx.beginPath();
      ctx.moveTo(X - 16 * s, Y + 4);
      ctx.quadraticCurveTo(X - 14 * s, Y - 34 * s, X + 2 * s, Y - 36 * s);
      ctx.quadraticCurveTo(X + 18 * s, Y - 34 * s, X + 18 * s, Y + 4);
      ctx.closePath();
      ctx.fill();
      glow(ctx, X + 1, Y - 16 * s, 36 * s, AMBER, 0.9);
      ctx.fillStyle = shade(AMBER, 0.3);
      ctx.beginPath();
      ctx.moveTo(X + 1, Y - 30 * s);
      ctx.lineTo(X + 10 * s, Y - 16 * s);
      ctx.lineTo(X + 1, Y - 4 * s);
      ctx.lineTo(X - 8 * s, Y - 16 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.4);
      muzzle = Y - 70 * s;
      fx.push({ k: 'glow', x: X, y: Y - 16 * s, r: 40, color: AMBER });
      break;
    }
    case '2b': {
      // a squat totem with a carved face
      taperedPrism(ctx, X, Y + 2, 46 * s, 42 * s, 30 * s, GRANITE_DARK);
      taperedPrism(ctx, X, Y - 26 * s, 40 * s, 36 * s, 26 * s, GRANITE);
      ctx.fillStyle = '#1a140e';
      ctx.fillRect(X - 12 * s, Y - 44 * s, 8 * s, 5 * s);
      ctx.fillRect(X + 2 * s, Y - 44 * s, 8 * s, 5 * s);
      ctx.fillRect(X - 10 * s, Y - 34 * s, 18 * s, 4 * s);
      glow(ctx, X - 8 * s, Y - 42 * s, 10, AMBER, 0.9);
      glow(ctx, X + 6 * s, Y - 42 * s, 10, AMBER, 0.9);
      boulder(ctx, X, Y - 56 * s, 16 * s, rnd);
      muzzle = Y - 62 * s;
      fx.push({ k: 'glow', x: X, y: Y - 42 * s, r: 26, color: AMBER });
      break;
    }
    case '3b': {
      // a tall menhir with cracks of amber light
      taperedPrism(ctx, X, Y + 2, 38 * s, 22 * s, 108 * s, GRANITE, 12 * s);
      ctx.save();
      ctx.shadowColor = AMBER;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X - 4 * s, Y - 96 * s);
      ctx.lineTo(X + 2 * s, Y - 70 * s);
      ctx.lineTo(X - 6 * s, Y - 50 * s);
      ctx.lineTo(X + 4 * s, Y - 22 * s);
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 3; i++) rune(ctx, X - 10 * s, Y - 28 * s - i * 26 * s, 8 * s, AMBER, i + 1);
      boulder(ctx, X - 26 * s, Y + 2, 10 * s, rnd);
      boulder(ctx, X + 28 * s, Y + 4, 9 * s, rnd);
      muzzle = Y - 118 * s;
      fx.push({ k: 'glow', x: X, y: Y - 60 * s, r: 34, color: AMBER });
      break;
    }
    case '4b': {
      // the Earthshaker: a dolmen with a floating rune stone beneath the capstone
      for (const dx of [-26, 26]) taperedPrism(ctx, X + dx * s, Y + 2, 20 * s, 16 * s, 66 * s, GRANITE_DARK);
      ctx.save();
      ctx.shadowColor = AMBER;
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#6a5a44';
      ctx.beginPath();
      ctx.moveTo(X - 12 * s, Y - 34 * s);
      ctx.lineTo(X, Y - 50 * s);
      ctx.lineTo(X + 12 * s, Y - 34 * s);
      ctx.lineTo(X, Y - 18 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      outline(ctx, 1.6);
      rune(ctx, X, Y - 34 * s, 9 * s, AMBER, 0);
      ctx.fillStyle = GRANITE;
      ctx.beginPath();
      ctx.moveTo(X - 46 * s, Y - 64 * s);
      ctx.lineTo(X + 44 * s, Y - 70 * s);
      ctx.lineTo(X + 48 * s, Y - 84 * s);
      ctx.lineTo(X - 40 * s, Y - 82 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 2.2);
      ctx.fillStyle = 'rgba(240,248,255,0.85)';
      ellipse(ctx, X - 4 * s, Y - 83 * s, 30 * s, 3.5);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = AMBER;
      ctx.shadowBlur = 6;
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X - 40 * s, Y + 12);
      ctx.lineTo(X - 20 * s, Y + 4);
      ctx.lineTo(X - 6 * s, Y + 14);
      ctx.moveTo(X + 16 * s, Y + 10);
      ctx.lineTo(X + 36 * s, Y + 2);
      ctx.stroke();
      ctx.restore();
      muzzle = Y - 90 * s;
      fx.push({ k: 'glow', x: X, y: Y - 34 * s, r: 34, color: AMBER });
      break;
    }
    case 'L': {
      // the Titan Idol: a colossal carved head
      const hy = Y - 30 * s;
      ctx.fillStyle = shade(GRANITE, -0.05);
      ctx.beginPath();
      ctx.moveTo(X - 40 * s, Y + 6);
      ctx.lineTo(X - 44 * s, hy - 60 * s);
      ctx.quadraticCurveTo(X - 42 * s, hy - 108 * s, X - 4 * s, hy - 112 * s);
      ctx.quadraticCurveTo(X + 38 * s, hy - 110 * s, X + 40 * s, hy - 62 * s);
      ctx.lineTo(X + 42 * s, Y + 6);
      ctx.closePath();
      const g = ctx.createLinearGradient(X - 44 * s, 0, X + 44 * s, 0);
      g.addColorStop(0, shade(GRANITE, 0.2));
      g.addColorStop(0.55, GRANITE);
      g.addColorStop(1, shade(GRANITE, -0.5));
      ctx.fillStyle = g;
      ctx.fill();
      outline(ctx, 2.4);
      // heavy brow, deep eyes, long nose and a stern mouth
      ctx.fillStyle = shade(GRANITE, -0.35);
      ctx.fillRect(X - 36 * s, hy - 70 * s, 72 * s, 10 * s);
      for (const dx of [-18, 16]) {
        ctx.fillStyle = '#16100a';
        ellipse(ctx, X + dx * s, hy - 54 * s, 10 * s, 6 * s);
        ctx.fill();
        glow(ctx, X + dx * s, hy - 54 * s, 18 * s, AMBER, 1);
      }
      ctx.fillStyle = shade(GRANITE, 0.12);
      ctx.beginPath();
      ctx.moveTo(X - 4 * s, hy - 60 * s);
      ctx.lineTo(X - 12 * s, hy - 24 * s);
      ctx.lineTo(X + 8 * s, hy - 24 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.6);
      ctx.fillStyle = '#16100a';
      ctx.fillRect(X - 18 * s, hy - 10 * s, 36 * s, 5 * s);
      ctx.fillStyle = alpha(MOSS, 0.9);
      ellipse(ctx, X - 30 * s, hy - 96 * s, 14 * s, 6 * s);
      ctx.fill();
      ellipse(ctx, X + 24 * s, Y - 4, 18 * s, 6 * s);
      ctx.fill();
      for (let i = 0; i < 3; i++) rune(ctx, X - 24 * s + i * 24 * s, hy + 18 * s, 9 * s, AMBER, i);
      muzzle = hy - 58 * s;
      fx.push({ k: 'glow', x: X, y: hy - 54 * s, r: 44, color: AMBER });
      break;
    }
  }
  return { muzzle, head, fx };
}

/** The Boulder Sling's throwing arm. */
export function stoneHead(ctx: Ctx, p: Spec): void {
  const s = p.s;
  ctx.fillStyle = WOOD;
  roundRect(ctx, 48, 60, 46 * s, 8, 3);
  ctx.fill();
  outline(ctx, 1.6);
  ctx.strokeStyle = '#c8b090';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48 + 46 * s, 62);
  ctx.quadraticCurveTo(58 + 46 * s, 54, 60 + 46 * s, 64);
  ctx.stroke();
  const rnd = seeded(5);
  boulder(ctx, 54 + 46 * s, 64, 11, rnd, GRANITE, false);
  ctx.fillStyle = shade(WOOD, -0.2);
  ctx.beginPath();
  ctx.arc(52, 64, 8, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx, 1.6);
}
