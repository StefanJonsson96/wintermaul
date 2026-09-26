// Runs a campaign stage as a local game: stage rules plus the player's talents, a goal tracker
// on the HUD, and the stars and runestones on the end screen.
import { STAGES, type Stage } from '../../shared/campaign';
import { modsFromLoadout } from '../../shared/talents';
import type { GameView } from '../game/view';
import type { LocalGame, LocalOptions } from '../local';
import { clear, h } from '../ui/dom';
import { icon } from '../ui/icons';
import { type CampaignSave, isUnlocked, type Outcome, recordResult } from './save';

export interface StageActions {
  /** Starts another stage (next stage, or the same one again). */
  play(stage: Stage): void;
  /** Back to the campaign map. */
  map(): void;
}

/** The goal list on the left of the HUD, updated as the game goes. */
class GoalTracker {
  private el: HTMLElement;
  private key = '';

  constructor(
    view: GameView,
    private local: LocalGame,
    private stage: Stage,
  ) {
    this.el = h('div', { class: 'panel stage-badge' });
    document.getElementById('hud')?.append(this.el);
    view.frameHooks.push(() => this.update());
  }

  private update(): void {
    const g = this.local.game;
    const s = this.stage;
    const lost = g.maxLives - Math.max(0, g.lives);
    const over = g.over;
    const key = `${g.wave}|${lost}|${g.phase}`;
    if (key === this.key || !this.el.isConnected) return;
    this.key = key;
    clear(this.el);
    const index = STAGES.indexOf(s);
    this.el.append(h('div', { class: 'sb-kicker' }, s.endless ? 'Endless' : `Stage ${index + 1}`, h('span', null, s.name)));
    if (s.endless) {
      this.el.append(h('div', { class: 'sb-goal' }, h('span', { class: 'sb-star' }, icon('infinity', 14)), `Wave ${g.wave} · a runestone every 5 waves past 20`));
      return;
    }
    const row = (stars: number, text: string, state: 'done' | 'failed' | '') => h('div', { class: `sb-goal ${state}` }, h('span', { class: 'sb-star' }, '★'.repeat(stars)), h('span', null, text), state === 'done' ? icon('check', 13) : null);
    const won = g.phase === 'victory';
    this.el.append(
      row(1, `Reach wave ${s.reach}`, g.wave >= s.reach || won ? 'done' : over ? 'failed' : ''),
      row(2, `Win (wave ${s.rules.finalWave ?? 40})`, won ? 'done' : over ? 'failed' : ''),
      row(3, `Lose at most ${s.flawless} ${s.flawless === 1 ? 'life' : 'lives'} (${lost} so far)`, lost > s.flawless ? 'failed' : won ? 'done' : ''),
    );
  }
}

/** The runestone summary on the end screen. */
function rewardPanel(stage: Stage, o: Outcome): HTMLElement {
  const stars = h('div', { class: 'rw-stars' });
  if (!stage.endless) {
    for (let i = 0; i < 3; i++) {
      const fresh = i >= o.stars - o.newStars && i < o.stars;
      stars.append(h('span', { class: `rw-star${i < o.stars ? ' on' : ''}${fresh ? ' fresh' : ''}`, style: { animationDelay: `${0.25 + i * 0.25}s` } }, '★'));
    }
  }
  const lines: (HTMLElement | string)[] = [];
  if (o.stones > 0) lines.push(h('div', { class: 'rw-stones' }, icon('rune', 20), h('b', null, `+${o.stones}`), ` runestone${o.stones > 1 ? 's' : ''}`));
  else if (stage.endless) lines.push(h('div', { class: 'muted' }, o.record ? 'A new record! Runestones come at wave 25, 30, 35…' : 'No new record this time.'));
  else if (o.stars === 0) lines.push(h('div', { class: 'muted' }, `Reach wave ${stage.reach} for your first star.`));
  else if (o.newStars === 0) lines.push(h('div', { class: 'muted' }, o.stars >= 3 ? 'Every star already earned here.' : 'No new stars this time.'));
  for (const u of o.unlocked) lines.push(h('div', { class: 'rw-unlock' }, icon('map', 15), `${u.name} is now open!`));
  return h('div', { class: 'reward-panel' }, stars, ...lines);
}

export function stageOptions(stage: Stage, save: CampaignSave, actions: StageActions): Omit<LocalOptions, 'name'> {
  let outcome: Outcome | null = null;
  return {
    mode: 'campaign',
    settings: { difficulty: stage.difficulty, raceMode: 'pick', endless: !!stage.endless },
    skipSetup: true,
    rules: { ...stage.rules, mods: { 0: modsFromLoadout(save.talents) } },
    attach: (view, local) => {
      new GoalTracker(view, local, stage);
      local.system(`${stage.name}: ${stage.story}`);
    },
    onGameOver: (victory, stats, game) => {
      outcome = recordResult(save, stage, { victory, wave: stats.wave, livesLost: game.maxLives - Math.max(0, game.lives) });
    },
    endNote: () => (outcome ? rewardPanel(stage, outcome) : undefined),
    endActions: (victory) => {
      const next = STAGES[STAGES.indexOf(stage) + 1];
      const out: { label: string; kind?: 'primary' | 'danger'; run: () => void }[] = [];
      if (victory && next && isUnlocked(next, save)) out.push({ label: `Next: ${next.name}`, kind: 'primary', run: () => actions.play(next) });
      out.push({ label: victory ? 'Play again' : 'Try again', kind: out.length ? undefined : 'primary', run: () => actions.play(stage) });
      out.push({ label: 'Campaign map', run: actions.map });
      return out;
    },
  };
}
