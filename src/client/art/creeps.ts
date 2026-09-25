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

const cache = new Map<string, CreepSprite>();

export function creepSprite(def: CreepDef): CreepSprite {
  const key = `${def.shape}:${def.colors.join(',')}:${def.size}`;
  let s = cache.get(key);
  if (s) return s;
  const R = def.size * SP * 1.18;
  const size = Math.ceil(Math.max(1.6 * SP, R * 4.4));
  const gx = size / 2;
  const gy = size * 0.84;
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const [c, ctx] = makeCanvas(size, size);
    ctx.translate(gx, gy);
    const ph = (f / FRAMES) * Math.PI * 2;
    drawCreature(ctx, def, R, ph);
    frames.push(c);
  }
  const flying = !!def.air || def.shape === 'wisp' || def.shape === 'wraith' || def.shape === 'elemental';
  s = { frames, size, gx, gy, lift: def.air ? 0.55 : flying ? 0.12 : 0 };
  cache.set(key, s);
  return s;
}

function drawCreature(ctx: Ctx, def: CreepDef, R: number, ph: number): void {
  const [body, dark, detail] = def.colors;
  switch (def.shape) {
    case 'hare':
      return quadruped(ctx, R, ph, body, dark, detail, 'hare');
    case 'wolf':
      return quadruped(ctx, R, ph, body, dark, detail, 'wolf');
    case 'boar':
      return quadruped(ctx, R, ph, body, dark, detail, 'boar');
    case 'biped':
      return humanoid(ctx, R, ph, body, dark, detail, 'kobold');
    case 'troll':
      return humanoid(ctx, R, ph, body, dark, detail, 'troll');
    case 'knight':
      return humanoid(ctx, R, ph, body, dark, detail, 'knight');
    case 'giant':
      return humanoid(ctx, R, ph, body, dark, detail, 'giant');
    case 'boss':
      return humanoid(ctx, R, ph, body, dark, detail, 'tyrant');
    case 'spider':
      return spider(ctx, R, ph, body, dark, detail);
    case 'crab':
      return crab(ctx, R, ph, body, dark, detail);
    case 'beetle':
      return beetle(ctx, R, ph, body, dark, detail);
    case 'bird':
      return bird(ctx, R, ph, body, dark, detail);
    case 'bat':
      return bat(ctx, R, ph, body, dark, detail);
    case 'dragon':
      return dragon(ctx, R, ph, body, dark, detail);
    case 'wisp':
      return wisp(ctx, R, ph, body, dark, detail);
    case 'wraith':
      return wraith(ctx, R, ph, body, dark, detail);
    case 'elemental':
      return elemental(ctx, R, ph, body, dark, detail);
    case 'golem':
      return golem(ctx, R, ph, body, dark, detail);
  }
}

function eye(ctx: Ctx, x: number, y: number, r: number, color = '#10131c', glowColor?: string): void {
  if (glowColor) {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = r * 4;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function limb(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, w: number, color: string): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(8,14,28,0.75)';
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

function bodyFill(ctx: Ctx, x: number, y: number, r: number, color: string): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, shade(color, 0.35));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.4));
  return g;
}

