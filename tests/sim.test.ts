import { describe, expect, it } from 'vitest';
import { FIRST_WAVE_DELAY, LANE_H, LUMBER_WAVES, RANDOM_RACE_BONUS, SETUP_TIME, START_GOLD, waveBonus } from '../src/shared/constants';
import { TOWERS, totalCost } from '../src/shared/data/races';
import { CREEPS, WAVES } from '../src/shared/data/waves';
import { CELL_ROCK, CELL_TOWER, LaneGrid } from '../src/shared/grid';
import { startingLives, type GameSettings } from '../src/shared/protocol';
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';

const settings: GameSettings = { difficulty: 'normal', raceMode: 'pick', endless: false };
const players = (n: number, bots = false) => Array.from({ length: n }, (_, i) => ({ id: i, name: `P${i}`, color: i, isBot: bots }));
const run = (g: Game, seconds: number) => {
  for (let i = 0; i < seconds * 20 && !g.over; i++) g.step();
};

describe('lane grid', () => {
  it('has pillars and an open path at the start', () => {
    const g = new LaneGrid();
    expect(Array.from(g.cells).filter((c) => c === CELL_ROCK).length).toBe(4 * 6 * 4);
    expect(Number.isFinite(g.pathLength())).toBe(true);
  });

  it('refuses placements that would seal the path', () => {
    const g = new LaneGrid();
    // plug every gap of the first pillar line: the last one must be refused
    const gaps = [2, 6, 10, 14, 18, 22];
    let refused = 0;
    for (const y of gaps) {
      const r = g.canPlace(9, y, []);
      if (r.ok) {
        g.setFootprint(9, y, CELL_TOWER);
        g.recompute();
      } else {
        refused++;
        expect(r.reason).toMatch(/block/);
      }
    }
    expect(refused).toBe(1);
    expect(Number.isFinite(g.pathLength())).toBe(true);
  });

  it('refuses building on a creep and outside the build zone', () => {
    const g = new LaneGrid();
    expect(g.canPlace(0, 0, []).ok).toBe(false);
    expect(g.canPlace(41, 5, []).ok).toBe(false);
    expect(g.canPlace(20, 5, [g.idx(21, 6)]).ok).toBe(false);
    expect(g.canPlace(20, 5, []).ok).toBe(true);
  });

  it('the bot maze plan never blocks and lengthens the path a lot', () => {
    const g = new LaneGrid();
    const straight = g.pathLength();
    for (const p of Bot.serpentine()) {
      if (g.canPlace(p.x, p.y, []).ok) {
        g.setFootprint(p.x, p.y, CELL_TOWER);
        g.recompute();
      }
    }
    expect(g.pathLength()).toBeGreaterThan(straight * 5);
  });
});

describe('setup phase', () => {
  it('only the first human picks the rules, then the countdown starts', () => {
    const g = new Game(settings, players(2));
    expect(g.phase).toBe('setup');
    expect(g.chooser).toBe(0);
    expect(g.command(1, { c: 'setup', settings: { difficulty: 'hard' } }).ok).toBe(false);
    expect(g.command(0, { c: 'setup', settings: { difficulty: 'hard' } }).ok).toBe(true);
    expect(g.command(0, { c: 'race', race: 'frost' }).ok).toBe(false);
    expect(g.command(0, { c: 'setupDone' }).ok).toBe(true);
    expect(g.phase).toBe('build');
    expect(g.lives).toBe(startingLives('hard', 2));
    expect(g.countdown).toBe(FIRST_WAVE_DELAY);
  });

  it('defaults to Normal when the timer runs out', () => {
    const g = new Game(settings, players(1));
    run(g, SETUP_TIME + 1);
    expect(g.phase).toBe('build');
    expect(g.lives).toBe(30);
  });

  it('race modes: random rolls races, same gives everyone one race, double gives 2 lumber', () => {
    const r = new Game({ ...settings, raceMode: 'random' }, players(3), 7, { skipSetup: true });
    expect(r.players.every((p) => p.races.length === 1 && p.lumber === 0)).toBe(true);
    const s = new Game({ ...settings, raceMode: 'same' }, players(3), 7, { skipSetup: true });
    expect(new Set(s.players.map((p) => p.races[0])).size).toBe(1);
    const d = new Game({ ...settings, raceMode: 'double' }, players(2), 7, { skipSetup: true });
    expect(d.players.every((p) => p.lumber === 2)).toBe(true);
  });

  it('going random gives bonus gold', () => {
    const g = new Game(settings, players(1), 3, { skipSetup: true });
    g.command(0, { c: 'race', race: 'random' });
    expect(g.players[0].races.length).toBe(1);
    expect(g.players[0].gold).toBe(START_GOLD + RANDOM_RACE_BONUS);
  });
});

