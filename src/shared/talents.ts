// The Rune Web: a passive tree in the spirit of Path of Exile. Runestones from the campaign buy
// nodes one at a time, and a node can only be taken next to one you already have, starting from
// the Hearth in the middle. Six regions ring the Hearth; in each, small nodes add a little,
// notables a lot, and two keystones at the far edge change how you play, at a price. Paths run
// between neighbouring regions, so a build can mix them. Respec is free.
//
// Nodes are data (what they do to PlayerMods), so the campaign, multiplayer and the tests share
// them; the layout is generated from the region specs below.
import { RACE_BY_ID } from './data/races';
import type { PlayerMods } from './sim/mods';
import type { ArmorType, DamageType } from './types';

export type RegionId = 'arsenal' | 'precision' | 'rime' | 'bulwark' | 'fortune' | 'alchemy';

export interface Region {
  id: RegionId;
  name: string;
  color: string;
  blurb: string;
}

export type NodeKind = 'start' | 'small' | 'notable' | 'keystone';

export interface Effect {
  text: string;
  apply: (m: PlayerMods) => void;
  /** A keystone's price. */
  bad?: boolean;
}

export interface PassiveNode {
  id: string;
  kind: NodeKind;
  name: string;
  region: RegionId | null;
  /** Position in tree units (the Hearth is at 0, 0; regions sit about 5 units out). */
  x: number;
  y: number;
  links: string[];
  effects: Effect[];
  /** Icon drawn on notables and keystones. */
  glyph: string;
  /** Race nodes show the race's emblem. */
  race?: string;
}

/** Talent nodes by id, 1 when taken (a record, so saves and the network keep their shape). */
export type Loadout = Record<string, number>;

export const START = 'hearth';

// ── effects
const pct = (v: number) => `${v < 0 ? '−' : '+'}${Math.round(Math.abs(v) * 1000) / 10}%`;
const mul = (key: 'dmg' | 'poison' | 'burn' | 'speed' | 'range' | 'slow' | 'stun' | 'bounty' | 'waveBonus' | 'critMult' | 'nonCrit' | 'vsBoss' | 'vsAir' | 'upgradeCost' | 'splash' | 'slowDur' | 'leakMul', v: number) => (m: PlayerMods) => {
  m[key] = (m[key] ?? 1) * (1 + v);
};
const add = (key: 'startGold' | 'startLumber' | 'lives' | 'refund' | 'wallDiscount' | 'bossLeak' | 'creepSlow' | 'prep' | 'crit' | 'lastStand' | 'secondWind' | 'spread' | 'frostbite' | 'poisonStacks' | 'execute', v: number) => (m: PlayerMods) => {
  m[key] = (m[key] ?? 0) + v;
};
const ARMOR_NAMES: Record<ArmorType, string> = { light: 'Light', medium: 'Medium', heavy: 'Heavy', fortified: 'Fortified', spirit: 'Spirit' };
const TYPE_NAMES: Record<DamageType, string> = { pierce: 'Pierce', impact: 'Impact', magic: 'Magic', elemental: 'Elemental', pure: 'Pure' };
const list = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

