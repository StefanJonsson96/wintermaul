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
