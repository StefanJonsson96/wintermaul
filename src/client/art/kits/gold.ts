// Goldhoard: goblin bankers. Plank decks strapped with iron and littered with coins, treasure
// chests, vault doors, a very large piggy bank and, eventually, a dragon's hoard.
import {
  banner,
  block,
  type Build,
  contactShadow,
  type Ctx,
  cylinder,
  dome,
  ellipse,
  glow,
  goldPile,
  outline,
  rivets,
  roundRect,
  seeded,
  shade,
  skull,
  slab,
  type Spec,
  taperedPrism,
} from './common';

const WOOD = '#8a643e';
const WOOD_DARK = '#4e3822';
const IRON = '#4a4a54';
const GOLD = '#ffc629';
const GREEN = '#3a8a4a';
const STONE = '#9a9486';

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  const w = 96 + Math.min(tier, 4) * 3;
  const h = 60 + Math.min(tier, 4) * 2;
  contactShadow(ctx, X, Y + 6, w, h);
  slab(ctx, X, Y + 6, w, h, 13, WOOD, WOOD_DARK, 6);
  // planks
  ctx.strokeStyle = 'rgba(40,26,12,0.55)';
  ctx.lineWidth = 1.4;
  for (let i = 1; i < 5; i++) {
    const x = X - w / 2 + (i * w) / 5;
    ctx.beginPath();
    ctx.moveTo(x, Y + 6 - h / 2 + 2);
    ctx.lineTo(x, Y + 6 + h / 2 - 2);
    ctx.stroke();
  }
  // iron straps with rivets
  for (const y of [Y + 6 - h / 2 + 10, Y + 6 + h / 2 - 10]) {
    ctx.fillStyle = IRON;
    ctx.fillRect(X - w / 2 + 2, y - 3, w - 4, 6);
    rivets(ctx, X - w / 2 + 8, y, X + w / 2 - 8, y, 7, '#b8b8c0', 1.4);
  }
  // scattered coins
  const rnd = seeded(tier * 13 + p.def.id.length);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = rnd() > 0.5 ? GOLD : '#f2b829';
    ellipse(ctx, X + (rnd() - 0.5) * w * 0.85, Y + 6 + (rnd() - 0.5) * h * 0.6, 4, 2.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,0,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (let i = 0; i < Math.min(4, tier); i++) {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(X + (i - (Math.min(4, tier) - 1) / 2) * 12, Y + 6 + h / 2 + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    outline(ctx, 1);
  }
}

function chest(ctx: Ctx, x: number, baseY: number, w: number, h: number, rnd: () => number): number {
  block(ctx, x, baseY, w, h, w * 0.35, WOOD);
  ctx.fillStyle = IRON;
  ctx.fillRect(x - w / 2, baseY - h * 0.55, w, 4);
  ctx.fillRect(x - w * 0.3, baseY - h, 4, h);
  ctx.fillRect(x + w * 0.26, baseY - h, 4, h);
  // lid thrown open and a heap of gold inside
  goldPile(ctx, x + w * 0.1, baseY - h - 2, w * 0.45, rnd, 7);
  ctx.fillStyle = shade(WOOD, -0.15);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY - h);
  ctx.lineTo(x - w / 2 - w * 0.1, baseY - h - w * 0.55);
  ctx.lineTo(x + w / 2 - w * 0.1, baseY - h - w * 0.55 - w * 0.12);
  ctx.lineTo(x + w / 2, baseY - h - w * 0.12);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = GOLD;
  ctx.fillRect(x - 3, baseY - h * 0.62, 6, 7);
  return baseY - h - w * 0.2;
}

