import type { ArmorType, CreepDef, CreepShape, WaveDef } from '../types';

// The creep line-ups. Like the classic map, one creep type per level, 20 per spawn, fewer on air
// levels, and a boss every tenth level. HP follows a smooth curve so it can be tuned in one place
// (see `npm run balance`). Besides the classic waves there is The Thaw: what woke up under the
// glacier, with creeps that burrow, blink, breed, shield each other and freeze towers.

export const FINAL_WAVE = 40;

/** Baseline hit points of an ordinary creep on wave n. */
export function baseHp(n: number): number {
  return 23.4 * Math.pow(n, 1.019) * Math.pow(1.0694, n);
}
export const baseSpeed = (n: number) => 2.3 + n * 0.022;
export const baseArmor = (n: number) => Math.floor(n / 2);
export const baseBounty = (n: number) => 2 + Math.floor(n / 3);

/** The abilities a creep can have (see CreepDef). */
type Abilities = Pick<CreepDef, 'burrow' | 'blink' | 'ward' | 'frenzy' | 'freeze' | 'haste'>;

/** A creep that comes with another: spawned by a broodmother, or mixed into a wave. */
interface ExtraSpec extends Abilities {
  name: string;
  shape: CreepShape;
  colors: [string, string, string];
  armorType: ArmorType;
  /** Health relative to an ordinary creep of the wave. */
  hpMul: number;
  armorAdd?: number;
  size?: number;
  air?: boolean;
  immune?: boolean;
}

interface WaveSpec extends Abilities {
  name: string;
  shape: CreepShape;
  colors: [string, string, string];
  armorType: ArmorType;
  title?: string;
  hint: string;
  hpMul?: number;
  speedMul?: number;
  armorAdd?: number;
  count?: number;
  interval?: number;
  air?: boolean;
  immune?: boolean;
  regen?: number;
  shield?: number;
  split?: boolean;
  heal?: boolean;
  swarm?: boolean;
  boss?: boolean;
  leak?: number;
  size?: number;
  /** Breeds `count` of `child` every `every` seconds, at most `max` times. */
  brood?: { every: number; count: number; max: number; child: ExtraSpec };
  /** Every `every`-th creep of the wave is a `spec` instead (it keeps the pace of the wave). */
  mix?: { spec: ExtraSpec; every: number };
  /** A boss's escort: `count` creeps of wave `n` (default: the wave before, 8 of them). */
  escort?: { n: number; count: number };
}

