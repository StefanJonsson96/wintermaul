import { describe, expect, it } from 'vitest';
import { CREEPS, endlessWave, WAVE_SETS } from '../src/shared/data/waves';
import { CREEP_FLAG, type GameEvent } from '../src/shared/protocol';
import { Bot } from '../src/shared/sim/bot';
import { type Creep, Game } from '../src/shared/sim/game';

function newGame(): Game {
  const g = new Game({ difficulty: 'normal', raceMode: 'pick', endless: false, waves: 'thaw' }, [{ id: 0, name: 'P', color: 0, isBot: false }], 1, { skipSetup: true });
  g.command(0, { c: 'race', race: 'storm' });
  return g;
}

/** Puts a creep of type `def` into lane 0, held in place unless `walk`. */
function spawn(g: Game, def: string, opts: { x?: number; y?: number; walk?: boolean } = {}): Creep {
  const before = new Set(g.creeps.keys());
  g.horde.spawnQueue.unshift({ at: g.time, lane: 0, def, wave: 1 });
  g.step();
  const c = [...g.creeps.values()].find((c) => !before.has(c.id) && c.def.id === def)!;
  if (opts.x !== undefined) c.x = opts.x;
  if (opts.y !== undefined) c.y = opts.y;
  if (!opts.walk) c.rootUntil = Infinity;
  return c;
}

/** A finished storm tower (instant lightning, range 4.5) with its corner at (x, y). */
function tower(g: Game, x: number, y: number) {
  expect(g.command(0, { c: 'build', tower: 'storm_1', x, y }).ok).toBe(true);
  for (let i = 0; i < 30; i++) g.step();
  return [...g.towers.values()].find((t) => t.x === x && t.y === y)!;
}

function steps(g: Game, n: number): GameEvent[] {
  const out: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    g.step();
    out.push(...g.drainEvents());
  }
  return out;
}

