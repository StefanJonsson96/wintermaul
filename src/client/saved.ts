// The single-player game in progress, kept as its seed, how it was set up and the commands it
// received, so it can be picked up again after the page closes (phones close background tabs).
import type { JournalEntry } from '../shared/sim/replay';
import { VERSION } from '../shared/version';

/** How the game was set up: enough to set it up the same way again. */
export type SavedKind = { mode: 'skirmish'; relics?: string[] } | { mode: 'campaign'; stage: string; talents: Record<string, number>; relics?: string[] };

export interface SavedGame {
  /** The game version that played it: a replay is only exact with the same rules. */
  version: string;
  kind: SavedKind;
  seed: number;
  /** Simulation steps played so far. */
  tick: number;
  cmds: JournalEntry[];
  /** For the Continue button. */
  title: string;
  wave: number;
  lives: number;
  savedAt: number;
}

const KEY = 'winterward.game.v1';

/** The latest save, for when browser storage is blocked. */
let memory: SavedGame | null = null;

export function validGame(raw: unknown): raw is SavedGame {
  const g = raw as SavedGame;
  return !!g && typeof g === 'object' && typeof g.version === 'string' && typeof g.seed === 'number' && typeof g.tick === 'number' && Array.isArray(g.cmds) && !!g.kind && (g.kind.mode === 'skirmish' || (g.kind.mode === 'campaign' && typeof g.kind.stage === 'string' && !!g.kind.talents && typeof g.kind.talents === 'object'));
}

export function loadGame(): SavedGame | null {
  try {
    const json = localStorage.getItem(KEY);
    if (json) {
      const raw = JSON.parse(json) as unknown;
      return validGame(raw) ? raw : null;
    }
  } catch {
    // storage blocked or a broken save
  }
  return memory;
}

export function storeGame(g: SavedGame): void {
  memory = g;
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    // private mode or full storage: this visit's copy still works
  }
}

export function clearGame(): void {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to remove
  }
}

/** Whether this version can rebuild the game (balance changes would make the replay drift). */
export function canResume(g: SavedGame): boolean {
  return g.version === VERSION;
}

/** "2 h ago", for the Continue button. */
export function savedAgo(g: SavedGame, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - g.savedAt) / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 36) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