const W: WaveSpec[] = [
  /* 1 */ { name: 'Rime Ghoul', shape: 'ghoul', colors: ['#9fb2c2', '#2f3a4a', '#5fe3ff'], armorType: 'light', hint: 'Build a maze! Every kill pays — spend it right away.', hpMul: 1.1 },
  /* 2 */ { name: 'Kobold Raider', shape: 'biped', colors: ['#7a8fa8', '#2c3444', '#ff5a3c'], armorType: 'medium', hint: 'Raiders with spears and wooden shields.', hpMul: 1.35 },
  /* 3 */ { name: 'Frostfang Wolf', shape: 'wolf', colors: ['#aab8c6', '#2e3642', '#ff4a3a'], armorType: 'light', hint: 'Fast pack hunters.', speedMul: 1.35, hpMul: 1.1 },
  /* 4 */ { name: 'Warbristle Boar', shape: 'boar', colors: ['#6e5244', '#2a1d18', '#ff7a2f'], armorType: 'heavy', hint: 'Thick hides: Impact and Magic work best.', hpMul: 1.15 },
  /* 5 */ { name: 'Carrion Crow', shape: 'bird', colors: ['#3c4352', '#161a22', '#ff3f3f'], armorType: 'light', hint: 'AIR. Crows fly straight over your maze.', air: true },
  /* 6 */ { name: 'Frost Troll', shape: 'troll', colors: ['#6f9a90', '#26403b', '#ffcf40'], armorType: 'medium', hint: 'Trolls regenerate. Burst them down.', regen: 0.01 },
  /* 7 */ { name: 'Rime Spider', shape: 'spider', colors: ['#44546a', '#161d28', '#ff3b5c'], armorType: 'light', hint: 'SWARM. Thirty skittering spiders. Splash shines.', swarm: true },
  /* 8 */ { name: 'Glacier Crab', shape: 'crab', colors: ['#5a86a8', '#1c344a', '#ff6a3a'], armorType: 'fortified', hint: 'FORTIFIED shells. Bring Impact or Pure damage.', armorAdd: 1, speedMul: 0.9 },
  /* 9 */ { name: 'Frostfire Skull', shape: 'skull', colors: ['#6fd8ff', '#2f7fd0', '#aef8ff'], armorType: 'spirit', hint: 'SPIRITS shrug off physical damage. Magic burns them.' },
  /* 10 */ { name: 'Grimtusk the Warlord', shape: 'troll', colors: ['#7d8f6a', '#2c3322', '#ff5a2a'], armorType: 'heavy', title: 'BOSS', hint: 'BOSS. The troll warlord and his escort. Costs 5 lives if he leaks.', boss: true },
  /* 11 */ { name: 'Ice Imp', shape: 'imp', colors: ['#4f8fd0', '#182c4f', '#ffb13a'], armorType: 'medium', hint: 'Quick little devils.', speedMul: 1.3, hpMul: 0.85 },
  /* 12 */ { name: 'Grave Shieldbearer', shape: 'knight', colors: ['#7c8696', '#22262f', '#5fe3ff'], armorType: 'fortified', hint: 'Frost shields absorb the first 30% of damage.', shield: 0.3, speedMul: 0.95 },
  /* 13 */ { name: 'Storm Harpy', shape: 'bird', colors: ['#5f4f86', '#241c3a', '#fff06a'], armorType: 'medium', hint: 'AIR. Harpies dive straight for the exit.', air: true },
  /* 14 */ { name: 'Frozen Revenant', shape: 'wraith', colors: ['#7fc6e0', '#1c3a4c', '#bff9ff'], armorType: 'spirit', hint: 'Restless dead that knit themselves back together.', regen: 0.008 },
  /* 15 */ { name: 'Rime Golem', shape: 'golem', colors: ['#a8c6de', '#3a5874', '#5fe3ff'], armorType: 'heavy', hint: 'Splits into two shards when destroyed.', split: true, hpMul: 0.7 },
  /* 16 */ { name: 'Worg', shape: 'wolf', colors: ['#4b4e58', '#15161b', '#ff3b2f'], armorType: 'light', hint: 'A fast pack. Slow them or they slip through.', speedMul: 1.45, hpMul: 0.85 },
  /* 17 */ { name: 'Ice Wraith', shape: 'wraith', colors: ['#a8e2ff', '#3a6aa8', '#e070ff'], armorType: 'spirit', hint: 'IMMUNE to slows, stuns and pulls. The hard one.', immune: true, hpMul: 1.05 },
  /* 18 */ { name: 'Frost Giant', shape: 'giant', colors: ['#8aa8c4', '#2a4662', '#8ff0ff'], armorType: 'heavy', hint: 'Towering brutes with a lot of health.', hpMul: 1.25, speedMul: 0.85, size: 0.6 },
  /* 19 */ { name: 'Wyvern', shape: 'dragon', colors: ['#50688e', '#1a2840', '#ff9f3a'], armorType: 'heavy', hint: 'AIR. Armored wyverns.', air: true },
  /* 20 */ { name: 'Frost Colossus', shape: 'golem', colors: ['#8fc4e8', '#23508c', '#e6fbff'], armorType: 'fortified', title: 'BOSS', hint: 'BOSS. A walking glacier.', boss: true },
  /* 21 */ { name: 'Crystal Beetle', shape: 'beetle', colors: ['#2f9fb0', '#123640', '#ff5ad1'], armorType: 'medium', hint: 'Crystal carapaces that split into shards.', split: true, armorAdd: 3, hpMul: 0.65 },
  /* 22 */ { name: 'Banshee', shape: 'banshee', colors: ['#c8b8f0', '#4a3494', '#ffffff'], armorType: 'spirit', hint: 'Fast and IMMUNE to crowd control.', immune: true, speedMul: 1.25, hpMul: 0.9 },
  /* 23 */ { name: 'Plague Rats', shape: 'rat', colors: ['#6e655e', '#28221e', '#ff4a3a'], armorType: 'light', hint: 'SWARM. Thirty diseased rats.', swarm: true, speedMul: 1.15 },
  /* 24 */ { name: 'Winter Knight', shape: 'knight', colors: ['#8494b0', '#1a2032', '#ff4a3a'], armorType: 'heavy', hint: 'Plate armor and frost shields.', shield: 0.25, hpMul: 1.05 },
  /* 25 */ { name: 'Ice Drake', shape: 'dragon', colors: ['#6fb4e4', '#1a4480', '#ffffff'], armorType: 'heavy', hint: 'AIR. Drakes with thick scales.', air: true },
  /* 26 */ { name: 'Lich Acolyte', shape: 'lich', colors: ['#3a5a4c', '#1c2a26', '#8dff6a'], armorType: 'spirit', hint: 'HEALERS. Kill them quickly or they mend each other.', heal: true },
  /* 27 */ { name: 'Blood Bat', shape: 'bat', colors: ['#48445e', '#1a1826', '#ff3b5c'], armorType: 'light', hint: 'AIR SWARM. A cloud of bats.', air: true, swarm: true },
  /* 28 */ { name: 'Glacial Behemoth', shape: 'boar', colors: ['#7fa8c8', '#2a4460', '#9ff0ff'], armorType: 'fortified', hint: 'Regenerating fortified monsters.', regen: 0.004, size: 0.6 },
  /* 29 */ { name: 'Hydra Spawn', shape: 'spider', colors: ['#4f8a6e', '#1a3026', '#b8ff5a'], armorType: 'heavy', hint: 'Cut one down and two more crawl out.', split: true, hpMul: 0.7 },
  /* 30 */ { name: 'Queen of Rime', shape: 'banshee', colors: ['#dff4ff', '#5f9fd8', '#b36bff'], armorType: 'spirit', title: 'BOSS', hint: 'BOSS. Immune to crowd control. Heals her court.', boss: true, immune: true, heal: true },
  /* 31 */ { name: 'Storm Elemental', shape: 'elemental', colors: ['#8fe8ff', '#2f5fd8', '#fff27a'], armorType: 'medium', hint: 'Crackling and fast.', speedMul: 1.3, hpMul: 0.9 },
  /* 32 */ { name: 'Ice Titan', shape: 'golem', colors: ['#bcdcf4', '#3f6f98', '#7ff3ff'], armorType: 'fortified', hint: 'Enormous fortified titans.', hpMul: 1.1, speedMul: 0.85, size: 0.62, armorAdd: 2 },
  /* 33 */ { name: 'Ghost Rider', shape: 'wraith', colors: ['#9ff0d0', '#1f6a50', '#e8fff4'], armorType: 'spirit', hint: 'Fast, IMMUNE spirits on spectral steeds.', immune: true, speedMul: 1.3, hpMul: 0.9 },
  /* 34 */ { name: 'Frost Hydra', shape: 'hydra', colors: ['#5fae9c', '#1f463e', '#dcfff4'], armorType: 'heavy', hint: 'Heads regrow: splits when slain.', split: true, hpMul: 0.7 },
  /* 35 */ { name: 'Elder Dragon', shape: 'dragon', colors: ['#a8cef0', '#23407a', '#ffd35a'], armorType: 'heavy', hint: 'AIR. Ancient dragons of the north.', air: true, hpMul: 1.1, size: 0.62 },
  /* 36 */ { name: 'Frostforged Juggernaut', shape: 'knight', colors: ['#9aa8bc', '#1e2636', '#ff5a4f'], armorType: 'fortified', hint: 'Shielded and IMMUNE. Pure damage is king.', shield: 0.3, immune: true, speedMul: 0.9 },
  /* 37 */ { name: 'Wendigo', shape: 'wendigo', colors: ['#b8ae9e', '#3a3028', '#ff4a2a'], armorType: 'light', hint: 'Starving, fast, regenerating.', speedMul: 1.35, regen: 0.008, hpMul: 0.85 },
  /* 38 */ { name: 'Void Revenant', shape: 'wraith', colors: ['#5f44c8', '#120e22', '#36f0c8'], armorType: 'spirit', hint: 'IMMUNE healers from beyond.', immune: true, heal: true },
  /* 39 */ { name: 'Avalanche', shape: 'golem', colors: ['#dfe8f2', '#7a8ca0', '#5fe3ff'], armorType: 'fortified', hint: 'SWARM. The mountain comes down.', swarm: true, hpMul: 1.1 },
  /* 40 */ { name: 'The Winter Tyrant', shape: 'boss', colors: ['#c8dcf0', '#1a2a52', '#7ff3ff'], armorType: 'heavy', title: 'FINAL BOSS', hint: 'The Winter Tyrant himself. A leak costs 25 lives — and if he escapes, the north falls.', boss: true, immune: true, regen: 0.001, leak: 25 },
];

