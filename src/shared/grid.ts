import {
  BUILD_MAX_X,
  BUILD_MIN_X,
  GATE_MAX_Y,
  GATE_MIN_Y,
  LANE_H,
  LANE_W,
  PILLAR_LINES,
  TOWER_SIZE,
} from './constants';

export const CELL_FREE = 0;
export const CELL_TOWER = 1;
export const CELL_RUBBLE = 2;
export const CELL_ROCK = 3;

const SQRT2 = Math.SQRT2;
// 8 neighbours: dx, dy, cost
const NB_DX = [1, 0, -1, 0, 1, 1, -1, -1];
const NB_DY = [0, 1, 0, -1, 1, -1, 1, -1];
const NB_COST = [1, 1, 1, 1, SQRT2, SQRT2, SQRT2, SQRT2];

export type PlaceResult = { ok: true } | { ok: false; reason: string };

/**
 * One lane's walkable grid plus a flow field (distance to the exit for every cell).
 * Creeps walk down the gradient of the flow field; towers are 2x2 blocks.
 */
export class LaneGrid {
  readonly w = LANE_W;
  readonly h = LANE_H;
  readonly cells = new Uint8Array(LANE_W * LANE_H);
  dist = new Float32Array(LANE_W * LANE_H);
  private scratch = new Float32Array(LANE_W * LANE_H);
  private heapIdx = new Int32Array(LANE_W * LANE_H * 8);
  private heapKey = new Float32Array(LANE_W * LANE_H * 8);
  readonly spawnCells: number[] = [];
  readonly exitCells: number[] = [];
  /** Incremented whenever the flow field changes. */
  version = 0;

  constructor() {
    for (let y = GATE_MIN_Y; y <= GATE_MAX_Y; y++) {
      this.spawnCells.push(this.idx(0, y));
      this.exitCells.push(this.idx(this.w - 1, y));
    }
    for (const line of PILLAR_LINES) for (const row of line.rows) this.setFootprint(line.x, row, CELL_ROCK);
    this.recompute();
  }

  idx(x: number, y: number): number {
    return y * this.w + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  walkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.cells[y * this.w + x] === CELL_FREE;
  }

  isExit(i: number): boolean {
    const x = i % this.w;
    const y = (i / this.w) | 0;
    return x === this.w - 1 && y >= GATE_MIN_Y && y <= GATE_MAX_Y;
  }

  /** Top-left corners that fit a tower inside the build zone. */
  static footprintInZone(x: number, y: number): boolean {
    return x >= BUILD_MIN_X && x + TOWER_SIZE - 1 <= BUILD_MAX_X && y >= 0 && y + TOWER_SIZE - 1 <= LANE_H - 1;
  }

  footprint(x: number, y: number): number[] {
    const out: number[] = [];
    for (let dy = 0; dy < TOWER_SIZE; dy++) for (let dx = 0; dx < TOWER_SIZE; dx++) out.push(this.idx(x + dx, y + dy));
    return out;
  }

  setFootprint(x: number, y: number, value: number): void {
    for (const i of this.footprint(x, y)) this.cells[i] = value;
  }

  recompute(): void {
    this.fillDistances(this.dist);
    this.version++;
  }

  /** Dijkstra from the exit cells with octile moves (no corner cutting). */
  private fillDistances(out: Float32Array): void {
    const { w, h, cells } = this;
    out.fill(Infinity);
    let size = 0;
    const hi = this.heapIdx;
    const hk = this.heapKey;
    const push = (i: number, k: number) => {
      let n = size++;
      while (n > 0) {
        const p = (n - 1) >> 1;
        if (hk[p] <= k) break;
        hi[n] = hi[p];
        hk[n] = hk[p];
        n = p;
      }
      hi[n] = i;
      hk[n] = k;
    };
    const pop = (): number => {
      const top = hi[0];
      const lastI = hi[--size];
      const lastK = hk[size];
      let n = 0;
      for (;;) {
        let c = 2 * n + 1;
        if (c >= size) break;
        if (c + 1 < size && hk[c + 1] < hk[c]) c++;
        if (hk[c] >= lastK) break;
        hi[n] = hi[c];
        hk[n] = hk[c];
        n = c;
      }
      hi[n] = lastI;
      hk[n] = lastK;
      return top;
    };
    for (const e of this.exitCells) {
      if (cells[e] !== CELL_FREE) continue;
      out[e] = 0;
      push(e, 0);
    }
    while (size > 0) {
      const topKey = hk[0];
      const i = pop();
      if (topKey > out[i]) continue;
      const x = i % w;
      const y = (i / w) | 0;
      for (let k = 0; k < 8; k++) {
        const nx = x + NB_DX[k];
        const ny = y + NB_DY[k];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (cells[ni] !== CELL_FREE) continue;
        if (k >= 4) {
          // diagonal: both orthogonal cells must be open
          if (cells[y * w + nx] !== CELL_FREE || cells[ny * w + x] !== CELL_FREE) continue;
        }
        const nd = out[i] + NB_COST[k];
        if (nd < out[ni]) {
          out[ni] = nd;
          push(ni, nd);
        }
      }
    }
  }

