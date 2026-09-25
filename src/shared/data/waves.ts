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
  /* 1 */ { name: 'Snow Hare', shape: 'hare', colors: ['#f4f7fb', '#c9d6e6', '#ff9fb2'], armorType: 'light', hint: 'Build a maze! Every kill pays — spend it right away.', hpMul: 1.1 },
  /* 2 */ { name: 'Frost Kobold', shape: 'biped', colors: ['#6f9bc8', '#2f4f73', '#ffd35a'], armorType: 'medium', hint: 'Small raiders with wooden shields.', hpMul: 1.35 },
  /* 3 */ { name: 'Ice Wolf', shape: 'wolf', colors: ['#cfe3f5', '#7fa4c8', '#5fe3ff'], armorType: 'light', hint: 'Fast pack hunters.', speedMul: 1.35, hpMul: 1.1 },
  /* 4 */ { name: 'Tundra Boar', shape: 'boar', colors: ['#8a6a55', '#4d3a2e', '#f2e6d0'], armorType: 'heavy', hint: 'Thick hides: Impact and Magic work best.', hpMul: 1.15 },
  /* 5 */ { name: 'Snow Owl', shape: 'bird', colors: ['#f7f9fc', '#b9c7d8', '#ffc629'], armorType: 'light', hint: 'AIR. Owls fly straight over your maze.', air: true },
  /* 6 */ { name: 'Frost Troll', shape: 'troll', colors: ['#7fb3a8', '#3c6b61', '#e8f0ec'], armorType: 'medium', hint: 'Trolls regenerate. Burst them down.', regen: 0.01 },
  /* 7 */ { name: 'Rime Spider', shape: 'spider', colors: ['#9fb8d0', '#34465c', '#8fd3ff'], armorType: 'light', hint: 'SWARM. Thirty skittering spiders. Splash shines.', swarm: true },
  /* 8 */ { name: 'Glacier Crab', shape: 'crab', colors: ['#7ab0d8', '#2f5f8a', '#e6f6ff'], armorType: 'fortified', hint: 'FORTIFIED shells. Bring Impact or Pure damage.', armorAdd: 1, speedMul: 0.9 },
  /* 9 */ { name: 'Wisp Lantern', shape: 'wisp', colors: ['#b8f3ff', '#5fb8e6', '#ffffff'], armorType: 'spirit', hint: 'SPIRITS shrug off physical damage. Magic burns them.' },
  /* 10 */ { name: 'Mammoth Warlord', shape: 'giant', colors: ['#8e6b52', '#4f3a2c', '#f2efe6'], armorType: 'heavy', title: 'BOSS', hint: 'BOSS. A war-mammoth and its escort. Costs 5 lives if it leaks.', boss: true },
  /* 11 */ { name: 'Ice Imp', shape: 'biped', colors: ['#8fd3ff', '#3c6fb5', '#ff5a4f'], armorType: 'medium', hint: 'Quick little devils.', speedMul: 1.3, hpMul: 0.85 },
  /* 12 */ { name: 'Shieldbearer', shape: 'knight', colors: ['#9aa6b8', '#4a5468', '#7cc8ff'], armorType: 'fortified', hint: 'Frost shields absorb the first 30% of damage.', shield: 0.3, speedMul: 0.95 },
  /* 13 */ { name: 'Storm Harpy', shape: 'bird', colors: ['#b39ad8', '#5a4a7a', '#fff27a'], armorType: 'medium', hint: 'AIR. Harpies dive straight for the exit.', air: true },
  /* 14 */ { name: 'Frozen Revenant', shape: 'wraith', colors: ['#a9e8ff', '#3f7fa8', '#e0fbff'], armorType: 'spirit', hint: 'Restless dead that knit themselves back together.', regen: 0.008 },
  /* 15 */ { name: 'Snow Golem', shape: 'golem', colors: ['#eef4fa', '#9fb8d0', '#5fe3ff'], armorType: 'heavy', hint: 'Splits into two snowlings when destroyed.', split: true, hpMul: 0.7 },
  /* 16 */ { name: 'Direwolf', shape: 'wolf', colors: ['#6a6f78', '#2f3238', '#ff5a4f'], armorType: 'light', hint: 'A fast pack. Slow them or they slip through.', speedMul: 1.45, hpMul: 0.85 },
  /* 17 */ { name: 'Ice Wraith', shape: 'wraith', colors: ['#d8f6ff', '#7cc8ff', '#b36bff'], armorType: 'spirit', hint: 'IMMUNE to slows, stuns and pulls. The hard one.', immune: true, hpMul: 1.05 },
  /* 18 */ { name: 'Frost Giant', shape: 'giant', colors: ['#9fc4e0', '#4f7fa8', '#ffffff'], armorType: 'heavy', hint: 'Towering brutes with a lot of health.', hpMul: 1.25, speedMul: 0.85, size: 0.6 },
  /* 19 */ { name: 'Wyvern', shape: 'dragon', colors: ['#6f8fb8', '#2f4a70', '#ffae4f'], armorType: 'heavy', hint: 'AIR. Armored wyverns.', air: true },
  /* 20 */ { name: 'Frost Colossus', shape: 'golem', colors: ['#bfe6ff', '#3c74c4', '#ffffff'], armorType: 'fortified', title: 'BOSS', hint: 'BOSS. A walking glacier.', boss: true },
  /* 21 */ { name: 'Crystal Beetle', shape: 'beetle', colors: ['#7ff3ff', '#2f7a8a', '#ff7fd1'], armorType: 'medium', hint: 'Crystal carapaces that split into shards.', split: true, armorAdd: 3, hpMul: 0.65 },
  /* 22 */ { name: 'Banshee', shape: 'wraith', colors: ['#e8d8ff', '#8a6bd6', '#ffffff'], armorType: 'spirit', hint: 'Fast and IMMUNE to crowd control.', immune: true, speedMul: 1.25, hpMul: 0.9 },
  /* 23 */ { name: 'Snow Stalker', shape: 'hare', colors: ['#dfe8f0', '#8fa4b8', '#5fe3ff'], armorType: 'light', hint: 'SWARM. Thirty white stalkers.', swarm: true, speedMul: 1.15 },
  /* 24 */ { name: 'Winter Knight', shape: 'knight', colors: ['#c8d4e6', '#3c4a68', '#ffd35a'], armorType: 'heavy', hint: 'Plate armor and frost shields.', shield: 0.25, hpMul: 1.05 },
  /* 25 */ { name: 'Ice Drake', shape: 'dragon', colors: ['#9fdcff', '#3c74c4', '#ffffff'], armorType: 'heavy', hint: 'AIR. Drakes with thick scales.', air: true },
  /* 26 */ { name: 'Lich Acolyte', shape: 'wraith', colors: ['#7be0c8', '#2a4a5a', '#b8ff80'], armorType: 'spirit', hint: 'HEALERS. Kill them quickly or they mend each other.', heal: true },
  /* 27 */ { name: 'Frost Bat', shape: 'bat', colors: ['#6a7aa8', '#2a3050', '#ff5a8a'], armorType: 'light', hint: 'AIR SWARM. A cloud of bats.', air: true, swarm: true },
  /* 28 */ { name: 'Glacial Behemoth', shape: 'boar', colors: ['#8fb8d8', '#3a5a7a', '#e6f6ff'], armorType: 'fortified', hint: 'Regenerating fortified monsters.', regen: 0.004, size: 0.6 },
  /* 29 */ { name: 'Hydra Spawn', shape: 'spider', colors: ['#5fa88a', '#2a4a3a', '#b8ff80'], armorType: 'heavy', hint: 'Cut one down and two more crawl out.', split: true, hpMul: 0.7 },
  /* 30 */ { name: 'Queen of Rime', shape: 'wraith', colors: ['#f0faff', '#7cc8ff', '#b36bff'], armorType: 'spirit', title: 'BOSS', hint: 'BOSS. Immune to crowd control. Heals her court.', boss: true, immune: true, heal: true },
  /* 31 */ { name: 'Storm Elemental', shape: 'elemental', colors: ['#9ff3ff', '#3c7dff', '#fff27a'], armorType: 'medium', hint: 'Crackling and fast.', speedMul: 1.3, hpMul: 0.9 },
  /* 32 */ { name: 'Ice Titan', shape: 'golem', colors: ['#d0ecff', '#4f7fa8', '#7ff3ff'], armorType: 'fortified', hint: 'Enormous fortified titans.', hpMul: 1.1, speedMul: 0.85, size: 0.62, armorAdd: 2 },
  /* 33 */ { name: 'Ghost Rider', shape: 'wraith', colors: ['#b8ffe6', '#2f8a6a', '#ffffff'], armorType: 'spirit', hint: 'Fast, IMMUNE spirits on spectral steeds.', immune: true, speedMul: 1.3, hpMul: 0.9 },
  /* 34 */ { name: 'Frost Hydra', shape: 'dragon', colors: ['#6fc8b8', '#2a5a50', '#e6fff8'], armorType: 'heavy', hint: 'Heads regrow: splits when slain.', split: true, hpMul: 0.7 },
  /* 35 */ { name: 'Elder Dragon', shape: 'dragon', colors: ['#c8e6ff', '#2f4f8a', '#ffd35a'], armorType: 'heavy', hint: 'AIR. Ancient dragons of the north.', air: true, hpMul: 1.1, size: 0.62 },
  /* 36 */ { name: 'Frostforged Juggernaut', shape: 'knight', colors: ['#a8b8cc', '#2a3448', '#ff5a4f'], armorType: 'fortified', hint: 'Shielded and IMMUNE. Pure damage is king.', shield: 0.3, immune: true, speedMul: 0.9 },
  /* 37 */ { name: 'Wendigo', shape: 'troll', colors: ['#d8d0c0', '#5a4a3a', '#ff5a4f'], armorType: 'light', hint: 'Starving, fast, regenerating.', speedMul: 1.35, regen: 0.008, hpMul: 0.85 },
  /* 38 */ { name: 'Void Revenant', shape: 'wraith', colors: ['#6a4ad6', '#140f22', '#36f0c8'], armorType: 'spirit', hint: 'IMMUNE healers from beyond.', immune: true, heal: true },
  /* 39 */ { name: 'Avalanche', shape: 'golem', colors: ['#f4f8fc', '#9fb0c4', '#6a7a8c'], armorType: 'fortified', hint: 'SWARM. The mountain comes down.', swarm: true, hpMul: 1.1 },
  /* 40 */ { name: 'The Winter Tyrant', shape: 'boss', colors: ['#d8f0ff', '#1f3f7a', '#7ff3ff'], armorType: 'heavy', title: 'FINAL BOSS', hint: 'The Winter Tyrant himself. A leak costs 25 lives — and if he escapes, the north falls.', boss: true, immune: true, regen: 0.001, leak: 25 },
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
