// The campaign map: a painted winter country with the road north, drawn procedurally. The
// terrain is painted once per size; the road, stage medallions and snowfall every frame.
import { ENDLESS, ENDLESS_AFTER, STAGES, type Stage } from '../../shared/campaign';
import { Rng } from '../../shared/rng';
import { pine } from '../art/terrain';
import { alpha, type Ctx, ellipse, makeCanvas } from '../art/util';

export interface MapNode {
  stage: Stage;
  unlocked: boolean;
  stars: number;
  /** The stage the player should play next. */
  current: boolean;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  v: number;
  p: number;
}

const PAD = 0.06;

export class CampaignMap {
  private ctx: Ctx;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private terrain: HTMLCanvasElement | null = null;
  private flakes: Flake[] = [];
  private frame = 0;
  private ro: ResizeObserver;
  hover: string | null = null;
  selected: string | null = null;
  onSelect: (stage: Stage) => void = () => {};

  constructor(
    readonly canvas: HTMLCanvasElement,
    private nodes: () => MapNode[],
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    canvas.addEventListener('pointermove', (e) => {
      const id = this.hit(e.offsetX, e.offsetY);
      if (id !== this.hover) {
        this.hover = id;
        canvas.style.cursor = id ? 'pointer' : 'default';
      }
    });
    canvas.addEventListener('pointerleave', () => (this.hover = null));
    canvas.addEventListener('click', (e) => {
      const id = this.hit(e.offsetX, e.offsetY);
      const node = this.nodes().find((n) => n.stage.id === id);
      if (node) this.onSelect(node.stage);
    });
  }

