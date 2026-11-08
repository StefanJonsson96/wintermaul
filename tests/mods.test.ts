import { describe, expect, it } from 'vitest';
import { START_GOLD, START_LUMBER } from '../src/shared/constants';
import { TOWERS } from '../src/shared/data/races';
import { CREEPS, WAVES } from '../src/shared/data/waves';
import { startingLives, type GameSettings } from '../src/shared/protocol';
import { Game, type GameRules } from '../src/shared/sim/game';
import type { PlayerMods } from '../src/shared/sim/mods';

const settings: GameSettings = { difficulty: 'normal', raceMode: 'pick', endless: false };
const solo = [{ id: 0, name: 'P0', color: 0, isBot: false }];
const run = (g: Game, seconds: number) => {
  for (let i = 0; i < seconds * 20 && !g.over; i++) g.step();
};

function game(mods: PlayerMods = {}, rules: GameRules = {}, seed = 7): Game {
  const g = new Game(settings, solo, seed, { skipSetup: true, rules: { ...rules, mods: { 0: mods } } });
  g.command(0, { c: 'race', race: 'fire' });
  return g;
}

/** Builds a short wall of towers across the middle of the lane and returns the total damage they deal. */
function damageDealt(g: Game, seconds: number, defId = 'fire_1'): number {
  g.devGold(0, 1000);
  for (const y of [6, 8, 10, 12, 14, 16]) g.command(0, { c: 'build', tower: defId, x: 20, y });
  g.command(0, { c: 'ready', value: true });
  run(g, seconds);
  let sum = 0;
  for (const t of g.towers.values()) sum += t.damage;
  return sum;
}

describe('talent bonuses', () => {
  it('change starting gold, lumber and lives', () => {
    const g = game({ startGold: 25, startLumber: 1, lives: 6 });
    const p = g.player(0)!;
    expect(p.gold).toBe(START_GOLD + 25);
    // one lumber went into the first race
    expect(p.lumber).toBe(START_LUMBER + 1 - 1);
    expect(g.lives).toBe(startingLives('normal', 1) + 6);
    expect(g.maxLives).toBe(g.lives);
  });

  it('discount tier-1 towers and raise the sell refund', () => {
    const g = game({ wallDiscount: 2, refund: 0.1 });
    const p = g.player(0)!;
    const before = p.gold;
    expect(g.command(0, { c: 'build', tower: 'fire_1', x: 20, y: 10 }).ok).toBe(true);
    expect(before - p.gold).toBe(TOWERS.fire_1.cost - 2);
    // let the build phase end so the sale is not an undo
    g.command(0, { c: 'ready', value: true });
    run(g, 5);
    const t = [...g.towers.values()][0];
    const gold = p.gold;
    g.command(0, { c: 'sell', ids: [t.id] });
    expect(p.gold - gold).toBe(Math.floor(t.invested * 0.85));
  });

  it('fold damage and attack speed into every tower', () => {
    const g = game({ dmg: 1.2, dmgRace: { fire: 1.5 }, speed: 1.1 });
    g.command(0, { c: 'build', tower: 'fire_1', x: 20, y: 10 });
    const t = [...g.towers.values()][0];
    expect(t.dmgMul).toBeCloseTo(1.8);
    expect(t.spdMul).toBeCloseTo(1.1);
  });

  it('make towers deal more damage', () => {
    const plain = damageDealt(game(), 40);
    const boosted = damageDealt(game({ dmgType: { elemental: 1.5, impact: 1.5, magic: 1.5, pierce: 1.5 } }), 40);
    expect(plain).toBeGreaterThan(0);
    expect(boosted).toBeGreaterThan(plain * 1.2);
  });

  it('slow the creeps in your lane', () => {
    const a = game();
    const b = game({ creepSlow: 0.3 });
    for (const g of [a, b]) {
      g.command(0, { c: 'ready', value: true });
      run(g, 12);
    }
    const lead = (g: Game) => Math.max(...[...g.creeps.values()].map((c) => c.x));
    expect(lead(b)).toBeLessThan(lead(a) * 0.85);
  });

  it('give the team a second wind, once', () => {
    const g = game({ secondWind: 8 });
    g.lives = 0;
    g.step();
    expect(g.over).toBe(false);
    expect(g.lives).toBe(8);
    expect(g.drainEvents().some((e) => e.e === 'rally')).toBe(true);
    g.lives = 0;
    g.step();
    expect(g.phase).toBe('defeat');
  });

  it('soften boss leaks', () => {
    const boss = WAVES.findIndex((w) => CREEPS[w.creep].boss) + 1;
    const lost = (mods: PlayerMods) => {
      const g = game(mods);
      g.lives = 1000;
      g.devSkipTo(boss);
      for (let i = 0; i < 20 * 400 && !(g.wave === boss && g.phase === 'build'); i++) g.step();
      return 1000 - g.lives;
    };
    const full = lost({});
    expect(full).toBeGreaterThan(2);
    // solo, every boss leaks twice: once back into your lane, then out for good
    expect(lost({ bossLeak: 1 })).toBe(full - 2 * WAVES[boss - 1].count);
  });
});