describe('the thaw', () => {
  it('is a full wave set with a boss every ten waves and every new ability', () => {
    const waves = WAVE_SETS.thaw.waves;
    expect(waves).toHaveLength(40);
    for (const n of [10, 20, 30, 40]) expect(CREEPS[waves[n - 1].creep].boss).toBe(true);
    const defs = Object.values(CREEPS).filter((c) => c.id.startsWith('t'));
    for (const k of ['burrow', 'blink', 'brood', 'ward', 'frenzy', 'freeze', 'haste'] as const) expect(defs.some((d) => d[k]), k).toBe(true);
    expect(waves.filter((w) => w.mix).length).toBeGreaterThan(5);
  });

  it('a creep underground cannot be hit, and comes up again', () => {
    const g = newGame();
    tower(g, 3, 10);
    const worm = spawn(g, 't03', { x: 2.5, y: 11.5 });
    worm.burrowUntil = g.time + 100;
    worm.nextBurrow = Infinity;
    expect(g.creepFlags(worm) & CREEP_FLAG.burrowed).toBeTruthy();
    const hp = worm.hp;
    steps(g, 40);
    expect(worm.hp).toBe(hp);
    worm.burrowUntil = 0;
    steps(g, 40);
    expect(worm.hp).toBeLessThan(hp);
  });

  it('burrowers dig in on their own and move faster underground', () => {
    const g = newGame();
    const worm = spawn(g, 't03', { walk: true });
    worm.nextBurrow = g.time;
    steps(g, 1);
    expect(worm.burrowUntil).toBeGreaterThan(g.time);
    // a second worm, not digging, walks next to it for comparison
    const plain = spawn(g, 't03', { walk: true });
    plain.nextBurrow = Infinity;
    const w0 = worm.progress;
    const p0 = plain.progress;
    steps(g, 10);
    expect(w0 - worm.progress).toBeGreaterThan((p0 - plain.progress) * 1.2);
  });

  it('blinkers jump ahead along the path', () => {
    const g = newGame();
    const sprite = spawn(g, 't05', { walk: true });
    steps(g, 5);
    const before = sprite.progress;
    sprite.nextBlink = g.time;
    const ev = steps(g, 1);
    expect(ev.some((e) => e.e === 'blink' && e.id === sprite.id)).toBe(true);
    expect(before - sprite.progress).toBeGreaterThan(2);
  });

  it('broodmothers drop spiderlings that belong to the wave, up to their limit', () => {
    const g = newGame();
    const mother = spawn(g, 't08');
    const alive = () => g.horde.aliveByWave.get(1) ?? 0;
    expect(alive()).toBe(1);
    for (let i = 0; i < 10; i++) {
      mother.nextBrood = g.time;
      steps(g, 1);
    }
    const max = CREEPS.t08.brood!;
    expect(mother.broods).toBe(max.max);
    expect([...g.creeps.values()].filter((c) => c.def.id === max.into)).toHaveLength(max.count * max.max);
    expect(alive()).toBe(1 + max.count * max.max);
  });

  it('wardens shield the creeps around them', () => {
    const g = newGame();
    const imp = spawn(g, 't12', { x: 6, y: 11.5 });
    const warden = spawn(g, 't12m', { x: 6.5, y: 11.5 });
    warden.nextWard = g.time;
    const ev = steps(g, 1);
    expect(imp.shield).toBe(Math.round(imp.maxHp * CREEPS.t12m.ward!.pct));
    expect(warden.shield).toBe(0);
    expect(ev.some((e) => e.e === 'ward')).toBe(true);
  });

  it('frenzied creeps run faster once they are hurt', () => {
    const g = newGame();
    const a = spawn(g, 't07', { walk: true });
    const b = spawn(g, 't07', { walk: true });
    b.hp = b.maxHp * 0.3;
    const ax = a.progress;
    const bx = b.progress;
    steps(g, 10);
    expect(bx - b.progress).toBeGreaterThan((ax - a.progress) * 1.5);
    expect(g.creepFlags(b) & CREEP_FLAG.frenzied).toBeTruthy();
    expect(g.creepFlags(a) & CREEP_FLAG.frenzied).toBeFalsy();
  });

  it('hexers freeze the nearest tower, which stops fighting until it thaws', () => {
    const g = newGame();
    const t = tower(g, 3, 10);
    const hexer = spawn(g, 't11m', { x: 2.5, y: 11.5 });
    hexer.nextFreeze = g.time;
    const ev = steps(g, 1);
    const freeze = ev.find((e) => e.e === 'freeze');
    expect(freeze && freeze.e === 'freeze' && freeze.tw).toBe(t.id);
    expect(t.frozenUntil).toBeGreaterThan(g.time);
    expect(g.netTower(t).frozen).toBeGreaterThan(g.time);
    hexer.nextFreeze = Infinity;
    const hp = hexer.hp;
    steps(g, Math.floor((t.frozenUntil - g.time) * 20) - 1);
    expect(hexer.hp).toBe(hp);
    steps(g, 30);
    expect(hexer.hp).toBeLessThan(hp);
  });

  it('war drums speed up the creeps around the drummer', () => {
    const g = newGame();
    const wolf = spawn(g, 't16', { x: 5, y: 11.5 });
    const far = spawn(g, 't16', { x: 20, y: 11.5 });
    spawn(g, 't16m', { x: 6, y: 11.5 });
    steps(g, 1);
    expect(wolf.haste).toBe(CREEPS.t16m.haste!.pct);
    expect(far.haste).toBe(0);
    expect(g.creepFlags(wolf) & CREEP_FLAG.hasted).toBeTruthy();
  });

  it('mixed waves bring their support creeps', () => {
    const g = newGame();
    g.devSkipTo(11);
    steps(g, 60);
    const all = g.horde.spawnQueue.map((s) => s.def).concat([...g.creeps.values()].map((c) => c.def.id));
    expect(all.filter((d) => d === 't11m')).toHaveLength(4);
    expect(all.filter((d) => d === 't11')).toHaveLength(16);
  });

  it('the rules dialog picks the wave set', () => {
    const g = new Game({ difficulty: 'normal', raceMode: 'pick', endless: false }, [{ id: 0, name: 'P', color: 0, isBot: false }], 1);
    expect(g.command(0, { c: 'setup', settings: { waves: 'thaw' } }).ok).toBe(true);
    expect(g.settings.waves).toBe('thaw');
    g.command(0, { c: 'setup', settings: { waves: 'nope' as never } });
    expect(g.settings.waves).toBe('thaw');
  });

  it('endless thaw waves have their own ids and come plain', () => {
    const e = endlessWave(45, 'thaw');
    expect(e.creep.id).toBe('thaw-e45');
    expect(e.creep.brood).toBeUndefined();
    expect(e.wave.mix).toBeUndefined();
    expect(endlessWave(45).creep.id).toBe('e45');
  });

  it('a bot plays the thaw and every ability shows up', () => {
    const g = new Game({ difficulty: 'normal', raceMode: 'pick', endless: false, waves: 'thaw' }, [{ id: 0, name: 'Bot', color: 0, isBot: true }], 5, { skipSetup: true });
    const bot = new Bot(0, 5);
    const seen = new Set<string>();
    while (!g.over && g.wave < 21) {
      bot.update(g);
      g.step();
      for (const e of g.drainEvents()) seen.add(e.e);
    }
    expect(g.wave).toBeGreaterThan(12);
    for (const e of ['blink', 'brood', 'ward', 'freeze']) expect(seen.has(e), e).toBe(true);
  });
});
