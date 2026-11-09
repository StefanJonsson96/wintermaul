// The simulation's entities. Plain data: the systems in game.ts, horde.ts and combat.ts act on them.
import type { LaneGrid } from '../grid';
import type { NetPlayer } from '../protocol';
import type { CreepDef, TargetMode, TowerDef } from '../types';
import type { PlayerMods } from './mods';

/** Per-game rule changes for tutorials, campaign stages and the like. */
export interface GameRules {
  /** The game is won after this wave (default 40). */
  finalWave?: number;
  startGold?: number;
  startLumber?: number;
  /** Fixed team lives instead of the difficulty's. */
  lives?: number;
  /** Multipliers on creep health, creep speed and kill gold. */
  hpMul?: number;
  speedMul?: number;
  bountyMul?: number;
  firstWaveDelay?: number;
  /** Only these races can be picked. */
  races?: string[];
  /** Start at this wave instead of wave 1 (a stage that joins the siege late). */
  firstWave?: number;
  /** Stage mutators: extra creep regeneration (fraction of max health per second), extra armor, more or fewer creeps per wave. */
  regen?: number;
  armor?: number;
  countMul?: number;
  /** Every wave has this weather (whatever the rules dialog says). */
  weather?: import('./omens').WeatherId;
  /** Shrines come after every this many waves instead of five. */
  omenEvery?: number;
  /** At most this many towers per player. */
  maxTowers?: number;
  /** Talent bonuses by player id. */
  mods?: Record<number, PlayerMods>;
}

export interface PlayerInit {
  id: number;
  name: string;
  color: number;
  isBot: boolean;
}

export interface Player extends NetPlayer {
  goldMul: number;
  /** Bonuses in force: own (talents, relics) plus boons and weather. */
  mods: PlayerMods;
  /** Their own bonuses, and the gold multiplier before bonuses. */
  baseMods: PlayerMods;
  baseGoldMul: number;
  boons: string[];
  omen: string[] | null;
}

export interface Dot {
  key: string;
  kind: 'poison' | 'burn';
  dps: number; // per stack
  stacks: number;
  until: number;
  owner: number;
  tower: number;
}

export interface Sunder {
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
  /** Out of reach (underground, or in the mist) until this time. */
  burrowUntil: number;
  /** When the creep next burrows, blinks, breeds, wards or freezes a tower. */
  nextBurrow: number;
  nextBlink: number;
  nextBrood: number;
  nextWard: number;
  nextFreeze: number;
  /** Broods it has dropped so far. */
  broods: number;
  /** Extra speed from war drums this tick. */
  haste: number;
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
  /** Frozen solid by a hexer (no attacks or pulses) until this time. */
  frozenUntil: number;
}

export interface Lane {
  index: number;
  owner: number;
  grid: LaneGrid;
  rubble: number[];
  creeps: Creep[]; // rebuilt every tick
}

export type CommandResult = { ok: true } | { ok: false; error: string };
