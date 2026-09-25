import type { CreepDef } from '../../shared/types';
import { alpha, ellipse, glow, makeCanvas, outline, roundRect, SP, shade, type Ctx } from './util';

// Creatures are drawn facing right in 8 animation frames and cached per creep type.
export const FRAMES = 8;

export interface CreepSprite {
  frames: HTMLCanvasElement[];
  size: number; // frame size in px
  gx: number; // ground point in the frame
  gy: number;
  lift: number; // flyers hover this many cells above their shadow
}

/** Shapes that float a little above the ground even though they walk the maze. */
const HOVERING = new Set(['wraith', 'banshee', 'skull', 'elemental', 'lich']);

/** Top of each creature, in units of its drawing radius (used for health bars). */
const TOP: Record<string, number> = {
  ghoul: 2.2,
  wendigo: 2.9,
  biped: 2.45,
  imp: 2.25,
  rat: 1.15,
  wolf: 1.75,
  boar: 2.0,
  troll: 2.55,
  giant: 3.15,
  knight: 3.05,
  boss: 3.55,
  spider: 1.5,
  crab: 1.65,
  beetle: 1.55,
  hydra: 2.1,
  bird: 1.9,
  bat: 1.95,
  dragon: 2.0,
  skull: 1.9,
  wraith: 2.2,
  banshee: 2.2,
  lich: 2.45,
  elemental: 1.95,
  golem: 2.5,
};

/** How far above its shadow a creep is drawn, in cells. */
export function creepLift(def: CreepDef): number {
  return def.air ? 0.55 : HOVERING.has(def.shape) ? 0.12 : 0;
}

/** Height of a creep's head above its shadow, in cells. */
export function creepTop(def: CreepDef): number {
  return (TOP[def.shape] ?? 2) * def.size * 1.18 + creepLift(def);
}

const cache = new Map<string, CreepSprite>();

export function creepSprite(def: CreepDef): CreepSprite {
  const key = `${def.shape}:${def.colors.join(',')}:${def.size}:${def.boss ? 1 : 0}:${def.armorType}`;
  let s = cache.get(key);
  if (s) return s;
  const R = def.size * SP * 1.18;
  const size = Math.ceil(Math.max(1.6 * SP, R * 4.6));
  const gx = size / 2;
  const gy = size * 0.85;
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const [c, ctx] = makeCanvas(size, size);
    ctx.translate(gx, gy);
    drawCreature(ctx, def, R, (f / FRAMES) * Math.PI * 2);
    frames.push(c);
  }
  s = { frames, size, gx, gy, lift: creepLift(def) };
  cache.set(key, s);
  return s;
}

/** body, dark accent, eye/glow colour, plus a few flags that change the look. */
interface Look {
  body: string;
  dark: string;
  eye: string;
  boss: boolean;
  armored: boolean;
}

function drawCreature(ctx: Ctx, def: CreepDef, R: number, ph: number): void {
  const [body, dark, eye] = def.colors;
  const k: Look = { body, dark, eye, boss: !!def.boss, armored: def.armorType === 'fortified' };
  if (k.boss) bossAura(ctx, R, eye);
  switch (def.shape) {
    case 'ghoul':
      return ghoul(ctx, R, ph, k, false);
    case 'wendigo':
      return ghoul(ctx, R, ph, k, true);
    case 'biped':
      return kobold(ctx, R, ph, k);
    case 'imp':
      return imp(ctx, R, ph, k);
    case 'rat':
      return rat(ctx, R, ph, k);
    case 'wolf':
      return wolf(ctx, R, ph, k);
    case 'boar':
      return boar(ctx, R, ph, k);
    case 'troll':
      return troll(ctx, R, ph, k);
    case 'giant':
      return giant(ctx, R, ph, k);
    case 'knight':
      return knight(ctx, R, ph, k);
    case 'boss':
      return tyrant(ctx, R, ph, k);
    case 'spider':
      return spider(ctx, R, ph, k);
    case 'crab':
      return crab(ctx, R, ph, k);
    case 'beetle':
      return beetle(ctx, R, ph, k);
    case 'hydra':
      return hydra(ctx, R, ph, k);
    case 'bird':
      return bird(ctx, R, ph, k);
    case 'bat':
      return bat(ctx, R, ph, k);
    case 'dragon':
      return dragon(ctx, R, ph, k);
    case 'skull':
      return skull(ctx, R, ph, k);
    case 'wraith':
      return wraith(ctx, R, ph, k);
    case 'banshee':
      return banshee(ctx, R, ph, k);
    case 'lich':
      return lich(ctx, R, ph, k);
    case 'elemental':
      return elemental(ctx, R, ph, k);
    case 'golem':
      return golem(ctx, R, ph, k);
  }
}

// ───────────────────────────────────────────────── shared parts

const BONE = '#ece6d6';
const MAW = '#3a0d12';

/** A slanted, glowing eye: high at the back, low towards the snout, so it always looks angry. */
function evilEye(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  // a dark socket makes the glow read on pale bodies and on snow
  ctx.fillStyle = 'rgba(6,8,14,0.85)';
  ellipse(ctx, x + r * 0.05, y + r * 0.05, r * 1.45, r * 0.95, 0.25);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, r * 3.6, color, 0.8);
  ctx.restore();
  ctx.fillStyle = shade(color, 0.55);
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.55);
  ctx.quadraticCurveTo(x + r * 0.3, y - r * 0.3, x + r * 1.1, y + r * 0.25);
  ctx.quadraticCurveTo(x, y + r * 0.65, x - r * 0.9, y + r * 0.15);
  ctx.closePath();
  ctx.fill();
}

/** A heavy brow ridge over an eye, sloping down to the front. */
function brow(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - r * 1.5, y - r * 1.25);
  ctx.lineTo(x + r * 1.6, y - r * 0.2);
  ctx.lineTo(x + r * 1.3, y + r * 0.2);
  ctx.lineTo(x - r * 1.35, y - r * 0.6);
  ctx.closePath();
  ctx.fill();
}

/** A row of fangs between two points; dir 1 points them down, -1 up. */
function fangs(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, n: number, len: number, dir = 1): void {
  ctx.fillStyle = BONE;
  const dx = (x1 - x0) / n;
  const dy = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const ax = x0 + dx * i;
    const ay = y0 + dy * i;
    const l = len * (i % 2 ? 0.65 : 1);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + dx * 0.5, ay + dy * 0.5 + l * dir);
    ctx.lineTo(ax + dx, ay + dy);
    ctx.closePath();
    ctx.fill();
  }
}

/** Jagged spikes along a polyline, pointing away from the ground. */
function spikes(ctx: Ctx, pts: [number, number][], len: number, color: string, lean = 0.35): void {
  ctx.fillStyle = color;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    let nx = ay - by;
    let ny = bx - ax;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const s = len * (i % 2 ? 0.7 : 1);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo((ax + bx) / 2 + nx * s - lean * s, (ay + by) / 2 + ny * s);
    ctx.lineTo(bx, by);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.2);
  }
}

/** Three hooked claws at (x, y), pointing along `angle`. */
function claws(ctx: Ctx, x: number, y: number, s: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (const [w, col] of [
    [Math.max(2.6, s * 0.5), 'rgba(8,14,28,0.75)'],
    [Math.max(1.4, s * 0.28), BONE],
  ] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * s * 0.3);
      ctx.quadraticCurveTo(s * 0.8, i * s * 0.42, s * 1.15, i * s * 0.5 + s * 0.45);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function limb(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, w: number, color: string): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(8,14,28,0.78)';
  ctx.lineWidth = w + 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Two-segment leg from the hip; knee > 0 bends forward like a human knee, < 0 like a foreleg. */
function leg(ctx: Ctx, x: number, y: number, swing: number, len: number, w: number, color: string, knee = 0.3): [number, number] {
  const kx = x + Math.sin(swing + knee) * len * 0.5;
  const ky = y + Math.cos(swing + knee) * len * 0.5;
  const fx = kx + Math.sin(swing - knee) * len * 0.5;
  const fy = Math.min(0, ky + Math.cos(swing - knee) * len * 0.5);
  limb(ctx, x, y, kx, ky, w, color);
  limb(ctx, kx, ky, fx, fy, w * 0.82, color);
  return [fx, fy];
}

function fill(ctx: Ctx, x: number, y: number, r: number, color: string): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.25);
  g.addColorStop(0, shade(color, 0.3));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -0.5));
  return g;
}

function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, rot = 0, lw = 2.2): void {
  ctx.fillStyle = fill(ctx, x, y, Math.max(rx, ry), color);
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fill();
  outline(ctx, lw);
}

function bossAura(ctx: Ctx, R: number, color: string): void {
  ctx.save();
  glow(ctx, 0, -R * 1.25, R * 2.3, '#12081f', 0.55);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, -R * 1.25, R * 1.9, color, 0.2);
  ctx.restore();
}

function crown(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, points = 5): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  for (let i = 0; i <= points * 2; i++) {
    const px = x - w / 2 + (i * w) / (points * 2);
    ctx.lineTo(px, i % 2 ? y - h * (i === points ? 1.35 : 0.9) : y - h * 0.25);
  }
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
}

function weaponClub(ctx: Ctx, x: number, y: number, len: number, w: number, angle: number, wood: string, spike: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(0, -w * 0.25);
  ctx.lineTo(len, -w * 0.7);
  ctx.quadraticCurveTo(len + w * 0.6, 0, len, w * 0.7);
  ctx.lineTo(0, w * 0.25);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = spike;
  for (let i = 0; i < 4; i++) {
    const px = len * (0.55 + i * 0.13);
    const s = i % 2 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(px - w * 0.18, s * w * 0.5);
    ctx.lineTo(px, s * w * 1.15);
    ctx.lineTo(px + w * 0.18, s * w * 0.5);
    ctx.fill();
  }
  ctx.restore();
}

// ───────────────────────────────────────────────── walkers

