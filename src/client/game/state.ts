import { CREEPS } from '../../shared/data/waves';
import { TOWERS } from '../../shared/data/races';
import { CELL_FREE, CELL_RUBBLE, CELL_TOWER, LaneGrid } from '../../shared/grid';
import {
  type FullState,
  type GameEvent,
  type GameSettings,
  type NetPlayer,
  type NetTower,
  PHASES,
  SNAP_CREEP_STRIDE,
  type Snapshot,
  type WaveState,
} from '../../shared/protocol';
import type { CreepDef, TowerDef } from '../../shared/types';

export interface CTower extends NetTower {
  tdef: TowerDef;
  angle: number; // turret facing (radians)
  targetAngle: number;
  firedAt: number; // local time of last shot (for recoil/flash)
  pulsedAt: number;
  builtAt: number; // local time the build/upgrade visual started
}

interface Sample {
  t: number;
  lane: number;
  x: number;
  y: number;
}

export interface CCreep {
  id: number;
  def: CreepDef;
  lane: number;
  wave: number;
  hp: number;
  maxHp: number;
  flags: number;
  leakedFrom: number;
  samples: Sample[];
  visibleFrom: number;
  deadAt: number;
  // interpolated render state (lane-local)
  x: number;
  y: number;
  rlane: number;
  facing: number;
  walk: number;
  lastX: number;
  hitAt: number;
  seed: number;
}

const INTERP_DELAY = 0.16;

const TIMELINE_EVENTS = new Set(['spawn', 'die', 'leak', 'shot', 'chain', 'line', 'impact', 'pulse', 'crit', 'fire', 'heal', 'split', 'level']);

export class ClientState {
  you: number;
  settings: GameSettings;
  players: NetPlayer[];
  laneOwners: number[];
  wave: WaveState;
  towers = new Map<number, CTower>();
  creeps = new Map<number, CCreep>();
  grids: LaneGrid[];
  beams: { tower: number; creep: number; ramp: number }[] = [];
  private endless = new Map<string, CreepDef>();
  private timeline: GameEvent[] = [];
  private offset: number | null = null;
  lastServerTime = 0;
  renderTime = 0;
  /** Receives every event: immediately for state events, at render time for visual ones. */
  onEvent: (ev: GameEvent, late: boolean) => void = () => {};
  onSold: (t: CTower, refund: number, rubble: boolean) => void = () => {};
  private pathCache = new Map<number, { version: number; path: number[] }>();

  constructor(full: FullState, you: number) {
    this.you = you;
    this.settings = full.settings;
    this.players = full.players;
    this.laneOwners = full.laneOwners;
    this.wave = full.wave;
    this.grids = full.laneOwners.map(() => new LaneGrid());
    for (const d of full.endlessDefs) this.endless.set(d.id, d);
    for (const t of full.towers) this.addTower(t, -10);
    for (const r of full.rubble) {
      for (const c of r.cells) this.grids[r.lane].cells[c] = CELL_RUBBLE;
    }
    for (const g of this.grids) g.recompute();
    for (const c of full.creeps) {
      const def = this.creepDef(c.def);
      if (!def) continue;
      this.creeps.set(c.id, this.makeCreep(c.id, def, c.lane, c.wave, c.hp, c.maxHp, c.leakedFrom, full.time - 1, c.x, c.y));
    }
    this.lastServerTime = full.time;
    this.renderTime = full.time - INTERP_DELAY;
  }

  get me(): NetPlayer | undefined {
    return this.players.find((p) => p.id === this.you);
  }

  get myLane(): number {
    return this.me?.lane ?? 0;
  }

  player(id: number): NetPlayer | undefined {
    return this.players.find((p) => p.id === id);
  }

  creepDef(id: string): CreepDef | undefined {
    return CREEPS[id] ?? this.endless.get(id);
  }

  private makeCreep(id: number, def: CreepDef, lane: number, wave: number, hp: number, maxHp: number, leakedFrom: number, t: number, x: number, y: number): CCreep {
    return {
      id,
      def,
      lane,
      wave,
      hp,
      maxHp,
      flags: 0,
      leakedFrom,
      samples: [{ t, lane, x, y }],
      visibleFrom: t,
      deadAt: Infinity,
      x,
      y,
      rlane: lane,
      facing: 1,
      walk: Math.random() * 10,
      lastX: x,
      hitAt: -10,
      seed: (id * 2654435761) % 1000,
    };
  }

