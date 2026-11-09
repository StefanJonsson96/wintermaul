// The single-player campaign: Act I, twelve stages on the road north and an endless frontier;
// Act II, nine stages of The Thaw, where what slept under the glacier wakes. Stages are rule sets
// for the ordinary game; stars earn runestones for the Rune Web.
import type { WaveSetId } from './data/waves';
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
  /** The creeps it is fought with (default: the classic waves). */
  waves?: WaveSetId;
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

const RACES_HEX = ['arcane', 'shadow', 'sun', 'frost', 'venom', 'grove'];

/** Act II: The Thaw. Every stage is fought with The Thaw's waves. */
export const THAW_STAGES: Stage[] = [
  {
    id: 'meltwater',
    name: 'Meltwater Ford',
    x: 0.09,
    y: 0.84,
    story: 'With the Tyrant gone the great glacier is breaking up, and the meltwater is full of things that should have stayed asleep.',
    difficulty: 'normal',
    rules: { finalWave: 12, lives: 20 },
    mutators: [],
    reach: 6,
    flawless: 3,
    rewards: [1, 1, 1],
    waves: 'thaw',
  },
  {
    id: 'fjord',
    name: 'The Drowned Fjord',
    x: 0.23,
    y: 0.64,
    story: 'Spring floods carry the horde down the fjord faster than any march. Broodmothers ride the ice floes.',
    difficulty: 'normal',
    rules: { firstWave: 5, finalWave: 16, lives: 20, startGold: 320, firstWaveDelay: 75, speedMul: 1.1, hpMul: 1.6 },
    mutators: [{ name: 'Spring floods', text: 'Creeps move 10% faster.' }],
    reach: 11,
    flawless: 3,
    rewards: [1, 1, 2],
    waves: 'thaw',
  },
  {
    id: 'hexwood',
    name: 'Hexwood',
    x: 0.13,
    y: 0.4,
    story: 'Hexers walk among the frozen trees, and towers turn to ice wherever they pass. Only the old orders of the wood will fight here.',
    difficulty: 'normal',
    rules: { firstWave: 9, finalWave: 20, lives: 20, startGold: 620, startLumber: 2, firstWaveDelay: 90, races: RACES_HEX, hpMul: 1.3 },
    mutators: [{ name: 'Witchwood', text: 'Only Arcanum, Umbral, Sunguard, Frostborn, Venomkin and Wildgrove.' }],
    reach: 15,
    flawless: 3,
    rewards: [1, 1, 2],
    waves: 'thaw',
  },
  {
    id: 'causeway',
    name: 'Shattered Causeway',
    x: 0.31,
    y: 0.24,
    story: 'The old causeway across the ice has cracked into a thousand floes, and the horde comes over all of them at once.',
    difficulty: 'normal',
    rules: { firstWave: 12, finalWave: 24, lives: 20, startGold: 900, startLumber: 2, firstWaveDelay: 100, countMul: 1.35, hpMul: 1.2 },
    mutators: [{ name: 'Horde', text: '35% more creeps in every wave, each with less health.' }],
    reach: 18,
    flawless: 4,
    rewards: [1, 2, 2],
    waves: 'thaw',
  },
  {
    id: 'caverns',
    name: 'Brood Caverns',
    x: 0.45,
    y: 0.5,
    story: 'Warm vents keep the caverns alive, and the broods with them. Whatever you wound down here heals in the steam.',
    difficulty: 'normal',
    rules: { firstWave: 16, finalWave: 28, lives: 20, startGold: 1400, startLumber: 2, firstWaveDelay: 110, regen: 0.004, hpMul: 1.15 },
    mutators: [{ name: 'Steam vents', text: 'Creeps regenerate 0.4% of their health every second.' }],
    reach: 22,
    flawless: 4,
    rewards: [1, 2, 2],
    waves: 'thaw',
  },
  {
    id: 'stormwatch',
    name: 'Stormwatch',
    x: 0.6,
    y: 0.72,
    story: 'The Storm Herald blinks across the tundra with his drums behind him. The wind is at his back, and he pays well for every head.',
    difficulty: 'normal',
    rules: { firstWave: 20, finalWave: 30, lives: 20, startGold: 2100, startLumber: 3, firstWaveDelay: 120, speedMul: 1.08, bountyMul: 1.15, hpMul: 1.75 },
    mutators: [
      { name: 'Tailwind', text: 'Creeps move 8% faster.' },
      { name: 'Plunder', text: 'Kills pay 15% more gold.' },
    ],
    reach: 25,
    flawless: 4,
    rewards: [2, 2, 2],
    waves: 'thaw',
  },
  {
    id: 'frozensea',
    name: 'The Frozen Sea',
    x: 0.74,
    y: 0.46,
    story: 'Out on the frozen sea the creeps wear plates of ice as armor. Bring your heaviest blows.',
    difficulty: 'normal',
    rules: { firstWave: 25, finalWave: 36, lives: 20, startGold: 3200, startLumber: 3, firstWaveDelay: 130, armor: 3, hpMul: 1.15 },
    mutators: [{ name: 'Ice plates', text: 'Creeps have 3 extra armor.' }],
    reach: 31,
    flawless: 4,
    rewards: [2, 2, 3],
    waves: 'thaw',
  },
  {
    id: 'hollowthrone',
    name: 'The Hollow Throne',
    x: 0.82,
    y: 0.22,
    story: 'Under the glacier stands a throne older than the Tyrant\'s. The Hollow King is rising from it.',
    difficulty: 'normal',
    rules: { firstWave: 31, finalWave: 40, lives: 25, startGold: 5600, startLumber: 3, firstWaveDelay: 140 },
    mutators: [],
    reach: 36,
    flawless: 5,
    rewards: [2, 2, 3],
    waves: 'thaw',
  },
  {
    id: 'glacierheart',
    name: 'Heart of the Glacier',
    x: 0.9,
    y: 0.07,
    story: 'The whole Thaw, from the first ghoul out of the meltwater to the Hollow King himself.',
    difficulty: 'brutal',
    rules: { lives: 30 },
    mutators: [{ name: 'The whole Thaw', text: 'All 40 waves of The Thaw on Brutal: 40% more creep health.' }],
    reach: 25,
    flawless: 6,
    rewards: [2, 3, 3],
    waves: 'thaw',
  },
];

