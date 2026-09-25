// Shared vocabulary for the race tower kits: sprite geometry, the build result and drawing
// primitives in a consistent top-left lit, outlined 3/4 view.
import type { TowerDef } from '../../../shared/types';
import { alpha, ellipse, glow, outline, roundRect, shade, type Ctx } from '../util';

export { alpha, ellipse, glow, outline, roundRect, shade, type Ctx };
export { crystal, cylinder, mix, seeded, sphere, star, taperedPrism } from '../util';

/** Sprite size and the footprint centre inside it (sprite pixels, 64 per cell). */
export const TW = 160;
export const TH = 280;
export const GX = 80;
export const GY = 204;

/** Animated overlays, positioned in sprite pixels. */
export type Fx =
  | { k: 'flame'; x: number; y: number; w: number; h: number; n?: number; color?: string; core?: string }
  | { k: 'orb'; x: number; y: number; r: number; color: string; ring?: boolean; bob?: number }
  | { k: 'spark'; x: number; y: number; r: number; color: string }
  | { k: 'bubbles'; x: number; y: number; r: number; color: string }
  | { k: 'glow'; x: number; y: number; r: number; color: string }
  | { k: 'wisps'; x: number; y: number; r: number; color: string; n?: number }
  | { k: 'smoke'; x: number; y: number; color?: string }
  | { k: 'blink'; x: number; y: number; color: string }
  | { k: 'rays'; x: number; y: number; r: number; color: string }
  | { k: 'vortex'; x: number; y: number; r: number; color: string }
  | { k: 'orbit'; x: number; y: number; r: number; color: string; n: number; size: number }
  | { k: 'snow'; x: number; y: number; r: number }
  | { k: 'coins'; x: number; y: number };

export interface Build {
  /** Sprite y where shots leave the tower. */
  muzzle: number;
  /** Sprite y of the rotating head's pivot, for aimed weapons. */
  head?: number;
  fx: Fx[];
}

export type Slot = '1' | '2a' | '3a' | '4a' | '2b' | '3b' | '4b' | 'L';

export interface Spec {
  def: TowerDef;
  slot: Slot;
  tier: number;
  /** Size multiplier by tier. */
  s: number;
  /** Ground anchor of the body. */
  X: number;
  Y: number;
  glow: string;
}

const TIER_SCALE = [0, 0.9, 0.98, 1.07, 1.16, 1.24];

export function spec(def: TowerDef): Spec {
  const slot = def.id.slice(def.id.indexOf('_') + 1) as Slot;
  return { def, slot, tier: def.tier, s: TIER_SCALE[def.tier], X: GX, Y: GY - 2, glow: def.art.glow };
}

// ─────────────────────────────────────────────── foundations

/** A slab seen from above-front: top face plus a darker front band. */
export function slab(ctx: Ctx, x: number, y: number, w: number, h: number, depth: number, top: string, front: string, r = 16): void {
  ctx.fillStyle = front;
  roundRect(ctx, x - w / 2, y - h / 2 + depth, w, h, r);
  ctx.fill();
  outline(ctx, 2.2);
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, shade(top, 0.18));
  g.addColorStop(1, shade(top, -0.08));
  ctx.fillStyle = g;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, r);
  ctx.fill();
  outline(ctx, 2.2);
}

/** A regular polygon slab (hexagon, octagon…) in 3/4 view. */
export function polySlab(ctx: Ctx, x: number, y: number, rx: number, ry: number, depth: number, sides: number, top: string, front: string, rot = 0): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
  }
  // front skirt: every edge whose lower side faces the viewer
  ctx.fillStyle = front;
  for (let i = 0; i < sides; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % sides];
    if (ay + by < y * 2 - 0.01) continue;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx, by + depth);
    ctx.lineTo(ax, ay + depth);
    ctx.closePath();
    ctx.fillStyle = shade(front, (ax - bx) / (rx * 8));
    ctx.fill();
    outline(ctx, 1.8);
  }
  const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  g.addColorStop(0, shade(top, 0.2));
  g.addColorStop(1, shade(top, -0.08));
  ctx.fillStyle = g;
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
}

