import { describe, expect, it } from 'vitest';
import { CAMPAIGN_STONES, ENDLESS, endlessReward, STAGES, starReward, starsFor } from '../src/shared/campaign';
import { RACE_BY_ID } from '../src/shared/data/races';
import { WAVES } from '../src/shared/data/waves';
import { modsFromLoadout, rankUpBlocker, sanitizeLoadout, TALENT_BY_ID, TALENTS, totalSpent, TREE_COST } from '../src/shared/talents';
import { emptySave, isUnlocked, parseSave, recordResult, unspent } from '../src/client/campaign/save';

const first = STAGES[0];

describe('campaign stages', () => {
  it('are all well formed', () => {
    for (const s of STAGES) {
      const from = s.rules.firstWave ?? 1;
      const to = s.rules.finalWave ?? WAVES.length;
      expect(from).toBeLessThanOrEqual(to);
      expect(s.reach).toBeGreaterThanOrEqual(from);
      expect(s.reach).toBeLessThanOrEqual(to);
      for (const r of s.rules.races ?? []) expect(RACE_BY_ID[r]).toBeDefined();
      expect(s.rewards.every((n) => n > 0)).toBe(true);
    }
  });

  it('give enough runestones to fill most of the tree', () => {
    expect(CAMPAIGN_STONES).toBeGreaterThan(TREE_COST * 0.8);
  });

  it('award stars for reaching, winning and winning cleanly', () => {
    const s = first;
    expect(starsFor(s, { victory: false, wave: s.reach - 1, livesLost: 30 })).toBe(0);
    expect(starsFor(s, { victory: false, wave: s.reach, livesLost: 30 })).toBe(1);
    expect(starsFor(s, { victory: true, wave: 10, livesLost: s.flawless + 1 })).toBe(2);
    expect(starsFor(s, { victory: true, wave: 10, livesLost: s.flawless })).toBe(3);
  });

  it('pay runestones only for new stars', () => {
    expect(starReward(first, 0, 3)).toBe(first.rewards[0] + first.rewards[1] + first.rewards[2]);
    expect(starReward(first, 1, 2)).toBe(first.rewards[1]);
    expect(starReward(first, 3, 3)).toBe(0);
    expect(starReward(first, 2, 1)).toBe(0);
  });

  it('pay the endless frontier per 5 waves past 20', () => {
    expect(endlessReward(0, 24)).toBe(0);
    expect(endlessReward(0, 25)).toBe(1);
    expect(endlessReward(27, 41)).toBe(3);
    expect(endlessReward(41, 30)).toBe(0);
  });
});

describe('talents', () => {
  it('have unique ids and reachable gates', () => {
    expect(new Set(TALENTS.map((t) => t.id)).size).toBe(TALENTS.length);
    for (const t of TALENTS) {
      const below = TALENTS.filter((o) => o.branch === t.branch && o.gate < t.gate).reduce((n, o) => n + o.max * o.cost, 0);
      expect(below).toBeGreaterThanOrEqual(t.gate);
    }
  });

  it('turn ranks into simulation bonuses', () => {
    const m = modsFromLoadout({ honed: 5, hearts: 2, kin_fire: 3, pierce: 1 });
    expect(m.dmg).toBeCloseTo(1.1);
    expect(m.lives).toBe(4);
    expect(m.dmgRace?.fire).toBeCloseTo(1.12);
    expect(m.dmgType?.pierce).toBeCloseTo(1.05);
  });

  it('respect gates and budgets', () => {
    expect(rankUpBlocker(TALENT_BY_ID.deadeye, {}, 50)).toMatch(/Spend/);
    expect(rankUpBlocker(TALENT_BY_ID.honed, {}, 0)).toMatch(/Needs/);
    expect(rankUpBlocker(TALENT_BY_ID.honed, { honed: 5 }, 9)).toBe('Fully learned');
    expect(rankUpBlocker(TALENT_BY_ID.honed, {}, 1)).toBeNull();
  });

  it('sanitize loadouts from saves and the network', () => {
    expect(sanitizeLoadout({ honed: 99, bogus: 3, eagle: -2, quick: 'x' })).toEqual({ honed: 5 });
    // a capstone without the ranks that open it is dropped
    expect(sanitizeLoadout({ deadeye: 1 })).toEqual({});
    // over budget: keeps what fits, in gate order
    const l = sanitizeLoadout({ honed: 5, eagle: 3, hearts: 5 }, 7);
    expect(totalSpent(l)).toBe(7);
    expect(sanitizeLoadout(null)).toEqual({});
  });
});