const E = {
  damage: (v: number): Effect => ({ text: `${pct(v)} damage`, apply: mul('dmg', v), bad: v < 0 }),
  types: (types: DamageType[], v: number): Effect => ({
    bad: v < 0,
    text: `${pct(v)} ${list(types.map((t) => TYPE_NAMES[t]))} damage`,
    apply: (m) => {
      const out = { ...m.dmgType };
      for (const t of types) out[t] = (out[t] ?? 1) * (1 + v);
      m.dmgType = out;
    },
  }),
  race: (race: string, v: number): Effect => ({
    text: `${pct(v)} damage for ${RACE_BY_ID[race].name} towers`,
    apply: (m) => {
      m.dmgRace = { ...m.dmgRace, [race]: (m.dmgRace?.[race] ?? 1) * (1 + v) };
    },
  }),
  vsBoss: (v: number): Effect => ({ text: `${pct(v)} damage against bosses`, apply: mul('vsBoss', v), bad: v < 0 }),
  vsAir: (v: number): Effect => ({ text: `${pct(v)} damage against air`, apply: mul('vsAir', v) }),
  vsArmor: (armors: ArmorType[], v: number): Effect => ({
    text: `${pct(v)} damage against ${list(armors.map((a) => ARMOR_NAMES[a]))} armor`,
    apply: (m) => {
      const out = { ...m.vsArmor };
      for (const a of armors) out[a] = (out[a] ?? 1) * (1 + v);
      m.vsArmor = out;
    },
  }),
  range: (v: number): Effect => ({ text: `${pct(v)} attack range`, apply: mul('range', v), bad: v < 0 }),
  speed: (v: number): Effect => ({ text: `${pct(v)} attack speed`, apply: mul('speed', v), bad: v < 0 }),
  crit: (v: number): Effect => ({ text: `${pct(v)} chance for any attack to deal double damage`, apply: add('crit', v) }),
  critMult: (v: number): Effect => ({ text: `Critical hits deal ${pct(v)} damage`, apply: mul('critMult', v) }),
  nonCrit: (v: number): Effect => ({ text: `Other hits deal ${Math.round(-v * 100)}% less damage`, apply: mul('nonCrit', v), bad: true }),
  poison: (v: number): Effect => ({ text: `${pct(v)} poison damage`, apply: mul('poison', v) }),
  burn: (v: number): Effect => ({ text: `${pct(v)} damage from burns and burning ground`, apply: mul('burn', v) }),
  poisonStacks: (n: number): Effect => ({ text: `Poison stacks ${n} more times`, apply: add('poisonStacks', n) }),
  spread: (r: number): Effect => ({ text: `Poison jumps to creeps within ${r} cells when its carrier dies`, apply: add('spread', r) }),
  splash: (v: number): Effect => ({ text: `${pct(v)} splash radius`, apply: mul('splash', v) }),
  slow: (v: number): Effect => ({ text: `Your slows are ${Math.round(v * 100)}% stronger`, apply: mul('slow', v) }),
  slowDur: (v: number): Effect => ({ text: `Your slows last ${Math.round(v * 100)}% longer`, apply: mul('slowDur', v) }),
  stun: (v: number): Effect => ({ text: `Stuns, freezes and roots last ${Math.round(v * 100)}% longer`, apply: mul('stun', v) }),
  frostbite: (v: number): Effect => ({ text: `Slowed creeps take ${Math.round(v * 100)}% more damage from your towers`, apply: add('frostbite', v) }),
  execute: (v: number): Effect => ({ text: `Your hits kill creeps below ${Math.round(v * 100)}% health (not bosses)`, apply: add('execute', v) }),
  lastStand: (v: number): Effect => ({ text: `${pct(v)} damage while the team is down to a quarter of its lives`, apply: add('lastStand', v) }),
  lives: (n: number): Effect => ({ text: `${n > 0 ? '+' : '−'}${Math.abs(n)} ${Math.abs(n) === 1 ? 'life' : 'lives'}`, apply: add('lives', n) }),
  secondWind: (n: number): Effect => ({ text: `Once per game, when you would lose, rally with ${n} lives (not when the final boss escapes)`, apply: add('secondWind', n) }),
  moreWind: (n: number): Effect => ({ text: `A Second Wind restores ${n} more lives (or rallies with ${n} without it)`, apply: add('secondWind', n) }),
  bossLeak: (n: number): Effect => ({ text: `Bosses cost ${n} ${n === 1 ? 'life' : 'lives'} less when they leak from your lane`, apply: add('bossLeak', n) }),
  creepSlow: (v: number): Effect => ({ text: `Creeps in your lane walk ${Math.round(v * 100)}% slower`, apply: add('creepSlow', v) }),
  prep: (s: number): Effect => ({ text: `+${s} seconds before the first wave`, apply: add('prep', s) }),
  leakMul: (v: number): Effect => ({ text: `Creeps that leak from your lane cost ${v + 1 === 2 ? 'twice' : `${Math.round((v + 1) * 100)}%`} the lives`, apply: mul('leakMul', v), bad: true }),
  gold: (n: number): Effect => ({ text: `+${n} starting gold`, apply: add('startGold', n) }),
  lumber: (n: number): Effect => ({ text: `+${n} lumber at the start: an extra race, or an early Legend`, apply: add('startLumber', n) }),
  bounty: (v: number): Effect => ({ text: `Kills pay ${pct(v)} gold`, apply: mul('bounty', v) }),
  waveBonus: (v: number): Effect => ({ text: `The end-of-wave bonus pays ${pct(v)}`, apply: mul('waveBonus', v), bad: v < 0 }),
  refund: (v: number): Effect => ({ text: `Selling refunds ${Math.round(v * 100)}% more`, apply: add('refund', v) }),
  interest: (rate: number, cap: number): Effect => ({
    text: `After each wave, ${Math.round(rate * 100)}% interest on your gold (at most ${cap})`,
    apply: (m) => {
      m.interest = (m.interest ?? 0) + rate;
      m.interestCap = (m.interestCap ?? 0) + cap;
    },
  }),
  walls: (n: number): Effect => ({ text: `Tier-1 towers cost ${n} gold less`, apply: add('wallDiscount', n) }),
  quickWalls: (): Effect => ({
    text: 'Tier-1 towers build instantly',
    apply: (m) => {
      m.quickWalls = true;
    },
  }),
  upgradeCost: (v: number): Effect => ({ text: `Upgrades cost ${Math.round(Math.abs(v) * 100)}% ${v > 0 ? 'more' : 'less'}`, apply: mul('upgradeCost', v), bad: v > 0 }),
};

