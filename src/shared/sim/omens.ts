// Weather and omens: what makes one game unlike the next.
//
// Weather: every wave has a forecast, known in advance, that bends the rules for its duration
// (a blizzard shortens every tower's reach, an aurora feeds magic, a blood moon brings richer and
// tougher creeps). The forecast is a pure function of the game's seed and the wave, so clients
// can show it without being told.
//
// Omens: after every fifth wave a wayside shrine offers each player three boons; they take one.
// Boons are small and permanent for the game, some with a price, so every game builds differently.
import type { PlayerMods } from './mods';
import { E, type Effect } from '../talents';

export type WeatherId = 'clear' | 'blizzard' | 'aurora' | 'fog' | 'warm' | 'bloodmoon';

export interface Weather {
  id: WeatherId;
  name: string;
  /** What it does, in a few words. */
  text: string;
  icon: string;
  color: string;
  /** Bonuses for every player's towers while it lasts. */
  effects: Effect[];
  /** Creeps of the wave: health and speed multipliers, and kill gold. */
  creepHp?: number;
  creepSpeed?: number;
  bounty?: number;
}

export const WEATHERS: Record<WeatherId, Weather> = {
  clear: { id: 'clear', name: 'Still air', text: 'Nothing stirs.', icon: 'eye', color: '#9fb2c8', effects: [] },
  blizzard: { id: 'blizzard', name: 'Blizzard', text: 'Towers see 15% less far; creeps wade 10% slower.', icon: 'snow', color: '#cfe8ff', effects: [E.range(-0.15)], creepSpeed: 0.9 },
  aurora: { id: 'aurora', name: 'Aurora', text: 'Magic, Elemental and Pure damage +25%.', icon: 'star', color: '#7dffc4', effects: [E.types(['magic', 'elemental', 'pure'], 0.25)] },
  fog: { id: 'fog', name: 'Freezing fog', text: 'Slows last twice as long; towers attack 10% slower.', icon: 'drop', color: '#d9e2ea', effects: [E.slowDur(1), E.speed(-0.1)] },
  warm: { id: 'warm', name: 'Warm wind', text: 'Creeps run 12% faster; poison and burns +35%.', icon: 'flame', color: '#ffb46a', effects: [E.poison(0.35), E.burn(0.35)], creepSpeed: 1.12 },
  bloodmoon: { id: 'bloodmoon', name: 'Blood moon', text: 'Creeps have 20% more health and pay 40% more gold.', icon: 'skull', color: '#ff5a5a', effects: [], creepHp: 1.2, bounty: 1.4 },
};

/** How often each weather comes (out of the total). */
const WEATHER_ODDS: [WeatherId, number][] = [
  ['clear', 9],
  ['blizzard', 4],
  ['aurora', 3],
  ['fog', 3],
  ['warm', 3],
  ['bloodmoon', 2],
];

