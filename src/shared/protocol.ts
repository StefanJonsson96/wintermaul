// Messages between browser and server. Everything is JSON over one WebSocket.
import type { TargetMode } from './types';

export type Difficulty = 'casual' | 'normal' | 'hard' | 'brutal' | 'perfection';
export type RaceMode = 'pick' | 'double' | 'random' | 'same';

export interface GameSettings {
  difficulty: Difficulty;
  raceMode: RaceMode;
  endless: boolean;
  /** Players bring the talents they earned in the campaign (a lobby option, off by default). */
  talents?: boolean;
}

export const DIFFICULTIES: Record<Difficulty, { label: string; lives: number; perPlayer: number; hp: number; blurb: string }> = {
  casual: { label: 'Casual', lives: 60, perPlayer: 40, hp: 0.7, blurb: 'weaker creeps' },
  normal: { label: 'Normal', lives: 30, perPlayer: 20, hp: 1.0, blurb: 'the classic experience' },
  hard: { label: 'Hard', lives: 20, perPlayer: 12, hp: 1.2, blurb: '+20% creep health' },
  brutal: { label: 'Brutal', lives: 12, perPlayer: 8, hp: 1.4, blurb: '+40% creep health' },
  perfection: { label: 'Perfection', lives: 1, perPlayer: 0, hp: 1.0, blurb: 'one leak and it is over' },
};

/** Team lives: more lanes means more places to leak, so bigger teams get a few extra. */
export function startingLives(d: Difficulty, players: number): number {
  const def = DIFFICULTIES[d];
  return def.lives + def.perPlayer * Math.max(0, players - 1);
}

export const RACE_MODES: Record<RaceMode, { label: string; blurb: string }> = {
  pick: { label: 'All Pick', blurb: 'Choose your race. A second pick unlocks after wave 7.' },
  double: { label: 'All Pick Double', blurb: 'Start with two races.' },
  random: { label: 'All Random', blurb: 'Races are rolled for you. +15% gold.' },
  same: { label: 'Same Race', blurb: 'Everyone starts with the same random race.' },
};

// ---------------------------------------------------------------------------
// Game commands (client → server while playing)
export type GameCommand =
  | { c: 'build'; tower: string; x: number; y: number }
  | { c: 'upgrade'; ids: number[]; to: string }
  | { c: 'sell'; ids: number[] }
  | { c: 'target'; ids: number[]; mode: TargetMode }
  | { c: 'race'; race: string } // race id or 'random'
  | { c: 'ready'; value: boolean }
  | { c: 'gift'; to: number; amount: number }
  | { c: 'setup'; settings: Partial<GameSettings> } // the rule chooser only, during setup
  | { c: 'setupDone' };

// ---------------------------------------------------------------------------
// Replicated game state
export interface NetPlayer {
  id: number;
  name: string;
  color: number;
  isBot: boolean;
  connected: boolean;
  lane: number;
  gold: number;
  lumber: number;
  races: string[];
  legends: string[];
  kills: number;
  leaks: number;
  damage: number;
  goldEarned: number;
  ready: boolean;
}

export interface NetTower {
  id: number;
  def: string;
  owner: number;
  lane: number;
  x: number;
  y: number;
  buildStart: number;
  buildUntil: number;
  mode: TargetMode;
  kills: number;
  damage: number;
  invested: number;
  level: number;
  xp: number;
}

export interface NetCreep {
  id: number;
  def: string;
  lane: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  leakedFrom: number;
  wave: number;
}

export interface WaveState {
  n: number; // current (or last started) wave
  phase: 'setup' | 'build' | 'wave' | 'victory' | 'defeat';
  countdown: number; // seconds until next wave (build phase)
  lives: number;
  maxLives: number;
  finalWave: number;
  chooser: number; // player who picks the rules during setup (-1 = none)
}

export interface FullState {
  time: number;
  settings: GameSettings;
  players: NetPlayer[];
  laneOwners: number[];
  towers: NetTower[];
  creeps: NetCreep[];
  rubble: { lane: number; cells: number[] }[];
  wave: WaveState;
  endlessDefs: import('./types').CreepDef[];
  /** The races that can be picked, when a stage limits them. */
  races?: string[];
  /** Talent bonuses by player id (only players that have any). */
  mods?: Record<number, import('./sim/mods').PlayerMods>;
}