// ───────────────────────────────────────────────── quadrupeds
function quadruped(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string, kind: 'hare' | 'wolf' | 'boar'): void {
  const hop = kind === 'hare' ? Math.abs(Math.sin(ph)) * R * 0.45 : Math.abs(Math.sin(ph * 2)) * R * 0.06;
  const by = -R * (kind === 'boar' ? 0.95 : 1.0) - hop;
  const bw = R * (kind === 'hare' ? 0.72 : kind === 'boar' ? 1.05 : 1.1);
  const bh = R * (kind === 'hare' ? 0.6 : kind === 'boar' ? 0.68 : 0.5);
  const legLen = R * (kind === 'boar' ? 0.62 : kind === 'hare' ? 0.5 : 0.78);
  const legW = R * (kind === 'boar' ? 0.26 : 0.2);
  const swing = kind === 'hare' ? 0 : 0.55;
  const legs: [number, number][] = [
    [bw * 0.55, 0],
    [-bw * 0.55, Math.PI],
    [bw * 0.5, Math.PI],
    [-bw * 0.6, 0],
  ];
  // far legs (darker) behind the body
  for (let i = 2; i < 4; i++) {
    const [lx, off] = legs[i];
    const a = Math.sin(ph + off) * swing;
    limb(ctx, lx, by + bh * 0.4, lx + Math.sin(a) * legLen, by + bh * 0.4 + Math.cos(a) * legLen + hop * 0.6, legW, shade(dark, -0.15));
  }
  // tail
  if (kind === 'wolf') {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.85, by - bh * 0.2);
    ctx.quadraticCurveTo(-bw * 1.55, by - bh * (0.6 + Math.sin(ph) * 0.3), -bw * 1.7, by + bh * 0.2);
    ctx.quadraticCurveTo(-bw * 1.3, by + bh * 0.1, -bw * 0.85, by + bh * 0.2);
    ctx.fill();
    outline(ctx, 2);
  } else if (kind === 'hare') {
    ctx.fillStyle = shade(body, 0.3);
    ellipse(ctx, -bw * 0.95, by - bh * 0.1, R * 0.22, R * 0.2);
    ctx.fill();
    outline(ctx, 1.6);
  } else {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-bw * 1.02, by - bh * 0.2, R * 0.12, 0, Math.PI * 1.5);
    ctx.stroke();
  }
  // body
  ctx.fillStyle = bodyFill(ctx, 0, by, bw, body);
  ellipse(ctx, 0, by, bw, bh);
  ctx.fill();
  outline(ctx, 2.2);
  // belly / fur detail
  ctx.fillStyle = alpha(shade(body, 0.4), 0.6);
  ellipse(ctx, bw * 0.1, by + bh * 0.35, bw * 0.55, bh * 0.35);
  ctx.fill();
  if (kind === 'boar') {
    ctx.strokeStyle = shade(dark, -0.2);
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const x = -bw * 0.5 + i * bw * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, by - bh * 0.9);
      ctx.lineTo(x - 3, by - bh * 1.25);
      ctx.stroke();
    }
  }
  // near legs
  for (let i = 0; i < 2; i++) {
    const [lx, off] = legs[i];
    const a = Math.sin(ph + off) * swing;
    limb(ctx, lx, by + bh * 0.4, lx + Math.sin(a) * legLen, by + bh * 0.4 + Math.cos(a) * legLen + hop * 0.6, legW, shade(dark, 0.1));
  }
  // head
  const hx = bw * (kind === 'hare' ? 0.78 : 0.95);
  const hy = by - bh * (kind === 'hare' ? 0.75 : 0.45);
  const hr = R * (kind === 'hare' ? 0.4 : kind === 'boar' ? 0.46 : 0.4);
  if (kind === 'hare') {
    for (const [ex, rot] of [
      [-0.1, -0.35],
      [0.12, -0.12],
    ]) {
      ctx.fillStyle = ex < 0 ? shade(body, -0.1) : body;
      ellipse(ctx, hx + ex * R, hy - hr * 1.3, hr * 0.28, hr * 0.95, rot);
      ctx.fill();
      outline(ctx, 1.8);
      ctx.fillStyle = alpha(detail, 0.8);
      ellipse(ctx, hx + ex * R, hy - hr * 1.3, hr * 0.12, hr * 0.65, rot);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = shade(body, kind === 'boar' ? -0.05 : 0.05);
    for (const ex of [-0.18, 0.12]) {
      ctx.beginPath();
      ctx.moveTo(hx + ex * R - hr * 0.3, hy - hr * 0.5);
      ctx.lineTo(hx + ex * R, hy - hr * (kind === 'boar' ? 1.05 : 1.5));
      ctx.lineTo(hx + ex * R + hr * 0.3, hy - hr * 0.55);
      ctx.fill();
      outline(ctx, 1.6);
    }
  }
  ctx.fillStyle = bodyFill(ctx, hx, hy, hr, body);
  ellipse(ctx, hx, hy, hr, hr * 0.88);
  ctx.fill();
  outline(ctx, 2);
  // snout
  if (kind !== 'hare') {
    ctx.fillStyle = kind === 'boar' ? shade(detail, -0.2) : shade(body, 0.15);
    ellipse(ctx, hx + hr * 0.85, hy + hr * 0.2, hr * 0.55, hr * 0.38);
    ctx.fill();
    outline(ctx, 1.6);
    ctx.fillStyle = '#1a1414';
    ellipse(ctx, hx + hr * 1.3, hy + hr * 0.12, hr * 0.12, hr * 0.1);
    ctx.fill();
  } else {
    ctx.fillStyle = detail;
    ellipse(ctx, hx + hr * 0.85, hy + hr * 0.2, hr * 0.14, hr * 0.12);
    ctx.fill();
  }
  if (kind === 'boar') {
    ctx.strokeStyle = '#f7f1e3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.9, hy + hr * 0.45);
    ctx.quadraticCurveTo(hx + hr * 1.35, hy + hr * 0.3, hx + hr * 1.25, hy - hr * 0.2);
    ctx.stroke();
  }
  eye(ctx, hx + hr * 0.25, hy - hr * 0.15, hr * 0.2, '#101014', kind === 'wolf' ? detail : undefined);
}

// ───────────────────────────────────────────────── humanoids
type HumanKind = 'kobold' | 'troll' | 'knight' | 'giant' | 'tyrant';

