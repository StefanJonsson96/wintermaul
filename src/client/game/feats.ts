// Watches a game for achievements, and announces new ones.
import { CREEP_FLAG, type GameEvent } from '../../shared/protocol';
import { SPELL_BY_ID, type SpellId } from '../../shared/sim/spells';
import { audio } from '../audio';
import { earn, type Feat, FEAT_BY_ID } from '../campaign/feats';
import { loadSave, storeSave } from '../campaign/save';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import type { GameView } from './view';

/** A banner for a new achievement, under the toasts. */
export function announce(f: Feat): void {
  const root = document.getElementById('toasts');
  if (!root) return;
  const el = h('div', { class: 'toast feat-toast' }, h('span', { class: 'ft-icon' }, icon(f.icon, 20)), h('div', null, h('small', null, 'Achievement'), h('b', null, f.name), h('span', null, f.text)));
  root.appendChild(el);
  audio.play('feat', 0.7);
  setTimeout(() => el.classList.add('out'), 4800);
  setTimeout(() => el.remove(), 5300);
}

export interface FeatContext {
  /** What kind of game this is; the tutorial earns nothing. */
  mode: 'online' | 'skirmish' | 'campaign' | 'daily' | 'tutorial';
  /** The first wave played (later in some campaign stages and dailies). */
  firstWave: number;
  /** False once the game was tampered with (developer commands). */
  fair: () => boolean;
}

interface Meteor {
  lands: number;
  lane: number;
  x: number;
  y: number;
  kills: number;
}

/** Watches one game for achievements. */
export class FeatTracker {
  private have: Set<string>;
  /** Earned in this game, for the end screen. */
  readonly fresh: Feat[] = [];
  private casts: Partial<Record<SpellId, number>> = {};
  private meteors: Meteor[] = [];
  private nextLook = 0;
  private over = false;

  constructor(
    private view: GameView,
    private ctx: FeatContext,
  ) {
    this.have = new Set(Object.keys(loadSave().feats));
    if (ctx.mode === 'tutorial') return;
    view.state.onReceive = (ev) => this.onEvent(ev);
    view.frameHooks.push((now) => this.look(now));
    view.endNotes.push(() => this.endNote());
  }

  private get you(): number {
    return this.view.state.you;
  }

  private earn(...ids: string[]): void {
    const ids2 = ids.filter((id) => !this.have.has(id));
    if (!ids2.length || !this.ctx.fair()) return;
    for (const id of ids2) this.have.add(id);
    this.fresh.push(...earn(ids2));
  }

  private onEvent(ev: GameEvent): void {
    const st = this.view.state;
    switch (ev.e) {
      case 'die': {
        if (ev.by !== this.you) return;
        const c = st.creeps.get(ev.id);
        if (c?.def.boss) this.earn('boss');
        for (const m of this.meteors) {
          if (Math.abs(ev.t - m.lands) > 0.08 || !c || c.lane !== m.lane) continue;
          const at = c.samples[c.samples.length - 1] ?? c;
          if ((at.x - m.x) ** 2 + (at.y - m.y) ** 2 > (SPELL_BY_ID.meteor.radius + 1) ** 2) continue;
          if (++m.kills >= 6) this.earn('meteor');
        }
        return;
      }
      case 'cast': {
        if (ev.p !== this.you) return;
        this.casts[ev.spell] = ev.t;
        if ((['nova', 'meteor', 'warcry'] as SpellId[]).every((id) => this.casts[id] !== undefined && ev.t - this.casts[id]! <= 10)) this.earn('all_spells');
        const r2 = SPELL_BY_ID[ev.spell].radius ** 2;
        if (ev.spell === 'nova') {
          let n = 0;
          for (const c of st.creeps.values()) {
            if (c.lane !== ev.lane || c.deadAt <= ev.t || c.def.immune || c.def.boss || c.flags & CREEP_FLAG.burrowed) continue;
            const at = c.samples[c.samples.length - 1] ?? c;
            if ((at.x - ev.x) ** 2 + (at.y - ev.y) ** 2 <= r2) n++;
          }
          if (n >= 12) this.earn('nova');
        } else if (ev.spell === 'warcry') {
          let n = 0;
          for (const t of st.towers.values()) if (t.owner === this.you && t.lane === ev.lane && (t.x + 1 - ev.x) ** 2 + (t.y + 1 - ev.y) ** 2 <= r2) n++;
          if (n >= 12) this.earn('warcry');
        } else {
          this.meteors = this.meteors.filter((m) => m.lands > ev.t - 2);
          this.meteors.push({ lands: ev.t + 1, lane: ev.lane, x: ev.x, y: ev.y, kills: 0 });
        }
        return;
      }
      case 'level': {
        const t = st.towers.get(ev.tw);
        if (t && t.owner === this.you && t.tdef.growth && ev.level >= t.tdef.growth.maxLevel) this.earn('veteran');
        return;
      }
      case 'build':
        if (ev.tower.owner === this.you && ev.tower.def.endsWith('_L')) this.earn('legend');
        return;
      case 'wave':
        if (ev.phase === 'wave' && st.settings.endless) {
          if (ev.n >= 50) this.earn('endless_50');
          if (ev.n >= 60) this.earn('endless_60');
        }
        return;
    }
  }