export function contactShadow(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(10,18,34,0.3)';
  ctx.filter = 'blur(5px)';
  ellipse(ctx, x, y + 10, w / 2 + 4, h / 2 + 4);
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────── building blocks

/** Cone roof (tent, spire top) sitting on baseY. */
export function cone(ctx: Ctx, x: number, baseY: number, rx: number, h: number, color: string, lean = 0): void {
  const ry = rx * 0.38;
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, shade(color, 0.2));
  g.addColorStop(0.45, color);
  g.addColorStop(1, shade(color, -0.45));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - rx, baseY);
  ctx.lineTo(x + lean, baseY - h);
  ctx.lineTo(x + rx, baseY);
  ctx.ellipse(x, baseY, rx, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
}

/** Half-sphere dome on baseY. */
export function dome(ctx: Ctx, x: number, baseY: number, rx: number, h: number, color: string): void {
  const g = ctx.createRadialGradient(x - rx * 0.35, baseY - h * 0.7, rx * 0.1, x, baseY - h * 0.3, rx * 1.1);
  g.addColorStop(0, shade(color, 0.5));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - rx, baseY);
  ctx.bezierCurveTo(x - rx, baseY - h * 1.3, x + rx, baseY - h * 1.3, x + rx, baseY);
  ctx.ellipse(x, baseY, rx, rx * 0.3, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
}

/** Box with a lit left face, dark right face and top. */
export function block(ctx: Ctx, x: number, baseY: number, w: number, h: number, d: number, color: string): void {
  const l = x - w / 2;
  const r = x + w / 2;
  // right side face
  ctx.fillStyle = shade(color, -0.35);
  ctx.beginPath();
  ctx.moveTo(r, baseY);
  ctx.lineTo(r + d * 0.5, baseY - d * 0.5);
  ctx.lineTo(r + d * 0.5, baseY - h - d * 0.5);
  ctx.lineTo(r, baseY - h);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
  // front
  const g = ctx.createLinearGradient(l, 0, r, 0);
  g.addColorStop(0, shade(color, 0.12));
  g.addColorStop(1, shade(color, -0.12));
  ctx.fillStyle = g;
  ctx.fillRect(l, baseY - h, w, h);
  ctx.strokeStyle = 'rgba(8,14,28,0.72)';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(l, baseY - h, w, h);
  // top
  ctx.fillStyle = shade(color, 0.28);
  ctx.beginPath();
  ctx.moveTo(l, baseY - h);
  ctx.lineTo(l + d * 0.5, baseY - h - d * 0.5);
  ctx.lineTo(r + d * 0.5, baseY - h - d * 0.5);
  ctx.lineTo(r, baseY - h);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.8);
}

/** Arched window or doorway, lit from inside. */
export function window_(ctx: Ctx, x: number, y: number, w: number, h: number, light: string, frame = 'rgba(8,14,28,0.8)'): void {
  ctx.fillStyle = frame;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 1.5, y + h / 2 + 1.5);
  ctx.lineTo(x - w / 2 - 1.5, y - h / 2 + w / 2);
  ctx.arc(x, y - h / 2 + w / 2, w / 2 + 1.5, Math.PI, 0);
  ctx.lineTo(x + w / 2 + 1.5, y + h / 2 + 1.5);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, shade(light, 0.5));
  g.addColorStop(1, light);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + h / 2);
  ctx.lineTo(x - w / 2, y - h / 2 + w / 2);
  ctx.arc(x, y - h / 2 + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.closePath();
  ctx.fill();
}

export function rivets(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, n: number, color = '#c9ced6', r = 2): void {
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0.5 : i / (n - 1);
    const x = x0 + (x1 - x0) * k;
    const y = y0 + (y1 - y0) * k;
    ctx.fillStyle = 'rgba(8,14,28,0.6)';
    ctx.beginPath();
    ctx.arc(x + 0.6, y + 0.8, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function gear(ctx: Ctx, x: number, y: number, r: number, teeth: number, color: string, rot = 0): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = rot + (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? r : r * 1.22;
    const a2 = a + Math.PI / (teeth * 2);
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    ctx.lineTo(x + Math.cos(a2) * rr, y + Math.sin(a2) * rr);
  }
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = shade(color, -0.45);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx, 1.2);
}