function humanoid(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string, kind: HumanKind): void {
  const scale = kind === 'kobold' ? 0.82 : kind === 'troll' ? 0.95 : 1;
  const hipY = -R * 1.0 * scale;
  const shY = -R * 2.0 * scale;
  const legLen = R * 0.95 * scale;
  const swing = Math.sin(ph) * 0.55;
  const bob = Math.abs(Math.cos(ph)) * R * 0.06;
  const legW = R * (kind === 'giant' || kind === 'tyrant' ? 0.34 : 0.26);
  const tw = R * (kind === 'troll' ? 1.05 : kind === 'giant' ? 1.1 : kind === 'tyrant' ? 1.05 : 0.8);
  const hunch = kind === 'troll' ? R * 0.25 : 0;
  // cape (tyrant) behind everything
  if (kind === 'tyrant') {
    ctx.fillStyle = shade(dark, -0.2);
    ctx.beginPath();
    ctx.moveTo(-tw * 0.4, shY - bob);
    ctx.quadraticCurveTo(-tw * 1.3, hipY, -tw * (1.2 + Math.sin(ph) * 0.12), -R * 0.05);
    ctx.lineTo(tw * 0.1, -R * 0.2);
    ctx.lineTo(tw * 0.3, shY - bob);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 2);
  }
  // back leg + back arm
  limb(ctx, -R * 0.12, hipY - bob, -R * 0.12 + Math.sin(-swing) * legLen, hipY - bob + Math.cos(swing) * legLen, legW, shade(dark, -0.25));
  const armLen = R * (kind === 'troll' ? 1.25 : 0.95) * scale;
  const armW = legW * 0.85;
  limb(ctx, -R * 0.1 + hunch, shY - bob + R * 0.15, -R * 0.1 + hunch + Math.sin(swing) * armLen * 0.6, shY - bob + R * 0.15 + armLen * 0.9, armW, shade(body, -0.35));
  // torso
  const g = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0);
  g.addColorStop(0, shade(body, -0.3));
  g.addColorStop(0.45, shade(body, 0.12));
  g.addColorStop(1, shade(body, -0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-tw * 0.42, hipY - bob);
  ctx.quadraticCurveTo(-tw * 0.62 + hunch * 0.3, (hipY + shY) / 2 - bob, -tw * 0.45 + hunch, shY - bob);
  ctx.lineTo(tw * 0.5 + hunch, shY - bob + hunch * 0.4);
  ctx.quadraticCurveTo(tw * 0.62 + hunch * 0.3, (hipY + shY) / 2 - bob, tw * 0.42, hipY - bob);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2.2);
  // belt / armor details
  ctx.fillStyle = kind === 'knight' || kind === 'tyrant' ? detail : shade(dark, 0.1);
  ctx.fillRect(-tw * 0.44, hipY - bob - R * 0.16, tw * 0.88, R * 0.14);
  if (kind === 'knight' || kind === 'tyrant') {
    ctx.strokeStyle = alpha('#ffffff', 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-tw * 0.2, shY - bob + R * 0.2);
    ctx.lineTo(-tw * 0.2, hipY - bob - R * 0.25);
    ctx.stroke();
  }
  // front leg
  limb(ctx, R * 0.12, hipY - bob, R * 0.12 + Math.sin(swing) * legLen, hipY - bob + Math.cos(swing) * legLen, legW, shade(dark, 0.05));
  // head
  const hr = R * (kind === 'kobold' ? 0.4 : kind === 'giant' ? 0.36 : 0.34);
  const hx = R * 0.12 + hunch * 1.2;
  const hy = shY - bob - hr * (kind === 'troll' ? 0.35 : 0.8);
  if (kind === 'kobold') {
    // big ears
    ctx.fillStyle = shade(body, -0.1);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx - side * hr * 0.1, hy - hr * 0.2);
      ctx.lineTo(hx - side * hr * 1.4 - hr * 0.2, hy - hr * 0.9);
      ctx.lineTo(hx - side * hr * 0.3, hy + hr * 0.3);
      ctx.fill();
      outline(ctx, 1.6);
    }
  }
  ctx.fillStyle = bodyFill(ctx, hx, hy, hr, kind === 'knight' ? '#a7b3c6' : kind === 'tyrant' ? shade(body, -0.05) : body);
  ellipse(ctx, hx, hy, hr, hr);
  ctx.fill();
  outline(ctx, 2);
  switch (kind) {
    case 'kobold':
      eye(ctx, hx + hr * 0.35, hy - hr * 0.1, hr * 0.2, '#101014', detail);
      ctx.fillStyle = shade(body, 0.2);
      ellipse(ctx, hx + hr * 0.85, hy + hr * 0.25, hr * 0.35, hr * 0.22);
      ctx.fill();
      outline(ctx, 1.4);
      break;
    case 'troll':
      eye(ctx, hx + hr * 0.4, hy - hr * 0.15, hr * 0.16, '#101014', '#ffe98a');
      ctx.strokeStyle = '#f5efe0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(hx + hr * 0.5, hy + hr * 0.55);
      ctx.lineTo(hx + hr * 0.75, hy + hr * 0.15);
      ctx.stroke();
      // hair tuft
      ctx.fillStyle = detail;
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.6, hy - hr * 0.6);
      ctx.lineTo(hx - hr * 0.2, hy - hr * 1.5);
      ctx.lineTo(hx + hr * 0.3, hy - hr * 0.8);
      ctx.fill();
      break;
    case 'knight': {
      // helmet visor + plume
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(hx - hr * 0.1, hy - hr * 0.2, hr * 0.95, hr * 0.18);
      ctx.fillStyle = detail;
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.2, hy - hr * 0.9);
      ctx.quadraticCurveTo(hx - hr * 1.6, hy - hr * 1.6 + Math.sin(ph) * 2, hx - hr * 1.5, hy - hr * 0.1);
      ctx.quadraticCurveTo(hx - hr * 0.9, hy - hr * 0.8, hx - hr * 0.2, hy - hr * 0.9);
      ctx.fill();
      outline(ctx, 1.5);
      break;
    }
    case 'giant': {
      eye(ctx, hx + hr * 0.4, hy - hr * 0.1, hr * 0.17, '#101014', detail);
      ctx.fillStyle = shade(detail, -0.05);
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.2, hy + hr * 0.3);
      ctx.quadraticCurveTo(hx + hr * 0.4, hy + hr * 1.6, hx + hr * 0.95, hy + hr * 0.4);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.5);
      // horned helm
      ctx.fillStyle = shade(dark, 0.1);
      ctx.beginPath();
      ctx.arc(hx, hy - hr * 0.1, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
      outline(ctx, 1.6);
      ctx.fillStyle = '#efe6d2';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + side * hr * 0.7, hy - hr * 0.6);
        ctx.quadraticCurveTo(hx + side * hr * 1.7, hy - hr * 1.0, hx + side * hr * 1.4, hy - hr * 1.8);
        ctx.quadraticCurveTo(hx + side * hr * 1.2, hy - hr * 1.0, hx + side * hr * 0.4, hy - hr * 0.85);
        ctx.fill();
        outline(ctx, 1.4);
      }
      break;
    }
    case 'tyrant': {
      eye(ctx, hx + hr * 0.3, hy - hr * 0.05, hr * 0.15, '#101014', detail);
      eye(ctx, hx - hr * 0.2, hy - hr * 0.05, hr * 0.13, '#101014', detail);
      // ice crown
      ctx.fillStyle = shade(detail, 0.35);
      ctx.beginPath();
      const cy = hy - hr * 0.75;
      ctx.moveTo(hx - hr * 0.9, cy + hr * 0.2);
      for (let i = 0; i <= 5; i++) {
        const x = hx - hr * 0.9 + (i * hr * 1.8) / 5;
        ctx.lineTo(x, cy - (i % 2 ? hr * 0.25 : hr * 0.85));
      }
      ctx.lineTo(hx + hr * 0.9, cy + hr * 0.2);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 1.6);
      break;
    }
  }
  // front arm with weapon
  const ax = R * 0.15 + hunch;
  const ay = shY - bob + R * 0.18;
  const ex = ax + Math.sin(-swing) * armLen * 0.6;
  const ey = ay + armLen * 0.85;
  if (kind === 'knight') {
    // shield in front
    limb(ctx, ax, ay, ex, ey, armW, shade(body, -0.1));
    ctx.fillStyle = shade(detail, -0.25);
    ctx.beginPath();
    ctx.moveTo(ex - R * 0.1, ey - R * 0.55);
    ctx.lineTo(ex + R * 0.45, ey - R * 0.55);
    ctx.lineTo(ex + R * 0.45, ey + R * 0.1);
    ctx.quadraticCurveTo(ex + R * 0.2, ey + R * 0.45, ex - R * 0.1, ey + R * 0.1);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 2);
    ctx.fillStyle = alpha('#ffffff', 0.5);
    ctx.fillRect(ex + R * 0.12, ey - R * 0.45, R * 0.06, R * 0.5);
    return;
  }
  limb(ctx, ax, ay, ex, ey, armW, shade(body, -0.1));
  const wLen = R * (kind === 'tyrant' ? 1.8 : 1.1);
  if (kind === 'troll' || kind === 'giant') {
    // club
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(-0.9 + Math.sin(ph) * 0.2);
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.06);
    ctx.lineTo(wLen, -R * 0.2);
    ctx.lineTo(wLen, R * 0.2);
    ctx.lineTo(0, R * 0.06);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.8);
    ctx.restore();
  } else if (kind === 'kobold') {
    // spear
    ctx.strokeStyle = '#8a6a44';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ex - R * 0.1, ey + R * 0.4);
    ctx.lineTo(ex + R * 0.3, ey - R * 1.1);
    ctx.stroke();
    ctx.fillStyle = '#d8e6f3';
    ctx.beginPath();
    ctx.moveTo(ex + R * 0.3, ey - R * 1.1);
    ctx.lineTo(ex + R * 0.2, ey - R * 1.45);
    ctx.lineTo(ex + R * 0.42, ey - R * 1.12);
    ctx.fill();
  } else if (kind === 'tyrant') {
    ctx.strokeStyle = shade(dark, 0.2);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ex, ey + R * 0.6);
    ctx.lineTo(ex + R * 0.2, ey - wLen);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = detail;
    ctx.shadowBlur = 16;
    ctx.fillStyle = shade(detail, 0.2);
    ctx.beginPath();
    ctx.arc(ex + R * 0.2, ey - wLen - R * 0.15, R * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ───────────────────────────────────────────────── crawlers
function spider(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string): void {
  const by = -R * 0.75;
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 4; i++) {
      const a = Math.sin(ph + i * 1.3 + side * Math.PI) * 0.35;
      const sx = -R * 0.25 + i * R * 0.25;
      const dir = i < 2 ? -1 : 1;
      const kneeX = sx + dir * R * 0.45 + Math.sin(a) * R * 0.2;
      const kneeY = by - R * (0.55 - Math.cos(a) * 0.1);
      const footX = sx + dir * R * 0.85 + Math.sin(a) * R * 0.35;
      const col = side === 0 ? shade(dark, -0.3) : dark;
      ctx.strokeStyle = 'rgba(8,14,28,0.8)';
      ctx.lineWidth = R * 0.11 + 2.5;
      ctx.beginPath();
      ctx.moveTo(sx, by);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, 0);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = R * 0.11;
      ctx.stroke();
    }
    if (side === 0) {
      ctx.fillStyle = bodyFill(ctx, -R * 0.5, by - R * 0.1, R * 0.62, body);
      ellipse(ctx, -R * 0.5, by - R * 0.12, R * 0.66, R * 0.55);
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = alpha(detail, 0.8);
      ellipse(ctx, -R * 0.55, by - R * 0.3, R * 0.2, R * 0.13);
      ctx.fill();
      ctx.fillStyle = bodyFill(ctx, R * 0.3, by, R * 0.38, shade(body, -0.1));
      ellipse(ctx, R * 0.3, by, R * 0.38, R * 0.33);
      ctx.fill();
      outline(ctx, 2);
      for (let k = 0; k < 3; k++) eye(ctx, R * 0.46 + k * R * 0.07, by - R * 0.1 + (k % 2) * R * 0.08, R * 0.06, '#000', detail);
    }
  }
}

