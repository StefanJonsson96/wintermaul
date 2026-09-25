import { armorMultiplier, DAMAGE_TABLE } from '../combat';
import {
  BETWEEN_WAVES,
  DT,
  FIRST_WAVE_DELAY,
  GATE_MAX_Y,
  GATE_MIN_Y,
  LANE_H,
  LANE_W,
  LUMBER_WAVES,
  RANDOM_RACE_BONUS,
  READY_SKIP_TO,
  SELL_REFUND,
  SETUP_TIME,
  START_GOLD,
  START_LUMBER,
  WAVE_FORCE_TIMEOUT,
  waveBonus,
} from '../constants';
import { RACES, RACE_BY_ID, TOWERS } from '../data/races';
import { CREEPS, endlessWave, FINAL_WAVE, WAVES } from '../data/waves';
import { CELL_FREE, CELL_RUBBLE, CELL_TOWER, LaneGrid } from '../grid';
import {
  CREEP_FLAG,
  DIFFICULTIES,
  startingLives,
  type FullState,
  type GameCommand,
  type GameEvent,
  type GameSettings,
  type NetCreep,
  type NetPlayer,
  type NetTower,
  PHASES,
  type Snapshot,
  type WaveState,
} from '../protocol';
import { Rng } from '../rng';
import type { AttackDef, CreepDef, DamageType, OnHit, TargetKind, TargetMode, TowerDef, WaveDef } from '../types';

export interface PlayerInit {
  id: number;
  name: string;
  color: number;
  isBot: boolean;
}

export interface Player extends NetPlayer {
  goldMul: number;
}

interface Dot {
  key: string;
  kind: 'poison' | 'burn';
  dps: number; // per stack
  stacks: number;
  until: number;
  owner: number;
  tower: number;
}

interface Sunder {
  key: string;
  armor: number; // per stack
  stacks: number;
  until: number;
}

export interface Creep {
  id: number;
  def: CreepDef;
  lane: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  air: boolean;
  wave: number;
  alive: boolean;
  cell: number;
  next: number;
  dir: number;
  history: number[];
  slowPct: number;
  slowUntil: number;
  auraSlow: number;
  stunUntil: number;
  rootUntil: number;
  dots: Dot[];
  sunders: Sunder[];
  amplifyPct: number;
  amplifyUntil: number;
  auraAmplify: number;
  visits: number;
  leakedFrom: number;
  progress: number;
  lastOwner: number;
  lastTower: number;
  nextHeal: number;
  healedUntil: number;
  /** Damage already in flight towards this creep (so towers don't all overkill the same target). */
  incoming: number;
}

export interface Tower {
  id: number;
  def: TowerDef;
  owner: number;
  lane: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
  buildStart: number;
  buildUntil: number;
  cd: number;
  mode: TargetMode;
  kills: number;
  damage: number;
  invested: number;
  buildPhase: number;
  level: number;
  xp: number;
  dmgMul: number;
  spdMul: number;
  xpMul: number;
  beamTarget: number;
  beamRamp: number;
  pulseCd: number;
}

interface PendingHit {
  at: number;
  tower: number;
  owner: number;
  target: number;
  lane: number;
  x: number;
  y: number;
  dmg: number;
  crit: boolean;
  air: boolean;
  est: number;
}

interface GroundFire {
  lane: number;
  x: number;
  y: number;
  r: number;
  dps: number;
  until: number;
  owner: number;
  tower: number;
}

interface SpawnEntry {
  at: number;
  lane: number;
  def: string;
  wave: number;
}

export interface Lane {
  index: number;
  owner: number;
  grid: LaneGrid;
  rubble: number[];
  creeps: Creep[]; // rebuilt every tick
}

export type CommandResult = { ok: true } | { ok: false; error: string };

const HISTORY_LEN = 16;

export class Game {
  settings: GameSettings;
  readonly rng: Rng;
  time = 0;
  tick = 0;
  players: Player[] = [];
  lanes: Lane[] = [];
  creeps = new Map<number, Creep>();
  towers = new Map<number, Tower>();
  private pending: PendingHit[] = [];
  private fires: GroundFire[] = [];
  private spawnQueue: SpawnEntry[] = [];
  private aliveByWave = new Map<number, number>();
  private nextId = 1;
  events: GameEvent[] = [];
  wave = 0;
  phase: WaveState['phase'] = 'setup';
  countdown = SETUP_TIME;
  /** The player who picks the rules during setup: the first human seat (Red, when Red is playing). */
  chooser = -1;
  lives: number;
  maxLives: number;
  private lastSpawnAt = 0;
  private phaseCounter = 0;
  private hpMul: number;
  private endlessDefs: CreepDef[] = [];
  /** Wave the game was lost/won on and when. */
  endedAt = 0;
  stats = { leakedTotal: 0 };

  constructor(settings: GameSettings, players: PlayerInit[], seed = Date.now(), opts: { skipSetup?: boolean } = {}) {
    this.settings = { ...settings };
    this.rng = new Rng(seed);
    const diff = DIFFICULTIES[settings.difficulty];
    this.lives = this.maxLives = startingLives(settings.difficulty, players.length);
    this.hpMul = diff.hp;
    const sorted = [...players].sort((a, b) => a.id - b.id);
    sorted.forEach((p, i) => {
      this.players.push({
        id: p.id,
        name: p.name,
        color: p.color,
        isBot: p.isBot,
        connected: true,
        lane: i,
        gold: START_GOLD,
        lumber: START_LUMBER,
        races: [],
        legends: [],
        kills: 0,
        leaks: 0,
        damage: 0,
        goldEarned: 0,
        ready: false,
        goldMul: 1,
      });
      this.lanes.push({ index: i, owner: p.id, grid: new LaneGrid(), rubble: [], creeps: [] });
    });
    this.chooser = this.players.find((p) => !p.isBot)?.id ?? -1;
    if (opts.skipSetup || this.chooser < 0) this.lockSetup();
  }

  /** Applies the chosen rules and starts the countdown to wave 1. */
  private lockSetup(): void {
    const diff = DIFFICULTIES[this.settings.difficulty];
    this.lives = this.maxLives = startingLives(this.settings.difficulty, this.players.length);
    this.hpMul = diff.hp;
    const mode = this.settings.raceMode;
    for (const p of this.players) {
      p.lumber = mode === 'double' ? 2 : START_LUMBER;
      p.goldMul = mode === 'random' ? 1.15 : 1;
    }
    if (mode === 'same') {
      const race = this.rng.pick(RACES).id;
      for (const p of this.players) this.grantRace(p, race);
    } else if (mode === 'random') {
      for (const p of this.players) this.pickRace(p, 'random');
    }
    this.phase = 'build';
    this.countdown = FIRST_WAVE_DELAY;
    this.phaseCounter++;
    for (const p of this.players) p.ready = false;
    this.emit({ e: 'setup', t: this.time, settings: { ...this.settings }, done: true, lives: this.lives });
    this.emit({ e: 'wave', t: this.time, n: 0, phase: 'build' });
  }

