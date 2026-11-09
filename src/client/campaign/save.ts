// Progress lives in localStorage: stars per stage, runestones and the talent loadout, daily
// challenge medals and achievements.
import { ALL_STAGES, type Chapter, CHAPTERS, chapterOf, ENDLESS_AFTER, endlessReward, STAGES, starReward, starsFor, type Stage, type StageResult } from '../../shared/campaign';
import { type Daily, dayKey, type Medal, medalFor } from '../../shared/daily';
import { type Loadout, NODE_BY_ID, sanitizeLoadout, totalSpent } from '../../shared/talents';
import { CloudSave } from './cloud';

const KEY = 'winterward.campaign.v1';

export interface CampaignSave {
  stars: Record<string, number>;
  /** Best wave reached per stage. */
  best: Record<string, number>;
  /** Runestones earned in total (spent ones included). */
  stones: number;
  talents: Loadout;
  endlessBest: number;
  /** The stage the map should open on. */
  last?: string;
  /** Set when the save held talents from the old tree, which were refunded (shown once). */
  refunded?: boolean;
  /** Daily challenge results by date: the best medal and wave. */
  daily: Record<string, DailyResult>;
  /** Achievements earned, with when (ms since 1970). */
  feats: Record<string, number>;
  /** Totals over every game played to the end. */
  tally: Tally;
}

export interface Tally {
  games: number;
  wins: number;
  kills: number;
}

export interface DailyResult {
  medal: Medal;
  wave: number;
  /** Games played that day. */
  plays: number;
}

export function emptySave(): CampaignSave {
  return { stars: {}, best: {}, stones: 0, talents: {}, endlessBest: 0, daily: {}, feats: {}, tally: { games: 0, wins: 0, kills: 0 } };
}

function numbers(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  return out;
}

/** Daily results from a save, keeping the last two months. */
function dailies(raw: unknown): Record<string, DailyResult> {
  const out: Record<string, DailyResult> = {};
  if (!raw || typeof raw !== 'object') return out;
  const days = Object.entries(raw as Record<string, Partial<DailyResult>>)
    .filter(([d, r]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && r && typeof r === 'object')
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 60);
  for (const [d, r] of days) {
    const medal = Math.max(0, Math.min(3, Math.floor(Number(r.medal) || 0))) as Medal;
    out[d] = { medal, wave: Math.max(0, Math.floor(Number(r.wave) || 0)), plays: Math.max(1, Math.floor(Number(r.plays) || 1)) };
  }
  return out;
}

function tally(raw: unknown): Tally {
  const n = numbers(raw);
  const count = (v: number | undefined) => Math.max(0, Math.floor(v ?? 0));
  return { games: count(n.games), wins: count(n.wins), kills: count(n.kills) };
}

/** Reads the save, repairing anything malformed instead of failing. */
export function parseSave(json: string | null): CampaignSave {
  if (!json) return emptySave();
  try {
    const raw = JSON.parse(json) as Partial<CampaignSave>;
    const stones = typeof raw.stones === 'number' && raw.stones >= 0 ? Math.floor(raw.stones) : 0;
    // talents from before the Rune Web (ranks of named talents) are refunded
    const old = raw.talents && typeof raw.talents === 'object' && Object.keys(raw.talents).some((id) => !NODE_BY_ID[id]);
    return {
      stars: numbers(raw.stars),
      best: numbers(raw.best),
      stones,
      talents: sanitizeLoadout(raw.talents, stones),
      endlessBest: typeof raw.endlessBest === 'number' ? raw.endlessBest : 0,
      last: typeof raw.last === 'string' ? raw.last : undefined,
      refunded: old || raw.refunded === true || undefined,
      daily: dailies(raw.daily),
      feats: numbers(raw.feats),
      tally: tally(raw.tally),
    };
  } catch {
    return emptySave();
  }
}

/** The latest save, for when browser storage is blocked. */
let memory: CampaignSave | null = null;

export function loadSave(): CampaignSave {
  try {
    const json = localStorage.getItem(KEY);
    if (json) return parseSave(json);
  } catch {
    // storage blocked: fall back to this visit's copy
  }
  return memory ? parseSave(JSON.stringify(memory)) : emptySave();
}

const cloud = new CloudSave();

/** Run on every save before it is written (achievements earned from progress hook in here). */
export const saveHooks: ((s: CampaignSave) => void)[] = [];

export function storeSave(s: CampaignSave): void {
  for (const hook of saveHooks) hook(s);
  const json = JSON.stringify(s);
  memory = parseSave(json);
  try {
    localStorage.setItem(KEY, json);
  } catch {
    // private mode or full storage: only the cloud copy (if any) keeps it
  }
  cloud.store(json);
}

/** True when `a` has come further than `b` (more runestones earned, then more stars). */
export function aheadOf(a: CampaignSave, b: CampaignSave): boolean {
  if (a.stones !== b.stones) return a.stones > b.stones;
  if (totalStars(a) !== totalStars(b)) return totalStars(a) > totalStars(b);
  if (a.endlessBest !== b.endlessBest) return a.endlessBest > b.endlessBest;
  return Object.keys(a.daily).length > Object.keys(b.daily).length;
}

/**
 * Syncs with the cloud copy when the game runs as an artifact: whichever save has come further
 * wins (the cloud one on a tie, so talents follow you between devices). `onChange` runs when
 * the local save was replaced.
 */
