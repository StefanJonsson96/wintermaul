// The in-game dialogs: race picker, rule setup, gifts, settings and the end screen.
import { PLAYER_COLORS } from '../../shared/constants';
import { RACE_BY_ID, RACES, TOWERS, towersOfRace } from '../../shared/data/races';
import { DIFFICULTIES, type Difficulty, type EndStats, type GameSettings, RACE_MODES, startingLives } from '../../shared/protocol';
import { raceEmblem } from '../art/emblems';
import { towerIcon } from '../art/towers';
import { audio } from '../audio';
import type { EndAction } from '../local';
import { clear, fmt, h, toast, tooltip } from '../ui/dom';
import { type ModalHandle, openModal } from '../ui/modal';
import { towerTooltip } from './describe';
import type { GameView } from './view';

/** Race picker, when the player has lumber to spend. */
export function openRacePicker(view: GameView, onClose: () => void): ModalHandle | null {
  const s = view.state;
  const me = s.me;
  if (!me) return null;
  if (me.lumber < 1) {
    toast('You need lumber to pick a race.', 'error');
    return null;
  }
  const randomMode = s.settings.raceMode === 'random';
  const grid = h('div', { class: 'race-grid' });
  const pick = (race: string) => {
    view.pickRace(race);
    modal.close();
  };
  if (!randomMode) {
    for (const r of RACES) {
      if (s.races && !s.races.includes(r.id)) continue;
      const owned = me.races.includes(r.id);
      const em = h('canvas', { class: 'emblem', width: 64, height: 64 }) as HTMLCanvasElement;
      em.getContext('2d')!.drawImage(raceEmblem(r.id, 64), 0, 0);
      const towers = h('div', { class: 'rc-towers' });
      for (const t of towersOfRace(r.id).filter((t) => t.tier !== 5)) {
        const c = h('canvas', { width: 30, height: 30 }) as HTMLCanvasElement;
        c.getContext('2d')!.drawImage(towerIcon(t, 64), 0, 0, 30, 30);
        tooltip(c, () => towerTooltip(t));
        towers.append(c);
      }
      const card = h(
        'div',
        { class: `race-card${owned ? ' owned' : ''}`, onclick: () => pick(r.id) },
        h('div', { class: 'rc-head' }, em, h('div', null, h('div', { class: 'rc-name', style: { color: r.color } }, r.name), h('div', { class: 'rc-el' }, r.element, ' · ', h('span', { class: 'stars' }, '★'.repeat(r.difficulty) + '☆'.repeat(3 - r.difficulty))))),
        h('div', { class: 'rc-blurb' }, r.blurb),
        h('div', { class: 'rc-tags' }, ...r.tags.map((t) => h('span', { class: 'trait' }, t))),
        towers,
      );
      card.style.setProperty('--rc', r.color);
      grid.append(card);
    }
  }
  grid.prepend(
    h(
      'div',
      { class: 'race-card random-card', onclick: () => pick('random') },
      h('div', null, h('div', { class: 'q' }, '?'), h('div', { class: 'rc-name', style: { marginTop: '8px' } }, 'Random'), h('div', { class: 'rc-blurb', style: { minHeight: '0', marginTop: '4px' } }, randomMode ? 'All Random mode: roll your race.' : 'Feeling lucky? +15 gold (the old -random).')),
    ),
  );
  const legends = me.races.map((r) => TOWERS[`${r}_L`]).filter((d) => d && !me.legends.includes(d.id));
  const legendNote = legends.length
    ? h('div', { class: 'muted', style: { marginTop: '14px' } }, 'Or keep the lumber for a Legend: ', ...legends.map((d, i) => h('span', null, i ? ', ' : '', h('b', { style: { color: RACE_BY_ID[d.race].color } }, d.name))), ' (build it from the command card, 800 gold + 1 lumber).')
    : null;
  const modal = openModal(
    h(
      'div',
      null,
      h('h2', null, me.races.length === 0 ? 'Choose your race' : 'Choose another race'),
      h('div', { class: 'sub' }, `You have ${me.lumber} lumber. Each race costs 1. Stars show how tricky a race is to play well. Hover the little towers for details.${s.races ? ' This stage allows only the races shown.' : ''}`),
      grid,
      legendNote,
    ),
    { wide: true, onClose },
  );
  return modal;
}