describe('stage rules', () => {
  it('can start later in the war', () => {
    const g = game({}, { firstWave: 11, finalWave: 12, firstWaveDelay: 5 });
    expect(g.wave).toBe(10);
    run(g, 6);
    expect(g.wave).toBe(11);
    expect(g.phase).toBe('wave');
  });

  it('can add creeps to every wave', () => {
    const count = (rules: GameRules) => {
      const g = game({}, { ...rules, firstWaveDelay: 1 });
      run(g, 60);
      return g.drainEvents().filter((e) => e.e === 'spawn' && e.creep.wave === 1).length;
    };
    expect(count({ countMul: 2 })).toBe(count({}) * 2);
  });
});

describe('rune web bonuses', () => {
  /** Damage a fire tower deals to a creep held in place next to it. */
  function damageTo(mods: PlayerMods, creep: string, ticks = 120): number {
    const g = game(mods);
    g.command(0, { c: 'build', tower: 'fire_1', x: 3, y: 10 });
    run(g, 2);
    g.horde.spawnQueue.unshift({ at: g.time, lane: 0, def: creep, wave: 1 });
    g.step();
    const c = [...g.creeps.values()].find((c) => c.def.id === creep)!;
    c.x = 2.5;
    c.y = 11.5;
    c.rootUntil = Infinity;
    c.hp = c.maxHp = 1e7;
    c.shield = 0;
    for (let i = 0; i < ticks; i++) g.step();
    return 1e7 - c.hp;
  }
  const air = WAVES.find((w) => CREEPS[w.creep].air)!.creep;
  const boss = WAVES.find((w) => CREEPS[w.creep].boss)!.creep;
  const heavy = WAVES.find((w) => CREEPS[w.creep].armorType === 'heavy' && !CREEPS[w.creep].boss && !CREEPS[w.creep].air)!.creep;
  const light = WAVES.find((w) => CREEPS[w.creep].armorType === 'light' && !CREEPS[w.creep].air)!.creep;

  it('hit harder against air, bosses and armor classes', () => {
    expect(damageTo({ vsAir: 1.5 }, air) / damageTo({}, air)).toBeCloseTo(1.5, 1);
    expect(damageTo({ vsBoss: 1.5 }, boss) / damageTo({}, boss)).toBeCloseTo(1.5, 1);
    expect(damageTo({ vsArmor: { heavy: 1.5 } }, heavy) / damageTo({}, heavy)).toBeCloseTo(1.5, 1);
    expect(damageTo({ vsArmor: { heavy: 1.5 } }, light) / damageTo({}, light)).toBeCloseTo(1, 2);
  });

  it('change critical hits and every other hit', () => {
    const crit = damageTo({ crit: 1 }, light);
    expect(damageTo({ crit: 1, critMult: 1.5 }, light) / crit).toBeCloseTo(1.5, 1);
    expect(damageTo({ nonCrit: 0.5 }, light) / damageTo({}, light)).toBeCloseTo(0.5, 1);
  });

  it('finish off nearly dead creeps, but not bosses', () => {
    const g = game({ execute: 0.5 });
    g.command(0, { c: 'build', tower: 'fire_1', x: 3, y: 10 });
    run(g, 2);
    g.horde.spawnQueue.unshift({ at: g.time, lane: 0, def: light, wave: 1 });
    g.step();
    const c = [...g.creeps.values()].find((c) => c.def.id === light)!;
    c.x = 2.5;
    c.y = 11.5;
    c.rootUntil = Infinity;
    c.hp = c.maxHp = 1000;
    c.hp = 480;
    for (let i = 0; i < 60 && c.alive; i++) g.step();
    expect(c.alive).toBe(false);
  });

  it('make leaks from your lane cost more', () => {
    const lost = (mods: PlayerMods) => {
      const g = game(mods);
      g.horde.spawnQueue.unshift({ at: g.time, lane: 0, def: light, wave: 1 });
      g.step();
      const c = [...g.creeps.values()][0];
      const before = g.lives;
      for (let i = 0; i < 20 * 60 && c.visits < 2; i++) g.step();
      return before - g.lives;
    };
    expect(lost({ leakMul: 2 })).toBe(lost({}) * 2);
  });

  it('price upgrades and build walls instantly', () => {
    const g = game({ upgradeCost: 1.1, quickWalls: true });
    g.devGold(0, 1000);
    g.command(0, { c: 'build', tower: 'fire_1', x: 20, y: 10 });
    const t = [...g.towers.values()][0];
    expect(t.buildUntil).toBe(g.time);
    const to = TOWERS[t.def.upgrades[0]];
    const gold = g.player(0)!.gold;
    expect(g.command(0, { c: 'upgrade', ids: [t.id], to: to.id }).ok).toBe(true);
    expect(gold - g.player(0)!.gold).toBe(Math.round(to.cost * 1.1));
  });

  it('let poison stack higher', () => {
    const stacks = (mods: PlayerMods) => {
      const g = new Game(settings, solo, 3, { skipSetup: true, rules: { mods: { 0: mods } } });
      g.command(0, { c: 'race', race: 'venom' });
      g.command(0, { c: 'build', tower: 'venom_1', x: 3, y: 10 });
      run(g, 2);
      g.horde.spawnQueue.unshift({ at: g.time, lane: 0, def: light, wave: 1 });
      g.step();
      const c = [...g.creeps.values()][0];
      c.x = 2.5;
      c.y = 11.5;
      c.rootUntil = Infinity;
      c.hp = c.maxHp = 1e7;
      for (let i = 0; i < 20 * 30; i++) g.step();
      return Math.max(0, ...c.dots.map((d) => d.stacks));
    };
    expect(stacks({ poisonStacks: 2 })).toBe(stacks({}) + 2);
  });
});
