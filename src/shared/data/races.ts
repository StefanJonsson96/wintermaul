import type { RaceDef, TowerDef } from '../types';

// Every race has the same tree shape, like the upgrade chains of Wintermaul One:
//
//   T1 (cheap maze wall) ─┬─ T2a ─ T3a ─ T4a
//                         └─ T2b ─ T3b ─ T4b
//   + a Legend tower that costs 1 lumber (one per race you own).
//
// Costs are incremental (what you pay to build or to upgrade from the parent).
// Ranges are in cells; towers are 2x2 cells. Balanced with `npm run balance`.

export const RACES: RaceDef[] = [
  {
    id: 'frost',
    name: 'Frostborn',
    element: 'Ice',
    difficulty: 1,
    tags: ['Slow', 'Freeze', 'Control'],
    blurb: 'Glacial towers that slow and freeze. Weak damage alone, but they make every other tower better.',
    color: '#7cc8ff',
    accent: '#e6f6ff',
    icon: 'snowflake',
  },
  {
    id: 'fire',
    name: 'Emberforge',
    element: 'Fire',
    difficulty: 1,
    tags: ['Splash', 'Burn', 'Artillery'],
    blurb: 'Splash, burning ground and meteors. Shreds packed waves; struggles against fortified shells and air.',
    color: '#ff7a2f',
    accent: '#ffd08a',
    icon: 'flame',
  },
  {
    id: 'storm',
    name: 'Stormcallers',
    element: 'Lightning',
    difficulty: 2,
    tags: ['Chain', 'Fast', 'Anti-air'],
    blurb: 'Lightning that leaps between enemies. The Thunder Rod carves a slice off every creep\'s health.',
    color: '#5fe3ff',
    accent: '#fff27a',
    icon: 'bolt',
  },
  {
    id: 'stone',
    name: 'Stonewardens',
    element: 'Earth',
    difficulty: 1,
    tags: ['Cheap walls', 'Crits', 'Stun'],
    blurb: 'The cheapest walls in the game and brutal short-range crits. Quake totems stun whole groups.',
    color: '#b59a74',
    accent: '#8fd46a',
    icon: 'mountain',
  },
  {
    id: 'arcane',
    name: 'Arcanum',
    element: 'Arcane',
    difficulty: 2,
    tags: ['Beams', 'Armor shred', 'Support'],
    blurb: 'Beams that grow stronger the longer they burn, runes that strip armor and nexuses that empower allies.',
    color: '#b36bff',
    accent: '#ff8ff0',
    icon: 'rune',
  },
  {
    id: 'venom',
    name: 'Venomkin',
    element: 'Poison',
    difficulty: 2,
    tags: ['Poison', 'Slow', '% Health'],
    blurb: 'Stacking poisons that ignore armor. The Crawler Nest halves a creep\'s health in one bite.',
    color: '#7be04a',
    accent: '#c86bff',
    icon: 'drop',
  },
  {
    id: 'tech',
    name: 'Clockwork',
    element: 'Tech',
    difficulty: 1,
    tags: ['Long range', 'Missiles', 'Snipers'],
    blurb: 'Rifles, rails and rockets with enormous range. Slow to fire, but nothing escapes their reach.',
    color: '#d9a441',
    accent: '#ff5a4f',
    icon: 'gear',
  },
  {
    id: 'shadow',
    name: 'Umbral',
    element: 'Shadow',
    difficulty: 3,
    tags: ['Execute', 'Curse', 'Pull'],
    blurb: 'Curses, executions and black holes that drag creeps back through your maze.',
    color: '#8a5cff',
    accent: '#36f0c8',
    icon: 'eye',
  },
  {
    id: 'sun',
    name: 'Sunguard',
    element: 'Radiant',
    difficulty: 2,
    tags: ['Auras', 'Support', 'Anti-spirit'],
    blurb: 'Holy wardens and auras that speed up nearby towers and slow the enemy. Great next to any race.',
    color: '#ffd35a',
    accent: '#fff6d8',
    icon: 'sun',
  },
  {
    id: 'grove',
    name: 'Wildgrove',
    element: 'Nature',
    difficulty: 2,
    tags: ['Growth', 'Roots', 'Late game'],
    blurb: 'Living towers that level up as they fight. Plant early, and the forest grows into a fortress.',
    color: '#4fcf6b',
    accent: '#d5f28a',
    icon: 'leaf',
  },
  {
    id: 'gold',
    name: 'Goldhoard',
    element: 'Fortune',
    difficulty: 3,
    tags: ['Economy', 'Interest', 'Gamble'],
    blurb: 'Goblin bankers. Vaults pay interest, hunters pay bounties — greed now, firepower later.',
    color: '#ffc629',
    accent: '#3fd18a',
    icon: 'coin',
  },
  {
    id: 'prism',
    name: 'Prismatic',
    element: 'Crystal',
    difficulty: 3,
    tags: ['Pure damage', 'Multishot', 'Late game'],
    blurb: 'Expensive crystals with pure damage that ignores armor classes. Slow start, unmatched finish.',
    color: '#ff7fd1',
    accent: '#7ff3ff',
    icon: 'gem',
  },
];

type Def = Omit<TowerDef, 'upgrades'>;

const LEGEND_COST = 800;