export function syncCloud(onChange: () => void): void {
  void cloud.connect((json) => {
    const remote = parseSave(json);
    const local = loadSave();
    if (JSON.stringify(remote) === JSON.stringify(local)) return;
    if (aheadOf(local, remote)) {
      mergeCareer(local, remote);
      cloud.store(JSON.stringify(local));
      return;
    }
    // achievements and totals from either copy are kept
    mergeCareer(remote, local);
    cloud.store(JSON.stringify(remote));
    try {
      localStorage.setItem(KEY, JSON.stringify(remote));
    } catch {
      // nothing local to update
    }
    memory = remote;
    onChange();
  });
}

/** Adds the achievements and totals of `from` to `into`. */
export function mergeCareer(into: CampaignSave, from: CampaignSave): void {
  for (const [id, at] of Object.entries(from.feats)) into.feats[id] = Math.min(at, into.feats[id] ?? Infinity);
  into.tally = { games: Math.max(into.tally.games, from.tally.games), wins: Math.max(into.tally.wins, from.tally.wins), kills: Math.max(into.tally.kills, from.tally.kills) };
}

export function unspent(s: CampaignSave): number {
  return s.stones - totalSpent(s.talents);
}

const won = (s: CampaignSave, id: string) => (s.stars[id] ?? 0) >= 2;

/** Whether a chapter is open: Act II opens once a stage of Act I is won. */
export function chapterOpen(chapter: Chapter, s: CampaignSave): boolean {
  return !chapter.opensAfter || won(s, chapter.opensAfter);
}

export function isUnlocked(stage: Stage, s: CampaignSave): boolean {
  if (stage.endless) return won(s, ENDLESS_AFTER);
  const chapter = chapterOf(stage);
  const i = chapter.stages.indexOf(stage);
  return i <= 0 ? chapterOpen(chapter, s) : won(s, chapter.stages[i - 1].id);
}

/** The first stage of a chapter not yet won, or its last one. */
export function currentStage(s: CampaignSave, chapter: Chapter = CHAPTERS[0]): Stage {
  return chapter.stages.find((st) => !won(s, st.id) && isUnlocked(st, s)) ?? chapter.stages[chapter.stages.length - 1];
}

export interface Outcome {
  stars: number;
  /** Stars this run added. */
  newStars: number;
  stones: number;
  record: boolean;
  unlocked: Stage[];
}

/** Records a finished stage and returns what it earned. Mutates and stores the save. */
export function recordResult(s: CampaignSave, stage: Stage, r: StageResult): Outcome {
  const lockedBefore = ALL_STAGES.filter((st) => !isUnlocked(st, s));
  const before = s.stars[stage.id] ?? 0;
  let stars = before;
  let stones = 0;
  let record = false;
  if (stage.endless) {
    stones = endlessReward(s.endlessBest, r.wave);
    record = r.wave > s.endlessBest;
    s.endlessBest = Math.max(s.endlessBest, r.wave);
  } else {
    const got = starsFor(stage, r);
    stars = Math.max(before, got);
    stones = starReward(stage, before, stars);
    record = r.wave > (s.best[stage.id] ?? 0);
    s.stars[stage.id] = stars;
  }
  s.best[stage.id] = Math.max(s.best[stage.id] ?? 0, r.wave);
  s.stones += stones;
  s.last = stage.id;
  storeSave(s);
  const unlocked = lockedBefore.filter((st) => isUnlocked(st, s));
  return { stars, newStars: stars - before, stones, record, unlocked };
}

export function totalStars(s: CampaignSave): number {
  return CHAPTERS.flatMap((c) => c.stages).reduce((n, st) => n + (s.stars[st.id] ?? 0), 0);
}

/** One line for the menu tile. */
export function progressLine(s: CampaignSave): string {
  const count = (c: Chapter) => c.stages.filter((st) => won(s, st.id)).length;
  if (count(CHAPTERS[0]) === 0 && s.stones === 0) return `${STAGES.length + CHAPTERS[1].stages.length} stages in two acts · earn runestones`;
  const free = unspent(s);
  const acts = CHAPTERS.filter((c) => chapterOpen(c, s)).map((c) => `${c.act} ${count(c)}/${c.stages.length}`).join(' · ');
  return `${acts} · ${totalStars(s)}★${free > 0 ? ` · ${free} runestone${free > 1 ? 's' : ''} to spend` : ''}`;
}

/** Records a daily challenge game; returns the medal and whether it beat the day's best. */
export function recordDaily(s: CampaignSave, d: Daily, r: { victory: boolean; wave: number; livesLost: number }): { medal: Medal; improved: boolean } {
  const medal = medalFor(d, r);
  const before = s.daily[d.date];
  const improved = !before || medal > before.medal || (medal === before.medal && r.wave > before.wave);
  s.daily[d.date] = { medal: Math.max(medal, before?.medal ?? 0) as Medal, wave: Math.max(r.wave, before?.wave ?? 0), plays: (before?.plays ?? 0) + 1 };
  storeSave(s);
  return { medal, improved };
}

/** Days in a row with a daily challenge played, up to today (or yesterday, if today is not played yet). */
export function dailyStreak(s: CampaignSave, today = new Date()): number {
  const day = new Date(today);
  if (!s.daily[dayKey(day)]) day.setDate(day.getDate() - 1);
  let n = 0;
  while (s.daily[dayKey(day)]) {
    n++;
    day.setDate(day.getDate() - 1);
  }
  return n;
}