  /** Length of the shortest path from the spawn portal to the exit (Infinity when blocked). */
  pathLength(dist: Float32Array = this.dist): number {
    let best = Infinity;
    for (const s of this.spawnCells) best = Math.min(best, dist[s]);
    return best;
  }

  /**
   * Checks whether a tower can go at (x, y). `occupied` holds cells creeps are standing on or walking into;
   * building there is refused, and every one of them must still reach the exit afterwards.
   */
  canPlace(x: number, y: number, occupied: Iterable<number>): PlaceResult {
    if (!LaneGrid.footprintInZone(x, y)) return { ok: false, reason: 'Outside the build zone' };
    const fp = this.footprint(x, y);
    for (const i of fp) if (this.cells[i] !== CELL_FREE) return { ok: false, reason: 'Space is occupied' };
    const occ = occupied instanceof Set ? (occupied as Set<number>) : new Set(occupied);
    for (const i of fp) if (occ.has(i)) return { ok: false, reason: 'A creep is in the way' };
    for (const i of fp) this.cells[i] = CELL_TOWER;
    this.fillDistances(this.scratch);
    for (const i of fp) this.cells[i] = CELL_FREE;
    if (!Number.isFinite(this.pathLength(this.scratch))) return { ok: false, reason: 'That would block the path' };
    for (const i of occ) if (!Number.isFinite(this.scratch[i])) return { ok: false, reason: 'That would trap a creep' };
    return { ok: true };
  }

  /** Path length that would result from building at (x, y), without validating creeps. */
  previewPathLength(x: number, y: number): number {
    const fp = this.footprint(x, y);
    const saved = fp.map((i) => this.cells[i]);
    for (const i of fp) this.cells[i] = CELL_TOWER;
    this.fillDistances(this.scratch);
    fp.forEach((i, k) => (this.cells[i] = saved[k]));
    return this.pathLength(this.scratch);
  }

  /**
   * Next cell on a shortest path from cell `i`. `prefDir` (0..7) breaks ties in favour of going straight.
   * Returns -1 if the cell has no route (should not happen with the anti-block rules).
   */
  next(i: number, prefDir = -1): { cell: number; dir: number } {
    const { w, h, cells, dist } = this;
    const x = i % w;
    const y = (i / w) | 0;
    let best = -1;
    let bestDir = -1;
    let bestScore = Infinity;
    for (let k = 0; k < 8; k++) {
      const nx = x + NB_DX[k];
      const ny = y + NB_DY[k];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (cells[ni] !== CELL_FREE) continue;
      if (k >= 4 && (cells[y * w + nx] !== CELL_FREE || cells[ny * w + x] !== CELL_FREE)) continue;
      let score = dist[ni] + NB_COST[k];
      if (!Number.isFinite(score)) continue;
      if (k === prefDir) score -= 1e-3;
      if (score < bestScore - 1e-6) {
        bestScore = score;
        best = ni;
        bestDir = k;
      }
    }
    return { cell: best, dir: bestDir };
  }

  /** The full shortest path from a cell, as a list of cell indices (for path previews). */
  tracePath(from: number, maxLen = 4000): number[] {
    const out = [from];
    let cur = from;
    let dir = 0;
    for (let n = 0; n < maxLen && !this.isExit(cur); n++) {
      const step = this.next(cur, dir);
      if (step.cell < 0) break;
      cur = step.cell;
      dir = step.dir;
      out.push(cur);
    }
    return out;
  }
}

export const DIR_DX = NB_DX;
export const DIR_DY = NB_DY;