  // ─────────────────────────────────────────────────────────────── queries
  player(id: number): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  laneOf(playerId: number): Lane | undefined {
    const p = this.player(playerId);
    return p ? this.lanes[p.lane] : undefined;
  }

  creepDef(id: string): CreepDef {
    return CREEPS[id] ?? this.endlessDefs.find((d) => d.id === id)!;
  }

  get over(): boolean {
    return this.phase === 'victory' || this.phase === 'defeat';
  }

  /** Cells that creeps stand on or are about to step into, per lane (building there is refused). */
  occupiedCells(lane: number): Set<number> {
    const out = new Set<number>();
    for (const c of this.creeps.values()) {
      if (c.lane !== lane || !c.alive || c.air) continue;
      out.add(c.cell);
      if (c.next >= 0) out.add(c.next);
    }
    return out;
  }

  private emit(ev: GameEvent): void {
    this.events.push(ev);
  }

  drainEvents(): GameEvent[] {
    const ev = this.events;
    this.events = [];
    return ev;
  }

  // ─────────────────────────────────────────────────────────────── commands
  command(playerId: number, cmd: GameCommand): CommandResult {
    const p = this.player(playerId);
    if (!p) return { ok: false, error: 'Unknown player' };
    if (this.over) return { ok: false, error: 'The game is over' };
    if (this.phase === 'setup') {
      if (cmd.c === 'setup' || cmd.c === 'setupDone') {
        if (p.id !== this.chooser) return { ok: false, error: 'Only the rule chooser can do that' };
        if (cmd.c === 'setupDone') {
          this.lockSetup();
          return { ok: true };
        }
        const st = cmd.settings ?? {};
        if (st.difficulty && st.difficulty in DIFFICULTIES) this.settings.difficulty = st.difficulty;
        if (st.raceMode && ['pick', 'double', 'random', 'same'].includes(st.raceMode)) this.settings.raceMode = st.raceMode;
        if (typeof st.endless === 'boolean') this.settings.endless = st.endless;
        this.lives = this.maxLives = startingLives(this.settings.difficulty, this.players.length);
        this.emit({ e: 'setup', t: this.time, settings: { ...this.settings }, done: false, lives: this.lives });
        return { ok: true };
      }
      if (cmd.c !== 'ready') return { ok: false, error: 'Waiting for the rules to be chosen' };
    }
    switch (cmd.c) {
      case 'build':
        return this.build(p, cmd.tower, cmd.x | 0, cmd.y | 0);
      case 'upgrade':
        return this.upgrade(p, cmd.ids, cmd.to);
      case 'sell':
        return this.sell(p, cmd.ids);
      case 'target': {
        const ids = cmd.ids.filter((id) => this.towers.get(id)?.owner === p.id);
        if (!['first', 'last', 'strong', 'weak', 'close'].includes(cmd.mode)) return { ok: false, error: 'Bad mode' };
        for (const id of ids) this.towers.get(id)!.mode = cmd.mode;
        this.emit({ e: 'mode', t: this.time, ids, mode: cmd.mode });
        return { ok: true };
      }
      case 'race':
        return this.pickRace(p, cmd.race);
      case 'ready':
        p.ready = !!cmd.value;
        return { ok: true };
      case 'setup':
      case 'setupDone':
        return { ok: false, error: 'The rules are already set' };
      case 'gift': {
        const to = this.player(cmd.to);
        const amount = Math.floor(cmd.amount);
        if (!to || to.id === p.id) return { ok: false, error: 'Pick another player' };
        if (!(amount > 0) || amount > p.gold) return { ok: false, error: 'Not enough gold' };
        p.gold -= amount;
        to.gold += amount;
        this.emit({ e: 'gift', t: this.time, from: p.id, to: to.id, amount });
        return { ok: true };
      }
    }
    return { ok: false, error: 'Unknown command' };
  }

  private grantRace(p: Player, race: string): void {
    p.races.push(race);
    p.lumber -= 1;
    this.emit({ e: 'race', t: this.time, p: p.id, race });
  }

  pickRace(p: Player, race: string): CommandResult {
    if (p.lumber < 1) return { ok: false, error: 'You need lumber to pick a race' };
    if (p.races.length >= 3) return { ok: false, error: 'You already command three races' };
    const available = RACES.filter((r) => !p.races.includes(r.id)).map((r) => r.id);
    let chosen = race;
    const random = race === 'random' || this.settings.raceMode === 'random';
    if (random) chosen = this.rng.pick(available);
    if (!RACE_BY_ID[chosen]) return { ok: false, error: 'Unknown race' };
    if (p.races.includes(chosen)) return { ok: false, error: 'You already have that race' };
    this.grantRace(p, chosen);
    if (race === 'random' && this.settings.raceMode !== 'random' && !p.isBot) {
      p.gold += RANDOM_RACE_BONUS;
      p.goldEarned += RANDOM_RACE_BONUS;
      this.emit({ e: 'bonus', t: this.time, p: p.id, gold: RANDOM_RACE_BONUS, reason: 'random race' });
    }
    return { ok: true };
  }

  private countLimit(p: Player, group: string): number {
    let n = 0;
    for (const t of this.towers.values()) if (t.owner === p.id && t.def.limitGroup === group) n++;
    return n;
  }

  build(p: Player, defId: string, x: number, y: number): CommandResult {
    const def = TOWERS[defId];
    if (!def) return { ok: false, error: 'Unknown tower' };
    if (!p.races.includes(def.race)) return { ok: false, error: 'You do not command that race' };
    if (def.tier !== 1 && def.tier !== 5) return { ok: false, error: 'Upgrade a tower to get that one' };
    if (def.tier === 5) {
      if (p.legends.includes(def.id)) return { ok: false, error: 'You already built that Legend' };
      if (p.lumber < (def.lumber ?? 1)) return { ok: false, error: 'Legends cost 1 lumber' };
    }
    if (p.gold < def.cost) return { ok: false, error: 'Not enough gold' };
    const lane = this.lanes[p.lane];
    const res = lane.grid.canPlace(x, y, this.occupiedCells(lane.index));
    if (!res.ok) return { ok: false, error: res.reason };
    p.gold -= def.cost;
    if (def.tier === 5) {
      p.lumber -= def.lumber ?? 1;
      p.legends.push(def.id);
    }
    lane.grid.setFootprint(x, y, CELL_TOWER);
    lane.grid.recompute();
    const t: Tower = {
      id: this.nextId++,
      def,
      owner: p.id,
      lane: lane.index,
      x,
      y,
      cx: x + 1,
      cy: y + 1,
      buildStart: this.time,
      buildUntil: this.time + def.buildTime,
      cd: 0,
      mode: def.tier === 5 && def.id === 'sun_L' ? 'strong' : 'first',
      kills: 0,
      damage: 0,
      invested: def.cost,
      buildPhase: this.phase === 'build' ? this.phaseCounter : -1,
      level: 0,
      xp: 0,
      dmgMul: 1,
      spdMul: 1,
      xpMul: 1,
      beamTarget: -1,
      beamRamp: 1,
      pulseCd: 0,
    };
    this.towers.set(t.id, t);
    this.refreshAuras(lane.index);
    this.repathCreeps(lane.index);
    this.emit({ e: 'build', t: this.time, tower: this.netTower(t) });
    return { ok: true };
  }