export function drawGold(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot } = p;
  const fx: Build['fx'] = [];
  const rnd = seeded(p.def.id.length * 7 + p.tier);
  let muzzle = Y - 50;
  let head: number | undefined;
  switch (slot) {
    case '1': {
      muzzle = chest(ctx, X, Y + 2, 44 * s, 24 * s, rnd);
      fx.push({ k: 'coins', x: X, y: muzzle });
      break;
    }
    case '2a': {
      // a bounty board on a post, crossbow mounted on top
      cylinder(ctx, X, Y + 2, 6 * s, 50 * s, WOOD_DARK);
      ctx.fillStyle = WOOD;
      ctx.fillRect(X - 26 * s, Y - 40 * s, 30 * s, 26 * s);
      ctx.strokeStyle = 'rgba(8,14,28,0.7)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(X - 26 * s, Y - 40 * s, 30 * s, 26 * s);
      for (const [dx, dy] of [
        [-22, -37],
        [-9, -35],
      ] as const) {
        ctx.fillStyle = '#efe2c0';
        ctx.fillRect(X + dx * s, Y + dy * s, 11 * s, 14 * s);
        ctx.fillStyle = '#7a2a1a';
        ctx.fillRect(X + dx * s + 2, Y + dy * s + 2, 7 * s, 2);
        skull(ctx, X + dx * s + 5.5 * s, Y + dy * s + 9 * s, 2.5 * s);
      }
      cylinder(ctx, X, Y - 48 * s, 12 * s, 6, IRON);
      head = Y - 60 * s;
      muzzle = head;
      break;
    }
    case '3a': {
      // the Mercenary Post: a timber guard tower with a money banner
      for (const dx of [-20, 20]) taperedPrism(ctx, X + dx * s, Y + 2, 9 * s, 7 * s, 60 * s, WOOD_DARK);
      block(ctx, X, Y - 56 * s, 56 * s, 14 * s, 16 * s, WOOD);
      ctx.strokeStyle = WOOD_DARK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X - 20 * s, Y - 8 * s);
      ctx.lineTo(X + 20 * s, Y - 44 * s);
      ctx.moveTo(X + 20 * s, Y - 8 * s);
      ctx.lineTo(X - 20 * s, Y - 44 * s);
      ctx.stroke();
      banner(ctx, X - 20 * s, Y - 54 * s, 14 * s, 30 * s, GREEN, GOLD, (cx, cy) => {
        ctx.fillStyle = GOLD;
        ctx.font = `bold ${Math.round(10 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, cy);
      });
      head = Y - 82 * s;
      muzzle = head;
      break;
    }
    case '4a': {
      // the Gold Golem: a hulk of stacked ingots with ruby eyes
      const bar = (x: number, y: number, w: number, h: number) => {
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.lineTo(x - w * 0.38, y - h);
        ctx.lineTo(x + w * 0.38, y - h);
        ctx.lineTo(x + w / 2, y);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 1.6);
        ctx.fillStyle = '#fff0a0';
        ctx.fillRect(x - w * 0.3, y - h + 2, w * 0.3, 3);
      };
      for (const dx of [-16, 16]) {
        bar(X + dx * s, Y + 2, 20 * s, 14 * s);
        bar(X + dx * s, Y - 12 * s, 18 * s, 14 * s);
      }
      for (let i = 0; i < 3; i++) bar(X, Y - 26 * s - i * 16 * s, (56 - i * 6) * s, 16 * s);
      for (const side of [-1, 1]) {
        bar(X + side * 38 * s, Y - 36 * s, 16 * s, 26 * s);
      }
      bar(X, Y - 74 * s, 28 * s, 22 * s);
      for (const dx of [-6, 6]) {
        ctx.fillStyle = '#ff2a4a';
        ctx.beginPath();
        ctx.arc(X + dx * s, Y - 86 * s, 3.2 * s, 0, Math.PI * 2);
        ctx.fill();
        glow(ctx, X + dx * s, Y - 86 * s, 8 * s, '#ff4a6a', 1);
      }
      muzzle = Y - 90 * s;
      fx.push({ k: 'coins', x: X, y: Y - 60 * s });
      break;
    }
    case '2b': {
      // the Piggy Bank
      const cy = Y - 28 * s;
      for (const dx of [-18, -6, 10, 22]) {
        ctx.fillStyle = shade('#ffb0c4', -0.2);
        ctx.fillRect(X + dx * s - 4, Y - 10 * s, 8, 12 * s);
        ctx.strokeStyle = 'rgba(8,14,28,0.6)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(X + dx * s - 4, Y - 10 * s, 8, 12 * s);
      }
      const g = ctx.createRadialGradient(X - 14 * s, cy - 14 * s, 4, X, cy, 40 * s);
      g.addColorStop(0, '#ffd8e2');
      g.addColorStop(1, '#e888a8');
      ctx.fillStyle = g;
      ellipse(ctx, X, cy, 38 * s, 26 * s);
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = '#f0a0b8';
      ellipse(ctx, X + 38 * s, cy + 2 * s, 9 * s, 11 * s);
      ctx.fill();
      outline(ctx, 1.6);
      ctx.fillStyle = '#b05a78';
      ellipse(ctx, X + 38 * s, cy - 1, 2, 3);
      ctx.fill();
      ellipse(ctx, X + 38 * s, cy + 6, 2, 3);
      ctx.fill();
      ctx.fillStyle = '#e888a8';
      ctx.beginPath();
      ctx.moveTo(X + 18 * s, cy - 20 * s);
      ctx.lineTo(X + 26 * s, cy - 34 * s);
      ctx.lineTo(X + 30 * s, cy - 18 * s);
      ctx.fill();
      outline(ctx, 1.4);
      ctx.fillStyle = '#1a1414';
      ctx.beginPath();
      ctx.arc(X + 24 * s, cy - 6 * s, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2020';
      ctx.fillRect(X - 10 * s, cy - 26 * s, 20 * s, 4);
      ctx.fillStyle = GOLD;
      ellipse(ctx, X, cy - 32 * s, 7 * s, 7 * s);
      ctx.fill();
      outline(ctx, 1.4);
      muzzle = cy - 32 * s;
      fx.push({ k: 'coins', x: X, y: cy - 36 * s });
      break;
    }
    case '3b': {
      // the Treasury: a stone vault with a great round door
      block(ctx, X - 4 * s, Y + 4, 68 * s, 54 * s, 20 * s, STONE);
      ctx.fillStyle = shade(STONE, -0.35);
      ctx.fillRect(X - 38 * s, Y - 54 * s, 68 * s, 8);
      const cx = X - 4 * s;
      const cy = Y - 22 * s;
      ctx.fillStyle = '#8a8a96';
      ellipse(ctx, cx, cy, 22 * s, 22 * s);
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = '#b8b8c4';
      ellipse(ctx, cx, cy, 16 * s, 16 * s);
      ctx.fill();
      outline(ctx, 1.6);
      ctx.strokeStyle = IRON;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 13 * s, cy + Math.sin(a) * 13 * s);
        ctx.stroke();
      }
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      goldPile(ctx, X + 30 * s, Y + 2, 12 * s, rnd, 5);
      muzzle = Y - 64 * s;
      fx.push({ k: 'coins', x: cx, y: cy });
      break;
    }
    case '4b': {
      // the Grand Exchange: columns, a pediment and a golden dome
      block(ctx, X - 4 * s, Y + 4, 76 * s, 12 * s, 20 * s, STONE);
      for (let i = 0; i < 4; i++) cylinder(ctx, X - 32 * s + i * 20 * s, Y - 8 * s, 5 * s, 40 * s, '#e8e2d4');
      block(ctx, X - 4 * s, Y - 48 * s, 80 * s, 10 * s, 20 * s, STONE);
      ctx.fillStyle = shade(STONE, 0.15);
      ctx.beginPath();
      ctx.moveTo(X - 44 * s, Y - 58 * s);
      ctx.lineTo(X - 4 * s, Y - 76 * s);
      ctx.lineTo(X + 36 * s, Y - 58 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.8);
      dome(ctx, X + 6 * s, Y - 70 * s, 22 * s, 26 * s, GOLD);
      ctx.fillStyle = GOLD;
      ctx.font = `bold ${Math.round(12 * s)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', X - 4 * s, Y - 63 * s);
      muzzle = Y - 100 * s;
      fx.push({ k: 'coins', x: X + 6 * s, y: Y - 88 * s });
      break;
    }
    case 'L': {
      // the Dragon's Hoard: a mountain of gold crowned with a dragon's skull
      goldPile(ctx, X, Y + 4, 56 * s, rnd, 22);
      goldPile(ctx, X - 10 * s, Y - 22 * s, 40 * s, rnd, 14);
      chest(ctx, X + 34 * s, Y + 6, 26 * s, 14 * s, rnd);
      const hx = X - 6 * s;
      const hy = Y - 62 * s;
      ctx.fillStyle = '#e8e0cc';
      ctx.beginPath();
      ctx.moveTo(hx - 24 * s, hy);
      ctx.quadraticCurveTo(hx - 20 * s, hy - 24 * s, hx + 6 * s, hy - 22 * s);
      ctx.lineTo(hx + 40 * s, hy - 8 * s);
      ctx.lineTo(hx + 36 * s, hy + 4 * s);
      ctx.lineTo(hx + 6 * s, hy + 10 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = '#0c0a08';
      ellipse(ctx, hx - 2 * s, hy - 8 * s, 7 * s, 6 * s);
      ctx.fill();
      glow(ctx, hx - 2 * s, hy - 8 * s, 12 * s, '#ff4a2a', 1);
      for (const k of [0, 1]) {
        ctx.fillStyle = '#e8e0cc';
        ctx.beginPath();
        ctx.moveTo(hx - 16 * s + k * 10 * s, hy - 18 * s);
        ctx.quadraticCurveTo(hx - 34 * s + k * 10 * s, hy - 40 * s, hx - 26 * s + k * 8 * s, hy - 52 * s);
        ctx.quadraticCurveTo(hx - 24 * s + k * 10 * s, hy - 34 * s, hx - 8 * s + k * 10 * s, hy - 20 * s);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 1.4);
      }
      ctx.fillStyle = '#f4ecd8';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(hx + 12 * s + i * 7 * s, hy + 4 * s);
        ctx.lineTo(hx + 15 * s + i * 7 * s, hy + 12 * s);
        ctx.lineTo(hx + 18 * s + i * 7 * s, hy + 3 * s);
        ctx.fill();
      }
      muzzle = hy - 20 * s;
      fx.push({ k: 'coins', x: X - 20 * s, y: Y - 20 * s });
      fx.push({ k: 'coins', x: X + 20 * s, y: Y - 8 * s });
      fx.push({ k: 'glow', x: X, y: Y - 20 * s, r: 50, color: GOLD });
      break;
    }
  }
  return { muzzle, head, fx };
}

/** A goblin crossbow. */
export function goldHead(ctx: Ctx, p: Spec): void {
  const s = p.s;
  const len = (p.slot === '3a' ? 44 : 36) * s;
  ctx.fillStyle = WOOD_DARK;
  roundRect(ctx, 44, 59, len, 10, 3);
  ctx.fill();
  outline(ctx, 1.6);
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(44 + len * 0.7, 40);
  ctx.quadraticCurveTo(44 + len * 0.95, 64, 44 + len * 0.7, 88);
  ctx.stroke();
  ctx.strokeStyle = IRON;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.strokeStyle = '#e8e0c8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(44 + len * 0.7, 40);
  ctx.lineTo(48, 64);
  ctx.lineTo(44 + len * 0.7, 88);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(44 + len, 64);
  ctx.lineTo(38 + len, 60);
  ctx.lineTo(38 + len, 68);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1);
}