/** Things that happen, in order. Sent inside snapshots. */
export type GameEvent =
  | { e: 'spawn'; t: number; creep: NetCreep }
  | { e: 'die'; t: number; id: number; by: number; gold: number; exec?: boolean }
  | { e: 'leak'; t: number; id: number; from: number; to: number; cost: number; escaped: boolean; x: number; y: number }
  | { e: 'build'; t: number; tower: NetTower }
  | { e: 'upgrade'; t: number; id: number; def: string; buildStart: number; buildUntil: number; invested: number }
  | { e: 'sell'; t: number; id: number; refund: number; rubble: boolean }
  | { e: 'rubble'; t: number; lane: number; cells: number[] } // rubble cleared (cells empty now) or set
  | { e: 'shot'; t: number; tw: number; c: number; d: number; k: string; x?: number; y?: number }
  | { e: 'chain'; t: number; tw: number; ids: number[]; d: number }
  | { e: 'line'; t: number; tw: number; x: number; y: number }
  | { e: 'impact'; t: number; tw: number; x: number; y: number; r: number; lane: number }
  | { e: 'pulse'; t: number; tw: number }
  | { e: 'crit'; t: number; id: number; amount: number }
  | { e: 'level'; t: number; tw: number; level: number }
  | { e: 'mode'; t: number; ids: number[]; mode: TargetMode }
  | { e: 'fire'; t: number; lane: number; x: number; y: number; r: number; until: number }
  | { e: 'wave'; t: number; n: number; phase: WaveState['phase'] }
  | { e: 'race'; t: number; p: number; race: string }
  | { e: 'lumber'; t: number; wave: number }
  | { e: 'bonus'; t: number; p: number; gold: number; reason: string }
  | { e: 'gift'; t: number; from: number; to: number; amount: number }
  | { e: 'split'; t: number; id: number }
  | { e: 'heal'; t: number; id: number }
  | { e: 'endless'; t: number; def: import('./types').CreepDef }
  | { e: 'rally'; t: number; lives: number }
  | { e: 'setup'; t: number; settings: GameSettings; done: boolean; lives: number; finalWave: number };

/** Compact per-tick state. Creeps: flat array of [id, lane, x*100, y*100, hp, flags] per creep. */
export interface Snapshot {
  t: number;
  c: number[];
  p: number[]; // per player: gold, lumber, kills, leaks, ready(0/1), connected(0/1)
  w: [number, number, number, number]; // wave n, phase index, countdown*10, lives
  b: number[]; // beams: towerId, creepId, ramp*100
  ev: GameEvent[];
  /** Game speed when it is not 1 (0 = paused), so clients can keep their clocks in step. */
  sp?: number;
}

export const PHASES: WaveState['phase'][] = ['setup', 'build', 'wave', 'victory', 'defeat'];
export const SNAP_CREEP_STRIDE = 6;

export const CREEP_FLAG = {
  slowed: 1,
  stunned: 2,
  poisoned: 4,
  burning: 8,
  cursed: 16,
  rooted: 32,
  sundered: 64,
  shielded: 128,
};

// ---------------------------------------------------------------------------
// Lobby
export interface LobbyPlayer {
  id: number; // slot
  name: string;
  color: number;
  isBot: boolean;
  ready: boolean;
  host: boolean;
  connected: boolean;
  /** Runestones the player has spent on talents. */
  talents: number;
}

export interface RoomInfo {
  code: string;
  name: string;
  players: number;
  max: number;
  state: 'lobby' | 'playing' | 'ended';
  settings: GameSettings;
  public: boolean;
}

export interface RoomState {
  code: string;
  name: string;
  public: boolean;
  state: 'lobby' | 'playing' | 'ended';
  settings: GameSettings;
  players: LobbyPlayer[];
  you: number;
}

export interface ChatLine {
  from: number; // slot, -1 = system
  name: string;
  text: string;
  color: number;
  t: number;
}

export type ClientMsg =
  | { type: 'hello'; name: string; token?: string }
  | { type: 'list' }
  | { type: 'create'; name?: string; public: boolean; settings?: Partial<GameSettings> }
  | { type: 'join'; code: string }
  | { type: 'quick' }
  | { type: 'leave' }
  | { type: 'rename'; name: string }
  | { type: 'settings'; settings: Partial<GameSettings>; public?: boolean }
  | { type: 'ready'; value: boolean }
  | { type: 'color'; color: number }
  | { type: 'addBot' }
  | { type: 'kick'; slot: number }
  | { type: 'start' }
  | { type: 'chat'; text: string }
  | { type: 'ping'; lane: number; x: number; y: number }
  | { type: 'cmd'; cmd: GameCommand }
  | { type: 'playAgain' }
  /** The player's campaign talents (used when the room allows them). */
  | { type: 'talents'; loadout: Record<string, number> };

export type ServerMsg =
  | { type: 'welcome'; id: string; token: string; name: string; version: string }
  | { type: 'rooms'; rooms: RoomInfo[] }
  | { type: 'room'; room: RoomState }
  | { type: 'left' }
  | { type: 'error'; message: string }
  | { type: 'chat'; line: ChatLine }
  | { type: 'ping'; from: number; lane: number; x: number; y: number }
  | { type: 'start'; you: number; state: FullState }
  | { type: 'snap'; s: Snapshot }
  | { type: 'cmdError'; message: string }
  | { type: 'gameOver'; victory: boolean; stats: EndStats };

export interface EndStats {
  wave: number;
  lives: number;
  duration: number;
  players: { id: number; name: string; color: number; races: string[]; kills: number; leaks: number; damage: number; goldEarned: number; mvpTower: string | null }[];
}