function ghoul(ctx: Ctx, R: number, ph: number, k: Look, antlers: boolean): void {
  const sw = Math.sin(ph) * 0.6;
  const bob = Math.abs(Math.cos(ph)) * R * 0.08;
  const hipX = -R * 0.2;
  const hipY = -R * 0.95 - bob;
  const shX = R * 0.3;
  const shY = -R * 1.72 - bob;
  const skin = k.body;
  leg(ctx, hipX, hipY, -sw, R * 1.02, R * 0.2, shade(skin, -0.45), 0.4);
  // far arm dangles forward
  limb(ctx, shX - R * 0.05, shY + R * 0.1, shX + R * 0.45 - sw * R * 0.2, shY + R * 0.85, R * 0.15, shade(skin, -0.45));
  claws(ctx, shX + R * 0.45 - sw * R * 0.2, shY + R * 0.85, R * 0.22, 1.2);
  // hunched torso with ribs and a spine ridge
  const ang = Math.atan2(shY - hipY, shX - hipX);
  const cx = (hipX + shX) / 2;
  const cy = (hipY + shY) / 2;
  blob(ctx, cx, cy, R * 0.55, R * 0.36, skin, ang);
  ctx.strokeStyle = alpha(k.dark, 0.7);
  ctx.lineWidth = Math.max(1.2, R * 0.05);
  for (let i = 0; i < 3; i++) {
    const t = -0.2 + i * 0.25;
    const rx = cx + Math.cos(ang) * R * t;
    const ry = cy + Math.sin(ang) * R * t;
    ctx.beginPath();
    ctx.moveTo(rx - R * 0.08, ry - R * 0.2);
    ctx.quadraticCurveTo(rx + R * 0.12, ry, rx - R * 0.02, ry + R * 0.28);
    ctx.stroke();
  }
  const back: [number, number][] = [];
  for (let i = 0; i <= 4; i++) {
    const t = -0.45 + i * 0.22;
    back.push([cx + Math.cos(ang) * R * t - Math.sin(ang) * -R * 0.33, cy + Math.sin(ang) * R * t + Math.cos(ang) * -R * 0.33]);
  }
  spikes(ctx, back, R * 0.2, shade(skin, -0.25), 0.5);
  // ragged loincloth
  ctx.fillStyle = k.dark;
  ctx.beginPath();
  ctx.moveTo(hipX - R * 0.35, hipY - R * 0.12);
  ctx.lineTo(hipX + R * 0.3, hipY - R * 0.05);
  ctx.lineTo(hipX + R * 0.2, hipY + R * 0.35);
  ctx.lineTo(hipX + R * 0.02, hipY + R * 0.22);
  ctx.lineTo(hipX - R * 0.12, hipY + R * 0.4);
  ctx.lineTo(hipX - R * 0.28, hipY + R * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.5);
  leg(ctx, hipX + R * 0.1, hipY, sw, R * 1.02, R * 0.22, shade(skin, -0.15), 0.4);
  // head: bald, jutting jaw, pointed ear
  const hx = shX + R * 0.38;
  const hy = shY - R * 0.12;
  const hr = R * 0.33;
  if (antlers) {
    ctx.strokeStyle = 'rgba(8,14,28,0.8)';
    for (const [w, col] of [
      [R * 0.12 + 3, 'rgba(8,14,28,0.8)'],
      [R * 0.12, '#d8cdb4'],
    ] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      for (const side of [-1, 1]) {
        const bx = hx - hr * 0.2 + side * hr * 0.25;
        ctx.beginPath();
        ctx.moveTo(bx, hy - hr * 0.7);
        ctx.quadraticCurveTo(bx - hr * 0.6, hy - hr * 2.2, bx - hr * 1.4 + side * hr * 0.3, hy - hr * 2.9);
        ctx.moveTo(bx - hr * 0.45, hy - hr * 1.75);
        ctx.lineTo(bx + hr * 0.35, hy - hr * 2.55);
        ctx.moveTo(bx - hr * 0.95, hy - hr * 2.45);
        ctx.lineTo(bx - hr * 0.55, hy - hr * 3.1);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = shade(skin, -0.2);
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.6, hy - hr * 0.2);
  ctx.lineTo(hx - hr * 1.5, hy - hr * 0.95);
  ctx.lineTo(hx - hr * 0.35, hy + hr * 0.25);
  ctx.fill();
  outline(ctx, 1.4);
  blob(ctx, hx, hy, hr, hr * 0.92, antlers ? '#d8d0c0' : skin, 0, 2);
  // hanging jaw with fangs
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.1, hy + hr * 0.3);
  ctx.lineTo(hx + hr * 1.05, hy + hr * 0.25);
  ctx.lineTo(hx + hr * 0.85, hy + hr * 0.95);
  ctx.lineTo(hx + hr * 0.05, hy + hr * 0.75);
  ctx.closePath();
  ctx.fill();
  fangs(ctx, hx + hr * 0.2, hy + hr * 0.3, hx + hr * 1.0, hy + hr * 0.27, 4, hr * 0.28);
  fangs(ctx, hx + hr * 0.15, hy + hr * 0.78, hx + hr * 0.85, hy + hr * 0.92, 3, hr * 0.22, -1);
  if (antlers) {
    // bare skull face
    ctx.fillStyle = '#0b0a10';
    ellipse(ctx, hx + hr * 0.35, hy - hr * 0.2, hr * 0.32, hr * 0.26);
    ctx.fill();
  }
  evilEye(ctx, hx + hr * 0.4, hy - hr * 0.2, hr * 0.22, k.eye);
  brow(ctx, hx + hr * 0.4, hy - hr * 0.2, hr * 0.22, shade(skin, -0.5));
  // near arm reaching out, claws first
  const ax = shX + R * 0.1;
  const ay = shY + R * 0.15;
  const ex = ax + R * 0.75 + sw * R * 0.15;
  const ey = ay + R * 0.35;
  limb(ctx, ax, ay, ex, ey, R * 0.17, shade(skin, -0.1));
  claws(ctx, ex, ey, R * 0.26, 0.5);
}

function kobold(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.55;
  const bob = Math.abs(Math.cos(ph)) * R * 0.06;
  const hipY = -R * 0.8 - bob;
  const shY = -R * 1.6 - bob;
  leg(ctx, -R * 0.12, hipY, -sw, R * 0.84, R * 0.22, shade(k.dark, -0.2), 0.3);
  // round shield on the far arm, with a spike
  ctx.fillStyle = fill(ctx, -R * 0.35, shY + R * 0.45, R * 0.45, '#6b4a32');
  ellipse(ctx, -R * 0.38, shY + R * 0.45, R * 0.36, R * 0.44);
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = '#b8c2cc';
  ellipse(ctx, -R * 0.38, shY + R * 0.45, R * 0.1, R * 0.12);
  ctx.fill();
  ctx.strokeStyle = alpha('#2a1a10', 0.7);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-R * 0.38, shY + R * 0.05);
  ctx.lineTo(-R * 0.38, shY + R * 0.85);
  ctx.stroke();
  // torso in studded leather
  blob(ctx, 0, (hipY + shY) / 2, R * 0.42, R * 0.48, k.body);
  ctx.fillStyle = shade(k.dark, 0.1);
  ctx.fillRect(-R * 0.38, hipY - R * 0.18, R * 0.76, R * 0.14);
  ctx.fillStyle = '#c8ccd2';
  for (let i = 0; i < 3; i++) ctx.fillRect(-R * 0.22 + i * R * 0.2, shY + R * 0.3, R * 0.06, R * 0.06);
  leg(ctx, R * 0.12, hipY, sw, R * 0.84, R * 0.22, k.dark, 0.3);
  // snouted head with spiked cap
  const hx = R * 0.22;
  const hy = shY - R * 0.28;
  const hr = R * 0.36;
  ctx.fillStyle = shade(k.body, -0.15);
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.4, hy - hr * 0.3);
  ctx.lineTo(hx - hr * 1.5, hy - hr * 1.1);
  ctx.lineTo(hx - hr * 0.6, hy + hr * 0.25);
  ctx.fill();
  outline(ctx, 1.4);
  blob(ctx, hx, hy, hr, hr * 0.9, k.body, 0, 2);
  blob(ctx, hx + hr * 0.95, hy + hr * 0.25, hr * 0.62, hr * 0.36, shade(k.body, -0.05), 0.1, 1.6);
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.5, hy + hr * 0.42);
  ctx.lineTo(hx + hr * 1.55, hy + hr * 0.38);
  ctx.lineTo(hx + hr * 1.35, hy + hr * 0.62);
  ctx.lineTo(hx + hr * 0.6, hy + hr * 0.62);
  ctx.closePath();
  ctx.fill();
  fangs(ctx, hx + hr * 0.6, hy + hr * 0.42, hx + hr * 1.45, hy + hr * 0.4, 4, hr * 0.18);
  ctx.fillStyle = '#1a1414';
  ellipse(ctx, hx + hr * 1.52, hy + hr * 0.1, hr * 0.1, hr * 0.08);
  ctx.fill();
  evilEye(ctx, hx + hr * 0.45, hy - hr * 0.12, hr * 0.2, k.eye);
  // iron cap with a spike
  ctx.fillStyle = fill(ctx, hx, hy - hr * 0.5, hr, '#8e97a3');
  ctx.beginPath();
  ctx.arc(hx, hy - hr * 0.15, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = '#cfd6de';
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.15, hy - hr * 1.05);
  ctx.lineTo(hx - hr * 0.3, hy - hr * 1.75);
  ctx.lineTo(hx + hr * 0.18, hy - hr * 1.05);
  ctx.fill();
  outline(ctx, 1.2);
  // spear thrust forward
  const ax = R * 0.2;
  const ay = shY + R * 0.2;
  const ex = ax + R * 0.45;
  const ey = ay + R * 0.45;
  limb(ctx, ax, ay, ex, ey, R * 0.17, shade(k.body, -0.1));
  const tx = ex + R * 1.1;
  const ty = ey - R * 0.55 + sw * R * 0.1;
  limb(ctx, ex - R * 0.5, ey + R * 0.25, tx, ty, Math.max(2, R * 0.07), '#7a5634');
  ctx.fillStyle = '#d6dde6';
  ctx.beginPath();
  const a = Math.atan2(ty - ey, tx - ex);
  ctx.moveTo(tx + Math.cos(a) * R * 0.45, ty + Math.sin(a) * R * 0.45);
  ctx.lineTo(tx + Math.cos(a + 1.9) * R * 0.14, ty + Math.sin(a + 1.9) * R * 0.14);
  ctx.lineTo(tx + Math.cos(a) * R * 0.1, ty + Math.sin(a) * R * 0.1);
  ctx.lineTo(tx + Math.cos(a - 1.9) * R * 0.14, ty + Math.sin(a - 1.9) * R * 0.14);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.2);
}

function imp(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.8;
  const bob = Math.abs(Math.cos(ph)) * R * 0.12;
  const hipY = -R * 0.75 - bob;
  const shY = -R * 1.35 - bob;
  // barbed tail
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = R * 0.1 + 3;
  ctx.beginPath();
  ctx.moveTo(-R * 0.3, hipY);
  ctx.bezierCurveTo(-R * 1.0, hipY + R * 0.2, -R * 0.9, hipY - R * (0.9 + Math.sin(ph) * 0.2), -R * 1.35, hipY - R * 0.8);
  ctx.stroke();
  ctx.strokeStyle = k.body;
  ctx.lineWidth = R * 0.1;
  ctx.stroke();
  ctx.fillStyle = k.dark;
  ctx.beginPath();
  ctx.moveTo(-R * 1.35, hipY - R * 0.8);
  ctx.lineTo(-R * 1.62, hipY - R * 0.62);
  ctx.lineTo(-R * 1.5, hipY - R * 1.05);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.2);
  // little bat wings
  for (const [s, col] of [
    [-0.25, shade(k.dark, -0.2)],
    [0, k.dark],
  ] as const) {
    ctx.save();
    ctx.translate(-R * 0.1 + s * R, shY + R * 0.1);
    ctx.rotate(-0.5 - Math.sin(ph * 2) * 0.25);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-R * 0.3, -R * 0.9);
    ctx.lineTo(-R * 0.5, -R * 0.5);
    ctx.lineTo(-R * 0.85, -R * 0.55);
    ctx.lineTo(-R * 0.75, -R * 0.2);
    ctx.lineTo(-R * 0.95, -R * 0.05);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.4);
    ctx.restore();
  }
  leg(ctx, -R * 0.1, hipY, -sw, R * 0.84, R * 0.16, shade(k.body, -0.35), 0.5);
  blob(ctx, R * 0.05, (hipY + shY) / 2, R * 0.36, R * 0.38, k.body, 0.3);
  leg(ctx, R * 0.1, hipY, sw, R * 0.84, R * 0.17, shade(k.body, -0.1), 0.5);
  // big grinning head with horns
  const hx = R * 0.32;
  const hy = shY - R * 0.3;
  const hr = R * 0.4;
  for (const side of [-1, 1]) {
    ctx.fillStyle = side < 0 ? shade(k.dark, -0.3) : k.dark;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.35 + side * hr * 0.2, hy - hr * 0.6);
    ctx.quadraticCurveTo(hx - hr * 0.5 + side * hr * 0.2, hy - hr * 1.5, hx + hr * 0.35 + side * hr * 0.2, hy - hr * 1.55);
    ctx.quadraticCurveTo(hx - hr * 0.05 + side * hr * 0.2, hy - hr * 1.1, hx + hr * 0.05 + side * hr * 0.2, hy - hr * 0.7);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.3);
  }
  ctx.fillStyle = shade(k.body, -0.1);
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.5, hy - hr * 0.1);
  ctx.lineTo(hx - hr * 1.45, hy - hr * 0.45);
  ctx.lineTo(hx - hr * 0.55, hy + hr * 0.3);
  ctx.fill();
  outline(ctx, 1.3);
  blob(ctx, hx, hy, hr, hr * 0.88, k.body, 0, 2);
  // wide grin
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.1, hy + hr * 0.25);
  ctx.quadraticCurveTo(hx + hr * 0.5, hy + hr * 0.75, hx + hr * 1.0, hy + hr * 0.12);
  ctx.quadraticCurveTo(hx + hr * 0.5, hy + hr * 0.35, hx - hr * 0.1, hy + hr * 0.25);
  ctx.fill();
  fangs(ctx, hx, hy + hr * 0.3, hx + hr * 0.9, hy + hr * 0.18, 5, hr * 0.15);
  evilEye(ctx, hx + hr * 0.42, hy - hr * 0.2, hr * 0.22, k.eye);
  brow(ctx, hx + hr * 0.42, hy - hr * 0.2, hr * 0.22, shade(k.body, -0.55));
  const ax = R * 0.2;
  const ay = shY + R * 0.12;
  limb(ctx, ax, ay, ax + R * 0.55, ay + R * 0.2 - sw * R * 0.1, R * 0.13, shade(k.body, -0.05));
  claws(ctx, ax + R * 0.55, ay + R * 0.2 - sw * R * 0.1, R * 0.2, -0.2);
}

