// The daily challenge as a local game (today's rules and seed, medals instead of stars), and its
// briefing.
import type { Stage } from '../../shared/campaign';
import { type Daily, dailyFor, dayKey, type Medal, MEDAL_NAMES } from '../../shared/daily';
import { DIFFICULTIES } from '../../shared/protocol';
import { WAVE_SETS } from '../../shared/data/waves';
import { GoalTracker } from '../campaign/play';
import { type CampaignSave, dailyStreak, loadSave, recordDaily } from '../campaign/save';
import { enemyRoster, stageFacts } from '../campaign/screen';
import type { LocalOptions } from '../local';
import { canResume, type SavedGame } from '../saved';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { openModal } from '../ui/modal';

/** A daily as a stage, so the briefing, roster and goal tracker can show it. */
export function dailyStage(d: Daily): Stage {
  return { id: `daily:${d.date}`, name: d.name, x: 0, y: 0, story: '', difficulty: d.difficulty, rules: d.rules, mutators: d.mutators, reach: d.reach, flawless: d.flawless, rewards: [0, 0, 0], waves: d.waves };
}

const MEDAL_COLORS = ['#56627a', '#d08a4e', '#d8e2ee', '#ffd35a'];

export function medal(m: Medal, size = 18): HTMLElement {
  return h('span', { class: `medal m${m}`, title: MEDAL_NAMES[m], style: { width: `${size}px`, height: `${size}px`, background: MEDAL_COLORS[m] } });
}

export interface DailyActions {
  play(date: string): void;
  menu(): void;
  saved(): SavedGame | null;
  resume(): void;
}

export function dailyOptions(date: string, actions: DailyActions): Omit<LocalOptions, 'name'> {
  const d = dailyFor(date);
  const stage = dailyStage(d);
  let result: { medal: Medal; improved: boolean } | null = null;
  return {
    mode: 'solo',
    settings: { difficulty: d.difficulty, raceMode: 'pick', endless: false, waves: d.waves },
    skipSetup: true,
    rules: d.rules,
    seed: d.seed,
    save: { kind: { mode: 'daily', date }, title: `Daily: ${d.name}` },
    attach: (view, local) => {
      new GoalTracker(view, local, stage, `Daily · ${date}`, [1, 2, 3].map((m) => () => medal(m as Medal, 12)));
      local.system(`Daily challenge, ${date}: ${d.name}. ${d.mutators.map((m) => `${m.name}: ${m.text}`).join(' ')}`);
    },
    onGameOver: (victory, stats, game) => {
      result = recordDaily(loadSave(), d, { victory, wave: stats.wave, livesLost: game.maxLives - Math.max(0, game.lives) });
    },
    endNote: () => {
      if (!result) return undefined;
      const best = loadSave().daily[date];
      return h(
        'div',
        { class: 'reward-panel' },
        h('div', { class: 'rw-medal' }, medal(result.medal, 40), h('b', null, MEDAL_NAMES[result.medal])),
        h('div', { class: 'muted' }, result.improved ? "Your best for today's challenge." : `Today's best: ${MEDAL_NAMES[best?.medal ?? 0]}, wave ${best?.wave ?? 0}.`),
      );
    },
    endActions: () => [
      { label: 'Try again', kind: 'primary', run: () => actions.play(date) },
      { label: 'Main menu', run: actions.menu },
    ],
  };
}

/** One line for the menu tile. */
export function dailyLine(save: CampaignSave): string {
  const today = dayKey();
  const d = dailyFor(today);
  const r = save.daily[today];
  const streak = dailyStreak(save);
  return `${d.name}${r ? ` · ${MEDAL_NAMES[r.medal]}` : ' · new today'}${streak > 1 ? ` · ${streak}-day streak` : ''}`;
}

/** The briefing for today's challenge. */
export function openDaily(actions: DailyActions): void {
  const save = loadSave();
  const date = dayKey();
  const d = dailyFor(date);
  const stage = dailyStage(d);
  const best = save.daily[date];
  const streak = dailyStreak(save);
  const saved = actions.saved();
  const resumable = saved && canResume(saved) && saved.kind.mode === 'daily' && saved.kind.date === date;
  // the last week, oldest first
  const week = h('div', { class: 'daily-week' });
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const key = dayKey(day);
    const r = save.daily[key];
    week.append(h('div', { class: `dw-day${i === 0 ? ' today' : ''}` }, medal(r?.medal ?? 0, 14), h('span', null, i === 0 ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'short' }))));
  }
  const goal = (m: Medal, text: string) => h('div', { class: `cb-goal${best && best.medal >= m ? ' done' : ''}` }, medal(m, 16), h('span', { class: 'cb-goal-text' }, text), best && best.medal >= m ? icon('check', 14) : null);
  const roster = enemyRoster(stage);
  const body = h('div', { class: 'daily' });
  body.append(
    h('div', { class: 'cb-kicker' }, `Daily challenge · ${date}`, h('span', null, `${DIFFICULTIES[d.difficulty].label} · ${WAVE_SETS[d.waves].name}`)),
    h('h2', { class: 'cb-name' }, d.name),
    h('p', { class: 'cb-story' }, 'One game a day, the same for everyone: today\'s seed, waves and twists. Medals and your streak are kept; it pays no runestones.'),
    h('div', { class: 'cb-facts' }, ...stageFacts(stage).map((f) => h('div', null, h('span', null, f.label), h('b', null, f.value)))),
    h('div', { class: 'cb-mutators' }, ...d.mutators.map((m) => h('div', { class: 'cb-mut' }, h('b', null, m.name), h('span', null, m.text)))),
    ...(roster ? [roster] : []),
    h('div', { class: 'cb-goals' }, goal(1, `Bronze: reach wave ${d.reach}`), goal(2, `Silver: win (wave ${d.rules.finalWave})`), goal(3, `Gold: win losing at most ${d.flawless} lives`)),
    week,
    h('div', { class: 'muted daily-streak' }, streak > 0 ? `Streak: ${streak} day${streak > 1 ? 's' : ''} in a row.` : 'Play today to start a streak.', best ? ` Played ${best.plays} time${best.plays > 1 ? 's' : ''} today, best wave ${best.wave}.` : ''),
  );
  const modal = openModal(
    h(
      'div',
      null,
      body,
      h(
        'div',
        { class: 'field-row', style: { justifyContent: 'flex-end', marginTop: '14px' } },
        h('button', { class: 'btn', onclick: () => modal.close() }, 'Close'),
        resumable ? h('button', { class: 'btn', onclick: () => (modal.close(), actions.play(date)) }, 'Restart') : null,
        h('button', { class: 'btn primary', onclick: () => (modal.close(), resumable ? actions.resume() : actions.play(date)) }, icon('play', 16), resumable ? `Continue · wave ${saved!.wave}` : best ? 'Play again' : 'Begin'),
      ),
    ),
    { narrow: true },
  );
}
