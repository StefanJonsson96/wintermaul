// Tower sprites: each race draws its own buildings (see ./kits). Sprites are drawn once per type
// and cached together with where shots come from and which parts are animated.
import type { TowerDef } from '../../shared/types';
import { type Build, type Fx, GX, GY, type Spec, spec, TH, TW } from './kits/common';
import { KITS } from './kits';
import { alpha, ellipse, glow, makeCanvas, SP, shade, sphereFast, star, type Ctx } from './util';

export { GX, GY, TH, TW };

export interface TowerMeta {
  /** Height (cells) above the footprint centre where shots come from. */
  muzzle: number;
  /** Height (cells) of a rotating head, if any. */
  head: number | null;
  scale: number;
  fx: Fx[];
}

interface Built {
  sprite: HTMLCanvasElement;
  meta: TowerMeta;
  head: HTMLCanvasElement | null;
}

const cache = new Map<string, Built>();

function build(def: TowerDef): Built {
  let b = cache.get(def.id);
  if (b) return b;
  const kit = KITS[def.race];
  const [canvas, ctx] = makeCanvas(TW, TH);
  const p = spec(def);
  const r: Build = kit.draw(ctx, p);
  let head: HTMLCanvasElement | null = null;
  if (r.head !== undefined && kit.head) {
    const [hc, hctx] = makeCanvas(128, 128);
    kit.head(hctx, p);
    head = hc;
  }
  b = {
    sprite: canvas,
    meta: { muzzle: (GY - r.muzzle) / SP, head: r.head !== undefined ? (GY - r.head) / SP : null, scale: p.s, fx: r.fx },
    head,
  };
  cache.set(def.id, b);
  return b;
}

export function towerSprite(def: TowerDef): HTMLCanvasElement {
  return build(def).sprite;
}

export function towerMeta(def: TowerDef): TowerMeta {
  return build(def).meta;
}

export function towerHead(def: TowerDef): HTMLCanvasElement | null {
  return build(def).head;
}

// ─────────────────────────────────────────────────────────── per-frame animation

/**
 * Animated overlay drawn every frame in world units (1 = one cell).
 * (x, y) is the footprint centre; `time` in seconds; `fire` = seconds since the last shot.
 */