function rat(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sc = Math.sin(ph * 2);
  const by = -R * 0.62 - Math.abs(sc) * R * 0.05;
  // long bald tail
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = R * 0.1 + 2.5;
  ctx.beginPath();
  ctx.moveTo(-R * 0.75, by + R * 0.05);
  ctx.bezierCurveTo(-R * 1.3, by + R * 0.1, -R * 1.2, by - R * (0.5 + sc * 0.15), -R * 1.85, by - R * 0.3);
  ctx.stroke();
  ctx.strokeStyle = '#d9a3a0';
  ctx.lineWidth = R * 0.1;
  ctx.stroke();
  for (const [x, off, col] of [
    [-R * 0.45, Math.PI, shade(k.dark, -0.2)],
    [R * 0.4, 0, shade(k.dark, -0.2)],
  ] as const) {
    const a = Math.sin(ph * 2 + off) * 0.6;
    limb(ctx, x, by + R * 0.2, x + Math.sin(a) * R * 0.35, -R * 0.02, R * 0.13, col);
  }
  // hunched mangy body
  ctx.fillStyle = fill(ctx, 0, by, R * 0.8, k.body);
  ctx.beginPath();
  ctx.moveTo(-R * 0.85, by + R * 0.25);
  ctx.quadraticCurveTo(-R * 0.9, by - R * 0.6, -R * 0.1, by - R * 0.62);
  ctx.quadraticCurveTo(R * 0.55, by - R * 0.55, R * 0.7, by - R * 0.1);
  ctx.quadraticCurveTo(R * 0.5, by + R * 0.35, -R * 0.85, by + R * 0.25);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  spikes(
    ctx,
    [
      [-R * 0.75, by - R * 0.3],
      [-R * 0.5, by - R * 0.55],
      [-R * 0.2, by - R * 0.64],
      [R * 0.1, by - R * 0.6],
      [R * 0.4, by - R * 0.42],
    ],
    R * 0.16,
    shade(k.body, -0.3),
    0.6,
  );
  // sores
  ctx.fillStyle = alpha('#9fd46a', 0.7);
  ellipse(ctx, -R * 0.3, by - R * 0.15, R * 0.09, R * 0.06);
  ctx.fill();
  for (const [x, off] of [
    [-R * 0.55, 0],
    [R * 0.3, Math.PI],
  ] as const) {
    const a = Math.sin(ph * 2 + off) * 0.6;
    limb(ctx, x, by + R * 0.2, x + Math.sin(a) * R * 0.35, -R * 0.02, R * 0.14, k.dark);
  }
  // pointed head with incisors
  const hx = R * 0.75;
  const hy = by - R * 0.2;
  ctx.fillStyle = shade(k.body, 0.1);
  ctx.beginPath();
  ctx.arc(hx - R * 0.15, hy - R * 0.3, R * 0.17, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx, 1.3);
  ctx.fillStyle = alpha('#e8a6a8', 0.8);
  ctx.beginPath();
  ctx.arc(hx - R * 0.15, hy - R * 0.3, R * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fill(ctx, hx, hy, R * 0.35, k.body);
  ctx.beginPath();
  ctx.moveTo(hx - R * 0.3, hy - R * 0.25);
  ctx.quadraticCurveTo(hx + R * 0.15, hy - R * 0.3, hx + R * 0.55, hy + R * 0.05);
  ctx.quadraticCurveTo(hx + R * 0.1, hy + R * 0.3, hx - R * 0.3, hy + R * 0.18);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = '#f4e9c8';
  ctx.fillRect(hx + R * 0.38, hy + R * 0.08, R * 0.07, R * 0.16);
  ctx.fillStyle = '#1a1414';
  ellipse(ctx, hx + R * 0.53, hy + R * 0.03, R * 0.06, R * 0.05);
  ctx.fill();
  evilEye(ctx, hx + R * 0.05, hy - R * 0.07, R * 0.08, k.eye);
}

function wolf(ctx: Ctx, R: number, ph: number, k: Look): void {
  const gallop = Math.sin(ph);
  const by = -R * 0.98 - Math.abs(Math.sin(ph * 2)) * R * 0.05;
  const bw = R * 1.08;
  const bh = R * 0.46;
  const legLen = R * 0.85;
  const legs: [number, number][] = [
    [bw * 0.55, 0],
    [-bw * 0.55, Math.PI],
    [bw * 0.45, Math.PI],
    [-bw * 0.62, 0],
  ];
  for (let i = 2; i < 4; i++) {
    const [lx, off] = legs[i];
    leg(ctx, lx, by + bh * 0.4, Math.sin(ph + off) * 0.6, legLen, R * 0.18, shade(k.dark, -0.3), lx < 0 ? 0.35 : -0.25);
  }
  // bristling tail
  ctx.fillStyle = shade(k.dark, 0.05);
  ctx.beginPath();
  ctx.moveTo(-bw * 0.8, by - bh * 0.25);
  ctx.lineTo(-bw * 1.35, by - bh * (0.9 + gallop * 0.25));
  ctx.lineTo(-bw * 1.25, by - bh * 0.45);
  ctx.lineTo(-bw * 1.7, by - bh * (0.4 + gallop * 0.2));
  ctx.lineTo(-bw * 1.2, by + bh * 0.05);
  ctx.lineTo(-bw * 0.8, by + bh * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  // body, deeper at the chest
  ctx.fillStyle = fill(ctx, 0, by, bw, k.body);
  ctx.beginPath();
  ctx.moveTo(-bw * 0.9, by);
  ctx.quadraticCurveTo(-bw * 0.8, by - bh * 1.05, bw * 0.1, by - bh * 1.0);
  ctx.quadraticCurveTo(bw * 0.75, by - bh * 1.25, bw * 0.95, by - bh * 0.2);
  ctx.quadraticCurveTo(bw * 0.8, by + bh * 1.1, bw * 0.2, by + bh * 0.8);
  ctx.quadraticCurveTo(-bw * 0.6, by + bh * 0.7, -bw * 0.9, by);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.2);
  // raised hackles
  spikes(
    ctx,
    [
      [-bw * 0.7, by - bh * 0.75],
      [-bw * 0.4, by - bh * 0.98],
      [-bw * 0.05, by - bh * 1.02],
      [bw * 0.3, by - bh * 1.12],
      [bw * 0.62, by - bh * 1.05],
    ],
    R * 0.3,
    shade(k.dark, 0.1),
    0.55,
  );
  for (let i = 0; i < 2; i++) {
    const [lx, off] = legs[i];
    const [fx, fy] = leg(ctx, lx, by + bh * 0.4, Math.sin(ph + off) * 0.6, legLen, R * 0.2, shade(k.dark, 0.08), lx < 0 ? 0.35 : -0.25);
    if (i === 0) claws(ctx, fx, fy - R * 0.02, R * 0.12, 0.2);
  }
  // lowered head with open jaws
  const hx = bw * 1.05;
  const hy = by - bh * 0.15;
  const hr = R * 0.4;
  ctx.fillStyle = shade(k.dark, 0.1);
  for (const ex of [-0.25, 0.05]) {
    ctx.beginPath();
    ctx.moveTo(hx + ex * R - hr * 0.3, hy - hr * 0.45);
    ctx.lineTo(hx + ex * R - hr * 0.35, hy - hr * 1.45);
    ctx.lineTo(hx + ex * R + hr * 0.25, hy - hr * 0.55);
    ctx.fill();
    outline(ctx, 1.5);
  }
  blob(ctx, hx, hy, hr, hr * 0.82, k.body, 0, 2);
  // upper jaw
  ctx.fillStyle = fill(ctx, hx + hr, hy, hr, shade(k.body, 0.05));
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.2, hy - hr * 0.35);
  ctx.lineTo(hx + hr * 1.75, hy + hr * 0.02);
  ctx.lineTo(hx + hr * 1.6, hy + hr * 0.3);
  ctx.lineTo(hx + hr * 0.3, hy + hr * 0.3);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  // lower jaw, hanging open
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.3, hy + hr * 0.3);
  ctx.lineTo(hx + hr * 1.6, hy + hr * 0.3);
  ctx.lineTo(hx + hr * 1.3, hy + hr * 0.75);
  ctx.lineTo(hx + hr * 0.3, hy + hr * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(k.body, -0.15);
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.25, hy + hr * 0.62);
  ctx.lineTo(hx + hr * 1.35, hy + hr * 0.72);
  ctx.lineTo(hx + hr * 1.2, hy + hr * 0.95);
  ctx.lineTo(hx + hr * 0.2, hy + hr * 0.85);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.4);
  fangs(ctx, hx + hr * 0.45, hy + hr * 0.3, hx + hr * 1.55, hy + hr * 0.3, 5, hr * 0.22);
  fangs(ctx, hx + hr * 0.45, hy + hr * 0.66, hx + hr * 1.25, hy + hr * 0.74, 3, hr * 0.18, -1);
  ctx.fillStyle = '#101014';
  ellipse(ctx, hx + hr * 1.72, hy - hr * 0.02, hr * 0.12, hr * 0.1);
  ctx.fill();
  evilEye(ctx, hx + hr * 0.45, hy - hr * 0.18, hr * 0.2, k.eye);
  brow(ctx, hx + hr * 0.45, hy - hr * 0.18, hr * 0.2, shade(k.dark, -0.2));
}