  upgrade(p: Player, ids: number[], to: string): CommandResult {
    const def = TOWERS[to];
    if (!def) return { ok: false, error: 'Unknown upgrade' };
    let done = 0;
    let err = '';
    for (const id of ids) {
      const t = this.towers.get(id);
      if (!t || t.owner !== p.id) continue;
      if (!t.def.upgrades.includes(to)) {
        err = 'That upgrade does not apply';
        continue;
      }
      if (this.time < t.buildUntil) {
        err = 'Still under construction';
        continue;
      }
      if (def.limitGroup && def.limit && !t.def.limitGroup && this.countLimit(p, def.limitGroup) >= def.limit) {
        err = `Limit of ${def.limit} reached`;
        continue;
      }
      if (p.gold < def.cost) {
        err = 'Not enough gold';
        break;
      }
      p.gold -= def.cost;
      t.def = def;
      t.invested += def.cost;
      t.buildStart = this.time;
      t.buildUntil = this.time + def.buildTime;
      t.cd = 0;
      t.beamTarget = -1;
      t.beamRamp = 1;
      if (t.buildPhase !== this.phaseCounter || this.phase !== 'build') t.buildPhase = -1;
      done++;
      this.emit({ e: 'upgrade', t: this.time, id: t.id, def: def.id, buildStart: t.buildStart, buildUntil: t.buildUntil, invested: t.invested });
    }
    if (done > 0) {
      for (const lane of new Set(ids.map((id) => this.towers.get(id)?.lane).filter((l) => l !== undefined))) this.refreshAuras(lane as number);
      return { ok: true };
    }
    return { ok: false, error: err || 'Nothing to upgrade' };
  }

  sell(p: Player, ids: number[]): CommandResult {
    const lanesTouched = new Set<number>();
    let sold = 0;
    for (const id of ids) {
      const t = this.towers.get(id);
      if (!t || t.owner !== p.id) continue;
      const undo = this.phase === 'build' && t.buildPhase === this.phaseCounter;
      const refund = Math.floor(t.invested * (undo ? 1 : SELL_REFUND));
      p.gold += refund;
      if (t.def.tier === 5) {
        p.legends = p.legends.filter((l) => l !== t.def.id);
        if (undo) p.lumber += t.def.lumber ?? 1;
      }
      this.towers.delete(id);
      const lane = this.lanes[t.lane];
      // Anti-juggle: selling while creeps are marching leaves rubble until the wave ends.
      const rubble = this.phase === 'wave' && lane.creeps.some((c) => c.alive && !c.air);
      lane.grid.setFootprint(t.x, t.y, rubble ? CELL_RUBBLE : CELL_FREE);
      if (rubble) {
        const cells = lane.grid.footprint(t.x, t.y);
        lane.rubble.push(...cells);
      }
      lanesTouched.add(t.lane);
      sold++;
      this.emit({ e: 'sell', t: this.time, id, refund, rubble });
    }
    for (const l of lanesTouched) {
      this.lanes[l].grid.recompute();
      this.refreshAuras(l);
      this.repathCreeps(l);
    }
    return sold ? { ok: true } : { ok: false, error: 'Nothing to sell' };
  }

  setConnected(playerId: number, connected: boolean): void {
    const p = this.player(playerId);
    if (p) p.connected = connected;
  }

  // ─────────────────────────────────────────────────────────────── dev helpers (WINTERWARD_DEV=1 only)
  devGold(playerId: number, amount: number): void {
    const p = this.player(playerId);
    if (p) p.gold += amount;
  }

  devLumber(playerId: number, amount: number): void {
    const p = this.player(playerId);
    if (p) p.lumber += amount;
  }

  devSkipTo(n: number): void {
    if (this.phase === 'setup') this.lockSetup();
    for (const c of [...this.creeps.values()]) this.removeCreep(c);
    this.spawnQueue = [];
    this.wave = Math.max(0, n - 1);
    this.phase = 'build';
    this.countdown = 2;
    this.emit({ e: 'wave', t: this.time, n: this.wave, phase: 'build' });
  }

  // ─────────────────────────────────────────────────────────────── main loop
  step(): void {
    if (this.over) return;
    this.time += DT;
    this.tick++;
    this.updatePhase();
    this.updateSpawns();
    for (const lane of this.lanes) lane.creeps.length = 0;
    for (const c of this.creeps.values()) if (c.alive) this.lanes[c.lane].creeps.push(c);
    this.updateCreeps();
    this.updateAuraEffects();
    this.updateFires();
    this.resolveHits();
    this.updateTowers();
    this.cleanup();
    if (this.lives <= 0 && !this.over) this.finish(false);
  }

  private updatePhase(): void {
    if (this.phase === 'setup') {
      this.countdown -= DT;
      const chooser = this.player(this.chooser);
      if (this.countdown <= 0 || !chooser || !chooser.connected) this.lockSetup();
      return;
    }
    if (this.phase === 'build') {
      const humans = this.players.filter((p) => !p.isBot && p.connected);
      if (humans.length > 0 && humans.every((p) => p.ready) && this.countdown > READY_SKIP_TO) {
        const skipped = this.countdown - READY_SKIP_TO;
        const bonus = Math.floor(skipped * 0.5);
        if (bonus > 0) {
          for (const p of this.players) {
            p.gold += bonus;
            p.goldEarned += bonus;
            this.emit({ e: 'bonus', t: this.time, p: p.id, gold: bonus, reason: 'early call' });
          }
        }
        this.countdown = READY_SKIP_TO;
      }
      this.countdown -= DT;
      if (this.countdown <= 0) this.startWave(this.wave + 1);
    } else if (this.phase === 'wave') {
      const pendingForWave = this.spawnQueue.some((s) => s.wave === this.wave);
      if (pendingForWave) return;
      const alive = this.aliveByWave.get(this.wave) ?? 0;
      const isFinal = !this.settings.endless && this.wave >= FINAL_WAVE;
      if (alive === 0) {
        // older overlapping waves still count before we can win
        if (isFinal) {
          if (this.creeps.size === 0) this.endWave(true);
        } else this.endWave(true);
      } else if (!isFinal && this.time - this.lastSpawnAt > WAVE_FORCE_TIMEOUT) {
        this.endWave(false);
      }
    }
  }

  private waveInfo(n: number): { wave: WaveDef; creep: CreepDef } {
    if (n <= FINAL_WAVE) {
      const wave = WAVES[n - 1];
      return { wave, creep: CREEPS[wave.creep] };
    }
    const ew = endlessWave(n);
    if (!this.endlessDefs.some((d) => d.id === ew.creep.id)) {
      this.endlessDefs.push(ew.creep);
      this.emit({ e: 'endless', t: this.time, def: ew.creep });
    }
    return ew;
  }

