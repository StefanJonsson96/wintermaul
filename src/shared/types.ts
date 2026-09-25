// Data definitions for races, towers, creeps and waves.

export type DamageType = 'pierce' | 'impact' | 'magic' | 'elemental' | 'pure';
export type ArmorType = 'light' | 'medium' | 'heavy' | 'fortified' | 'spirit';
export type TargetKind = 'ground' | 'air' | 'both';
export type TargetMode = 'first' | 'last' | 'strong' | 'weak' | 'close';
export const TARGET_MODES: TargetMode[] = ['first', 'last', 'strong', 'weak', 'close'];

/** Visual projectile family; the client decides how each looks. */
export type ProjectileKind =
  | 'bolt' // generic glowing bolt
  | 'arrow'
  | 'bullet'
  | 'rock'
  | 'fireball'
  | 'meteor'
  | 'frost'
  | 'poison'
  | 'arcane'
  | 'shadow'
  | 'holy'
  | 'thorn'
  | 'coin'
  | 'crystal'
  | 'missile'
  | 'lightning' // instant
  | 'beam' // continuous
  | 'rail' // instant line
  | 'flame' // instant cone/line of fire
  | 'none';

export interface OnHit {
  slow?: { pct: number; dur: number };
  stun?: { chance: number; dur: number };
  root?: { chance: number; dur: number };
  dot?: { dps: number; dur: number; maxStacks: number; kind: 'poison' | 'burn' };
  sunder?: { armor: number; dur: number; maxStacks: number };
  amplify?: { pct: number; dur: number };
  /** Removes pct of current HP (bosses take bossPct instead). */
  percentCurrent?: { pct: number; bossPct: number };
  /** Kills a non-boss creep outright when its HP falls below this fraction. */
  execute?: number;
  knockback?: { cells: number; chance: number };
  /** Damage multiplier against stunned/frozen targets. */
  shatter?: number;
  bonusVsAir?: number;
  bonusVsArmor?: Partial<Record<ArmorType, number>>;
  /** Poison spreads to creeps within this radius when the carrier dies. */
  spreadOnDeath?: number;
}

export interface AttackDef {
  dmg: [number, number];
  cd: number; // seconds between attacks
  range: number; // cells (from tower centre)
  type: DamageType;
  targets: TargetKind;
  proj: ProjectileKind;
  projSpeed?: number; // cells/s; missing or 0 = instant
  splash?: number; // radius in cells
  splashFalloff?: number; // damage fraction at the splash edge (default 0.4)
  multishot?: number; // attack N different targets
  chain?: { count: number; range: number; falloff: number };
  line?: boolean; // pierces every enemy along the line to max range
  crit?: { chance: number; mult: number };
  onHit?: OnHit;
  /** Continuous beam: dmg is damage per second, ramping while locked on one target. */
  beam?: { ramp: number; maxMult: number; keepOnKill: number };
  /** Random damage roll uses a flat distribution between dmg[0] and dmg[1] (always true). */
  groundFire?: { dps: number; dur: number; radius: number };
  /** Damage bonus = min(max, gold * pct). */
  goldScaling?: { pct: number; max: number };
}

export interface PulseDef {
  every: number;
  radius: number;
  targets: TargetKind;
  dmg?: number;
  type?: DamageType;
  onHit?: OnHit;
  /** Drags enemies this many cells back along their path. */
  pull?: number;
  /** Kills every non-boss enemy in the radius; bosses lose bossPct of current HP. */
  annihilate?: { bossPct: number };
  /** Hits at most N enemies (nearest first). 0/undefined = all. */
  maxTargets?: number;
}

export interface AuraDef {
  radius: number;
  towerDmgPct?: number;
  towerSpdPct?: number;
  towerRangePct?: number;
  xpRate?: number;
  enemySlowPct?: number;
  enemyDps?: number; // true damage per second to enemies in radius
  enemyAmplify?: number;
}

export interface EconDef {
  killGold?: number; // extra gold per kill by this tower
  killGoldChance?: number; // chance for killGold (default 1)
  interestPct?: number; // % of banked gold paid at end of wave
  interestCap?: number;
  perWave?: number; // flat gold per cleared wave
  lifePerWave?: number; // restores team lives per cleared wave (capped at start lives)
}

export interface TowerArt {
  shape:
    | 'crystal'
    | 'turret'
    | 'orb'
    | 'totem'
    | 'brazier'
    | 'coil'
    | 'tree'
    | 'mortar'
    | 'obelisk'
    | 'vault'
    | 'spire'
    | 'rock'
    | 'pool'
    | 'shrine';
  primary: string;
  secondary: string;
  glow: string;
}

export interface TowerDef {
  id: string;
  name: string;
  race: string;
  tier: 1 | 2 | 3 | 4 | 5; // 5 = Legend
  cost: number; // gold to build (tier 1 / legend) or to upgrade from `parent`
  lumber?: number;
  parent?: string;
  upgrades: string[]; // derived
  buildTime: number;
  attack?: AttackDef;
  pulse?: PulseDef;
  aura?: AuraDef;
  econ?: EconDef;
  growth?: { xpPerLevel: number; maxLevel: number; dmgPerLevel: number };
  limit?: number; // max per player (shared by every tower with the same limitGroup)
  limitGroup?: string;
  desc: string;
  art: TowerArt;
}

export interface RaceDef {
  id: string;
  name: string;
  element: string;
  difficulty: 1 | 2 | 3;
  tags: string[];
  blurb: string;
  color: string;
  accent: string;
  icon: string; // single emoji-free glyph key for the emblem renderer
}

export type CreepShape =
  | 'hare'
  | 'wolf'
  | 'boar'
  | 'biped'
  | 'troll'
  | 'spider'
  | 'bird'
  | 'wisp'
  | 'golem'
  | 'crab'
  | 'wraith'
  | 'dragon'
  | 'knight'
  | 'beetle'
  | 'bat'
  | 'elemental'
  | 'giant'
  | 'boss';

export interface CreepDef {
  id: string;
  name: string;
  hp: number;
  armor: number;
  armorType: ArmorType;
  speed: number; // cells per second
  bounty: number;
  leak: number; // lives lost when it leaks
  air?: boolean;
  boss?: boolean;
  immune?: boolean; // ignores slows, stuns, roots and pulls
  regen?: number; // fraction of max HP per second
  shield?: number; // fraction of max HP absorbed by a shield first
  split?: { into: string; count: number };
  heal?: { every: number; radius: number; pct: number };
  size: number; // visual radius in cells
  shape: CreepShape;
  colors: [string, string, string]; // body, accent, detail
}

export interface WaveDef {
  n: number;
  creep: string;
  count: number;
  interval: number; // seconds between spawns
  escort?: { creep: string; count: number };
  title: string;
  hint: string;
}
