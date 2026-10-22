// Campaign progress lives in localStorage: stars per stage, runestones and the talent loadout.
import { ENDLESS, ENDLESS_AFTER, STAGES, endlessReward, starReward, starsFor, type Stage, type StageResult } from '../../shared/campaign';
import { type Loadout, sanitizeLoadout, totalSpent } from '../../shared/talents';
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
}

export function emptySave(): CampaignSave {
  return { stars: {}, best: {}, stones: 0, talents: {}, endlessBest: 0 };
}

function numbers(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  return out;
}

/** Reads the save, repairing anything malformed instead of failing. */
export function parseSave(json: string | null): CampaignSave {
  if (!json) return emptySave();
  try {
    const raw = JSON.parse(json) as Partial<CampaignSave>;
    const stones = typeof raw.stones === 'number' && raw.stones >= 0 ? Math.floor(raw.stones) : 0;
    return {
      stars: numbers(raw.stars),
      best: numbers(raw.best),
      stones,
      talents: sanitizeLoadout(raw.talents, stones),
      endlessBest: typeof raw.endlessBest === 'number' ? raw.endlessBest : 0,
      last: typeof raw.last === 'string' ? raw.last : undefined,
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

export function storeSave(s: CampaignSave): void {
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
  return a.endlessBest > b.endlessBest;
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
      cloud.store(JSON.stringify(local));
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(remote));
    } catch {
      // nothing local to update
    }
    memory = remote;
    onChange();
  });
}

export function unspent(s: CampaignSave): number {
  return s.stones - totalSpent(s.talents);
}

export function isUnlocked(stage: Stage, s: CampaignSave): boolean {
  if (stage.endless) return (s.stars[ENDLESS_AFTER] ?? 0) >= 2;
  const i = STAGES.indexOf(stage);
  return i <= 0 || (s.stars[STAGES[i - 1].id] ?? 0) >= 2;
}

/** The first stage not yet won, or the last one. */
export function currentStage(s: CampaignSave): Stage {
  return STAGES.find((st) => (s.stars[st.id] ?? 0) < 2 && isUnlocked(st, s)) ?? STAGES[STAGES.length - 1];
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
  const lockedBefore = [...STAGES, ENDLESS].filter((st) => !isUnlocked(st, s));
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
  return STAGES.reduce((n, st) => n + (s.stars[st.id] ?? 0), 0);
}

/** One line for the menu tile. */
export function progressLine(s: CampaignSave): string {
  const won = STAGES.filter((st) => (s.stars[st.id] ?? 0) >= 2).length;
  if (won === 0 && s.stones === 0) return `${STAGES.length} stages · earn runestones`;
  const free = unspent(s);
  return `${won}/${STAGES.length} won · ${totalStars(s)}★${free > 0 ? ` · ${free} runestone${free > 1 ? 's' : ''} to spend` : ''}`;
}