function crab(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string): void {
  const by = -R * 0.6;
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const a = Math.sin(ph * 2 + i + (side > 0 ? 1.5 : 0)) * 0.3;
      const sx = side * R * (0.35 + i * 0.18);
      limb(ctx, sx, by + R * 0.1, sx + side * R * 0.35 + Math.sin(a) * R * 0.15, 0, R * 0.1, shade(dark, -0.2));
    }
  }
  // claws
  for (const side of [-1, 1]) {
    const lift = Math.sin(ph + (side > 0 ? 0 : Math.PI)) * R * 0.12;
    limb(ctx, side * R * 0.6, by - R * 0.1, side * R * 0.95, by - R * 0.55 - lift, R * 0.14, dark);
    ctx.fillStyle = bodyFill(ctx, side * R * 1.0, by - R * 0.75 - lift, R * 0.3, body);
    ctx.beginPath();
    ctx.ellipse(side * R * 1.0, by - R * 0.72 - lift, R * 0.28, R * 0.2, side * 0.5, 0, Math.PI * 2);
    ctx.fill();
    outline(ctx, 1.8);
    ctx.strokeStyle = shade(dark, -0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(side * R * 1.2, by - R * 0.78 - lift);
    ctx.lineTo(side * R * 0.95, by - R * 0.7 - lift);
    ctx.stroke();
  }
  ctx.fillStyle = bodyFill(ctx, 0, by, R, body);
  ctx.beginPath();
  ctx.ellipse(0, by, R * 0.85, R * 0.48, 0, Math.PI, 0);
  ctx.quadraticCurveTo(R * 0.7, by + R * 0.35, 0, by + R * 0.32);
  ctx.quadraticCurveTo(-R * 0.7, by + R * 0.35, -R * 0.85, by);
  ctx.fill();
  outline(ctx, 2.2);
  ctx.fillStyle = alpha(detail, 0.5);
  ellipse(ctx, -R * 0.15, by - R * 0.22, R * 0.45, R * 0.16);
  ctx.fill();
  for (const side of [-0.18, 0.18]) {
    limb(ctx, side * R, by - R * 0.35, side * R * 1.2, by - R * 0.6, 2, dark);
    eye(ctx, side * R * 1.2, by - R * 0.62, R * 0.08);
  }
}