// ── The Thaw: support creeps that walk with the waves, and broods
const HEXER: ExtraSpec = { name: 'Rime Hexer', shape: 'lich', colors: ['#4a6f86', '#16232e', '#7ff3ff'], armorType: 'spirit', hpMul: 1.25, freeze: { every: 7, radius: 3.4, dur: 2.2 } };
const WARDEN: ExtraSpec = { name: 'Rune Warden', shape: 'knight', colors: ['#6e8fa0', '#1c2a36', '#8fd8ff'], armorType: 'fortified', hpMul: 1.6, armorAdd: 1, ward: { every: 4.5, radius: 2.6, pct: 0.22 } };
const DRUMMER: ExtraSpec = { name: 'War Drummer', shape: 'troll', colors: ['#8a6a4e', '#2e2016', '#ffb13a'], armorType: 'heavy', hpMul: 1.7, size: 0.5, haste: { radius: 3, pct: 0.3 } };
const SPIDERLING: ExtraSpec = { name: 'Spiderling', shape: 'spider', colors: ['#5a6a3e', '#1e2412', '#ffe14a'], armorType: 'light', hpMul: 0.16, size: 0.26 };
const HATCHLING: ExtraSpec = { name: 'Wyrmling', shape: 'dragon', colors: ['#6aa88e', '#1a3a2e', '#ffd35a'], armorType: 'medium', hpMul: 0.12, size: 0.32, air: true };