/** A thick pipe or cable along a polyline. */
export function pipe(ctx: Ctx, pts: [number, number][], w: number, color: string): void {
  for (const [lw, col] of [
    [w + 3, 'rgba(8,14,28,0.75)'],
    [w, color],
    [w * 0.35, shade(color, 0.35)],
  ] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
}

export function banner(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, trim: string, emblem?: (cx: number, cy: number) => void): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.lineTo(x, y + h - w * 0.35);
  ctx.lineTo(x - w / 2, y + h);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  ctx.fillStyle = trim;
  ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 4);
  emblem?.(x, y + h * 0.42);
}

/** A glowing ellipse of runes on the ground or in the air. */
export function runeRing(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, marks = 8): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = alpha(color, 0.75);
  ctx.lineWidth = 2;
  ellipse(ctx, x, y, rx, ry);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  for (let i = 0; i < marks; i++) {
    const a = (i / marks) * Math.PI * 2;
    const px = x + Math.cos(a) * rx * 0.82;
    const py = y + Math.sin(a) * ry * 0.82;
    ctx.beginPath();
    ctx.moveTo(px - 2, py - 1);
    ctx.lineTo(px + (i % 2 ? 2 : -1), py + 1.5);
    ctx.lineTo(px + 2, py - 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** Glowing rune glyph (a small zig-zag) on a surface. */
export function rune(ctx: Ctx, x: number, y: number, size: number, color: string, variant = 0): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = shade(color, 0.3);
  ctx.lineWidth = Math.max(1.4, size * 0.22);
  ctx.beginPath();
  if (variant % 3 === 0) {
    ctx.moveTo(x - size / 2, y + size / 2);
    ctx.lineTo(x, y - size / 2);
    ctx.lineTo(x + size / 2, y + size / 2);
    ctx.moveTo(x - size / 4, y + size / 8);
    ctx.lineTo(x + size / 4, y + size / 8);
  } else if (variant % 3 === 1) {
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x, y + size / 2);
    ctx.moveTo(x, y - size / 6);
    ctx.lineTo(x + size / 2, y - size / 2);
    ctx.moveTo(x, y + size / 6);
    ctx.lineTo(x - size / 2, y - size / 6);
  } else {
    ctx.moveTo(x - size / 2, y - size / 2);
    ctx.lineTo(x + size / 2, y);
    ctx.lineTo(x - size / 2, y + size / 2);
  }
  ctx.stroke();
  ctx.restore();
}

export function skull(ctx: Ctx, x: number, y: number, r: number, bone = '#e8e2d2', eyes?: string): void {
  ctx.fillStyle = bone;
  ellipse(ctx, x, y, r, r * 0.9);
  ctx.fill();
  outline(ctx, 1.4);
  ctx.fillRect(x - r * 0.55, y + r * 0.5, r * 1.1, r * 0.5);
  ctx.strokeStyle = 'rgba(8,14,28,0.7)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x - r * 0.55, y + r * 0.5, r * 1.1, r * 0.5);
  ctx.fillStyle = '#0a0a10';
  ellipse(ctx, x - r * 0.38, y + r * 0.05, r * 0.26, r * 0.24);
  ctx.fill();
  ellipse(ctx, x + r * 0.38, y + r * 0.05, r * 0.26, r * 0.24);
  ctx.fill();
  if (eyes) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x - r * 0.38, y + r * 0.05, r * 0.7, eyes, 0.9);
    glow(ctx, x + r * 0.38, y + r * 0.05, r * 0.7, eyes, 0.9);
    ctx.restore();
  }
}