  private addTower(t: NetTower, builtAt: number): void {
    const tdef = TOWERS[t.def];
    this.towers.set(t.id, { ...t, tdef, angle: -Math.PI / 2 + (t.id % 7) * 0.3, targetAngle: 0, firedAt: -10, pulsedAt: -10, builtAt });
    this.grids[t.lane]?.setFootprint(t.x, t.y, CELL_TOWER);
  }

  /** Shortest path in a lane (cell indices), cached per grid version. */
  path(lane: number): number[] {
    const g = this.grids[lane];
    const c = this.pathCache.get(lane);
    if (c && c.version === g.version) return c.path;
    const path = g.tracePath(g.spawnCells[Math.floor(g.spawnCells.length / 2)]);
    this.pathCache.set(lane, { version: g.version, path });
    return path;
  }

  // ───────────────────────────────────────── network input
  applySnapshot(s: Snapshot, localNow: number): void {
    const now = localNow / 1000;
    const est = s.t - now;
    if (this.offset === null || Math.abs(est - this.offset) > 2) this.offset = est;
    else if (est > this.offset) this.offset += (est - this.offset) * 0.15;
    else this.offset -= 0.0015;
    this.lastServerTime = s.t;

    // events first (spawns must exist before their samples)
    for (const ev of s.ev) this.receiveEvent(ev);

    const c = s.c;
    for (let i = 0; i < c.length; i += SNAP_CREEP_STRIDE) {
      const cr = this.creeps.get(c[i]);
      if (!cr) continue;
      cr.samples.push({ t: s.t, lane: c[i + 1], x: c[i + 2] / 100, y: c[i + 3] / 100 });
      if (cr.samples.length > 12) cr.samples.shift();
      if (c[i + 4] < cr.hp) cr.hitAt = s.t;
      cr.hp = c[i + 4];
      cr.flags = c[i + 5];
      cr.lane = c[i + 1];
    }
    const p = s.p;
    this.players.forEach((pl, i) => {
      pl.gold = p[i * 6];
      pl.lumber = p[i * 6 + 1];
      pl.kills = p[i * 6 + 2];
      pl.leaks = p[i * 6 + 3];
      pl.ready = p[i * 6 + 4] === 1;
      pl.connected = p[i * 6 + 5] === 1;
    });
    const [n, phase, cd, lives] = s.w;
    const prevLives = this.wave.lives;
    this.wave = { ...this.wave, n, phase: PHASES[phase], countdown: cd / 10, lives };
    if (lives < prevLives) this.onEvent({ e: 'bonus', t: s.t, p: -2, gold: lives - prevLives, reason: 'lives' }, false);
    this.beams.length = 0;
    for (let i = 0; i < s.b.length; i += 3) this.beams.push({ tower: s.b[i], creep: s.b[i + 1], ramp: s.b[i + 2] / 100 });
  }