describe('campaign save', () => {
  it('survives junk and trims talents to what was earned', () => {
    expect(parseSave('not json')).toEqual(emptySave());
    const s = parseSave(JSON.stringify({ stars: { hollowmere: 3, x: 'y' }, stones: 3, talents: { honed: 5 } }));
    expect(s.stars).toEqual({ hollowmere: 3 });
    expect(totalSpent(s.talents)).toBe(3);
  });

  it('records stars once and unlocks the next stage', () => {
    const s = emptySave();
    expect(isUnlocked(STAGES[1], s)).toBe(false);
    const a = recordResult(s, first, { victory: true, wave: 10, livesLost: 0 });
    expect(a.stars).toBe(3);
    expect(a.stones).toBe(starReward(first, 0, 3));
    expect(a.unlocked).toContain(STAGES[1]);
    expect(isUnlocked(STAGES[1], s)).toBe(true);
    const b = recordResult(s, first, { victory: true, wave: 10, livesLost: 0 });
    expect(b.stones).toBe(0);
    expect(unspent(s)).toBe(a.stones);
  });

  it('opens the endless frontier after the iron pass', () => {
    const s = emptySave();
    expect(isUnlocked(ENDLESS, s)).toBe(false);
    s.stars.ironpass = 2;
    expect(isUnlocked(ENDLESS, s)).toBe(true);
    const r = recordResult(s, ENDLESS, { victory: false, wave: 31, livesLost: 30 });
    expect(r.stones).toBe(2);
    expect(r.record).toBe(true);
  });
});

describe('cloud saves', () => {
  it('prefer the save that came further', async () => {
    const { aheadOf } = await import('../src/client/campaign/save');
    const a = emptySave();
    const b = emptySave();
    b.stones = 4;
    expect(aheadOf(b, a)).toBe(true);
    expect(aheadOf(a, b)).toBe(false);
    a.stones = 4;
    a.stars = { hollowmere: 3 };
    b.stars = { hollowmere: 2 };
    expect(aheadOf(a, b)).toBe(true);
    expect(aheadOf(b, a)).toBe(false);
  });

  it('load from and write to the host store, one write at a time', async () => {
    const { CloudSave } = await import('../src/client/campaign/cloud');
    const writes: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    let stored: string | undefined = '{"stones":7}';
    const doc = {
      get: async () => ({ exists: stored !== undefined, data: () => (stored === undefined ? undefined : { save: stored }) }),
      set: async (data: Record<string, unknown>) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        stored = data.save as string;
        writes.push(stored);
        inFlight--;
      },
    };
    const host = { use: async (name: string) => (name === 'db' ? { doc: () => doc } : name === 'user' ? { id: async () => 'u1' } : null) };
    (globalThis as { claude?: unknown }).claude = host;
    try {
      const cloud = new CloudSave();
      let remote = '';
      await cloud.connect((json) => (remote = json));
      expect(remote).toBe('{"stones":7}');
      cloud.store('{"stones":8}');
      cloud.store('{"stones":9}');
      cloud.store('{"stones":10}');
      await new Promise((r) => setTimeout(r, 50));
      expect(maxInFlight).toBe(1);
      expect(writes[writes.length - 1]).toBe('{"stones":10}');
      expect(writes.length).toBeLessThanOrEqual(2);
    } finally {
      delete (globalThis as { claude?: unknown }).claude;
    }
  });

  it('do nothing outside the artifact host', async () => {
    const { CloudSave } = await import('../src/client/campaign/cloud');
    const cloud = new CloudSave();
    let called = false;
    await cloud.connect(() => (called = true));
    cloud.store('{}');
    expect(called).toBe(false);
  });
});
