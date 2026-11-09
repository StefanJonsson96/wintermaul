// Moving progress between devices: the whole save (campaign, Rune Web, relics, achievements and
// the game in progress) as one code to copy, or a file. The code is the JSON in base64url with a
// checksum, so a code cut short when copying is caught instead of loaded half.
import { type SavedGame, validGame } from '../saved';
import { type CampaignSave, parseSave, totalStars } from './save';

export const CODE_PREFIX = 'WINTERWARD-1.';

export interface Transfer {
  campaign: CampaignSave;
  game: SavedGame | null;
  exportedAt: number;
}

function checksum(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function exportCode(campaign: CampaignSave, game: SavedGame | null, now = Date.now()): string {
  const json = JSON.stringify({ campaign, game, exportedAt: now });
  return `${CODE_PREFIX}${toBase64Url(json)}.${checksum(json)}`;
}

/** Reads a code or a file's text; throws an Error with a message for people when it can't. */
export function importCode(text: string): Transfer {
  const code = text.replace(/\s+/g, '');
  if (!code.startsWith(CODE_PREFIX)) throw new Error("That isn't a Winterward save code.");
  const body = code.slice(CODE_PREFIX.length);
  const dot = body.lastIndexOf('.');
  if (dot < 0) throw new Error('The code is incomplete: copy all of it.');
  let json: string;
  try {
    json = fromBase64Url(body.slice(0, dot));
  } catch {
    throw new Error('The code is damaged: copy all of it again.');
  }
  if (checksum(json) !== body.slice(dot + 1)) throw new Error('The code is incomplete or damaged: copy all of it again.');
  const raw = JSON.parse(json) as { campaign?: unknown; game?: unknown; exportedAt?: unknown };
  return {
    campaign: parseSave(JSON.stringify(raw.campaign ?? {})),
    game: validGame(raw.game) ? raw.game : null,
    exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : 0,
  };
}

/** One line about a save, to compare before replacing one. */
export function describeSave(s: CampaignSave): string {
  const won = Object.values(s.stars).filter((n) => n >= 2).length;
  return `${won} stage${won === 1 ? '' : 's'} won · ${totalStars(s)}★ · ${s.stones} runestones · ${Object.keys(s.feats).length} achievements`;
}
