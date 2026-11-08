// Commander spells: three powers every player can call down on the map, each on its own cooldown.
// They are a rules option (on unless the rules dialog turns them off), and bots never use them.
import { DT } from '../constants';
import { baseHp } from '../data/waves';
import type { CommandResult, Player } from './entities';
import type { Game } from './game';

export type SpellId = 'nova' | 'meteor' | 'warcry';

export interface SpellDef {
  id: SpellId;
  name: string;
  /** What it does, for tooltips. */
  desc: string;
  /** Seconds between casts. */
  cooldown: number;
  /** Radius in cells. */
  radius: number;
  /** Icon, from the client's icon set. */
  glyph: string;
  color: string;
}

export const SPELLS: SpellDef[] = [
  { id: 'nova', name: 'Frost Nova', desc: 'Freezes the creeps in an area for 2.5 seconds. Bosses are slowed instead; immune creeps shrug it off.', cooldown: 45, radius: 2.6, glyph: 'snow', color: '#9fe8ff' },
  { id: 'meteor', name: 'Meteor', desc: 'A meteor falls a second later and hits everything in an area hard (bosses less). It grows with the waves.', cooldown: 55, radius: 2, glyph: 'flame', color: '#ff8a3c' },
  { id: 'warcry', name: 'War Cry', desc: 'Your towers in a wide area attack 40% faster for 8 seconds.', cooldown: 60, radius: 4.5, glyph: 'banner', color: '#ffd35a' },
];

export const SPELL_BY_ID = Object.fromEntries(SPELLS.map((s) => [s.id, s])) as Record<SpellId, SpellDef>;

/** How long a War Cry lasts, and how much faster towers attack under it. */
export const WARCRY = { dur: 8, speed: 1.4 };

interface Falling {
  at: number;
  lane: number;
  x: number;
  y: number;
  owner: number;
  dmg: number;
}

export class Spells {
  private falling: Falling[] = [];

  constructor(private readonly g: Game) {}

  cast(p: Player, id: SpellId, lane: number, x: number, y: number): CommandResult {
    const def = SPELL_BY_ID[id];
    const g = this.g;
    if (!def) return { ok: false, error: 'Unknown spell' };
    if (g.settings.spells === false) return { ok: false, error: 'Spells are off in this game' };
    if (!g.lanes[lane] || !Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, error: 'Cast it on a lane' };
    const ready = p.spells[id] ?? 0;
    if (g.time < ready) return { ok: false, error: `${def.name} is ready in ${Math.ceil(ready - g.time)}s` };
    p.spells[id] = g.time + def.cooldown;
    const now = g.time;
    const r2 = def.radius * def.radius;
    const inReach = (cx: number, cy: number) => (cx - x) ** 2 + (cy - y) ** 2 <= r2;
    if (id === 'nova') {
      const stun = 2.5 * (p.mods.stun ?? 1);
      for (const c of g.creeps.values()) {
        if (!c.alive || c.lane !== lane || c.def.immune || now < c.burrowUntil || !inReach(c.x, c.y)) continue;
        if (c.def.boss) {
          c.slowPct = Math.max(now < c.slowUntil ? c.slowPct : 0, 0.5);
          c.slowUntil = Math.max(c.slowUntil, now + stun);
        } else c.stunUntil = Math.max(c.stunUntil, now + stun);
      }
    } else if (id === 'meteor') {
      // about half the health of an ordinary creep of this wave, before difficulty
      this.falling.push({ at: now + 1, lane, x, y, owner: p.id, dmg: 0.5 * baseHp(Math.max(1, g.wave)) });
    } else {
      for (const t of g.towers.values()) if (t.owner === p.id && t.lane === lane && inReach(t.cx, t.cy)) t.rallyUntil = now + WARCRY.dur;
    }
    g.emit({ e: 'cast', t: now, p: p.id, spell: id, lane, x: +x.toFixed(2), y: +y.toFixed(2), ready: +p.spells[id]!.toFixed(2) });
    return { ok: true };
  }

  /** Meteors on their way down. */
  update(): void {
    if (!this.falling.length) return;
    const now = this.g.time + DT / 2;
    const r2 = SPELL_BY_ID.meteor.radius ** 2;
    this.falling = this.falling.filter((m) => {
      if (m.at > now) return true;
      for (const c of [...this.g.creeps.values()]) {
        if (!c.alive || c.lane !== m.lane || now < c.burrowUntil || (c.x - m.x) ** 2 + (c.y - m.y) ** 2 > r2) continue;
        this.g.combat.trueDamage(c, c.def.boss ? m.dmg * 0.3 : m.dmg, m.owner, -1);
      }
      return false;
    });
  }
}