// ── the regions
interface NotableSpec {
  name: string;
  glyph: string;
  effects: Effect[];
}

interface RegionSpec extends Region {
  /** The two kinds of small node, with short names. */
  small: [{ name: string; effect: Effect }, { name: string; effect: Effect }];
  hub: NotableSpec;
  wheel: [NotableSpec, NotableSpec];
  spur: NotableSpec;
  /** A notable past the spur notable. */
  deep: NotableSpec;
  races: [string, string];
  keystones: [NotableSpec, NotableSpec];
}

const SPECS: RegionSpec[] = [
  {
    id: 'arsenal',
    name: 'Arsenal',
    color: '#ff8a5c',
    blurb: 'Raw firepower: damage, damage types and critical hits.',
    small: [
      { name: 'Damage', effect: E.damage(0.02) },
      { name: 'Giant Slaying', effect: E.vsBoss(0.03) },
    ],
    hub: { name: 'Honed Steel', glyph: 'sword', effects: [E.damage(0.06)] },
    wheel: [
      { name: 'Heavy Hitters', glyph: 'hammer', effects: [E.types(['impact', 'pierce'], 0.1)] },
      { name: 'Spellforge', glyph: 'star', effects: [E.types(['magic', 'elemental', 'pure'], 0.1)] },
    ],
    spur: { name: 'Deadeye', glyph: 'target', effects: [E.crit(0.04)] },
    deep: { name: 'Weapon Master', glyph: 'sword', effects: [E.damage(0.06), E.speed(0.02)] },
    races: ['fire', 'stone'],
    keystones: [
      { name: 'Glass Cannon', glyph: 'gem', effects: [E.damage(0.3), E.leakMul(1)] },
      { name: "Fortune's Favor", glyph: 'coin', effects: [E.crit(0.08), E.critMult(0.5), E.nonCrit(-0.15)] },
    ],
  },
  {
    id: 'precision',
    name: 'Precision',
    color: '#8fd3ff',
    blurb: 'Reach and rhythm: attack range and attack speed.',
    small: [
      { name: 'Range', effect: E.range(0.02) },
      { name: 'Attack Speed', effect: E.speed(0.015) },
    ],
    hub: { name: 'Eagle Eye', glyph: 'eye', effects: [E.range(0.06)] },
    wheel: [
      { name: 'Quick Hands', glyph: 'bolt', effects: [E.speed(0.05)] },
      { name: 'Steady Aim', glyph: 'arrow', effects: [E.range(0.04), E.speed(0.03)] },
    ],
    spur: { name: 'Dragonslayer', glyph: 'wing', effects: [E.vsAir(0.15)] },
    deep: { name: 'Rapid Fire', glyph: 'bolt', effects: [E.speed(0.06)] },
    races: ['tech', 'storm'],
    keystones: [
      { name: 'Overcharge', glyph: 'bolt', effects: [E.speed(0.25), E.range(-0.15)] },
      { name: "Sniper's Creed", glyph: 'target', effects: [E.range(0.35), E.speed(-0.12)] },
    ],
  },
  {
    id: 'rime',
    name: 'Rime',
    color: '#9fe8ff',
    blurb: 'Control: slows, stuns and roots, and finishing off what they hold.',
    small: [
      { name: 'Slow', effect: E.slow(0.04) },
      { name: 'Stun Duration', effect: E.stun(0.06) },
    ],
    hub: { name: 'Deep Chill', glyph: 'snow', effects: [E.slow(0.15)] },
    wheel: [
      { name: 'Concussion', glyph: 'star', effects: [E.stun(0.2)] },
      { name: 'Frostbite', glyph: 'crystal', effects: [E.frostbite(0.1)] },
    ],
    spur: { name: 'Exorcist', glyph: 'skull', effects: [E.vsArmor(['spirit'], 0.15)] },
    deep: { name: 'Permafrost', glyph: 'crystal', effects: [E.slow(0.05), E.slowDur(0.25)] },
    races: ['frost', 'arcane'],
    keystones: [
      { name: 'Frozen Heart', glyph: 'snow', effects: [E.slow(0.4), E.slowDur(0.5), E.damage(-0.1)] },
      { name: "Reaper's Mark", glyph: 'skull', effects: [E.execute(0.06), E.vsBoss(-0.1)] },
    ],
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    color: '#7fb6ff',
    blurb: 'Lives, time and a second chance.',
    small: [
      { name: 'Lives', effect: E.lives(1) },
      { name: 'Deep Snow', effect: E.creepSlow(0.01) },
    ],
    hub: { name: 'Stout Hearts', glyph: 'heart', effects: [E.lives(5)] },
    wheel: [
      { name: 'Hold the Gate', glyph: 'shield', effects: [E.bossLeak(2)] },
      { name: 'Last Stand', glyph: 'banner', effects: [E.lastStand(0.2)] },
    ],
    spur: { name: 'Scouts', glyph: 'eye', effects: [E.prep(20)] },
    deep: { name: 'Second Wind', glyph: 'wing', effects: [E.secondWind(10)] },
    races: ['sun', 'grove'],
    keystones: [
      { name: 'Ironclad', glyph: 'shield', effects: [E.lives(10), E.speed(-0.1)] },
      { name: 'Unbreakable', glyph: 'heart', effects: [E.moreWind(15), E.damage(-0.08)] },
    ],
  },
  {
    id: 'fortune',
    name: 'Fortune',
    color: '#ffd35a',
    blurb: 'Gold in, gold back, and lumber.',
    small: [
      { name: 'Bounty', effect: E.bounty(0.02) },
      { name: 'Purse', effect: E.gold(6) },
    ],
    hub: { name: 'War Chest', glyph: 'chest', effects: [E.gold(40)] },
    wheel: [
      { name: 'Tithe', glyph: 'scroll', effects: [E.waveBonus(0.2)] },
      { name: "Dragon's Hoard", glyph: 'crown', effects: [E.interest(0.02, 30)] },
    ],
    spur: { name: 'Salvage', glyph: 'gear', effects: [E.refund(0.1)] },
    deep: { name: 'Timber Rights', glyph: 'tree', effects: [E.lumber(1)] },
    races: ['gold', 'prism'],
    keystones: [
      { name: 'Blood Money', glyph: 'coin', effects: [E.bounty(0.5), E.waveBonus(-0.5)] },
      { name: 'Architect', glyph: 'brick', effects: [E.walls(2), E.quickWalls(), E.upgradeCost(0.1)] },
    ],
  },
  {
    id: 'alchemy',
    name: 'Alchemy',
    color: '#7be07b',
    blurb: 'Poison and fire: damage that ignores armor.',
    small: [
      { name: 'Poison', effect: E.poison(0.06) },
      { name: 'Burning', effect: E.burn(0.06) },
    ],
    hub: { name: 'Virulence', glyph: 'drop', effects: [E.poison(0.2)] },
    wheel: [
      { name: 'Kindling', glyph: 'flame', effects: [E.burn(0.2)] },
      { name: 'Contagion', glyph: 'skull', effects: [E.spread(1.5)] },
    ],
    spur: { name: 'Corrosion', glyph: 'drop', effects: [E.vsArmor(['heavy', 'fortified'], 0.12)] },
    deep: { name: 'Pyromania', glyph: 'flame', effects: [E.burn(0.15), E.splash(0.1)] },
    races: ['venom', 'shadow'],
    keystones: [
      { name: 'Plague Lord', glyph: 'skull', effects: [E.poison(0.6), E.poisonStacks(2), E.types(['pierce', 'impact', 'magic', 'elemental', 'pure'], -0.15)] },
      { name: 'Inferno', glyph: 'flame', effects: [E.burn(0.5), E.splash(0.25), E.types(['impact', 'pierce', 'magic'], -0.1)] },
    ],
  },
];