  private startWave(n: number): void {
    this.wave = n;
    this.phase = 'wave';
    this.phaseCounter++;
    for (const p of this.players) p.ready = false;
    const { wave } = this.waveInfo(n);
    let t = this.time;
    for (const lane of this.lanes) {
      let at = t + 0.2;
      if (wave.escort) {
        for (let i = 0; i < wave.escort.count; i++, at += 0.5) this.spawnQueue.push({ at, lane: lane.index, def: wave.escort.creep, wave: n });
        at += 1.5;
      }
      for (let i = 0; i < wave.count; i++, at += wave.interval) this.spawnQueue.push({ at, lane: lane.index, def: wave.creep, wave: n });
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    this.emit({ e: 'wave', t: this.time, n, phase: 'wave' });
  }

  private endWave(cleared: boolean): void {
    const n = this.wave;
    // level bonus (classic: 10 gold + 2 per level)
    const bonus = waveBonus(n);
    for (const p of this.players) {
      const g = Math.round(bonus * p.goldMul);
      p.gold += g;
      p.goldEarned += g;
      this.emit({ e: 'bonus', t: this.time, p: p.id, gold: g, reason: `wave ${n}` });
    }
    // vaults & shrines
    let livesBack = 0;
    for (const p of this.players) {
      let interest = 0;
      const bank = p.gold;
      for (const t of this.towers.values()) {
        if (t.owner !== p.id || this.time < t.buildUntil) continue;
        const e = t.def.econ;
        if (!e) continue;
        if (e.interestPct) interest += Math.min(e.interestCap ?? Infinity, Math.floor(bank * e.interestPct));
        if (e.perWave) interest += e.perWave;
        if (e.lifePerWave) livesBack += e.lifePerWave;
      }
      if (interest > 0) {
        p.gold += interest;
        p.goldEarned += interest;
        this.emit({ e: 'bonus', t: this.time, p: p.id, gold: interest, reason: 'interest' });
      }
    }
    if (livesBack > 0) this.lives = Math.min(this.maxLives, this.lives + livesBack);
    if (LUMBER_WAVES.includes(n)) {
      for (const p of this.players) p.lumber += 1;
      this.emit({ e: 'lumber', t: this.time, wave: n });
    }
    // rubble crumbles
    for (const lane of this.lanes) {
      if (lane.rubble.length === 0) continue;
      const cells = lane.rubble.filter((i) => lane.grid.cells[i] === CELL_RUBBLE);
      for (const i of cells) lane.grid.cells[i] = CELL_FREE;
      lane.rubble = [];
      lane.grid.recompute();
      this.repathCreeps(lane.index);
      this.emit({ e: 'rubble', t: this.time, lane: lane.index, cells });
    }
    if (!this.settings.endless && n >= FINAL_WAVE && cleared) {
      this.finish(true);
      return;
    }
    this.phase = 'build';
    this.phaseCounter++;
    this.countdown = BETWEEN_WAVES;
    for (const p of this.players) p.ready = false;
    this.emit({ e: 'wave', t: this.time, n, phase: 'build' });
  }

  private finish(victory: boolean): void {
    this.phase = victory ? 'victory' : 'defeat';
    this.endedAt = this.time;
    this.emit({ e: 'wave', t: this.time, n: this.wave, phase: this.phase });
  }

  // ─────────────────────────────────────────────────────────────── creeps
  private updateSpawns(): void {
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.time) {
      const s = this.spawnQueue.shift()!;
      this.spawnCreep(this.creepDef(s.def), s.lane, s.wave);
      this.lastSpawnAt = this.time;
    }
  }

  private spawnCreep(def: CreepDef, lane: number, wave: number, at?: { x: number; y: number; cell: number; history: number[]; visits: number; leakedFrom: number }): Creep {
    // Extra health on hard difficulties phases in over the first waves, so the opening stays
    // tight but survivable; easier settings are easier from the start.
    const mul = this.hpMul > 1 ? 1 + (this.hpMul - 1) * Math.min(1, wave / 15) : this.hpMul;
    const hp = Math.round(def.hp * mul);
    const air = !!def.air;
    const grid = this.lanes[lane].grid;
    let x: number, y: number, cell: number;
    if (at) {
      ({ x, y, cell } = at);
    } else if (air) {
      x = 0.5;
      y = LANE_H / 2 + this.rng.range(-2.5, 2.5);
      cell = grid.idx(0, Math.floor(y));
    } else {
      const row = this.rng.int(GATE_MIN_Y, GATE_MAX_Y);
      x = 0.5;
      y = row + 0.5;
      cell = grid.idx(0, row);
    }
    const c: Creep = {
      id: this.nextId++,
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
      nextHeal: this.time + (def.heal?.every ?? 0),
      healedUntil: 0,
      incoming: 0,
    };
    if (!air) {
      const step = grid.next(cell, 0);
      c.next = step.cell;
      c.dir = step.dir;
    }
    this.creeps.set(c.id, c);
    this.aliveByWave.set(wave, (this.aliveByWave.get(wave) ?? 0) + 1);
    this.lanes[lane].creeps.push(c);
    this.emit({ e: 'spawn', t: this.time, creep: this.netCreep(c) });
    return c;
  }

  /** After the maze changes, creeps keep walking to their current next cell, then follow the new field. */
  private repathCreeps(lane: number): void {
    const grid = this.lanes[lane].grid;
    for (const c of this.creeps.values()) {
      if (c.lane !== lane || c.air || !c.alive) continue;
      if (c.next < 0 || grid.cells[c.next] !== CELL_FREE) {
        const step = grid.next(c.cell, c.dir);
        c.next = step.cell;
        c.dir = step.dir;
      }
    }
  }

  private creepSpeed(c: Creep): number {
    if (this.time < c.stunUntil || this.time < c.rootUntil) return 0;
    let slow = Math.max(this.time < c.slowUntil ? c.slowPct : 0, c.auraSlow);
    slow = Math.min(slow, c.def.boss ? 0.5 : 0.75);
    return c.def.speed * (1 - slow);
  }

  private updateCreeps(): void {
    for (const lane of this.lanes) {
      const grid = lane.grid;
      for (const c of lane.creeps) {
        if (!c.alive) continue;
        // regeneration and healing
        if (c.def.regen && c.hp < c.maxHp) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * c.def.regen * DT);
        if (c.def.heal && this.time >= c.nextHeal) {
          c.nextHeal = this.time + c.def.heal.every;
          const r2 = c.def.heal.radius * c.def.heal.radius;
          let healed = false;
          for (const o of lane.creeps) {
            // healers mend others, not themselves, and heals don't stack: a creep is mended at
            // most once per heal cycle
            if (o === c || !o.alive || o.hp >= o.maxHp || this.time < o.healedUntil) continue;
            if (o.def.boss && !c.def.boss) continue; // bosses only take orders (and heals) from bosses
            const dx = o.x - c.x;
            const dy = o.y - c.y;
            if (dx * dx + dy * dy <= r2) {
              o.hp = Math.min(o.maxHp, o.hp + o.maxHp * c.def.heal.pct);
              o.healedUntil = this.time + c.def.heal.every - 0.01;
              healed = true;
            }
          }
          if (healed) this.emit({ e: 'heal', t: this.time, id: c.id });
        }
        // damage over time
        if (c.dots.length) {
          for (let i = c.dots.length - 1; i >= 0; i--) {
            const d = c.dots[i];
            if (this.time >= d.until) {
              c.dots.splice(i, 1);
              continue;
            }
            this.trueDamage(c, d.dps * d.stacks * DT, d.owner, d.tower);
            if (!c.alive) break;
          }
          if (!c.alive) continue;
        }
        // movement
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
          continue;
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
    }
  }

