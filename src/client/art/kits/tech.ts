// Clockwork: goblin engineering. Riveted steel decks with hazard stripes, sandbags, scaffolds,
// pipes that leak steam, radar dishes and far too many rockets.
import {
  alpha,
  block,
  type Build,
  contactShadow,
  type Ctx,
  cylinder,
  ellipse,
  gear,
  outline,
  pipe,
  rivets,
  roundRect,
  shade,
  slab,
  type Spec,
} from './common';

const STEEL = '#7c8492';
const STEEL_DARK = '#4a505c';
const BRASS = '#c9a24c';
const HAZARD = '#ffc629';
const INK = '#1c1e24';
const SAND = '#b8a078';

function hazard(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = HAZARD;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = INK;
  for (let i = -h; i < w; i += 12) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + 6, y + h);
    ctx.lineTo(x + i + 6 + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(8,14,28,0.7)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x, y, w, h);
}

function base(ctx: Ctx, p: Spec): void {
  const { X, Y, tier } = p;
  const w = 98 + Math.min(tier, 4) * 3;
  const h = 62 + Math.min(tier, 4) * 2;
  contactShadow(ctx, X, Y + 6, w, h);
  slab(ctx, X, Y + 6, w, h, 14, STEEL, STEEL_DARK, 5);
  hazard(ctx, X - w / 2 + 6, Y + 6 + h / 2 + 2, w - 12, 8);
  // deck plates and rivets
  ctx.strokeStyle = 'rgba(20,24,30,0.45)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(X - w / 2 + 4, Y + 6);
  ctx.lineTo(X + w / 2 - 4, Y + 6);
  ctx.moveTo(X, Y + 6 - h / 2 + 3);
  ctx.lineTo(X, Y + 6 + h / 2 - 3);
  ctx.stroke();
  rivets(ctx, X - w / 2 + 8, Y + 6 - h / 2 + 6, X + w / 2 - 8, Y + 6 - h / 2 + 6, 7, '#d6dae0', 1.6);
  gear(ctx, X + w / 2 - 14, Y + 6 + h / 2 - 12, 7, 8, BRASS);
  for (let i = 0; i < Math.min(4, tier); i++) {
    ctx.fillStyle = '#7dff8a';
    ctx.fillRect(X - w / 2 + 10 + i * 8, Y + 6 + h / 2 - 16, 5, 5);
  }
}

function sandbags(ctx: Ctx, x: number, y: number, r: number, rows: number): void {
  for (let row = 0; row < rows; row++) {
    const n = 7 - row;
    const rr = r - row * 4;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.05 + (i / (n - 1)) * Math.PI * 0.9;
      const bx = x + Math.cos(a) * rr;
      const by = y - row * 8 + Math.sin(a) * rr * 0.42;
      ctx.fillStyle = shade(SAND, (i % 2) * 0.08 - 0.05);
      ellipse(ctx, bx, by, 10, 6);
      ctx.fill();
      outline(ctx, 1.4);
    }
  }
}

