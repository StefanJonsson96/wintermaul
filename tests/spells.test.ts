import { describe, expect, it } from 'vitest';
import { CREEPS, WAVES } from '../src/shared/data/waves';
import { type GameEvent, type GameSettings } from '../src/shared/protocol';
import { type Creep, Game } from '../src/shared/sim/game';
import { SPELL_BY_ID, WARCRY } from '../src/shared/sim/spells';

const settings: GameSettings = { difficulty: 'normal', raceMode: 'pick', endless: false };

function newGame(extra: Partial<GameSettings> = {}): Game {
  const g = new Game({ ...settings, ...extra }, [{ id: 0, name: 'P', color: 0, isBot: false }], 1, { skipSetup: true });
  g.command(0, { c: 'race', race: 'fire' });
  return g;
}

function spawn(g: Game, def: string, x: number, y: number): Creep {
  g.horde.spawnQueue.unshift({ at: g.time, lane: 0, def, wave: 1 });
  g.step();
  const c = [...g.creeps.values()].find((c) => c.def.id === def && c.x < 1)!;
  c.x = x;
  c.y = y;
  c.rootUntil = Infinity;
  return c;
}

const steps = (g: Game, n: number) => {
  const out: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    g.step();
    out.push(...g.drainEvents());
  }
  return out;
};

const plain = WAVES.find((w) => !CREEPS[w.creep].boss && !CREEPS[w.creep].immune && !CREEPS[w.creep].air)!.creep;
const boss = WAVES.find((w) => CREEPS[w.creep].boss && !CREEPS[w.creep].immune)!.creep;
const immune = WAVES.find((w) => CREEPS[w.creep].immune && !CREEPS[w.creep].boss && !CREEPS[w.creep].air)!.creep;

describe('commander spells', () => {
  it('frost nova freezes what it reaches, slows bosses and spares the immune', () => {
    const g = newGame();
    const near = spawn(g, plain, 20, 12);
    const far = spawn(g, plain, 30, 12);
    const big = spawn(g, boss, 21, 12.5);
    const proud = spawn(g, immune, 19.5, 11.5);
    expect(g.command(0, { c: 'cast', spell: 'nova', lane: 0, x: 20, y: 12 }).ok).toBe(true);
    expect(near.stunUntil).toBeGreaterThan(g.time + 2);
    expect(far.stunUntil).toBe(0);
    expect(big.stunUntil).toBe(0);
    expect(big.slowPct).toBe(0.5);
    expect(proud.stunUntil).toBe(0);
    const ev = g.drainEvents().find((e) => e.e === 'cast');
    expect(ev && ev.e === 'cast' && ev.ready).toBeCloseTo(g.time + SPELL_BY_ID.nova.cooldown);
  });

  it('waits for its cooldown', () => {
    const g = newGame();
    expect(g.command(0, { c: 'cast', spell: 'nova', lane: 0, x: 20, y: 12 }).ok).toBe(true);
    const again = g.command(0, { c: 'cast', spell: 'nova', lane: 0, x: 20, y: 12 });
    expect(again.ok).toBe(false);
    steps(g, SPELL_BY_ID.nova.cooldown * 20 + 1);
    expect(g.command(0, { c: 'cast', spell: 'nova', lane: 0, x: 20, y: 12 }).ok).toBe(true);
    // the other spells keep their own clocks
    expect(g.command(0, { c: 'cast', spell: 'meteor', lane: 0, x: 20, y: 12 }).ok).toBe(true);
  });

  it('meteors land a second later, softer on bosses, and pay the caster', () => {
    const g = newGame();
    const c = spawn(g, plain, 20, 12);
    const b = spawn(g, boss, 20.5, 12);
    c.hp = c.maxHp = 1e6;
    b.hp = b.maxHp = 1e6;
    g.command(0, { c: 'cast', spell: 'meteor', lane: 0, x: 20, y: 12 });
    steps(g, 10);
    expect(c.hp).toBe(1e6);
    steps(g, 12);
    const hit = 1e6 - c.hp;
    expect(hit).toBeGreaterThan(5);
    expect((1e6 - b.hp) / hit).toBeCloseTo(0.3, 2);
    const weak = spawn(g, plain, 20, 12);
    weak.hp = 1;
    steps(g, 20 * SPELL_BY_ID.meteor.cooldown);
    const gold = g.player(0)!.gold;
    g.command(0, { c: 'cast', spell: 'meteor', lane: 0, x: 20, y: 12 });
    steps(g, 25);
    expect(weak.alive).toBe(false);
    expect(g.player(0)!.gold).toBeGreaterThan(gold);
  });

  it('war cry makes your towers in reach attack faster for a while', () => {
    const g = newGame();
    g.devGold(0, 100);
    g.command(0, { c: 'build', tower: 'fire_1', x: 20, y: 10 });
    g.command(0, { c: 'build', tower: 'fire_1', x: 31, y: 10 });
    steps(g, 30);
    const [near, far] = [...g.towers.values()];
    g.command(0, { c: 'cast', spell: 'warcry', lane: 0, x: 21, y: 11 });
    expect(near.rallyUntil).toBeCloseTo(g.time + WARCRY.dur);
    expect(far.rallyUntil).toBe(0);
  });

  it('can be switched off in the rules', () => {
    const g = newGame({ spells: false });
    expect(g.command(0, { c: 'cast', spell: 'nova', lane: 0, x: 20, y: 12 }).ok).toBe(false);
    const h = new Game(settings, [{ id: 0, name: 'P', color: 0, isBot: false }], 1);
    expect(h.command(0, { c: 'setup', settings: { spells: false } }).ok).toBe(true);
    expect(h.settings.spells).toBe(false);
  });
});