describe('building, upgrading and selling', () => {
  it('charges gold, upgrades in place and refunds correctly', () => {
    const g = new Game(settings, players(1), 1, { skipSetup: true });
    g.command(0, { c: 'race', race: 'frost' });
    expect(g.command(0, { c: 'build', tower: 'frost_1', x: 20, y: 4 }).ok).toBe(true);
    const t = [...g.towers.values()][0];
    expect(g.players[0].gold).toBe(START_GOLD - 10);
    expect(g.command(0, { c: 'upgrade', ids: [t.id], to: 'frost_2a' }).ok).toBe(false); // still building
    run(g, 1.2);
    expect(g.command(0, { c: 'upgrade', ids: [t.id], to: 'frost_2a' }).ok).toBe(true);
    expect(t.def.id).toBe('frost_2a');
    expect(t.invested).toBe(totalCost('frost_2a'));
    // sold in the same build phase: full refund
    const before = g.players[0].gold;
    g.command(0, { c: 'sell', ids: [t.id] });
    expect(g.players[0].gold).toBe(before + totalCost('frost_2a'));
  });

  it('cannot build towers of races you do not own, or tier 2 directly', () => {
    const g = new Game(settings, players(1), 1, { skipSetup: true });
    g.command(0, { c: 'race', race: 'fire' });
    expect(g.command(0, { c: 'build', tower: 'frost_1', x: 20, y: 4 }).ok).toBe(false);
    expect(g.command(0, { c: 'build', tower: 'fire_2a', x: 20, y: 4 }).ok).toBe(false);
  });

  it('selling during a wave leaves rubble until the wave ends (anti-juggle)', () => {
    const g = new Game(settings, players(1), 1, { skipSetup: true });
    g.command(0, { c: 'race', race: 'stone' });
    g.command(0, { c: 'build', tower: 'stone_1', x: 30, y: 2 });
    run(g, FIRST_WAVE_DELAY + 2);
    expect(g.phase).toBe('wave');
    const t = [...g.towers.values()][0];
    const gold = g.players[0].gold;
    g.command(0, { c: 'sell', ids: [t.id] });
    expect(g.players[0].gold).toBe(gold + Math.floor(t.invested * 0.75));
    expect(g.lanes[0].grid.cells[g.lanes[0].grid.idx(30, 2)]).toBe(2);
    expect(g.command(0, { c: 'build', tower: 'stone_1', x: 30, y: 2 }).ok).toBe(false);
  });

  it('legends need lumber and are unique', () => {
    const g = new Game({ ...settings, raceMode: 'double' }, players(1), 1, { skipSetup: true });
    g.command(0, { c: 'race', race: 'tech' });
    g.players[0].gold = 5000;
    expect(g.command(0, { c: 'build', tower: 'tech_L', x: 20, y: 4 }).ok).toBe(true);
    expect(g.players[0].lumber).toBe(0);
    expect(g.command(0, { c: 'build', tower: 'tech_L', x: 24, y: 4 }).ok).toBe(false);
  });
});

