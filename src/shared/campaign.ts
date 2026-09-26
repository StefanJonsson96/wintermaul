// The single-player campaign: twelve stages on the road north, and an endless frontier.
// Stages are rule sets for the ordinary game; stars earn runestones for the talent tree.
import type { Difficulty } from './protocol';
import type { GameRules } from './sim/game';

export interface Stage {
  id: string;
  name: string;
  /** Position on the campaign map, as fractions of its width and height. */
  x: number;
  y: number;
  story: string;
  difficulty: Difficulty;
  rules: Omit<GameRules, 'mods'>;
  /** Shown in the briefing; the rules above do the work. */
  mutators: { name: string; text: string }[];
  /** First star: reach this wave. Second: win. Third: win losing at most `flawless` lives. */
  reach: number;
  flawless: number;
  /** Runestones for the first, second and third star. */
  rewards: [number, number, number];
  endless?: boolean;
}

const RACES_DEEP = ['stone', 'tech', 'gold', 'prism', 'fire', 'arcane'];
const RACES_ASH = ['fire', 'storm', 'shadow', 'sun', 'venom', 'arcane'];

export const STAGES: Stage[] = [
  {
    id: 'hollowmere',
    name: 'Hollowmere',
    x: 0.08,
    y: 0.84,
    story: 'Rime ghouls crawl out of the frozen lake. Hold the village road until their warlord shows himself.',
    difficulty: 'normal',
    rules: { finalWave: 10, lives: 20 },
    mutators: [],
    reach: 5,
    flawless: 2,
    rewards: [2, 2, 2],
  },
  {
    id: 'pinewatch',
    name: 'Pinewatch',
    x: 0.19,
    y: 0.64,
    story: 'Wolves run ahead of the horde. Keep the beacon towers standing through the night.',
    difficulty: 'normal',
    rules: { finalWave: 13, lives: 20, hpMul: 1.3, speedMul: 1.15 },
    mutators: [{ name: 'Swift', text: 'Creeps move 15% faster.' }],
    reach: 7,
    flawless: 3,
    rewards: [2, 3, 2],
  },
  {
    id: 'mill',
    name: 'The Drowned Mill',
    x: 0.13,
    y: 0.4,
    story: 'Spiders boil out of the millpond by the hundred. You arrive as the first wave breaks.',
    difficulty: 'normal',
    rules: { firstWave: 5, finalWave: 15, lives: 20, startGold: 300, firstWaveDelay: 75, countMul: 1.5, hpMul: 1.0 },
    mutators: [
      { name: 'Swarm', text: '50% more creeps in every wave, each with less health.' },
    ],
    reach: 10,
    flawless: 3,
    rewards: [2, 3, 3],
  },
  {
    id: 'crowspire',
    name: 'Crowspire',
    x: 0.3,
    y: 0.22,
    story: 'The sky over the old abbey is black with wings, and something huge walks beneath them.',
    difficulty: 'normal',
    rules: { finalWave: 20, lives: 20, hpMul: 1.45, bountyMul: 1.15 },
    mutators: [{ name: 'Plunder', text: 'Kills pay 15% more gold.' }],
    reach: 10,
    flawless: 4,
    rewards: [2, 3, 3],
  },
  {
    id: 'frostfen',
    name: 'Frostfen',
    x: 0.42,
    y: 0.44,
    story: 'Nothing dies easily in the fen. Its mist knits wounds shut as fast as you open them.',
    difficulty: 'normal',
    rules: { firstWave: 11, finalWave: 22, lives: 20, startGold: 1100, startLumber: 2, firstWaveDelay: 100, regen: 0.006, hpMul: 1.25 },
    mutators: [
      { name: 'Fen mist', text: 'Creeps regenerate 0.6% of their health every second.' },
    ],
    reach: 16,
    flawless: 3,
    rewards: [3, 3, 3],
  },
  {
    id: 'ironpass',
    name: 'The Iron Pass',
    x: 0.5,
    y: 0.7,
    story: 'The horde has brought its siege-plate through the pass. Only the heaviest blows will do.',
    difficulty: 'normal',
    rules: { firstWave: 15, finalWave: 25, lives: 20, startGold: 1500, startLumber: 2, firstWaveDelay: 110, armor: 4, hpMul: 1.5 },
    mutators: [
      { name: 'Iron hides', text: 'Creeps have 4 extra armor.' },
    ],
    reach: 20,
    flawless: 3,
    rewards: [3, 3, 4],
  },
  {
    id: 'glimmerdeep',
    name: 'Glimmerdeep',
    x: 0.62,
    y: 0.52,
    story: 'Only the deep-folk know these tunnels. Fight with what the mines provide.',
    difficulty: 'normal',
    rules: { firstWave: 16, finalWave: 27, lives: 20, startGold: 1700, startLumber: 2, firstWaveDelay: 110, races: RACES_DEEP, hpMul: 1.55 },
    mutators: [
      { name: 'Deep-folk', text: 'Only Stonewardens, Clockwork, Goldhoard, Prismatic, Emberforge and Arcanum.' },
    ],
    reach: 22,
    flawless: 3,
    rewards: [3, 4, 4],
  },
  {
    id: 'wolfsmoor',
    name: 'Wolfsmoor',
    x: 0.7,
    y: 0.28,
    story: 'The Queen of Rime rides at the head of her hunt. Her court heals whatever you wound.',
    difficulty: 'normal',
    rules: { firstWave: 20, finalWave: 30, lives: 20, startGold: 2300, startLumber: 3, firstWaveDelay: 120, speedMul: 1.08, hpMul: 1.3 },
    mutators: [
      { name: 'The hunt', text: 'Creeps move 8% faster.' },
    ],
    reach: 25,
    flawless: 4,
    rewards: [3, 4, 4],
  },
  {
    id: 'ashengate',
    name: 'The Ashen Gate',
    x: 0.78,
    y: 0.62,
    story: 'The old fire-wardens held this gate for a thousand years. Their spirits lend you their fury.',
    difficulty: 'normal',
    rules: { firstWave: 21, finalWave: 32, lives: 20, startGold: 2900, startLumber: 3, firstWaveDelay: 120, races: RACES_ASH, countMul: 1.4, hpMul: 1.7 },
    mutators: [
      { name: 'Fire-wardens', text: 'Only Emberforge, Stormcallers, Umbral, Sunguard, Venomkin and Arcanum.' },
      { name: 'Horde', text: '40% more creeps in every wave, each with less health.' },
    ],
    reach: 27,
    flawless: 4,
    rewards: [3, 4, 5],
  },
  {
    id: 'barrow',
    name: 'Silent Barrow',
    x: 0.86,
    y: 0.4,
    story: 'The dead of a hundred winters rise from their mounds to join the march.',
    difficulty: 'normal',
    rules: { firstWave: 25, finalWave: 36, lives: 20, startGold: 3900, startLumber: 3, firstWaveDelay: 130, regen: 0.004, armor: 2, hpMul: 1.15 },
    mutators: [
      { name: 'Deathless', text: 'Creeps regenerate 0.4% of their health every second and have 2 extra armor.' },
    ],
    reach: 31,
    flawless: 4,
    rewards: [4, 4, 5],
  },
  {
    id: 'rimewall',
    name: 'The Rimewall',
    x: 0.9,
    y: 0.18,
    story: 'The last wall before the throne. Behind the Avalanche walks the Winter Tyrant himself.',
    difficulty: 'normal',
    rules: { firstWave: 31, finalWave: 40, lives: 25, startGold: 6600, startLumber: 3, firstWaveDelay: 140 },
    mutators: [],
    reach: 36,
    flawless: 5,
    rewards: [4, 5, 5],
  },
  {
    id: 'throne',
    name: 'Throne of Winter',
    x: 0.965,
    y: 0.06,
    story: 'End the long winter: every wave, from the first ghoul to the Tyrant himself.',
    difficulty: 'brutal',
    rules: { lives: 30 },
    mutators: [{ name: 'The whole war', text: 'All 40 waves on Brutal: 40% more creep health.' }],
    reach: 25,
    flawless: 6,
    rewards: [5, 5, 6],
  },
];