  private leak(c: Creep): void {
    const from = c.lane;
    const cost = c.def.leak;
    this.lives -= cost;
    this.stats.leakedTotal++;
    const owner = this.player(this.lanes[from].owner);
    if (owner) owner.leaks++;
    // A leaked creep gets exactly one more run: through the next player's maze (or yours again, solo).
    const maxVisits = 2;
    const escaped = c.visits >= maxVisits;
    const to = (from + 1) % this.lanes.length;
    this.emit({ e: 'leak', t: this.time, id: c.id, from, to, cost, escaped, x: c.x, y: c.y });
    if (escaped) {
      this.removeCreep(c);
      // the Winter Tyrant getting away ends the game, whatever the lives
      if (c.def.boss && c.wave === FINAL_WAVE) this.lives = Math.min(this.lives, 0);
      return;
    }
    // Teleport into the next player's lane, keeping its current health.
    const grid = this.lanes[to].grid;
    c.lane = to;
    c.visits++;
    c.leakedFrom = from;
    c.history = [];
    c.slowUntil = c.stunUntil = c.rootUntil = 0;
    c.sunders = [];
    c.amplifyUntil = 0;
    if (c.air) {
      c.x = 0.5;
      c.y = LANE_H / 2 + this.rng.range(-2.5, 2.5);
      c.cell = grid.idx(0, Math.floor(c.y));
    } else {
      const row = this.rng.int(GATE_MIN_Y, GATE_MAX_Y);
      c.x = 0.5;
      c.y = row + 0.5;
      c.cell = grid.idx(0, row);
      const s = grid.next(c.cell, 0);
      c.next = s.cell;
      c.dir = s.dir;
    }
  }

  private removeCreep(c: Creep): void {
    if (!c.alive) return;
    c.alive = false;
    this.creeps.delete(c.id);
    this.aliveByWave.set(c.wave, (this.aliveByWave.get(c.wave) ?? 1) - 1);
  }

  private killCreep(c: Creep, owner: number, towerId: number, exec = false): void {
    if (!c.alive) return;
    const p = this.player(owner);
    let gold = 0;
    if (p) {
      gold = Math.round(c.def.bounty * p.goldMul);
      const t = this.towers.get(towerId);
      const e = t?.def.econ;
      if (e?.killGold && this.rng.chance(e.killGoldChance ?? 1)) gold += e.killGold;
      p.gold += gold;
      p.goldEarned += gold;
      p.kills++;
      if (t) t.kills++;
    }
    this.emit({ e: 'die', t: this.time, id: c.id, by: owner, gold, exec: exec || undefined });
    // plague spreads
    const spread = c.dots.length ? this.spreadRadius(c) : 0;
    if (spread > 0) {
      const r2 = spread * spread;
      for (const o of this.lanes[c.lane].creeps) {
        if (o === c || !o.alive) continue;
        const dx = o.x - c.x;
        const dy = o.y - c.y;
        if (dx * dx + dy * dy > r2) continue;
        for (const d of c.dots) if (d.kind === 'poison') this.addDot(o, { ...d, until: this.time + 4 });
      }
    }
    this.removeCreep(c);
    if (c.def.split) {
      const child = this.creepDef(c.def.split.into);
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
      this.emit({ e: 'split', t: this.time, id: c.id });
    }
  }

  private spreadRadius(c: Creep): number {
    let r = 0;
    for (const d of c.dots) {
      const t = this.towers.get(d.tower);
      const s = t?.def.attack?.onHit?.spreadOnDeath;
      if (s) r = Math.max(r, s);
    }
    return r;
  }

  // ─────────────────────────────────────────────────────────────── damage
  private armorOf(c: Creep): number {
    let a = c.def.armor;
    for (let i = c.sunders.length - 1; i >= 0; i--) {
      const s = c.sunders[i];
      if (this.time >= s.until) c.sunders.splice(i, 1);
      else a -= s.armor * s.stacks;
    }
    return a;
  }

  private amplifyOf(c: Creep): number {
    return 1 + Math.max(this.time < c.amplifyUntil ? c.amplifyPct : 0, c.auraAmplify);
  }

  private applyRawDamage(c: Creep, amount: number, owner: number, towerId: number): number {
    if (!c.alive || amount <= 0) return 0;
    let dealt = amount;
    if (c.shield > 0) {
      const absorbed = Math.min(c.shield, amount);
      c.shield -= absorbed;
      amount -= absorbed;
    }
    c.hp -= amount;
    c.lastOwner = owner;
    c.lastTower = towerId;
    const t = this.towers.get(towerId);
    if (t) {
      t.damage += dealt;
      if (t.def.growth && t.level < t.def.growth.maxLevel) {
        t.xp += dealt * t.xpMul;
        while (t.xp >= t.def.growth.xpPerLevel && t.level < t.def.growth.maxLevel) {
          t.xp -= t.def.growth.xpPerLevel;
          t.level++;
          this.emit({ e: 'level', t: this.time, tw: t.id, level: t.level });
        }
      }
    }
    const p = this.player(owner);
    if (p) p.damage += dealt;
    if (c.hp <= 0) this.killCreep(c, owner, towerId);
    return dealt;
  }

  /** Typed damage: armor class table, numeric armor, amplification. */
  private damage(c: Creep, amount: number, type: DamageType, owner: number, towerId: number, onHit?: OnHit): number {
    if (!c.alive) return 0;
    let mult = DAMAGE_TABLE[type][c.def.armorType] * armorMultiplier(this.armorOf(c)) * this.amplifyOf(c);
    if (onHit) {
      if (onHit.bonusVsAir && c.air) mult *= onHit.bonusVsAir;
      const vs = onHit.bonusVsArmor?.[c.def.armorType];
      if (vs) mult *= vs;
      if (onHit.shatter && this.time < c.stunUntil) mult *= onHit.shatter;
    }
    return this.applyRawDamage(c, amount * mult, owner, towerId);
  }

  /** Armor-ignoring damage (poison, burn, auras, burning ground). */
  private trueDamage(c: Creep, amount: number, owner: number, towerId: number): number {
    return this.applyRawDamage(c, amount * this.amplifyOf(c), owner, towerId);
  }

  private addDot(c: Creep, d: Dot, maxStacks = 1): void {
    const ex = c.dots.find((x) => x.key === d.key);
    if (ex) {
      ex.stacks = Math.min(maxStacks, ex.stacks + 1);
      ex.until = Math.max(ex.until, d.until);
      ex.owner = d.owner;
      ex.tower = d.tower;
      ex.dps = Math.max(ex.dps, d.dps);
    } else c.dots.push({ ...d, stacks: 1 });
  }