  private receiveEvent(ev: GameEvent): void {
    switch (ev.e) {
      case 'spawn': {
        const def = this.creepDef(ev.creep.def);
        if (!def) break;
        const c = ev.creep;
        const cr = this.makeCreep(c.id, def, c.lane, c.wave, c.hp, c.maxHp, c.leakedFrom, ev.t, c.x, c.y);
        this.creeps.set(c.id, cr);
        break;
      }
      case 'die': {
        const cr = this.creeps.get(ev.id);
        if (cr) cr.deadAt = ev.t;
        break;
      }
      case 'leak': {
        const cr = this.creeps.get(ev.id);
        if (cr && ev.escaped) cr.deadAt = ev.t;
        if (cr && !ev.escaped) cr.leakedFrom = ev.from;
        break;
      }
      case 'build':
        this.addTower(ev.tower, performance.now() / 1000);
        this.grids[ev.tower.lane].recompute();
        break;
      case 'upgrade': {
        const t = this.towers.get(ev.id);
        if (t) {
          t.def = ev.def;
          t.tdef = TOWERS[ev.def];
          t.buildStart = ev.buildStart;
          t.buildUntil = ev.buildUntil;
          t.invested = ev.invested;
          t.builtAt = performance.now() / 1000;
        }
        break;
      }
      case 'sell': {
        const t = this.towers.get(ev.id);
        if (t) {
          this.towers.delete(ev.id);
          this.grids[t.lane].setFootprint(t.x, t.y, ev.rubble ? CELL_RUBBLE : CELL_FREE);
          this.grids[t.lane].recompute();
          this.onSold(t, ev.refund, ev.rubble);
        }
        break;
      }
      case 'rubble': {
        const g = this.grids[ev.lane];
        for (const c of ev.cells) if (g.cells[c] === CELL_RUBBLE) g.cells[c] = CELL_FREE;
        g.recompute();
        break;
      }
      case 'mode':
        for (const id of ev.ids) {
          const t = this.towers.get(id);
          if (t) t.mode = ev.mode;
        }
        break;
      case 'race': {
        const p = this.player(ev.p);
        if (p && !p.races.includes(ev.race)) p.races.push(ev.race);
        break;
      }
      case 'wave':
        this.wave = { ...this.wave, n: ev.n, phase: ev.phase };
        break;
      case 'setup':
        this.settings = ev.settings;
        this.wave = { ...this.wave, lives: ev.lives, maxLives: ev.done ? ev.lives : this.wave.maxLives, finalWave: ev.settings.endless ? 0 : 40 };
        if (ev.done) this.wave.maxLives = ev.lives;
        break;
      case 'endless':
        this.endless.set(ev.def.id, ev.def);
        break;
      case 'level': {
        const t = this.towers.get(ev.tw);
        if (t) t.level = ev.level;
        break;
      }
    }
    if (TIMELINE_EVENTS.has(ev.e)) this.timeline.push(ev);
    else this.onEvent(ev, false);
  }

  // ───────────────────────────────────────── per frame
  update(localNow: number, dt: number): void {
    if (this.offset === null) return;
    const target = localNow / 1000 + this.offset - INTERP_DELAY;
    // never run ahead of the data we have, never jump backwards
    this.renderTime = Math.max(this.renderTime, Math.min(target, this.lastServerTime + 0.25));

    if (this.timeline.length) {
      let i = 0;
      for (; i < this.timeline.length; i++) {
        const ev = this.timeline[i];
        if (ev.t > this.renderTime) break;
        this.onEvent(ev, true);
      }
      if (i > 0) this.timeline.splice(0, i);
    }

    const rt = this.renderTime;
    for (const [id, c] of this.creeps) {
      if (rt >= c.deadAt) {
        this.creeps.delete(id);
        continue;
      }
      const s = c.samples;
      let a = s[0];
      let b: Sample | undefined;
      for (let i = s.length - 1; i >= 0; i--) {
        if (s[i].t <= rt) {
          a = s[i];
          b = s[i + 1];
          break;
        }
      }
      let x = a.x;
      let y = a.y;
      let lane = a.lane;
      if (b && b.lane === a.lane && b.t > a.t) {
        const k = Math.min(1, (rt - a.t) / (b.t - a.t));
        x = a.x + (b.x - a.x) * k;
        y = a.y + (b.y - a.y) * k;
      } else if (!b && s.length >= 2) {
        const p = s[s.length - 2];
        const q = s[s.length - 1];
        if (p.lane === q.lane && q.t > p.t) {
          const k = Math.min(0.2, rt - q.t) / (q.t - p.t);
          x = q.x + (q.x - p.x) * k;
          y = q.y + (q.y - p.y) * k;
        }
        lane = q.lane;
      }
      const dx = x - c.x;
      const dy = y - c.y;
      const jumped = lane !== c.rlane;
      c.rlane = lane;
      c.x = x;
      c.y = y;
      if (!jumped) {
        if (Math.abs(dx) > 0.002) c.facing = dx > 0 ? 1 : -1;
        const speed = dt > 0 ? Math.hypot(dx, dy) / dt : 0;
        c.walk += Math.min(speed, 8) * dt * 2.2;
      }
    }
    // turrets swing towards their aim
    for (const t of this.towers.values()) {
      let d = t.targetAngle - t.angle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      t.angle += d * Math.min(1, dt * 12);
    }
  }

  isVisible(c: CCreep): boolean {
    return this.renderTime >= c.visibleFrom && this.renderTime < c.deadAt;
  }
}