/** Opens once this stage is won. */
export const ENDLESS_AFTER = 'ironpass';

export const ENDLESS: Stage = {
  id: 'endless',
  name: 'The Endless Frontier',
  x: 0.58,
  y: 0.9,
  story: 'Beyond the edge of the map the horde never ends. How long can you hold?',
  difficulty: 'normal',
  rules: {},
  mutators: [{ name: 'Endless', text: 'The waves never stop. Every 5 waves past wave 20 earns a runestone, the first time.' }],
  reach: 0,
  flawless: 0,
  rewards: [0, 0, 0],
  endless: true,
};

export const STAGE_BY_ID: Record<string, Stage> = Object.fromEntries([...STAGES, ENDLESS].map((s) => [s.id, s]));

export interface StageResult {
  victory: boolean;
  /** The wave the game ended on. */
  wave: number;
  livesLost: number;
}

export function starsFor(stage: Stage, r: StageResult): number {
  if (stage.endless) return 0;
  if (r.victory) return r.livesLost <= stage.flawless ? 3 : 2;
  return r.wave >= stage.reach ? 1 : 0;
}

/** Runestones for improving a stage from `before` to `after` stars. */
export function starReward(stage: Stage, before: number, after: number): number {
  let n = 0;
  for (let k = before; k < Math.min(3, after); k++) n += stage.rewards[k];
  return n;
}

/** Runestones for a new endless record: one per 5 waves past wave 20. */
export function endlessReward(best: number, wave: number): number {
  const marks = (w: number) => Math.max(0, Math.floor((w - 20) / 5));
  return Math.max(0, marks(wave) - marks(best));
}

/** Runestones the campaign can give, endless records aside. */
export const CAMPAIGN_STONES = STAGES.reduce((n, s) => n + s.rewards[0] + s.rewards[1] + s.rewards[2], 0);
