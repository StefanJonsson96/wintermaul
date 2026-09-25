import type { ArmorType, CreepDef, CreepShape, WaveDef } from '../types';

// The creep line-up. Like the classic map, one creep type per level, 20 per spawn,
// fewer on air levels, and a boss every tenth level. HP follows a smooth curve so it can be
// tuned in one place (see `npm run balance`).

export const FINAL_WAVE = 40;

/** Baseline hit points of an ordinary creep on wave n. */
export function baseHp(n: number): number {
  return 23.4 * Math.pow(n, 1.019) * Math.pow(1.0694, n);
}
export const baseSpeed = (n: number) => 2.3 + n * 0.022;
export const baseArmor = (n: number) => Math.floor(n / 2);
export const baseBounty = (n: number) => 2 + Math.floor(n / 3);

interface WaveSpec {
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

export const CREEPS: Record<string, CreepDef> = {};
export const WAVES: WaveDef[] = [];

function creepId(n: number, suffix = ''): string {
  return `w${String(n).padStart(2, '0')}${suffix}`;
}

function sizeFor(spec: WaveSpec): number {
  if (spec.size) return spec.size;
  if (spec.boss) return 0.85;
  if (spec.swarm) return 0.32;
  if (spec.air) return 0.45;
  return 0.42;
}

W.forEach((spec, i) => {
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
    hp *= n === 40 ? 10 : 8 + n * 0.25; // 10.5x, 13x, 15.5x; the Tyrant is 10x but has 25 armor
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
  const wave: WaveDef = {
    n,
    creep: id,
    count,
    interval,
    title: spec.title ?? (spec.air ? 'AIR' : spec.swarm ? 'SWARM' : ''),
    hint: spec.hint,
  };
  if (spec.boss && n !== 40) {
    // escorts: a pack of the previous wave's creep
    wave.escort = { creep: creepId(n - 1), count: 8 };
  }
  if (n === 40) {
    wave.escort = { creep: creepId(38), count: 6 };
  }
  WAVES.push(wave);
});

/** Endless mode: waves past the final boss recycle the roster with growing health. */
export function endlessWave(n: number): { wave: WaveDef; creep: CreepDef } {
  const pool = WAVES.filter((w) => !CREEPS[w.creep].boss && w.n > 10);
  const base = pool[(n * 7) % pool.length];
  const src = CREEPS[base.creep];
  const scale = baseHp(n) / baseHp(base.n) * Math.pow(1.04, n - FINAL_WAVE);
  const creep: CreepDef = {
    ...src,
    id: `e${n}`,
    hp: Math.round(src.hp * scale),
    armor: src.armor + Math.floor((n - FINAL_WAVE) / 3),
    bounty: src.bounty + Math.floor((n - FINAL_WAVE) / 2),
    speed: +(src.speed * 1.05).toFixed(2),
    split: undefined,
  };
  return {
    wave: { ...base, n, creep: creep.id, escort: undefined, title: 'ENDLESS', hint: `Endless ${n - FINAL_WAVE}: ${src.name} (stronger)` },
    creep,
  };
}

export function waveDef(n: number): WaveDef | undefined {
  return WAVES[n - 1];
}