export function drawTowerAnim(ctx: Ctx, def: TowerDef, x: number, y: number, time: number, fire: number, seed: number): void {
  const m = towerMeta(def);
  const flash = Math.max(0, 1 - fire * 5);
  const u = 1 / SP;
  for (const f of m.fx) {
    const fx = x + (f.x - GX) * u;
    const fy = y + (f.y - GY) * u;
    switch (f.k) {
      case 'flame': {
        const n = f.n ?? 4;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) {
          const ph = time * (7 + i) + seed + i * 1.7;
          const px = fx + Math.sin(ph) * 0.05 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * f.w * u);
          const fh = (f.h * u) * (0.8 + Math.sin(ph * 1.3) * 0.15 + flash * 0.4) * (i === 0 || i === n - 1 ? 0.75 : 1);
          flame(ctx, px, fy, (f.w * u) / Math.max(2, n) + 0.04, fh, f.color ?? '#ff8a2a', f.core ?? '#ffe08a');
        }
        glow(ctx, fx, fy - f.h * u * 0.4, f.h * u * 1.3, f.color ?? '#ff8a2a', 0.25 + flash * 0.3);
        ctx.restore();
        break;
      }
      case 'orb': {
        const oy = fy + Math.sin(time * 2 + seed) * (f.bob ?? 3) * u;
        const r = f.r * u;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, fx, oy, r * 3.2, f.color, 0.45 + flash * 0.4);
        ctx.restore();
        sphereFast(ctx, fx, oy, r, f.color);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ellipse(ctx, fx - r * 0.35, oy - r * 0.4, r * 0.25, r * 0.18);
        ctx.fill();
        if (f.ring) {
          ctx.strokeStyle = alpha(f.color, 0.85);
          ctx.lineWidth = 0.035;
          ellipse(ctx, fx, oy, r * 1.9, r * 0.6, Math.sin(time * 0.8 + seed) * 0.4);
          ctx.stroke();
          const ang = time * 2.4 + seed;
          sphereFast(ctx, fx + Math.cos(ang) * r * 1.9, oy + Math.sin(ang) * r * 0.6, r * 0.22, f.color);
        }
        break;
      }
      case 'spark': {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, fx, fy, f.r * u * 2.2, f.color, 0.35 + flash * 0.5);
        ctx.strokeStyle = alpha(shade(f.color, 0.4), 0.95);
        ctx.lineWidth = 0.03;
        const n = 2 + (flash > 0 ? 3 : 0);
        for (let i = 0; i < n; i++) {
          const ang = Math.floor(time * 14 + i * 3 + seed) * 2.39;
          let px = fx;
          let py = fy;
          ctx.beginPath();
          ctx.moveTo(px, py);
          for (let k = 0; k < 3; k++) {
            px += Math.cos(ang + k) * f.r * u * 0.45;
            py += Math.sin(ang + k * 1.7) * f.r * u * 0.35;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();
        sphereFast(ctx, fx, fy, f.r * u * 0.5, f.color);
        break;
      }
      case 'bubbles': {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, fx, fy, f.r * u * 1.6, f.color, 0.22 + flash * 0.3);
        ctx.restore();
        for (let i = 0; i < 4; i++) {
          const ph = (time * 0.7 + i / 4 + seed * 0.1) % 1;
          const bx = fx + Math.sin(i * 2.1 + seed) * f.r * u * 0.7;
          const by = fy - ph * 0.35;
          ctx.fillStyle = alpha(shade(f.color, 0.4), 1 - ph);
          ctx.beginPath();
          ctx.arc(bx, by, 0.04 + 0.03 * (1 - ph), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'glow': {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, fx, fy, f.r * u, f.color, 0.2 + 0.08 * Math.sin(time * 2.2 + seed) + flash * 0.45);
        ctx.restore();
        break;
      }
      case 'wisps': {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const n = f.n ?? 3;
        for (let i = 0; i < n; i++) {
          const ang = time * (0.6 + i * 0.13) + i * 2.1 + seed;
          glow(ctx, fx + Math.cos(ang) * f.r * u, fy + Math.sin(ang * 1.3) * f.r * u * 0.6, 0.12, f.color, 0.75);
        }
        ctx.restore();
        break;
      }
      case 'smoke': {
        for (let i = 0; i < 3; i++) {
          const ph = (time * 0.35 + i / 3 + seed * 0.07) % 1;
          ctx.fillStyle = alpha(f.color ?? '#3c3a40', 0.35 * (1 - ph));
          ctx.beginPath();
          ctx.arc(fx + Math.sin(ph * 6 + i) * 0.12, fy - ph * 1.1, 0.1 + ph * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'blink': {
        if (Math.sin(time * 4 + seed) > 0.2) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          glow(ctx, fx, fy, 0.18, f.color, 0.9);
          ctx.restore();
        }
        break;
      }
      case 'rays': {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(fx, fy);
        ctx.rotate(time * 0.4 + seed);
        ctx.fillStyle = alpha(f.color, 0.28 + flash * 0.3);
        const r = f.r * u;
        for (let i = 0; i < 8; i++) {
          ctx.rotate(Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(-r * 0.12, -r * 0.35);
          ctx.lineTo(0, -r);
          ctx.lineTo(r * 0.12, -r * 0.35);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, fx, fy, r * 1.2, f.color, 0.4 + flash * 0.4);
        ctx.restore();
        break;
      }
      case 'vortex': {
        const r = f.r * u;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(1, 0.45);
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = alpha(f.color, 0.55 - i * 0.12);
          ctx.lineWidth = 0.05;
          ctx.beginPath();
          const a0 = -time * (2 + i * 0.6) + seed + i * 2.1;
          ctx.arc(0, 0, r * (0.45 + i * 0.25), a0, a0 + Math.PI * 1.2);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(6,4,14,0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'orbit': {
        const r = f.r * u;
        for (let i = 0; i < f.n; i++) {
          const ang = time * 1.2 + seed + (i / f.n) * Math.PI * 2;
          const px = fx + Math.cos(ang) * r;
          const py = fy + Math.sin(ang) * r * 0.35;
          const sz = f.size * u * (0.8 + 0.2 * Math.sin(ang));
          ctx.fillStyle = Math.sin(ang) > 0 ? f.color : shade(f.color, -0.25);
          ctx.beginPath();
          ctx.moveTo(px, py - sz * 1.6);
          ctx.lineTo(px + sz, py);
          ctx.lineTo(px, py + sz * 1.6);
          ctx.lineTo(px - sz, py);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'snow': {
        const r = f.r * u;
        ctx.fillStyle = 'rgba(245,250,255,0.85)';
        for (let i = 0; i < 7; i++) {
          const ang = time * (1.5 + (i % 3) * 0.4) + i * 0.9 + seed;
          const rr = r * (0.35 + ((i * 37) % 10) / 14);
          ctx.beginPath();
          ctx.arc(fx + Math.cos(ang) * rr, fy + Math.sin(ang) * rr * 0.4 - Math.sin(time + i) * 0.1, 0.035, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'coins': {
        if (Math.sin(time * 1.3 + seed) > 0.95) {
          ctx.fillStyle = 'rgba(255,255,220,0.9)';
          star(ctx, fx, fy, 0.12, 0.03, 4);
          ctx.fill();
        }
        break;
      }
    }
  }
  if (def.tier === 5) legendCrown(ctx, x, y - m.muzzle - 0.45, time, seed);
}

function legendCrown(ctx: Ctx, x: number, y: number, time: number, seed: number): void {
  const cy = y + Math.sin(time * 1.5 + seed) * 0.05;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, cy, 0.6, '#ffd35a', 0.3);
  ctx.restore();
  ctx.strokeStyle = '#ffd35a';
  ctx.lineWidth = 0.05;
  ellipse(ctx, x, cy, 0.34, 0.1, 0);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const ang = time * 0.8 + (i / 5) * Math.PI * 2;
    ctx.fillStyle = '#fff1b0';
    ctx.beginPath();
    ctx.arc(x + Math.cos(ang) * 0.34, cy + Math.sin(ang) * 0.1, 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
}

const flameCache = new Map<string, HTMLCanvasElement>();
function flameSprite(outer: string, inner: string): HTMLCanvasElement {
  const key = outer + inner;
  let c = flameCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 32;
  c.height = 64;
  const f = c.getContext('2d')!;
  const g = f.createLinearGradient(0, 64, 0, 0);
  g.addColorStop(0, alpha(inner, 0.9));
  g.addColorStop(0.5, alpha(outer, 0.75));
  g.addColorStop(1, alpha(outer, 0));
  f.fillStyle = g;
  f.beginPath();
  f.moveTo(0, 64);
  f.quadraticCurveTo(-2, 32, 16, 0);
  f.quadraticCurveTo(34, 32, 32, 64);
  f.closePath();
  f.fill();
  f.fillStyle = 'rgba(255,250,220,0.8)';
  f.beginPath();
  f.ellipse(16, 55, 6, 12, 0, 0, Math.PI * 2);
  f.fill();
  flameCache.set(key, c);
  return c;
}

function flame(ctx: Ctx, x: number, baseY: number, w: number, h: number, outer: string, inner: string): void {
  ctx.drawImage(flameSprite(outer, inner), x - w, baseY - h, w * 2, h);
}

/** Tower portrait for buttons and panels. */
const iconCache = new Map<string, HTMLCanvasElement>();
export function towerIcon(def: TowerDef, size = 64): HTMLCanvasElement {
  const key = `${def.id}@${size}`;
  let c = iconCache.get(key);
  if (c) return c;
  const [canvas, ctx] = makeCanvas(size, size);
  const spr = towerSprite(def);
  const m = towerMeta(def);
  // crop around the tower body
  const topPx = GY - (Math.max(m.muzzle, m.head ?? 0) + 0.55) * SP;
  const cropTop = Math.max(0, Math.min(topPx, GY - 150));
  const cropH = GY + 62 - cropTop;
  const cropW = cropH;
  const sx = GX - cropW / 2;
  ctx.drawImage(spr, sx, cropTop, cropW, cropH, 0, 0, size, size);
  ctx.save();
  const k = size / cropW;
  ctx.scale(k * SP, k * SP);
  ctx.translate(-sx / SP, -cropTop / SP);
  const head = towerHead(def);
  if (head && m.head !== null) ctx.drawImage(head, GX / SP - 1, GY / SP - m.head - 1, 2, 2);
  drawTowerAnim(ctx, def, GX / SP, GY / SP, 0.4, 10, 1);
  ctx.restore();
  iconCache.set(key, canvas);
  return canvas;
}

export type { Spec };