function beetle(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string): void {
  const by = -R * 0.62;
  for (let i = 0; i < 3; i++) {
    const a = Math.sin(ph * 2 + i * 2) * 0.4;
    const sx = -R * 0.4 + i * R * 0.42;
    limb(ctx, sx, by, sx + Math.sin(a) * R * 0.3 + R * 0.05, 0, R * 0.1, shade(dark, -0.2));
  }
  ctx.fillStyle = bodyFill(ctx, 0, by, R * 0.9, body);
  ellipse(ctx, -R * 0.08, by - R * 0.05, R * 0.85, R * 0.52);
  ctx.fill();
  outline(ctx, 2.2);
  ctx.strokeStyle = shade(dark, -0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-R * 0.9, by - R * 0.05);
  ctx.quadraticCurveTo(-R * 0.1, by - R * 0.2, R * 0.6, by - R * 0.1);
  ctx.stroke();
  ctx.fillStyle = alpha('#ffffff', 0.45);
  ellipse(ctx, -R * 0.25, by - R * 0.3, R * 0.35, R * 0.1, -0.1);
  ctx.fill();
  ctx.fillStyle = alpha(detail, 0.9);
  for (let k = 0; k < 3; k++) {
    ellipse(ctx, -R * 0.55 + k * R * 0.35, by + R * 0.12, R * 0.08, R * 0.06);
    ctx.fill();
  }
  ctx.fillStyle = bodyFill(ctx, R * 0.78, by + R * 0.05, R * 0.28, dark);
  ellipse(ctx, R * 0.78, by + R * 0.04, R * 0.3, R * 0.25);
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = shade(detail, 0.2);
  ctx.beginPath();
  ctx.moveTo(R * 0.95, by - R * 0.05);
  ctx.quadraticCurveTo(R * 1.3, by - R * 0.3, R * 1.25, by - R * 0.55);
  ctx.lineTo(R * 1.05, by - R * 0.1);
  ctx.fill();
  outline(ctx, 1.4);
  eye(ctx, R * 0.92, by, R * 0.07, '#000', detail);
}