const DEFS: Def[] = [
  // ─────────────────────────────── FROSTBORN ───────────────────────────────
  {
    id: 'frost_1', name: 'Frost Shard', race: 'frost', tier: 1, cost: 10, buildTime: 1,
    attack: { dmg: [7, 9], cd: 1.0, range: 4.5, type: 'elemental', targets: 'both', proj: 'frost', projSpeed: 11,
      onHit: { slow: { pct: 0.15, dur: 1.5 } } },
    desc: 'A humming shard of ice. Slows what it hits.',
    art: { shape: 'crystal', primary: '#bfe6ff', secondary: '#4f8fd6', glow: '#8fd3ff' },
  },
  {
    id: 'frost_2a', name: 'Glacier Spire', race: 'frost', tier: 2, cost: 40, parent: 'frost_1', buildTime: 2,
    attack: { dmg: [34, 42], cd: 1.0, range: 5, type: 'elemental', targets: 'both', proj: 'frost', projSpeed: 12,
      onHit: { slow: { pct: 0.25, dur: 2 } } },
    desc: 'Heavier bolts and a deeper chill.',
    art: { shape: 'spire', primary: '#d8f1ff', secondary: '#4a86cc', glow: '#8fd3ff' },
  },
  {
    id: 'frost_3a', name: 'Rime Obelisk', race: 'frost', tier: 3, cost: 110, parent: 'frost_2a', buildTime: 3,
    attack: { dmg: [120, 140], cd: 1.0, range: 5.5, type: 'elemental', targets: 'both', proj: 'frost', projSpeed: 13,
      onHit: { slow: { pct: 0.35, dur: 2.5 }, stun: { chance: 0.1, dur: 0.8 } } },
    desc: 'Its bolts can freeze a creep solid.',
    art: { shape: 'obelisk', primary: '#e3f5ff', secondary: '#3c74c4', glow: '#9fdcff' },
  },
  {
    id: 'frost_4a', name: 'Absolute Zero', race: 'frost', tier: 4, cost: 300, parent: 'frost_3a', buildTime: 4,
    attack: { dmg: [360, 420], cd: 1.0, range: 6, type: 'elemental', targets: 'both', proj: 'frost', projSpeed: 14,
      onHit: { slow: { pct: 0.45, dur: 3 }, stun: { chance: 0.15, dur: 1.2 }, shatter: 1.5 } },
    desc: 'Freezes often and shatters frozen targets for +50% damage.',
    art: { shape: 'crystal', primary: '#ffffff', secondary: '#2f64b8', glow: '#b8ecff' },
  },
  {
    id: 'frost_2b', name: 'Snowball Lobber', race: 'frost', tier: 2, cost: 40, parent: 'frost_1', buildTime: 2,
    attack: { dmg: [22, 28], cd: 1.2, range: 5, type: 'elemental', targets: 'ground', proj: 'frost', projSpeed: 8,
      splash: 1.3, onHit: { slow: { pct: 0.2, dur: 2 } } },
    desc: 'Lobs packed snow that slows everything it splashes. Ground only.',
    art: { shape: 'mortar', primary: '#e8f6ff', secondary: '#5a8fc9', glow: '#a9dcff' },
  },
  {
    id: 'frost_3b', name: 'Blizzard Totem', race: 'frost', tier: 3, cost: 110, parent: 'frost_2b', buildTime: 3,
    aura: { radius: 3.5, enemySlowPct: 0.25, enemyDps: 40 },
    desc: 'A permanent blizzard: enemies nearby are slowed and take constant frost damage.',
    art: { shape: 'totem', primary: '#dff2ff', secondary: '#3b6fb5', glow: '#8fd3ff' },
  },
  {
    id: 'frost_4b', name: "Winter's Heart", race: 'frost', tier: 4, cost: 300, parent: 'frost_3b', buildTime: 4,
    pulse: { every: 3, radius: 3.5, targets: 'both', dmg: 300, type: 'elemental',
      onHit: { stun: { chance: 1, dur: 1.0 }, slow: { pct: 0.4, dur: 2 } } },
    aura: { radius: 3.5, enemySlowPct: 0.25, enemyDps: 60 },
    desc: 'Every 3s a frost nova freezes everything around it for 1s. Bosses are slowed instead.',
    art: { shape: 'orb', primary: '#f2fbff', secondary: '#2f64b8', glow: '#c6f0ff' },
  },
  {
    id: 'frost_L', name: 'Glacial Colossus', race: 'frost', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    attack: { dmg: [1000, 1200], cd: 1.3, range: 6.5, type: 'elemental', targets: 'both', proj: 'frost', projSpeed: 12,
      splash: 1.8, onHit: { slow: { pct: 0.5, dur: 3 }, stun: { chance: 0.25, dur: 1.5 }, shatter: 1.5 } },
    desc: 'LEGEND. Hurls glaciers that freeze whole groups.',
    art: { shape: 'crystal', primary: '#ffffff', secondary: '#1f4f9e', glow: '#d6f5ff' },
  },

  // ─────────────────────────────── EMBERFORGE ──────────────────────────────
  {
    id: 'fire_1', name: 'Cinder Pot', race: 'fire', tier: 1, cost: 10, buildTime: 1,
    attack: { dmg: [8, 11], cd: 1.2, range: 4.5, type: 'elemental', targets: 'both', proj: 'fireball', projSpeed: 10,
      splash: 0.9 },
    desc: 'Spits cinders with a small splash.',
    art: { shape: 'brazier', primary: '#5a3a2e', secondary: '#ff7a2f', glow: '#ffae4f' },
  },
  {
    id: 'fire_2a', name: 'Flame Dancer', race: 'fire', tier: 2, cost: 40, parent: 'fire_1', buildTime: 2,
    attack: { dmg: [16, 20], cd: 0.55, range: 4.5, type: 'elemental', targets: 'both', proj: 'fireball', projSpeed: 12,
      onHit: { dot: { dps: 10, dur: 3, maxStacks: 1, kind: 'burn' } } },
    desc: 'Rapid fire bolts that set targets ablaze.',
    art: { shape: 'brazier', primary: '#6b3b2a', secondary: '#ff5a1f', glow: '#ff9a3c' },
  },
  {
    id: 'fire_3a', name: 'Salamander Pit', race: 'fire', tier: 3, cost: 110, parent: 'fire_2a', buildTime: 3,
    attack: { dmg: [50, 60], cd: 0.45, range: 4.5, type: 'elemental', targets: 'both', proj: 'fireball', projSpeed: 13,
      splash: 0.8, onHit: { dot: { dps: 35, dur: 3, maxStacks: 1, kind: 'burn' } } },
    desc: 'A pit of salamanders spitting burning splashes.',
    art: { shape: 'pool', primary: '#4a2418', secondary: '#ff6a1a', glow: '#ffb347' },
  },
  {
    id: 'fire_4a', name: 'Inferno Engine', race: 'fire', tier: 4, cost: 300, parent: 'fire_3a', buildTime: 4,
    attack: { dmg: [140, 160], cd: 0.4, range: 4.5, type: 'elemental', targets: 'both', proj: 'flame', line: true,
      onHit: { dot: { dps: 80, dur: 3, maxStacks: 1, kind: 'burn' } } },
    desc: 'A roaring flamethrower that burns every enemy in a line.',
    art: { shape: 'turret', primary: '#3d2a24', secondary: '#ff5a1f', glow: '#ffcf4f' },
  },
  {
    id: 'fire_2b', name: 'Meteor Watch', race: 'fire', tier: 2, cost: 40, parent: 'fire_1', buildTime: 2,
    attack: { dmg: [36, 46], cd: 1.6, range: 6, type: 'impact', targets: 'ground', proj: 'meteor', projSpeed: 8,
      splash: 1.5 },
    desc: 'Calls small meteors with a wide splash. Ground only.',
    art: { shape: 'obelisk', primary: '#4e3a33', secondary: '#ff7a2f', glow: '#ffae4f' },
  },
  {
    id: 'fire_3b', name: 'Magma Mortar', race: 'fire', tier: 3, cost: 110, parent: 'fire_2b', buildTime: 3,
    attack: { dmg: [130, 160], cd: 1.8, range: 7, type: 'impact', targets: 'ground', proj: 'meteor', projSpeed: 8,
      splash: 2.0, groundFire: { dps: 25, dur: 3, radius: 1.2 } },
    desc: 'Molten shells leave burning ground behind. Ground only.',
    art: { shape: 'mortar', primary: '#3a2a26', secondary: '#ff6a1a', glow: '#ffae4f' },
  },
  {
    id: 'fire_4b', name: 'Volcano', race: 'fire', tier: 4, cost: 300, parent: 'fire_3b', buildTime: 4,
    attack: { dmg: [400, 480], cd: 2.0, range: 8, type: 'impact', targets: 'ground', proj: 'meteor', projSpeed: 8,
      splash: 2.5, groundFire: { dps: 70, dur: 3, radius: 1.5 } },
    desc: 'A miniature volcano raining lava over a huge area. Ground only.',
    art: { shape: 'rock', primary: '#3b2620', secondary: '#ff4a10', glow: '#ff9a2f' },
  },
  {
    id: 'fire_L', name: 'Phoenix Aerie', race: 'fire', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    attack: { dmg: [700, 800], cd: 1.0, range: 7, type: 'elemental', targets: 'both', proj: 'fireball', projSpeed: 14,
      chain: { count: 5, range: 3, falloff: 0.1 }, onHit: { dot: { dps: 150, dur: 3, maxStacks: 1, kind: 'burn' } } },
    desc: 'LEGEND. A phoenix flame that leaps through six enemies and sets them ablaze.',
    art: { shape: 'brazier', primary: '#5a2a18', secondary: '#ffcf4f', glow: '#ff7a2f' },
  },

  // ─────────────────────────────── STORMCALLERS ────────────────────────────
  {
    id: 'storm_1', name: 'Spark Coil', race: 'storm', tier: 1, cost: 10, buildTime: 1,
    attack: { dmg: [3, 5], cd: 0.45, range: 4.5, type: 'elemental', targets: 'both', proj: 'lightning' },
    desc: 'Tiny zaps, very fast.',
    art: { shape: 'coil', primary: '#5a6272', secondary: '#5fe3ff', glow: '#9ff3ff' },
  },
  {
    id: 'storm_2a', name: 'Tesla Coil', race: 'storm', tier: 2, cost: 40, parent: 'storm_1', buildTime: 2,
    attack: { dmg: [16, 20], cd: 0.8, range: 4.5, type: 'elemental', targets: 'both', proj: 'lightning',
      chain: { count: 3, range: 2.5, falloff: 0.15 } },
    desc: 'Lightning that jumps to 3 more enemies.',
    art: { shape: 'coil', primary: '#4f5868', secondary: '#5fe3ff', glow: '#b4f6ff' },
  },
  {
    id: 'storm_3a', name: 'Arc Tower', race: 'storm', tier: 3, cost: 110, parent: 'storm_2a', buildTime: 3,
    attack: { dmg: [55, 65], cd: 0.8, range: 5, type: 'elemental', targets: 'both', proj: 'lightning',
      chain: { count: 5, range: 3, falloff: 0.1 } },
    desc: 'Chains through 6 enemies.',
    art: { shape: 'coil', primary: '#454e60', secondary: '#7ff0ff', glow: '#d0fbff' },
  },
  {
    id: 'storm_4a', name: 'Tempest Spire', race: 'storm', tier: 4, cost: 300, parent: 'storm_3a', buildTime: 4,
    attack: { dmg: [170, 190], cd: 0.75, range: 5.5, type: 'elemental', targets: 'both', proj: 'lightning',
      chain: { count: 7, range: 3.5, falloff: 0.08 }, onHit: { stun: { chance: 0.08, dur: 0.5 } } },
    desc: 'A storm in a bottle: chains through 8 enemies and sometimes stuns.',
    art: { shape: 'spire', primary: '#3d4658', secondary: '#9ff3ff', glow: '#e0fdff' },
  },
  {
    id: 'storm_2b', name: 'Ion Rod', race: 'storm', tier: 2, cost: 40, parent: 'storm_1', buildTime: 2,
    attack: { dmg: [28, 34], cd: 0.9, range: 5.5, type: 'elemental', targets: 'both', proj: 'lightning',
      onHit: { bonusVsAir: 2 } },
    desc: 'Double damage against flying enemies.',
    art: { shape: 'obelisk', primary: '#4a5468', secondary: '#fff27a', glow: '#fff7b0' },
  },
  {
    id: 'storm_3b', name: 'Thunder Rod', race: 'storm', tier: 3, cost: 110, parent: 'storm_2b', buildTime: 3,
    pulse: { every: 2.5, radius: 3.5, targets: 'both', dmg: 25, type: 'elemental',
      onHit: { percentCurrent: { pct: 0.12, bossPct: 0.015 } } },
    desc: 'Every 2.5s thunder strikes all nearby enemies for 12% of their current health.',
    art: { shape: 'coil', primary: '#3f475a', secondary: '#fff27a', glow: '#fffac2' },
  },
  {
    id: 'storm_4b', name: 'Stormeye', race: 'storm', tier: 4, cost: 300, parent: 'storm_3b', buildTime: 4,
    attack: { dmg: [150, 170], cd: 0.7, range: 6, type: 'elemental', targets: 'both', proj: 'lightning', multishot: 4,
      onHit: { bonusVsAir: 1.5 } },
    desc: 'Strikes four enemies at once. Extra damage to flyers.',
    art: { shape: 'orb', primary: '#3a4356', secondary: '#fff27a', glow: '#fffbd0' },
  },
  {
    id: 'storm_L', name: 'Sky Hammer', race: 'storm', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    attack: { dmg: [330, 370], cd: 0.25, range: 7, type: 'elemental', targets: 'both', proj: 'lightning',
      chain: { count: 3, range: 3, falloff: 0.2 } },
    desc: 'LEGEND. A continuous thunderstorm of chaining bolts.',
    art: { shape: 'spire', primary: '#2f374a', secondary: '#fff27a', glow: '#b4f6ff' },
  },

  // ─────────────────────────────── STONEWARDENS ────────────────────────────
  {
    id: 'stone_1', name: 'Rubble Wall', race: 'stone', tier: 1, cost: 6, buildTime: 0.8,
    attack: { dmg: [8, 12], cd: 1.3, range: 4, type: 'impact', targets: 'both', proj: 'rock', projSpeed: 9,
      crit: { chance: 0.1, mult: 2 } },
    desc: 'The cheapest wall in the game. Throws the odd pebble.',
    art: { shape: 'rock', primary: '#8c8479', secondary: '#6d9c4a', glow: '#c9b08a' },
  },
  {
    id: 'stone_2a', name: 'Boulder Sling', race: 'stone', tier: 2, cost: 40, parent: 'stone_1', buildTime: 2,
    attack: { dmg: [40, 52], cd: 1.2, range: 4, type: 'impact', targets: 'both', proj: 'rock', projSpeed: 10,
      crit: { chance: 0.15, mult: 2 } },
    desc: 'Short range, heavy hits, frequent crits.',
    art: { shape: 'turret', primary: '#8a7d6c', secondary: '#5a4a3a', glow: '#d8c09a' },
  },
  {
    id: 'stone_3a', name: 'Granite Fist', race: 'stone', tier: 3, cost: 110, parent: 'stone_2a', buildTime: 3,
    attack: { dmg: [140, 170], cd: 1.2, range: 4, type: 'impact', targets: 'both', proj: 'rock', projSpeed: 11,
      crit: { chance: 0.2, mult: 2.5 } },
    desc: 'Crushing blows with 20% chance to deal 2.5x damage.',
    art: { shape: 'totem', primary: '#7d7466', secondary: '#4f4539', glow: '#e8cf9a' },
  },
  {
    id: 'stone_4a', name: 'Mountain Heart', race: 'stone', tier: 4, cost: 300, parent: 'stone_3a', buildTime: 4,
    attack: { dmg: [420, 500], cd: 1.2, range: 4.5, type: 'impact', targets: 'both', proj: 'rock', projSpeed: 12,
      crit: { chance: 0.25, mult: 3 } },
    desc: 'A living mountain. 25% chance to deal triple damage.',
    art: { shape: 'rock', primary: '#6f675c', secondary: '#9fd46a', glow: '#ffd98a' },
  },
  {
    id: 'stone_2b', name: 'Quake Totem', race: 'stone', tier: 2, cost: 40, parent: 'stone_1', buildTime: 2,
    pulse: { every: 2.5, radius: 2.5, targets: 'ground', dmg: 30, type: 'impact', onHit: { stun: { chance: 0.2, dur: 0.8 } } },
    desc: 'Stomps the ground, damaging and sometimes stunning nearby enemies. Ground only.',
    art: { shape: 'totem', primary: '#8e7f6a', secondary: '#6d9c4a', glow: '#d8c09a' },
  },
  {
    id: 'stone_3b', name: 'Seismic Pillar', race: 'stone', tier: 3, cost: 110, parent: 'stone_2b', buildTime: 3,
    pulse: { every: 2.4, radius: 3, targets: 'ground', dmg: 110, type: 'impact', onHit: { stun: { chance: 1, dur: 0.6 } } },
    desc: 'Every stomp stuns all nearby ground enemies. Ground only.',
    art: { shape: 'obelisk', primary: '#857866', secondary: '#6d9c4a', glow: '#e8cf9a' },
  },
  {
    id: 'stone_4b', name: 'Earthshaker', race: 'stone', tier: 4, cost: 300, parent: 'stone_3b', buildTime: 4,
    pulse: { every: 2.2, radius: 3.5, targets: 'ground', dmg: 320, type: 'impact',
      onHit: { stun: { chance: 1, dur: 0.9 }, sunder: { armor: 3, dur: 5, maxStacks: 1 } } },
    desc: 'Massive quakes: stun and crack enemy armor (-3). Ground only.',
    art: { shape: 'rock', primary: '#7a6d5c', secondary: '#9fd46a', glow: '#ffe0a0' },
  },
  {
    id: 'stone_L', name: 'Titan Idol', race: 'stone', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    attack: { dmg: [1400, 1700], cd: 1.8, range: 4.5, type: 'impact', targets: 'both', proj: 'rock', projSpeed: 12,
      splash: 1.0, crit: { chance: 0.3, mult: 4 }, onHit: { stun: { chance: 0.3, dur: 1 } } },
    desc: 'LEGEND. An ancient titan. 30% chance to deal 4x damage.',
    art: { shape: 'totem', primary: '#6a6258', secondary: '#ffd98a', glow: '#ffe7b0' },
  },

  // ─────────────────────────────── ARCANUM ─────────────────────────────────
  {
    id: 'arcane_1', name: 'Rune Stone', race: 'arcane', tier: 1, cost: 10, buildTime: 1,
    attack: { dmg: [8, 10], cd: 1.0, range: 5, type: 'magic', targets: 'both', proj: 'arcane', projSpeed: 12 },
    desc: 'A carved stone that fires arcane bolts.',
    art: { shape: 'shrine', primary: '#4c3d6e', secondary: '#b36bff', glow: '#d9a8ff' },
  },
  {
    id: 'arcane_2a', name: 'Mana Beam', race: 'arcane', tier: 2, cost: 40, parent: 'arcane_1', buildTime: 2,
    attack: { dmg: [22, 22], cd: 0.1, range: 5, type: 'magic', targets: 'both', proj: 'beam',
      beam: { ramp: 0.6, maxMult: 3, keepOnKill: 0.5 } },
    desc: 'A beam whose damage ramps up to 3x while it stays on one target.',
    art: { shape: 'orb', primary: '#3f3160', secondary: '#b36bff', glow: '#e0b8ff' },
  },
  {
    id: 'arcane_3a', name: 'Ley Lance', race: 'arcane', tier: 3, cost: 110, parent: 'arcane_2a', buildTime: 3,
    attack: { dmg: [70, 70], cd: 0.1, range: 5.5, type: 'magic', targets: 'both', proj: 'beam',
      beam: { ramp: 0.6, maxMult: 3.5, keepOnKill: 0.5 } },
    desc: 'Taps the ley lines. Ramps to 3.5x.',
    art: { shape: 'spire', primary: '#3a2d5a', secondary: '#c98bff', glow: '#ecd0ff' },
  },
  {
    id: 'arcane_4a', name: 'Astral Ray', race: 'arcane', tier: 4, cost: 300, parent: 'arcane_3a', buildTime: 4,
    attack: { dmg: [190, 190], cd: 0.1, range: 6, type: 'magic', targets: 'both', proj: 'beam',
      beam: { ramp: 0.7, maxMult: 4, keepOnKill: 0.7 } },
    desc: 'Ramps to 4x and keeps most of its power when the target dies.',
    art: { shape: 'orb', primary: '#302550', secondary: '#ff8ff0', glow: '#ffd0f8' },
  },
  {
    id: 'arcane_2b', name: 'Hex Prism', race: 'arcane', tier: 2, cost: 40, parent: 'arcane_1', buildTime: 2,
    attack: { dmg: [18, 24], cd: 1.0, range: 5, type: 'magic', targets: 'both', proj: 'arcane', projSpeed: 12,
      onHit: { sunder: { armor: 2, dur: 5, maxStacks: 5 } } },
    desc: 'Each hit strips 2 armor (stacks 5 times).',
    art: { shape: 'crystal', primary: '#6a4ea8', secondary: '#ff8ff0', glow: '#e0b8ff' },
  },
  {
    id: 'arcane_3b', name: 'Warding Obelisk', race: 'arcane', tier: 3, cost: 110, parent: 'arcane_2b', buildTime: 3,
    attack: { dmg: [45, 55], cd: 1.0, range: 5, type: 'magic', targets: 'both', proj: 'arcane', projSpeed: 13,
      onHit: { sunder: { armor: 3, dur: 5, maxStacks: 5 } } },
    aura: { radius: 4, towerDmgPct: 0.15 },
    desc: 'Towers within 4 cells deal +15% damage. Its bolts strip armor.',
    art: { shape: 'obelisk', primary: '#43346c', secondary: '#b36bff', glow: '#d9a8ff' },
  },
  {
    id: 'arcane_4b', name: 'Nexus of Power', race: 'arcane', tier: 4, cost: 300, parent: 'arcane_3b', buildTime: 4,
    attack: { dmg: [110, 130], cd: 1.0, range: 5.5, type: 'magic', targets: 'both', proj: 'arcane', projSpeed: 14,
      onHit: { amplify: { pct: 0.15, dur: 3 } } },
    aura: { radius: 4.5, towerDmgPct: 0.3, towerSpdPct: 0.1 },
    desc: 'Towers within 4.5 cells deal +30% damage and attack 10% faster. Hits make enemies take +15% damage.',
    art: { shape: 'orb', primary: '#3a2c62', secondary: '#ff8ff0', glow: '#f3c8ff' },
  },
  {
    id: 'arcane_L', name: 'Archmage Spire', race: 'arcane', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    attack: { dmg: [230, 270], cd: 1.1, range: 7, type: 'magic', targets: 'both', proj: 'arcane', projSpeed: 14,
      multishot: 6, onHit: { sunder: { armor: 2, dur: 5, maxStacks: 5 } } },
    desc: 'LEGEND. An arcane barrage at six enemies at once.',
    art: { shape: 'spire', primary: '#2d2250', secondary: '#ff8ff0', glow: '#f3c8ff' },
  },

  // ─────────────────────────────── VENOMKIN ────────────────────────────────
  {
    id: 'venom_1', name: 'Spitter', race: 'venom', tier: 1, cost: 10, buildTime: 1,
    attack: { dmg: [4, 6], cd: 1.0, range: 4.5, type: 'elemental', targets: 'both', proj: 'poison', projSpeed: 10,
      onHit: { dot: { dps: 4, dur: 4, maxStacks: 5, kind: 'poison' } } },
    desc: 'Spits poison that stacks up to 5 times and ignores armor.',
    art: { shape: 'pool', primary: '#2f3a28', secondary: '#7be04a', glow: '#a6ff6a' },
  },
  {
    id: 'venom_2a', name: 'Toxic Spire', race: 'venom', tier: 2, cost: 40, parent: 'venom_1', buildTime: 2,
    attack: { dmg: [12, 16], cd: 1.0, range: 5, type: 'elemental', targets: 'both', proj: 'poison', projSpeed: 11,
      onHit: { dot: { dps: 12, dur: 5, maxStacks: 5, kind: 'poison' }, slow: { pct: 0.15, dur: 2 } } },
    desc: 'Stronger stacking poison that also slows.',
    art: { shape: 'spire', primary: '#34402c', secondary: '#7be04a', glow: '#b8ff80' },
  },
  {
    id: 'venom_3a', name: 'Plague Cauldron', race: 'venom', tier: 3, cost: 110, parent: 'venom_2a', buildTime: 3,
    attack: { dmg: [30, 40], cd: 1.1, range: 5, type: 'elemental', targets: 'both', proj: 'poison', projSpeed: 10,
      splash: 1.0, onHit: { dot: { dps: 35, dur: 5, maxStacks: 6, kind: 'poison' }, spreadOnDeath: 1.8 } },
    desc: 'Splashing plague. When a poisoned creep dies, its poison spreads to its neighbours.',
    art: { shape: 'pool', primary: '#2a3322', secondary: '#9cff5a', glow: '#c86bff' },
  },
  {
    id: 'venom_4a', name: 'Blight Colossus', race: 'venom', tier: 4, cost: 300, parent: 'venom_3a', buildTime: 4,
    attack: { dmg: [80, 100], cd: 1.0, range: 5.5, type: 'elemental', targets: 'both', proj: 'poison', projSpeed: 12,
      onHit: { dot: { dps: 100, dur: 6, maxStacks: 8, kind: 'poison' }, slow: { pct: 0.25, dur: 2 } } },
    desc: 'Crippling poison that stacks up to 8 times.',
    art: { shape: 'totem', primary: '#2d3526', secondary: '#c86bff', glow: '#a6ff6a' },
  },
  {
    id: 'venom_2b', name: 'Sludge Flinger', race: 'venom', tier: 2, cost: 40, parent: 'venom_1', buildTime: 2,
    attack: { dmg: [16, 22], cd: 1.3, range: 5.5, type: 'elemental', targets: 'ground', proj: 'poison', projSpeed: 8,
      splash: 1.3, onHit: { slow: { pct: 0.3, dur: 2.5 } } },
    desc: 'Globs of sludge slow everything they splash. Ground only.',
    art: { shape: 'mortar', primary: '#303a2a', secondary: '#7be04a', glow: '#a6ff6a' },
  },
  {
    id: 'venom_3b', name: 'Crawler Nest', race: 'venom', tier: 3, cost: 140, parent: 'venom_2b', buildTime: 3,
    attack: { dmg: [1, 1], cd: 7, range: 4, type: 'elemental', targets: 'both', proj: 'poison', projSpeed: 9,
      onHit: { percentCurrent: { pct: 0.3, bossPct: 0.03 }, slow: { pct: 0.4, dur: 3 } } },
    desc: 'A crawler bite removes 30% of the target\'s current health (3% for bosses).',
    art: { shape: 'pool', primary: '#26301f', secondary: '#c86bff', glow: '#a6ff6a' },
  },
  {
    id: 'venom_4b', name: 'Hydra Den', race: 'venom', tier: 4, cost: 300, parent: 'venom_3b', buildTime: 4,
    attack: { dmg: [80, 100], cd: 0.8, range: 5, type: 'elemental', targets: 'both', proj: 'poison', projSpeed: 12,
      multishot: 3, onHit: { dot: { dps: 45, dur: 5, maxStacks: 6, kind: 'poison' } } },
    desc: 'Three heads, three targets, stacking venom.',
    art: { shape: 'totem', primary: '#2a3322', secondary: '#7be04a', glow: '#c86bff' },
  },
  {
    id: 'venom_L', name: 'Mother of Plagues', race: 'venom', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    pulse: { every: 2, radius: 4, targets: 'both', dmg: 100, type: 'elemental',
      onHit: { dot: { dps: 250, dur: 5, maxStacks: 3, kind: 'poison' }, amplify: { pct: 0.2, dur: 3 } } },
    desc: 'LEGEND. Poison novas that stack and make enemies take +20% damage.',
    art: { shape: 'pool', primary: '#1f2819', secondary: '#c86bff', glow: '#b8ff80' },
  },

  // ─────────────────────────────── CLOCKWORK ───────────────────────────────
  {
    id: 'tech_1', name: 'Rifle Post', race: 'tech', tier: 1, cost: 10, buildTime: 1,
    attack: { dmg: [7, 9], cd: 0.9, range: 6, type: 'pierce', targets: 'both', proj: 'bullet', projSpeed: 20 },
    desc: 'Cheap and long-ranged.',
    art: { shape: 'turret', primary: '#7b705f', secondary: '#d9a441', glow: '#ffd27a' },
  },
  {
    id: 'tech_2a', name: 'Sniper Nest', race: 'tech', tier: 2, cost: 40, parent: 'tech_1', buildTime: 2,
    attack: { dmg: [60, 72], cd: 1.8, range: 9, type: 'pierce', targets: 'both', proj: 'bullet', projSpeed: 30,
      crit: { chance: 0.2, mult: 2 } },
    desc: 'Huge range. 20% chance of a double-damage headshot.',
    art: { shape: 'turret', primary: '#6a6150', secondary: '#d9a441', glow: '#ffe0a0' },
  },
  {
    id: 'tech_3a', name: 'Railgun', race: 'tech', tier: 3, cost: 110, parent: 'tech_2a', buildTime: 3,
    attack: { dmg: [230, 270], cd: 2.2, range: 10, type: 'pierce', targets: 'both', proj: 'rail', line: true },
    desc: 'Hits every enemy in a line to the edge of its range.',
    art: { shape: 'turret', primary: '#5d5548', secondary: '#ff5a4f', glow: '#ff9c8a' },
  },
  {
    id: 'tech_4a', name: 'Orbital Lance', race: 'tech', tier: 4, cost: 300, parent: 'tech_3a', buildTime: 4,
    attack: { dmg: [800, 900], cd: 2.4, range: 14, type: 'pure', targets: 'both', proj: 'rail', splash: 1.0 },
    desc: 'A satellite strike anywhere in the lane. Pure damage.',
    art: { shape: 'spire', primary: '#5a5245', secondary: '#ff5a4f', glow: '#ffd27a' },
  },
  {
    id: 'tech_2b', name: 'Rocket Pod', race: 'tech', tier: 2, cost: 40, parent: 'tech_1', buildTime: 2,
    attack: { dmg: [30, 38], cd: 1.5, range: 6.5, type: 'impact', targets: 'both', proj: 'missile', projSpeed: 9,
      splash: 1.2 },
    desc: 'Rockets with splash damage.',
    art: { shape: 'mortar', primary: '#6d6454', secondary: '#ff5a4f', glow: '#ffae4f' },
  },
  {
    id: 'tech_3b', name: 'Missile Battery', race: 'tech', tier: 3, cost: 110, parent: 'tech_2b', buildTime: 3,
    attack: { dmg: [48, 58], cd: 1.4, range: 7, type: 'impact', targets: 'both', proj: 'missile', projSpeed: 10,
      splash: 1.0, multishot: 3 },
    desc: 'Three missiles at three targets.',
    art: { shape: 'mortar', primary: '#5f5748', secondary: '#d9a441', glow: '#ffae4f' },
  },
  {
    id: 'tech_4b', name: 'Doomsday Silo', race: 'tech', tier: 4, cost: 300, parent: 'tech_3b', buildTime: 4,
    attack: { dmg: [1000, 1200], cd: 6, range: 16, type: 'impact', targets: 'ground', proj: 'missile', projSpeed: 6,
      splash: 3.0, splashFalloff: 0.5 },
    desc: 'A nuke every 6 seconds. Enormous range and splash. Ground only.',
    art: { shape: 'vault', primary: '#565044', secondary: '#ff5a4f', glow: '#ffcf4f' },
  },
  {
    id: 'tech_L', name: 'Gatling Fortress', race: 'tech', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    attack: { dmg: [100, 120], cd: 0.1, range: 7, type: 'pierce', targets: 'both', proj: 'bullet', projSpeed: 26 },
    desc: 'LEGEND. Ten shots a second.',
    art: { shape: 'turret', primary: '#4f493e', secondary: '#ffd27a', glow: '#ffe0a0' },
  },

  // ─────────────────────────────── UMBRAL ──────────────────────────────────
  {
    id: 'shadow_1', name: 'Shade Idol', race: 'shadow', tier: 1, cost: 10, buildTime: 1,
    attack: { dmg: [7, 10], cd: 1.0, range: 4.5, type: 'magic', targets: 'both', proj: 'shadow', projSpeed: 11 },
    desc: 'A whispering idol that fires shadow bolts.',
    art: { shape: 'shrine', primary: '#2a2438', secondary: '#8a5cff', glow: '#36f0c8' },
  },
  {
    id: 'shadow_2a', name: 'Hex Totem', race: 'shadow', tier: 2, cost: 40, parent: 'shadow_1', buildTime: 2,
    attack: { dmg: [20, 26], cd: 1.0, range: 5, type: 'magic', targets: 'both', proj: 'shadow', projSpeed: 12,
      onHit: { amplify: { pct: 0.12, dur: 4 } } },
    desc: 'Curses its target: +12% damage taken from everything.',
    art: { shape: 'totem', primary: '#2d2640', secondary: '#8a5cff', glow: '#b99cff' },
  },
  {
    id: 'shadow_3a', name: 'Soul Reaper', race: 'shadow', tier: 3, cost: 110, parent: 'shadow_2a', buildTime: 3,
    attack: { dmg: [70, 85], cd: 1.0, range: 5, type: 'magic', targets: 'both', proj: 'shadow', projSpeed: 13,
      onHit: { execute: 0.15, amplify: { pct: 0.12, dur: 4 } } },
    econ: { killGold: 1 },
    desc: 'Executes non-boss enemies below 15% health. +1 gold per kill.',
    art: { shape: 'obelisk', primary: '#241e36', secondary: '#36f0c8', glow: '#8a5cff' },
  },
  {
    id: 'shadow_4a', name: 'Void Maw', race: 'shadow', tier: 4, cost: 300, parent: 'shadow_3a', buildTime: 4,
    attack: { dmg: [190, 220], cd: 1.0, range: 5.5, type: 'magic', targets: 'both', proj: 'shadow', projSpeed: 14,
      onHit: { execute: 0.25, amplify: { pct: 0.2, dur: 4 } } },
    econ: { killGold: 2 },
    desc: 'Executes below 25% health and curses for +20% damage taken. +2 gold per kill.',
    art: { shape: 'orb', primary: '#1d1830', secondary: '#36f0c8', glow: '#8a5cff' },
  },
  {
    id: 'shadow_2b', name: 'Gloom Spire', race: 'shadow', tier: 2, cost: 40, parent: 'shadow_1', buildTime: 2,
    aura: { radius: 3, enemySlowPct: 0.2, enemyDps: 12 },
    desc: 'An aura of gloom: nearby enemies are slowed 20% and wither.',
    art: { shape: 'spire', primary: '#2a2438', secondary: '#8a5cff', glow: '#6b4bd6' },
  },
  {
    id: 'shadow_3b', name: 'Singularity', race: 'shadow', tier: 3, cost: 110, parent: 'shadow_2b', buildTime: 3,
    pulse: { every: 4, radius: 3.5, targets: 'both', dmg: 70, type: 'magic', pull: 2 },
    aura: { radius: 3, enemySlowPct: 0.2, enemyDps: 20 },
    desc: 'Every 4s drags nearby enemies 2 cells back through your maze.',
    art: { shape: 'orb', primary: '#1f1a30', secondary: '#8a5cff', glow: '#b99cff' },
  },
  {
    id: 'shadow_4b', name: 'Black Hole', race: 'shadow', tier: 4, cost: 300, parent: 'shadow_3b', buildTime: 4,
    pulse: { every: 5, radius: 4, targets: 'both', dmg: 480, type: 'magic', pull: 3, onHit: { slow: { pct: 0.5, dur: 2 } } },
    aura: { radius: 3.5, enemySlowPct: 0.25, enemyDps: 40 },
    desc: 'Every 5s pulls enemies 3 cells back, crushes them for 480 and slows them.',
    art: { shape: 'orb', primary: '#140f22', secondary: '#36f0c8', glow: '#8a5cff' },
  },
  {
    id: 'shadow_L', name: 'The Void', race: 'shadow', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    pulse: { every: 3.5, radius: 1.8, targets: 'both', annihilate: { bossPct: 0.04 } },
    desc: 'LEGEND. Every 3.5s, erases every non-boss enemy within 1.8 cells. Bosses lose 4% health.',
    art: { shape: 'orb', primary: '#07050d', secondary: '#8a5cff', glow: '#36f0c8' },
  },

  // ─────────────────────────────── SUNGUARD ────────────────────────────────
  {
    id: 'sun_1', name: 'Candle Shrine', race: 'sun', tier: 1, cost: 10, buildTime: 1,
    attack: { dmg: [6, 8], cd: 0.8, range: 4.5, type: 'magic', targets: 'both', proj: 'holy', projSpeed: 13 },
    desc: 'A small shrine of holy light.',
    art: { shape: 'shrine', primary: '#e9e1c8', secondary: '#ffd35a', glow: '#fff1b0' },
  },
  {
    id: 'sun_2a', name: 'Dawn Warden', race: 'sun', tier: 2, cost: 40, parent: 'sun_1', buildTime: 2,
    attack: { dmg: [26, 32], cd: 0.7, range: 5, type: 'magic', targets: 'both', proj: 'holy', projSpeed: 14 },
    desc: 'A vigilant warden. Quick, reliable damage.',
    art: { shape: 'spire', primary: '#efe6cc', secondary: '#ffd35a', glow: '#fff1b0' },
  },
  {
    id: 'sun_3a', name: 'Seraph', race: 'sun', tier: 3, cost: 110, parent: 'sun_2a', buildTime: 3,
    attack: { dmg: [55, 65], cd: 0.4, range: 5, type: 'magic', targets: 'both', proj: 'holy', projSpeed: 16 },
    desc: 'Rapid holy lances.',
    art: { shape: 'obelisk', primary: '#f4ecd4', secondary: '#ffc629', glow: '#fff6d8' },
  },
  {
    id: 'sun_4a', name: 'Archon', race: 'sun', tier: 4, cost: 300, parent: 'sun_3a', buildTime: 4,
    attack: { dmg: [150, 170], cd: 0.35, range: 5.5, type: 'magic', targets: 'both', proj: 'holy', projSpeed: 18,
      onHit: { bonusVsArmor: { spirit: 1.5 } } },
    desc: 'A radiant avatar. +50% damage against spirits.',
    art: { shape: 'crystal', primary: '#fffaf0', secondary: '#ffc629', glow: '#fff6d8' },
  },
  {
    id: 'sun_2b', name: 'Beacon of Valor', race: 'sun', tier: 2, cost: 40, parent: 'sun_1', buildTime: 2,
    aura: { radius: 3.5, towerSpdPct: 0.15 },
    desc: 'Towers within 3.5 cells attack 15% faster.',
    art: { shape: 'brazier', primary: '#e3d9bb', secondary: '#ffd35a', glow: '#fff1b0' },
  },
  {
    id: 'sun_3b', name: 'Gatekeeper', race: 'sun', tier: 3, cost: 110, parent: 'sun_2b', buildTime: 3,
    aura: { radius: 4, towerSpdPct: 0.2, enemySlowPct: 0.3 },
    desc: 'Enemies within 4 cells are slowed 30%; towers attack 20% faster.',
    art: { shape: 'shrine', primary: '#ebe2c6', secondary: '#ffc629', glow: '#fff6d8' },
  },
  {
    id: 'sun_4b', name: 'Sun Cathedral', race: 'sun', tier: 4, cost: 300, parent: 'sun_3b', buildTime: 4,
    aura: { radius: 4.5, towerSpdPct: 0.3, towerDmgPct: 0.15, enemySlowPct: 0.35 },
    desc: 'Towers within 4.5 cells attack 30% faster and deal +15% damage. Enemies are slowed 35%.',
    art: { shape: 'vault', primary: '#f2ead2', secondary: '#ffc629', glow: '#fff6d8' },
  },
  {
    id: 'sun_L', name: 'Dawnbringer', race: 'sun', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    attack: { dmg: [1600, 1900], cd: 1.5, range: 8, type: 'magic', targets: 'both', proj: 'holy', projSpeed: 20 },
    econ: { lifePerWave: 1 },
    desc: 'LEGEND. Smites the strongest foe in range. Restores 1 team life each wave.',
    art: { shape: 'crystal', primary: '#fffdf5', secondary: '#ffb300', glow: '#fff6d8' },
  },

  // ─────────────────────────────── WILDGROVE ───────────────────────────────
  {
    id: 'grove_1', name: 'Thornling', race: 'grove', tier: 1, cost: 10, buildTime: 1,
    attack: { dmg: [6, 9], cd: 0.9, range: 4, type: 'pierce', targets: 'both', proj: 'thorn', projSpeed: 13 },
    growth: { xpPerLevel: 250, maxLevel: 5, dmgPerLevel: 0.12 },
    desc: 'A young thorn bush. Grows up to 5 levels (+12% damage each) as it deals damage.',
    art: { shape: 'tree', primary: '#3f8f3a', secondary: '#6b4a2e', glow: '#c9f28a' },
  },
  {
    id: 'grove_2a', name: 'Briar Archer', race: 'grove', tier: 2, cost: 40, parent: 'grove_1', buildTime: 2,
    attack: { dmg: [24, 30], cd: 0.8, range: 5.5, type: 'pierce', targets: 'both', proj: 'thorn', projSpeed: 15 },
    growth: { xpPerLevel: 1500, maxLevel: 5, dmgPerLevel: 0.12 },
    desc: 'Long-range thorn volleys. Keeps growing.',
    art: { shape: 'tree', primary: '#358a3a', secondary: '#5d4028', glow: '#d5f28a' },
  },
  {
    id: 'grove_3a', name: 'Elder Treant', race: 'grove', tier: 3, cost: 110, parent: 'grove_2a', buildTime: 3,
    attack: { dmg: [80, 100], cd: 1.0, range: 4.5, type: 'impact', targets: 'both', proj: 'rock', projSpeed: 11,
      onHit: { root: { chance: 0.1, dur: 1.2 } } },
    growth: { xpPerLevel: 5000, maxLevel: 5, dmgPerLevel: 0.12 },
    desc: 'Heavy blows that sometimes root enemies in place.',
    art: { shape: 'tree', primary: '#2f7a33', secondary: '#553a24', glow: '#9cf09f' },
  },
  {
    id: 'grove_4a', name: 'Ancient of Wrath', race: 'grove', tier: 4, cost: 300, parent: 'grove_3a', buildTime: 4,
    attack: { dmg: [240, 280], cd: 1.0, range: 5, type: 'impact', targets: 'both', proj: 'rock', projSpeed: 12,
      splash: 1.0, onHit: { root: { chance: 0.15, dur: 1.5 } } },
    growth: { xpPerLevel: 15000, maxLevel: 5, dmgPerLevel: 0.12 },
    desc: 'An ancient tree of war. Splash, roots, and it keeps growing.',
    art: { shape: 'tree', primary: '#2a6e2e', secondary: '#4a321f', glow: '#d5f28a' },
  },
  {
    id: 'grove_2b', name: 'Spore Pod', race: 'grove', tier: 2, cost: 40, parent: 'grove_1', buildTime: 2,
    attack: { dmg: [12, 15], cd: 1.3, range: 5, type: 'elemental', targets: 'ground', proj: 'poison', projSpeed: 8,
      splash: 1.5, onHit: { dot: { dps: 6, dur: 4, maxStacks: 3, kind: 'poison' } } },
    growth: { xpPerLevel: 1500, maxLevel: 5, dmgPerLevel: 0.12 },
    desc: 'Bursting spore clouds that poison groups. Ground only.',
    art: { shape: 'pool', primary: '#3d5a2a', secondary: '#d5f28a', glow: '#c9f28a' },
  },
  {
    id: 'grove_3b', name: 'Bramble Weaver', race: 'grove', tier: 3, cost: 110, parent: 'grove_2b', buildTime: 3,
    attack: { dmg: [50, 60], cd: 1.6, range: 5, type: 'pierce', targets: 'both', proj: 'thorn', projSpeed: 14,
      multishot: 3, onHit: { root: { chance: 0.4, dur: 1.2 } } },
    growth: { xpPerLevel: 5000, maxLevel: 5, dmgPerLevel: 0.12 },
    desc: 'Snares three enemies at a time, often rooting them.',
    art: { shape: 'tree', primary: '#467a2c', secondary: '#6b4a2e', glow: '#d5f28a' },
  },
  {
    id: 'grove_4b', name: 'World Tree', race: 'grove', tier: 4, cost: 300, parent: 'grove_3b', buildTime: 4,
    attack: { dmg: [160, 190], cd: 0.9, range: 5.5, type: 'pierce', targets: 'both', proj: 'thorn', projSpeed: 15,
      chain: { count: 2, range: 3, falloff: 0.2 } },
    aura: { radius: 4.5, xpRate: 1, towerDmgPct: 0.1 },
    growth: { xpPerLevel: 15000, maxLevel: 5, dmgPerLevel: 0.12 },
    desc: 'Nearby towers deal +10% damage and grow twice as fast.',
    art: { shape: 'tree', primary: '#3a8a3f', secondary: '#5d4028', glow: '#ffe98a' },
  },
  {
    id: 'grove_L', name: 'Heart of the Forest', race: 'grove', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    attack: { dmg: [1000, 1200], cd: 1.1, range: 7, type: 'pierce', targets: 'both', proj: 'thorn', projSpeed: 16,
      splash: 1.2, onHit: { root: { chance: 0.25, dur: 2 } } },
    growth: { xpPerLevel: 40000, maxLevel: 10, dmgPerLevel: 0.1 },
    desc: 'LEGEND. The forest\'s heart. Grows up to 10 levels.',
    art: { shape: 'tree', primary: '#2c7a34', secondary: '#4a321f', glow: '#fff08a' },
  },

  // ─────────────────────────────── GOLDHOARD ───────────────────────────────
  {
    id: 'gold_1', name: 'Coin Tosser', race: 'gold', tier: 1, cost: 10, buildTime: 1,
    attack: { dmg: [7, 9], cd: 0.9, range: 4.5, type: 'pierce', targets: 'both', proj: 'coin', projSpeed: 13 },
    econ: { killGold: 1, killGoldChance: 0.3 },
    desc: 'Flings coins. 30% chance of +1 gold per kill.',
    art: { shape: 'vault', primary: '#7a5c34', secondary: '#ffc629', glow: '#ffe07a' },
  },
  {
    id: 'gold_2a', name: 'Bounty Hunter', race: 'gold', tier: 2, cost: 40, parent: 'gold_1', buildTime: 2,
    attack: { dmg: [28, 34], cd: 1.0, range: 5.5, type: 'pierce', targets: 'both', proj: 'bullet', projSpeed: 20 },
    econ: { killGold: 2 },
    desc: '+2 gold for every kill.',
    art: { shape: 'turret', primary: '#6e5530', secondary: '#3fd18a', glow: '#ffe07a' },
  },
  {
    id: 'gold_3a', name: 'Mercenary Post', race: 'gold', tier: 3, cost: 110, parent: 'gold_2a', buildTime: 3,
    attack: { dmg: [80, 95], cd: 0.8, range: 6, type: 'pierce', targets: 'both', proj: 'bullet', projSpeed: 22 },
    econ: { killGold: 3 },
    desc: 'Hired guns. +3 gold per kill.',
    art: { shape: 'turret', primary: '#64502e', secondary: '#ffc629', glow: '#ffe07a' },
  },
  {
    id: 'gold_4a', name: 'Gold Golem', race: 'gold', tier: 4, cost: 300, parent: 'gold_3a', buildTime: 4,
    attack: { dmg: [220, 260], cd: 1.0, range: 6, type: 'impact', targets: 'both', proj: 'coin', projSpeed: 14,
      goldScaling: { pct: 0.1, max: 500 } },
    econ: { killGold: 5 },
    desc: 'Hits harder the richer you are (+10% of your gold, up to +500). +5 gold per kill.',
    art: { shape: 'totem', primary: '#8a6a2a', secondary: '#ffd35a', glow: '#fff1a0' },
  },
  {
    id: 'gold_2b', name: 'Piggy Bank', race: 'gold', tier: 2, cost: 40, parent: 'gold_1', buildTime: 2,
    econ: { interestPct: 0.03, interestCap: 25, perWave: 3 },
    limit: 4, limitGroup: 'vault',
    desc: 'Pays 3% interest on your gold after each wave (max 25) plus 3 gold. Max 4 vaults.',
    art: { shape: 'vault', primary: '#b07a8a', secondary: '#ffc629', glow: '#ffe07a' },
  },
  {
    id: 'gold_3b', name: 'Treasury', race: 'gold', tier: 3, cost: 110, parent: 'gold_2b', buildTime: 3,
    econ: { interestPct: 0.05, interestCap: 60, perWave: 8 },
    limit: 4, limitGroup: 'vault',
    desc: 'Pays 5% interest after each wave (max 60) plus 8 gold.',
    art: { shape: 'vault', primary: '#7a6040', secondary: '#ffc629', glow: '#fff1a0' },
  },
  {
    id: 'gold_4b', name: 'Grand Exchange', race: 'gold', tier: 4, cost: 300, parent: 'gold_3b', buildTime: 4,
    econ: { interestPct: 0.08, interestCap: 150, perWave: 20 },
    limit: 4, limitGroup: 'vault',
    desc: 'Pays 8% interest after each wave (max 150) plus 20 gold.',
    art: { shape: 'vault', primary: '#6a5436', secondary: '#3fd18a', glow: '#fff1a0' },
  },
  {
    id: 'gold_L', name: "Dragon's Hoard", race: 'gold', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    attack: { dmg: [1, 3200], cd: 0.8, range: 6.5, type: 'impact', targets: 'both', proj: 'coin', projSpeed: 16 },
    econ: { killGold: 10 },
    desc: 'LEGEND. Rolls 1–3200 damage per shot. +10 gold per kill.',
    art: { shape: 'vault', primary: '#5a3a1a', secondary: '#ffc629', glow: '#ff9a3c' },
  },

  // ─────────────────────────────── PRISMATIC ───────────────────────────────
  {
    id: 'prism_1', name: 'Crystal Shard', race: 'prism', tier: 1, cost: 12, buildTime: 1,
    attack: { dmg: [9, 12], cd: 1.0, range: 4.5, type: 'pure', targets: 'both', proj: 'crystal', projSpeed: 14 },
    desc: 'Pure damage that ignores armor classes.',
    art: { shape: 'crystal', primary: '#ffb3e6', secondary: '#7ff3ff', glow: '#ff9fdc' },
  },
  {
    id: 'prism_2a', name: 'Prism', race: 'prism', tier: 2, cost: 45, parent: 'prism_1', buildTime: 2,
    attack: { dmg: [24, 30], cd: 1.0, range: 5, type: 'pure', targets: 'both', proj: 'crystal', projSpeed: 15,
      multishot: 2 },
    desc: 'Splits its light into two targets.',
    art: { shape: 'crystal', primary: '#ffc6ee', secondary: '#7ff3ff', glow: '#b8f8ff' },
  },
  {
    id: 'prism_3a', name: 'Refractor', race: 'prism', tier: 3, cost: 130, parent: 'prism_2a', buildTime: 3,
    attack: { dmg: [65, 78], cd: 0.9, range: 5.5, type: 'pure', targets: 'both', proj: 'crystal', projSpeed: 16,
      multishot: 3 },
    desc: 'Three beams of pure light.',
    art: { shape: 'obelisk', primary: '#ffd6f3', secondary: '#7ff3ff', glow: '#ff9fdc' },
  },
  {
    id: 'prism_4a', name: 'Kaleidoscope', race: 'prism', tier: 4, cost: 380, parent: 'prism_3a', buildTime: 4,
    attack: { dmg: [200, 230], cd: 0.8, range: 6, type: 'pure', targets: 'both', proj: 'crystal', projSpeed: 18,
      multishot: 5 },
    desc: 'Five dazzling beams at once.',
    art: { shape: 'orb', primary: '#ffe3f7', secondary: '#7ff3ff', glow: '#ffd0f8' },
  },
  {
    id: 'prism_2b', name: 'Geode Cannon', race: 'prism', tier: 2, cost: 45, parent: 'prism_1', buildTime: 2,
    attack: { dmg: [55, 68], cd: 1.4, range: 5.5, type: 'pure', targets: 'both', proj: 'crystal', projSpeed: 12,
      splash: 1.2 },
    desc: 'Crystal shells with splash damage.',
    art: { shape: 'mortar', primary: '#d99ac4', secondary: '#7ff3ff', glow: '#ff9fdc' },
  },
  {
    id: 'prism_3b', name: 'Diamond Lance', race: 'prism', tier: 3, cost: 130, parent: 'prism_2b', buildTime: 3,
    attack: { dmg: [260, 300], cd: 1.3, range: 6.5, type: 'pure', targets: 'both', proj: 'crystal', projSpeed: 20,
      crit: { chance: 0.25, mult: 2 } },
    desc: 'A diamond-hard lance. 25% chance of double damage.',
    art: { shape: 'spire', primary: '#f5f0ff', secondary: '#7ff3ff', glow: '#b8f8ff' },
  },
  {
    id: 'prism_4b', name: 'Heartstone', race: 'prism', tier: 4, cost: 380, parent: 'prism_3b', buildTime: 4,
    attack: { dmg: [800, 900], cd: 1.1, range: 7, type: 'pure', targets: 'both', proj: 'crystal', projSpeed: 22,
      splash: 1.0, crit: { chance: 0.25, mult: 2.5 } },
    desc: 'The heart of the mountain. Massive pure damage with crits and splash.',
    art: { shape: 'crystal', primary: '#ff7fd1', secondary: '#ffffff', glow: '#ff9fdc' },
  },
  {
    id: 'prism_L', name: 'Prismatic Singularity', race: 'prism', tier: 5, cost: LEGEND_COST, lumber: 1, buildTime: 6,
    attack: { dmg: [380, 420], cd: 0.8, range: 7, type: 'pure', targets: 'both', proj: 'crystal', projSpeed: 20,
      multishot: 8 },
    desc: 'LEGEND. Eight beams of pure light.',
    art: { shape: 'orb', primary: '#ffffff', secondary: '#ff7fd1', glow: '#7ff3ff' },
  },
];

