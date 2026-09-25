import { creepSprite, creepTop, FRAMES } from '../art/creeps';
import { drawGate, drawPortal, pillarSprite, PILLAR_SPRITE_GROUND, renderBottomRidge, renderLaneChunk } from '../art/terrain';
import { drawTowerAnim, GX, GY, TH, towerHead, towerMeta, towerSprite, TW } from '../art/towers';
import { alpha, ellipse, glow, SP, shade, type Ctx } from '../art/util';
import {
  GATE_MAX_Y,
  GATE_MIN_Y,
  LANE_GAP,
  LANE_H,
  LANE_MARGIN_X,
  LANE_W,
  laneOriginY,
  PILLAR_LINES,
  PLAYER_COLORS,
  WORLD_W,
  worldHeight,
} from '../../shared/constants';
import { CELL_RUBBLE } from '../../shared/grid';
import { CREEP_FLAG } from '../../shared/protocol';
import type { TowerDef } from '../../shared/types';
import { Fx, type Point } from './fx';
import { toWorld } from './layout';
import type { CCreep, ClientState, CTower } from './state';

export class Camera {
  x = WORLD_W / 2;
  y = 20;
  zoom = 36; // CSS px per cell
  w = 800;
  h = 600;
  minZoom = 12;
  maxZoom = 90;

  toScreen(wx: number, wy: number): Point {
    return { x: (wx - this.x) * this.zoom + this.w / 2, y: (wy - this.y) * this.zoom + this.h / 2 };
  }

  toWorld(sx: number, sy: number): Point {
    return { x: (sx - this.w / 2) / this.zoom + this.x, y: (sy - this.h / 2) / this.zoom + this.y };
  }

  clamp(worldH: number): void {
    const halfW = this.w / 2 / this.zoom;
    const halfH = this.h / 2 / this.zoom;
    const mx = Math.max(0, WORLD_W / 2 - halfW + 6);
    this.x = Math.min(WORLD_W / 2 + mx, Math.max(WORLD_W / 2 - mx, this.x));
    const my = Math.max(0, worldH / 2 - halfH + 6);
    this.y = Math.min(worldH / 2 + my, Math.max(worldH / 2 - my, this.y));
  }
}

export interface Ghost {
  def: TowerDef;
  lane: number;
  x: number;
  y: number;
  ok: boolean;
  reason: string;
  path: number[] | null;
  pathLen: number;
  baseLen: number;
}

export interface ViewState {
  selected: Set<number>;
  hover: number;
  ghost: Ghost | null;
  box: { x0: number; y0: number; x1: number; y1: number } | null;
  pings: { x: number; y: number; color: string; start: number }[];
  /** Pulsing highlights on lane cells (the tutorial's "build here"). */
  marks: { lane: number; x: number; y: number; w: number; h: number }[];
  showPath: boolean;
  showGrid: boolean;
}