export const REGIONS: Region[] = SPECS.map(({ id, name, color, blurb }) => ({ id, name, color, blurb }));
export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, Region>;

// ── layout
function buildTree(): PassiveNode[] {
  const nodes = new Map<string, PassiveNode>();
  const polar = (r: number, deg: number) => ({ x: +(r * Math.cos((deg * Math.PI) / 180)).toFixed(3), y: +(r * Math.sin((deg * Math.PI) / 180)).toFixed(3) });
  const node = (id: string, kind: NodeKind, name: string, region: RegionId | null, at: { x: number; y: number }, effects: Effect[], glyph = 'rune', race?: string) => {
    nodes.set(id, { id, kind, name, region, x: at.x, y: at.y, links: [], effects, glyph, race });
    return id;
  };
  const link = (a: string, b: string) => {
    nodes.get(a)!.links.push(b);
    nodes.get(b)!.links.push(a);
  };
  const small = (id: string, spec: RegionSpec, which: 0 | 1, at: { x: number; y: number }) => node(id, 'small', spec.small[which].name, spec.id, at, [spec.small[which].effect]);
  const notable = (id: string, spec: RegionSpec, n: NotableSpec, at: { x: number; y: number }, kind: NodeKind = 'notable') => node(id, kind, n.name, spec.id, at, n.effects, n.glyph);

  node(START, 'start', 'The Hearth', null, { x: 0, y: 0 }, [], 'rune');
  // regions clockwise from the top; local angles grow towards the next region
  SPECS.forEach((spec, r) => {
    const a = -90 + r * 60;
    const id = (k: string) => `${spec.id}_${k}`;
    link(START, small(id('in'), spec, 0, polar(1.5, a)));
    small(id('sp1'), spec, 1, polar(2.5, a));
    small(id('sp2'), spec, 0, polar(3.45, a));
    link(id('in'), id('sp1'));
    link(id('sp1'), id('sp2'));
    // a spur off the spine, into the wedge towards the previous region, and a deep notable past it
    small(id('spur1'), spec, 1, polar(3.35, a - 13));
    notable(id('spur'), spec, spec.spur, polar(2.85, a - 30));
    small(id('deep1'), spec, 0, polar(3.6, a - 37));
    notable(id('deep'), spec, spec.deep, polar(4.0, a - 47.5));
    link(id('sp2'), id('spur1'));
    link(id('spur1'), id('spur'));
    link(id('spur'), id('deep1'));
    link(id('deep1'), id('deep'));
    // the wheel: six nodes around the hub, notables on the outer side
    const hub = polar(5.35, a);
    notable(id('hub'), spec, spec.hub, hub);
    const wheelAt = (phi: number) => {
      const p = polar(1.25, a + phi);
      return { x: +(hub.x + p.x).toFixed(3), y: +(hub.y + p.y).toFixed(3) };
    };
    small(id('w0'), spec, 0, wheelAt(180));
    small(id('w1'), spec, 1, wheelAt(120));
    notable(id('w2'), spec, spec.wheel[0], wheelAt(60));
    small(id('w3'), spec, 0, wheelAt(0));
    notable(id('w4'), spec, spec.wheel[1], wheelAt(-60));
    small(id('w5'), spec, 1, wheelAt(-120));
    for (let k = 0; k < 6; k++) link(id(`w${k}`), id(`w${(k + 1) % 6}`));
    link(id('sp2'), id('w0'));
    link(id('hub'), id('w0'));
    link(id('hub'), id('w3'));
    // a race on each side, out past the wheel notables
    spec.races.forEach((race, k) => {
      const s = k === 0 ? 1 : -1;
      const name = RACE_BY_ID[race].name;
      node(id(`r${k}a`), 'small', name, spec.id, polar(7.0, a + 16 * s), [E.race(race, 0.03)], 'rune', race);
      node(id(`r${k}b`), 'small', name, spec.id, polar(7.9, a + 19 * s), [E.race(race, 0.03)], 'rune', race);
      node(id(`r${k}`), 'notable', `${name} Mastery`, spec.id, polar(8.85, a + 21 * s), [E.race(race, 0.1)], 'rune', race);
      link(id(k === 0 ? 'w2' : 'w4'), id(`r${k}a`));
      link(id(`r${k}a`), id(`r${k}b`));
      link(id(`r${k}b`), id(`r${k}`));
    });
    // two keystones at the far edge
    spec.keystones.forEach((ks, k) => {
      const s = k === 0 ? 1 : -1;
      small(id(`k${k}a`), spec, k === 0 ? 0 : 1, polar(7.5, a + 5 * s));
      small(id(`k${k}b`), spec, k === 0 ? 1 : 0, polar(8.4, a + 6.5 * s));
      notable(id(`k${k}`), spec, ks, polar(9.5, a + 7.5 * s), 'keystone');
      link(id('w3'), id(`k${k}a`));
      link(id(`k${k}a`), id(`k${k}b`));
      link(id(`k${k}b`), id(`k${k}`));
    });
  });
  // paths between neighbouring regions: an inner bridge between the wheels, an outer road between the races
  SPECS.forEach((spec, r) => {
    const next = SPECS[(r + 1) % SPECS.length];
    const a = -90 + r * 60;
    small(`${spec.id}_br1`, spec, 1, polar(4.6, a + 21.5));
    small(`${spec.id}_br2`, spec, 0, polar(4.55, a + 30));
    small(`${spec.id}_br3`, next, 1, polar(4.6, a + 38.5));
    link(`${spec.id}_w1`, `${spec.id}_br1`);
    link(`${spec.id}_br1`, `${spec.id}_br2`);
    link(`${spec.id}_br2`, `${spec.id}_br3`);
    link(`${spec.id}_br3`, `${next.id}_w5`);
    small(`${spec.id}_or1`, spec, 0, polar(9.25, a + 25.5));
    small(`${spec.id}_or2`, spec, 1, polar(9.35, a + 30));
    small(`${spec.id}_or3`, next, 0, polar(9.25, a + 34.5));
    link(`${spec.id}_r0`, `${spec.id}_or1`);
    link(`${spec.id}_or1`, `${spec.id}_or2`);
    link(`${spec.id}_or2`, `${spec.id}_or3`);
    link(`${spec.id}_or3`, `${next.id}_r1`);
    // the ring around the Hearth
    link(`${spec.id}_in`, `${next.id}_in`);
  });
  return [...nodes.values()];
}