const T: WaveSpec[] = [
  /* 1 */ { name: 'Meltwater Ghoul', shape: 'ghoul', colors: ['#8fb3a8', '#2a3d3a', '#7dffcf'], armorType: 'light', hint: 'The great glacier is breaking, and what slept under it is waking. Build a maze!', hpMul: 1.1 },
  /* 2 */ { name: 'Bog Kobold', shape: 'biped', colors: ['#7f8a6a', '#2d3324', '#ffb347'], armorType: 'medium', hint: 'Kobolds from the flooded valleys.', hpMul: 1.35 },
  /* 3 */ { name: 'Ice Worm', shape: 'worm', colors: ['#c9d8e0', '#4c6878', '#ff6a4a'], armorType: 'light', hint: 'BURROW. Worms dive under the snow, out of reach, and come up further on. A long maze gives them time to surface.', burrow: { every: 3.5, dur: 1.5 }, hpMul: 1.0 },
  /* 4 */ { name: 'Mossback Boar', shape: 'boar', colors: ['#6b7a52', '#262c1a', '#ffcf40'], armorType: 'heavy', hint: 'Thick hides: Impact and Magic work best.', hpMul: 1.15 },
  /* 5 */ { name: 'Glimmer Sprite', shape: 'imp', colors: ['#8fe8ff', '#2a5f88', '#ffffff'], armorType: 'light', hint: 'BLINK. Sprites hop a few cells ahead along your maze. Stuns and slows keep them in place.', blink: { every: 2.8, cells: 3 }, hpMul: 0.95 },
  /* 6 */ { name: 'Thaw Gull', shape: 'bird', colors: ['#c8d4dc', '#3c4c58', '#ff8a3a'], armorType: 'light', hint: 'AIR. Gulls fly straight over your maze.', air: true },
  /* 7 */ { name: 'Rime Hound', shape: 'wolf', colors: ['#b8c8d4', '#34404c', '#ff3b5c'], armorType: 'light', hint: 'FRENZY. Wounded hounds bolt for the gate. Finish them off.', frenzy: { below: 0.5, speed: 0.7 }, speedMul: 1.2, hpMul: 1.0 },
  /* 8 */ { name: 'Broodmother', shape: 'spider', colors: ['#6a7a44', '#232912', '#ffe14a'], armorType: 'medium', hint: 'BROOD. Broodmothers drop spiderlings as they walk. Kill them early.', size: 0.55, count: 12, interval: 0.8, hpMul: 1.3, brood: { every: 3, count: 2, max: 3, child: SPIDERLING } },
  /* 9 */ { name: 'Floe Crab', shape: 'crab', colors: ['#6aa0b8', '#1c3a4a', '#ffb13a'], armorType: 'fortified', hint: 'FORTIFIED shells. Bring Impact or Pure damage.', armorAdd: 1, speedMul: 0.9 },
  /* 10 */ { name: 'Grimmaw the Deep Worm', shape: 'worm', colors: ['#d8c8b8', '#5a4030', '#ff4a2a'], armorType: 'heavy', title: 'BOSS', hint: 'BOSS. The great worm dives under your maze and surfaces further on. Costs 5 lives if it leaks.', boss: true, burrow: { every: 6, dur: 1.6 }, size: 0.8, escort: { n: 3, count: 8 } },
  /* 11 */ { name: 'Thaw Troll', shape: 'troll', colors: ['#7a9a7a', '#263826', '#ffcf40'], armorType: 'medium', hint: 'HEXERS walk with these trolls and freeze a tower in ice for a few seconds. Kill them first.', regen: 0.006, mix: { spec: HEXER, every: 5 } },
  /* 12 */ { name: 'Slush Imp', shape: 'imp', colors: ['#5f8fb0', '#1a2c40', '#7dffcf'], armorType: 'medium', hint: 'WARDENS shield the creeps around them. Burst through, or bring the warden down.', speedMul: 1.25, hpMul: 0.8, mix: { spec: WARDEN, every: 5 } },
  /* 13 */ { name: 'Storm Petrel', shape: 'bird', colors: ['#5f6f9a', '#1c2240', '#fff06a'], armorType: 'medium', hint: 'AIR. Petrels flit ahead in bursts.', air: true, blink: { every: 3.2, cells: 3 }, hpMul: 0.9 },
  /* 14 */ { name: 'Fog Revenant', shape: 'wraith', colors: ['#a8c8c0', '#2c4440', '#e8fff4'], armorType: 'spirit', hint: 'Revenants fade into the fog, out of reach, every few seconds.', burrow: { every: 4, dur: 1.4 }, hpMul: 0.95 },
  /* 15 */ { name: 'Glacier Golem', shape: 'golem', colors: ['#9fc4d8', '#30546c', '#7dffcf'], armorType: 'heavy', hint: 'Splits into two shards when destroyed.', split: true, hpMul: 0.7 },
  /* 16 */ { name: 'Tundra Wolf', shape: 'wolf', colors: ['#8a8070', '#2a2620', '#ff5a2a'], armorType: 'light', hint: 'WAR DRUMS: creeps near a drummer run 30% faster. Drummers are tough: focus them.', speedMul: 1.3, hpMul: 0.85, mix: { spec: DRUMMER, every: 5 } },
  /* 17 */ { name: 'Frost Wisp', shape: 'skull', colors: ['#a8f0ff', '#3a8ac0', '#ffffff'], armorType: 'spirit', hint: 'IMMUNE blinking wisps: slows and stuns do nothing.', immune: true, blink: { every: 3, cells: 3 }, hpMul: 0.8 },
  /* 18 */ { name: 'Thaw Giant', shape: 'giant', colors: ['#9a9a88', '#3a3a2c', '#ff8a3a'], armorType: 'heavy', hint: 'FRENZY. Giants go berserk when they are hurt.', hpMul: 1.25, speedMul: 0.85, size: 0.6, frenzy: { below: 0.35, speed: 0.8 } },
  /* 19 */ { name: 'Wyvern Matron', shape: 'dragon', colors: ['#5a8a74', '#1a3026', '#ffd35a'], armorType: 'heavy', hint: 'AIR. Matrons drop wyrmlings on the way.', air: true, hpMul: 0.85, brood: { every: 4, count: 1, max: 2, child: HATCHLING } },
  /* 20 */ { name: 'The Hexmother', shape: 'lich', colors: ['#3f5f78', '#101c26', '#b36bff'], armorType: 'spirit', title: 'BOSS', hint: 'BOSS. She freezes towers all around her and shields her escort.', boss: true, immune: true, size: 0.75, freeze: { every: 3.5, radius: 4.5, dur: 3 }, ward: { every: 5, radius: 3, pct: 0.2 }, escort: { n: 18, count: 6 } },
  /* 21 */ { name: 'Shardback Beetle', shape: 'beetle', colors: ['#3fa0a0', '#123636', '#ff5ad1'], armorType: 'fortified', hint: 'Armored beetles that dig under your towers.', burrow: { every: 4, dur: 1.4 }, armorAdd: 2, hpMul: 0.7 },
  /* 22 */ { name: 'Mist Banshee', shape: 'banshee', colors: ['#c0d8e0', '#3a5868', '#7dffcf'], armorType: 'spirit', hint: 'Fast, IMMUNE, and shielded by wardens.', immune: true, speedMul: 1.2, hpMul: 0.8, mix: { spec: WARDEN, every: 6 } },
  /* 23 */ { name: 'Bog Rats', shape: 'rat', colors: ['#5e6a4e', '#20261a', '#ffcf40'], armorType: 'light', hint: 'SWARM. Thirty rats that panic and sprint when hurt.', swarm: true, speedMul: 1.1, frenzy: { below: 0.5, speed: 0.6 } },
  /* 24 */ { name: 'Thaw Knight', shape: 'knight', colors: ['#8a9aa8', '#1e2832', '#7dffcf'], armorType: 'heavy', hint: 'Shielded knights, with hexers in the ranks.', shield: 0.25, hpMul: 0.95, mix: { spec: HEXER, every: 6 } },
  /* 25 */ { name: 'Storm Drake', shape: 'dragon', colors: ['#5a7ac8', '#1a2a5a', '#fff06a'], armorType: 'heavy', hint: 'AIR. Drakes that blink ahead.', air: true, blink: { every: 3.5, cells: 4 }, hpMul: 0.9 },
  /* 26 */ { name: 'Lich Acolyte', shape: 'lich', colors: ['#4a6a4c', '#1c2a1e', '#8dff6a'], armorType: 'spirit', hint: 'HEALERS. Kill them quickly or they mend each other.', heal: true },
  /* 27 */ { name: 'Mire Bat', shape: 'bat', colors: ['#4e5a48', '#1a2018', '#ffe14a'], armorType: 'light', hint: 'AIR SWARM. A cloud of bats.', air: true, swarm: true, hpMul: 0.9 },
  /* 28 */ { name: 'Floe Behemoth', shape: 'boar', colors: ['#8ab0c0', '#2a4450', '#7dffcf'], armorType: 'fortified', hint: 'Regenerating behemoths that charge when hurt.', regen: 0.004, size: 0.6, frenzy: { below: 0.4, speed: 0.5 } },
  /* 29 */ { name: 'Brood Queen', shape: 'spider', colors: ['#7a5a3e', '#2a1c12', '#ffe14a'], armorType: 'heavy', hint: 'BROOD. Queens are big, and so are their broods.', size: 0.6, count: 10, interval: 0.9, hpMul: 1.15, brood: { every: 2.6, count: 2, max: 3, child: SPIDERLING } },
  /* 30 */ { name: 'The Storm Herald', shape: 'giant', colors: ['#7a8ac8', '#1e2450', '#fff06a'], armorType: 'heavy', title: 'BOSS', hint: 'BOSS. He blinks ahead, and his drums drive the pack behind him.', boss: true, blink: { every: 5.5, cells: 4 }, haste: { radius: 4, pct: 0.3 }, escort: { n: 7, count: 8 } },
  /* 31 */ { name: 'Storm Sprite', shape: 'elemental', colors: ['#9ff0ff', '#2f6fd8', '#fff27a'], armorType: 'medium', hint: 'Crackling sprites that blink ahead.', blink: { every: 2.6, cells: 3 }, speedMul: 1.1, hpMul: 0.75 },
  /* 32 */ { name: 'Ice Titan', shape: 'golem', colors: ['#bcdcf4', '#3f6f98', '#7dffcf'], armorType: 'fortified', hint: 'Fortified titans, shielded by wardens.', hpMul: 1.0, speedMul: 0.85, size: 0.62, armorAdd: 2, mix: { spec: WARDEN, every: 5 } },
  /* 33 */ { name: 'Ghost Rider', shape: 'wraith', colors: ['#9ff0d0', '#1f6a50', '#e8fff4'], armorType: 'spirit', hint: 'Fast, IMMUNE riders that fade into the fog.', immune: true, speedMul: 1.25, hpMul: 0.7, burrow: { every: 5, dur: 1.1 } },
  /* 34 */ { name: 'Frost Hydra', shape: 'hydra', colors: ['#5fae9c', '#1f463e', '#dcfff4'], armorType: 'heavy', hint: 'Heads regrow: splits when slain.', split: true, hpMul: 0.7 },
  /* 35 */ { name: 'Elder Wyrm', shape: 'dragon', colors: ['#6aa8a0', '#1a3a3a', '#ffd35a'], armorType: 'heavy', hint: 'AIR. Ancient wyrms with their young.', air: true, hpMul: 0.95, size: 0.62, brood: { every: 5, count: 1, max: 2, child: HATCHLING } },
  /* 36 */ { name: 'Thaw Juggernaut', shape: 'knight', colors: ['#9aa8bc', '#1e2636', '#ffb13a'], armorType: 'fortified', hint: 'Shielded, IMMUNE, and driven on by drummers.', shield: 0.3, immune: true, speedMul: 0.9, hpMul: 0.9, mix: { spec: DRUMMER, every: 5 } },
  /* 37 */ { name: 'Wendigo', shape: 'wendigo', colors: ['#b8ae9e', '#3a3028', '#7dffcf'], armorType: 'light', hint: 'Starving, fast, regenerating, and frenzied when hurt.', speedMul: 1.3, regen: 0.008, hpMul: 0.8, frenzy: { below: 0.4, speed: 0.5 } },
  /* 38 */ { name: 'Void Revenant', shape: 'wraith', colors: ['#5f44c8', '#120e22', '#36f0c8'], armorType: 'spirit', hint: 'IMMUNE healers, with hexers among them.', immune: true, heal: true, hpMul: 0.95, mix: { spec: HEXER, every: 5 } },
  /* 39 */ { name: 'Avalanche', shape: 'golem', colors: ['#dfe8f2', '#7a8ca0', '#7dffcf'], armorType: 'fortified', hint: 'SWARM. The mountain comes down, with drummers.', swarm: true, hpMul: 1.0, mix: { spec: DRUMMER, every: 7 } },
  /* 40 */ { name: 'The Hollow King', shape: 'boss', colors: ['#8a9a8a', '#1a221e', '#7dffcf'], armorType: 'heavy', title: 'FINAL BOSS', hint: 'The Hollow King, who slept under the glacier. He freezes towers and runs wild when hurt. If he escapes, the north falls.', boss: true, immune: true, regen: 0.001, leak: 25, freeze: { every: 3, radius: 5, dur: 2.5 }, frenzy: { below: 0.3, speed: 0.5 }, escort: { n: 38, count: 6 } },
];

