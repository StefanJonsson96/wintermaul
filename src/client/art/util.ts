// Colour and shape helpers for the procedural art.

export const SP = 64; // sprite pixels per world cell

export type Ctx = CanvasRenderingContext2D;

/** Parses '#rgb', '#rrggbb' and 'rgb(a)(…)' colours. */
export function hexToRgb(color: string): [number, number, number] {
  if (color.startsWith('rgb')) {
    const m = color.match(/-?[\d.]+/g) ?? ['0', '0', '0'];
    return [Number(m[0]), Number(m[1]), Number(m[2])];
  }
  let h = color.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgb(r: number, g: number, b: number, a = 1): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return a >= 1 ? `rgb(${c(r)},${c(g)},${c(b)})` : `rgba(${c(r)},${c(g)},${c(b)},${a})`;
}

/** Lighten (amt > 0) or darken (amt < 0) a hex colour. */
export function shade(hex: string, amt: number, a = 1): string {
  const [r, g, b] = hexToRgb(hex);
  if (amt >= 0) return rgb(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt, a);
  return rgb(r * (1 + amt), g * (1 + amt), b * (1 + amt), a);
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgb(r, g, b, a);
}

export function mix(h1: string, h2: string, k: number): string {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  return rgb(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d')!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return [c, ctx];
}

export const OUTLINE = 'rgba(8,14,28,0.72)';

export function outline(ctx: Ctx, w = 2.2): void {
  ctx.lineWidth = w;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(color: string): HTMLCanvasElement {
  let c = glowCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 128;
  const g2 = c.getContext('2d')!;
  const g = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, alpha(color, 1));
  g.addColorStop(0.45, alpha(color, 0.35));
  g.addColorStop(1, alpha(color, 0));
  g2.fillStyle = g;
  g2.fillRect(0, 0, 128, 128);
  glowCache.set(color, c);
  return c;
}

/** Soft radial light (cached sprite, cheap enough to call every frame). */
export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, strength = 0.55): void {
  if (strength <= 0 || r <= 0) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * Math.min(1, strength);
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
}

const sphereCache = new Map<string, HTMLCanvasElement>();
/** Cached shaded sphere for per-frame drawing. */
export function sphereFast(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  let c = sphereCache.get(color);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const s = c.getContext('2d')!;
    const g = s.createRadialGradient(32 - 11, 32 - 13, 3, 32, 32, 31);
    g.addColorStop(0, shade(color, 0.65));
    g.addColorStop(0.5, color);
    g.addColorStop(1, shade(color, -0.45));
    s.fillStyle = g;
    s.beginPath();
    s.arc(32, 32, 31, 0, Math.PI * 2);
    s.fill();
    sphereCache.set(color, c);
  }
  ctx.drawImage(c, x - r, y - r, r * 2, r * 2);
}

/** A shaded sphere with a specular highlight. */
export function sphere(ctx: Ctx, x: number, y: number, r: number, color: string, withOutline = true): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(color, 0.65));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.45));
  ctx.fillStyle = g;
  ellipse(ctx, x, y, r, r);
  ctx.fill();
  if (withOutline) outline(ctx, 2);
}

/** Vertical cylinder in 3/4 view: body + lit top ellipse. */
export function cylinder(ctx: Ctx, x: number, baseY: number, rx: number, h: number, color: string, top?: string): void {
  const ry = rx * 0.42;
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, shade(color, -0.45));
  g.addColorStop(0.35, shade(color, 0.12));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.55));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - rx, baseY - h);
  ctx.lineTo(x - rx, baseY);
  ctx.ellipse(x, baseY, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(x + rx, baseY - h);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);
  ctx.fillStyle = top ?? shade(color, 0.25);
  ellipse(ctx, x, baseY - h, rx, ry);
  ctx.fill();
  outline(ctx, 1.6);
}

