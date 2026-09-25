// The talent tree: runestones earned in the campaign buy permanent bonuses. Talents are data
// (what a rank does to PlayerMods), so the campaign, multiplayer and the tests share them.
import { RACES } from './data/races';
import type { PlayerMods } from './sim/mods';
import type { DamageType } from './types';

export type BranchId = 'arsenal' | 'alchemy' | 'fortune' | 'bulwark' | 'kinship';

export interface Branch {
  id: BranchId;
  name: string;
  color: string;
  blurb: string;
}

export const BRANCHES: Branch[] = [
  { id: 'arsenal', name: 'Arsenal', color: '#ff8a5c', blurb: 'Raw firepower: damage, range and speed.' },
  { id: 'alchemy', name: 'Alchemy', color: '#7be07b', blurb: 'Poison, fire, frost and stuns.' },
  { id: 'fortune', name: 'Fortune', color: '#ffd35a', blurb: 'Gold in, gold back, and a head start.' },
  { id: 'bulwark', name: 'Bulwark', color: '#7fb6ff', blurb: 'Lives, delays and a second chance.' },
  { id: 'kinship', name: 'Kinship', color: '#c79bff', blurb: 'Mastery of the races you love.' },
];

export interface Talent {
  id: string;
  branch: BranchId;
  name: string;
  /** Glyph drawn on the talent's icon. */
  glyph: string;
  max: number;
  /** Runestones per rank. */
  cost: number;
  /** Runestones that must already be spent in the branch before this talent opens. */
  gate: number;
  row: number;
  col: number;
  /** What the talent does at a given rank (1..max). */
  text: (rank: number) => string;
  apply: (m: PlayerMods, rank: number) => void;
  /** Kinship talents belong to one race. */
  race?: string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const mul = (m: PlayerMods, key: 'dmg' | 'poison' | 'burn' | 'speed' | 'range' | 'slow' | 'stun' | 'bounty' | 'waveBonus', v: number) => {
  m[key] = (m[key] ?? 1) * (1 + v);
};
const add = (m: PlayerMods, key: 'startGold' | 'startLumber' | 'lives' | 'refund' | 'wallDiscount' | 'bossLeak' | 'creepSlow' | 'prep' | 'crit' | 'lastStand' | 'secondWind' | 'spread' | 'frostbite', v: number) => {
  m[key] = (m[key] ?? 0) + v;
};
const typeMul = (type: DamageType, v: number) => (m: PlayerMods, r: number) => {
  m.dmgType = { ...m.dmgType, [type]: (m.dmgType?.[type] ?? 1) * (1 + v * r) };
};

const CORE: Talent[] = [
  // ── Arsenal
  { id: 'honed', branch: 'arsenal', name: 'Honed Steel', glyph: 'sword', max: 5, cost: 1, gate: 0, row: 0, col: 0, text: (r) => `All towers deal +${pct(0.02 * r)} damage.`, apply: (m, r) => mul(m, 'dmg', 0.02 * r) },
  { id: 'eagle', branch: 'arsenal', name: 'Eagle Eye', glyph: 'eye', max: 3, cost: 1, gate: 0, row: 0, col: 2, text: (r) => `+${pct(0.03 * r)} attack range.`, apply: (m, r) => mul(m, 'range', 0.03 * r) },
  { id: 'pierce', branch: 'arsenal', name: 'Broadheads', glyph: 'arrow', max: 3, cost: 1, gate: 4, row: 1, col: 0, text: (r) => `+${pct(0.05 * r)} Pierce damage.`, apply: typeMul('pierce', 0.05) },
  { id: 'impact', branch: 'arsenal', name: 'Siegecraft', glyph: 'hammer', max: 3, cost: 1, gate: 4, row: 1, col: 1, text: (r) => `+${pct(0.05 * r)} Impact damage.`, apply: typeMul('impact', 0.05) },
  { id: 'magic', branch: 'arsenal', name: 'Spellweaving', glyph: 'star', max: 3, cost: 1, gate: 4, row: 1, col: 2, text: (r) => `+${pct(0.05 * r)} Magic damage.`, apply: typeMul('magic', 0.05) },
  { id: 'elemental', branch: 'arsenal', name: 'Primal Fury', glyph: 'flame', max: 3, cost: 1, gate: 8, row: 2, col: 0, text: (r) => `+${pct(0.05 * r)} Elemental damage.`, apply: typeMul('elemental', 0.05) },
  { id: 'pure', branch: 'arsenal', name: 'Clarity', glyph: 'gem', max: 3, cost: 1, gate: 8, row: 2, col: 1, text: (r) => `+${pct(0.05 * r)} Pure damage.`, apply: typeMul('pure', 0.05) },
  { id: 'quick', branch: 'arsenal', name: 'Quick Hands', glyph: 'bolt', max: 3, cost: 1, gate: 8, row: 2, col: 2, text: (r) => `+${pct(0.02 * r)} attack speed.`, apply: (m, r) => mul(m, 'speed', 0.02 * r) },
  { id: 'deadeye', branch: 'arsenal', name: 'Deadeye', glyph: 'target', max: 1, cost: 3, gate: 14, row: 3, col: 1, text: () => 'Every attack has a 5% chance to deal double damage.', apply: (m) => add(m, 'crit', 0.05) },

  // ── Alchemy
  { id: 'virulence', branch: 'alchemy', name: 'Virulence', glyph: 'drop', max: 3, cost: 1, gate: 0, row: 0, col: 0, text: (r) => `Poison deals +${pct(0.1 * r)} damage.`, apply: (m, r) => mul(m, 'poison', 0.1 * r) },
  { id: 'kindling', branch: 'alchemy', name: 'Kindling', glyph: 'flame', max: 3, cost: 1, gate: 0, row: 0, col: 2, text: (r) => `Burns and burning ground deal +${pct(0.1 * r)} damage.`, apply: (m, r) => mul(m, 'burn', 0.1 * r) },
  { id: 'chill', branch: 'alchemy', name: 'Deep Chill', glyph: 'snow', max: 3, cost: 1, gate: 3, row: 1, col: 0, text: (r) => `Your slows are ${pct(0.08 * r)} stronger.`, apply: (m, r) => mul(m, 'slow', 0.08 * r) },
  { id: 'concussion', branch: 'alchemy', name: 'Concussion', glyph: 'star', max: 3, cost: 1, gate: 3, row: 1, col: 2, text: (r) => `Stuns, freezes and roots last ${pct(0.12 * r)} longer.`, apply: (m, r) => mul(m, 'stun', 0.12 * r) },
  { id: 'contagion', branch: 'alchemy', name: 'Contagion', glyph: 'skull', max: 2, cost: 2, gate: 6, row: 2, col: 1, text: (r) => `Poison jumps to creeps within ${r === 1 ? '1.2' : '1.8'} cells when its carrier dies.`, apply: (m, r) => add(m, 'spread', r === 1 ? 1.2 : 1.8) },
  { id: 'frostbite', branch: 'alchemy', name: 'Frostbite', glyph: 'crystal', max: 1, cost: 3, gate: 10, row: 3, col: 1, text: () => 'Slowed creeps take +10% damage from your towers.', apply: (m) => add(m, 'frostbite', 0.1) },

  // ── Fortune
  { id: 'warchest', branch: 'fortune', name: 'War Chest', glyph: 'chest', max: 5, cost: 1, gate: 0, row: 0, col: 0, text: (r) => `Start every game with +${8 * r} gold.`, apply: (m, r) => add(m, 'startGold', 8 * r) },
  { id: 'bounty', branch: 'fortune', name: 'Bounty Hunter', glyph: 'coin', max: 5, cost: 1, gate: 0, row: 0, col: 2, text: (r) => `Kills pay +${pct(0.03 * r)} gold.`, apply: (m, r) => mul(m, 'bounty', 0.03 * r) },
  { id: 'tithe', branch: 'fortune', name: 'Tithe', glyph: 'scroll', max: 3, cost: 1, gate: 5, row: 1, col: 0, text: (r) => `The end-of-wave bonus pays +${pct(0.1 * r)}.`, apply: (m, r) => mul(m, 'waveBonus', 0.1 * r) },
  { id: 'salvage', branch: 'fortune', name: 'Salvage', glyph: 'gear', max: 3, cost: 1, gate: 5, row: 1, col: 2, text: (r) => `Selling refunds ${pct(0.75 + 0.05 * r)} instead of 75%.`, apply: (m, r) => add(m, 'refund', 0.05 * r) },
  { id: 'mason', branch: 'fortune', name: 'Master Mason', glyph: 'brick', max: 2, cost: 1, gate: 9, row: 2, col: 0, text: (r) => `Tier-1 towers cost ${r} gold less.`, apply: (m, r) => add(m, 'wallDiscount', r) },
  { id: 'hoard', branch: 'fortune', name: "Dragon's Hoard", glyph: 'crown', max: 2, cost: 1, gate: 9, row: 2, col: 2, text: (r) => `After each wave, ${r}% interest on your gold (at most ${15 * r}).`, apply: (m, r) => ((m.interest = 0.01 * r), (m.interestCap = 15 * r)) },
  { id: 'timber', branch: 'fortune', name: 'Timber Rights', glyph: 'tree', max: 1, cost: 3, gate: 13, row: 3, col: 1, text: () => 'Start every game with +1 lumber: an extra race, or an early Legend.', apply: (m) => add(m, 'startLumber', 1) },

  // ── Bulwark
  { id: 'hearts', branch: 'bulwark', name: 'Stout Hearts', glyph: 'heart', max: 5, cost: 1, gate: 0, row: 0, col: 0, text: (r) => `+${2 * r} lives.`, apply: (m, r) => add(m, 'lives', 2 * r) },
  { id: 'scouts', branch: 'bulwark', name: 'Scouts', glyph: 'eye', max: 2, cost: 1, gate: 0, row: 0, col: 2, text: (r) => `+${10 * r} seconds before the first wave.`, apply: (m, r) => add(m, 'prep', 10 * r) },
  { id: 'snow', branch: 'bulwark', name: 'Deep Snow', glyph: 'snow', max: 3, cost: 1, gate: 3, row: 1, col: 0, text: (r) => `Creeps in your lane walk ${2 * r}% slower.`, apply: (m, r) => add(m, 'creepSlow', 0.02 * r) },
  { id: 'gate', branch: 'bulwark', name: 'Hold the Gate', glyph: 'shield', max: 2, cost: 1, gate: 3, row: 1, col: 2, text: (r) => `Bosses cost ${r} ${r === 1 ? 'life' : 'lives'} less when they leak.`, apply: (m, r) => add(m, 'bossLeak', r) },
  { id: 'laststand', branch: 'bulwark', name: 'Last Stand', glyph: 'banner', max: 3, cost: 1, gate: 6, row: 2, col: 1, text: (r) => `Towers deal +${pct(0.08 * r)} damage while you are down to a quarter of your lives.`, apply: (m, r) => add(m, 'lastStand', 0.08 * r) },
  { id: 'secondwind', branch: 'bulwark', name: 'Second Wind', glyph: 'wing', max: 1, cost: 3, gate: 10, row: 3, col: 1, text: () => 'Once per game, when you would lose, rally with 10 lives. (Not when the Winter Tyrant escapes.)', apply: (m) => add(m, 'secondWind', 10) },
];

const KINSHIP: Talent[] = RACES.map((r, i) => ({
  id: `kin_${r.id}`,
  branch: 'kinship' as const,
  name: r.name,
  glyph: `race:${r.id}`,
  race: r.id,
  max: 3,
  cost: 1,
  gate: 0,
  row: Math.floor(i / 4),
  col: i % 4,
  text: (rank: number) => `${r.name} towers deal +${pct(0.04 * rank)} damage.`,
  apply: (m: PlayerMods, rank: number) => {
    m.dmgRace = { ...m.dmgRace, [r.id]: (m.dmgRace?.[r.id] ?? 1) * (1 + 0.04 * rank) };
  },
}));

export const TALENTS: Talent[] = [...CORE, ...KINSHIP];
export const TALENT_BY_ID: Record<string, Talent> = Object.fromEntries(TALENTS.map((t) => [t.id, t]));

/** Talent ranks by talent id. */
export type Loadout = Record<string, number>;

/** Runestones needed to buy every rank of every talent. */
export const TREE_COST = TALENTS.reduce((n, t) => n + t.max * t.cost, 0);

export function spentIn(branch: BranchId, l: Loadout): number {
  let n = 0;
  for (const [id, rank] of Object.entries(l)) {
    const t = TALENT_BY_ID[id];
    if (t && t.branch === branch) n += rank * t.cost;
  }
  return n;
}

export function totalSpent(l: Loadout): number {
  let n = 0;
  for (const [id, rank] of Object.entries(l)) n += rank * (TALENT_BY_ID[id]?.cost ?? 0);
  return n;
}

/** Why a rank cannot be bought right now, or null if it can. */
export function rankUpBlocker(t: Talent, l: Loadout, available: number): string | null {
  const rank = l[t.id] ?? 0;
  if (rank >= t.max) return 'Fully learned';
  const spent = spentIn(t.branch, l);
  if (spent < t.gate) return `Spend ${t.gate - spent} more in ${BRANCHES.find((b) => b.id === t.branch)!.name} to unlock`;
  if (available < t.cost) return `Needs ${t.cost} runestone${t.cost > 1 ? 's' : ''}`;
  return null;
}

/**
 * Keeps only ranks that are possible: known talents, within their maximum, with every gate met
 * (checked in gate order) and no more than `budget` runestones in total. Used on anything that
 * comes from a save file or over the network.
 */
export function sanitizeLoadout(raw: unknown, budget = TREE_COST): Loadout {
  const out: Loadout = {};
  if (!raw || typeof raw !== 'object') return out;
  const wanted = raw as Record<string, unknown>;
  let left = budget;
  for (const t of [...TALENTS].sort((a, b) => a.gate - b.gate)) {
    const v = wanted[t.id];
    let rank = typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(t.max, Math.floor(v))) : 0;
    if (rank === 0 || spentIn(t.branch, out) < t.gate) continue;
    rank = Math.min(rank, Math.floor(left / t.cost));
    if (rank <= 0) continue;
    out[t.id] = rank;
    left -= rank * t.cost;
  }
  return out;
}

/** The simulation bonuses a loadout grants. */
export function modsFromLoadout(l: Loadout): PlayerMods {
  const m: PlayerMods = {};
  for (const [id, rank] of Object.entries(l)) {
    const t = TALENT_BY_ID[id];
    if (t && rank > 0) t.apply(m, Math.min(rank, t.max));
  }
  return m;
}
