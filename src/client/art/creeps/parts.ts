// Body parts shared by the creatures: angry eyes, fangs, claws, limbs, wings, robes.
import { alpha, ellipse, glow, outline, shade, type Ctx } from '../util';

/** body, dark accent, eye/glow colour, plus a few flags that change the look. */
export interface Look {
  body: string;
  dark: string;
  eye: string;
  boss: boolean;
  armored: boolean;
}

export const BONE = '#ece6d6';

export const MAW = '#3a0d12';

/** A slanted, glowing eye: high at the back, low towards the snout, so it always looks angry. */
export function evilEye(ctx: Ctx, x: number, y: number, r: number, color: string): void {
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
export function brow(ctx: Ctx, x: number, y: number, r: number, color: string): void {
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
export function fangs(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, n: number, len: number, dir = 1): void {
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
export function spikes(ctx: Ctx, pts: [number, number][], len: number, color: string, lean = 0.35): void {
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
export function claws(ctx: Ctx, x: number, y: number, s: number, angle: number): void {
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

export function limb(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, w: number, color: string): void {
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
export function leg(ctx: Ctx, x: number, y: number, swing: number, len: number, w: number, color: string, knee = 0.3): [number, number] {
  const kx = x + Math.sin(swing + knee) * len * 0.5;
  const ky = y + Math.cos(swing + knee) * len * 0.5;
  const fx = kx + Math.sin(swing - knee) * len * 0.5;
  const fy = Math.min(0, ky + Math.cos(swing - knee) * len * 0.5);
  limb(ctx, x, y, kx, ky, w, color);
  limb(ctx, kx, ky, fx, fy, w * 0.82, color);
  return [fx, fy];
}

export function fill(ctx: Ctx, x: number, y: number, r: number, color: string): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.25);
  g.addColorStop(0, shade(color, 0.3));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -0.5));
  return g;
}

export function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, rot = 0, lw = 2.2): void {
  ctx.fillStyle = fill(ctx, x, y, Math.max(rx, ry), color);
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fill();
  outline(ctx, lw);
}

export function bossAura(ctx: Ctx, R: number, color: string): void {
  ctx.save();
  glow(ctx, 0, -R * 1.25, R * 2.3, '#12081f', 0.55);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, -R * 1.25, R * 1.9, color, 0.2);
  ctx.restore();
}

export function crown(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, points = 5): void {
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

export function weaponClub(ctx: Ctx, x: number, y: number, len: number, w: number, angle: number, wood: string, spike: string): void {
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

export function wing(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string, kind: 'feather' | 'membrane'): void {
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

export function hoodedFace(ctx: Ctx, x: number, y: number, r: number, k: Look, skullFace: boolean): void {
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

export function robe(ctx: Ctx, R: number, by: number, ph: number, top: string, bottom: string): void {
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