  private applyOnHit(c: Creep, oh: OnHit, owner: number, t: Tower): void {
    if (!c.alive) return;
    const cc = !c.def.immune;
    const boss = !!c.def.boss;
    const now = this.time;
    if (oh.slow && cc) {
      if (now >= c.slowUntil || oh.slow.pct >= c.slowPct) {
        c.slowPct = Math.max(now < c.slowUntil ? c.slowPct : 0, oh.slow.pct);
        c.slowUntil = Math.max(c.slowUntil, now + oh.slow.dur);
      }
    }
    if (oh.stun && cc && this.rng.chance(oh.stun.chance)) {
      if (boss) {
        c.slowPct = Math.max(c.slowPct, 0.3);
        c.slowUntil = Math.max(c.slowUntil, now + oh.stun.dur);
      } else c.stunUntil = Math.max(c.stunUntil, now + oh.stun.dur);
    }
    if (oh.root && cc && !boss && this.rng.chance(oh.root.chance)) c.rootUntil = Math.max(c.rootUntil, now + oh.root.dur);
    if (oh.dot) {
      this.addDot(c, { key: t.def.id, kind: oh.dot.kind, dps: oh.dot.dps * t.dmgMul * this.growthMul(t), stacks: 1, until: now + oh.dot.dur, owner, tower: t.id }, oh.dot.maxStacks);
    }
    if (oh.sunder) {
      const ex = c.sunders.find((s) => s.key === t.def.id);
      if (ex) {
        ex.stacks = Math.min(oh.sunder.maxStacks, ex.stacks + 1);
        ex.until = now + oh.sunder.dur;
      } else c.sunders.push({ key: t.def.id, armor: oh.sunder.armor, stacks: 1, until: now + oh.sunder.dur });
    }
    if (oh.amplify) {
      if (now >= c.amplifyUntil || oh.amplify.pct >= c.amplifyPct) {
        c.amplifyPct = Math.max(now < c.amplifyUntil ? c.amplifyPct : 0, oh.amplify.pct);
        c.amplifyUntil = Math.max(c.amplifyUntil, now + oh.amplify.dur);
      }
    }
    if (oh.percentCurrent && c.alive) {
      const pct = boss ? oh.percentCurrent.bossPct : oh.percentCurrent.pct;
      this.applyRawDamage(c, c.hp * pct, owner, t.id);
    }
    if (oh.execute && c.alive && !boss && c.hp < c.maxHp * oh.execute) {
      this.applyRawDamage(c, c.hp + c.shield + 1, owner, t.id);
    }
    if (oh.knockback && cc && !boss && c.alive && this.rng.chance(oh.knockback.chance)) this.pushBack(c, oh.knockback.cells);
  }

  /** Drags a creep back along the way it came (never into towers or sealed pockets). */
  private pushBack(c: Creep, cells: number): void {
    if (c.air) {
      c.x = Math.max(0.5, c.x - cells);
      return;
    }
    const grid = this.lanes[c.lane].grid;
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

  private growthMul(t: Tower): number {
    return t.def.growth ? 1 + t.level * t.def.growth.dmgPerLevel : 1;
  }

  // ─────────────────────────────────────────────────────────────── towers
  /** Recomputes tower-to-tower aura buffs in a lane (auras of the same kind don't stack). */
  private refreshAuras(lane: number): void {
    const list = [...this.towers.values()].filter((t) => t.lane === lane);
    const auras = list.filter((t) => t.def.aura && (t.def.aura.towerDmgPct || t.def.aura.towerSpdPct || t.def.aura.xpRate));
    for (const t of list) {
      let dmg = 0;
      let spd = 0;
      let xp = 0;
      for (const a of auras) {
        if (a === t && !a.def.aura!.xpRate) continue;
        const r = a.def.aura!.radius;
        const dx = a.cx - t.cx;
        const dy = a.cy - t.cy;
        if (dx * dx + dy * dy > r * r) continue;
        dmg = Math.max(dmg, a.def.aura!.towerDmgPct ?? 0);
        spd = Math.max(spd, a.def.aura!.towerSpdPct ?? 0);
        xp = Math.max(xp, a.def.aura!.xpRate ?? 0);
      }
      t.dmgMul = 1 + dmg;
      t.spdMul = 1 + spd;
      t.xpMul = 1 + xp;
    }
  }

  private updateAuraEffects(): void {
    for (const t of this.towers.values()) {
      const a = t.def.aura;
      if (!a || (!a.enemySlowPct && !a.enemyDps && !a.enemyAmplify)) continue;
      if (this.time < t.buildUntil) continue;
      const r2 = a.radius * a.radius;
      for (const c of this.lanes[t.lane].creeps) {
        if (!c.alive || c.lane !== t.lane) continue;
        const dx = c.x - t.cx;
        const dy = c.y - t.cy;
        if (dx * dx + dy * dy > r2) continue;
        if (a.enemySlowPct && !c.def.immune) c.auraSlow = Math.max(c.auraSlow, a.enemySlowPct);
        if (a.enemyAmplify) c.auraAmplify = Math.max(c.auraAmplify, a.enemyAmplify);
        if (a.enemyDps) this.trueDamage(c, a.enemyDps * t.dmgMul * DT, t.owner, t.id);
      }
    }
  }

  private updateFires(): void {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      if (this.time >= f.until) {
        this.fires.splice(i, 1);
        continue;
      }
      const r2 = f.r * f.r;
      for (const c of this.lanes[f.lane].creeps) {
        if (!c.alive || c.air || c.lane !== f.lane) continue;
        const dx = c.x - f.x;
        const dy = c.y - f.y;
        if (dx * dx + dy * dy <= r2) this.trueDamage(c, f.dps * DT, f.owner, f.tower);
      }
    }
  }

  private canTarget(kind: TargetKind, c: Creep): boolean {
    return kind === 'both' || (kind === 'air') === c.air;
  }

  private score(mode: TargetMode, t: Tower, c: Creep): number {
    switch (mode) {
      case 'first':
        return c.progress;
      case 'last':
        return -c.progress;
      case 'strong':
        return -c.hp;
      case 'weak':
        return c.hp;
      case 'close':
        return (c.x - t.cx) ** 2 + (c.y - t.cy) ** 2;
    }
  }

  private acquire(t: Tower, range: number, kind: TargetKind, count: number): Creep[] {
    const r2 = range * range;
    const cands: Creep[] = [];
    let best: Creep | null = null;
    let bestScore = Infinity;
    let doomed: Creep | null = null;
    let doomedScore = Infinity;
    for (const c of this.lanes[t.lane].creeps) {
      if (!c.alive || c.lane !== t.lane || !this.canTarget(kind, c)) continue;
      const dx = c.x - t.cx;
      const dy = c.y - t.cy;
      if (dx * dx + dy * dy > r2) continue;
      const s = this.score(t.mode, t, c);
      // creeps that projectiles already in the air will kill are only a fallback
      if (c.incoming >= c.hp + c.shield) {
        if (s < doomedScore) {
          doomedScore = s;
          doomed = c;
        }
        continue;
      }
      if (count === 1) {
        if (s < bestScore) {
          bestScore = s;
          best = c;
        }
      } else cands.push(c);
    }
    if (count === 1) return best ? [best] : doomed ? [doomed] : [];
    cands.sort((a, b) => this.score(t.mode, t, a) - this.score(t.mode, t, b));
    if (cands.length === 0 && doomed) cands.push(doomed);
    return cands.slice(0, count);
  }

