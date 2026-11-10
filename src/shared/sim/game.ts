import {
  BETWEEN_WAVES,
  DT,
  FIRST_WAVE_DELAY,
  LUMBER_WAVES,
  RANDOM_RACE_BONUS,
  READY_SKIP_TO,
  SETUP_TIME,
  START_GOLD,
  START_LUMBER,
  WAVE_FORCE_TIMEOUT,
  waveBonus,
} from '../constants';
import { RACES, RACE_BY_ID, TOWERS } from '../data/races';
import { CREEPS, endlessWave, FINAL_WAVE, WAVE_SETS, wavesOf } from '../data/waves';
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
import { Combat } from './combat';
import type { CommandResult, Creep, GameRules, Lane, Player, PlayerInit, Tower } from './entities';
import { Horde } from './horde';
import { BOON_BY_ID, botBoon, effectiveMods, isOmenWave, omenOffers, type Weather, WEATHERS, type WeatherId, weatherOf } from './omens';
import { sellRefund, towerCost, upgradeCost } from './mods';
import type { CreepDef, WaveDef } from '../types';

export type { CommandResult, Creep, GameRules, Lane, Player, PlayerInit, Tower } from './entities';

export class Game {
  settings: GameSettings;
  readonly rules: GameRules;
  readonly rng: Rng;
  time = 0;
  tick = 0;
  players: Player[] = [];
  lanes: Lane[] = [];
  creeps = new Map<number, Creep>();
  towers = new Map<number, Tower>();
  readonly horde = new Horde(this);
  readonly combat = new Combat(this);
  events: GameEvent[] = [];
  wave = 0;
  phase: WaveState['phase'] = 'setup';
  countdown = SETUP_TIME;
  /** The player who picks the rules during setup: the first human seat (Red, when Red is playing). */
  chooser = -1;
  lives: number;
  maxLives: number;
  /** The game is won when this wave is cleared (unless endless). */
  readonly finalWave: number;
  /** Creep health multiplier from the difficulty and the rules. */
  hpMul: number;
  /** Talent: towers hit harder while the team is down to a quarter of its lives. */
  lastStand = false;
  /** The Winter Tyrant got away; no Second Wind saves that. */
  tyrantEscaped = false;
  /** The game's seed (the weather forecast and shrine offers come from it). */
  readonly seed: number;
  /** The weather in force (calm between waves). */
  weather: WeatherId = 'clear';
  private nextId = 1;
  private phaseCounter = 0;
  private endlessDefs: CreepDef[] = [];
  /** Lives the team gets back once, when it would lose (Second Wind talent). */
  private secondWind = 0;

  constructor(settings: GameSettings, players: PlayerInit[], seed = Date.now(), opts: { skipSetup?: boolean; rules?: GameRules } = {}) {
    this.settings = { ...settings };
    this.rules = opts.rules ?? {};
    this.finalWave = this.rules.finalWave ?? FINAL_WAVE;
    this.rng = new Rng(seed);
    this.seed = seed >>> 0;
    const diff = DIFFICULTIES[settings.difficulty];
    this.hpMul = diff.hp * (this.rules.hpMul ?? 1);
    this.wave = Math.max(1, this.rules.firstWave ?? 1) - 1;
    const sorted = [...players].sort((a, b) => a.id - b.id);
    sorted.forEach((p, i) => {
      const mods = this.rules.mods?.[p.id] ?? {};
      this.players.push({
        id: p.id,
        name: p.name,
        color: p.color,
        isBot: p.isBot,
        connected: true,
        lane: i,
        gold: (this.rules.startGold ?? START_GOLD) + (mods.startGold ?? 0),
        lumber: this.rules.startLumber ?? START_LUMBER,
        races: [],
        legends: [],
        kills: 0,
        leaks: 0,
        damage: 0,
        goldEarned: 0,
        ready: false,
        goldMul: 1,
        mods,
        baseMods: mods,
        baseGoldMul: 1,
        boons: [],
        omen: null,
      });
      this.lanes.push({ index: i, owner: p.id, grid: new LaneGrid(), rubble: [], creeps: [], waveLeaks: 0, forgiven: 0, avalanche: false });
    });
    this.lives = this.maxLives = this.startLives();
    this.secondWind = Math.max(0, ...this.players.map((p) => p.mods.secondWind ?? 0));
    this.chooser = this.players.find((p) => !p.isBot)?.id ?? -1;
    if (opts.skipSetup || this.chooser < 0) this.lockSetup();
  }

