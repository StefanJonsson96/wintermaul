import { DT, GATE_MAX_Y, GATE_MIN_Y, LANE_H, LANE_W } from '../constants';
import { FINAL_WAVE } from '../data/waves';
import { CELL_FREE, type LaneGrid } from '../grid';
import type { CreepDef } from '../types';
import type { Creep } from './entities';
import type { Game } from './game';

export interface SpawnEntry {
  at: number;
  lane: number;
  def: string;
  wave: number;
}

const HISTORY_LEN = 16;

/** The creeps: spawning, walking the maze, healing, leaking and dying. */
export class Horde {
  /** Creeps waiting to enter, soonest first. */
  spawnQueue: SpawnEntry[] = [];
  /** Creeps still alive per wave: a wave is over when its count reaches zero. */
  aliveByWave = new Map<number, number>();
  lastSpawnAt = 0;

  constructor(private readonly g: Game) {}

  updateSpawns(): void {
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.g.time) {
      const s = this.spawnQueue.shift()!;
      this.spawnCreep(this.g.creepDef(s.def), s.lane, s.wave);
      this.lastSpawnAt = this.g.time;
    }
  }

  private spawnCreep(def: CreepDef, lane: number, wave: number, at?: { x: number; y: number; cell: number; history: number[]; visits: number; leakedFrom: number }): Creep {
    // Extra health on hard difficulties phases in over the first waves, so the opening stays
    // tight but survivable; easier settings are easier from the start.
    const mul = this.g.hpMul > 1 ? 1 + (this.g.hpMul - 1) * Math.min(1, wave / 15) : this.g.hpMul;
    const hp = Math.round(def.hp * mul);
    const air = !!def.air;
    const grid = this.g.lanes[lane].grid;
    let x: number, y: number, cell: number;
    if (at) {
      ({ x, y, cell } = at);
    } else if (air) {
      x = 0.5;
      y = LANE_H / 2 + this.g.rng.range(-2.5, 2.5);
      cell = grid.idx(0, Math.floor(y));
    } else {
      const row = this.g.rng.int(GATE_MIN_Y, GATE_MAX_Y);
      x = 0.5;
      y = row + 0.5;
      cell = grid.idx(0, row);
    }
    const c: Creep = {
      id: this.g.newId(),
      def,
      lane,
      x,
      y,
      hp,
      maxHp: hp,
      shield: def.shield ? Math.round(hp * def.shield) : 0,
      air,
      wave,
      alive: true,
      cell,
      next: -1,
      dir: 0,
      history: at ? [...at.history] : [],
      slowPct: 0,
      slowUntil: 0,
      auraSlow: 0,
      stunUntil: 0,
      rootUntil: 0,
      dots: [],
      sunders: [],
      amplifyPct: 0,
      amplifyUntil: 0,
      auraAmplify: 0,
      visits: at?.visits ?? 1,
      leakedFrom: at?.leakedFrom ?? -1,
      progress: 0,
      lastOwner: -1,
      lastTower: -1,
      nextHeal: this.g.time + (def.heal?.every ?? 0),
      healedUntil: 0,
      incoming: 0,
    };
    if (!air) {
      const step = grid.next(cell, 0);
      c.next = step.cell;
      c.dir = step.dir;
    }
    this.g.creeps.set(c.id, c);
    this.aliveByWave.set(wave, (this.aliveByWave.get(wave) ?? 0) + 1);
    this.g.lanes[lane].creeps.push(c);
    this.g.emit({ e: 'spawn', t: this.g.time, creep: this.g.netCreep(c) });
    return c;
  }

  /** After the maze changes, creeps keep walking to their current next cell, then follow the new field. */
  repathCreeps(lane: number): void {
    const grid = this.g.lanes[lane].grid;
    for (const c of this.g.creeps.values()) {
      if (c.lane !== lane || c.air || !c.alive) continue;
      if (c.next < 0 || grid.cells[c.next] !== CELL_FREE) {
        const step = grid.next(c.cell, c.dir);
        c.next = step.cell;
        c.dir = step.dir;
      }
    }
  }

  private creepSpeed(c: Creep): number {
    if (this.g.time < c.stunUntil || this.g.time < c.rootUntil) return 0;
    let slow = Math.max(this.g.time < c.slowUntil ? c.slowPct : 0, c.auraSlow);
    slow = Math.min(slow, c.def.boss ? 0.5 : 0.75);
    const owner = this.g.player(this.g.lanes[c.lane].owner);
    return c.def.speed * (1 - slow) * (this.g.rules.speedMul ?? 1) * (1 - (owner?.mods.creepSlow ?? 0));
  }

  /** One tick for every creep: regeneration and healers, poison and burns, then a step along the maze. */
  updateCreeps(): void {
    for (const lane of this.g.lanes) {
      for (const c of lane.creeps) {
        if (!c.alive) continue;
        this.regenerate(c, lane.creeps);
        if (c.dots.length && !this.tickDots(c)) continue;
        this.move(c, lane.grid);
      }
    }
  }

  private regenerate(c: Creep, laneCreeps: Creep[]): void {
    const regen = (c.def.regen ?? 0) + (this.g.rules.regen ?? 0);
    if (regen && c.hp < c.maxHp) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * regen * DT);
    const heal = c.def.heal;
    if (!heal || this.g.time < c.nextHeal) return;
    c.nextHeal = this.g.time + heal.every;
    const r2 = heal.radius * heal.radius;
    let healed = false;
    for (const o of laneCreeps) {
      // healers mend others, not themselves, and heals don't stack: a creep is mended at
      // most once per heal cycle
      if (o === c || !o.alive || o.hp >= o.maxHp || this.g.time < o.healedUntil) continue;
      if (o.def.boss && !c.def.boss) continue; // bosses only take orders (and heals) from bosses
      const dx = o.x - c.x;
      const dy = o.y - c.y;
      if (dx * dx + dy * dy <= r2) {
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * heal.pct);
        o.healedUntil = this.g.time + heal.every - 0.01;
        healed = true;
      }
    }
    if (healed) this.g.emit({ e: 'heal', t: this.g.time, id: c.id });
  }

  /** Poison and burns. Returns false when they killed the creep. */
  private tickDots(c: Creep): boolean {
    for (let i = c.dots.length - 1; i >= 0; i--) {
      const d = c.dots[i];
      if (this.g.time >= d.until) {
        c.dots.splice(i, 1);
        continue;
      }
      this.g.combat.trueDamage(c, d.dps * d.stacks * DT, d.owner, d.tower);
      if (!c.alive) break;
    }
    return c.alive;
  }

  private move(c: Creep, grid: LaneGrid): void {
    let step = this.creepSpeed(c) * DT;
    c.auraSlow = 0;
    c.auraAmplify = 0;
    if (c.air) {
      const ex = LANE_W - 0.5;
      c.x = Math.min(ex, c.x + step);
      // drift gently back to the centre line
      c.y += (LANE_H / 2 - c.y) * 0.2 * DT;
      c.progress = ex - c.x;
      if (c.x >= ex - 1e-3) this.leak(c);
      return;
    }
    let guard = 0;
    while (step > 1e-6 && guard++ < 8) {
      if (c.next < 0) {
        const s = grid.next(c.cell, c.dir);
        c.next = s.cell;
        c.dir = s.dir;
        if (c.next < 0) break;
      }
      const tx = (c.next % grid.w) + 0.5;
      const ty = Math.floor(c.next / grid.w) + 0.5;
      const dx = tx - c.x;
      const dy = ty - c.y;
      const d = Math.hypot(dx, dy);
      if (d <= step) {
        c.x = tx;
        c.y = ty;
        step -= d;
        c.history.push(c.cell);
        if (c.history.length > HISTORY_LEN) c.history.shift();
        c.cell = c.next;
        if (grid.isExit(c.cell)) {
          this.leak(c);
          break;
        }
        const s = grid.next(c.cell, c.dir);
        c.next = s.cell;
        c.dir = s.dir;
      } else {
        c.x += (dx / d) * step;
        c.y += (dy / d) * step;
        step = 0;
      }
    }
    if (c.alive) {
      const nd = c.next >= 0 ? grid.dist[c.next] : grid.dist[c.cell];
      const tx = c.next >= 0 ? (c.next % grid.w) + 0.5 : c.x;
      const ty = c.next >= 0 ? Math.floor(c.next / grid.w) + 0.5 : c.y;
      c.progress = nd + Math.hypot(tx - c.x, ty - c.y);
    }
  }

  private leak(c: Creep): void {
    const from = c.lane;
    const owner = this.g.player(this.g.lanes[from].owner);
    const cost = c.def.boss ? Math.max(1, c.def.leak - (owner?.mods.bossLeak ?? 0)) : c.def.leak;
    this.g.lives -= cost;
    if (owner) owner.leaks++;
    // A leaked creep gets exactly one more run: through the next player's maze (or yours again, solo).
    const maxVisits = 2;
    const escaped = c.visits >= maxVisits;
    const to = (from + 1) % this.g.lanes.length;
    this.g.emit({ e: 'leak', t: this.g.time, id: c.id, from, to, cost, escaped, x: c.x, y: c.y });
    if (escaped) {
      this.removeCreep(c);
      // the Winter Tyrant getting away ends the game, whatever the lives
      if (c.def.boss && c.wave === FINAL_WAVE) {
        this.g.lives = Math.min(this.g.lives, 0);
        this.g.tyrantEscaped = true;
      }
      return;
    }
    // Teleport into the next player's lane, keeping its current health.
    const grid = this.g.lanes[to].grid;
    c.lane = to;
    c.visits++;
    c.leakedFrom = from;
    c.history = [];
    c.slowUntil = c.stunUntil = c.rootUntil = 0;
    c.sunders = [];
    c.amplifyUntil = 0;
    if (c.air) {
      c.x = 0.5;
      c.y = LANE_H / 2 + this.g.rng.range(-2.5, 2.5);
      c.cell = grid.idx(0, Math.floor(c.y));
    } else {
      const row = this.g.rng.int(GATE_MIN_Y, GATE_MAX_Y);
      c.x = 0.5;
      c.y = row + 0.5;
      c.cell = grid.idx(0, row);
      const s = grid.next(c.cell, 0);
      c.next = s.cell;
      c.dir = s.dir;
    }
  }

  removeCreep(c: Creep): void {
    if (!c.alive) return;
    c.alive = false;
    this.g.creeps.delete(c.id);
    this.aliveByWave.set(c.wave, (this.aliveByWave.get(c.wave) ?? 1) - 1);
  }

  killCreep(c: Creep, owner: number, towerId: number, exec = false): void {
    if (!c.alive) return;
    const p = this.g.player(owner);
    let gold = 0;
    if (p) {
      gold = Math.round(c.def.bounty * p.goldMul);
      const t = this.g.towers.get(towerId);
      const e = t?.def.econ;
      if (e?.killGold && this.g.rng.chance(e.killGoldChance ?? 1)) gold += e.killGold;
      p.gold += gold;
      p.goldEarned += gold;
      p.kills++;
      if (t) t.kills++;
    }
    this.g.emit({ e: 'die', t: this.g.time, id: c.id, by: owner, gold, exec: exec || undefined });
    // plague spreads
    const spread = c.dots.length ? this.spreadRadius(c) : 0;
    if (spread > 0) {
      const r2 = spread * spread;
      for (const o of this.g.lanes[c.lane].creeps) {
        if (o === c || !o.alive) continue;
        const dx = o.x - c.x;
        const dy = o.y - c.y;
        if (dx * dx + dy * dy > r2) continue;
        for (const d of c.dots) if (d.kind === 'poison') this.g.combat.addDot(o, { ...d, until: this.g.time + 4 });
      }
    }
    this.removeCreep(c);
    if (c.def.split) {
      const child = this.g.creepDef(c.def.split.into);
      for (let i = 0; i < c.def.split.count; i++) {
        const n = this.spawnCreep(child, c.lane, c.wave, {
          x: c.x + (i === 0 ? -0.15 : 0.15),
          y: c.y,
          cell: c.cell,
          history: c.history,
          visits: c.visits,
          leakedFrom: c.leakedFrom,
        });
        n.next = c.next;
        n.dir = c.dir;
      }
      this.g.emit({ e: 'split', t: this.g.time, id: c.id });
    }
  }

  private spreadRadius(c: Creep): number {
    let r = 0;
    for (const d of c.dots) {
      const t = this.g.towers.get(d.tower);
      const s = t?.def.attack?.onHit?.spreadOnDeath;
      if (s) r = Math.max(r, s);
      if (d.kind === 'poison') r = Math.max(r, this.g.player(d.owner)?.mods.spread ?? 0);
    }
    return r;
  }

  /** Drags a creep back along the way it came (never into towers or sealed pockets). */
  pushBack(c: Creep, cells: number): void {
    if (c.air) {
      c.x = Math.max(0.5, c.x - cells);
      return;
    }
    const grid = this.g.lanes[c.lane].grid;
    let steps = Math.round(cells);
    let target = c.cell;
    while (steps-- > 0 && c.history.length) {
      const prev = c.history.pop()!;
      if (grid.cells[prev] !== CELL_FREE || !Number.isFinite(grid.dist[prev])) {
        c.history.length = 0;
        break;
      }
      target = prev;
    }
    if (target === c.cell) return;
    c.cell = target;
    c.x = (target % grid.w) + 0.5;
    c.y = Math.floor(target / grid.w) + 0.5;
    const s = grid.next(c.cell, c.dir);
    c.next = s.cell;
    c.dir = s.dir;
  }
}