export type WaveSetId = 'classic' | 'thaw';

export interface WaveSet {
  id: WaveSetId;
  name: string;
  blurb: string;
  waves: WaveDef[];
}

export const CREEPS: Record<string, CreepDef> = {};

function sizeFor(spec: { size?: number; boss?: boolean; swarm?: boolean; air?: boolean }): number {
  if (spec.size) return spec.size;
  if (spec.boss) return 0.85;
  if (spec.swarm) return 0.32;
  if (spec.air) return 0.45;
  return 0.42;
}

const abilities = (s: Abilities): Abilities => ({ burrow: s.burrow, blink: s.blink, ward: s.ward, frenzy: s.frenzy, freeze: s.freeze, haste: s.haste });

/** Turns a list of wave specs into creeps (added to CREEPS) and waves; creep ids start with `prefix`. */
function buildWaves(prefix: string, specs: WaveSpec[]): WaveDef[] {
  const waves: WaveDef[] = [];
  const creepId = (n: number, suffix = '') => `${prefix}${String(n).padStart(2, '0')}${suffix}`;
  const extra = (id: string, e: ExtraSpec, n: number, speed: number, bounty: number): CreepDef => ({
    id,
    name: e.name,
    hp: Math.round(baseHp(n) * e.hpMul),
    armor: baseArmor(n) + (e.armorAdd ?? 0),
    armorType: e.armorType,
    speed: +speed.toFixed(2),
    bounty,
    leak: 1,
    air: e.air,
    immune: e.immune,
    ...abilities(e),
    size: e.size ?? sizeFor(e),
    shape: e.shape,
    colors: e.colors,
  });
  specs.forEach((spec, i) => {
    const n = i + 1;
    let hp = baseHp(n) * (spec.hpMul ?? 1);
    let count = spec.count ?? 20;
    let interval = spec.interval ?? 0.55;
    let speed = baseSpeed(n) * (spec.speedMul ?? 1);
    let bounty = baseBounty(n);
    if (spec.air) {
      hp *= 0.55;
      count = 12;
      interval = 0.75;
      speed *= 0.72;
      bounty += 1;
    }
    if (spec.swarm) {
      hp *= spec.air ? 0.34 : 0.5;
      count = spec.air ? 24 : 30;
      interval = 0.33;
      bounty = Math.max(1, Math.ceil(bounty * 0.6));
    }
    if (spec.boss) {
      hp *= n === 40 ? 10 : 8 + n * 0.25; // 10.5x, 13x, 15.5x; the final boss is 10x but has 25 armor
      count = 1;
      speed *= 0.75;
      bounty = 40 * n;
    }
    const id = creepId(n);
    CREEPS[id] = {
      id,
      name: spec.name,
      hp: Math.round(hp),
      armor: baseArmor(n) + (spec.armorAdd ?? 0) + (spec.boss ? 5 : 0),
      armorType: spec.armorType,
      speed: +speed.toFixed(2),
      bounty,
      leak: spec.leak ?? (spec.boss ? 5 : 1),
      air: spec.air,
      boss: spec.boss,
      immune: spec.immune,
      regen: spec.regen,
      shield: spec.shield,
      heal: spec.heal ? { every: 3, radius: 2.5, pct: spec.boss ? 0.04 : 0.03 } : undefined,
      ...abilities(spec),
      size: sizeFor(spec),
      shape: spec.shape,
      colors: spec.colors,
    };
    if (spec.split) {
      const child = creepId(n, 's');
      CREEPS[child] = {
        ...CREEPS[id],
        id: child,
        name: `${spec.name} Shard`,
        hp: Math.round(hp * 0.35),
        bounty: Math.max(1, Math.floor(bounty / 2)),
        size: CREEPS[id].size * 0.65,
        speed: +(speed * 1.15).toFixed(2),
        shield: undefined,
      };
      CREEPS[id].split = { into: child, count: 2 };
    }
    if (spec.brood) {
      const b = spec.brood;
      const child = creepId(n, 'b');
      CREEPS[child] = extra(child, b.child, n, speed * 1.2, 1);
      CREEPS[id].brood = { every: b.every, into: child, count: b.count, max: b.max };
    }
    const wave: WaveDef = {
      n,
      creep: id,
      count,
      interval,
      title: spec.title ?? (spec.air ? 'AIR' : spec.swarm ? 'SWARM' : ''),
      hint: spec.hint,
    };
    if (spec.mix) {
      const mid = creepId(n, 'm');
      // support creeps keep the pace of the wave they walk with
      CREEPS[mid] = extra(mid, spec.mix.spec, n, speed, bounty * 2);
      wave.mix = { creep: mid, every: spec.mix.every };
    }
    if (spec.escort) wave.escort = { creep: creepId(spec.escort.n), count: spec.escort.count };
    else if (spec.boss && n !== 40) {
      // escorts: a pack of the previous wave's creep
      wave.escort = { creep: creepId(n - 1), count: 8 };
    }
    if (n === 40 && !spec.escort) {
      wave.escort = { creep: creepId(38), count: 6 };
    }
    waves.push(wave);
  });
  return waves;
}

