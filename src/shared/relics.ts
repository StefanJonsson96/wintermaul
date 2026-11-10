// Relics: keepsakes won with achievements. A player carries one into a game (two, once twelve
// achievements are earned); each is a small, flavoured bonus, some with a price. They count in
// the campaign, in skirmish, and online when the host allows campaign talents.
import type { PlayerMods } from './sim/mods';
import { E, type Effect } from './talents';

export interface Relic {
  id: string;
  name: string;
  /** A line of lore. */
  flavor: string;
  /** The achievement that unlocks it. */
  feat: string;
  /** Icon, from the client's icon set. */
  icon: string;
  effects: Effect[];
}

const gift = (n: number): Effect => E.gold(n);

export const RELICS: Relic[] = [
  { id: 'hearthstone', name: 'Hearthstone Shard', feat: 'first_win', icon: 'flame', flavor: 'Still warm from the first fire you kept alive.', effects: [gift(80)] },
  { id: 'tooth', name: "Tyrant's Tooth", feat: 'boss', icon: 'crown', flavor: 'Big things fall hardest.', effects: [E.vsBoss(0.2)] },
  { id: 'banner', name: 'Tricolour Banner', feat: 'three_races', icon: 'banner', flavor: 'Three peoples, one wall.', effects: [E.lumber(1), E.leakMul(0.25)] },
  { id: 'crown', name: 'Crown of Old Kings', feat: 'legend', icon: 'crown', flavor: 'It remembers how to rule.', effects: [E.damage(0.05), E.speed(0.05)] },
  { id: 'whetstone', name: 'Veteran\'s Whetstone', feat: 'veteran', icon: 'sword', flavor: 'Worn hollow by a hundred winters.', effects: [E.crit(0.05)] },
  { id: 'chalk', name: "Cartographer's Chalk", feat: 'maze_200', icon: 'maze', flavor: 'Every line on the snow is a mile for them.', effects: [E.creepSlow(0.05)] },
  { id: 'horn', name: 'Minotaur Horn', feat: 'maze_300', icon: 'maze', flavor: 'Whoever built the first maze kept this.', effects: [{ text: '+1% damage for every 20 cells your maze makes the creeps walk past 60 (at most +12%)', apply: (m) => (m.mazeDmg = true) }] },
  { id: 'level', name: "Mason's Level", feat: 'towers_100', icon: 'brick', flavor: 'True walls, cheaply laid.', effects: [{ text: 'Selling never leaves rubble, even mid-wave', apply: (m) => (m.noRubble = true) }, E.walls(1)] },
  { id: 'purse', name: "Dragon's Purse", feat: 'hoard', icon: 'coin', flavor: 'Gold breeds gold, if you let it sleep.', effects: [E.interest(0.04, 80)] },
  { id: 'hook', name: "Butcher's Hook", feat: 'kills_1000', icon: 'skull', flavor: 'Every carcass has a price.', effects: [E.bounty(0.08)] },
  { id: 'wardstone', name: 'Ward Stone', feat: 'flawless', icon: 'shield', flavor: 'Nothing passed it. Nothing will.', effects: [{ text: 'The first leak of every wave costs no lives (not a boss)', apply: (m) => (m.mercy = (m.mercy ?? 0) + 1) }, E.damage(-0.05)] },
  { id: 'candle', name: 'Last Candle', feat: 'last_life', icon: 'heart', flavor: 'One flame is enough to start again.', effects: [E.secondWind(10)] },
  { id: 'rimecrown', name: 'Rime Crown', feat: 'full_hard', icon: 'snow', flavor: 'Cold enough to slow the heart.', effects: [E.slow(0.3), E.slowDur(0.35)] },
  { id: 'heart', name: 'Heart of Winter', feat: 'full_brutal', icon: 'gem', flavor: 'It beats once a year, and hates you.', effects: [E.damage(0.15), E.leakMul(1)] },
  { id: 'lily', name: 'Thaw Lily', feat: 'full_thaw', icon: 'drop', flavor: 'It blooms in rot and fire.', effects: [E.poison(0.45), E.burn(0.45)] },
  { id: 'lantern', name: 'Night Lantern', feat: 'endless_50', icon: 'eye', flavor: 'It shows a little further into the dark.', effects: [{ text: 'Creeps that leak out of your lane lose 25% of their health', apply: (m) => (m.undertow = 1 - (1 - (m.undertow ?? 0)) * 0.75) }, E.range(0.03)] },
  { id: 'sigil', name: 'Starfall Sigil', feat: 'endless_60', icon: 'star', flavor: 'Fast as falling stars, and as careless.', effects: [E.speed(0.12), E.bounty(-0.05)] },
  { id: 'oathband', name: 'Oathband', feat: 'coop_win', icon: 'people', flavor: 'Sworn on a shared wall.', effects: [{ text: 'Gold you gift a teammate arrives with 25% more', apply: (m) => (m.giftBonus = (m.giftBonus ?? 0) + 0.25) }, E.lives(2)] },
  { id: 'compass', name: "Pathfinder's Compass", feat: 'act1', icon: 'map', flavor: 'It points north, where the trouble is.', effects: [E.prep(20), gift(40)] },
  { id: 'seed', name: 'Glacier Seed', feat: 'act2', icon: 'crystal', flavor: 'Ice that grew from a single grain.', effects: [E.stun(0.25), E.damage(0.03)] },
  { id: 'dawnstone', name: 'Dawnstone', feat: 'act3', icon: 'flame', flavor: 'The first light after the long night, kept in a stone.', effects: [E.damage(0.06), E.lives(3), gift(50)] },
  { id: 'conch', name: "Tidecaller's Conch", feat: 'act4', icon: 'crown', flavor: 'Blow it, and the champions of the deep come to you.', effects: [{ text: 'Moon-touched champions take 50% more damage from you and pay you 50% more', apply: (m) => (m.eliteBane = (m.eliteBane ?? 0) + 0.5) }] },
  { id: 'mantle', name: 'Starlit Mantle', feat: 'stars', icon: 'star', flavor: 'Every star you earned, sewn in.', effects: [E.damage(0.04), E.range(0.04), E.speed(0.04)] },
  { id: 'ring', name: 'Runebound Ring', feat: 'keystone', icon: 'rune', flavor: 'The web hums when you wear it.', effects: [E.types(['magic', 'elemental', 'pure'], 0.1)] },
  { id: 'thread', name: "Weaver's Thread", feat: 'weaver', icon: 'rune', flavor: 'Spun from a hundred spent runes.', effects: [E.types(['impact', 'pierce'], 0.1)] },
  { id: 'pipe', name: "Old Soldier's Pipe", feat: 'career_games', icon: 'shield', flavor: 'Smoked through a dozen sieges.', effects: [gift(40), E.lives(2)] },
  { id: 'warhorn', name: "Warden's Horn", feat: 'career_wins', icon: 'banner', flavor: 'Blown after every victory.', effects: [E.waveBonus(0.15)] },
  { id: 'bell', name: 'Shrine Bell', feat: 'boons_6', icon: 'banner', flavor: 'Ring it, and the old gods bring out one more gift.', effects: [{ text: 'Shrines offer four boons instead of three', apply: (m) => (m.omenChoices = (m.omenChoices ?? 0) + 1) }] },
  { id: 'cloak', name: 'Storm Cloak', feat: 'stormproof', icon: 'snow', flavor: 'Woven while the blizzard howled.', effects: [{ text: 'Weather neither helps nor hinders you or the creeps in your lane', apply: (m) => (m.weatherproof = true) }, E.range(0.03)] },
  { id: 'sickle', name: "Reaper's Sickle", feat: 'career_kills', icon: 'skull', flavor: 'It has cut ten thousand threads.', effects: [E.execute(0.04)] },
];

export const RELIC_BY_ID: Record<string, Relic> = Object.fromEntries(RELICS.map((r) => [r.id, r]));

/** Relic slots for a number of achievements earned: one, and a second at twelve. */
export const SECOND_SLOT_AT = 12;
export function relicSlots(feats: number): number {
  return feats >= SECOND_SLOT_AT ? 2 : 1;
}

/** Known, distinct relics, at most two. */
export function cleanRelics(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((r): r is string => typeof r === 'string' && !!RELIC_BY_ID[r]))].slice(0, 2);
}

/** Relics a player may carry: known, won by one of their achievements, within their slots. */
export function allowedRelics(raw: unknown, feats: unknown): string[] {
  const have = new Set(Array.isArray(feats) ? feats.filter((f): f is string => typeof f === 'string') : []);
  return cleanRelics(raw)
    .filter((id) => have.has(RELIC_BY_ID[id].feat))
    .slice(0, relicSlots(have.size));
}

/** Adds relics' bonuses to a player's mods. */
export function applyRelics(m: PlayerMods, relics: string[]): PlayerMods {
  for (const id of cleanRelics(relics)) for (const e of RELIC_BY_ID[id].effects) e.apply(m);
  return m;
}