  private rollDamage(t: Tower, a: AttackDef): { dmg: number; crit: boolean } {
    let dmg = this.rng.range(a.dmg[0], a.dmg[1]) * t.dmgMul * this.growthMul(t);
    if (a.goldScaling) {
      const p = this.player(t.owner);
      if (p) dmg += Math.min(a.goldScaling.max, p.gold * a.goldScaling.pct);
    }
    let crit = false;
    if (a.crit && this.rng.chance(a.crit.chance)) {
      dmg *= a.crit.mult;
      crit = true;
    }
    return { dmg, crit };
  }

  private updateTowers(): void {
    for (const t of this.towers.values()) {
      if (this.time < t.buildUntil) continue;
      const a = t.def.attack;
      if (a) {
        if (a.beam) this.updateBeam(t, a);
        else this.updateAttack(t, a);
      }
      if (t.def.pulse) this.updatePulse(t);
    }
  }

  private updateAttack(t: Tower, a: AttackDef): void {
    t.cd -= DT * t.spdMul;
    if (t.cd > 0) return;
    const targets = this.acquire(t, a.range, a.targets, a.multishot ?? 1);
    if (targets.length === 0) {
      t.cd = 0;
      return;
    }
    for (const target of targets) this.fire(t, a, target);
    t.cd = Math.max(t.cd + a.cd, 0.02);
  }

  private fire(t: Tower, a: AttackDef, target: Creep): void {
    const { dmg, crit } = this.rollDamage(t, a);
    if (a.line) {
      // everything on the line from the tower through the target, to max range
      const dx = target.x - t.cx;
      const dy = target.y - t.cy;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const ex = t.cx + ux * a.range;
      const ey = t.cy + uy * a.range;
      this.emit({ e: 'line', t: this.time, tw: t.id, x: ex, y: ey });
      for (const c of [...this.lanes[t.lane].creeps]) {
        if (!c.alive || c.lane !== t.lane || !this.canTarget(a.targets, c)) continue;
        const px = c.x - t.cx;
        const py = c.y - t.cy;
        const along = px * ux + py * uy;
        if (along < 0 || along > a.range) continue;
        const off = Math.abs(px * uy - py * ux);
        if (off > 0.7) continue;
        this.hitCreep(t, a, c, dmg, crit);
      }
      return;
    }
    if (a.chain) {
      const chainTargets = [target];
      let cur = target;
      const hit = new Set<number>([target.id]);
      for (let k = 0; k < a.chain.count; k++) {
        let next: Creep | null = null;
        let bd = a.chain.range * a.chain.range;
        for (const c of this.lanes[t.lane].creeps) {
          if (!c.alive || c.lane !== t.lane || hit.has(c.id) || !this.canTarget(a.targets, c)) continue;
          const d = (c.x - cur.x) ** 2 + (c.y - cur.y) ** 2;
          if (d <= bd) {
            bd = d;
            next = c;
          }
        }
        if (!next) break;
        hit.add(next.id);
        chainTargets.push(next);
        cur = next;
      }
      const instant = a.proj === 'lightning' || !a.projSpeed;
      const travel = instant ? 0 : Math.max(0.05, Math.hypot(target.x - t.cx, target.y - t.cy) / a.projSpeed!);
      this.emit({ e: 'chain', t: this.time, tw: t.id, ids: chainTargets.map((c) => c.id), d: +travel.toFixed(3) });
      let mult = 1;
      chainTargets.forEach((c, k) => {
        if (k > 0) mult *= 1 - a.chain!.falloff;
        if (instant) this.hitCreep(t, a, c, dmg * mult, crit && k === 0);
        else this.queueHit(t, c, dmg * mult, crit && k === 0, travel + 0.12 * k);
      });
      return;
    }
    if (!a.projSpeed || a.proj === 'lightning' || a.proj === 'rail') {
      this.emit({ e: 'shot', t: this.time, tw: t.id, c: target.id, d: 0, k: a.proj });
      this.hitCreep(t, a, target, dmg, crit);
      return;
    }
    const dist = Math.hypot(target.x - t.cx, target.y - t.cy);
    const travel = Math.max(0.05, dist / a.projSpeed);
    this.emit({ e: 'shot', t: this.time, tw: t.id, c: target.id, d: +travel.toFixed(3), k: a.proj });
    this.queueHit(t, target, dmg, crit, travel);
  }

  private queueHit(t: Tower, target: Creep, dmg: number, crit: boolean, delay: number): void {
    const a = t.def.attack!;
    const est = dmg * DAMAGE_TABLE[a.type][target.def.armorType] * armorMultiplier(this.armorOf(target)) * this.amplifyOf(target);
    target.incoming += est;
    this.pending.push({ at: this.time + delay, tower: t.id, owner: t.owner, target: target.id, lane: t.lane, x: target.x, y: target.y, dmg, crit, air: target.air, est });
  }

  private resolveHits(): void {
    if (!this.pending.length) return;
    const keep: PendingHit[] = [];
    for (const h of this.pending) {
      if (h.at > this.time) {
        keep.push(h);
        continue;
      }
      const t = this.towers.get(h.tower);
      const def = t?.def;
      const a = def?.attack;
      const target = this.creeps.get(h.target);
      if (target) target.incoming = Math.max(0, target.incoming - h.est);
      if (target && target.alive && target.lane === h.lane) {
        h.x = target.x;
        h.y = target.y;
      }
      if (!t || !a) {
        // tower sold mid-flight: the shot still lands, without effects
        if (target?.alive && target.lane === h.lane) this.applyRawDamage(target, h.dmg * 0.5, h.owner, -1);
        continue;
      }
      if (a.splash) {
        this.splash(t, a, h.lane, h.x, h.y, h.dmg, h.crit, h.air, target && target.lane === h.lane ? target : undefined);
      } else if (target && target.alive && target.lane === h.lane) {
        this.hitCreep(t, a, target, h.dmg, h.crit);
      }
    }
    this.pending = keep;
  }