export interface Chapter {
  id: 'winter' | 'thaw' | 'night';
  act: string;
  name: string;
  blurb: string;
  stages: Stage[];
  /** An endless stage beside the road. */
  endless?: Stage;
  /** A stage elsewhere that must be won before this chapter opens. */
  opensAfter?: string;
}

const RACES_AURORA = ['arcane', 'storm', 'sun', 'prism', 'shadow', 'frost'];

/** Act III: the polar night, where weather and the old shrines decide the war. */
export const NIGHT_STAGES: Stage[] = [
  {
    id: 'lastlight',
    name: 'Last Light',
    x: 0.08,
    y: 0.82,
    story: 'The sun sets and does not rise again. In the last village before the long dark, the shrines are lit more often than ever.',
    difficulty: 'normal',
    rules: { finalWave: 14, lives: 20, omenEvery: 3, hpMul: 2.6 },
    mutators: [{ name: 'Lit shrines', text: 'A shrine offers boons after every third wave.' }],
    reach: 8,
    flawless: 3,
    rewards: [1, 1, 1],
  },
  {
    id: 'whiteout',
    name: 'Whiteout Pass',
    x: 0.2,
    y: 0.58,
    story: 'The pass is one long blizzard. Towers see a stone’s throw ahead; the horde wades through the drifts.',
    difficulty: 'normal',
    rules: { firstWave: 6, finalWave: 20, lives: 20, startGold: 420, startLumber: 1, firstWaveDelay: 80, weather: 'blizzard', hpMul: 2.4 },
    mutators: [{ name: 'Whiteout', text: 'Every wave is a blizzard: towers see 15% less far, creeps wade 10% slower.' }],
    reach: 13,
    flawless: 3,
    rewards: [1, 1, 1],
  },
  {
    id: 'pilgrims',
    name: "Pilgrims' Road",
    x: 0.37,
    y: 0.76,
    story: 'Pilgrims lit a shrine at every mile of this road. Take every gift they left you: you will need them all.',
    difficulty: 'normal',
    rules: { firstWave: 8, finalWave: 24, lives: 20, startGold: 560, startLumber: 2, firstWaveDelay: 90, omenEvery: 2, hpMul: 2.8 },
    mutators: [{ name: 'Mile shrines', text: 'A shrine after every second wave, but the creeps are much tougher.' }],
    reach: 16,
    flawless: 3,
    rewards: [1, 1, 1],
    waves: 'thaw',
  },
  {
    id: 'cairns',
    name: 'The Last Cairns',
    x: 0.5,
    y: 0.52,
    story: 'Nothing grows here and no stone is left to quarry. Sixty towers is all the land will give you.',
    difficulty: 'normal',
    rules: { firstWave: 10, finalWave: 24, lives: 20, startGold: 820, startLumber: 2, firstWaveDelay: 100, maxTowers: 60, hpMul: 2.0 },
    mutators: [{ name: 'No more stones', text: 'At most 60 towers: make every one count, and upgrade.' }],
    reach: 17,
    flawless: 4,
    rewards: [1, 1, 1],
  },
  {
    id: 'auroravale',
    name: 'Aurora Vale',
    x: 0.36,
    y: 0.3,
    story: 'Under the lights the old magic wakes. Only the orders that wield it will follow you into the vale.',
    difficulty: 'normal',
    rules: { firstWave: 12, finalWave: 26, lives: 20, startGold: 960, startLumber: 2, firstWaveDelay: 100, weather: 'aurora', races: RACES_AURORA, hpMul: 2.6 },
    mutators: [
      { name: 'Endless aurora', text: 'Every wave: Magic, Elemental and Pure damage +25%.' },
      { name: 'Orders of the lights', text: 'Only Arcanum, Stormcallers, Sunguard, Prismatic, Umbral and Frostborn.' },
    ],
    reach: 19,
    flawless: 4,
    rewards: [1, 1, 2],
    waves: 'thaw',
  },
  {
    id: 'redmoon',
    name: 'Night of the Red Moon',
    x: 0.6,
    y: 0.27,
    story: 'Once a generation the moon bleeds. The horde comes fat and furious, and its gold spills everywhere.',
    difficulty: 'hard',
    rules: { firstWave: 15, finalWave: 30, lives: 20, startGold: 1500, startLumber: 2, firstWaveDelay: 110, weather: 'bloodmoon', hpMul: 2.0 },
    mutators: [{ name: 'Blood moon', text: 'Every wave: creeps have 20% more health and pay 40% more gold.' }],
    reach: 22,
    flawless: 4,
    rewards: [1, 1, 2],
  },
  {
    id: 'fogsea',
    name: 'The Fog Sea',
    x: 0.76,
    y: 0.55,
    story: 'A frozen sea under a fog so thick the towers fire at shadows. Slows linger in the cold; nothing else does.',
    difficulty: 'normal',
    rules: { firstWave: 18, finalWave: 32, lives: 20, startGold: 2000, startLumber: 3, firstWaveDelay: 120, weather: 'fog', omenEvery: 4, hpMul: 2.4 },
    mutators: [
      { name: 'Freezing fog', text: 'Every wave: slows last twice as long, towers attack 10% slower.' },
      { name: 'Sea shrines', text: 'A shrine after every fourth wave.' },
    ],
    reach: 25,
    flawless: 4,
    rewards: [1, 1, 2],
    waves: 'thaw',
  },
  {
    id: 'longnight',
    name: 'The Long Night',
    x: 0.88,
    y: 0.16,
    story: 'At the top of the world the night itself marches. Forty waves of every weather, and the Hollow King at the end of it.',
    difficulty: 'hard',
    rules: { lives: 20, omenEvery: 4, hpMul: 1.75 },
    mutators: [
      { name: 'All the weathers', text: 'Every storm the north has, wave after wave.' },
      { name: 'Night shrines', text: 'A shrine after every fourth wave.' },
    ],
    reach: 30,
    flawless: 5,
    rewards: [2, 2, 3],
    waves: 'thaw',
  },
];


