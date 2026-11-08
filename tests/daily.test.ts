import { describe, expect, it } from 'vitest';
import { dailyStreak, emptySave, recordDaily } from '../src/client/campaign/save';
import { dailyFor, dayKey, medalFor, warChest } from '../src/shared/daily';
import { RACE_BY_ID, RACES } from '../src/shared/data/races';
import { wavesOf } from '../src/shared/data/waves';
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';

const days = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${from}T12:00:00`);
    d.setDate(d.getDate() + i);
    return dayKey(d);
  });

describe('daily challenge', () => {
  it('is the same for everyone on a day, and differs between days', () => {
    expect(dailyFor('2026-11-09')).toEqual(dailyFor('2026-11-09'));
    const month = days('2026-11-01', 30).map(dailyFor);
    expect(new Set(month.map((d) => d.seed)).size).toBe(30);
    expect(new Set(month.map((d) => d.waves)).size).toBe(2);
    expect(new Set(month.map((d) => d.rules.firstWave)).size).toBeGreaterThan(3);
  });

  it('makes fair, well formed games', () => {
    for (const d of days('2026-01-01', 365).map(dailyFor)) {
      const first = d.rules.firstWave!;
      const final = d.rules.finalWave!;
      expect(final).toBeLessThanOrEqual(wavesOf(d.waves).length);
      expect(final - first).toBeGreaterThanOrEqual(10);
      expect(d.reach).toBeGreaterThan(first);
      expect(d.reach).toBeLessThan(final);
      expect(d.mutators.length).toBeGreaterThanOrEqual(1);
      expect(new Set(d.mutators.map((m) => m.name)).size).toBe(d.mutators.length);
      for (const r of d.rules.races ?? []) expect(RACE_BY_ID[r]).toBeDefined();
      if (d.rules.races) expect(new Set(d.rules.races).size).toBe(6);
      expect(d.rules.startGold).toBeGreaterThan(0);
      expect(d.name).toMatch(/^The \w+ \w+$/);
    }
  });

  it('gives a bigger war chest the later the fight starts', () => {
    expect(warChest(1)).toBe(120);
    for (let w = 2; w < 40; w++) expect(warChest(w)).toBeGreaterThan(warChest(w - 1));
  });

  it('hands out medals', () => {
    const d = dailyFor('2026-11-09');
    expect(medalFor(d, { victory: false, wave: d.reach - 1, livesLost: 20 })).toBe(0);
    expect(medalFor(d, { victory: false, wave: d.reach, livesLost: 20 })).toBe(1);
    expect(medalFor(d, { victory: true, wave: d.rules.finalWave!, livesLost: d.flawless + 1 })).toBe(2);
    expect(medalFor(d, { victory: true, wave: d.rules.finalWave!, livesLost: d.flawless })).toBe(3);
  });

  it('keeps the best result of the day and counts the streak', () => {
    const s = emptySave();
    const [a, b, c, e] = days('2026-11-05', 4).map(dailyFor);
    expect(recordDaily(s, b, { victory: true, wave: b.rules.finalWave!, livesLost: 0 })).toEqual({ medal: 3, improved: true });
    expect(recordDaily(s, b, { victory: false, wave: 2, livesLost: 20 })).toEqual({ medal: 0, improved: false });
    expect(s.daily[b.date]).toMatchObject({ medal: 3, plays: 2 });
    recordDaily(s, a, { victory: false, wave: 1, livesLost: 20 });
    recordDaily(s, c, { victory: false, wave: 1, livesLost: 20 });
    // played the 5th, 6th and 7th; the 8th not yet, so the streak still counts up to yesterday
    expect(dailyStreak(s, new Date(`${e.date}T09:00:00`))).toBe(3);
    expect(dailyStreak(s, new Date(`${c.date}T09:00:00`))).toBe(3);
    // a day missed breaks it
    expect(dailyStreak(s, new Date('2026-11-10T09:00:00'))).toBe(0);
  });

  it('can be played to the end', () => {
    for (const date of ['2026-11-08', '2026-11-09', '2026-11-10']) {
      const d = dailyFor(date);
      const init = [{ id: 0, name: 'B', color: 0, isBot: true }];
      const game = new Game({ difficulty: d.difficulty, raceMode: 'pick', endless: false, waves: d.waves }, init, d.seed, { skipSetup: true, rules: d.rules });
      const pool = d.rules.races ?? RACES.map((r) => r.id);
      const bot = new Bot(0, d.seed, [pool[0], pool[1]]);
      expect(game.wave).toBe(d.rules.firstWave! - 1);
      while (!game.over && game.time < 4000) {
        bot.update(game);
        game.step();
        game.drainEvents();
      }
      expect(game.over).toBe(true);
      expect(game.player(0)!.races.length).toBeGreaterThan(0);
      expect(game.player(0)!.races.every((r) => pool.includes(r))).toBe(true);
      if (game.phase === 'victory') expect(game.wave).toBe(d.rules.finalWave);
    }
  });
});