function boar(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 0.95 - Math.abs(Math.sin(ph * 2)) * R * 0.04;
  const bw = R * 1.1;
  const bh = R * 0.7;
  const legLen = R * 0.6;
  for (const [lx, off] of [
    [bw * 0.45, Math.PI],
    [-bw * 0.6, 0],
  ] as const) {
    limb(ctx, lx, by + bh * 0.4, lx + Math.sin(Math.sin(ph + off) * 0.5) * legLen, by + bh * 0.4 + legLen, R * 0.26, shade(k.dark, -0.3));
  }
  // humped body, massive at the shoulders
  ctx.fillStyle = fill(ctx, bw * 0.1, by - bh * 0.2, bw, k.body);
  ctx.beginPath();
  ctx.moveTo(-bw * 0.9, by + bh * 0.1);
  ctx.quadraticCurveTo(-bw * 0.95, by - bh * 0.8, -bw * 0.1, by - bh * 0.9);
  ctx.quadraticCurveTo(bw * 0.55, by - bh * 1.5, bw * 0.95, by - bh * 0.35);
  ctx.quadraticCurveTo(bw * 1.0, by + bh * 0.75, bw * 0.3, by + bh * 0.7);
  ctx.quadraticCurveTo(-bw * 0.6, by + bh * 0.7, -bw * 0.9, by + bh * 0.1);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.4);
  spikes(
    ctx,
    [
      [-bw * 0.75, by - bh * 0.5],
      [-bw * 0.45, by - bh * 0.82],
      [-bw * 0.1, by - bh * 0.95],
      [bw * 0.25, by - bh * 1.15],
      [bw * 0.55, by - bh * 1.12],
      [bw * 0.8, by - bh * 0.75],
    ],
    R * 0.38,
    shade(k.dark, 0.05),
    0.6,
  );
  if (k.armored) {
    // riveted war-plates
    for (let i = 0; i < 3; i++) {
      const px = -bw * 0.55 + i * bw * 0.45;
      ctx.fillStyle = fill(ctx, px, by - bh * 0.25, bh * 0.5, '#8d9aab');
      roundRect(ctx, px - bw * 0.2, by - bh * 0.6, bw * 0.4, bh * 0.75, bh * 0.15);
      ctx.fill();
      outline(ctx, 1.6);
      ctx.fillStyle = '#dfe6ee';
      ctx.beginPath();
      ctx.arc(px, by - bh * 0.25, bh * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const [lx, off] of [
    [bw * 0.55, 0],
    [-bw * 0.5, Math.PI],
  ] as const) {
    limb(ctx, lx, by + bh * 0.4, lx + Math.sin(Math.sin(ph + off) * 0.5) * legLen, by + bh * 0.4 + legLen, R * 0.28, shade(k.dark, 0.05));
  }
  // lowered head with long tusks
  const hx = bw * 0.98;
  const hy = by + bh * 0.05;
  const hr = R * 0.45;
  blob(ctx, hx, hy, hr, hr * 0.85, shade(k.body, -0.05), 0.2, 2);
  ctx.fillStyle = shade(k.dark, 0.25);
  ellipse(ctx, hx + hr * 0.85, hy + hr * 0.3, hr * 0.45, hr * 0.38);
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = '#140d0d';
  ellipse(ctx, hx + hr * 1.18, hy + hr * 0.22, hr * 0.09, hr * 0.13);
  ctx.fill();
  for (const [s, w] of [
    [1, 4],
    [0.8, 3],
  ] as const) {
    ctx.strokeStyle = 'rgba(8,14,28,0.8)';
    ctx.lineWidth = w + 2.5;
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.7 * s, hy + hr * 0.6);
    ctx.quadraticCurveTo(hx + hr * 1.5, hy + hr * 0.7, hx + hr * 1.45 * s, hy - hr * 0.55);
    ctx.stroke();
    ctx.strokeStyle = BONE;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  evilEye(ctx, hx + hr * 0.2, hy - hr * 0.25, hr * 0.18, k.eye);
  brow(ctx, hx + hr * 0.2, hy - hr * 0.25, hr * 0.18, shade(k.dark, -0.1));
}

function troll(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.5;
  const bob = Math.abs(Math.cos(ph)) * R * 0.06;
  const hipY = -R * 0.95 - bob;
  const shY = -R * 1.85 - bob;
  const tw = R * 1.05;
  leg(ctx, -R * 0.15, hipY, -sw, R * 0.98, R * 0.28, shade(k.dark, -0.2), 0.3);
  limb(ctx, -R * 0.05, shY + R * 0.2, R * 0.2 + sw * R * 0.3, shY + R * 1.3, R * 0.24, shade(k.body, -0.4));
  claws(ctx, R * 0.2 + sw * R * 0.3, shY + R * 1.3, R * 0.24, 1.4);
  // hunched torso
  ctx.fillStyle = fill(ctx, 0, (hipY + shY) / 2, tw, k.body);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.4, hipY);
  ctx.quadraticCurveTo(-tw * 0.75, (hipY + shY) / 2, -tw * 0.2, shY - R * 0.15);
  ctx.quadraticCurveTo(tw * 0.4, shY - R * 0.35, tw * 0.62, shY + R * 0.1);
  ctx.quadraticCurveTo(tw * 0.55, (hipY + shY) / 2, tw * 0.38, hipY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.4);
  // war paint
  ctx.strokeStyle = alpha(k.eye, 0.55);
  ctx.lineWidth = Math.max(1.5, R * 0.06);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-tw * 0.1 + i * tw * 0.18, shY + R * 0.25);
    ctx.lineTo(-tw * 0.2 + i * tw * 0.18, shY + R * 0.55);
    ctx.stroke();
  }
  if (k.boss) {
    // bone armor for the warlord
    ctx.fillStyle = fill(ctx, -tw * 0.2, shY, R * 0.4, BONE);
    ctx.beginPath();
    ctx.arc(-tw * 0.15, shY + R * 0.05, R * 0.38, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.6);
    spikes(
      ctx,
      [
        [-tw * 0.5, shY + R * 0.05],
        [-tw * 0.3, shY - R * 0.25],
        [-tw * 0.05, shY - R * 0.3],
        [tw * 0.2, shY - R * 0.15],
      ],
      R * 0.35,
      BONE,
    );
  }
  ctx.fillStyle = shade(k.dark, -0.1);
  ctx.fillRect(-tw * 0.4, hipY - R * 0.2, tw * 0.8, R * 0.18);
  leg(ctx, R * 0.15, hipY, sw, R * 0.98, R * 0.3, k.dark, 0.3);
  // head thrust forward
  const hx = tw * 0.55;
  const hy = shY - R * 0.05;
  const hr = R * 0.36;
  spikes(
    ctx,
    [
      [hx - hr * 1.0, hy - hr * 0.1],
      [hx - hr * 0.7, hy - hr * 0.75],
      [hx - hr * 0.2, hy - hr * 1.0],
      [hx + hr * 0.3, hy - hr * 0.85],
    ],
    hr * 0.9,
    shade(k.eye, -0.35),
    0.8,
  );
  blob(ctx, hx, hy, hr, hr * 0.9, k.body, 0, 2);
  ctx.fillStyle = shade(k.body, -0.1);
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.4, hy - hr * 0.2);
  ctx.lineTo(hx - hr * 1.6, hy - hr * 0.65);
  ctx.lineTo(hx - hr * 0.55, hy + hr * 0.25);
  ctx.fill();
  outline(ctx, 1.4);
  // underbite with tusks
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.1, hy + hr * 0.35);
  ctx.lineTo(hx + hr * 1.05, hy + hr * 0.3);
  ctx.lineTo(hx + hr * 0.95, hy + hr * 0.6);
  ctx.lineTo(hx + hr * 0.15, hy + hr * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = BONE;
  for (const tx of [0.35, 0.85]) {
    ctx.beginPath();
    ctx.moveTo(hx + hr * tx - hr * 0.1, hy + hr * 0.6);
    ctx.lineTo(hx + hr * tx + hr * 0.12, hy - hr * 0.05);
    ctx.lineTo(hx + hr * tx + hr * 0.12, hy + hr * 0.6);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1);
  }
  evilEye(ctx, hx + hr * 0.45, hy - hr * 0.18, hr * 0.2, k.eye);
  brow(ctx, hx + hr * 0.45, hy - hr * 0.18, hr * 0.2, shade(k.body, -0.55));
  if (k.boss) crown(ctx, hx - hr * 0.05, hy - hr * 0.72, hr * 1.5, hr * 0.7, '#c9b27a', 3);
  // weapon arm
  const ax = R * 0.25;
  const ay = shY + R * 0.25;
  const ex = ax + R * 0.35;
  const ey = ay + R * 0.7;
  limb(ctx, ax, ay, ex, ey, R * 0.26, shade(k.body, -0.1));
  if (k.boss) {
    // great axe
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(-1.1 + Math.sin(ph) * 0.15);
    ctx.fillStyle = '#5a3d26';
    ctx.fillRect(-R * 0.3, -R * 0.06, R * 1.9, R * 0.12);
    ctx.fillStyle = fill(ctx, R * 1.5, 0, R * 0.5, '#aeb8c4');
    ctx.beginPath();
    ctx.moveTo(R * 1.25, -R * 0.08);
    ctx.quadraticCurveTo(R * 1.35, -R * 0.75, R * 1.85, -R * 0.7);
    ctx.quadraticCurveTo(R * 1.6, 0, R * 1.85, R * 0.7);
    ctx.quadraticCurveTo(R * 1.35, R * 0.75, R * 1.25, R * 0.08);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.8);
    ctx.restore();
  } else weaponClub(ctx, ex, ey, R * 1.2, R * 0.28, -1.0 + Math.sin(ph) * 0.2, '#6b4a2e', BONE);
}

function giant(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.45;
  const bob = Math.abs(Math.cos(ph)) * R * 0.05;
  const hipY = -R * 1.0 - bob;
  const shY = -R * 2.05 - bob;
  const tw = R * 1.15;
  leg(ctx, -R * 0.2, hipY, -sw, R * 1.03, R * 0.34, shade(k.body, -0.45), 0.25);
  limb(ctx, -tw * 0.35, shY + R * 0.25, -tw * 0.3 + sw * R * 0.3, shY + R * 1.2, R * 0.28, shade(k.body, -0.4));
  // torso with fur loincloth
  ctx.fillStyle = fill(ctx, 0, (hipY + shY) / 2, tw, k.body);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.42, hipY);
  ctx.quadraticCurveTo(-tw * 0.68, (hipY + shY) / 2, -tw * 0.5, shY);
  ctx.lineTo(tw * 0.5, shY);
  ctx.quadraticCurveTo(tw * 0.68, (hipY + shY) / 2, tw * 0.42, hipY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.4);
  ctx.strokeStyle = alpha(k.dark, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-tw * 0.2, shY + R * 0.3);
  ctx.quadraticCurveTo(0, shY + R * 0.5, tw * 0.2, shY + R * 0.3);
  ctx.stroke();
  ctx.fillStyle = '#5b4a3c';
  ctx.beginPath();
  ctx.moveTo(-tw * 0.46, hipY - R * 0.2);
  ctx.lineTo(tw * 0.46, hipY - R * 0.2);
  for (let i = 0; i <= 6; i++) ctx.lineTo(tw * 0.46 - (i * tw * 0.92) / 6, hipY + R * (i % 2 ? 0.28 : 0.12));
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  // ice pauldrons
  for (const side of [-1, 1]) {
    const px = side * tw * 0.45;
    blob(ctx, px, shY + R * 0.08, R * 0.34, R * 0.26, k.dark, 0, 1.8);
    spikes(
      ctx,
      [
        [px - R * 0.32, shY + R * 0.05],
        [px - R * 0.1, shY - R * 0.2],
        [px + R * 0.12, shY - R * 0.2],
        [px + R * 0.33, shY + R * 0.05],
      ],
      R * 0.4,
      shade(k.eye, 0.35),
      0.1,
    );
  }
  leg(ctx, R * 0.2, hipY, sw, R * 1.03, R * 0.36, shade(k.body, -0.2), 0.25);
  // head: heavy brow, icicle beard, crown of ice
  const hx = R * 0.18;
  const hy = shY - R * 0.4;
  const hr = R * 0.38;
  blob(ctx, hx, hy, hr, hr, k.body, 0, 2);
  ctx.fillStyle = shade(k.eye, 0.5);
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.5, hy + hr * 0.25);
  for (let i = 0; i <= 6; i++) {
    const px = hx - hr * 0.5 + (i * hr * 1.5) / 6;
    ctx.lineTo(px, hy + hr * (i % 2 ? 0.55 : 1.35 - i * 0.08));
  }
  ctx.lineTo(hx + hr * 1.0, hy + hr * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.4);
  ctx.fillStyle = MAW;
  ellipse(ctx, hx + hr * 0.55, hy + hr * 0.38, hr * 0.28, hr * 0.12);
  ctx.fill();
  fangs(ctx, hx + hr * 0.3, hy + hr * 0.3, hx + hr * 0.8, hy + hr * 0.3, 3, hr * 0.15);
  evilEye(ctx, hx + hr * 0.45, hy - hr * 0.15, hr * 0.2, k.eye);
  brow(ctx, hx + hr * 0.45, hy - hr * 0.15, hr * 0.2, shade(k.body, -0.6));
  crown(ctx, hx - hr * 0.05, hy - hr * 0.7, hr * 1.9, hr * 0.9, shade(k.eye, 0.4), 4);
  // near arm raising an ice-spiked club
  const ax = tw * 0.4;
  const ay = shY + R * 0.3;
  const ex = ax + R * 0.2;
  const ey = ay + R * 0.75;
  limb(ctx, ax, ay, ex, ey, R * 0.3, shade(k.body, -0.1));
  weaponClub(ctx, ex, ey, R * 1.5, R * 0.34, -1.25 + Math.sin(ph) * 0.18, shade(k.dark, 0.1), shade(k.eye, 0.45));
}