  private splash(t: Tower, a: AttackDef, lane: number, x: number, y: number, dmg: number, crit: boolean, air: boolean, primary?: Creep): void {
    const r = a.splash!;
    const edge = a.splashFalloff ?? 0.4;
    this.emit({ e: 'impact', t: this.time, tw: t.id, x, y, r, lane });
    for (const c of [...this.lanes[lane].creeps]) {
      if (!c.alive || c.lane !== lane || c.air !== air) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d > r) continue;
      const f = c === primary ? 1 : 1 - (1 - edge) * (d / r);
      this.hitCreep(t, a, c, dmg * f, crit && c === primary);
    }
    if (a.groundFire && !air) {
      const g = a.groundFire;
      this.fires.push({ lane, x, y, r: g.radius, dps: g.dps * t.dmgMul, until: this.time + g.dur, owner: t.owner, tower: t.id });
      this.emit({ e: 'fire', t: this.time, lane, x, y, r: g.radius, until: this.time + g.dur });
    }
  }

  private hitCreep(t: Tower, a: AttackDef, c: Creep, dmg: number, crit: boolean): void {
    if (!c.alive) return;
    const dealt = this.damage(c, dmg, a.type, t.owner, t.id, a.onHit);
    if (crit && dealt > 0) this.emit({ e: 'crit', t: this.time, id: c.id, amount: Math.round(dealt) });
    if (a.onHit && c.alive) this.applyOnHit(c, a.onHit, t.owner, t);
  }

  private updateBeam(t: Tower, a: AttackDef): void {
    const beam = a.beam!;
    let target = t.beamTarget >= 0 ? this.creeps.get(t.beamTarget) : undefined;
    const r2 = a.range * a.range;
    if (target && (!target.alive || target.lane !== t.lane || (target.x - t.cx) ** 2 + (target.y - t.cy) ** 2 > r2)) {
      const died = !target.alive;
      target = undefined;
      t.beamTarget = -1;
      t.beamRamp = died ? Math.max(1, t.beamRamp * beam.keepOnKill) : 1;
    }
    if (!target) {
      const found = this.acquire(t, a.range, a.targets, 1)[0];
      if (!found) {
        t.beamRamp = Math.max(1, t.beamRamp - DT);
        return;
      }
      target = found;
      t.beamTarget = found.id;
    }
    const dps = a.dmg[0] * t.dmgMul * t.spdMul * this.growthMul(t) * t.beamRamp;
    this.damage(target, dps * DT, a.type, t.owner, t.id, a.onHit);
    t.beamRamp = Math.min(beam.maxMult, t.beamRamp + beam.ramp * DT);
  }

  private updatePulse(t: Tower): void {
    const pu = t.def.pulse!;
    t.pulseCd -= DT * t.spdMul;
    if (t.pulseCd > 0) return;
    const r2 = pu.radius * pu.radius;
    let hits = this.lanes[t.lane].creeps.filter((c) => c.alive && c.lane === t.lane && this.canTarget(pu.targets, c) && (c.x - t.cx) ** 2 + (c.y - t.cy) ** 2 <= r2);
    if (hits.length === 0) {
      t.pulseCd = 0;
      return;
    }
    if (pu.maxTargets) hits = hits.sort((a, b) => (a.x - t.cx) ** 2 + (a.y - t.cy) ** 2 - ((b.x - t.cx) ** 2 + (b.y - t.cy) ** 2)).slice(0, pu.maxTargets);
    this.emit({ e: 'pulse', t: this.time, tw: t.id });
    for (const c of hits) {
      if (!c.alive) continue;
      if (pu.annihilate) {
        if (c.def.boss) this.applyRawDamage(c, c.hp * pu.annihilate.bossPct, t.owner, t.id);
        else this.applyRawDamage(c, c.hp + c.shield + 1, t.owner, t.id);
        continue;
      }
      if (pu.dmg) this.damage(c, pu.dmg * t.dmgMul * this.growthMul(t), pu.type ?? 'magic', t.owner, t.id, pu.onHit);
      if (pu.onHit && c.alive) this.applyOnHit(c, pu.onHit, t.owner, t);
      if (pu.pull && c.alive && !c.def.immune && !c.def.boss) this.pushBack(c, pu.pull);
    }
    t.pulseCd = pu.every;
  }

  private cleanup(): void {
    // dead creeps are removed as they die; nothing else to prune
  }

  // ─────────────────────────────────────────────────────────────── replication
  netTower(t: Tower): NetTower {
    return {
      id: t.id,
      def: t.def.id,
      owner: t.owner,
      lane: t.lane,
      x: t.x,
      y: t.y,
      buildStart: t.buildStart,
      buildUntil: t.buildUntil,
      mode: t.mode,
      kills: t.kills,
      damage: Math.round(t.damage),
      invested: t.invested,
      level: t.level,
      xp: Math.round(t.xp),
    };
  }

  netCreep(c: Creep): NetCreep {
    return {
      id: c.id,
      def: c.def.id,
      lane: c.lane,
      x: +c.x.toFixed(2),
      y: +c.y.toFixed(2),
      hp: Math.round(c.hp),
      maxHp: c.maxHp,
      shield: Math.round(c.shield),
      leakedFrom: c.leakedFrom,
      wave: c.wave,
    };
  }

  netPlayers(): NetPlayer[] {
    return this.players.map(({ goldMul: _g, ...p }) => ({ ...p, gold: Math.floor(p.gold), damage: Math.round(p.damage) }));
  }

  waveState(): WaveState {
    return {
      n: this.wave,
      phase: this.phase,
      countdown: Math.max(0, this.countdown),
      lives: this.lives,
      maxLives: this.maxLives,
      finalWave: this.settings.endless ? 0 : FINAL_WAVE,
      chooser: this.chooser,
    };
  }

  fullState(): FullState {
    return {
      time: this.time,
      settings: this.settings,
      players: this.netPlayers(),
      laneOwners: this.lanes.map((l) => l.owner),
      towers: [...this.towers.values()].map((t) => this.netTower(t)),
      creeps: [...this.creeps.values()].map((c) => this.netCreep(c)),
      rubble: this.lanes.map((l) => ({ lane: l.index, cells: [...l.rubble] })),
      wave: this.waveState(),
      endlessDefs: this.endlessDefs,
    };
  }

  creepFlags(c: Creep): number {
    const now = this.time;
    let f = 0;
    if ((now < c.slowUntil && c.slowPct > 0) || c.auraSlow > 0) f |= CREEP_FLAG.slowed;
    if (now < c.stunUntil) f |= CREEP_FLAG.stunned;
    if (now < c.rootUntil) f |= CREEP_FLAG.rooted;
    for (const d of c.dots) f |= d.kind === 'poison' ? CREEP_FLAG.poisoned : CREEP_FLAG.burning;
    if (now < c.amplifyUntil) f |= CREEP_FLAG.cursed;
    if (c.sunders.length) f |= CREEP_FLAG.sundered;
    if (c.shield > 0) f |= CREEP_FLAG.shielded;
    return f;
  }

  snapshot(): Snapshot {
    const c: number[] = [];
    for (const cr of this.creeps.values()) {
      if (!cr.alive) continue;
      c.push(cr.id, cr.lane, Math.round(cr.x * 100), Math.round(cr.y * 100), Math.max(1, Math.round(cr.hp)), this.creepFlags(cr));
    }
    const p: number[] = [];
    for (const pl of this.players) p.push(Math.floor(pl.gold), pl.lumber, pl.kills, pl.leaks, pl.ready ? 1 : 0, pl.connected ? 1 : 0);
    const b: number[] = [];
    for (const t of this.towers.values()) if (t.beamTarget >= 0) b.push(t.id, t.beamTarget, Math.round(t.beamRamp * 100));
    return {
      t: +this.time.toFixed(3),
      c,
      p,
      w: [this.wave, PHASES.indexOf(this.phase), Math.round(Math.max(0, this.countdown) * 10), this.lives],
      b,
      ev: this.drainEvents(),
    };
  }
}