  start(): void {
    if (this.frame) return;
    const loop = (t: number) => {
      this.draw(t / 1000);
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  destroy(): void {
    this.stop();
    this.ro.disconnect();
  }

  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.terrain = paintTerrain(this.w, this.h, this.dpr, (x, y) => this.pos(x, y));
    this.flakes = Array.from({ length: Math.round((this.w * this.h) / 7000) }, () => ({ x: Math.random() * this.w, y: Math.random() * this.h, r: Math.random() * 1.6 + 0.4, v: Math.random() * 14 + 8, p: Math.random() * 6.28 }));
  }

  private pos(fx: number, fy: number): { x: number; y: number } {
    return { x: (PAD + fx * (1 - 2 * PAD)) * this.w, y: (PAD + fy * (1 - 2 * PAD)) * this.h };
  }

  private radius(): number {
    return Math.max(13, Math.min(24, this.w / 52));
  }

  private hit(x: number, y: number): string | null {
    const r = this.radius() + 6;
    for (const n of this.nodes()) {
      const p = this.pos(n.stage.x, n.stage.y);
      if ((p.x - x) ** 2 + (p.y - y) ** 2 <= r * r) return n.stage.id;
    }
    return null;
  }

  private draw(t: number): void {
    const { ctx } = this;
    if (!this.terrain || !this.w) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.drawImage(this.terrain, 0, 0, this.w, this.h);
    const nodes = this.nodes();
    this.drawRoad(nodes, t);
    for (const n of nodes) this.drawNode(n, t);
    // snowfall
    ctx.fillStyle = 'rgba(235,244,255,0.75)';
    for (const f of this.flakes) {
      f.y += f.v / 60;
      f.x += Math.sin(t * 0.8 + f.p) * 0.25;
      if (f.y > this.h + 4) {
        f.y = -4;
        f.x = Math.random() * this.w;
      }
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(f.p + t);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** The road north through every stage, gilded as far as the player has come. */
  private drawRoad(nodes: MapNode[], t: number): void {
    const { ctx } = this;
    const pts = STAGES.map((s) => this.pos(s.x, s.y));
    const won = nodes.filter((n) => !n.stage.endless && n.stars >= 2).length;
    const path = (from: number, to: number) => {
      ctx.beginPath();
      ctx.moveTo(pts[from].x, pts[from].y);
      for (let i = from; i < to; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
      }
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    path(0, pts.length - 1);
    ctx.strokeStyle = 'rgba(6,10,20,0.55)';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#3a4a66';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.setLineDash([2, 9]);
    ctx.strokeStyle = 'rgba(190,210,240,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    if (won > 0) {
      path(0, Math.min(won, pts.length - 1));
      ctx.strokeStyle = 'rgba(255,211,90,0.22)';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -t * 18;
      ctx.strokeStyle = '#ffd35a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
    // a faint trail off the map's edge to the endless frontier
    const a = this.pos(STAGES.find((s) => s.id === ENDLESS_AFTER)!.x, STAGES.find((s) => s.id === ENDLESS_AFTER)!.y);
    const b = this.pos(ENDLESS.x, ENDLESS.y);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo((a.x + b.x) / 2 + 30, (a.y + b.y) / 2 + 10, b.x, b.y);
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = 'rgba(199,155,255,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawNode(n: MapNode, t: number): void {
    const { ctx } = this;
    const p = this.pos(n.stage.x, n.stage.y);
    const r = this.radius();
    const hover = this.hover === n.stage.id;
    const sel = this.selected === n.stage.id;
    const won = n.stars >= 2;
    const ring = n.stage.endless ? '#c79bff' : won ? '#ffd35a' : n.unlocked ? '#8fd4ff' : '#56627a';
    ctx.save();
    if (!n.unlocked) ctx.globalAlpha = 0.72;
    // beacon for the next stage
    if (n.current && n.unlocked) {
      const k = (t * 0.8) % 1;
      ctx.strokeStyle = alpha('#8fd4ff', 0.7 * (1 - k));
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 4 + k * 16, 0, Math.PI * 2);
      ctx.stroke();
    }
    // glow and shadow
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.4, p.x, p.y, r * 2.1);
    g.addColorStop(0, alpha(ring, sel || hover ? 0.5 : 0.28));
    g.addColorStop(1, alpha(ring, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ellipse(ctx, p.x + 2, p.y + r * 0.85, r * 0.95, r * 0.35);
    ctx.fill();
    // medallion
    const face = ctx.createLinearGradient(p.x, p.y - r, p.x, p.y + r);
    face.addColorStop(0, n.unlocked ? '#243556' : '#1b2233');
    face.addColorStop(1, n.unlocked ? '#0e1628' : '#10141f');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = sel ? 4 : 3;
    ctx.strokeStyle = ring;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = alpha('#ffffff', 0.25);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r - 4, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    // label inside
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (!n.unlocked) {
      drawLock(ctx, p.x, p.y, r * 0.42);
    } else {
      ctx.fillStyle = n.stage.endless ? '#e4d2ff' : won ? '#ffe7a1' : '#e8f1ff';
      ctx.font = `700 ${Math.round(r * (n.stage.endless ? 1.05 : 0.8))}px Cinzel, Georgia, serif`;
      ctx.fillText(n.stage.endless ? '∞' : String(STAGES.indexOf(n.stage) + 1), p.x, p.y + 1);
    }
    // stars
    if (!n.stage.endless) {
      const sr = Math.max(4, r * 0.28);
      for (let i = 0; i < 3; i++) drawStar(ctx, p.x + (i - 1) * sr * 2.3, p.y + r + sr * 1.1 + (i === 1 ? sr * 0.35 : 0), sr, i < n.stars);
    }
    // name
    ctx.font = `700 ${Math.max(11, Math.round(r * 0.58))}px Cinzel, Georgia, serif`;
    const ny = p.y + r + (n.stage.endless ? 14 : Math.max(4, r * 0.28) * 3.6 + 8);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(5,9,18,0.85)';
    ctx.strokeText(n.stage.name, p.x, ny);
    ctx.fillStyle = hover || sel ? '#ffffff' : n.unlocked ? '#d7e4f7' : '#8190a8';
    ctx.fillText(n.stage.name, p.x, ny);
    ctx.restore();
  }
}

function drawStar(ctx: Ctx, x: number, y: number, r: number, filled: boolean): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd35a' : 'rgba(20,28,44,0.9)';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = filled ? '#8a6414' : 'rgba(150,170,200,0.55)';
  ctx.stroke();
}

function drawLock(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.strokeStyle = '#8190a8';
  ctx.lineWidth = s * 0.28;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.25, s * 0.55, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#8190a8';
  ctx.fillRect(x - s * 0.8, y - s * 0.25, s * 1.6, s * 1.2);
  ctx.fillStyle = '#1b2233';
  ctx.fillRect(x - s * 0.12, y + s * 0.05, s * 0.24, s * 0.5);
}

// ─────────────────────────────────────────────────────────── terrain

type Pos = (fx: number, fy: number) => { x: number; y: number };

/** Paints the static map at this size: snowfields, mountains, forests, the frozen lake and landmarks. */
function paintTerrain(w: number, h: number, dpr: number, pos: Pos): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w * dpr, h * dpr);
  ctx.scale(dpr, dpr);
  const rng = new Rng(1717);
  const rnd = () => rng.next();
  const u = Math.min(w, h) / 600; // scale unit

  // ground
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#1c2842');
  bg.addColorStop(0.55, '#223252');
  bg.addColorStop(1, '#1a2640');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // snow drifts and soft light
  for (let i = 0; i < 260; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const rx = (20 + rnd() * 90) * u;
    ctx.fillStyle = rnd() < 0.7 ? `rgba(200,220,250,${0.025 + rnd() * 0.04})` : `rgba(8,14,28,${0.05 + rnd() * 0.06})`;
    ellipse(ctx, x, y, rx, rx * (0.3 + rnd() * 0.3), (rnd() - 0.5) * 0.6);
    ctx.fill();
  }

  // the frozen lake at Hollowmere
  const lake = pos(0.03, 0.95);
  const lg = ctx.createRadialGradient(lake.x, lake.y, 5, lake.x, lake.y, 120 * u);
  lg.addColorStop(0, 'rgba(170,215,245,0.55)');
  lg.addColorStop(1, 'rgba(120,170,215,0.28)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = (95 + Math.sin(a * 3) * 14 + Math.cos(a * 5) * 8) * u;
    ctx.lineTo(lake.x + Math.cos(a) * rr * 1.5, lake.y + Math.sin(a) * rr * 0.75);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(225,242,255,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(235,248,255,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    let x = lake.x + (rnd() - 0.3) * 110 * u;
    let y = lake.y + (rnd() - 0.6) * 50 * u;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (rnd() - 0.5) * 30 * u;
      y += (rnd() - 0.5) * 16 * u;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // a river from the northern peaks down to the lake
  const river = [pos(0.14, -0.1), pos(0.07, 0.1), pos(-0.02, 0.3), pos(0.0, 0.52), pos(-0.04, 0.7), pos(0.0, 0.9)];
  ctx.beginPath();
  ctx.moveTo(river[0].x, river[0].y);
  for (let i = 1; i < river.length - 1; i++) ctx.quadraticCurveTo(river[i].x, river[i].y, (river[i].x + river[i + 1].x) / 2, (river[i].y + river[i + 1].y) / 2);
  ctx.lineTo(river[river.length - 1].x, river[river.length - 1].y);
  ctx.strokeStyle = 'rgba(12,22,40,0.6)';
  ctx.lineWidth = 11 * u;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,200,240,0.55)';
  ctx.lineWidth = 6 * u;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,245,255,0.4)';
  ctx.lineWidth = 1.5 * u;
  ctx.stroke();

  // landmark tints
  const tint = (fx: number, fy: number, r: number, color: string) => {
    const p = pos(fx, fy);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * u);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r * u, p.y - r * u, r * 2 * u, r * 2 * u);
  };
  tint(0.42, 0.46, 110, 'rgba(90,150,120,0.22)'); // the fen
  tint(0.78, 0.64, 120, 'rgba(255,90,40,0.2)'); // the ashen gate
  tint(0.62, 0.54, 90, 'rgba(180,140,255,0.18)'); // glimmerdeep
  tint(0.86, 0.42, 90, 'rgba(120,255,200,0.1)'); // the barrow
  tint(0.97, 0.05, 150, 'rgba(160,220,255,0.25)'); // the throne
  tint(0.58, 0.95, 150, 'rgba(160,110,255,0.16)'); // the frontier

