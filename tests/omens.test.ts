import { describe, expect, it } from 'vitest';
import type { GameSettings } from '../src/shared/protocol';
import { Game } from '../src/shared/sim/game';
import { BOONS, effectiveMods, isOmenWave, omenOffers, WEATHERS, weatherOf } from '../src/shared/sim/omens';

const settings: GameSettings = { difficulty: 'normal', raceMode: 'pick', endless: false };

describe('weather', () => {
  it('is a fixed forecast per seed, calm at first, never the same storm twice running', () => {
    const seen = new Set<string>();
    for (let n = 1; n <= 200; n++) {
      const w = weatherOf(99, n);
      expect(w).toBe(weatherOf(99, n));
      if (n <= 3) expect(w).toBe('clear');
      if (w !== 'clear') expect(weatherOf(99, n - 1)).not.toBe(w);
      seen.add(w);
    }
    expect(seen.size).toBe(Object.keys(WEATHERS).length);
    expect(weatherOf(1, 20) === weatherOf(2, 20) && weatherOf(1, 21) === weatherOf(2, 21) && weatherOf(1, 22) === weatherOf(2, 22)).toBe(false);
  });

  it('bends every player bonus while a wave runs', () => {
    const m = effectiveMods({ range: 1.1 }, [], 'blizzard');
    expect(m.range).toBeCloseTo(1.1 * 0.85);
    expect(effectiveMods({}, [], 'clear')).toEqual({});
  });

  it('is in force during a wave and gone between waves', () => {
    const seed = [...Array(500).keys()].find((s) => weatherOf(s, 4) === 'bloodmoon')!;
    const g = new Game(settings, [{ id: 0, name: 'P', color: 0, isBot: false }], seed, { skipSetup: true });
    g.devSkipTo(4);
    for (let i = 0; i < 200 && g.phase !== 'wave'; i++) g.step();
    expect(g.weather).toBe('bloodmoon');
    const c = [...g.creeps.values()][0] ?? (g.step(), g.step(), [...g.creeps.values()][0]);
    if (c) expect(c.maxHp).toBeGreaterThan(c.def.hp * 1.15);
  });
});

describe('omens', () => {
  it('come after every fifth wave but the last', () => {
    expect([5, 10, 35].every((n) => isOmenWave(n, 40, false))).toBe(true);
    expect(isOmenWave(40, 40, false)).toBe(false);
    expect(isOmenWave(40, 40, true)).toBe(true);
    expect(isOmenWave(7, 40, false)).toBe(false);
  });

  it('offer three different boons, not lasting ones already taken', () => {
    const offers = omenOffers(5, 0, 10, ['ember', 'hawk']);
    expect(new Set(offers).size).toBe(3);
    expect(offers).not.toContain('ember');
    expect(BOONS.every((b) => b.name && (b.effects.length || b.now || b.goldPerWave))).toBe(true);
  });

  it('are taken with a command, once, and change the player', () => {
    const g = new Game({ ...settings, weather: false }, [{ id: 0, name: 'P', color: 0, isBot: false }, { id: 1, name: 'B', color: 1, isBot: true }], 3, { skipSetup: true });
    g.devSkipTo(5);
    for (let i = 0; i < 20000 && !(g.phase === 'build' && g.wave === 5); i++) g.step();
    const p = g.player(0)!;
    expect(p.omen).toHaveLength(3);
    // the bot chose at once
    expect(g.player(1)!.boons).toHaveLength(1);
    expect(g.command(0, { c: 'omen', pick: 'nonsense' }).ok).toBe(false);
    const pick = p.omen![0];
    const gold = p.gold;
    const lives = g.lives;
    expect(g.command(0, { c: 'omen', pick }).ok).toBe(true);
    expect(p.boons).toEqual([pick]);
    expect(p.omen).toBeNull();
    expect(g.command(0, { c: 'omen', pick }).ok).toBe(false);
    const ev = g.drainEvents();
    expect(ev.some((e) => e.e === 'boon' && e.id === pick)).toBe(true);
    expect(p.gold >= gold && g.lives >= lives).toBe(true);
  });

  it('are off when the rules say so', () => {
    const g = new Game({ ...settings, omens: false }, [{ id: 0, name: 'P', color: 0, isBot: false }], 3, { skipSetup: true });
    g.devSkipTo(5);
    for (let i = 0; i < 20000 && !(g.phase === 'build' && g.wave === 5); i++) g.step();
    expect(g.player(0)!.omen).toBeNull();
  });
});

describe('omens, regressions', () => {
  const at5 = () => {
    const g = new Game({ ...settings, weather: false }, [{ id: 0, name: 'P', color: 0, isBot: false }], 11, { skipSetup: true });
    g.command(0, { c: 'race', race: 'fire' });
    g.devGold(0, 500);
    g.command(0, { c: 'build', tower: 'fire_1', x: 20, y: 10 });
    g.devSkipTo(5);
    for (let i = 0; i < 30000 && !(g.phase === 'build' && g.wave === 5); i++) g.step();
    return g;
  };

  it('damage and speed boons reach towers already built', () => {
    const g = at5();
    const p = g.player(0)!;
    p.omen = ['bloodprice', 'hands', 'ember'];
    const t = [...g.towers.values()][0];
    const before = { dmg: t.dmgMul, spd: t.spdMul };
    g.command(0, { c: 'omen', pick: 'bloodprice' });
    expect(t.dmgMul).toBeCloseTo(before.dmg * 1.14);
    p.omen = ['hands'];
    g.command(0, { c: 'omen', pick: 'hands' });
    expect(t.spdMul).toBeCloseTo(before.spd * 1.06);
  });

  it('gold that scales is paid for the wave it was offered after', () => {
    const g = at5();
    const p = g.player(0)!;
    p.omen = ['pockets', 'ember', 'hawk'];
    p.omenWave = 5;
    g.wave = 9;
    const gold = p.gold;
    g.command(0, { c: 'omen', pick: 'pockets' });
    expect(p.gold - gold).toBe(15 * 5);
  });
});