/**
 * Global per-tier damage scaling. Higher tiers are more gold-efficient than the walls they grow
 * from, so upgrading in place (the Wintermaul One way) always pays off. Tune balance here first.
 */
export const TIER_DAMAGE = [1, 1.15, 1.3, 1.3, 1.25, 1.1];

/** Per-race damage multipliers (balance knobs). */
export const RACE_DAMAGE: Record<string, number> = {
  frost: 1,
  fire: 1,
  storm: 1.3,
  stone: 1.15,
  arcane: 1.1,
  venom: 0.64,
  tech: 1,
  shadow: 1.2,
  sun: 1.05,
  grove: 1.1,
  gold: 1.1,
  prism: 0.95,
};

function scaled(d: Def): Def {
  const m = TIER_DAMAGE[d.tier] * (RACE_DAMAGE[d.race] ?? 1);
  const out: Def = structuredClone(d);
  if (out.attack) {
    out.attack.dmg = [Math.round(out.attack.dmg[0] * m), Math.round(out.attack.dmg[1] * m)];
    if (out.attack.onHit?.dot) out.attack.onHit.dot.dps = Math.round(out.attack.onHit.dot.dps * m);
    if (out.attack.groundFire) out.attack.groundFire.dps = Math.round(out.attack.groundFire.dps * m);
  }
  if (out.pulse?.dmg) out.pulse.dmg = Math.round(out.pulse.dmg * m);
  if (out.pulse?.onHit?.dot) out.pulse.onHit.dot.dps = Math.round(out.pulse.onHit.dot.dps * m);
  if (out.aura?.enemyDps) out.aura.enemyDps = Math.round(out.aura.enemyDps * m);
  return out;
}

export const TOWERS: Record<string, TowerDef> = {};
for (const d of DEFS) TOWERS[d.id] = { ...scaled(d), upgrades: [] };
for (const d of Object.values(TOWERS)) if (d.parent) TOWERS[d.parent].upgrades.push(d.id);

export const RACE_BY_ID: Record<string, RaceDef> = Object.fromEntries(RACES.map((r) => [r.id, r]));

/** Towers you can place directly for a race: the tier-1 wall and the Legend. */
export function buildableTowers(race: string): TowerDef[] {
  return Object.values(TOWERS).filter((t) => t.race === race && (t.tier === 1 || t.tier === 5));
}

export function towersOfRace(race: string): TowerDef[] {
  return Object.values(TOWERS).filter((t) => t.race === race);
}

/** Total gold invested to reach this tower from scratch. */
export function totalCost(id: string): number {
  let t: TowerDef | undefined = TOWERS[id];
  let sum = 0;
  while (t) {
    sum += t.cost;
    t = t.parent ? TOWERS[t.parent] : undefined;
  }
  return sum;
}