/** The pre-game rules dialog. Everyone sees it; only the rule chooser can change anything. */
export function openSetupDialog(view: GameView, onClose: () => void): { modal: ModalHandle; refresh: () => void } {
  const s = view.state;
  const isChooser = s.you === s.wave.chooser;
  const body = h('div');
  const countdown = h('span', { class: 'countdown-ring' });
  const refresh = () => {
    clear(body);
    const st = view.state.settings;
    const set = (patch: Partial<GameSettings>) => {
      if (!isChooser) return;
      audio.play('click');
      view.setup(patch);
    };
    const choice = (on: boolean, title: string, text: string, patch: Partial<GameSettings>) =>
      h('div', { class: `choice${on ? ' on' : ''}${isChooser ? '' : ' locked'}`, onclick: () => set(patch) }, h('div', { class: 't' }, title), h('div', { class: 'd' }, text));
    const diffRow = h('div', { class: 'setup-grid' });
    for (const [id, d] of Object.entries(DIFFICULTIES)) {
      const lives = startingLives(id as Difficulty, view.state.players.length);
      diffRow.append(choice(st.difficulty === id, d.label, `${lives} ${lives === 1 ? 'life' : 'lives'} · ${d.blurb}`, { difficulty: id as Difficulty }));
    }
    const modeRow = h('div', { class: 'setup-grid', style: { gridTemplateColumns: 'repeat(4, 1fr)' } });
    for (const [id, m] of Object.entries(RACE_MODES)) modeRow.append(choice(st.raceMode === id, m.label, m.blurb, { raceMode: id as GameSettings['raceMode'] }));
    const endRow = h('div', { class: 'setup-grid', style: { gridTemplateColumns: 'repeat(2, 1fr)' } });
    endRow.append(choice(!st.endless, 'Classic', '40 waves, ending with the Winter Tyrant', { endless: false }), choice(st.endless, 'Endless', 'Keep going after wave 40 — how far can you get?', { endless: true }));
    body.append(
      h('div', { class: 'setup-section' }, h('div', { class: 'label' }, 'Difficulty'), diffRow),
      h('div', { class: 'setup-section' }, h('div', { class: 'label' }, 'Race mode'), modeRow),
      h('div', { class: 'setup-section' }, h('div', { class: 'label' }, 'Length'), endRow),
    );
  };
  refresh();
  const chooser = s.player(s.wave.chooser);
  const foot = h(
    'div',
    { class: 'setup-foot' },
    h('div', { class: 'muted' }, isChooser ? 'You pick the rules, like Red in the original. Everyone else is watching…' : `${chooser?.name ?? 'Red'} is choosing the rules.`, ' ', countdown),
    isChooser ? h('button', { class: 'btn primary big', onclick: () => view.setupDone() }, 'Lock in & start') : h('span', { class: 'muted' }, 'Get ready to pick a race!'),
  );
  let open = true;
  const modal = openModal(h('div', null, h('h2', null, 'The rules of the north'), h('div', { class: 'sub' }, "Before the first wave, the rules are set. If the timer runs out, it's Normal · All Pick."), body, foot), {
    dismissable: false,
    soft: true,
    onClose: () => {
      open = false;
      onClose();
    },
  });
  const tick = () => {
    if (!open) return;
    countdown.textContent = `${Math.ceil(view.state.wave.countdown)}s`;
    requestAnimationFrame(tick);
  };
  tick();
  return { modal, refresh };
}

export function openGiftDialog(view: GameView, to: number): void {
  const s = view.state;
  const target = s.player(to);
  const me = s.me;
  if (!target || !me) return;
  const input = h('input', { type: 'number', min: 1, value: String(Math.max(1, Math.floor(me.gold / 4))), style: { width: '120px' } }) as HTMLInputElement;
  const send = (amount: number) => {
    view.gift(to, amount);
    modal.close();
  };
  const modal = openModal(
    h(
      'div',
      null,
      h('h2', null, `Send gold to ${target.name}`),
      h('div', { class: 'sub' }, `Helping a struggling neighbour is classic Wintermaul etiquette. You have ${Math.floor(me.gold)} gold.`),
      h(
        'div',
        { class: 'field-row', style: { alignItems: 'center' } },
        input,
        ...[25, 50, 100].map((v) => h('button', { class: 'btn small', onclick: () => (input.value = String(v)) }, String(v))),
        h('div', { style: { flex: '1' } }),
        h('button', { class: 'btn gold', onclick: () => send(Number(input.value)) }, 'Send'),
      ),
    ),
    { narrow: true },
  );
  setTimeout(() => input.focus(), 30);
}