  /** Twice a second (`now` is in seconds): what you hold and have built. */
  private look(now: number): void {
    if (now < this.nextLook || this.over) return;
    this.nextLook = now + 0.5;
    const st = this.view.state;
    const me = st.me;
    if (!me) return;
    if (me.gold >= 5000) this.earn('hoard');
    if (me.kills >= 1000) this.earn('kills_1000');
    if (me.races.length >= 3) this.earn('three_races');
    let towers = 0;
    for (const t of st.towers.values()) if (t.owner === this.you) towers++;
    if (towers >= 100) this.earn('towers_100');
    if (towers >= 8) {
      const walk = st.path(st.myLane).length;
      if (walk >= 200) this.earn('maze_200');
      if (walk >= 300) this.earn('maze_300');
    }
  }

  /** The game has ended: the results, and the career totals. */
  gameOver(victory: boolean): void {
    if (this.over || this.ctx.mode === 'tutorial' || !this.ctx.fair()) return;
    this.over = true;
    const st = this.view.state;
    const w = st.wave;
    const ids: string[] = [];
    if (victory) {
      ids.push('first_win');
      if (w.lives >= w.maxLives) ids.push('flawless');
      if (w.lives === 1) ids.push('last_life');
      const full = this.ctx.firstWave <= 1 && w.finalWave >= 40;
      if (full && (st.settings.difficulty === 'hard' || st.settings.difficulty === 'brutal')) ids.push('full_hard');
      if (full && st.settings.difficulty === 'brutal') ids.push('full_brutal');
      if (full && st.settings.waves === 'thaw') ids.push('full_thaw');
      if (this.ctx.mode === 'online' && st.players.some((p) => p.id !== this.you && !p.isBot)) ids.push('coop_win');
    }
    // the totals first: the save hook awards the career feats from them
    const s = loadSave();
    s.tally.games++;
    if (victory) s.tally.wins++;
    s.tally.kills += st.me?.kills ?? 0;
    storeSave(s);
    this.earn(...ids);
    // and whatever else the save has earned since the game began (stars, medals, career totals)
    for (const id of Object.keys(loadSave().feats)) {
      if (this.have.has(id) || !FEAT_BY_ID[id]) continue;
      this.have.add(id);
      this.fresh.push(FEAT_BY_ID[id]);
    }
  }

  private endNote(): HTMLElement | null {
    if (!this.fresh.length) return null;
    return h(
      'div',
      { class: 'feat-earned' },
      h('div', { class: 'fe-title' }, this.fresh.length > 1 ? `${this.fresh.length} achievements earned` : 'Achievement earned'),
      ...this.fresh.map((f) => h('div', { class: 'fe-row' }, h('span', { class: 'ft-icon' }, icon(f.icon, 16)), h('b', null, f.name), h('span', null, f.text))),
    );
  }
}