function knight(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.45;
  const bob = Math.abs(Math.cos(ph)) * R * 0.05;
  const hipY = -R * 1.0 - bob;
  const shY = -R * 2.0 - bob;
  const tw = R * 0.9;
  const plate = k.body;
  // tattered cape
  ctx.fillStyle = shade(k.dark, -0.1);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.35, shY + R * 0.05);
  ctx.quadraticCurveTo(-tw * 1.2, hipY, -tw * (1.2 + Math.sin(ph) * 0.1), -R * 0.25);
  for (let i = 0; i < 4; i++) ctx.lineTo(-tw * (1.05 - i * 0.28), -R * (i % 2 ? 0.45 : 0.15));
  ctx.lineTo(tw * 0.1, hipY + R * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  leg(ctx, -R * 0.15, hipY, -sw, R * 1.02, R * 0.28, shade(plate, -0.45), 0.2);
  // sword arm behind
  const sx = -R * 0.2;
  const sy = shY + R * 0.2;
  limb(ctx, sx, sy, sx - R * 0.3, sy + R * 0.6, R * 0.22, shade(plate, -0.35));
  ctx.save();
  ctx.translate(sx - R * 0.3, sy + R * 0.6);
  ctx.rotate(-2.3 + Math.sin(ph) * 0.12);
  ctx.fillStyle = '#c9d2dc';
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.07);
  ctx.lineTo(R * 1.45, -R * 0.05);
  ctx.lineTo(R * 1.65, 0);
  ctx.lineTo(R * 1.45, R * 0.05);
  ctx.lineTo(0, R * 0.07);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.4);
  ctx.fillStyle = '#3a3040';
  ctx.fillRect(-R * 0.05, -R * 0.22, R * 0.1, R * 0.44);
  ctx.restore();
  // breastplate
  const g = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0);
  g.addColorStop(0, shade(plate, -0.45));
  g.addColorStop(0.45, shade(plate, 0.15));
  g.addColorStop(1, shade(plate, -0.5));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-tw * 0.45, hipY);
  ctx.lineTo(-tw * 0.55, shY + R * 0.05);
  ctx.lineTo(tw * 0.55, shY + R * 0.05);
  ctx.lineTo(tw * 0.45, hipY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.2);
  ctx.fillStyle = k.dark;
  ctx.fillRect(-tw * 0.46, hipY - R * 0.2, tw * 0.92, R * 0.16);
  // spiked pauldron
  blob(ctx, tw * 0.3, shY + R * 0.1, R * 0.36, R * 0.24, shade(plate, -0.1), 0, 1.8);
  spikes(
    ctx,
    [
      [tw * 0.3 - R * 0.34, shY + R * 0.05],
      [tw * 0.3 - R * 0.1, shY - R * 0.12],
      [tw * 0.3 + R * 0.12, shY - R * 0.12],
      [tw * 0.3 + R * 0.35, shY + R * 0.05],
    ],
    R * (k.armored ? 0.45 : 0.3),
    shade(plate, 0.25),
    0.15,
  );
  leg(ctx, R * 0.15, hipY, sw, R * 1.02, R * 0.3, shade(plate, -0.25), 0.2);
  // great helm with a glowing slit
  const hx = R * 0.12;
  const hy = shY - R * 0.38;
  const hr = R * 0.36;
  ctx.fillStyle = fill(ctx, hx, hy, hr, shade(plate, 0.05));
  roundRect(ctx, hx - hr * 0.85, hy - hr * 0.9, hr * 1.8, hr * 1.85, hr * 0.45);
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = '#07090f';
  ctx.fillRect(hx - hr * 0.2, hy - hr * 0.2, hr * 1.1, hr * 0.26);
  ctx.fillRect(hx + hr * 0.4, hy - hr * 0.2, hr * 0.22, hr * 0.75);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, hx + hr * 0.45, hy - hr * 0.07, hr * 1.2, k.eye, 0.9);
  ctx.restore();
  ctx.fillStyle = shade(k.eye, 0.5);
  ctx.fillRect(hx - hr * 0.05, hy - hr * 0.13, hr * 0.85, hr * 0.12);
  // horns of black iron
  for (const side of [0, 1]) {
    ctx.fillStyle = side ? '#2a2630' : '#1c1a22';
    ctx.beginPath();
    const bx = hx - hr * (0.3 + side * 0.35);
    ctx.moveTo(bx, hy - hr * 0.8);
    ctx.quadraticCurveTo(bx - hr * 0.2, hy - hr * 1.7, bx + hr * 0.5, hy - hr * 2.0);
    ctx.quadraticCurveTo(bx + hr * 0.1, hy - hr * 1.5, bx + hr * 0.3, hy - hr * 0.85);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.2);
  }
  // kite shield in front with a skull
  const shx = R * 0.55;
  const shy = shY + R * 0.35;
  ctx.fillStyle = fill(ctx, shx + R * 0.2, shy + R * 0.4, R * 0.6, shade(k.dark, 0.15));
  ctx.beginPath();
  ctx.moveTo(shx, shy);
  ctx.lineTo(shx + R * 0.62, shy);
  ctx.lineTo(shx + R * 0.62, shy + R * 0.75);
  ctx.quadraticCurveTo(shx + R * 0.45, shy + R * 1.15, shx + R * 0.31, shy + R * 1.3);
  ctx.quadraticCurveTo(shx + R * 0.1, shy + R * 1.15, shx, shy + R * 0.75);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.2);
  ctx.strokeStyle = alpha('#d8dee8', 0.7);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const skx = shx + R * 0.31;
  const sky = shy + R * 0.5;
  ctx.fillStyle = BONE;
  ellipse(ctx, skx, sky, R * 0.17, R * 0.15);
  ctx.fill();
  ctx.fillRect(skx - R * 0.09, sky + R * 0.08, R * 0.18, R * 0.12);
  ctx.fillStyle = '#120c14';
  ellipse(ctx, skx - R * 0.07, sky, R * 0.05, R * 0.05);
  ctx.fill();
  ellipse(ctx, skx + R * 0.07, sky, R * 0.05, R * 0.05);
  ctx.fill();
  if (k.armored) {
    spikes(
      ctx,
      [
        [shx + R * 0.62, shy + R * 0.1],
        [shx + R * 0.62, shy + R * 0.45],
        [shx + R * 0.62, shy + R * 0.8],
      ],
      R * 0.3,
      '#cfd6de',
      -0.6,
    );
  }
}

function tyrant(ctx: Ctx, R: number, ph: number, k: Look): void {
  const sw = Math.sin(ph) * 0.35;
  const bob = Math.abs(Math.cos(ph)) * R * 0.04;
  const hipY = -R * 1.05 - bob;
  const shY = -R * 2.1 - bob;
  const tw = R * 1.15;
  // storm cape
  ctx.fillStyle = shade(k.dark, -0.25);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.45, shY);
  ctx.quadraticCurveTo(-tw * 1.5, hipY - R * 0.2, -tw * (1.45 + Math.sin(ph) * 0.1), -R * 0.1);
  for (let i = 0; i < 6; i++) ctx.lineTo(-tw * (1.3 - i * 0.28), -R * (i % 2 ? 0.35 : 0.02));
  ctx.lineTo(tw * 0.2, hipY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = alpha(k.eye, 0.35);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.4, shY + R * 0.1);
  ctx.quadraticCurveTo(-tw * 1.2, hipY, -tw * 1.3, -R * 0.2);
  ctx.lineTo(-tw * 1.15, -R * 0.15);
  ctx.quadraticCurveTo(-tw * 1.0, hipY, -tw * 0.3, shY + R * 0.3);
  ctx.closePath();
  ctx.fill();
  leg(ctx, -R * 0.2, hipY, -sw, R * 1.08, R * 0.36, shade(k.body, -0.5), 0.2);
  // dark plate armor
  ctx.fillStyle = fill(ctx, 0, (hipY + shY) / 2, tw, k.dark);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.45, hipY + R * 0.1);
  ctx.lineTo(-tw * 0.6, shY);
  ctx.lineTo(tw * 0.6, shY);
  ctx.lineTo(tw * 0.45, hipY + R * 0.1);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.4);
  // glowing rune on the chest
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, shY + R * 0.5, R * 0.6, k.eye, 0.8);
  ctx.restore();
  ctx.strokeStyle = shade(k.eye, 0.5);
  ctx.lineWidth = Math.max(2, R * 0.06);
  ctx.beginPath();
  ctx.moveTo(0, shY + R * 0.2);
  ctx.lineTo(-R * 0.18, shY + R * 0.5);
  ctx.lineTo(0, shY + R * 0.8);
  ctx.lineTo(R * 0.18, shY + R * 0.5);
  ctx.closePath();
  ctx.stroke();
  // ice-spiked pauldrons
  for (const side of [-1, 1]) {
    const px = side * tw * 0.5;
    blob(ctx, px, shY + R * 0.05, R * 0.42, R * 0.3, shade(k.body, -0.2), 0, 2);
    spikes(
      ctx,
      [
        [px - R * 0.4, shY],
        [px - R * 0.15, shY - R * 0.25],
        [px + R * 0.15, shY - R * 0.25],
        [px + R * 0.4, shY],
      ],
      R * 0.6,
      shade(k.eye, 0.55),
      side * 0.2,
    );
  }
  leg(ctx, R * 0.2, hipY, sw, R * 1.08, R * 0.38, shade(k.body, -0.3), 0.2);
  // skull helm with a tall crown of ice
  const hx = R * 0.12;
  const hy = shY - R * 0.42;
  const hr = R * 0.4;
  crown(ctx, hx, hy - hr * 0.55, hr * 2.4, hr * 1.5, shade(k.eye, 0.5), 5);
  ctx.fillStyle = fill(ctx, hx, hy, hr, '#cfd8e6');
  ellipse(ctx, hx, hy, hr * 0.95, hr);
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = '#070910';
  ellipse(ctx, hx + hr * 0.1, hy - hr * 0.05, hr * 0.28, hr * 0.24);
  ctx.fill();
  ellipse(ctx, hx + hr * 0.62, hy - hr * 0.05, hr * 0.22, hr * 0.22);
  ctx.fill();
  evilEye(ctx, hx + hr * 0.15, hy - hr * 0.05, hr * 0.2, k.eye);
  evilEye(ctx, hx + hr * 0.62, hy - hr * 0.05, hr * 0.17, k.eye);
  ctx.fillStyle = '#070910';
  ctx.fillRect(hx - hr * 0.2, hy + hr * 0.4, hr * 1.0, hr * 0.3);
  fangs(ctx, hx - hr * 0.15, hy + hr * 0.4, hx + hr * 0.75, hy + hr * 0.4, 5, hr * 0.2);
  // frost greatsword
  const ax = tw * 0.42;
  const ay = shY + R * 0.3;
  const ex = ax + R * 0.2;
  const ey = ay + R * 0.7;
  limb(ctx, ax, ay, ex, ey, R * 0.3, shade(k.dark, 0.1));
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(-1.35 + Math.sin(ph) * 0.1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, R * 1.2, 0, R * 1.2, k.eye, 0.45);
  ctx.restore();
  ctx.fillStyle = fill(ctx, R * 1.2, 0, R, shade(k.eye, 0.6));
  ctx.beginPath();
  ctx.moveTo(R * 0.25, -R * 0.16);
  ctx.lineTo(R * 2.2, -R * 0.1);
  ctx.lineTo(R * 2.55, 0);
  ctx.lineTo(R * 2.2, R * 0.1);
  ctx.lineTo(R * 0.25, R * 0.16);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = '#2a2433';
  ctx.fillRect(R * 0.15, -R * 0.35, R * 0.14, R * 0.7);
  ctx.fillRect(-R * 0.35, -R * 0.06, R * 0.5, R * 0.12);
  ctx.restore();
}

// ───────────────────────────────────────────────── crawlers

function spider(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 0.72;
  const legOf = (i: number, side: number) => {
    const a = Math.sin(ph * 2 + i * 1.3 + side * Math.PI) * 0.35;
    const sx = -R * 0.2 + i * R * 0.18;
    const dir = i < 2 ? -1 : 1;
    const kneeX = sx + dir * R * 0.45 + Math.sin(a) * R * 0.2;
    const kneeY = by - R * (0.7 - Math.cos(a) * 0.1);
    const footX = sx + dir * R * 0.95 + Math.sin(a) * R * 0.35;
    const col = side === 0 ? shade(k.dark, -0.35) : k.dark;
    ctx.strokeStyle = 'rgba(8,14,28,0.85)';
    ctx.lineWidth = R * 0.1 + 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, by);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, 0);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = R * 0.1;
    ctx.stroke();
    ctx.fillStyle = alpha(k.eye, 0.8);
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, R * 0.04, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let i = 0; i < 4; i++) legOf(i, 0);
  // abdomen with a skull mark
  blob(ctx, -R * 0.55, by - R * 0.15, R * 0.7, R * 0.58, k.body);
  ctx.fillStyle = alpha(BONE, 0.8);
  ellipse(ctx, -R * 0.6, by - R * 0.3, R * 0.2, R * 0.17);
  ctx.fill();
  ctx.fillRect(-R * 0.69, by - R * 0.2, R * 0.18, R * 0.1);
  ctx.fillStyle = k.body;
  ellipse(ctx, -R * 0.66, by - R * 0.3, R * 0.05, R * 0.05);
  ctx.fill();
  ellipse(ctx, -R * 0.53, by - R * 0.3, R * 0.05, R * 0.05);
  ctx.fill();
  spikes(
    ctx,
    [
      [-R * 1.15, by - R * 0.2],
      [-R * 0.95, by - R * 0.55],
      [-R * 0.6, by - R * 0.72],
      [-R * 0.25, by - R * 0.6],
    ],
    R * 0.18,
    shade(k.dark, 0.1),
    0.5,
  );
  for (let i = 0; i < 4; i++) legOf(i, 1);
  // head with fangs and a cluster of eyes
  blob(ctx, R * 0.28, by, R * 0.38, R * 0.33, shade(k.body, -0.1));
  for (const s of [0, 1]) {
    ctx.fillStyle = s ? BONE : shade(BONE, -0.3);
    ctx.beginPath();
    const fx = R * (0.55 + s * 0.08);
    ctx.moveTo(fx, by + R * 0.05);
    ctx.quadraticCurveTo(fx + R * 0.3, by + R * 0.15, fx + R * 0.12, by + R * 0.48);
    ctx.lineTo(fx + R * 0.03, by + R * 0.2);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1);
  }
  const eyes: [number, number, number][] = [
    [0.44, -0.16, 0.07],
    [0.56, -0.1, 0.06],
    [0.36, -0.05, 0.05],
    [0.5, 0.0, 0.05],
    [0.3, -0.2, 0.045],
  ];
  for (const [ex, ey, er] of eyes) evilEye(ctx, R * ex, by + R * ey, R * er, k.eye);
}