  /** Team lives for the current rules, plus every player's talent lives. */
  private startLives(): number {
    const base = this.rules.lives ?? startingLives(this.settings.difficulty, this.players.length);
    return base + this.players.reduce((n, p) => n + (p.mods.lives ?? 0), 0);
  }

  get firstWave(): number {
    return Math.max(1, this.rules.firstWave ?? 1);
  }

  /** Applies the chosen rules and starts the countdown to wave 1. */
  private lockSetup(): void {
    const diff = DIFFICULTIES[this.settings.difficulty];
    this.lives = this.maxLives = this.startLives();
    this.hpMul = diff.hp * (this.rules.hpMul ?? 1);
    const mode = this.settings.raceMode;
    for (const p of this.players) {
      p.lumber = (this.rules.startLumber ?? START_LUMBER) + (mode === 'double' ? 1 : 0) + (p.mods.startLumber ?? 0);
      p.baseGoldMul = (mode === 'random' ? 1.15 : 1) * (this.rules.bountyMul ?? 1);
      p.goldMul = p.baseGoldMul * (p.mods.bounty ?? 1);
    }
    if (mode === 'same') {
      const race = this.rng.pick(this.allowedRaces());
      for (const p of this.players) this.grantRace(p, race);
    } else if (mode === 'random') {
      for (const p of this.players) this.pickRace(p, 'random');
    }
    this.phase = 'build';
    this.countdown = (this.rules.firstWaveDelay ?? FIRST_WAVE_DELAY) + Math.max(0, ...this.players.map((p) => p.mods.prep ?? 0));
    this.phaseCounter++;
    for (const p of this.players) p.ready = false;
    this.emit({ e: 'setup', t: this.time, settings: { ...this.settings }, done: true, lives: this.lives, finalWave: this.settings.endless ? 0 : this.finalWave });
    this.emit({ e: 'wave', t: this.time, n: this.wave, phase: 'build' });
  }

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

  newId(): number {
    return this.nextId++;
  }

  emit(ev: GameEvent): void {
    this.events.push(ev);
  }

