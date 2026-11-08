// The daily challenge: one game a day, the same for everyone. The date picks the seed, the wave
// set, a slice of fifteen waves, a war chest to start with and one or two twists.
import { type WaveSetId } from './data/waves';
import { RACE_BY_ID, RACES } from './data/races';
import type { Difficulty } from './protocol';
import { Rng } from './rng';
import type { GameRules } from './sim/entities';

export interface Daily {
  date: string;
  name: string;
  seed: number;
  difficulty: Difficulty;
  waves: WaveSetId;
  rules: Omit<GameRules, 'mods'>;
  mutators: { name: string; text: string }[];
  /** Medals: bronze for reaching `reach`, silver for winning, gold for winning losing at most `flawless` lives. */
  reach: number;
  flawless: number;
}

interface Twist {
  name: string;
  /** What it does, given the day's rules once it has been applied. */
  text: string | ((r: Omit<GameRules, 'mods'>) => string);
  apply: (r: Omit<GameRules, 'mods'>, rng: Rng) => void;
}

const TWISTS: Twist[] = [
  { name: 'Swift', text: 'Creeps move 12% faster.', apply: (r) => (r.speedMul = (r.speedMul ?? 1) * 1.12) },
  { name: 'Mending', text: 'Creeps regenerate 0.4% of their health every second.', apply: (r) => (r.regen = (r.regen ?? 0) + 0.004) },
  { name: 'Iron hides', text: 'Creeps have 3 extra armor.', apply: (r) => (r.armor = (r.armor ?? 0) + 3) },
  {
    name: 'Horde',
    text: '35% more creeps in every wave, each with less health.',
    apply: (r) => {
      r.countMul = (r.countMul ?? 1) * 1.35;
      r.hpMul = (r.hpMul ?? 1) * 0.85;
    },
  },
  {
    name: 'Plunder',
    text: 'Kills pay 25% more gold, but creeps have 10% more health.',
    apply: (r) => {
      r.bountyMul = (r.bountyMul ?? 1) * 1.25;
      r.hpMul = (r.hpMul ?? 1) * 1.1;
    },
  },
  {
    name: 'Six races',
    text: (r) => `Only six races can be picked today: ${(r.races ?? []).map((id) => RACE_BY_ID[id].name).join(', ')}.`,
    apply: (r, rng) => {
      const pool = RACES.map((x) => x.id);
      const out: string[] = [];
      while (out.length < 6) {
        const pick = rng.pick(pool.filter((p) => !out.includes(p)));
        out.push(pick);
      }
      r.races = out;
    },
  },
  { name: 'Lean times', text: 'Start with 20% less gold.', apply: (r) => (r.startGold = Math.round(((r.startGold ?? 120) * 0.8) / 10) * 10) },
];

const ADJECTIVES = ['Bitter', 'Howling', 'Pale', 'Silent', 'Frostbitten', 'Hollow', 'Restless', 'Black', 'Grey', 'Iron', 'Starless', 'Broken', 'Endless', 'Drowned'];
const NOUNS = ['Vigil', 'March', 'Watch', 'Crossing', 'Siege', 'Night', 'Pass', 'Thaw', 'Reckoning', 'Hunt', 'Stand', 'Retreat', 'Dawn', 'Gate'];

/** "2026-11-09" for a date, in the player's own time zone. */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gold for joining the fight late: about nine tenths of what a player would have built up by then. */
export function warChest(firstWave: number): number {
  return firstWave <= 1 ? 120 : Math.round((120 + 25 * Math.pow(firstWave - 1, 1.615)) / 10) * 10;
}

export function dailyFor(date: string): Daily {
  const seed = hash(`winterward:${date}`);
  const rng = new Rng(seed);
  const waves: WaveSetId = rng.chance(0.5) ? 'thaw' : 'classic';
  const first = rng.pick([1, 1, 5, 9, 12, 16, 20, 24]);
  const final = Math.min(40, first + 14);
  const rules: Omit<GameRules, 'mods'> = {
    firstWave: first,
    finalWave: final,
    lives: 20,
    startGold: warChest(first),
    startLumber: 1 + (first > 7 ? 1 : 0) + (first > 20 ? 1 : 0),
    firstWaveDelay: Math.min(140, 45 + (first - 1) * 4),
    hpMul: 1.1,
  };
  const twists = [...TWISTS];
  const mutators: Daily['mutators'] = [];
  const n = rng.chance(0.4) ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const t = twists.splice(Math.floor(rng.next() * twists.length), 1)[0];
    t.apply(rules, rng);
    mutators.push({ name: t.name, text: typeof t.text === 'string' ? t.text : t.text(rules) });
  }
  return {
    date,
    name: `The ${rng.pick(ADJECTIVES)} ${rng.pick(NOUNS)}`,
    seed,
    difficulty: rng.chance(0.3) ? 'hard' : 'normal',
    waves,
    rules,
    mutators,
    reach: first + 9,
    flawless: 3,
  };
}

export type Medal = 0 | 1 | 2 | 3;

export function medalFor(d: Daily, r: { victory: boolean; wave: number; livesLost: number }): Medal {
  if (r.victory) return r.livesLost <= d.flawless ? 3 : 2;
  return r.wave >= d.reach ? 1 : 0;
}

export const MEDAL_NAMES = ['No medal', 'Bronze', 'Silver', 'Gold'];