function crab(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 0.62;
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const a = Math.sin(ph * 2 + i + (side > 0 ? 1.5 : 0)) * 0.3;
      const sx = side * R * (0.35 + i * 0.18);
      const kx = sx + side * R * 0.3;
      const ky = by - R * 0.15;
      limb(ctx, sx, by + R * 0.1, kx, ky, R * 0.1, shade(k.dark, -0.2));
      limb(ctx, kx, ky, kx + side * R * 0.15 + Math.sin(a) * R * 0.15, 0, R * 0.08, shade(k.dark, -0.2));
    }
  }
  // raised, open pincers
  for (const side of [-1, 1]) {
    const lift = Math.sin(ph + (side > 0 ? 0 : Math.PI)) * R * 0.12;
    const cx = side * R * 1.0;
    const cy = by - R * 0.85 - lift;
    limb(ctx, side * R * 0.55, by - R * 0.1, cx, cy + R * 0.25, R * 0.15, k.dark);
    for (const [rot, sc] of [
      [-0.5, 1],
      [0.35, 0.8],
    ] as const) {
      ctx.save();
      ctx.translate(cx, cy + R * 0.15);
      ctx.rotate(side * rot - (side > 0 ? 0.6 : Math.PI + 0.6) * 0 + (side > 0 ? -0.8 : -2.35));
      ctx.fillStyle = fill(ctx, R * 0.3, 0, R * 0.3, k.body);
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.12 * sc);
      ctx.quadraticCurveTo(R * 0.45 * sc, -R * 0.25 * sc, R * 0.6 * sc, R * 0.02);
      ctx.quadraticCurveTo(R * 0.3 * sc, 0, 0, R * 0.12 * sc);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.6);
      ctx.restore();
    }
  }
  // spiked shell
  ctx.fillStyle = fill(ctx, 0, by, R, k.body);
  ctx.beginPath();
  ctx.ellipse(0, by, R * 0.88, R * 0.5, 0, Math.PI, 0);
  ctx.quadraticCurveTo(R * 0.7, by + R * 0.35, 0, by + R * 0.32);
  ctx.quadraticCurveTo(-R * 0.7, by + R * 0.35, -R * 0.88, by);
  ctx.fill();
  outline(ctx, 2.2);
  const rim: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    rim.push([Math.cos(a) * R * 0.86, by + Math.sin(a) * R * 0.48]);
  }
  spikes(ctx, rim, R * 0.28, shade(k.body, 0.25), 0);
  ctx.fillStyle = alpha(shade(k.body, -0.4), 0.7);
  ellipse(ctx, 0, by - R * 0.15, R * 0.4, R * 0.14);
  ctx.fill();
  // eye stalks
  for (const s of [-0.2, 0.2]) {
    limb(ctx, s * R, by - R * 0.3, s * R * 1.3, by - R * 0.72, 2.5, k.dark);
    evilEye(ctx, s * R * 1.3 + R * 0.02, by - R * 0.75, R * 0.07, k.eye);
  }
  ctx.fillStyle = MAW;
  ellipse(ctx, R * 0.05, by + R * 0.12, R * 0.25, R * 0.08);
  ctx.fill();
  fangs(ctx, -R * 0.15, by + R * 0.08, R * 0.25, by + R * 0.08, 4, R * 0.08);
}

function beetle(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 0.62;
  for (let i = 0; i < 3; i++) {
    const a = Math.sin(ph * 2 + i * 2) * 0.4;
    const sx = -R * 0.4 + i * R * 0.42;
    limb(ctx, sx, by, sx + Math.sin(a) * R * 0.3 + R * 0.05, 0, R * 0.1, shade(k.dark, -0.25));
  }
  blob(ctx, -R * 0.08, by - R * 0.05, R * 0.88, R * 0.54, k.body);
  ctx.strokeStyle = shade(k.dark, -0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-R * 0.95, by - R * 0.05);
  ctx.quadraticCurveTo(-R * 0.1, by - R * 0.2, R * 0.62, by - R * 0.1);
  ctx.stroke();
  // glowing crystal spikes on the shell
  for (let i = 0; i < 4; i++) {
    const x = -R * 0.7 + i * R * 0.38;
    const h = R * (0.42 + (i % 2) * 0.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, by - R * 0.5 - h * 0.5, h * 0.9, k.eye, 0.35);
    ctx.restore();
    ctx.fillStyle = shade(k.eye, 0.35);
    ctx.beginPath();
    ctx.moveTo(x - R * 0.1, by - R * 0.42);
    ctx.lineTo(x - R * 0.02 - i * R * 0.02, by - R * 0.42 - h);
    ctx.lineTo(x + R * 0.1, by - R * 0.42);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.2);
  }
  // head with a horn and mandibles
  blob(ctx, R * 0.78, by + R * 0.04, R * 0.32, R * 0.27, k.dark, 0, 1.8);
  ctx.fillStyle = shade(k.dark, 0.3);
  ctx.beginPath();
  ctx.moveTo(R * 0.9, by - R * 0.18);
  ctx.quadraticCurveTo(R * 1.3, by - R * 0.4, R * 1.28, by - R * 0.85);
  ctx.lineTo(R * 1.1, by - R * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.4);
  for (const [dy, s] of [
    [0.1, 1],
    [0.22, -1],
  ] as const) {
    ctx.strokeStyle = BONE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(R * 1.02, by + R * dy);
    ctx.quadraticCurveTo(R * 1.35, by + R * (dy + 0.05 * s), R * 1.25, by + R * (dy + 0.2 * s));
    ctx.stroke();
  }
  evilEye(ctx, R * 0.88, by - R * 0.02, R * 0.08, k.eye);
}

function hydra(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 0.45;
  // coiled serpent body
  blob(ctx, -R * 0.2, by, R * 0.95, R * 0.42, k.body);
  ctx.strokeStyle = alpha(shade(k.dark, 0.1), 0.8);
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-R * 0.6 + i * R * 0.3, by + R * 0.1, R * 0.18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  spikes(
    ctx,
    [
      [-R * 1.05, by],
      [-R * 0.75, by - R * 0.35],
      [-R * 0.35, by - R * 0.42],
      [R * 0.05, by - R * 0.4],
    ],
    R * 0.25,
    k.dark,
    0.5,
  );
  // three necks, each with a snapping head
  const heads: [number, number, number][] = [
    [-0.15, 1.35, 0.2],
    [0.45, 1.05, 1.4],
    [0.25, 1.65, 2.6],
  ];
  for (const [nx, h, off] of heads) {
    const sway = Math.sin(ph + off) * R * 0.12;
    const x0 = R * nx;
    const hx = x0 + R * 0.45 + sway;
    const hy = by - R * h;
    ctx.strokeStyle = 'rgba(8,14,28,0.8)';
    ctx.lineWidth = R * 0.24 + 3;
    ctx.beginPath();
    ctx.moveTo(x0, by - R * 0.1);
    ctx.quadraticCurveTo(x0 - R * 0.2, by - R * h * 0.6, hx - R * 0.1, hy);
    ctx.stroke();
    ctx.strokeStyle = shade(k.body, -0.05);
    ctx.lineWidth = R * 0.24;
    ctx.stroke();
    const hr = R * 0.24;
    ctx.fillStyle = fill(ctx, hx, hy, hr, k.body);
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.8, hy - hr * 0.5);
    ctx.lineTo(hx + hr * 1.5, hy - hr * 0.1);
    ctx.lineTo(hx + hr * 1.35, hy + hr * 0.15);
    ctx.lineTo(hx - hr * 0.6, hy + hr * 0.5);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.6);
    ctx.fillStyle = MAW;
    ctx.beginPath();
    ctx.moveTo(hx, hy + hr * 0.1);
    ctx.lineTo(hx + hr * 1.35, hy + hr * 0.15);
    ctx.lineTo(hx + hr * 1.1, hy + hr * 0.7);
    ctx.closePath();
    ctx.fill();
    fangs(ctx, hx + hr * 0.3, hy + hr * 0.1, hx + hr * 1.3, hy + hr * 0.15, 3, hr * 0.3);
    ctx.fillStyle = k.dark;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.5, hy - hr * 0.4);
    ctx.lineTo(hx - hr * 1.2, hy - hr * 1.0);
    ctx.lineTo(hx - hr * 0.1, hy - hr * 0.45);
    ctx.fill();
    evilEye(ctx, hx + hr * 0.35, hy - hr * 0.2, hr * 0.2, k.eye);
  }
}

// ───────────────────────────────────────────────── flyers

function wing(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string, kind: 'feather' | 'membrane'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1, 0.85);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  if (kind === 'feather') {
    // ragged, torn feathers
    ctx.quadraticCurveTo(-len * 0.2, -len * 0.75, -len * 0.5, -len * 1.0);
    ctx.lineTo(-len * 0.52, -len * 0.78);
    ctx.lineTo(-len * 0.72, -len * 0.82);
    ctx.lineTo(-len * 0.64, -len * 0.6);
    ctx.lineTo(-len * 0.88, -len * 0.55);
    ctx.lineTo(-len * 0.74, -len * 0.38);
    ctx.lineTo(-len * 0.92, -len * 0.25);
    ctx.quadraticCurveTo(-len * 0.4, -len * 0.08, 0, 0);
  } else {
    ctx.quadraticCurveTo(-len * 0.1, -len * 0.78, -len * 0.45, -len * 1.02);
    ctx.lineTo(-len * 0.5, -len * 0.72);
    ctx.quadraticCurveTo(-len * 0.58, -len * 0.62, -len * 0.78, -len * 0.62);
    ctx.lineTo(-len * 0.74, -len * 0.4);
    ctx.quadraticCurveTo(-len * 0.8, -len * 0.3, -len * 0.98, -len * 0.3);
    ctx.quadraticCurveTo(-len * 0.5, -len * 0.1, 0, 0);
  }
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.strokeStyle = alpha(shade(color, -0.45), 0.9);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-len * 0.45, -len * 1.0);
  ctx.moveTo(0, 0);
  ctx.lineTo(-len * 0.76, -len * 0.62);
  ctx.moveTo(0, 0);
  ctx.lineTo(-len * 0.96, -len * 0.3);
  ctx.stroke();
  if (kind === 'membrane') {
    // hooked claw on the wing's elbow
    ctx.fillStyle = BONE;
    ctx.beginPath();
    ctx.moveTo(-len * 0.45, -len * 1.0);
    ctx.lineTo(-len * 0.32, -len * 1.18);
    ctx.lineTo(-len * 0.38, -len * 0.98);
    ctx.fill();
  }
  ctx.restore();
}

function bird(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.3 + Math.sin(ph) * R * 0.08;
  const flap = Math.sin(ph);
  wing(ctx, -R * 0.1, by - R * 0.2, R * 1.2, -0.2 - flap * 0.9, shade(k.dark, -0.2), 'feather');
  // ragged tail
  ctx.fillStyle = k.dark;
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, by - R * 0.05);
  ctx.lineTo(-R * 1.25, by - R * 0.3);
  ctx.lineTo(-R * 1.05, by - R * 0.05);
  ctx.lineTo(-R * 1.3, by + R * 0.12);
  ctx.lineTo(-R * 0.5, by + R * 0.15);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  blob(ctx, 0, by, R * 0.62, R * 0.44, k.body);
  // talons reaching forward
  for (const s of [0, 1]) {
    const tx = R * (0.2 + s * 0.15);
    limb(ctx, tx - R * 0.15, by + R * 0.3, tx + R * 0.2, by + R * 0.65, R * 0.08, '#a88d58');
    claws(ctx, tx + R * 0.2, by + R * 0.65, R * 0.12, 0.6);
  }
  // head with a hooked beak
  const hx = R * 0.55;
  const hy = by - R * 0.32;
  blob(ctx, hx, hy, R * 0.32, R * 0.28, k.body, 0, 1.8);
  spikes(
    ctx,
    [
      [hx - R * 0.35, hy - R * 0.05],
      [hx - R * 0.2, hy - R * 0.25],
      [hx + R * 0.05, hy - R * 0.28],
    ],
    R * 0.25,
    k.dark,
    0.9,
  );
  ctx.fillStyle = '#d8c79a';
  ctx.beginPath();
  ctx.moveTo(hx + R * 0.24, hy - R * 0.14);
  ctx.quadraticCurveTo(hx + R * 0.7, hy - R * 0.15, hx + R * 0.62, hy + R * 0.18);
  ctx.lineTo(hx + R * 0.5, hy + R * 0.02);
  ctx.lineTo(hx + R * 0.25, hy + R * 0.02);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.3);
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx + R * 0.25, hy + R * 0.04);
  ctx.lineTo(hx + R * 0.5, hy + R * 0.06);
  ctx.lineTo(hx + R * 0.3, hy + R * 0.16);
  ctx.closePath();
  ctx.fill();
  evilEye(ctx, hx + R * 0.1, hy - R * 0.08, R * 0.08, k.eye);
  brow(ctx, hx + R * 0.1, hy - R * 0.08, R * 0.08, shade(k.dark, -0.3));
  wing(ctx, 0, by - R * 0.15, R * 1.3, -flap * 1.0, k.body, 'feather');
}