// ───────────────────────────────────────────────── flyers
function bird(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string): void {
  const by = -R * 1.3 + Math.sin(ph) * R * 0.08;
  const flap = Math.sin(ph);
  // far wing
  wing(ctx, -R * 0.1, by - R * 0.2, R * 1.1, -0.2 - flap * 0.9, shade(dark, -0.2), 'feather');
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-R * 0.55, by);
  ctx.lineTo(-R * 1.15, by - R * 0.15);
  ctx.lineTo(-R * 1.1, by + R * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = bodyFill(ctx, 0, by, R * 0.6, body);
  ellipse(ctx, 0, by, R * 0.62, R * 0.46);
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = bodyFill(ctx, R * 0.55, by - R * 0.3, R * 0.32, body);
  ellipse(ctx, R * 0.55, by - R * 0.3, R * 0.33, R * 0.3);
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = detail;
  ctx.beginPath();
  ctx.moveTo(R * 0.82, by - R * 0.32);
  ctx.lineTo(R * 1.08, by - R * 0.22);
  ctx.lineTo(R * 0.8, by - R * 0.16);
  ctx.fill();
  outline(ctx, 1.2);
  eye(ctx, R * 0.62, by - R * 0.36, R * 0.09, '#101014');
  wing(ctx, 0, by - R * 0.15, R * 1.2, -flap * 1.0, body, 'feather');
}

function bat(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.12;
  const flap = Math.sin(ph * 1.5);
  wing(ctx, 0, by - R * 0.1, R * 1.3, -0.1 - flap * 0.9, shade(dark, -0.25), 'membrane');
  ctx.fillStyle = bodyFill(ctx, 0, by, R * 0.45, body);
  ellipse(ctx, 0, by, R * 0.42, R * 0.38);
  ctx.fill();
  outline(ctx, 2);
  for (const side of [-1, 1]) {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(R * 0.2 + side * R * 0.12, by - R * 0.3);
    ctx.lineTo(R * 0.25 + side * R * 0.2, by - R * 0.7);
    ctx.lineTo(R * 0.3 + side * R * 0.02, by - R * 0.32);
    ctx.fill();
    outline(ctx, 1.2);
  }
  eye(ctx, R * 0.25, by - R * 0.08, R * 0.08, '#000', detail);
  eye(ctx, R * 0.08, by - R * 0.08, R * 0.07, '#000', detail);
  wing(ctx, 0, by, R * 1.35, -flap * 1.05, dark, 'membrane');
}

function dragon(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.06;
  const flap = Math.sin(ph);
  wing(ctx, -R * 0.2, by - R * 0.25, R * 1.5, -0.15 - flap * 0.8, shade(dark, -0.25), 'membrane');
  // tail
  ctx.strokeStyle = 'rgba(8,14,28,0.75)';
  ctx.lineWidth = R * 0.24 + 3;
  ctx.beginPath();
  ctx.moveTo(-R * 0.4, by);
  ctx.quadraticCurveTo(-R * 1.1, by + R * 0.15 + Math.sin(ph) * R * 0.1, -R * 1.6, by - R * 0.15);
  ctx.stroke();
  ctx.strokeStyle = body;
  ctx.lineWidth = R * 0.24;
  ctx.stroke();
  ctx.fillStyle = detail;
  ctx.beginPath();
  ctx.moveTo(-R * 1.6, by - R * 0.15);
  ctx.lineTo(-R * 1.9, by - R * 0.3);
  ctx.lineTo(-R * 1.75, by);
  ctx.fill();
  // body
  ctx.fillStyle = bodyFill(ctx, 0, by, R * 0.7, body);
  ellipse(ctx, -R * 0.1, by, R * 0.72, R * 0.4);
  ctx.fill();
  outline(ctx, 2.2);
  ctx.fillStyle = alpha(shade(detail, 0.2), 0.6);
  ellipse(ctx, -R * 0.05, by + R * 0.18, R * 0.5, R * 0.15);
  ctx.fill();
  // neck + head
  ctx.strokeStyle = 'rgba(8,14,28,0.75)';
  ctx.lineWidth = R * 0.3 + 3;
  ctx.beginPath();
  ctx.moveTo(R * 0.4, by - R * 0.1);
  ctx.quadraticCurveTo(R * 0.8, by - R * 0.3, R * 0.95, by - R * 0.7);
  ctx.stroke();
  ctx.strokeStyle = body;
  ctx.lineWidth = R * 0.3;
  ctx.stroke();
  const hx = R * 1.05;
  const hy = by - R * 0.78;
  ctx.fillStyle = bodyFill(ctx, hx, hy, R * 0.3, body);
  ctx.beginPath();
  ctx.moveTo(hx - R * 0.25, hy - R * 0.15);
  ctx.lineTo(hx + R * 0.45, hy);
  ctx.lineTo(hx - R * 0.2, hy + R * 0.2);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = shade(detail, 0.1);
  ctx.beginPath();
  ctx.moveTo(hx - R * 0.15, hy - R * 0.12);
  ctx.lineTo(hx - R * 0.45, hy - R * 0.45);
  ctx.lineTo(hx - R * 0.02, hy - R * 0.15);
  ctx.fill();
  eye(ctx, hx + R * 0.05, hy - R * 0.04, R * 0.07, '#000', detail);
  wing(ctx, -R * 0.05, by - R * 0.2, R * 1.6, -flap * 0.95, dark, 'membrane');
}