/** Tapered 4-sided pillar seen from the front-left: two visible faces. */
export function taperedPrism(ctx: Ctx, x: number, baseY: number, wBottom: number, wTop: number, h: number, color: string, tip = 0): void {
  const bl = x - wBottom / 2;
  const br = x + wBottom / 2;
  const tl = x - wTop / 2;
  const tr = x + wTop / 2;
  const top = baseY - h;
  // left (lit) face
  ctx.fillStyle = shade(color, 0.14);
  ctx.beginPath();
  ctx.moveTo(bl, baseY);
  ctx.lineTo(x - wBottom * 0.05, baseY + wBottom * 0.12);
  ctx.lineTo(x - wTop * 0.05, top + wTop * 0.12);
  ctx.lineTo(tl, top);
  ctx.closePath();
  ctx.fill();
  // right (shadow) face
  ctx.fillStyle = shade(color, -0.32);
  ctx.beginPath();
  ctx.moveTo(x - wBottom * 0.05, baseY + wBottom * 0.12);
  ctx.lineTo(br, baseY);
  ctx.lineTo(tr, top);
  ctx.lineTo(x - wTop * 0.05, top + wTop * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bl, baseY);
  ctx.lineTo(x - wBottom * 0.05, baseY + wBottom * 0.12);
  ctx.lineTo(br, baseY);
  ctx.lineTo(tr, top);
  if (tip > 0) {
    ctx.lineTo(x - wTop * 0.05, top - tip);
  }
  ctx.lineTo(tl, top);
  ctx.closePath();
  outline(ctx, 2);
  if (tip > 0) {
    ctx.fillStyle = shade(color, 0.3);
    ctx.beginPath();
    ctx.moveTo(tl, top);
    ctx.lineTo(x - wTop * 0.05, top - tip);
    ctx.lineTo(x - wTop * 0.05, top + wTop * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(color, -0.1);
    ctx.beginPath();
    ctx.moveTo(x - wTop * 0.05, top + wTop * 0.12);
    ctx.lineTo(x - wTop * 0.05, top - tip);
    ctx.lineTo(tr, top);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tl, top);
    ctx.lineTo(x - wTop * 0.05, top - tip);
    ctx.lineTo(tr, top);
    outline(ctx, 1.8);
  }
}

/** A faceted crystal shard. */
export function crystal(ctx: Ctx, x: number, baseY: number, w: number, h: number, lean: number, light: string, dark: string): void {
  const topX = x + lean;
  const topY = baseY - h;
  const midY = baseY - h * 0.78;
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY);
  ctx.lineTo(x - w / 2 + lean * 0.8, midY);
  ctx.lineTo(topX, topY);
  ctx.lineTo(x + lean * 0.1, baseY + w * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x + lean * 0.1, baseY + w * 0.1);
  ctx.lineTo(topX, topY);
  ctx.lineTo(x + w / 2 + lean * 0.8, midY);
  ctx.lineTo(x + w / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY);
  ctx.lineTo(x - w / 2 + lean * 0.8, midY);
  ctx.lineTo(topX, topY);
  ctx.lineTo(x + w / 2 + lean * 0.8, midY);
  ctx.lineTo(x + w / 2, baseY);
  outline(ctx, 2);
  // edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 2, baseY - 2);
  ctx.lineTo(x - w / 2 + lean * 0.8 + 1.5, midY);
  ctx.lineTo(topX, topY + 2);
  ctx.stroke();
}

export function star(ctx: Ctx, x: number, y: number, r1: number, r2: number, n: number, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = rot + (i * Math.PI) / n;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Deterministic pseudo-random numbers for decoration. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise in [0,1]. */
export function valueNoise(seed: number): (x: number, y: number) => number {
  const perm = new Uint8Array(512);
  const rnd = seeded(seed);
  const p = Array.from({ length: 256 }, (_, i) => i).sort(() => rnd() - 0.5);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grid = (x: number, y: number) => perm[(perm[x & 255] + y) & 255] / 255;
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const a = grid(xi, yi);
    const b = grid(xi + 1, yi);
    const c = grid(xi, yi + 1);
    const d = grid(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

export function fbm(noise: (x: number, y: number) => number, x: number, y: number, oct = 4): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += noise(x * f, y * f) * amp;
    f *= 2.03;
    amp *= 0.5;
  }
  return v;
}