function bat(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.12;
  const flap = Math.sin(ph * 1.5);
  wing(ctx, 0, by - R * 0.1, R * 1.35, -0.1 - flap * 0.9, shade(k.dark, -0.25), 'membrane');
  blob(ctx, 0, by, R * 0.42, R * 0.4, k.body);
  for (const side of [-1, 1]) {
    ctx.fillStyle = side < 0 ? shade(k.body, -0.2) : k.body;
    ctx.beginPath();
    ctx.moveTo(R * 0.1 + side * R * 0.14, by - R * 0.28);
    ctx.lineTo(R * 0.12 + side * R * 0.28, by - R * 0.9);
    ctx.lineTo(R * 0.3 + side * R * 0.05, by - R * 0.32);
    ctx.fill();
    outline(ctx, 1.2);
  }
  ctx.fillStyle = MAW;
  ellipse(ctx, R * 0.25, by + R * 0.12, R * 0.14, R * 0.1);
  ctx.fill();
  fangs(ctx, R * 0.13, by + R * 0.06, R * 0.37, by + R * 0.06, 2, R * 0.16);
  evilEye(ctx, R * 0.28, by - R * 0.1, R * 0.08, k.eye);
  evilEye(ctx, R * 0.08, by - R * 0.1, R * 0.07, k.eye);
  wing(ctx, 0, by, R * 1.4, -flap * 1.05, k.dark, 'membrane');
}

function dragon(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.06;
  const flap = Math.sin(ph);
  wing(ctx, -R * 0.2, by - R * 0.25, R * 1.55, -0.15 - flap * 0.8, shade(k.dark, -0.25), 'membrane');
  // barbed tail
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = R * 0.24 + 3;
  ctx.beginPath();
  ctx.moveTo(-R * 0.4, by);
  ctx.quadraticCurveTo(-R * 1.1, by + R * 0.15 + Math.sin(ph) * R * 0.1, -R * 1.6, by - R * 0.15);
  ctx.stroke();
  ctx.strokeStyle = k.body;
  ctx.lineWidth = R * 0.24;
  ctx.stroke();
  ctx.fillStyle = k.dark;
  ctx.beginPath();
  ctx.moveTo(-R * 1.55, by - R * 0.15);
  ctx.lineTo(-R * 1.95, by - R * 0.4);
  ctx.lineTo(-R * 1.8, by - R * 0.1);
  ctx.lineTo(-R * 1.98, by + R * 0.1);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.2);
  // body with a spiny ridge
  blob(ctx, -R * 0.1, by, R * 0.74, R * 0.42, k.body);
  ctx.fillStyle = alpha(shade(k.eye, 0.1), 0.35);
  ellipse(ctx, -R * 0.05, by + R * 0.18, R * 0.5, R * 0.14);
  ctx.fill();
  spikes(
    ctx,
    [
      [-R * 0.75, by - R * 0.18],
      [-R * 0.45, by - R * 0.38],
      [-R * 0.1, by - R * 0.43],
      [R * 0.25, by - R * 0.35],
      [R * 0.5, by - R * 0.3],
    ],
    R * 0.22,
    k.dark,
    0.5,
  );
  // claws hanging below
  limb(ctx, R * 0.15, by + R * 0.3, R * 0.3, by + R * 0.62, R * 0.1, shade(k.body, -0.2));
  claws(ctx, R * 0.3, by + R * 0.62, R * 0.13, 0.9);
  // neck and horned head with open jaws
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = R * 0.3 + 3;
  ctx.beginPath();
  ctx.moveTo(R * 0.4, by - R * 0.1);
  ctx.quadraticCurveTo(R * 0.8, by - R * 0.3, R * 0.95, by - R * 0.72);
  ctx.stroke();
  ctx.strokeStyle = k.body;
  ctx.lineWidth = R * 0.3;
  ctx.stroke();
  const hx = R * 1.05;
  const hy = by - R * 0.8;
  for (const [s, col] of [
    [0, shade(k.dark, -0.2)],
    [0.12, k.dark],
  ] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(hx - R * 0.1 - s * R, hy - R * 0.14);
    ctx.quadraticCurveTo(hx - R * 0.4 - s * R, hy - R * 0.35, hx - R * 0.62 - s * R, hy - R * 0.58);
    ctx.lineTo(hx - R * 0.02 - s * R, hy - R * 0.2);
    ctx.fill();
    outline(ctx, 1.2);
  }
  ctx.fillStyle = fill(ctx, hx, hy, R * 0.32, k.body);
  ctx.beginPath();
  ctx.moveTo(hx - R * 0.25, hy - R * 0.18);
  ctx.lineTo(hx + R * 0.55, hy - R * 0.06);
  ctx.lineTo(hx + R * 0.5, hy + R * 0.04);
  ctx.lineTo(hx - R * 0.2, hy + R * 0.1);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = MAW;
  ctx.beginPath();
  ctx.moveTo(hx - R * 0.15, hy + R * 0.08);
  ctx.lineTo(hx + R * 0.5, hy + R * 0.04);
  ctx.lineTo(hx + R * 0.35, hy + R * 0.32);
  ctx.lineTo(hx - R * 0.1, hy + R * 0.22);
  ctx.closePath();
  ctx.fill();
  fangs(ctx, hx, hy + R * 0.06, hx + R * 0.48, hy + R * 0.04, 4, R * 0.08);
  evilEye(ctx, hx + R * 0.06, hy - R * 0.06, R * 0.07, k.eye);
  brow(ctx, hx + R * 0.06, hy - R * 0.06, R * 0.07, shade(k.dark, -0.3));
  wing(ctx, -R * 0.05, by - R * 0.2, R * 1.65, -flap * 0.95, k.dark, 'membrane');
}

// ───────────────────────────────────────────────── spirits and the dead

function skull(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.2 + Math.sin(ph) * R * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by, R * 1.7, k.body, 0.55);
  // trailing ghost-fire
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const fx = -R * (0.3 + t * 1.1);
    const fy = by - R * (0.35 + Math.sin(ph * 2 + i) * 0.12) + t * R * 0.1;
    glow(ctx, fx, fy, R * (0.55 - t * 0.3), k.dark, 0.7);
  }
  ctx.restore();
  // tongues of ghost-fire streaming back from the crown
  for (let i = 0; i < 4; i++) {
    const bx = R * (0.25 - i * 0.22);
    const len = R * (1.0 + (i % 2) * 0.35 + Math.sin(ph * 2 + i) * 0.12);
    const tipX = bx - len * 0.75;
    const tipY = by - R * 0.35 - len * 0.55 + Math.sin(ph * 3 + i * 1.7) * R * 0.08;
    for (const [w, col] of [
      [1, alpha(k.body, 0.85)],
      [0.5, alpha(shade(k.eye, 0.5), 0.9)],
    ] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(bx - R * 0.2 * w, by - R * 0.3);
      ctx.quadraticCurveTo(bx - R * 0.1, by - R * 0.3 - len * 0.35, tipX, tipY);
      ctx.quadraticCurveTo(bx + R * 0.1 * w, by - R * 0.45 - len * 0.2, bx + R * 0.2 * w, by - R * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }
  // cranium
  ctx.fillStyle = fill(ctx, 0, by - R * 0.1, R * 0.5, BONE);
  ctx.beginPath();
  ctx.arc(0, by - R * 0.12, R * 0.5, Math.PI * 0.85, Math.PI * 2.15);
  ctx.quadraticCurveTo(R * 0.5, by + R * 0.3, R * 0.25, by + R * 0.28);
  ctx.lineTo(-R * 0.2, by + R * 0.28);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  ctx.strokeStyle = alpha('#6a6258', 0.8);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-R * 0.25, by - R * 0.55);
  ctx.lineTo(-R * 0.1, by - R * 0.35);
  ctx.lineTo(-R * 0.2, by - R * 0.2);
  ctx.stroke();
  // sockets
  ctx.fillStyle = '#07090f';
  ellipse(ctx, R * 0.22, by - R * 0.1, R * 0.15, R * 0.13);
  ctx.fill();
  ellipse(ctx, -R * 0.08, by - R * 0.1, R * 0.13, R * 0.12);
  ctx.fill();
  evilEye(ctx, R * 0.22, by - R * 0.1, R * 0.07, k.eye);
  evilEye(ctx, -R * 0.08, by - R * 0.1, R * 0.06, k.eye);
  // gaping jaw
  const jaw = Math.sin(ph * 2) * R * 0.06;
  ctx.fillStyle = shade(BONE, -0.1);
  ctx.beginPath();
  ctx.moveTo(-R * 0.18, by + R * 0.32 + jaw);
  ctx.lineTo(R * 0.34, by + R * 0.32 + jaw);
  ctx.lineTo(R * 0.28, by + R * 0.5 + jaw);
  ctx.lineTo(-R * 0.12, by + R * 0.48 + jaw);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.4);
  fangs(ctx, -R * 0.15, by + R * 0.28, R * 0.3, by + R * 0.28, 5, R * 0.09);
  fangs(ctx, -R * 0.12, by + R * 0.33 + jaw, R * 0.28, by + R * 0.33 + jaw, 4, R * 0.07, -1);
}

function hoodedFace(ctx: Ctx, x: number, y: number, r: number, k: Look, skullFace: boolean): void {
  ctx.fillStyle = '#04050a';
  ellipse(ctx, x + r * 0.05, y, r * 0.72, r * 0.82);
  ctx.fill();
  if (skullFace) {
    ctx.fillStyle = fill(ctx, x + r * 0.15, y, r * 0.55, BONE);
    ellipse(ctx, x + r * 0.15, y + r * 0.02, r * 0.48, r * 0.58);
    ctx.fill();
    ctx.fillStyle = '#04050a';
    ellipse(ctx, x + r * 0.32, y - r * 0.1, r * 0.17, r * 0.15);
    ctx.fill();
    ellipse(ctx, x - r * 0.02, y - r * 0.1, r * 0.15, r * 0.14);
    ctx.fill();
    ctx.fillRect(x - r * 0.05, y + r * 0.3, r * 0.42, r * 0.1);
    fangs(ctx, x - r * 0.05, y + r * 0.3, x + r * 0.37, y + r * 0.3, 4, r * 0.08);
  } else {
    // only a jaw of pale teeth catches the light
    ctx.fillStyle = alpha(BONE, 0.75);
    ctx.fillRect(x + r * 0.02, y + r * 0.34, r * 0.4, r * 0.06);
    fangs(ctx, x + r * 0.02, y + r * 0.38, x + r * 0.42, y + r * 0.38, 4, r * 0.1);
  }
  evilEye(ctx, x + r * 0.32, y - r * 0.1, r * 0.12, k.eye);
  evilEye(ctx, x - r * 0.02, y - r * 0.1, r * 0.1, k.eye);
}

function robe(ctx: Ctx, R: number, by: number, ph: number, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, by - R * 0.8, 0, by + R * 1.15);
  g.addColorStop(0, shade(top, 0.08));
  g.addColorStop(0.5, top);
  g.addColorStop(0.8, alpha(bottom, 0.75));
  g.addColorStop(1, alpha(bottom, 0.05));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-R * 0.35, by - R * 0.7);
  ctx.quadraticCurveTo(-R * 0.95, by + R * 0.1, -R * 1.25, by + R * 0.75 + Math.sin(ph) * R * 0.1);
  for (let i = 0; i <= 8; i++) {
    const x = -R * 1.15 + (i * R * 1.85) / 8;
    const y = by + R * (1.0 + (i % 2 ? -0.35 : 0.1) + Math.sin(ph * 1.5 + i) * 0.12);
    ctx.lineTo(x - (i % 2 ? 0 : R * 0.12), y);
  }
  ctx.quadraticCurveTo(R * 0.85, by, R * 0.42, by - R * 0.7);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.5);
  // torn strips trailing behind
  ctx.strokeStyle = alpha(bottom, 0.45);
  ctx.lineWidth = R * 0.08;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-R * (0.6 + i * 0.2), by + R * (0.2 + i * 0.15));
    ctx.quadraticCurveTo(-R * (1.2 + i * 0.2), by + R * (0.1 + i * 0.2) + Math.sin(ph + i) * R * 0.15, -R * (1.6 + i * 0.15), by + R * (0.35 + i * 0.1));
    ctx.stroke();
  }
}