export const CHAPTERS: Chapter[] = [
  { id: 'winter', act: 'Act I', name: 'The Long Winter', blurb: 'The road north, to the Throne of Winter.', stages: STAGES, endless: ENDLESS },
  { id: 'thaw', act: 'Act II', name: 'The Thaw', blurb: 'What slept under the glacier is waking.', stages: THAW_STAGES, opensAfter: 'mill' },
  { id: 'night', act: 'Act III', name: 'The Long Night', blurb: 'The sun has set for good. Weather and the old shrines decide the war.', stages: NIGHT_STAGES, opensAfter: 'hexwood' },
];

/** Every stage of every chapter, the endless ones included. */
export const ALL_STAGES: Stage[] = CHAPTERS.flatMap((c) => [...c.stages, ...(c.endless ? [c.endless] : [])]);

export const STAGE_BY_ID: Record<string, Stage> = Object.fromEntries(ALL_STAGES.map((s) => [s.id, s]));

export function chapterOf(stage: Stage): Chapter {
  return CHAPTERS.find((c) => c.stages.includes(stage) || c.endless === stage) ?? CHAPTERS[0];
}

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
export const CAMPAIGN_STONES = CHAPTERS.flatMap((c) => c.stages).reduce((n, s) => n + s.rewards[0] + s.rewards[1] + s.rewards[2], 0);