export function openSettingsDialog(view: GameView): void {
  const row = (label: string, ctrl: HTMLElement) => h('div', { class: 'setting' }, h('span', null, label), ctrl);
  const toggle = (on: boolean, fn: (v: boolean) => void) => {
    const el = h('div', { class: `switch${on ? ' on' : ''}` });
    el.addEventListener('click', () => {
      const nv = !el.classList.contains('on');
      el.classList.toggle('on', nv);
      fn(nv);
    });
    return el;
  };
  const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: String(audio.volume) }) as HTMLInputElement;
  vol.addEventListener('input', () => audio.setVolume(Number(vol.value)));
  const p = view.prefs;
  openModal(
    h(
      'div',
      null,
      h('h2', null, 'Settings'),
      h(
        'div',
        { class: 'settings-list', style: { marginTop: '14px' } },
        row('Volume', vol),
        row('Sound on', toggle(!audio.muted, (on) => audio.setMuted(!on))),
        row('Show creep path', toggle(p.showPath, (on) => view.setPref('showPath', on))),
        row('Show build grid', toggle(p.showGrid, (on) => view.setPref('showGrid', on))),
        row('Scroll at screen edges', toggle(p.edgePan, (on) => view.setPref('edgePan', on))),
        row('High quality effects', toggle(p.hq, (on) => view.setPref('hq', on))),
        row('Tips in chat', toggle(p.tips, (on) => view.setPref('tips', on))),
      ),
    ),
    { narrow: true },
  );
}

/** Scoreboard after the game, with the buttons of the mode (campaign rewards go in `extra`). */
export function openEndDialog(view: GameView, victory: boolean, stats: EndStats, isHost: boolean, actions?: EndAction[], extra?: HTMLElement): ModalHandle {
  const rows = stats.players.map((p) =>
    h(
      'tr',
      null,
      h('td', null, h('span', { class: 'end-swatch', style: { background: PLAYER_COLORS[p.color].hex } }), p.name),
      h('td', null, p.races.map((r) => RACE_BY_ID[r]?.name).join(' + ') || '—'),
      h('td', null, String(p.kills)),
      h('td', { style: { color: '#ff9aa4' } }, String(p.leaks)),
      h('td', null, fmt(p.damage)),
      h('td', { class: 'gold-text' }, fmt(p.goldEarned)),
      h('td', null, p.mvpTower ?? '—'),
    ),
  );
  const mins = Math.floor(stats.duration / 60);
  const buttons = actions
    ? actions.map((a) => h('button', { class: `btn ${a.kind ?? ''}`, onclick: () => (modal.close(), a.run()) }, a.label))
    : [
        isHost ? h('button', { class: 'btn primary', onclick: () => view.playAgain() }, 'Back to lobby') : h('span', { class: 'muted', style: { alignSelf: 'center' } }, 'The host can take everyone back to the lobby.'),
        h('button', { class: 'btn danger', onclick: () => view.leave() }, 'Main menu'),
      ];
  const modal = openModal(
    h(
      'div',
      null,
      h('h2', { style: { color: victory ? '#9cf09f' : '#ff9aa4', fontSize: '34px' } }, victory ? 'Victory!' : 'The north has fallen'),
      h('div', { class: 'sub' }, victory ? `You held the line through wave ${stats.wave} with ${stats.lives} ${stats.lives === 1 ? 'life' : 'lives'} to spare. (${mins} min)` : `You reached wave ${stats.wave}. (${mins} min) Try another race combination!`),
      extra ?? null,
      h('table', { class: 'end-table' }, h('thead', null, h('tr', null, ...['Player', 'Races', 'Kills', 'Leaks', 'Damage', 'Gold', 'MVP tower'].map((t) => h('th', null, t)))), h('tbody', null, rows)),
      h('div', { class: 'field-row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn', onclick: () => modal.close() }, 'Look around'), ...buttons),
    ),
    { dismissable: true },
  );
  return modal;
}