function wraith(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by, R * 1.5, k.body, 0.35);
  ctx.restore();
  robe(ctx, R, by, ph, shade(k.dark, 0.1), k.body);
  // long skeletal arms reaching for you
  for (const [dy, col, reach] of [
    [-0.08, shade(BONE, -0.4), 0.85],
    [0.12, BONE, 1.0],
  ] as const) {
    const hx = R * 0.2 + R * reach * 0.75;
    const hy = by + R * (dy - 0.15) + Math.sin(ph + dy * 10) * R * 0.08;
    ctx.fillStyle = shade(k.dark, 0.15);
    ctx.beginPath();
    ctx.moveTo(R * 0.15, by + R * (dy - 0.15));
    ctx.lineTo(R * 0.55, by + R * (dy - 0.12));
    ctx.lineTo(R * 0.5, by + R * (dy + 0.1));
    ctx.lineTo(R * 0.2, by + R * (dy + 0.2));
    ctx.closePath();
    ctx.fill();
    limb(ctx, R * 0.5, by + R * (dy - 0.02), hx, hy, Math.max(2, R * 0.06), col);
    claws(ctx, hx, hy, R * 0.22, -0.25);
  }
  // hood with a peak
  ctx.fillStyle = shade(k.dark, 0.2);
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, by - R * 0.3);
  ctx.quadraticCurveTo(-R * 0.6, by - R * 1.05, -R * 0.15, by - R * 1.28);
  ctx.quadraticCurveTo(-R * 0.35, by - R * 1.5 + Math.sin(ph) * R * 0.05, -R * 0.55, by - R * 1.62);
  ctx.quadraticCurveTo(R * 0.4, by - R * 1.4, R * 0.55, by - R * 0.95);
  ctx.quadraticCurveTo(R * 0.65, by - R * 0.55, R * 0.5, by - R * 0.3);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  hoodedFace(ctx, R * 0.12, by - R * 0.78, R * 0.38, k, false);
}

function banshee(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by - R * 0.3, R * 1.6, k.body, 0.35);
  ctx.restore();
  // hair streaming back
  ctx.fillStyle = alpha(shade(k.body, 0.35), 0.85);
  ctx.beginPath();
  ctx.moveTo(R * 0.3, by - R * 1.1);
  for (let i = 0; i <= 5; i++) {
    const x = R * 0.1 - i * R * 0.35;
    ctx.lineTo(x, by - R * (1.15 - i * 0.12) + Math.sin(ph * 2 + i) * R * 0.12);
    ctx.lineTo(x - R * 0.12, by - R * (0.8 - i * 0.1) + Math.sin(ph * 2 + i + 1) * R * 0.1);
  }
  ctx.lineTo(-R * 0.2, by - R * 0.4);
  ctx.closePath();
  ctx.fill();
  robe(ctx, R, by, ph, shade(k.body, -0.15), k.body);
  // arms flung wide
  for (const [dir, col] of [
    [-1, shade(k.body, -0.3)],
    [1, shade(k.body, 0.2)],
  ] as const) {
    const ex = R * (dir > 0 ? 0.85 : -0.5);
    const ey = by - R * (0.4 + Math.sin(ph) * 0.08);
    limb(ctx, R * 0.05, by - R * 0.35, ex, ey, R * 0.08, col);
    claws(ctx, ex, ey, R * 0.16, dir > 0 ? -0.6 : Math.PI + 0.6);
  }
  // gaunt screaming face
  const hx = R * 0.18;
  const hy = by - R * 0.78;
  ctx.fillStyle = fill(ctx, hx, hy, R * 0.3, shade(k.body, 0.4));
  ellipse(ctx, hx, hy, R * 0.27, R * 0.34);
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = '#05070c';
  ellipse(ctx, hx + R * 0.1, hy - R * 0.06, R * 0.08, R * 0.07);
  ctx.fill();
  ellipse(ctx, hx - R * 0.07, hy - R * 0.06, R * 0.07, R * 0.07);
  ctx.fill();
  evilEye(ctx, hx + R * 0.1, hy - R * 0.06, R * 0.05, k.eye);
  evilEye(ctx, hx - R * 0.07, hy - R * 0.06, R * 0.045, k.eye);
  ctx.fillStyle = '#05070c';
  ellipse(ctx, hx + R * 0.04, hy + R * 0.16, R * 0.08, R * 0.13);
  ctx.fill();
  if (k.boss) crown(ctx, hx, hy - R * 0.28, R * 0.6, R * 0.4, shade(k.eye, 0.4), 4);
}

function lich(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.3 + Math.sin(ph) * R * 0.06;
  robe(ctx, R, by, ph, k.dark, shade(k.dark, 0.2));
  // trim of the robe
  ctx.strokeStyle = alpha(k.eye, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(R * 0.05, by - R * 0.55);
  ctx.lineTo(R * 0.1, by + R * 0.8);
  ctx.stroke();
  // staff with a glowing skull-orb
  const sx = R * 0.65;
  ctx.strokeStyle = 'rgba(8,14,28,0.8)';
  ctx.lineWidth = R * 0.09 + 3;
  ctx.beginPath();
  ctx.moveTo(sx - R * 0.1, -R * 0.05);
  ctx.lineTo(sx + R * 0.05, by - R * 1.2);
  ctx.stroke();
  ctx.strokeStyle = '#4a3a2e';
  ctx.lineWidth = R * 0.09;
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, sx + R * 0.05, by - R * 1.3, R * 0.7, k.eye, 0.9);
  ctx.restore();
  ctx.fillStyle = shade(k.eye, 0.55);
  ctx.beginPath();
  ctx.arc(sx + R * 0.05, by - R * 1.3, R * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a3a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx - R * 0.12, by - R * 1.1);
  ctx.quadraticCurveTo(sx - R * 0.2, by - R * 1.45, sx + R * 0.05, by - R * 1.5);
  ctx.moveTo(sx + R * 0.2, by - R * 1.1);
  ctx.quadraticCurveTo(sx + R * 0.3, by - R * 1.45, sx + R * 0.05, by - R * 1.5);
  ctx.stroke();
  // bony hand on the staff
  limb(ctx, R * 0.1, by - R * 0.3, sx, by - R * 0.55, R * 0.08, BONE);
  claws(ctx, sx - R * 0.02, by - R * 0.55, R * 0.12, 0.2);
  // hood and skull
  ctx.fillStyle = shade(k.dark, 0.1);
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, by - R * 0.35);
  ctx.quadraticCurveTo(-R * 0.45, by - R * 1.25, R * 0.12, by - R * 1.3);
  ctx.lineTo(-R * 0.05, by - R * 1.05);
  ctx.quadraticCurveTo(R * 0.6, by - R * 1.0, R * 0.5, by - R * 0.35);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  hoodedFace(ctx, R * 0.12, by - R * 0.72, R * 0.34, k, true);
}

function elemental(ctx: Ctx, R: number, ph: number, k: Look): void {
  const by = -R * 1.25;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by, R * 1.8, k.body, 0.5);
  ctx.restore();
  // swirling storm below
  ctx.strokeStyle = alpha(k.body, 0.85);
  ctx.lineWidth = R * 0.14;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const r = R * (0.3 + i * 0.15);
    ctx.ellipse(0, by + R * (0.45 + i * 0.22), r, r * 0.3, 0, ph + i, ph + i + Math.PI * 1.3);
    ctx.stroke();
  }
  // crackling arms
  for (const [x0, dir] of [
    [-R * 0.35, -1],
    [R * 0.35, 1],
  ] as const) {
    ctx.strokeStyle = shade(k.eye, 0.4);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, by);
    let x = x0;
    let y = by;
    for (let i = 0; i < 4; i++) {
      x += dir * R * 0.22;
      y += (i % 2 ? -1 : 1) * R * 0.18 + Math.sin(ph * 3 + i) * R * 0.05;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // storm-cloud body
  const g = ctx.createRadialGradient(0, by - R * 0.3, R * 0.1, 0, by, R * 0.8);
  g.addColorStop(0, shade(k.body, 0.25));
  g.addColorStop(1, shade(k.dark, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rr = R * (0.55 + (i % 2) * 0.12);
    const x = Math.cos(a) * rr;
    const y = by - R * 0.1 + Math.sin(a) * rr * 0.95;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(Math.cos(a - 0.35) * rr * 1.25, by - R * 0.1 + Math.sin(a - 0.35) * rr * 1.2, x, y);
  }
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  // furious face
  evilEye(ctx, R * 0.25, by - R * 0.25, R * 0.1, k.eye);
  evilEye(ctx, -R * 0.05, by - R * 0.25, R * 0.09, k.eye);
  brow(ctx, R * 0.25, by - R * 0.25, R * 0.1, shade(k.dark, -0.4));
  ctx.fillStyle = '#07101c';
  ctx.beginPath();
  ctx.moveTo(-R * 0.1, by + R * 0.05);
  ctx.lineTo(R * 0.05, by + R * 0.15);
  ctx.lineTo(R * 0.15, by + R * 0.02);
  ctx.lineTo(R * 0.28, by + R * 0.14);
  ctx.lineTo(R * 0.4, by + R * 0.0);
  ctx.lineTo(R * 0.3, by + R * 0.3);
  ctx.lineTo(-R * 0.02, by + R * 0.28);
  ctx.closePath();
  ctx.fill();
}

// ───────────────────────────────────────────────── golem

function golem(ctx: Ctx, R: number, ph: number, k: Look): void {
  const swing = Math.sin(ph) * 0.35;
  const bob = Math.abs(Math.cos(ph)) * R * 0.05;
  const hipY = -R * 0.85;
  const shard = (x: number, y: number, w: number, h: number, c: string) => {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, shade(c, 0.25));
    g.addColorStop(1, shade(c, -0.45));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y);
    ctx.lineTo(x + w * 0.9, y + h * 0.05);
    ctx.lineTo(x + w, y + h * 0.7);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.lineTo(x + w * 0.1, y + h * 0.95);
    ctx.lineTo(x, y + h * 0.3);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 2);
  };
  const crack = (pts: [number, number][]) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = alpha(k.eye, 0.9);
    ctx.lineWidth = Math.max(1.5, R * 0.05);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  };
  ctx.save();
  ctx.translate(-R * 0.25, hipY - bob);
  ctx.rotate(-swing);
  shard(-R * 0.2, 0, R * 0.4, R * 0.85, shade(k.dark, -0.15));
  ctx.restore();
  ctx.save();
  ctx.translate(-R * 0.5, -R * 1.75 - bob);
  ctx.rotate(swing * 0.8);
  shard(-R * 0.22, 0, R * 0.44, R * 1.0, shade(k.body, -0.3));
  ctx.restore();
  // torso of jagged blocks with a glowing core
  shard(-R * 0.75, -R * 2.0 - bob, R * 1.5, R * 1.2, k.body);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, -R * 1.45 - bob, R * 0.7, k.eye, 0.8);
  ctx.restore();
  crack([
    [-R * 0.5, -R * 1.75 - bob],
    [-R * 0.15, -R * 1.5 - bob],
    [R * 0.05, -R * 1.62 - bob],
    [R * 0.45, -R * 1.2 - bob],
  ]);
  crack([
    [-R * 0.15, -R * 1.5 - bob],
    [-R * 0.25, -R * 1.05 - bob],
  ]);
  for (const side of [-1, 1]) {
    const px = side * R * 0.5;
    spikes(
      ctx,
      [
        [px - R * 0.3, -R * 1.95 - bob],
        [px - R * 0.1, -R * 2.05 - bob],
        [px + R * 0.1, -R * 2.05 - bob],
        [px + R * 0.3, -R * 1.95 - bob],
      ],
      R * (k.boss ? 0.65 : 0.45),
      shade(k.eye, 0.4),
      side * 0.25,
    );
  }
  // sunken head under a jagged brow
  shard(-R * 0.1, -R * 2.45 - bob, R * 0.58, R * 0.5, shade(k.body, 0.05));
  evilEye(ctx, R * 0.3, -R * 2.22 - bob, R * 0.075, k.eye);
  evilEye(ctx, R * 0.12, -R * 2.22 - bob, R * 0.07, k.eye);
  brow(ctx, R * 0.28, -R * 2.23 - bob, R * 0.1, shade(k.dark, -0.2));
  if (k.boss) crown(ctx, R * 0.2, -R * 2.42 - bob, R * 0.8, R * 0.45, shade(k.eye, 0.45), 3);
  ctx.save();
  ctx.translate(R * 0.25, hipY - bob);
  ctx.rotate(swing);
  shard(-R * 0.2, 0, R * 0.4, R * 0.85, k.dark);
  ctx.restore();
  // front arm ending in a huge fist
  ctx.save();
  ctx.translate(R * 0.55, -R * 1.75 - bob);
  ctx.rotate(-swing * 0.8);
  shard(-R * 0.22, 0, R * 0.46, R * 0.8, shade(k.body, -0.1));
  shard(-R * 0.28, R * 0.72, R * 0.58, R * 0.45, shade(k.body, -0.05));
  ctx.restore();
}
