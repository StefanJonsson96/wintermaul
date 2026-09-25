import type { TowerDef } from '../../shared/types';
import {
  alpha,
  crystal,
  sphereFast,
  cylinder,
  ellipse,
  glow,
  makeCanvas,
  mix,
  outline,
  roundRect,
  SP,
  seeded,
  shade,
  sphere,
  star,
  taperedPrism,
  type Ctx,
} from './util';

// Tower sprites are drawn once per type into a canvas and cached. The footprint (2x2 cells) is
// centred on (GX, GY) in sprite pixels; everything above that is the tower "standing up".
export const TW = 160;
export const TH = 280;
export const GX = 80;
export const GY = 204;

const BASE_MATERIAL: Record<string, string> = {
  frost: '#6d8db4',
  fire: '#4b3b37',
  storm: '#505b70',
  stone: '#7a7264',
  arcane: '#4b406d',
  venom: '#3c4534',
  tech: '#6a6254',
  shadow: '#2c263b',
  sun: '#d2c7a6',
  grove: '#5d4632',
  gold: '#6f5937',
  prism: '#6b5b7c',
};

const TIER_SCALE = [0, 0.9, 0.98, 1.07, 1.16, 1.24];

export interface TowerMeta {
  /** Height (cells) above the footprint centre where shots come from. */
  muzzle: number;
  /** Height (cells) of a rotating head, if any. */
  head: number | null;
  scale: number;
}

const spriteCache = new Map<string, HTMLCanvasElement>();
const headCache = new Map<string, HTMLCanvasElement>();
const metaCache = new Map<string, TowerMeta>();

export function towerMeta(def: TowerDef): TowerMeta {
  let m = metaCache.get(def.id);
  if (m) return m;
  const s = TIER_SCALE[def.tier];
  const t = def.tier;
  let muzzle = 1.2;
  let head: number | null = null;
  switch (def.art.shape) {
    case 'crystal':
      muzzle = ((70 + t * 18) * s) / SP;
      break;
    case 'spire':
      muzzle = ((100 + t * 16) * s) / SP;
      break;
    case 'obelisk':
      muzzle = ((96 + t * 18) * s) / SP;
      break;
    case 'orb':
      muzzle = ((62 + t * 8) * s) / SP;
      break;
    case 'totem':
      muzzle = ((58 + t * 14) * s) / SP;
      break;
    case 'brazier':
      muzzle = (60 * s) / SP;
      break;
    case 'coil':
      muzzle = ((74 + t * 14) * s) / SP;
      break;
    case 'tree':
      muzzle = ((80 + t * 12) * s) / SP;
      break;
    case 'mortar':
      head = (30 * s) / SP;
      muzzle = head + 0.2;
      break;
    case 'turret':
      head = ((30 + t * 6) * s) / SP;
      muzzle = head + 0.1;
      break;
    case 'vault':
      muzzle = (70 * s) / SP;
      break;
    case 'rock':
      muzzle = (46 * s) / SP;
      break;
    case 'pool':
      muzzle = (30 * s) / SP;
      break;
    case 'shrine':
      muzzle = (58 * s) / SP;
      break;
  }
  m = { muzzle, head, scale: s };
  metaCache.set(def.id, m);
  return m;
}

export function towerSprite(def: TowerDef): HTMLCanvasElement {
  let c = spriteCache.get(def.id);
  if (c) return c;
  const [canvas, ctx] = makeCanvas(TW, TH);
  drawBase(ctx, def);
  drawBody(ctx, def);
  spriteCache.set(def.id, canvas);
  return canvas;
}

export function towerHead(def: TowerDef): HTMLCanvasElement | null {
  if (def.art.shape !== 'turret' && def.art.shape !== 'mortar') return null;
  let c = headCache.get(def.id);
  if (c) return c;
  const [canvas, ctx] = makeCanvas(128, 128);
  drawHead(ctx, def);
  headCache.set(def.id, canvas);
  return canvas;
}