describe('waves and leaks', () => {
  it('a leaked creep costs a life and runs into the next lane, then escapes', () => {
    const g = new Game(settings, players(2), 5, { skipSetup: true });
    const leaks: { from: number; to: number; escaped: boolean }[] = [];
    run(g, FIRST_WAVE_DELAY + 1);
    let guard = 0;
    while (leaks.length < 2 && guard++ < 20 * 120) {
      g.step();
      for (const e of g.drainEvents()) if (e.e === 'leak') leaks.push(e);
    }
    expect(leaks[0].escaped).toBe(false);
    expect(leaks[0].to).toBe((leaks[0].from + 1) % 2);
    expect(g.lives).toBeLessThan(startingLives('normal', 2));
  });

  it('pays the level bonus when a wave is cleared, and lumber on schedule', () => {
    const g = new Game(settings, players(1), 5, { skipSetup: true });
    g.devSkipTo(LUMBER_WAVES[0]);
    run(g, 3);
    expect(g.wave).toBe(LUMBER_WAVES[0]);
    const lumber = g.players[0].lumber;
    const gold = g.players[0].gold;
    // wipe the wave instantly
    let guard = 0;
    while (g.phase === 'wave' && guard++ < 20 * 200) {
      for (const c of [...g.creeps.values()]) g.horde.killCreep(c, -1, -1);
      g.step();
    }
    expect(g.phase).toBe('build');
    expect(g.players[0].lumber).toBe(lumber + 1);
    expect(g.players[0].gold).toBeGreaterThanOrEqual(gold + waveBonus(LUMBER_WAVES[0]));
  });

  it('winning after the final wave', () => {
    const g = new Game(settings, players(1), 5, { skipSetup: true });
    g.devSkipTo(WAVES.length);
    let guard = 0;
    while (!g.over && guard++ < 20 * 400) {
      for (const c of [...g.creeps.values()]) g.horde.killCreep(c, -1, -1);
      g.step();
    }
    expect(g.phase).toBe('victory');
  });

  it('the Winter Tyrant getting away is a defeat, whatever the lives', () => {
    const g = new Game({ ...settings, difficulty: 'casual' }, players(1), 5, { skipSetup: true });
    g.devSkipTo(WAVES.length);
    g.lives = 1000;
    run(g, 900);
    expect(g.phase).toBe('defeat');
  });

  it('healers mend their neighbours once per cycle, never themselves', () => {
    const g = new Game(settings, players(1), 3, { skipSetup: true });
    g.devSkipTo(26);
    run(g, 6);
    const healers = [...g.creeps.values()];
    expect(healers.length).toBeGreaterThan(3);
    for (const c of healers) c.hp = c.maxHp / 2;
    run(g, 3.2);
    const pct = CREEPS.w26.heal!.pct;
    for (const c of healers) expect(c.hp).toBeLessThanOrEqual(c.maxHp * (0.5 + pct) + 1);
    // the leader has nobody in front of it to heal it
    expect(healers.some((c) => c.hp === c.maxHp / 2)).toBe(true);
  });

  it('extra creep health on hard phases in over the first waves', () => {
    const g = new Game({ ...settings, difficulty: 'hard' }, players(1), 3, { skipSetup: true });
    run(g, FIRST_WAVE_DELAY + 1);
    const early = [...g.creeps.values()][0];
    expect(early.maxHp).toBeLessThan(CREEPS.w01.hp * 1.05);
    g.devSkipTo(20);
    run(g, 10);
    const boss = [...g.creeps.values()].find((c) => c.def.boss)!;
    expect(boss.maxHp).toBe(Math.round(CREEPS.w20.hp * 1.2));
  });

  it('every wave references a real creep; bosses are single units', () => {
    for (const w of WAVES) {
      expect(CREEPS[w.creep]).toBeDefined();
      if (CREEPS[w.creep].boss) expect(w.count).toBe(1);
    }
    expect(WAVES.length).toBe(40);
  });
});

describe('data', () => {
  it('every race has the same tree: tier 1, two branches of three upgrades, and a legend', () => {
    const races = new Set(Object.values(TOWERS).map((t) => t.race));
    expect(races.size).toBe(12);
    for (const r of races) {
      const ts = Object.values(TOWERS).filter((t) => t.race === r);
      expect(ts.length).toBe(8);
      expect(ts.filter((t) => t.tier === 1)[0].upgrades.length).toBe(2);
      expect(ts.filter((t) => t.tier === 5).length).toBe(1);
    }
  });

  it('flyers cross the lane in the middle rows', () => {
    const g = new Game(settings, players(1), 9, { skipSetup: true });
    g.devSkipTo(5);
    run(g, 4);
    const air = [...g.creeps.values()].filter((c) => c.air);
    expect(air.length).toBeGreaterThan(0);
    for (const c of air) expect(Math.abs(c.y - LANE_H / 2)).toBeLessThan(3);
  });
});