function wing(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string, kind: 'feather' | 'membrane'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1, 0.85);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  if (kind === 'feather') {
    ctx.quadraticCurveTo(-len * 0.2, -len * 0.7, -len * 0.55, -len * 0.95);
    ctx.lineTo(-len * 0.5, -len * 0.72);
    ctx.lineTo(-len * 0.7, -len * 0.7);
    ctx.lineTo(-len * 0.58, -len * 0.5);
    ctx.lineTo(-len * 0.75, -len * 0.42);
    ctx.quadraticCurveTo(-len * 0.35, -len * 0.1, 0, 0);
  } else {
    ctx.quadraticCurveTo(-len * 0.1, -len * 0.75, -len * 0.45, -len * 1.0);
    ctx.quadraticCurveTo(-len * 0.52, -len * 0.7, -len * 0.75, -len * 0.62);
    ctx.quadraticCurveTo(-len * 0.72, -len * 0.4, -len * 0.95, -len * 0.3);
    ctx.quadraticCurveTo(-len * 0.5, -len * 0.12, 0, 0);
  }
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.strokeStyle = alpha(shade(color, -0.4), 0.8);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-len * 0.45, -len * 0.95);
  ctx.moveTo(0, 0);
  ctx.lineTo(-len * 0.72, -len * 0.62);
  ctx.stroke();
  ctx.restore();
}

// ───────────────────────────────────────────────── spirits
function wisp(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string): void {
  const by = -R * 1.2 + Math.sin(ph) * R * 0.12;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by, R * 1.6, body, 0.5);
  ctx.restore();
  // flame tail
  const g = ctx.createLinearGradient(-R * 1.4, 0, R * 0.4, 0);
  g.addColorStop(0, alpha(dark, 0));
  g.addColorStop(1, alpha(body, 0.95));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(R * 0.35, by - R * 0.4);
  ctx.quadraticCurveTo(-R * 0.6, by - R * 0.6 + Math.sin(ph * 2) * R * 0.15, -R * 1.4, by + Math.sin(ph) * R * 0.2);
  ctx.quadraticCurveTo(-R * 0.6, by + R * 0.5, R * 0.35, by + R * 0.4);
  ctx.fill();
  const c = ctx.createRadialGradient(R * 0.1, by - R * 0.1, 1, 0, by, R * 0.55);
  c.addColorStop(0, '#ffffff');
  c.addColorStop(0.5, detail);
  c.addColorStop(1, body);
  ctx.fillStyle = c;
  ellipse(ctx, 0, by, R * 0.5, R * 0.48);
  ctx.fill();
  eye(ctx, R * 0.15, by - R * 0.05, R * 0.08, '#000', '#1a3050');
  eye(ctx, -R * 0.08, by - R * 0.05, R * 0.07, '#000', '#1a3050');
}

function wraith(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string): void {
  const by = -R * 1.35 + Math.sin(ph) * R * 0.1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by, R * 1.5, body, 0.28);
  ctx.restore();
  // robe with tattered hem
  const g = ctx.createLinearGradient(0, by - R, 0, by + R * 1.1);
  g.addColorStop(0, shade(body, 0.1));
  g.addColorStop(0.7, alpha(body, 0.85));
  g.addColorStop(1, alpha(body, 0.1));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-R * 0.35, by - R * 0.7);
  ctx.quadraticCurveTo(-R * 0.75, by, -R * 0.85, by + R * 0.9);
  for (let i = 0; i <= 5; i++) {
    const x = -R * 0.85 + (i * R * 1.6) / 5;
    const y = by + R * (0.9 + (i % 2 ? -0.25 : 0.1) + Math.sin(ph + i) * 0.12);
    ctx.lineTo(x, y);
  }
  ctx.quadraticCurveTo(R * 0.75, by, R * 0.4, by - R * 0.7);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  // hood
  ctx.fillStyle = shade(dark, 0.05);
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, by - R * 0.35);
  ctx.quadraticCurveTo(-R * 0.4, by - R * 1.25, R * 0.15, by - R * 1.2);
  ctx.quadraticCurveTo(R * 0.6, by - R * 0.95, R * 0.5, by - R * 0.35);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  ctx.fillStyle = '#05070c';
  ellipse(ctx, R * 0.12, by - R * 0.7, R * 0.26, R * 0.3);
  ctx.fill();
  eye(ctx, R * 0.2, by - R * 0.72, R * 0.06, '#000', detail);
  eye(ctx, R * 0.04, by - R * 0.72, R * 0.06, '#000', detail);
  // claws reaching forward
  ctx.strokeStyle = alpha(shade(body, 0.3), 0.9);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(R * 0.3, by - R * 0.1);
  ctx.quadraticCurveTo(R * 0.8, by + Math.sin(ph) * R * 0.1, R * 0.95, by - R * 0.2);
  ctx.stroke();
}