interface Flake {
  x: number;
  y: number;
  s: number;
  v: number;
  p: number;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly cam = new Camera();
  private dpr = 1;
  private chunks = new Map<number, HTMLCanvasElement>();
  private chunkOrder: number[] = [];
  private bottomRidge: HTMLCanvasElement | null = null;
  private flakes: Flake[] = [];
  private lastW = 0;
  private lastH = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private state: ClientState,
    readonly fx: Fx,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  get worldH(): number {
    return worldHeight(this.state.laneOwners.length);
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === this.lastW && h === this.lastH) return;
    this.lastW = w;
    this.lastH = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.cam.w = w;
    this.cam.h = h;
    this.flakes = Array.from({ length: Math.round((w * h) / 12000) }, () => ({ x: Math.random() * w, y: Math.random() * h, s: 0.6 + Math.random() * 1.8, v: 14 + Math.random() * 26, p: Math.random() * 6.28 }));
  }

  /** Fit the whole width of a lane on screen. */
  focusLane(lane: number, instant = true): void {
    const target = laneOriginY(lane) + LANE_H / 2;
    this.cam.zoom = Math.max(this.cam.minZoom, Math.min(this.cam.maxZoom, Math.min(this.cam.w / (LANE_W + 5), (this.cam.h - 170) / (LANE_H + 3))));
    this.cam.x = LANE_MARGIN_X + LANE_W / 2;
    if (instant) this.cam.y = target + 1.2;
  }

  private chunk(lane: number): HTMLCanvasElement {
    let c = this.chunks.get(lane);
    if (c) {
      this.chunkOrder = this.chunkOrder.filter((l) => l !== lane);
      this.chunkOrder.push(lane);
      return c;
    }
    c = renderLaneChunk(lane);
    this.chunks.set(lane, c);
    this.chunkOrder.push(lane);
    while (this.chunkOrder.length > 5) this.chunks.delete(this.chunkOrder.shift()!);
    return c;
  }

  render(now: number, dt: number, view: ViewState): void {
    const { ctx, cam, state } = this;
    const nLanes = state.laneOwners.length;
    cam.clamp(this.worldH);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#1a2740';
    ctx.fillRect(0, 0, cam.w, cam.h);

    // world transform
    const z = cam.zoom * this.dpr;
    ctx.setTransform(z, 0, 0, z, this.dpr * (cam.w / 2 - cam.x * cam.zoom), this.dpr * (cam.h / 2 - cam.y * cam.zoom));
    const tl = cam.toWorld(0, 0);
    const br = cam.toWorld(cam.w, cam.h);
    const vis = { x0: tl.x - 3, y0: tl.y - 4, x1: br.x + 3, y1: br.y + 4 };

    // terrain
    ctx.imageSmoothingEnabled = true;
    for (let lane = 0; lane < nLanes; lane++) {
      const top = laneOriginY(lane) - LANE_GAP;
      const bottom = laneOriginY(lane) + LANE_H;
      if (bottom < vis.y0 || top > vis.y1) continue;
      ctx.drawImage(this.chunk(lane), 0, top, WORLD_W, LANE_GAP + LANE_H);
    }
    const lastBottom = laneOriginY(nLanes - 1) + LANE_H;
    if (lastBottom < vis.y1) {
      this.bottomRidge ??= renderBottomRidge();
      ctx.drawImage(this.bottomRidge, 0, lastBottom, WORLD_W, LANE_GAP);
    }

    // per-lane dressing: owner tint at the portal, rubble, path, grid
    for (let lane = 0; lane < nLanes; lane++) {
      const oy = laneOriginY(lane);
      if (oy + LANE_H < vis.y0 || oy > vis.y1) continue;
      const owner = state.player(state.laneOwners[lane]);
      const color = PLAYER_COLORS[owner?.color ?? 0].hex;
      const mine = lane === state.myLane && state.you >= 0;
      // rubble
      const g = state.grids[lane];
      for (let i = 0; i < g.cells.length; i++) {
        if (g.cells[i] !== CELL_RUBBLE) continue;
        const cx = LANE_MARGIN_X + (i % g.w);
        const cy = oy + Math.floor(i / g.w);
        ctx.fillStyle = 'rgba(70,64,60,0.85)';
        ctx.fillRect(cx + 0.08, cy + 0.12, 0.84, 0.76);
        ctx.fillStyle = 'rgba(150,140,130,0.9)';
        ctx.fillRect(cx + 0.2, cy + 0.2, 0.3, 0.25);
        ctx.fillRect(cx + 0.55, cy + 0.5, 0.28, 0.22);
      }
      if (mine && (view.showGrid || view.ghost)) this.drawGrid(lane, view.ghost ? 0.22 : 0.1);
      if (view.showPath && (mine || view.ghost?.lane === lane)) {
        const path = view.ghost?.lane === lane && view.ghost.path ? view.ghost.path : state.path(lane);
        const strong = view.ghost?.lane === lane || state.wave.phase === 'build' || state.wave.phase === 'setup';
        this.drawPath(lane, path, now, view.ghost?.lane === lane ? (view.ghost.ok ? '#8fe8ff' : '#ff7a8a') : color, (mine ? 0.9 : 0.5) * (strong ? 1 : 0.4));
      }
    }

    this.fx.drawGround(ctx, now);

    // ground entities, depth sorted
    const items: { k: number; draw: () => void }[] = [];
    for (let lane = 0; lane < nLanes; lane++) {
      const oy = laneOriginY(lane);
      if (oy + LANE_H + 3 < vis.y0 || oy - 3 > vis.y1) continue;
      for (const line of PILLAR_LINES) {
        for (const row of line.rows) {
          const px = LANE_MARGIN_X + line.x + 1;
          const py = oy + row + 1;
          items.push({ k: py + 0.95, draw: () => this.drawPillar(px, py) });
        }
      }
      // portal (left) & gate (right)
      const gy = oy + (GATE_MIN_Y + GATE_MAX_Y + 1) / 2;
      const owner = state.player(state.laneOwners[lane]);
      const pcolor = PLAYER_COLORS[owner?.color ?? 0].hex;
      items.push({ k: gy + 1.5, draw: () => drawPortal(ctx, LANE_MARGIN_X - 0.9, gy, now, pcolor) });
      items.push({ k: gy + 1.6, draw: () => drawGate(ctx, LANE_MARGIN_X + LANE_W + 0.9, gy, now) });
    }
    for (const t of state.towers.values()) {
      const p = toWorld(t.lane, t.x + 1, t.y + 1);
      if (p.x < vis.x0 || p.x > vis.x1 || p.y < vis.y0 || p.y > vis.y1 + 3) continue;
      items.push({ k: p.y + 0.95, draw: () => this.drawTower(t, p.x, p.y, now, view) });
    }
    const flyers: CCreep[] = [];
    for (const c of state.creeps.values()) {
      if (!state.isVisible(c)) continue;
      const p = toWorld(c.rlane, c.x, c.y);
      if (p.x < vis.x0 || p.x > vis.x1 || p.y < vis.y0 || p.y > vis.y1) continue;
      if (c.def.air) {
        flyers.push(c);
        this.drawShadow(p.x, p.y, c.def.size * 0.8);
        continue;
      }
      items.push({ k: p.y, draw: () => this.drawCreep(c, p.x, p.y, now) });
    }
    items.sort((a, b) => a.k - b.k);
    for (const it of items) it.draw();

    // beams (arcane) between towers and creeps
    for (const b of state.beams) {
      const t = state.towers.get(b.tower);
      const c = state.creeps.get(b.creep);
      if (!t || !c || !state.isVisible(c)) continue;
      const from = toWorld(t.lane, t.x + 1, t.y + 1);
      const m = towerMeta(t.tdef);
      const to = toWorld(c.rlane, c.x, c.y);
      this.drawBeam(from.x, from.y - m.muzzle, to.x, to.y - c.def.size * 1.1 - (c.def.air ? 0.55 : 0), t.tdef.art.glow, b.ramp, now);
    }

    for (const c of flyers) {
      const p = toWorld(c.rlane, c.x, c.y);
      this.drawCreep(c, p.x, p.y, now);
    }

    // ghost tower
    if (view.ghost) this.drawGhost(view.ghost, now, state.reachOf(view.ghost.def, state.you));

    this.fx.drawAir(ctx, now);

    // selection/ranges on top
    for (const id of view.selected) {
      const t = state.towers.get(id);
      if (!t) continue;
      const p = toWorld(t.lane, t.x + 1, t.y + 1);
      const r = state.reachOf(t.tdef, t.owner);
      if (r && view.selected.size <= 3) this.rangeCircle(p.x, p.y, r, '#8fe8ff', 0.9);
    }
    if (view.hover >= 0 && !view.selected.has(view.hover)) {
      const t = state.towers.get(view.hover);
      if (t) {
        const p = toWorld(t.lane, t.x + 1, t.y + 1);
        const r = state.reachOf(t.tdef, t.owner);
        if (r) this.rangeCircle(p.x, p.y, r, '#ffffff', 0.35);
      }
    }

    for (const m of view.marks) {
      const p = toWorld(m.lane, m.x, m.y);
      const pulse = 0.55 + 0.45 * Math.sin(now * 5);
      ctx.fillStyle = `rgba(255,196,60,${0.08 + 0.1 * pulse})`;
      ctx.fillRect(p.x, p.y, m.w, m.h);
      ctx.strokeStyle = `rgba(255,190,50,${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 0.08;
      ctx.setLineDash([0.22, 0.14]);
      ctx.strokeRect(p.x + 0.05, p.y + 0.05, m.w - 0.1, m.h - 0.1);
      ctx.setLineDash([]);
    }

    // ── screen space ──
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawLaneLabels(nLanes);
    this.drawHpBars(now);
    this.fx.drawTexts(ctx, now, (x, y) => cam.toScreen(x, y), cam.zoom);
    for (const p of view.pings) {
      const k = (now - p.start) / 2.5;
      if (k > 1) continue;
      const s = cam.toScreen(p.x, p.y);
      ctx.strokeStyle = alpha(p.color, 1 - k);
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const rr = ((k * 3 + i / 3) % 1) * 46;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - 7, s.y - 16);
      ctx.lineTo(s.x + 7, s.y - 16);
      ctx.fill();
    }
    if (view.box) {
      const { x0, y0, x1, y1 } = view.box;
      ctx.fillStyle = 'rgba(124,200,255,0.1)';
      ctx.strokeStyle = 'rgba(160,220,255,0.85)';
      ctx.lineWidth = 1.2;
      ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      ctx.strokeRect(Math.min(x0, x1) + 0.5, Math.min(y0, y1) + 0.5, Math.abs(x1 - x0), Math.abs(y1 - y0));
    }
    this.drawSnow(dt, now);
    this.drawVignette();
  }

  // ───────────────────────────────────────── pieces
  private drawGrid(lane: number, a: number): void {
    const { ctx } = this;
    const oy = laneOriginY(lane);
    ctx.strokeStyle = `rgba(210,235,255,${a})`;
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    for (let x = 3; x <= 41; x++) {
      ctx.moveTo(LANE_MARGIN_X + x, oy);
      ctx.lineTo(LANE_MARGIN_X + x, oy + LANE_H);
    }
    for (let y = 0; y <= LANE_H; y++) {
      ctx.moveTo(LANE_MARGIN_X + 3, oy + y);
      ctx.lineTo(LANE_MARGIN_X + 41, oy + y);
    }
    ctx.stroke();
  }

  private drawPath(lane: number, path: number[], now: number, color: string, a: number): void {
    if (path.length < 2) return;
    const { ctx } = this;
    const g = this.state.grids[lane];
    ctx.save();
    ctx.lineWidth = 0.14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([0.28, 0.42]);
    ctx.lineDashOffset = -now * 1.4;
    ctx.strokeStyle = alpha(color, 0.55 * a);
    ctx.beginPath();
    path.forEach((c, i) => {
      const p = toWorld(lane, (c % g.w) + 0.5, Math.floor(c / g.w) + 0.5);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  private drawShadow(x: number, y: number, r: number): void {
    this.ctx.fillStyle = 'rgba(16,28,52,0.32)';
    ellipse(this.ctx, x, y + 0.05, r, r * 0.38);
    this.ctx.fill();
  }

  private drawPillar(x: number, y: number): void {
    const s = pillarSprite();
    this.ctx.drawImage(s, x - PILLAR_SPRITE_GROUND.x / SP, y - PILLAR_SPRITE_GROUND.y / SP, s.width / SP, s.height / SP);
  }

  private drawTower(t: CTower, x: number, y: number, now: number, view: ViewState): void {
    const { ctx, state } = this;
    const def = t.tdef;
    const building = state.renderTime < t.buildUntil;
    const sel = view.selected.has(t.id);
    if (sel || view.hover === t.id) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = sel ? 'rgba(120,210,255,0.22)' : 'rgba(255,255,255,0.12)';
      ellipse(ctx, x, y + 0.1, 1.15, 0.85);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = sel ? '#8fe8ff' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 0.05;
      ellipse(ctx, x, y + 0.1, 1.12, 0.82);
      ctx.stroke();
    }
    const spr = towerSprite(def);
    const m = towerMeta(def);
    let lift = 0;
    const since = now - t.builtAt;
    if (since < 0.35) lift = (1 - since / 0.35) * 0.35;
    if (building) ctx.globalAlpha = 0.55;
    // recoil
    const fireAge = now - t.firedAt;
    const squash = fireAge < 0.12 ? 1 - (0.12 - fireAge) * 0.25 : 1;
    ctx.drawImage(spr, x - GX / SP, y - (GY / SP) * squash - lift, TW / SP, (TH / SP) * squash);
    const head = towerHead(def);
    if (head && m.head !== null) {
      ctx.save();
      ctx.translate(x, y - m.head - lift);
      ctx.rotate(t.angle);
      const kick = fireAge < 0.1 ? -0.08 * (1 - fireAge / 0.1) : 0;
      ctx.drawImage(head, -1 + kick, -1, 2, 2);
      ctx.restore();
    }
    if (!building) drawTowerAnim(ctx, def, x, y - lift, now, fireAge, t.id);
    ctx.globalAlpha = 1;
    if (building) {
      const k = Math.min(1, Math.max(0, (state.renderTime - t.buildStart) / Math.max(0.01, t.buildUntil - t.buildStart)));
      ctx.fillStyle = 'rgba(8,14,28,0.75)';
      ctx.fillRect(x - 0.8, y + 0.62, 1.6, 0.16);
      ctx.fillStyle = '#ffd35a';
      ctx.fillRect(x - 0.78, y + 0.64, 1.56 * k, 0.12);
      // scaffold
      ctx.strokeStyle = 'rgba(180,140,90,0.9)';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(x - 0.7, y + 0.4);
      ctx.lineTo(x - 0.7, y - 1.2);
      ctx.moveTo(x + 0.7, y + 0.4);
      ctx.lineTo(x + 0.7, y - 1.2);
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(x - 0.7, y + 0.2 - i * 0.55);
        ctx.lineTo(x + 0.7, y - 0.3 - i * 0.55);
      }
      ctx.stroke();
    }
    // growth levels (Wildgrove)
    if (def.growth && t.level > 0) {
      for (let i = 0; i < t.level; i++) {
        ctx.fillStyle = '#b8ff80';
        ctx.beginPath();
        ctx.arc(x - 0.5 + i * (1 / Math.max(1, def.growth.maxLevel - 1)), y + 0.78, 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // owner stripe for teammates' towers in shared view
    if (t.owner !== state.you) {
      const owner = state.player(t.owner);
      if (owner && t.lane !== state.player(t.owner)?.lane) {
        ctx.fillStyle = PLAYER_COLORS[owner.color].hex;
        ctx.fillRect(x - 0.9, y + 0.8, 0.3, 0.08);
      }
    }
  }

  private drawCreep(c: CCreep, x: number, y: number, now: number): void {
    const { ctx } = this;
    const spr = creepSprite(c.def);
    const f = spr.frames[Math.floor(c.walk * 1.6 + c.seed) % FRAMES];
    const s = spr.size / SP;
    const flags = c.flags;
    const stunned = (flags & CREEP_FLAG.stunned) !== 0;
    if (!c.def.air) this.drawShadow(x, y, c.def.size * 0.95);
    // leaked from another lane: warning halo
    if (c.leakedFrom >= 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y - c.def.size, c.def.size * 2.2, '#ff5f6d', 0.35 + 0.15 * Math.sin(now * 8));
      ctx.restore();
    }
    const lift = spr.lift + (c.def.air ? Math.sin(now * 2 + c.seed) * 0.06 : 0);
    const dx = x - spr.gx / SP;
    const dy = y - spr.gy / SP - lift;
    ctx.save();
    if (c.facing < 0) {
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-x, 0);
    }
    ctx.drawImage(f, dx, dy, s, s);
    if (this.state.renderTime - c.hitAt < 0.08) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45;
      ctx.drawImage(f, dx, dy, s, s);
    }
    ctx.restore();
    const r = c.def.size;
    const cy = y - r * 1.1 - lift;
    // status overlays
    if (stunned) {
      ctx.fillStyle = 'rgba(190,235,255,0.45)';
      ctx.strokeStyle = 'rgba(230,250,255,0.9)';
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.roundRect(x - r * 1.05, cy - r * 1.3, r * 2.1, r * 2.5, r * 0.3);
      ctx.fill();
      ctx.stroke();
    } else if (flags & CREEP_FLAG.slowed) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y - 0.05, r * 1.3, '#7cc8ff', 0.35);
      ctx.restore();
      if (Math.random() < 0.08 * this.fx.quality) this.fx.burst(x, y, '#cfefff', 1, { speed: 0.3, up: 0.8, size: 0.04, life: 0.5, z: r * 1.5 });
    }
    if (flags & CREEP_FLAG.rooted) {
      ctx.strokeStyle = '#5fbf4a';
      ctx.lineWidth = 0.06;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x - r + i * r, y + 0.05);
        ctx.quadraticCurveTo(x - r * 0.5 + i * r * 0.8, y - r * 0.8, x - r * 0.2 + i * r * 0.5, y - r * 0.4);
        ctx.stroke();
      }
    }
    if (flags & CREEP_FLAG.poisoned && Math.random() < 0.12 * this.fx.quality) {
      this.fx.burst(x + (Math.random() - 0.5) * r, y, '#9cff5a', 1, { speed: 0.2, up: 1.2, grav: -0.5, size: 0.05, life: 0.6, z: r * 1.2 });
    }
    if (flags & CREEP_FLAG.burning && Math.random() < 0.25 * this.fx.quality) {
      this.fx.burst(x + (Math.random() - 0.5) * r, y, '#ff9a3c', 1, { speed: 0.3, up: 1.6, grav: -1, size: 0.07, life: 0.45, z: r * 0.8 });
    }
    if (flags & CREEP_FLAG.cursed) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(185,140,255,${0.6 + 0.3 * Math.sin(now * 6)})`;
      ctx.lineWidth = 0.04;
      ellipse(ctx, x, y, r * 1.1, r * 0.42);
      ctx.stroke();
      ctx.restore();
    }
    if (flags & CREEP_FLAG.shielded) {
      ctx.strokeStyle = 'rgba(160,220,255,0.75)';
      ctx.fillStyle = 'rgba(160,220,255,0.12)';
      ctx.lineWidth = 0.035;
      ellipse(ctx, x, cy, r * 1.25, r * 1.4);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawBeam(x0: number, y0: number, x1: number, y1: number, color: string, ramp: number, now: number): void {
    const { ctx } = this;
    const w = 0.05 + ramp * 0.035;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [ww, a] of [
      [w * 4, 0.18],
      [w * 2, 0.35],
      [w, 0.95],
    ] as const) {
      ctx.strokeStyle = alpha(a > 0.5 ? shade(color, 0.6) : color, a);
      ctx.lineWidth = ww * (1 + 0.15 * Math.sin(now * 30));
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    glow(ctx, x1, y1, 0.3 + ramp * 0.08, color, 0.8);
    ctx.restore();
  }

  private drawGhost(g: Ghost, now: number, r: number | undefined): void {
    const { ctx } = this;
    const p = toWorld(g.lane, g.x + 1, g.y + 1);
    const col = g.ok ? '#62e3a0' : '#ff5f6d';
    ctx.fillStyle = alpha(col, 0.22);
    ctx.strokeStyle = alpha(col, 0.9);
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.roundRect(p.x - 1, p.y - 1, 2, 2, 0.2);
    ctx.fill();
    ctx.stroke();
    if (r) this.rangeCircle(p.x, p.y, r, g.ok ? '#8fe8ff' : '#ff9aa4', 0.7);
    ctx.globalAlpha = 0.6 + 0.1 * Math.sin(now * 5);
    ctx.drawImage(towerSprite(g.def), p.x - GX / SP, p.y - GY / SP, TW / SP, TH / SP);
    ctx.globalAlpha = 1;
  }

  private rangeCircle(x: number, y: number, r: number, color: string, a: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = alpha(color, 0.06 * a);
    ctx.strokeStyle = alpha(color, 0.55 * a);
    ctx.lineWidth = 0.05;
    ctx.setLineDash([0.3, 0.2]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawHpBars(now: number): void {
    const { ctx, cam, state } = this;
    const w = Math.max(18, Math.min(40, cam.zoom * 0.9));
    for (const c of state.creeps.values()) {
      if (!state.isVisible(c)) continue;
      const hurt = c.hp < c.maxHp;
      if (!hurt && !c.def.boss) continue;
      const p = toWorld(c.rlane, c.x, c.y);
      const top = p.y - creepTop(c.def) - 0.12;
      const s = cam.toScreen(p.x, top);
      if (s.x < -50 || s.y < -50 || s.x > cam.w + 50 || s.y > cam.h + 50) continue;
      const bw = c.def.boss ? w * 2.2 : w * (0.7 + c.def.size);
      const k = Math.max(0, Math.min(1, c.hp / c.maxHp));
      ctx.fillStyle = 'rgba(6,10,20,0.8)';
      ctx.fillRect(s.x - bw / 2 - 1, s.y - 1, bw + 2, c.def.boss ? 7 : 5);
      ctx.fillStyle = k > 0.5 ? '#62e38a' : k > 0.25 ? '#ffc94f' : '#ff5f6d';
      if (c.leakedFrom >= 0) ctx.fillStyle = '#ff8a4f';
      ctx.fillRect(s.x - bw / 2, s.y, bw * k, c.def.boss ? 5 : 3);
      void now;
    }
  }

  private drawLaneLabels(nLanes: number): void {
    const { ctx, cam, state } = this;
    ctx.save();
    ctx.textBaseline = 'middle';
    for (let lane = 0; lane < nLanes; lane++) {
      const owner = state.player(state.laneOwners[lane]);
      if (!owner) continue;
      const color = PLAYER_COLORS[owner.color];
      const p = cam.toScreen(LANE_MARGIN_X + 0.2, laneOriginY(lane) - 0.9);
      if (p.y < -20 || p.y > cam.h + 20) continue;
      const label = `${owner.name}${owner.id === state.you ? ' (you)' : ''}${owner.connected ? '' : ' — away'}`;
      ctx.font = '700 13px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(8,14,28,0.72)';
      ctx.beginPath();
      ctx.roundRect(p.x - 4, p.y - 11, tw + 34, 22, 7);
      ctx.fill();
      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.roundRect(p.x + 2, p.y - 5, 10, 10, 3);
      ctx.fill();
      ctx.fillStyle = '#eef5ff';
      ctx.fillText(label, p.x + 20, p.y + 0.5);
      // arrow to the next lane (leak rotation)
      if (nLanes > 1) {
        const q = cam.toScreen(LANE_MARGIN_X + LANE_W + 2.6, laneOriginY(lane) + LANE_H + LANE_GAP / 2);
        if (q.y > -20 && q.y < cam.h + 20) {
          const next = state.player(state.laneOwners[(lane + 1) % nLanes]);
          ctx.font = '600 11px Inter, system-ui, sans-serif';
          ctx.fillStyle = 'rgba(255,190,190,0.8)';
          ctx.textAlign = 'center';
          ctx.fillText(`leaks → ${next?.name ?? ''}`, q.x, q.y);
          ctx.textAlign = 'left';
        }
      }
    }
    ctx.restore();
  }

  private drawSnow(dt: number, now: number): void {
    const { ctx, cam } = this;
    ctx.fillStyle = 'rgba(240,248,255,0.8)';
    for (const f of this.flakes) {
      f.y += f.v * dt;
      f.x += (Math.sin(now * 0.7 + f.p) * 10 + 6) * dt;
      if (f.y > cam.h + 5) {
        f.y = -5;
        f.x = Math.random() * cam.w;
      }
      if (f.x > cam.w + 5) f.x = -5;
      ctx.globalAlpha = 0.25 + f.s * 0.15;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private vignette: CanvasGradient | null = null;
  private vignetteKey = '';
  private drawVignette(): void {
    const { ctx, cam } = this;
    const key = `${cam.w}x${cam.h}`;
    if (!this.vignette || this.vignetteKey !== key) {
      this.vignette = ctx.createRadialGradient(cam.w / 2, cam.h / 2, Math.min(cam.w, cam.h) * 0.45, cam.w / 2, cam.h / 2, Math.max(cam.w, cam.h) * 0.78);
      this.vignette.addColorStop(0, 'rgba(6,10,24,0)');
      this.vignette.addColorStop(1, 'rgba(6,10,24,0.5)');
      this.vignetteKey = key;
    }
    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, cam.w, cam.h);
  }

  // ───────────────────────────────────────── minimap
  drawMinimap(canvas: HTMLCanvasElement): void {
    const { state, cam } = this;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const worldH = this.worldH;
    const k = Math.min(W / WORLD_W, H / worldH);
    const ox = (W - WORLD_W * k) / 2;
    const oy = (H - worldH * k) / 2;
    ctx.fillStyle = '#18253d';
    ctx.fillRect(0, 0, W, H);
    for (let lane = 0; lane < state.laneOwners.length; lane++) {
      const y = oy + laneOriginY(lane) * k;
      const owner = state.player(state.laneOwners[lane]);
      ctx.fillStyle = lane === state.myLane && state.you >= 0 ? '#9fb8d6' : '#7f98b8';
      ctx.fillRect(ox + LANE_MARGIN_X * k, y, LANE_W * k, LANE_H * k);
      ctx.fillStyle = PLAYER_COLORS[owner?.color ?? 0].hex;
      ctx.fillRect(ox + (LANE_MARGIN_X - 1.5) * k, y + (GATE_MIN_Y - 1) * k, 1.2 * k, 8 * k);
    }
    for (const t of state.towers.values()) {
      const p = toWorld(t.lane, t.x, t.y);
      const owner = state.player(t.owner);
      ctx.fillStyle = shade(PLAYER_COLORS[owner?.color ?? 0].hex, -0.1);
      ctx.fillRect(ox + p.x * k, oy + p.y * k, 2 * k, 2 * k);
    }
    for (const c of state.creeps.values()) {
      if (!state.isVisible(c)) continue;
      const p = toWorld(c.rlane, c.x, c.y);
      ctx.fillStyle = c.def.boss ? '#ff3b4f' : c.leakedFrom >= 0 ? '#ff8a4f' : c.def.air ? '#5fe3c8' : '#ffe0e4';
      const s = c.def.boss ? 4 : 2.2;
      ctx.fillRect(ox + p.x * k - s / 2, oy + p.y * k - s / 2, s, s);
    }
    const tl = cam.toWorld(0, 0);
    const br = cam.toWorld(cam.w, cam.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ox + tl.x * k, oy + tl.y * k, (br.x - tl.x) * k, (br.y - tl.y) * k);
  }

  minimapToWorld(canvas: HTMLCanvasElement, mx: number, my: number): Point {
    const W = canvas.width;
    const H = canvas.height;
    const worldH = this.worldH;
    const k = Math.min(W / WORLD_W, H / worldH);
    const ox = (W - WORLD_W * k) / 2;
    const oy = (H - worldH * k) / 2;
    return { x: (mx - ox) / k, y: (my - oy) / k };
  }
}