function hash(a: number, b: number, c = 0): number {
  let h = 2166136261 ^ a;
  h = Math.imul(h, 16777619) ^ b;
  h = Math.imul(h, 16777619) ^ c;
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rawWeather(seed: number, wave: number): WeatherId {
  const total = WEATHER_ODDS.reduce((n, [, w]) => n + w, 0);
  let r = hash(seed, wave, 77) * total;
  for (const [id, w] of WEATHER_ODDS) if ((r -= w) < 0) return id;
  return 'clear';
}

/** The weather of a wave: calm for the first three, never the same storm twice in a row. */
export function weatherOf(seed: number, wave: number): WeatherId {
  if (wave <= 3) return 'clear';
  const w = rawWeather(seed, wave);
  return w !== 'clear' && w === rawWeather(seed, wave - 1) ? 'clear' : w;
}

// ───────────────────────────────────────── omens

export interface Boon {
  id: string;
  name: string;
  /** Lasting bonuses (talent-style). */
  effects: Effect[];
  /** Given once, when taken. */
  now?: { gold?: number; lives?: number; lumber?: number };
  /** Gold scales with the wave it is taken on. */
  goldPerWave?: number;
  icon: string;
}

export const BOONS: Boon[] = [
  { id: 'ember', name: "The Smith's Ember", icon: 'hammer', effects: [E.damage(0.08)] },
  { id: 'hawk', name: "Hawk's Eye", icon: 'eye', effects: [E.range(0.08)] },
  { id: 'hands', name: 'Restless Hands', icon: 'bolt', effects: [E.speed(0.1)] },
  { id: 'wolf', name: 'Wolf Winter', icon: 'crown', effects: [E.vsBoss(0.25)] },
  { id: 'pockets', name: 'Deep Pockets', icon: 'coin', effects: [], goldPerWave: 22 },
  { id: 'hearth', name: 'Hearth Blessing', icon: 'heart', effects: [], now: { lives: 6 } },
  { id: 'axe', name: "Woodcutter's Luck", icon: 'log', effects: [], now: { lumber: 1 } },
  { id: 'raven', name: "Raven's Tithe", icon: 'wing', effects: [E.bounty(0.12)] },
  { id: 'coldiron', name: 'Cold Iron', icon: 'snow', effects: [E.slow(0.2), E.slowDur(0.2)] },
  { id: 'witchfire', name: 'Witchfire', icon: 'flame', effects: [E.poison(0.3), E.burn(0.3)] },
  { id: 'frostedge', name: 'Frost Edge', icon: 'sword', effects: [E.crit(0.06)] },
  { id: 'sunder', name: 'Sundering Hymn', icon: 'shield', effects: [E.vsArmor(['heavy', 'fortified'], 0.18)] },
  { id: 'starlight', name: 'Starlight', icon: 'star', effects: [E.types(['magic', 'elemental', 'pure'], 0.15)] },
  { id: 'steelrain', name: 'Steel Rain', icon: 'arrows', effects: [E.types(['impact', 'pierce'], 0.15)] },
  { id: 'skyhunter', name: 'Skyhunter', icon: 'wing', effects: [E.vsAir(0.3)] },
  { id: 'moon', name: "Executioner's Moon", icon: 'skull', effects: [E.execute(0.05)] },
  { id: 'mason', name: 'Mason’s Oath', icon: 'brick', effects: [E.walls(2), E.refund(0.1)] },
  { id: 'bloodprice', name: 'Blood Price', icon: 'gem', effects: [E.damage(0.22), E.leakMul(0.5)] },
  { id: 'longnight', name: 'The Long Night', icon: 'infinity', effects: [E.speed(0.2), { text: 'Creeps in your lane run 6% faster', bad: true, apply: (m) => (m.creepSlow = (m.creepSlow ?? 0) - 0.06) }] },
  { id: 'stoneskin', name: 'Stoneskin Pact', icon: 'shield', effects: [E.speed(-0.08)], now: { lives: 10 } },
];

export const BOON_BY_ID: Record<string, Boon> = Object.fromEntries(BOONS.map((b) => [b.id, b]));

/** A boon's effects in words, for its card. */
export function boonText(b: Boon, wave: number): { text: string; bad?: boolean }[] {
  const out: { text: string; bad?: boolean }[] = b.effects.map((e) => ({ text: e.text, bad: e.bad }));
  if (b.goldPerWave) out.unshift({ text: `+${b.goldPerWave * wave} gold now` });
  if (b.now?.lives) out.push({ text: `+${b.now.lives} lives now` });
  if (b.now?.lumber) out.push({ text: `+${b.now.lumber} lumber now` });
  return out;
}

/** Every fifth wave, before the last. */
export function isOmenWave(wave: number, finalWave: number, endless: boolean): boolean {
  return wave > 0 && wave % 5 === 0 && (endless || wave < finalWave);
}

/** The boons a shrine offers a player after a wave: `count` different ones they don't have. */
export function omenOffers(seed: number, player: number, wave: number, have: string[], count = 3): string[] {
  // boons that only give something once can come again; lasting ones only once
  const pool = BOONS.filter((b) => !have.includes(b.id) || !b.effects.length).map((b) => b.id);
  const out: string[] = [];
  for (let i = 0; out.length < count && i < 200; i++) {
    const id = pool[Math.floor(hash(seed, player * 1000 + wave, i) * pool.length)];
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** A player's bonuses: their own (talents, relics), their boons, and the weather. */
export function effectiveMods(base: PlayerMods, boons: string[], weather: WeatherId): PlayerMods {
  const m: PlayerMods = structuredClone(base);
  for (const id of boons) for (const e of BOON_BY_ID[id]?.effects ?? []) e.apply(m);
  for (const e of WEATHERS[weather].effects) if (!(base.weatherproof && e.bad)) e.apply(m);
  return m;
}