export const NODES: PassiveNode[] = buildTree();
export const NODE_BY_ID: Record<string, PassiveNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));

/** Runestones needed to take every node. */
export const TREE_COST = NODES.length - 1;

/** The nodes a loadout has taken (the Hearth is always taken and free). */
export function taken(l: Loadout): Set<string> {
  const out = new Set<string>([START]);
  for (const [id, v] of Object.entries(l)) if (v && NODE_BY_ID[id]) out.add(id);
  return out;
}

export function totalSpent(l: Loadout): number {
  return taken(l).size - 1;
}

function toLoadout(ids: Iterable<string>): Loadout {
  const out: Loadout = {};
  for (const id of ids) if (id !== START) out[id] = 1;
  return out;
}

/**
 * The cheapest way to reach `target`: the nodes to take, nearest first (empty if it is already
 * taken). Breadth-first from everything taken, so it never passes through a taken node twice.
 */
export function pathTo(target: string, l: Loadout): string[] {
  const have = taken(l);
  if (have.has(target) || !NODE_BY_ID[target]) return [];
  const prev = new Map<string, string | null>();
  const queue: string[] = [];
  for (const id of have) {
    prev.set(id, null);
    queue.push(id);
  }
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur === target) break;
    for (const nb of NODE_BY_ID[cur].links) {
      if (prev.has(nb)) continue;
      prev.set(nb, cur);
      queue.push(nb);
    }
  }
  if (!prev.has(target)) return [];
  const path: string[] = [];
  for (let at: string | null = target; at && !have.has(at); at = prev.get(at) ?? null) path.unshift(at);
  return path;
}