function elemental(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string): void {
  const by = -R * 1.25;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, by, R * 1.7, body, 0.45);
  ctx.restore();
  // swirling lower vortex
  ctx.strokeStyle = alpha(body, 0.85);
  ctx.lineWidth = R * 0.14;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const r = R * (0.3 + i * 0.15);
    ctx.ellipse(0, by + R * (0.45 + i * 0.22), r, r * 0.3, 0, ph + i, ph + i + Math.PI * 1.3);
    ctx.stroke();
  }
  ctx.fillStyle = bodyFill(ctx, 0, by, R * 0.55, body);
  ellipse(ctx, 0, by - R * 0.1, R * 0.55, R * 0.6);
  ctx.fill();
  outline(ctx, 1.6);
  // orbiting shards
  for (let i = 0; i < 3; i++) {
    const a = ph + (i * Math.PI * 2) / 3;
    const x = Math.cos(a) * R * 0.95;
    const y = by - R * 0.2 + Math.sin(a) * R * 0.3;
    ctx.fillStyle = shade(detail, 0.1);
    ctx.beginPath();
    ctx.moveTo(x, y - R * 0.2);
    ctx.lineTo(x + R * 0.1, y);
    ctx.lineTo(x, y + R * 0.2);
    ctx.lineTo(x - R * 0.1, y);
    ctx.closePath();
    ctx.fill();
    outline(ctx, 1.2);
  }
  eye(ctx, R * 0.2, by - R * 0.2, R * 0.09, '#000', '#ffffff');
  eye(ctx, -R * 0.05, by - R * 0.2, R * 0.08, '#000', '#ffffff');
}

// ───────────────────────────────────────────────── golem
function golem(ctx: Ctx, R: number, ph: number, body: string, dark: string, detail: string): void {
  const swing = Math.sin(ph) * 0.35;
  const bob = Math.abs(Math.cos(ph)) * R * 0.05;
  const hipY = -R * 0.85;
  const block = (x: number, y: number, w: number, h: number, c: string) => {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, shade(c, 0.25));
    g.addColorStop(1, shade(c, -0.35));
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.22);
    ctx.fill();
    outline(ctx, 2);
  };
  // back leg + arm
  ctx.save();
  ctx.translate(-R * 0.25, hipY - bob);
  ctx.rotate(-swing);
  block(-R * 0.18, 0, R * 0.36, R * 0.85, shade(dark, -0.1));
  ctx.restore();
  ctx.save();
  ctx.translate(-R * 0.45, -R * 1.75 - bob);
  ctx.rotate(swing * 0.8);
  block(-R * 0.2, 0, R * 0.4, R * 0.95, shade(body, -0.25));
  ctx.restore();
  // torso
  block(-R * 0.7, -R * 1.95 - bob, R * 1.4, R * 1.15, body);
  ctx.fillStyle = alpha(detail, 0.8);
  ctx.beginPath();
  ctx.moveTo(-R * 0.2, -R * 1.6 - bob);
  ctx.lineTo(0, -R * 1.9 - bob);
  ctx.lineTo(R * 0.2, -R * 1.6 - bob);
  ctx.lineTo(0, -R * 1.35 - bob);
  ctx.closePath();
  ctx.fill();
  // snow on shoulders
  ctx.fillStyle = 'rgba(245,250,255,0.9)';
  ellipse(ctx, -R * 0.3, -R * 1.95 - bob, R * 0.4, R * 0.1);
  ctx.fill();
  // head
  block(-R * 0.12, -R * 2.4 - bob, R * 0.55, R * 0.48, shade(body, 0.05));
  eye(ctx, R * 0.25, -R * 2.2 - bob, R * 0.07, '#000', detail);
  eye(ctx, R * 0.08, -R * 2.2 - bob, R * 0.07, '#000', detail);
  // front leg + arm
  ctx.save();
  ctx.translate(R * 0.25, hipY - bob);
  ctx.rotate(swing);
  block(-R * 0.18, 0, R * 0.36, R * 0.85, dark);
  ctx.restore();
  ctx.save();
  ctx.translate(R * 0.5, -R * 1.75 - bob);
  ctx.rotate(-swing * 0.8);
  block(-R * 0.2, 0, R * 0.42, R * 1.0, shade(body, -0.1));
  ctx.restore();
}