/** The classic waves. */
export const WAVES: WaveDef[] = buildWaves('w', W);

export const WAVE_SETS: Record<WaveSetId, WaveSet> = {
  classic: { id: 'classic', name: 'Classic', blurb: 'The forty waves of the long winter, as in the original.', waves: WAVES },
  thaw: { id: 'thaw', name: 'The Thaw', blurb: 'What slept under the glacier: creeps that burrow, blink, breed, shield each other and freeze towers.', waves: buildWaves('t', T) },
};

export function wavesOf(set?: WaveSetId): WaveDef[] {
  return (set && WAVE_SETS[set]?.waves) || WAVES;
}

/** Endless mode: waves past the final boss recycle the roster with growing health. */
export function endlessWave(n: number, set?: WaveSetId): { wave: WaveDef; creep: CreepDef } {
  const waves = wavesOf(set);
  const pool = waves.filter((w) => !CREEPS[w.creep].boss && w.n > 10);
  const base = pool[(n * 7) % pool.length];
  const src = CREEPS[base.creep];
  const scale = baseHp(n) / baseHp(base.n) * Math.pow(1.04, n - FINAL_WAVE);
  const creep: CreepDef = {
    ...src,
    id: set && set !== 'classic' ? `${set}-e${n}` : `e${n}`,
    hp: Math.round(src.hp * scale),
    armor: src.armor + Math.floor((n - FINAL_WAVE) / 3),
    bounty: src.bounty + Math.floor((n - FINAL_WAVE) / 2),
    speed: +(src.speed * 1.05).toFixed(2),
    split: undefined,
  };
  return {
    // support creeps and broods stay with the base wave's own creeps; endless waves are plain
    wave: { ...base, n, creep: creep.id, escort: undefined, mix: undefined, title: 'ENDLESS', hint: `Endless ${n - FINAL_WAVE}: ${src.name} (stronger)` },
    creep: { ...creep, brood: undefined },
  };
}

export function waveDef(n: number, set?: WaveSetId): WaveDef | undefined {
  return wavesOf(set)[n - 1];
}