// ─────────────────────────────────────────────────────────── base
function drawBase(ctx: Ctx, def: TowerDef): void {
  const mat = BASE_MATERIAL[def.race] ?? '#6b7890';
  const t = def.tier;
  const w = 92 + Math.min(t, 4) * 3;
  const h = 64 + Math.min(t, 4) * 2;
  const x = GX - w / 2;
  const y = GY - h / 2 + 6;
  const r = 24;
  // soft contact shadow
  ctx.save();
  ctx.fillStyle = 'rgba(10,18,34,0.34)';
  ctx.filter = 'blur(5px)';
  roundRect(ctx, x - 2, y + 12, w + 8, h + 6, r + 4);
  ctx.fill();
  ctx.restore();
  // front face
  const fh = 12;
  ctx.fillStyle = shade(mat, -0.4);
  roundRect(ctx, x, y + fh, w, h, r);
  ctx.fill();
  outline(ctx, 2.2);
  // top face
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(mat, 0.22));
  g.addColorStop(1, shade(mat, -0.06));
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  outline(ctx, 2.2);
  // stone joints
  const rnd = seeded(def.id.length * 131 + def.tier * 17);
  ctx.strokeStyle = shade(mat, -0.22, 0.5);
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 4; i++) {
    const yy = y + 12 + rnd() * (h - 24);
    const xx = x + 14 + rnd() * (w - 44);
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx + 10 + rnd() * 14, yy + (rnd() - 0.5) * 3);
    ctx.stroke();
  }
  // snow dusting on the rim
  ctx.fillStyle = 'rgba(235,244,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.3, y + 6, w * 0.17, 3.5, -0.05, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.72, y + 5, w * 0.1, 3, 0.05, 0, Math.PI * 2);
  ctx.fill();
  // tier studs on the front face
  const studs = t === 5 ? 0 : t;
  for (let i = 0; i < studs; i++) {
    const sx = GX + (i - (studs - 1) / 2) * 14;
    const sy = y + h + fh * 0.55;
    ctx.fillStyle = shade(def.art.glow, 0.1);
    ctx.beginPath();
    ctx.arc(sx, sy, 3.4, 0, Math.PI * 2);
    ctx.fill();
    outline(ctx, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(sx - 1, sy - 1, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t === 5) {
    ctx.strokeStyle = '#ffd35a';
    ctx.lineWidth = 2.4;
    roundRect(ctx, x + 3, y + 3, w - 6, h - 6, r - 3);
    ctx.stroke();
    ctx.fillStyle = '#ffd35a';
    star(ctx, GX, y + h + fh * 0.55, 6, 2.6, 5);
    ctx.fill();
    outline(ctx, 1.2);
  }
}

// ─────────────────────────────────────────────────────────── bodies
function drawBody(ctx: Ctx, def: TowerDef): void {
  const a = def.art;
  const t = def.tier;
  const s = TIER_SCALE[t];
  const X = GX;
  const Y = GY - 2;
  ctx.save();
  switch (a.shape) {
    case 'crystal': {
      glow(ctx, X, Y - 40 * s, 70 * s, a.glow, 0.35);
      const h = (70 + t * 18) * s;
      const light = shade(a.primary, 0.1);
      const dark = mix(a.primary, a.secondary, 0.65);
      const n = Math.min(6, 2 + t);
      const rnd = seeded(def.id.charCodeAt(0) * 7 + t);
      const shards: [number, number, number, number][] = [];
      for (let i = 0; i < n; i++) {
        if (i === 0) continue;
        const side = i % 2 ? -1 : 1;
        const off = side * (12 + ((i + 1) >> 1) * 11) * s;
        shards.push([X + off, h * (0.42 + rnd() * 0.25), (16 + rnd() * 6) * s, side * (8 + rnd() * 8) * s]);
      }
      // back shards first
      shards.sort((p, q) => Math.abs(q[0] - X) - Math.abs(p[0] - X));
      for (const [sx, sh, sw, lean] of shards) crystal(ctx, sx, Y + 2, sw, sh, lean, light, dark);
      crystal(ctx, X, Y + 4, 28 * s, h, 2, shade(a.primary, 0.25), dark);
      if (t >= 4) {
        ctx.fillStyle = alpha('#ffffff', 0.7);
        star(ctx, X + 2, Y - h + 6, 7, 2, 4);
        ctx.fill();
      }
      break;
    }
    case 'spire': {
      const rx = (20 + t) * s;
      const h = (72 + t * 16) * s;
      cylinder(ctx, X, Y, rx * 1.2, 16 * s, shade(a.secondary, -0.2));
      cylinder(ctx, X, Y - 14 * s, rx, h - 14 * s, a.primary);
      // bands
      for (let i = 1; i <= Math.min(3, t); i++) {
        const by = Y - 14 * s - (h - 14 * s) * (i / (Math.min(3, t) + 1));
        ctx.fillStyle = shade(a.secondary, -0.1);
        ctx.fillRect(X - rx, by - 3, rx * 2, 6);
        ctx.strokeStyle = 'rgba(8,14,28,0.5)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(X - rx, by - 3, rx * 2, 6);
      }
      // windows
      ctx.fillStyle = a.glow;
      for (let i = 0; i < 2; i++) {
        roundRect(ctx, X - 4 + (i ? rx * 0.35 : -rx * 0.45), Y - h * (0.35 + i * 0.25), 6, 11, 3);
        ctx.fill();
      }
      // roof
      const top = Y - h;
      const rr = rx * 1.35;
      const rh = rx * 2.1;
      ctx.fillStyle = shade(a.secondary, 0.1);
      ctx.beginPath();
      ctx.moveTo(X - rr, top);
      ctx.lineTo(X, top - rh);
      ctx.lineTo(X, top + rr * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(a.secondary, -0.3);
      ctx.beginPath();
      ctx.moveTo(X, top + rr * 0.35);
      ctx.lineTo(X, top - rh);
      ctx.lineTo(X + rr, top);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X - rr, top);
      ctx.lineTo(X, top - rh);
      ctx.lineTo(X + rr, top);
      ctx.lineTo(X, top + rr * 0.35);
      ctx.closePath();
      outline(ctx, 2);
      break;
    }
    case 'obelisk': {
      const h = (78 + t * 18) * s;
      // plinth
      taperedPrism(ctx, X, Y + 2, 54 * s, 50 * s, 14 * s, shade(a.primary, -0.15));
      taperedPrism(ctx, X, Y - 12 * s, 38 * s, 18 * s, h - 12 * s, a.primary, 16 * s);
      // runes
      ctx.strokeStyle = a.glow;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = a.glow;
      ctx.shadowBlur = 8;
      const rnd = seeded(def.id.length * 13 + t);
      for (let i = 0; i < 2 + t; i++) {
        const ry = Y - 22 * s - i * ((h - 40 * s) / (2 + t));
        const rx = X - 9 * s + (1 - i / (3 + t)) * 2;
        ctx.beginPath();
        ctx.moveTo(rx - 3, ry);
        ctx.lineTo(rx + 3 * (rnd() > 0.5 ? 1 : -1), ry - 5);
        ctx.lineTo(rx + 3, ry - 1);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      break;
    }
    case 'orb': {
      const ph = (30 + t * 6) * s;
      cylinder(ctx, X, Y, 24 * s, 10 * s, shade(a.primary, -0.1));
      cylinder(ctx, X, Y - 10 * s, 13 * s, ph, shade(a.primary, 0.05));
      // cradle prongs
      ctx.strokeStyle = shade(a.secondary, -0.15);
      ctx.lineWidth = 5 * s;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(X + side * 10 * s, Y - 10 * s - ph);
        ctx.quadraticCurveTo(X + side * 24 * s, Y - 20 * s - ph, X + side * 18 * s, Y - 34 * s - ph);
        ctx.stroke();
      }
      break;
    }
    case 'totem': {
      const blocks = 2 + Math.floor(t / 2);
      const bw = 38 * s;
      const bh = (22 + t * 2) * s;
      let yy = Y + 2;
      for (let i = 0; i < blocks; i++) {
        const w = bw * (1 - i * 0.08);
        taperedPrism(ctx, X, yy, w, w * 0.94, bh, i % 2 ? shade(a.primary, -0.08) : a.primary);
        // carved face
        const fy = yy - bh * 0.55;
        ctx.fillStyle = a.glow;
        ctx.shadowColor = a.glow;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(X - w * 0.22, fy, 2.6 * s + 0.6, 0, Math.PI * 2);
        ctx.arc(X + w * 0.12, fy, 2.6 * s + 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = shade(a.primary, -0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X - w * 0.25, fy + bh * 0.25);
        ctx.lineTo(X + w * 0.15, fy + bh * 0.25);
        ctx.stroke();
        yy -= bh;
      }
      // horns / wings
      ctx.fillStyle = a.secondary;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(X + side * 10 * s, yy + 2);
        ctx.quadraticCurveTo(X + side * (34 + t * 3) * s, yy - 4 * s, X + side * (30 + t * 4) * s, yy - (22 + t * 4) * s);
        ctx.quadraticCurveTo(X + side * 20 * s, yy - 8 * s, X + side * 4 * s, yy + 2);
        ctx.fill();
        outline(ctx, 1.8);
      }
      break;
    }
    case 'brazier': {
      cylinder(ctx, X, Y, 20 * s, 10 * s, shade(a.primary, -0.05));
      cylinder(ctx, X, Y - 8 * s, 11 * s, 26 * s, a.primary);
      // bowl
      const by = Y - 34 * s;
      const br = (30 + t * 2) * s;
      ctx.fillStyle = shade(a.primary, -0.25);
      ctx.beginPath();
      ctx.ellipse(X, by, br, br * 0.36, 0, 0, Math.PI);
      ctx.bezierCurveTo(X - br * 0.8, by + br * 0.8, X + br * 0.8, by + br * 0.8, X + br, by);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X - br, by);
      ctx.bezierCurveTo(X - br * 0.8, by + br * 0.8, X + br * 0.8, by + br * 0.8, X + br, by);
      outline(ctx, 2);
      ctx.fillStyle = shade(a.primary, 0.15);
      ellipse(ctx, X, by, br, br * 0.36);
      ctx.fill();
      outline(ctx, 2);
      // embers
      const g = ctx.createRadialGradient(X, by, 2, X, by, br);
      g.addColorStop(0, '#fff3c4');
      g.addColorStop(0.35, a.glow);
      g.addColorStop(1, shade(a.secondary, -0.3));
      ctx.fillStyle = g;
      ellipse(ctx, X, by, br * 0.82, br * 0.27);
      ctx.fill();
      break;
    }
    case 'coil': {
      const h = (58 + t * 14) * s;
      cylinder(ctx, X, Y, 22 * s, 12 * s, shade(a.primary, -0.1));
      cylinder(ctx, X, Y - 12 * s, 7 * s, h, shade(a.primary, 0.2));
      const rings = 2 + t;
      for (let i = 0; i < rings; i++) {
        const ry = Y - 18 * s - (i * (h - 16 * s)) / rings;
        const rr = (22 - i * (10 / rings)) * s;
        ctx.lineWidth = 5.5 * s;
        ctx.strokeStyle = shade('#c47a3a', -0.25);
        ellipse(ctx, X, ry + 1.5, rr, rr * 0.38);
        ctx.stroke();
        ctx.lineWidth = 3.6 * s;
        ctx.strokeStyle = '#d98d48';
        ellipse(ctx, X, ry, rr, rr * 0.38);
        ctx.stroke();
      }
      break;
    }
    case 'tree': {
      const h = (64 + t * 12) * s;
      const trunk = shade(a.secondary, 0);
      // roots
      ctx.fillStyle = shade(trunk, -0.15);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(X + side * 4 * s, Y - 10 * s);
        ctx.quadraticCurveTo(X + side * 16 * s, Y - 2, X + side * 24 * s, Y + 6);
        ctx.lineTo(X + side * 8 * s, Y + 4);
        ctx.closePath();
        ctx.fill();
        outline(ctx, 1.6);
      }
      taperedPrism(ctx, X, Y + 2, 20 * s, 12 * s, h * 0.6, trunk);
      const rnd = seeded(def.id.length * 29 + t);
      const blobs = 3 + Math.min(3, t);
      const fy = Y - h * 0.62;
      const pts: [number, number, number][] = [];
      for (let i = 0; i < blobs; i++) {
        const ang = (i / blobs) * Math.PI * 2 + rnd();
        pts.push([X + Math.cos(ang) * 16 * s, fy - 8 * s + Math.sin(ang) * 11 * s - (i === 0 ? 10 * s : 0), (20 + rnd() * 8) * s]);
      }
      pts.sort((p, q) => q[1] - p[1]);
      for (const [px, py, r] of pts) {
        const g = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r);
        g.addColorStop(0, shade(a.primary, 0.3));
        g.addColorStop(0.6, a.primary);
        g.addColorStop(1, shade(a.primary, -0.45));
        ctx.fillStyle = g;
        ellipse(ctx, px, py, r, r * 0.92);
        ctx.fill();
        outline(ctx, 1.8);
      }
      // snow on the crown
      ctx.fillStyle = 'rgba(240,248,255,0.85)';
      const top = pts.reduce((m, p) => (p[1] - p[2] < m[1] - m[2] ? p : m), pts[0]);
      ellipse(ctx, top[0] - 3, top[1] - top[2] * 0.62, top[2] * 0.55, top[2] * 0.2);
      ctx.fill();
      if (t >= 3) {
        ctx.fillStyle = a.glow;
        for (let i = 0; i < t + 1; i++) {
          ctx.beginPath();
          ctx.arc(X + (rnd() - 0.5) * 50 * s, fy + (rnd() - 0.5) * 30 * s, 3 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'mortar': {
      cylinder(ctx, X, Y, 30 * s, 22 * s, a.primary);
      ctx.fillStyle = shade(a.secondary, -0.2);
      for (let i = 0; i < 6; i++) {
        const ang = Math.PI * (0.1 + i * 0.16);
        ctx.beginPath();
        ctx.arc(X - Math.cos(ang) * 26 * s, Y - 10 * s + Math.sin(ang) * 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'turret': {
      const h = (24 + t * 6) * s;
      cylinder(ctx, X, Y, 28 * s, 10 * s, shade(a.primary, -0.12));
      cylinder(ctx, X, Y - 8 * s, 22 * s, h, a.primary);
      ctx.fillStyle = a.secondary;
      ctx.fillRect(X - 22 * s, Y - 8 * s - h * 0.55, 44 * s, 5);
      break;
    }
    case 'vault': {
      const w = (60 + t * 4) * s;
      const wh = (34 + t * 3) * s;
      taperedPrism(ctx, X, Y + 2, w, w, wh, a.primary);
      // roof
      const top = Y + 2 - wh;
      ctx.fillStyle = shade(a.secondary, -0.25);
      ctx.beginPath();
      ctx.moveTo(X - w / 2 - 6, top + 2);
      ctx.lineTo(X - w * 0.05, top - wh * 0.9);
      ctx.lineTo(X + w / 2 + 6, top + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(a.secondary, 0.05);
      ctx.beginPath();
      ctx.moveTo(X - w / 2 - 6, top + 2);
      ctx.lineTo(X - w * 0.05, top - wh * 0.9);
      ctx.lineTo(X - w * 0.05, top + 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X - w / 2 - 6, top + 2);
      ctx.lineTo(X - w * 0.05, top - wh * 0.9);
      ctx.lineTo(X + w / 2 + 6, top + 2);
      outline(ctx, 2);
      // door
      ctx.fillStyle = shade(a.primary, -0.6);
      ctx.beginPath();
      ctx.moveTo(X - w * 0.22, Y + 2 + w * 0.1);
      ctx.lineTo(X - w * 0.22, Y - wh * 0.4);
      ctx.arc(X - w * 0.12, Y - wh * 0.4, w * 0.1, Math.PI, 0);
      ctx.lineTo(X - w * 0.02, Y + 2 + w * 0.11);
      ctx.fill();
      // coin sign
      sphere(ctx, X + w * 0.2, Y - wh * 0.55, 8 * s, '#ffc629');
      ctx.fillStyle = 'rgba(80,50,0,0.7)';
      ctx.font = `bold ${Math.round(10 * s)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', X + w * 0.2, Y - wh * 0.55 + 1);
      break;
    }
    case 'rock': {
      const rnd = seeded(def.id.length * 71 + t * 3);
      const volcano = def.id === 'fire_4b';
      if (volcano) {
        ctx.fillStyle = shade(a.primary, 0.05);
        ctx.beginPath();
        ctx.moveTo(X - 50 * s, Y + 8);
        ctx.lineTo(X - 14 * s, Y - 62 * s);
        ctx.lineTo(X + 14 * s, Y - 62 * s);
        ctx.lineTo(X + 50 * s, Y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shade(a.primary, -0.35);
        ctx.beginPath();
        ctx.moveTo(X + 2, Y + 10);
        ctx.lineTo(X + 14 * s, Y - 62 * s);
        ctx.lineTo(X + 50 * s, Y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(X - 50 * s, Y + 8);
        ctx.lineTo(X - 14 * s, Y - 62 * s);
        ctx.lineTo(X + 14 * s, Y - 62 * s);
        ctx.lineTo(X + 50 * s, Y + 8);
        outline(ctx, 2.2);
        ctx.fillStyle = a.glow;
        ellipse(ctx, X, Y - 62 * s, 14 * s, 5 * s);
        ctx.fill();
        ctx.strokeStyle = a.secondary;
        ctx.lineWidth = 3;
        ctx.shadowColor = a.glow;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(X - 6 * s, Y - 58 * s);
        ctx.lineTo(X - 14 * s, Y - 30 * s);
        ctx.lineTo(X - 10 * s, Y - 6 * s);
        ctx.moveTo(X + 5 * s, Y - 56 * s);
        ctx.lineTo(X + 16 * s, Y - 24 * s);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
      const n = 2 + Math.min(3, t);
      const rocks: [number, number, number][] = [];
      for (let i = 0; i < n; i++) {
        const big = i === 0;
        rocks.push([X + (big ? 0 : (rnd() - 0.5) * 60 * s), Y - (big ? 18 * s : rnd() * 12 * s), (big ? 30 + t * 4 : 14 + rnd() * 10) * s]);
      }
      rocks.sort((p, q) => p[1] - q[1]);
      for (const [rx, ry, r] of rocks) {
        const pts = 7;
        ctx.beginPath();
        for (let k = 0; k < pts; k++) {
          const ang = (k / pts) * Math.PI * 2;
          const rr = r * (0.82 + rnd() * 0.3);
          const px = rx + Math.cos(ang) * rr;
          const py = ry + Math.sin(ang) * rr * 0.82;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const g = ctx.createLinearGradient(rx - r, ry - r, rx + r, ry + r);
        g.addColorStop(0, shade(a.primary, 0.25));
        g.addColorStop(1, shade(a.primary, -0.4));
        ctx.fillStyle = g;
        ctx.fill();
        outline(ctx, 2);
        ctx.fillStyle = 'rgba(240,248,255,0.85)';
        ellipse(ctx, rx - r * 0.1, ry - r * 0.62, r * 0.55, r * 0.2);
        ctx.fill();
        ctx.fillStyle = alpha(a.secondary, 0.8);
        ellipse(ctx, rx + r * 0.3, ry + r * 0.35, r * 0.25, r * 0.12);
        ctx.fill();
      }
      if (t >= 3) {
        ctx.strokeStyle = a.glow;
        ctx.lineWidth = 2;
        ctx.shadowColor = a.glow;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(X - 10 * s, Y - 30 * s);
        ctx.lineTo(X - 2 * s, Y - 18 * s);
        ctx.lineTo(X + 6 * s, Y - 26 * s);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      break;
    }
    case 'pool': {
      const r = (40 + t * 3) * s;
      ctx.fillStyle = shade(a.primary, -0.25);
      ellipse(ctx, X, Y - 4, r, r * 0.5);
      ctx.fill();
      outline(ctx, 2);
      ctx.fillStyle = shade(a.primary, 0.12);
      ellipse(ctx, X, Y - 10 * s, r, r * 0.46);
      ctx.fill();
      outline(ctx, 2);
      const g = ctx.createRadialGradient(X - r * 0.2, Y - 14 * s, 2, X, Y - 10 * s, r * 0.8);
      g.addColorStop(0, shade(a.secondary, 0.5));
      g.addColorStop(0.6, a.secondary);
      g.addColorStop(1, shade(a.secondary, -0.4));
      ctx.fillStyle = g;
      ellipse(ctx, X, Y - 10 * s, r * 0.78, r * 0.33);
      ctx.fill();
      // rim stones
      const rnd = seeded(t * 19 + def.id.length);
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2;
        ctx.fillStyle = shade(a.primary, (rnd() - 0.5) * 0.3);
        ellipse(ctx, X + Math.cos(ang) * r * 0.92, Y - 10 * s + Math.sin(ang) * r * 0.42, 6 * s, 4 * s);
        ctx.fill();
        outline(ctx, 1.2);
      }
      break;
    }
    case 'shrine': {
      taperedPrism(ctx, X, Y + 2, 64 * s, 60 * s, 12 * s, shade(a.primary, -0.12));
      const ph = (34 + t * 4) * s;
      for (const side of [-1, 1]) cylinder(ctx, X + side * 22 * s, Y - 8 * s, 6 * s, ph, a.primary);
      taperedPrism(ctx, X, Y - 8 * s - ph + 2, 66 * s, 58 * s, 9 * s, shade(a.primary, 0.05));
      ctx.fillStyle = shade(a.secondary, -0.2);
      ctx.beginPath();
      ctx.moveTo(X - 34 * s, Y - 16 * s - ph);
      ctx.lineTo(X - 2 * s, Y - 34 * s - ph);
      ctx.lineTo(X + 32 * s, Y - 16 * s - ph);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 2);
      break;
    }
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────── rotating heads
function drawHead(ctx: Ctx, def: TowerDef): void {
  const a = def.art;
  const t = def.tier;
  const s = TIER_SCALE[t];
  const cx = 64;
  const cy = 64;
  ctx.save();
  if (a.shape === 'mortar') {
    const len = (26 + t * 3) * s;
    const w = (16 + t * 2) * s;
    ctx.fillStyle = shade(a.secondary, -0.25);
    roundRect(ctx, cx - 6, cy - w / 2 - 2, len + 6, w + 4, 6);
    ctx.fill();
    outline(ctx, 2);
    const g = ctx.createLinearGradient(0, cy - w / 2, 0, cy + w / 2);
    g.addColorStop(0, shade(a.secondary, 0.3));
    g.addColorStop(1, shade(a.secondary, -0.35));
    ctx.fillStyle = g;
    roundRect(ctx, cx, cy - w / 2, len, w, 5);
    ctx.fill();
    outline(ctx, 2);
    ctx.fillStyle = '#10131a';
    ellipse(ctx, cx + len, cy, 4, w * 0.42);
    ctx.fill();
    sphere(ctx, cx, cy, 14 * s, shade(a.primary, -0.05));
  } else {
    const barrels = t >= 4 ? 3 : t >= 3 ? 2 : 1;
    const len = (24 + t * 6) * s;
    const bw = (7 + (t >= 4 ? 1 : 0)) * s;
    for (let i = 0; i < barrels; i++) {
      const off = (i - (barrels - 1) / 2) * bw * 1.25;
      ctx.fillStyle = shade(a.secondary, -0.15);
      roundRect(ctx, cx, cy + off - bw / 2, len, bw, 3);
      ctx.fill();
      outline(ctx, 1.6);
      ctx.fillStyle = shade(a.secondary, -0.45);
      ctx.fillRect(cx + len - 5, cy + off - bw / 2 - 1, 5, bw + 2);
    }
    const hw = (30 + t * 3) * s;
    const hh = (24 + t * 2) * s;
    const g = ctx.createLinearGradient(0, cy - hh / 2, 0, cy + hh / 2);
    g.addColorStop(0, shade(a.primary, 0.3));
    g.addColorStop(1, shade(a.primary, -0.3));
    ctx.fillStyle = g;
    roundRect(ctx, cx - hw / 2, cy - hh / 2, hw, hh, 7);
    ctx.fill();
    outline(ctx, 2);
    ctx.fillStyle = a.glow;
    ctx.beginPath();
    ctx.arc(cx + hw * 0.18, cy, 3.4 * s + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────── per-frame animation
/**
 * Animated overlay drawn every frame in world units (1 = one cell).
 * (x, y) is the footprint centre; `time` in seconds; `fire` = seconds since the last shot.
 */
export function drawTowerAnim(ctx: Ctx, def: TowerDef, x: number, y: number, time: number, fire: number, seed: number): void {
  const a = def.art;
  const m = towerMeta(def);
  const s = m.scale;
  const u = 1 / SP;
  const flash = Math.max(0, 1 - fire * 5);
  switch (a.shape) {
    case 'brazier': {
      const by = y - (36 * s) * u;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const ph = time * (7 + i) + seed + i * 1.7;
        const fx = x + Math.sin(ph) * 0.07 + (i - 1.5) * 0.12 * s;
        const fh = (0.42 + Math.sin(ph * 1.3) * 0.08 + flash * 0.25) * s * (i === 1 || i === 2 ? 1.2 : 0.8);
        flame(ctx, fx, by, 0.13 * s, fh, a.glow, a.secondary);
      }
      glow(ctx, x, by - 0.2, 0.9 * s, a.glow, 0.28 + flash * 0.3);
      ctx.restore();
      break;
    }
    case 'orb': {
      const oy = y - m.muzzle + Math.sin(time * 2 + seed) * 0.05;
      const r = (0.2 + def.tier * 0.025) * s;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, oy, r * 3.2, a.glow, 0.4 + flash * 0.4);
      ctx.restore();
      sphereFast(ctx, x, oy, r, a.secondary);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ellipse(ctx, x - r * 0.35, oy - r * 0.4, r * 0.25, r * 0.18);
      ctx.fill();
      if (def.tier >= 3) {
        ctx.strokeStyle = alpha(a.glow, 0.8);
        ctx.lineWidth = 0.035;
        ellipse(ctx, x, oy, r * 1.9, r * 0.6, Math.sin(time * 0.8 + seed) * 0.4);
        ctx.stroke();
        const ang = time * 2.4 + seed;
        const mx = x + Math.cos(ang) * r * 1.9;
        const my = oy + Math.sin(ang) * r * 0.6;
        sphereFast(ctx, mx, my, r * 0.22, a.glow);
      }
      break;
    }
    case 'coil': {
      const ty = y - m.muzzle;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, ty, 0.55 * s, a.glow, 0.35 + flash * 0.5);
      ctx.strokeStyle = alpha(a.glow, 0.9);
      ctx.lineWidth = 0.03;
      const n = 2 + (flash > 0 ? 3 : 0);
      for (let i = 0; i < n; i++) {
        const ang = Math.floor(time * 14 + i * 3 + seed) * 2.39;
        let px = x;
        let py = ty;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let k = 0; k < 3; k++) {
          px += Math.cos(ang + k) * 0.1;
          py += Math.sin(ang + k * 1.7) * 0.08;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
      sphereFast(ctx, x, ty, 0.12 * s, a.glow);
      break;
    }
    case 'pool': {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y - (10 * s) * u, 0.7 * s, a.glow, 0.22 + flash * 0.3);
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const ph = (time * 0.7 + i / 3 + seed * 0.1) % 1;
        const bx = x + Math.sin(i * 2.1 + seed) * 0.28 * s;
        const by = y - (10 * s) * u - ph * 0.35;
        ctx.fillStyle = alpha(shade(a.secondary, 0.4), 1 - ph);
        ctx.beginPath();
        ctx.arc(bx, by, 0.04 + 0.03 * (1 - ph), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'spire':
    case 'obelisk':
    case 'crystal':
    case 'shrine':
    case 'totem': {
      const ty = y - m.muzzle;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.18 + 0.08 * Math.sin(time * 2.2 + seed) + flash * 0.45;
      glow(ctx, x, ty, (0.5 + def.tier * 0.08) * s, a.glow, pulse);
      ctx.restore();
      if ((a.shape === 'spire' || a.shape === 'shrine') && def.tier >= 2) {
        const oy = ty - 0.12 + Math.sin(time * 1.8 + seed) * 0.04;
        sphereFast(ctx, x, oy, 0.09 * s + def.tier * 0.012, a.glow);
      }
      break;
    }
    case 'tree': {
      if (def.tier >= 3) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < def.tier; i++) {
          const ang = time * (0.6 + i * 0.13) + i * 2.1 + seed;
          const fx = x + Math.cos(ang) * 0.55;
          const fy = y - m.muzzle * 0.6 + Math.sin(ang * 1.3) * 0.35;
          glow(ctx, fx, fy, 0.12, a.glow, 0.7);
        }
        ctx.restore();
      }
      break;
    }
    case 'vault': {
      if (Math.sin(time * 1.3 + seed) > 0.96) {
        ctx.fillStyle = 'rgba(255,255,220,0.9)';
        star(ctx, x + 0.2 * s, y - m.muzzle * 0.7, 0.12, 0.03, 4);
        ctx.fill();
      }
      break;
    }
    case 'rock': {
      if (def.id === 'fire_4b') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, x, y - 1.0 * s, 0.7, a.glow, 0.35 + 0.15 * Math.sin(time * 3 + seed) + flash * 0.4);
        ctx.restore();
        for (let i = 0; i < 3; i++) {
          const ph = (time * 0.35 + i / 3) % 1;
          ctx.fillStyle = `rgba(60,55,60,${0.35 * (1 - ph)})`;
          ctx.beginPath();
          ctx.arc(x + Math.sin(ph * 6 + i) * 0.15, y - 1.05 * s - ph * 1.2, 0.12 + ph * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (def.tier >= 3) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, x, y - 0.4, 0.45, a.glow, 0.15 + flash * 0.4);
        ctx.restore();
      }
      break;
    }
  }
  if (def.tier === 5) {
    // Legend crown
    const cy = y - m.muzzle - 0.45 + Math.sin(time * 1.5 + seed) * 0.05;
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
      const px = x + Math.cos(ang) * 0.34;
      const py = cy + Math.sin(ang) * 0.1;
      ctx.fillStyle = '#fff1b0';
      ctx.beginPath();
      ctx.arc(px, py, 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
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
  // crop around the tower body
  const m = towerMeta(def);
  const topPx = GY - (m.muzzle + 0.55) * SP;
  const cropTop = Math.max(0, Math.min(topPx, GY - 150));
  const cropH = GY + 62 - cropTop;
  const cropW = cropH;
  const sx = GX - cropW / 2;
  ctx.drawImage(spr, sx, cropTop, cropW, cropH, 0, 0, size, size);
  // animated parts at rest, drawn in sprite pixels
  ctx.save();
  const k = size / cropW;
  ctx.scale(k * SP, k * SP);
  ctx.translate(-sx / SP, -cropTop / SP);
  const head = towerHead(def);
  if (head && m.head !== null) {
    ctx.drawImage(head, GX / SP - 1, GY / SP - m.head - 1, 2, 2);
  }
  drawTowerAnim(ctx, def, GX / SP, GY / SP, 0.4, 10, 1);
  ctx.restore();
  iconCache.set(key, canvas);
  return canvas;
}