/** Soft leafy clump (trees, bushes). */
export function foliage(ctx: Ctx, x: number, y: number, r: number, color: string, rnd: () => number, puffs = 6): void {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * Math.PI * 2 + rnd() * 0.6;
    const d = r * (0.45 + rnd() * 0.2);
    pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, r * (0.5 + rnd() * 0.18)]);
  }
  pts.push([x, y - r * 0.2, r * 0.62]);
  pts.sort((p, q) => q[1] - p[1] + (p[1] - q[1]) * 2);
  for (const [px, py, pr] of pts) {
    const g = ctx.createRadialGradient(px - pr * 0.35, py - pr * 0.45, pr * 0.1, px, py, pr);
    g.addColorStop(0, shade(color, 0.35));
    g.addColorStop(0.6, color);
    g.addColorStop(1, shade(color, -0.45));
    ctx.fillStyle = g;
    ellipse(ctx, px, py, pr, pr * 0.9);
    ctx.fill();
    outline(ctx, 1.6);
  }
}

/** Bark trunk tapering up, with grooves. */
export function trunk(ctx: Ctx, x: number, baseY: number, wBottom: number, wTop: number, h: number, color: string, lean = 0): void {
  const g = ctx.createLinearGradient(x - wBottom / 2, 0, x + wBottom / 2, 0);
  g.addColorStop(0, shade(color, 0.15));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.45));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - wBottom / 2, baseY);
  ctx.quadraticCurveTo(x - wTop / 2 + lean * 0.3, baseY - h * 0.5, x - wTop / 2 + lean, baseY - h);
  ctx.lineTo(x + wTop / 2 + lean, baseY - h);
  ctx.quadraticCurveTo(x + wTop / 2 + lean * 0.3, baseY - h * 0.5, x + wBottom / 2, baseY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  ctx.strokeStyle = alpha(shade(color, -0.5), 0.7);
  ctx.lineWidth = 1.4;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * wBottom * 0.2, baseY - 3);
    ctx.quadraticCurveTo(x + i * wTop * 0.25 + lean * 0.5, baseY - h * 0.5, x + i * wTop * 0.2 + lean, baseY - h + 4);
    ctx.stroke();
  }
}

/** Glowing gem (octahedron) floating at (x, y). */
export function gem(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  const top = y - h / 2;
  const bottom = y + h / 2;
  const faces: [number, number, number, number, number, number, number][] = [
    [x - w / 2, y, x, top, x - w * 0.05, y + h * 0.05, 0.4],
    [x - w * 0.05, y + h * 0.05, x, top, x + w / 2, y, -0.15],
    [x - w / 2, y, x - w * 0.05, y + h * 0.05, x, bottom, 0.05],
    [x - w * 0.05, y + h * 0.05, x + w / 2, y, x, bottom, -0.45],
  ];
  for (const [ax, ay, bx, by, cx, cy, l] of faces) {
    ctx.fillStyle = shade(color, l);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x, top);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, bottom);
  ctx.closePath();
  outline(ctx, 1.8);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 2, y - 1);
  ctx.lineTo(x - 1, top + 3);
  ctx.stroke();
}

/** Stack of coins or a small gold pile. */
export function goldPile(ctx: Ctx, x: number, y: number, r: number, rnd: () => number, n = 9): void {
  ctx.fillStyle = '#b8860b';
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.quadraticCurveTo(x, y - r * 1.1, x + r, y);
  ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
  for (let i = 0; i < n; i++) {
    const cx = x + (rnd() - 0.5) * r * 1.5;
    const cy = y - rnd() * r * 0.55;
    ctx.fillStyle = rnd() > 0.5 ? '#ffd35a' : '#f2b829';
    ellipse(ctx, cx, cy, r * 0.17, r * 0.08);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,0,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function spikeCrown(ctx: Ctx, x: number, y: number, w: number, h: number, n: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  for (let i = 0; i <= n * 2; i++) {
    const px = x - w / 2 + (i * w) / (n * 2);
    ctx.lineTo(px, i % 2 ? y - h * (i === n ? 1.3 : 1) : y);
  }
  ctx.closePath();
  ctx.fill();
  outline(ctx, 1.6);
}