/** Whether a taken node can be given back without cutting other taken nodes off from the Hearth. */
export function canRefund(id: string, l: Loadout): boolean {
  const have = taken(l);
  if (id === START || !have.has(id)) return false;
  have.delete(id);
  return connected(have).size === have.size;
}

/** The taken nodes still connected to the Hearth. */
function connected(have: Set<string>): Set<string> {
  const seen = new Set<string>([START]);
  const queue = [START];
  for (let i = 0; i < queue.length; i++) {
    for (const nb of NODE_BY_ID[queue[i]].links) {
      if (!have.has(nb) || seen.has(nb)) continue;
      seen.add(nb);
      queue.push(nb);
    }
  }
  return seen;
}

/**
 * Keeps only what is possible: known nodes, connected to the Hearth, and at most `budget` of them
 * (the nearest to the Hearth first, so what is kept stays connected). Used on anything that comes
 * from a save file or over the network.
 */
export function sanitizeLoadout(raw: unknown, budget = TREE_COST): Loadout {
  if (!raw || typeof raw !== 'object') return {};
  const have = new Set<string>([START]);
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) if (NODE_BY_ID[id] && typeof v === 'number' && v > 0) have.add(id);
  // breadth-first from the Hearth through taken nodes, so the budget cuts the far ends
  const keep: string[] = [];
  const seen = new Set<string>([START]);
  const queue = [START];
  for (let i = 0; i < queue.length; i++) {
    for (const nb of NODE_BY_ID[queue[i]].links) {
      if (!have.has(nb) || seen.has(nb)) continue;
      seen.add(nb);
      queue.push(nb);
      keep.push(nb);
    }
  }
  return toLoadout(keep.slice(0, Math.max(0, Math.floor(budget))));
}

