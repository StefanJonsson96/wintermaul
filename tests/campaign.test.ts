import { describe, expect, it } from 'vitest';
import { CAMPAIGN_STONES, ENDLESS, endlessReward, STAGES, starReward, starsFor } from '../src/shared/campaign';
import { RACE_BY_ID } from '../src/shared/data/races';
import { WAVES } from '../src/shared/data/waves';
import { canRefund, modsFromLoadout, NODE_BY_ID, NODES, pathTo, REGIONS, sanitizeLoadout, START, summarize, totalSpent, TREE_COST } from '../src/shared/talents';
import { RACES } from '../src/shared/data/races';
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

  it('give runestones for a good part of the web, but not all of it', () => {
    expect(CAMPAIGN_STONES).toBeGreaterThan(TREE_COST * 0.5);
    expect(CAMPAIGN_STONES).toBeLessThan(TREE_COST);
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

/** Takes a node and the path to it. */
const take = (l: Record<string, number>, id: string) => ({ ...l, ...Object.fromEntries(pathTo(id, l).map((n) => [n, 1])) });
const R = { start: 0.55, small: 0.24, notable: 0.42, keystone: 0.62 };

describe('the rune web', () => {
  it('is one connected web with two keystones per region and a mastery per race', () => {
    expect(new Set(NODES.map((n) => n.id)).size).toBe(NODES.length);
    for (const n of NODES) for (const l of n.links) expect(NODE_BY_ID[l].links, `${n.id} - ${l}`).toContain(n.id);
    // everything can be reached from the Hearth
    const seen = new Set([START]);
    const queue = [START];
    for (let i = 0; i < queue.length; i++) for (const l of NODE_BY_ID[queue[i]].links) if (!seen.has(l)) (seen.add(l), queue.push(l));
    expect(seen.size).toBe(NODES.length);
    for (const r of REGIONS) expect(NODES.filter((n) => n.region === r.id && n.kind === 'keystone')).toHaveLength(2);
    for (const race of RACES) expect(NODES.filter((n) => n.race === race.id && n.kind === 'notable')).toHaveLength(1);
    expect(NODES.length).toBeGreaterThan(180);
  });

  it('has no nodes on top of each other', () => {
    for (let i = 0; i < NODES.length; i++) {
      for (let j = i + 1; j < NODES.length; j++) {
        const a = NODES[i];
        const b = NODES[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} / ${b.id}`).toBeGreaterThan(R[a.kind] + R[b.kind] + 0.1);
      }
    }
  });

  it('takes the cheapest path to a node', () => {
    const path = pathTo('arsenal_hub', {});
    expect(path).toEqual(['arsenal_in', 'arsenal_sp1', 'arsenal_sp2', 'arsenal_w0', 'arsenal_hub']);
    for (let i = 1; i < path.length; i++) expect(NODE_BY_ID[path[i]].links).toContain(path[i - 1]);
    const l = take({}, 'arsenal_hub');
    // from there, the keystone is four more steps
    expect(pathTo('arsenal_k0', l)).toHaveLength(4);
    expect(pathTo('arsenal_hub', l)).toEqual([]);
  });

  it('gives back only nodes that nothing else hangs on', () => {
    const l = take({}, 'arsenal_hub');
    expect(canRefund('arsenal_hub', l)).toBe(true);
    expect(canRefund('arsenal_sp1', l)).toBe(false);
    expect(canRefund(START, l)).toBe(false);
    expect(canRefund('precision_hub', l)).toBe(false);
  });

  it('cleans loadouts from saves and the network', () => {
    const l = take({}, 'arsenal_hub');
    expect(sanitizeLoadout({ ...l, bogus: 1, honed: 5 })).toEqual(l);
    // a node cut off from the Hearth is dropped
    expect(sanitizeLoadout({ arsenal_hub: 1 })).toEqual({});
    // over budget: what is nearest the Hearth stays, still connected
    const cut = sanitizeLoadout(l, 3);
    expect(totalSpent(cut)).toBe(3);
    expect(cut).toEqual({ arsenal_in: 1, arsenal_sp1: 1, arsenal_sp2: 1 });
    expect(sanitizeLoadout(null)).toEqual({});
  });

  it('turns nodes into simulation bonuses', () => {
    const m = modsFromLoadout(take({}, 'arsenal_hub'));
    // three small +2% damage nodes and Honed Steel's +6%, plus a node of damage against bosses
    expect(m.dmg).toBeCloseTo(1.02 ** 3 * 1.06);
    expect(m.vsBoss).toBeCloseTo(1.03);
    const glass = modsFromLoadout(take({}, 'arsenal_k0'));
    expect(NODE_BY_ID.arsenal_k0.name).toBe('Glass Cannon');
    expect(glass.leakMul).toBe(2);
    expect(summarize(glass).some((line) => line.includes('damage'))).toBe(true);
    const race = NODES.find((n) => n.race === 'fire' && n.kind === 'notable')!;
    expect(modsFromLoadout(take({}, race.id)).dmgRace?.fire).toBeCloseTo(1.03 * 1.03 * 1.1);
  });
});

describe('campaign save', () => {
  it('survives junk and trims talents to what was earned', () => {
    expect(parseSave('not json')).toEqual(emptySave());
    const s = parseSave(JSON.stringify({ stars: { hollowmere: 3, x: 'y' }, stones: 3, talents: take({}, 'arsenal_hub') }));
    expect(s.stars).toEqual({ hollowmere: 3 });
    expect(totalSpent(s.talents)).toBe(3);
    expect(s.refunded).toBeUndefined();
  });

  it('refunds talents from the old tree, once', () => {
    const s = parseSave(JSON.stringify({ stones: 9, talents: { honed: 5, hearts: 2 } }));
    expect(s.talents).toEqual({});
    expect(unspent(s)).toBe(9);
    expect(s.refunded).toBe(true);
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