  // fen reeds and pools
  for (let i = 0; i < 26; i++) {
    const p = pos(0.42 + (rnd() - 0.5) * 0.16, 0.46 + (rnd() - 0.5) * 0.18);
    if (rnd() < 0.4) {
      ctx.fillStyle = 'rgba(80,130,120,0.35)';
      ellipse(ctx, p.x, p.y, (6 + rnd() * 10) * u, (3 + rnd() * 4) * u);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(150,180,140,0.55)';
      ctx.lineWidth = 1.2;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(p.x + k * 2, p.y);
        ctx.lineTo(p.x + k * 3.5, p.y - (6 + rnd() * 5) * u);
        ctx.stroke();
      }
    }
  }
  // glimmerdeep crystals
  for (let i = 0; i < 14; i++) {
    const p = pos(0.62 + (rnd() - 0.5) * 0.12, 0.54 + (rnd() - 0.5) * 0.14);
    const s = (4 + rnd() * 6) * u;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(200,170,255,0.8)' : 'rgba(150,220,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - s * 1.6);
    ctx.lineTo(p.x + s * 0.5, p.y);
    ctx.lineTo(p.x, p.y + s * 0.3);
    ctx.lineTo(p.x - s * 0.5, p.y);
    ctx.closePath();
    ctx.fill();
  }
  // barrow mounds
  for (let i = 0; i < 9; i++) {
    const p = pos(0.86 + (rnd() - 0.5) * 0.12, 0.42 + (rnd() - 0.5) * 0.12);
    const s = (8 + rnd() * 8) * u;
    ctx.fillStyle = '#2b3a52';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.55, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(225,238,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - s * 0.3, s * 0.6, s * 0.22, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,215,235,0.7)';
    ctx.fillRect(p.x - 1, p.y - s * 0.95, 2, s * 0.4);
  }
  // ember cracks at the ashen gate
  ctx.strokeStyle = 'rgba(255,120,60,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) {
    const p = pos(0.78 + (rnd() - 0.5) * 0.12, 0.64 + (rnd() - 0.5) * 0.12);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + (rnd() - 0.5) * 24 * u, p.y + (rnd() - 0.5) * 12 * u);
    ctx.lineTo(p.x + (rnd() - 0.5) * 30 * u, p.y + (rnd() - 0.5) * 14 * u);
    ctx.stroke();
  }

  // mountains: the northern range, the ridge east of the pass, scattered peaks
  const peaks: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < 30; i++) peaks.push({ ...pos(-0.05 + i * 0.04 + (rnd() - 0.5) * 0.03, -0.02 + rnd() * 0.08), s: 40 + rnd() * 40 });
  for (let i = 0; i < 8; i++) peaks.push({ ...pos(0.44 + (rnd() - 0.5) * 0.05, 0.68 + (i - 4) * 0.035), s: 26 + rnd() * 16 });
  for (let i = 0; i < 8; i++) peaks.push({ ...pos(0.57 + (rnd() - 0.5) * 0.05, 0.72 + (i - 4) * 0.035), s: 26 + rnd() * 16 });
  for (let i = 0; i < 10; i++) peaks.push({ ...pos(0.94 + (rnd() - 0.5) * 0.1, 0.55 + rnd() * 0.3), s: 26 + rnd() * 22 });
  for (let i = 0; i < 7; i++) peaks.push({ ...pos(0.5 + (rnd() - 0.5) * 0.12, 0.12 + rnd() * 0.12), s: 22 + rnd() * 18 });
  peaks.sort((a, b) => a.y - b.y);
  for (const pk of peaks) mountain(ctx, pk.x, pk.y, pk.s * u, rnd);

  // forests
  const forest = (fx: number, fy: number, spread: number, n: number) => {
    const trees: { x: number; y: number; s: number }[] = [];
    for (let i = 0; i < n; i++) trees.push({ ...pos(fx + (rnd() - 0.5) * spread, fy + (rnd() - 0.5) * spread * 0.7), s: (11 + rnd() * 8) * u });
    trees.sort((a, b) => a.y - b.y);
    for (const t of trees) pine(ctx, t.x, t.y, t.s * 1.6, rnd);
  };
  forest(0.24, 0.58, 0.14, 26);
  forest(0.1, 0.62, 0.08, 10);
  forest(0.33, 0.83, 0.12, 16);
  forest(0.2, 0.32, 0.08, 10);
  forest(0.36, 0.3, 0.08, 9);
  forest(0.7, 0.4, 0.09, 12);
  forest(0.66, 0.78, 0.1, 12);
  forest(0.82, 0.8, 0.08, 9);

  // the rimewall
  const w0 = pos(0.83, 0.1);
  const w1 = pos(0.99, 0.25);
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const x = w0.x + ((w1.x - w0.x) * i) / n;
    const y = w0.y + ((w1.y - w0.y) * i) / n;
    ctx.fillStyle = '#8fa6c6';
    ctx.fillRect(x - 5 * u, y - 10 * u, 10 * u, 12 * u);
    ctx.fillStyle = '#dfeaf8';
    ctx.fillRect(x - 5 * u, y - 12 * u, 10 * u, 3 * u);
    ctx.strokeStyle = 'rgba(10,16,30,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 5 * u, y - 10 * u, 10 * u, 12 * u);
  }
  // the throne of winter: a citadel of ice shards
  const th = pos(0.965, 0.06);
  for (const [dx, hh, ww] of [
    [-26, 44, 10],
    [26, 40, 10],
    [-12, 62, 12],
    [12, 58, 12],
    [0, 84, 14],
  ] as const) {
    const x = th.x + dx * u;
    const base = th.y + 8 * u;
    const g = ctx.createLinearGradient(x - ww * u, 0, x + ww * u, 0);
    g.addColorStop(0, '#e9f6ff');
    g.addColorStop(0.5, '#9fd0f2');
    g.addColorStop(1, '#4d7ba8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - ww * u, base);
    ctx.lineTo(x - ww * 0.3 * u, base - hh * u);
    ctx.lineTo(x, base - (hh + 10) * u);
    ctx.lineTo(x + ww * 0.3 * u, base - hh * u);
    ctx.lineTo(x + ww * u, base);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,20,40,0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // the unmapped frontier: hatching past the edge
  ctx.save();
  const fr = pos(0.58, 0.97);
  ctx.beginPath();
  ctx.ellipse(fr.x, fr.y + 30 * u, 190 * u, 70 * u, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(200,170,255,0.12)';
  ctx.lineWidth = 1;
  for (let x = fr.x - 260 * u; x < fr.x + 260 * u; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, fr.y - 60 * u);
    ctx.lineTo(x + 80 * u, fr.y + 110 * u);
    ctx.stroke();
  }
  ctx.restore();

  // compass rose
  compass(ctx, pos(0.94, 0.86).x, pos(0.94, 0.86).y, 34 * u);

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(3,6,14,0.7)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // frame
  ctx.strokeStyle = 'rgba(160,200,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(6.5, 6.5, w - 13, h - 13);
  ctx.strokeStyle = 'rgba(160,200,255,0.1)';
  ctx.strokeRect(11.5, 11.5, w - 23, h - 23);
  return c;
}

function mountain(ctx: Ctx, x: number, y: number, s: number, rnd: () => number): void {
  const w = s * (0.9 + rnd() * 0.5);
  const peak = x + (rnd() - 0.5) * w * 0.3;
  const top = y - s;
  ctx.fillStyle = 'rgba(4,8,18,0.35)';
  ellipse(ctx, x + w * 0.1, y + 2, w * 0.7, s * 0.12);
  ctx.fill();
  // lit and shaded faces
  ctx.fillStyle = '#4f6284';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.62, y);
  ctx.lineTo(peak, top);
  ctx.lineTo(peak + w * 0.05, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2c3a55';
  ctx.beginPath();
  ctx.moveTo(peak, top);
  ctx.lineTo(x + w * 0.62, y);
  ctx.lineTo(peak + w * 0.05, y);
  ctx.closePath();
  ctx.fill();
  // snow cap
  const cap = 0.38 + rnd() * 0.12;
  const cy = top + s * cap;
  ctx.fillStyle = '#e6f0fc';
  ctx.beginPath();
  ctx.moveTo(peak, top);
  ctx.lineTo(peak - w * 0.62 * cap, cy);
  ctx.lineTo(peak - w * 0.3 * cap, cy - s * 0.06);
  ctx.lineTo(peak - w * 0.08 * cap, cy + s * 0.04);
  ctx.lineTo(peak + w * 0.2 * cap, cy - s * 0.05);
  ctx.lineTo(peak + w * 0.62 * cap, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(120,150,190,0.55)';
  ctx.beginPath();
  ctx.moveTo(peak, top);
  ctx.lineTo(peak + w * 0.62 * cap, cy);
  ctx.lineTo(peak + w * 0.2 * cap, cy - s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(6,12,26,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.62, y);
  ctx.lineTo(peak, top);
  ctx.lineTo(x + w * 0.62, y);
  ctx.stroke();
}

function compass(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(200,220,255,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = i === 3 ? 'rgba(255,211,90,0.85)' : 'rgba(200,220,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.16, 0);
    ctx.lineTo(-r * 0.16, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,211,90,0.95)';
  ctx.font = `700 ${Math.round(r * 0.42)}px Cinzel, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -r * 1.12);
  ctx.restore();
}