export function drawTech(ctx: Ctx, p: Spec): Build {
  base(ctx, p);
  const { X, Y, s, slot } = p;
  const fx: Build['fx'] = [];
  let muzzle = Y - 50;
  let head: number | undefined;
  switch (slot) {
    case '1': {
      cylinder(ctx, X, Y + 2, 18 * s, 14 * s, STEEL_DARK);
      sandbags(ctx, X, Y + 4, 34 * s, 2);
      head = Y - 24 * s;
      muzzle = head;
      break;
    }
    case '2a': {
      // a sniper's scaffold with the gun up top
      for (const [dx, dy] of [
        [-22, -6],
        [22, -6],
        [-18, 8],
        [18, 8],
      ] as const) {
        ctx.strokeStyle = 'rgba(8,14,28,0.75)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(X + dx * s, Y + dy * s * 0.5);
        ctx.lineTo(X + dx * s * 0.55, Y - 66 * s);
        ctx.stroke();
        ctx.strokeStyle = STEEL;
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
      ctx.strokeStyle = STEEL_DARK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(X - 20 * s, Y - 10 * s);
      ctx.lineTo(X + 14 * s, Y - 40 * s);
      ctx.moveTo(X + 20 * s, Y - 10 * s);
      ctx.lineTo(X - 14 * s, Y - 40 * s);
      ctx.stroke();
      block(ctx, X, Y - 64 * s, 40 * s, 8 * s, 14 * s, STEEL_DARK);
      head = Y - 80 * s;
      muzzle = head;
      fx.push({ k: 'blink', x: X + 16 * s, y: Y - 72 * s, color: '#ff4a3a' });
      break;
    }
    case '3a': {
      // an armoured pedestal for the railgun
      block(ctx, X, Y + 4, 56 * s, 22 * s, 18 * s, STEEL_DARK);
      hazard(ctx, X - 26 * s, Y - 14 * s, 52 * s, 6);
      cylinder(ctx, X, Y - 18 * s, 24 * s, 12 * s, STEEL);
      pipe(ctx, [[X - 28 * s, Y - 4 * s], [X - 38 * s, Y - 4 * s], [X - 38 * s, Y - 30 * s]], 6, BRASS);
      head = Y - 36 * s;
      muzzle = head;
      fx.push({ k: 'glow', x: X, y: Y - 34 * s, r: 20, color: p.glow });
      break;
    }
    case '4a': {
      // the Orbital Lance uplink: a lattice mast carrying a dish
      block(ctx, X - 14 * s, Y + 4, 30 * s, 26 * s, 16 * s, STEEL_DARK);
      ctx.fillStyle = '#7dff8a';
      ctx.fillRect(X - 24 * s, Y - 14 * s, 6, 4);
      ctx.fillStyle = '#ff5a4f';
      ctx.fillRect(X - 14 * s, Y - 14 * s, 6, 4);
      ctx.strokeStyle = STEEL;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(X + 10 * s, Y + 4);
      ctx.lineTo(X + 18 * s, Y - 86 * s);
      ctx.lineTo(X + 26 * s, Y + 4);
      for (let i = 0; i < 5; i++) {
        const y0 = Y - i * 17 * s;
        ctx.moveTo(X + 10 * s + i * 1.6 * s, y0);
        ctx.lineTo(X + 26 * s - i * 1.6 * s, y0 - 17 * s);
      }
      ctx.stroke();
      // dish
      ctx.save();
      ctx.translate(X + 18 * s, Y - 92 * s);
      ctx.rotate(-0.5);
      ctx.fillStyle = '#dfe4ea';
      ctx.beginPath();
      ctx.ellipse(0, 0, 30 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = '#b8c0ca';
      ctx.beginPath();
      ctx.ellipse(0, 2, 22 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = STEEL_DARK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -24 * s);
      ctx.stroke();
      ctx.restore();
      muzzle = Y - 118 * s;
      fx.push({ k: 'blink', x: X + 6 * s, y: Y - 118 * s, color: p.glow });
      break;
    }
    case '2b': {
      block(ctx, X, Y + 4, 48 * s, 18 * s, 16 * s, STEEL_DARK);
      cylinder(ctx, X, Y - 14 * s, 20 * s, 8 * s, STEEL);
      head = Y - 28 * s;
      muzzle = head;
      break;
    }
    case '3b': {
      block(ctx, X, Y + 4, 58 * s, 22 * s, 18 * s, STEEL_DARK);
      hazard(ctx, X - 27 * s, Y - 12 * s, 54 * s, 6);
      for (const dx of [-30, 30]) {
        ctx.fillStyle = '#d6dae0';
        roundRect(ctx, X + dx * s - 4, Y - 44 * s, 8, 30 * s, 3);
        ctx.fill();
        outline(ctx, 1.4);
        ctx.fillStyle = '#ff5a4f';
        ctx.beginPath();
        ctx.moveTo(X + dx * s - 4, Y - 44 * s);
        ctx.lineTo(X + dx * s, Y - 52 * s);
        ctx.lineTo(X + dx * s + 4, Y - 44 * s);
        ctx.fill();
      }
      cylinder(ctx, X, Y - 18 * s, 22 * s, 10 * s, STEEL);
      head = Y - 34 * s;
      muzzle = head;
      break;
    }
    case '4b': {
      // the Doomsday Silo: a hatch open on a warhead
      cylinder(ctx, X, Y + 4, 40 * s, 34 * s, STEEL_DARK, STEEL);
      hazard(ctx, X - 40 * s, Y - 12 * s, 80 * s, 8);
      ctx.fillStyle = '#10121a';
      ellipse(ctx, X, Y - 30 * s, 26 * s, 10 * s);
      ctx.fill();
      ctx.fillStyle = '#e8ecf2';
      ctx.beginPath();
      ctx.moveTo(X - 11 * s, Y - 30 * s);
      ctx.lineTo(X - 11 * s, Y - 56 * s);
      ctx.quadraticCurveTo(X, Y - 82 * s, X + 11 * s, Y - 56 * s);
      ctx.lineTo(X + 11 * s, Y - 30 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.8);
      ctx.fillStyle = HAZARD;
      ctx.beginPath();
      ctx.arc(X, Y - 48 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(X, Y - 48 * s);
        ctx.arc(X, Y - 48 * s, 5 * s, a - 0.4, a + 0.4);
        ctx.fill();
      }
      // the open hatch door
      ctx.fillStyle = STEEL;
      ctx.beginPath();
      ctx.moveTo(X + 22 * s, Y - 34 * s);
      ctx.lineTo(X + 48 * s, Y - 52 * s);
      ctx.lineTo(X + 52 * s, Y - 40 * s);
      ctx.lineTo(X + 28 * s, Y - 26 * s);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.8);
      muzzle = Y - 74 * s;
      fx.push({ k: 'blink', x: X - 30 * s, y: Y - 14 * s, color: '#ff4a3a' });
      fx.push({ k: 'smoke', x: X, y: Y - 40 * s, color: '#cfd6de' });
      break;
    }
    case 'L': {
      // the Gatling Fortress: a bunker with an enormous gun
      block(ctx, X, Y + 4, 76 * s, 30 * s, 20 * s, STEEL_DARK);
      hazard(ctx, X - 36 * s, Y - 16 * s, 72 * s, 7);
      ctx.fillStyle = '#10121a';
      ctx.fillRect(X - 30 * s, Y - 8 * s, 18 * s, 6);
      ctx.fillRect(X + 8 * s, Y - 8 * s, 18 * s, 6);
      sandbags(ctx, X, Y + 6, 44 * s, 1);
      cylinder(ctx, X, Y - 26 * s, 26 * s, 14 * s, STEEL);
      head = Y - 44 * s;
      muzzle = head;
      fx.push({ k: 'smoke', x: X - 30 * s, y: Y - 30 * s });
      break;
    }
  }
  return { muzzle, head, fx };
}

export function techHead(ctx: Ctx, p: Spec): void {
  const s = p.s;
  switch (p.slot) {
    case '1':
    case '2a': {
      // rifle
      const len = (p.slot === '2a' ? 52 : 34) * s;
      ctx.fillStyle = INK;
      roundRect(ctx, 60, 61, len, 6, 2);
      ctx.fill();
      if (p.slot === '2a') {
        ctx.fillStyle = STEEL_DARK;
        roundRect(ctx, 64, 53, 20, 6, 2);
        ctx.fill();
        outline(ctx, 1);
      }
      ctx.fillStyle = '#6b4a2e';
      roundRect(ctx, 44, 57, 22, 14, 5);
      ctx.fill();
      outline(ctx, 1.6);
      ctx.fillStyle = STEEL;
      roundRect(ctx, 52, 55, 14, 18, 4);
      ctx.fill();
      outline(ctx, 1.6);
      return;
    }
    case '3a': {
      // railgun: twin rails with glowing coils
      for (const dy of [-7, 7]) {
        ctx.fillStyle = STEEL_DARK;
        roundRect(ctx, 58, 64 + dy - 3, 58 * s, 6, 2);
        ctx.fill();
        outline(ctx, 1.4);
      }
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = alpha(p.glow, 0.9);
        ctx.fillRect(66 + i * 11 * s, 55, 4, 18);
      }
      ctx.fillStyle = STEEL;
      roundRect(ctx, 42, 52, 26, 24, 7);
      ctx.fill();
      outline(ctx, 1.8);
      return;
    }
    case '2b':
    case '3b': {
      // rocket pod
      const tubes = p.slot === '3b' ? 3 : 2;
      ctx.fillStyle = STEEL;
      roundRect(ctx, 46, 64 - tubes * 7 - 2, 40 * s, tubes * 14 + 4, 5);
      ctx.fill();
      outline(ctx, 1.8);
      for (let i = 0; i < tubes; i++) {
        const y = 64 - tubes * 7 + 7 + i * 14;
        ctx.fillStyle = INK;
        ellipse(ctx, 46 + 40 * s, y, 3, 5);
        ctx.fill();
        ctx.fillStyle = '#ff5a4f';
        ctx.beginPath();
        ctx.moveTo(46 + 40 * s, y - 4);
        ctx.lineTo(52 + 40 * s, y);
        ctx.lineTo(46 + 40 * s, y + 4);
        ctx.fill();
      }
      hazard(ctx, 50, 64 - tubes * 7 - 2, 10, tubes * 14 + 4);
      return;
    }
    default: {
      // gatling: a drum of barrels
      ctx.fillStyle = STEEL_DARK;
      roundRect(ctx, 40, 50, 30, 28, 8);
      ctx.fill();
      outline(ctx, 1.8);
      for (const dy of [-8, -3, 2, 7]) {
        ctx.fillStyle = INK;
        roundRect(ctx, 66, 63 + dy - 2, 46 * s, 4, 2);
        ctx.fill();
      }
      ctx.fillStyle = BRASS;
      ctx.fillRect(84, 54, 5, 20);
      ctx.fillStyle = STEEL;
      ctx.fillRect(100, 55, 4, 18);
      return;
    }
  }
}