  drainEvents(): GameEvent[] {
    const ev = this.events;
    this.events = [];
    return ev;
  }

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
        if (st.waves && st.waves in WAVE_SETS) this.settings.waves = st.waves;
        if (typeof st.weather === 'boolean') this.settings.weather = st.weather;
        if (typeof st.omens === 'boolean') this.settings.omens = st.omens;
        this.lives = this.maxLives = this.startLives();
        this.emit({ e: 'setup', t: this.time, settings: { ...this.settings }, done: false, lives: this.lives, finalWave: this.settings.endless ? 0 : this.finalWave });
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
      case 'omen':
        return this.takeBoon(p, cmd.pick);
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
    const available = this.allowedRaces().filter((r) => !p.races.includes(r));
    if (available.length === 0) return { ok: false, error: 'No races left to pick' };
    let chosen = race;
    const random = race === 'random' || this.settings.raceMode === 'random';
    if (random) chosen = this.rng.pick(available);
    if (!RACE_BY_ID[chosen]) return { ok: false, error: 'Unknown race' };
    if (!available.includes(chosen) && !p.races.includes(chosen)) return { ok: false, error: 'That race is not available here' };
    if (p.races.includes(chosen)) return { ok: false, error: 'You already have that race' };
    this.grantRace(p, chosen);
    if (race === 'random' && this.settings.raceMode !== 'random' && !p.isBot) {
      p.gold += RANDOM_RACE_BONUS;
      p.goldEarned += RANDOM_RACE_BONUS;
      this.emit({ e: 'bonus', t: this.time, p: p.id, gold: RANDOM_RACE_BONUS, reason: 'random race' });
    }
    return { ok: true };
  }

  /** Races that can be picked in this game (campaign stages may restrict them). */
  allowedRaces(): string[] {
    return this.rules.races?.length ? this.rules.races : RACES.map((r) => r.id);
  }

  private countLimit(p: Player, group: string): number {
    let n = 0;
    for (const t of this.towers.values()) if (t.owner === p.id && t.def.limitGroup === group) n++;
    return n;
  }

  towerCount(owner: number): number {
    let n = 0;
    for (const t of this.towers.values()) if (t.owner === owner) n++;
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
    const cost = towerCost(def, p.mods);
    if (p.gold < cost) return { ok: false, error: 'Not enough gold' };
    if (this.rules.maxTowers && this.towerCount(p.id) >= this.rules.maxTowers) return { ok: false, error: `No more stones: at most ${this.rules.maxTowers} towers here` };
    const lane = this.lanes[p.lane];
    const res = lane.grid.canPlace(x, y, this.occupiedCells(lane.index));
    if (!res.ok) return { ok: false, error: res.reason };
    p.gold -= cost;
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
      buildUntil: this.time + (def.tier === 1 && p.mods.quickWalls ? 0 : def.buildTime),
      cd: 0,
      mode: def.tier === 5 && def.id === 'sun_L' ? 'strong' : 'first',
      kills: 0,
      damage: 0,
      invested: cost,
      buildPhase: this.phase === 'build' ? this.phaseCounter : -1,
      level: 0,
      xp: 0,
      dmgMul: 1,
      spdMul: 1,
      xpMul: 1,
      beamTarget: -1,
      beamRamp: 1,
      pulseCd: 0,
      frozenUntil: 0,
    };
    this.towers.set(t.id, t);
    this.combat.refreshAuras(lane.index);
    this.horde.repathCreeps(lane.index);
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
      const cost = upgradeCost(def, p.mods);
      if (p.gold < cost) {
        err = 'Not enough gold';
        break;
      }
      p.gold -= cost;
      t.def = def;
      t.invested += cost;
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
      for (const lane of new Set(ids.map((id) => this.towers.get(id)?.lane).filter((l) => l !== undefined))) this.combat.refreshAuras(lane as number);
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
      const refund = Math.floor(t.invested * (undo ? 1 : sellRefund(p.mods)));
      p.gold += refund;
      if (t.def.tier === 5) {
        p.legends = p.legends.filter((l) => l !== t.def.id);
        if (undo) p.lumber += t.def.lumber ?? 1;
      }
      this.towers.delete(id);
      const lane = this.lanes[t.lane];
      // Anti-juggle: selling while creeps are marching leaves rubble until the wave ends.
      const rubble = this.phase === 'wave' && !p.mods.noRubble && this.weather !== 'warm' && lane.creeps.some((c) => c.alive && !c.air);
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
      this.combat.refreshAuras(l);
      this.horde.repathCreeps(l);
    }
    return sold ? { ok: true } : { ok: false, error: 'Nothing to sell' };
  }

  setConnected(playerId: number, connected: boolean): void {
    const p = this.player(playerId);
    if (p) p.connected = connected;
  }

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
    for (const c of [...this.creeps.values()]) this.horde.removeCreep(c);
    this.horde.spawnQueue = [];
    this.wave = Math.max(0, n - 1);
    this.phase = 'build';
    this.countdown = 2;
    this.emit({ e: 'wave', t: this.time, n: this.wave, phase: 'build' });
  }

  step(): void {
    if (this.over) return;
    this.time += DT;
    this.tick++;
    this.updatePhase();
    this.horde.updateSpawns();
    for (const lane of this.lanes) lane.creeps.length = 0;
    for (const c of this.creeps.values()) if (c.alive) this.lanes[c.lane].creeps.push(c);
    this.horde.updateCreeps();
    this.combat.updateAuraEffects();
    this.combat.updateFires();
    this.combat.resolveHits();
    this.combat.updateTowers();
    if (this.lives <= 0 && !this.over) {
      if (this.secondWind > 0 && !this.tyrantEscaped) {
        this.lives = Math.min(this.maxLives, this.secondWind);
        this.secondWind = 0;
        this.emit({ e: 'rally', t: this.time, lives: this.lives });
      } else this.finish(false);
    }
    const lastStand = this.lives <= this.maxLives * 0.25;
    if (lastStand !== this.lastStand) {
      this.lastStand = lastStand;
      if (this.players.some((p) => p.mods.lastStand)) for (const lane of this.lanes) this.combat.refreshAuras(lane.index);
    }
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
      const pendingForWave = this.horde.spawnQueue.some((s) => s.wave === this.wave);
      if (pendingForWave) return;
      const alive = this.horde.aliveByWave.get(this.wave) ?? 0;
      const isFinal = !this.settings.endless && this.wave >= this.finalWave;
      if (alive === 0) {
        // older overlapping waves still count before we can win
        if (isFinal) {
          if (this.creeps.size === 0) this.endWave(true);
        } else this.endWave(true);
      } else if (!isFinal && this.time - this.horde.lastSpawnAt > WAVE_FORCE_TIMEOUT) {
        this.endWave(false);
      }
    }
  }

  private waveInfo(n: number): { wave: WaveDef; creep: CreepDef } {
    if (n <= FINAL_WAVE) {
      const wave = wavesOf(this.settings.waves)[n - 1];
      return { wave, creep: CREEPS[wave.creep] };
    }
    const ew = endlessWave(n, this.settings.waves);
    if (!this.endlessDefs.some((d) => d.id === ew.creep.id)) {
      this.endlessDefs.push(ew.creep);
      this.emit({ e: 'endless', t: this.time, def: ew.creep });
    }
    return ew;
  }

  private startWave(n: number): void {
    this.wave = n;
    this.phase = 'wave';
    this.setWeather(this.rules.weather ?? (this.settings.weather === false ? 'clear' : weatherOf(this.seed, n)));
    for (const lane of this.lanes) {
      lane.waveLeaks = 0;
      lane.forgiven = 0;
      lane.avalanche = false;
    }
    // a warm wind melts the rubble; a blizzard piles snowdrifts across the path
    if (this.weather === 'warm') this.clearRubble();
    if (this.weather === 'blizzard') this.pileDrifts(n);
    this.phaseCounter++;
    for (const p of this.players) p.ready = false;
    const { wave } = this.waveInfo(n);
    let t = this.time;
    for (const lane of this.lanes) {
      let at = t + 0.2;
      if (wave.escort) {
        for (let i = 0; i < wave.escort.count; i++, at += 0.5) this.horde.spawnQueue.push({ at, lane: lane.index, def: wave.escort.creep, wave: n });
        at += 1.5;
      }
      const count = Math.max(1, Math.round(wave.count * (this.rules.countMul ?? 1)));
      const interval = wave.interval / Math.max(1, this.rules.countMul ?? 1);
      for (let i = 0; i < count; i++, at += interval) {
        // support creeps (hexers, wardens, drummers) walk in the ranks
        const def = wave.mix && (i + 1) % wave.mix.every === 0 ? wave.mix.creep : wave.creep;
        this.horde.spawnQueue.push({ at, lane: lane.index, def, wave: n });
      }
    }
    this.horde.spawnQueue.sort((a, b) => a.at - b.at);
    // under a blood moon the last creep of the wave in every lane is moon-touched
    if (this.weather === 'bloodmoon') {
      for (const lane of this.lanes) {
        const last = this.horde.spawnQueue.filter((s) => s.wave === n && s.lane === lane.index).pop();
        if (last) last.elite = true;
      }
    }
    this.emit({ e: 'wave', t: this.time, n, phase: 'wave' });
  }

  private endWave(cleared: boolean): void {
    const n = this.wave;
    this.payWaveBonus(n);
    this.payInterest();
    if (LUMBER_WAVES.includes(n)) {
      for (const p of this.players) p.lumber += 1;
      this.emit({ e: 'lumber', t: this.time, wave: n });
    }
    this.clearRubble();
    if (!this.settings.endless && n >= this.finalWave && cleared) {
      this.finish(true);
      return;
    }
    this.rewardCleanLanes(n);
    this.setWeather('clear');
    if (this.settings.omens !== false && isOmenWave(n, this.finalWave, this.settings.endless, this.rules.omenEvery)) this.offerOmens(n);
    this.phase = 'build';
    this.phaseCounter++;
    this.countdown = BETWEEN_WAVES;
    for (const p of this.players) p.ready = false;
    this.emit({ e: 'wave', t: this.time, n, phase: 'build' });
  }

  /** Clean Sweep and Night Vigil: a wave with no leak from your lane pays. */
  private rewardCleanLanes(n: number): void {
    for (const lane of this.lanes) {
      const p = this.player(lane.owner);
      if (!p || lane.waveLeaks > 0) continue;
      if (p.mods.sweepGold) {
        const gold = Math.round(p.mods.sweepGold * n);
        p.gold += gold;
        p.goldEarned += gold;
        this.emit({ e: 'bonus', t: this.time, p: p.id, gold, reason: 'clean sweep' });
      }
      if (p.mods.vigil) this.lives = Math.min(this.maxLives, this.lives + p.mods.vigil);
    }
  }

  /** Snowdrifts: a few blocks of snow on the creeps' path, never sealing it, gone when the wave ends. */
  private pileDrifts(n: number): void {
    for (const lane of this.lanes) {
      const rng = new Rng((this.seed ^ Math.imul(n, 2654435761) ^ Math.imul(lane.index + 1, 40503)) >>> 0);
      const grid = lane.grid;
      const path = grid.tracePath(grid.spawnCells[Math.floor(grid.spawnCells.length / 2)]);
      const occupied = this.occupiedCells(lane.index);
      const cells: number[] = [];
      for (let tries = 0, placed = 0; tries < 60 && placed < 3 && path.length > 8; tries++) {
        // somewhere along the middle of the path, so it matters
        const at = path[Math.floor(path.length * (0.2 + 0.6 * rng.next()))];
        const x = (at % grid.w) - (rng.next() < 0.5 ? 1 : 0);
        const y = Math.floor(at / grid.w) - (rng.next() < 0.5 ? 1 : 0);
        if (!grid.canPlace(x, y, occupied).ok) continue;
        grid.setFootprint(x, y, CELL_RUBBLE);
        const fp = grid.footprint(x, y);
        lane.rubble.push(...fp);
        cells.push(...fp);
        placed++;
      }
      if (!cells.length) continue;
      grid.recompute();
      this.horde.repathCreeps(lane.index);
      this.emit({ e: 'drift', t: this.time, lane: lane.index, cells });
    }
  }

  /** The weather of the wave in force; every player's bonuses follow it. */
  private setWeather(w: WeatherId): void {
    if (w === this.weather) return;
    this.weather = w;
    for (const p of this.players) this.refreshMods(p);
  }

  get weatherDef(): Weather {
    return WEATHERS[this.weather];
  }

  /** Recomputes what a player's bonuses add up to, and tells the clients. */
  private refreshMods(p: Player): void {
    p.mods = effectiveMods(p.baseMods, p.boons, this.weather);
    p.goldMul = p.baseGoldMul * (p.mods.bounty ?? 1);
    // towers keep their damage and speed multipliers: recompute them where this player builds
    for (const lane of this.lanes) if ([...this.towers.values()].some((t) => t.owner === p.id && t.lane === lane.index)) this.combat.refreshAuras(lane.index);
    this.emit({ e: 'mods', t: this.time, p: p.id, mods: p.mods });
  }

  /** The shrine after every fifth wave: three boons for each player to choose from. */
  private offerOmens(n: number): void {
    for (const p of this.players) {
      // an offer left unanswered is settled with its first boon
      if (p.omen) this.takeBoon(p, p.omen[0]);
      p.omen = omenOffers(this.seed, p.id, n, p.boons, 3 + (p.baseMods.omenChoices ?? 0));
      p.omenWave = n;
      this.emit({ e: 'omen', t: this.time, p: p.id, offers: [...p.omen], wave: n });
      if (p.isBot) this.takeBoon(p, botBoon(p.omen));
    }
  }

  takeBoon(p: Player, id: string): CommandResult {
    if (!p.omen || !p.omen.includes(id)) return { ok: false, error: 'The shrine offers no such boon' };
    const b = BOON_BY_ID[id];
    p.omen = null;
    p.boons.push(id);
    // gold that scales is worth what the card said when it was offered
    const gold = (b.goldPerWave ?? 0) * Math.max(1, p.omenWave ?? this.wave) + (b.now?.gold ?? 0);
    if (gold) {
      p.gold += gold;
      p.goldEarned += gold;
    }
    if (b.now?.lives) {
      this.lives += b.now.lives;
      this.maxLives += b.now.lives;
    }
    if (b.now?.lumber) p.lumber += b.now.lumber;
    this.emit({ e: 'boon', t: this.time, p: p.id, id });
    if (b.effects.length) this.refreshMods(p);
    return { ok: true };
  }

  /** The classic level bonus: 10 gold + 2 per wave, to everyone. */
  private payWaveBonus(n: number): void {
    const bonus = waveBonus(n);
    for (const p of this.players) {
      const g = Math.round(bonus * p.goldMul * (p.mods.waveBonus ?? 1));
      p.gold += g;
      p.goldEarned += g;
      this.emit({ e: 'bonus', t: this.time, p: p.id, gold: g, reason: `wave ${n}` });
    }
  }

  /** Vaults, shrines and the Dragon's Hoard talent pay out; life shrines mend the team. */
  private payInterest(): void {
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
      if (p.mods.interest) interest += Math.min(p.mods.interestCap ?? Infinity, Math.floor(bank * p.mods.interest));
      if (interest > 0) {
        p.gold += interest;
        p.goldEarned += interest;
        this.emit({ e: 'bonus', t: this.time, p: p.id, gold: interest, reason: 'interest' });
      }
    }
    if (livesBack > 0) this.lives = Math.min(this.maxLives, this.lives + livesBack);
  }

  /** Rubble left by towers sold mid-wave crumbles once the wave is over. */
  private clearRubble(): void {
    for (const lane of this.lanes) {
      if (lane.rubble.length === 0) continue;
      const cells = lane.rubble.filter((i) => lane.grid.cells[i] === CELL_RUBBLE);
      for (const i of cells) lane.grid.cells[i] = CELL_FREE;
      lane.rubble = [];
      lane.grid.recompute();
      this.horde.repathCreeps(lane.index);
      this.emit({ e: 'rubble', t: this.time, lane: lane.index, cells });
    }
  }

  private finish(victory: boolean): void {
    this.phase = victory ? 'victory' : 'defeat';
    this.emit({ e: 'wave', t: this.time, n: this.wave, phase: this.phase });
  }

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
      frozen: t.frozenUntil > this.time ? +t.frozenUntil.toFixed(2) : undefined,
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
    return this.players.map(({ goldMul: _g, mods: _m, baseMods: _b, baseGoldMul: _bg, ...p }) => ({ ...p, gold: Math.floor(p.gold), damage: Math.round(p.damage) }));
  }

  waveState(): WaveState {
    return {
      n: this.wave,
      phase: this.phase,
      countdown: Math.max(0, this.countdown),
      lives: this.lives,
      maxLives: this.maxLives,
      finalWave: this.settings.endless ? 0 : this.finalWave,
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
      weatherSeed: this.settings.weather === false ? undefined : this.seed,
      weatherForced: this.rules.weather,
      maxTowers: this.rules.maxTowers,
      races: this.rules.races?.length ? this.rules.races : undefined,
      mods: Object.fromEntries(this.players.filter((p) => Object.keys(p.mods).length).map((p) => [p.id, p.mods])),
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
    if (now < c.burrowUntil) f |= CREEP_FLAG.burrowed;
    if (c.def.frenzy && c.hp < c.maxHp * c.def.frenzy.below) f |= CREEP_FLAG.frenzied;
    if (c.haste > 0) f |= CREEP_FLAG.hasted;
    if (c.elite) f |= CREEP_FLAG.elite;
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
