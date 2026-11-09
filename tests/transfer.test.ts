import { describe, expect, it } from 'vitest';
import { emptySave } from '../src/client/campaign/save';
import { exportCode, importCode } from '../src/client/campaign/transfer';

describe('save transfer', () => {
  const s = emptySave();
  s.stars = { hollowmere: 3, pinewatch: 2 };
  s.stones = 12;
  s.feats = { boss: 123 };
  s.relics = ['tooth'];
  s.talents = { arsenal_in: 1 };
  const game = { version: '3.0.0', kind: { mode: 'skirmish' as const }, seed: 7, tick: 100, cmds: [[3, 0, { c: 'ready', value: true }]] as never, title: 'Skirmish · Ünïcødé ❄', wave: 2, lives: 30, savedAt: 1 };

  it('round-trips the campaign and the game in progress', () => {
    const t = importCode(exportCode(s, game, 42));
    expect(t.campaign.stars).toEqual(s.stars);
    expect(t.campaign.relics).toEqual(['tooth']);
    expect(t.campaign.feats).toEqual({ boss: 123 });
    expect(t.campaign.talents).toEqual({ arsenal_in: 1 });
    expect(t.game).toEqual(game);
    expect(t.exportedAt).toBe(42);
  });

  it('survives line breaks and spaces from copying', () => {
    const code = exportCode(s, null);
    const wrapped = code.match(/.{1,40}/g)!.join('\n  ');
    expect(importCode(wrapped).campaign.stars).toEqual(s.stars);
  });

  it('refuses codes that are cut short or not ours', () => {
    const code = exportCode(s, null);
    expect(() => importCode(code.slice(0, -12))).toThrow(/incomplete|damaged/);
    expect(() => importCode(code.slice(0, 40) + code.slice(41))).toThrow();
    expect(() => importCode('hello')).toThrow(/isn't a Winterward/);
  });
});
