import { beforeEach, describe, expect, it } from 'vitest';
import { catchUp, earn, FEAT_GROUPS, featCount, FEATS, onFeat } from '../src/client/campaign/feats';
import { emptySave, loadSave, mergeCareer, recordResult, saveHooks, storeSave } from '../src/client/campaign/save';
import { CHAPTERS } from '../src/shared/campaign';
import { NODES, pathTo } from '../src/shared/talents';

const heard: string[] = [];
onFeat((f) => heard.push(f.id));

beforeEach(() => {
  const hooks = saveHooks.splice(0);
  storeSave(emptySave());
  saveHooks.push(...hooks);
  heard.length = 0;
});

describe('achievements', () => {
  it('are well formed', () => {
    expect(new Set(FEATS.map((f) => f.id)).size).toBe(FEATS.length);
    for (const g of FEAT_GROUPS) expect(FEATS.some((f) => f.group === g.id)).toBe(true);
    for (const f of FEATS) {
      expect(FEAT_GROUPS.some((g) => g.id === f.group)).toBe(true);
      if (f.count) expect(f.goal).toBeGreaterThan(0);
      expect(f.text).toMatch(/\.$/);
    }
  });

  it('are earned once, and announced', () => {
    expect(earn(['boss']).map((f) => f.id)).toEqual(['boss']);
    expect(earn(['boss', 'hoard']).map((f) => f.id)).toEqual(['hoard']);
    expect(heard).toEqual(['boss', 'hoard']);
    expect(featCount()).toEqual({ got: 2, all: FEATS.length });
  });

  it('come from campaign progress as it is saved', () => {
    const s = loadSave();
    const act = CHAPTERS[0].stages.filter((st) => !st.endless);
    for (const st of act.slice(0, -1)) recordResult(s, st, { victory: true, wave: st.rules.finalWave ?? 40, livesLost: 99 });
    expect(loadSave().feats.act1).toBeUndefined();
    const last = act[act.length - 1];
    recordResult(s, last, { victory: true, wave: last.rules.finalWave ?? 40, livesLost: 99 });
    expect(loadSave().feats.act1).toBeGreaterThan(0);
    expect(heard).toContain('act1');
    expect(heard).not.toContain('stars');
  });

  it('come from the Rune Web', () => {
    const s = loadSave();
    s.stones = 150;
    const keystone = NODES.find((n) => n.kind === 'keystone')!;
    for (const id of pathTo(keystone.id, s.talents)) s.talents[id] = 1;
    storeSave(s);
    expect(heard).toContain('keystone');
  });

  it('count career totals', () => {
    const s = loadSave();
    s.tally = { games: 29, wins: 3, kills: 24000 };
    storeSave(s);
    expect(heard).toEqual([]);
    s.tally.games = 30;
    s.tally.kills = 25000;
    storeSave(s);
    expect(heard.sort()).toEqual(['career_games', 'career_kills']);
  });

  it('a save from before achievements catches up quietly', () => {
    const s = emptySave();
    s.tally = { games: 30, wins: 0, kills: 0 };
    const hooks = saveHooks.splice(0);
    storeSave(s);
    saveHooks.push(...hooks);
    expect(catchUp()).toBe(1);
    expect(heard).toEqual([]);
    expect(loadSave().feats.career_games).toBeGreaterThan(0);
    expect(catchUp()).toBe(0);
  });

  it('merge between devices', () => {
    const a = emptySave();
    const b = emptySave();
    a.feats = { boss: 100, hoard: 50 };
    b.feats = { boss: 80, legend: 70 };
    a.tally = { games: 5, wins: 1, kills: 900 };
    b.tally = { games: 3, wins: 2, kills: 1200 };
    mergeCareer(a, b);
    expect(a.feats).toEqual({ boss: 80, hoard: 50, legend: 70 });
    expect(a.tally).toEqual({ games: 5, wins: 2, kills: 1200 });
  });
});