/** The simulation bonuses a loadout grants. */
export function modsFromLoadout(l: Loadout): PlayerMods {
  const m: PlayerMods = {};
  for (const id of taken(l)) for (const e of NODE_BY_ID[id].effects) e.apply(m);
  return m;
}

/** A loadout's bonuses added up, in plain words (for the summary next to the tree). */
export function summarize(m: PlayerMods): string[] {
  const out: string[] = [];
  const p = (v: number | undefined) => (v === undefined ? null : `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`);
  const f = (v: number | undefined, text: string) => {
    const s = p(v);
    if (s && s !== '+0%') out.push(`${s} ${text}`);
  };
  f(m.dmg, 'damage');
  for (const [t, v] of Object.entries(m.dmgType ?? {})) f(v, `${TYPE_NAMES[t as DamageType]} damage`);
  for (const [r, v] of Object.entries(m.dmgRace ?? {})) f(v, `${RACE_BY_ID[r]?.name ?? r} damage`);
  f(m.vsBoss, 'damage against bosses');
  f(m.vsAir, 'damage against air');
  for (const [a, v] of Object.entries(m.vsArmor ?? {})) f(v, `damage against ${ARMOR_NAMES[a as ArmorType]}`);
  f(m.range, 'attack range');
  f(m.speed, 'attack speed');
  if (m.crit) out.push(`${Math.round(m.crit * 100)}% chance for double damage`);
  f(m.critMult, 'critical damage');
  f(m.nonCrit, 'damage from other hits');
  f(m.poison, 'poison damage');
  if (m.poisonStacks) out.push(`Poison stacks ${m.poisonStacks} more times`);
  if (m.spread) out.push(`Poison spreads ${m.spread} cells`);
  f(m.burn, 'burn damage');
  f(m.splash, 'splash radius');
  f(m.slow, 'slow strength');
  f(m.slowDur, 'slow duration');
  f(m.stun, 'stun duration');
  if (m.frostbite) out.push(`Slowed creeps take ${Math.round(m.frostbite * 100)}% more damage`);
  if (m.execute) out.push(`Hits kill creeps below ${Math.round(m.execute * 100)}% health`);
  if (m.lastStand) out.push(`+${Math.round(m.lastStand * 100)}% damage on your last quarter of lives`);
  if (m.lives) out.push(`${m.lives > 0 ? '+' : '−'}${Math.abs(m.lives)} lives`);
  if (m.secondWind) out.push(`Second Wind: rally with ${m.secondWind} lives once`);
  if (m.bossLeak) out.push(`Bosses cost ${m.bossLeak} fewer lives`);
  if (m.creepSlow) out.push(`Creeps in your lane ${Math.round(m.creepSlow * 100)}% slower`);
  if (m.prep) out.push(`+${m.prep}s before the first wave`);
  if (m.leakMul && m.leakMul !== 1) out.push(`Leaks from your lane cost ${m.leakMul}× the lives`);
  if (m.startGold) out.push(`+${m.startGold} starting gold`);
  if (m.startLumber) out.push(`+${m.startLumber} lumber`);
  f(m.bounty, 'kill gold');
  f(m.waveBonus, 'end-of-wave bonus');
  if (m.refund) out.push(`Selling refunds ${Math.round(m.refund * 100)}% more`);
  if (m.interest) out.push(`${Math.round(m.interest * 100)}% interest per wave (at most ${m.interestCap})`);
  if (m.wallDiscount) out.push(`Tier-1 towers cost ${m.wallDiscount} less`);
  if (m.quickWalls) out.push('Tier-1 towers build instantly');
  f(m.upgradeCost, 'upgrade costs');
  return out;
}
