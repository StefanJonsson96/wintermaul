// The talent tree: spend runestones on permanent bonuses. Click to learn a rank, right-click to
// unlearn one; resetting is free, so experimenting costs nothing.
import { BRANCHES, type Branch, rankUpBlocker, sanitizeLoadout, spentIn, TALENTS, type Talent, totalSpent } from '../../shared/talents';
import { raceEmblem } from '../art/emblems';
import { clear, h, tooltip } from '../ui/dom';
import { icon } from '../ui/icons';
import { openModal } from '../ui/modal';
import { type CampaignSave, storeSave, unspent } from './save';

/** Opens the talent tree for this save; `onChange` runs after every change. */
export function openTalents(save: CampaignSave, onChange: () => void = () => {}): void {
  const body = h('div', { class: 'tree' });
  const stones = h('span', { class: 'tree-stones' });
  const render = () => {
    const free = unspent(save);
    clear(stones);
    stones.append(icon('rune', 18), h('b', null, String(free)), ` of ${save.stones} runestone${save.stones === 1 ? '' : 's'} to spend`);
    clear(body);
    const core = h('div', { class: 'tree-core' });
    for (const b of BRANCHES.filter((b) => b.id !== 'kinship')) core.append(branchPanel(b));
    body.append(core, branchPanel(BRANCHES.find((b) => b.id === 'kinship')!));
  };
  const change = () => {
    storeSave(save);
    render();
    onChange();
  };

  const node = (t: Talent) => {
    const rank = save.talents[t.id] ?? 0;
    const blocker = rankUpBlocker(t, save.talents, unspent(save));
    const gated = spentIn(t.branch, save.talents) < t.gate;
    const state = rank >= t.max ? 'max' : gated ? 'locked' : !blocker ? 'open' : rank > 0 ? 'some' : 'closed';
    const face = t.race ? (raceEmblem(t.race, 64) as HTMLCanvasElement) : icon(t.glyph, 24);
    if (t.race) face.classList.add('tn-emblem');
    const btn = h(
      'button',
      {
        class: `tnode ${state}${rank > 0 ? ' has' : ''}${t.cost > 1 ? ' capstone' : ''}`,
        style: t.race ? {} : { gridRow: String(t.row + 1), gridColumn: String(t.col + 1) },
        onclick: () => {
          if (rankUpBlocker(t, save.talents, unspent(save))) return;
          save.talents = { ...save.talents, [t.id]: rank + 1 };
          change();
        },
        oncontextmenu: (e: Event) => {
          e.preventDefault();
          if (rank <= 0) return;
          const next = { ...save.talents, [t.id]: rank - 1 };
          if (next[t.id] === 0) delete next[t.id];
          // unlearning must not strand ranks that needed this one to open
          if (totalSpent(sanitizeLoadout(next)) !== totalSpent(next)) return;
          save.talents = next;
          change();
        },
      },
      h('span', { class: 'tn-face' }, face),
      h('span', { class: 'tn-rank' }, `${rank}/${t.max}`),
      h('span', { class: 'tn-name' }, t.name),
    );
    tooltip(btn, () =>
      h(
        'div',
        null,
        h('div', { class: 'tt-title' }, t.name),
        h('div', { class: 'tt-meta' }, `Rank ${rank}/${t.max} · ${t.cost} runestone${t.cost > 1 ? 's' : ''} per rank`),
        rank > 0 ? h('div', null, h('b', null, 'Now: '), t.text(rank)) : null,
        rank < t.max ? h('div', { style: { color: '#b9c9e0' } }, h('b', null, rank > 0 ? 'Next: ' : ''), t.text(rank + 1)) : null,
        blocker && rank < t.max ? h('div', { style: { color: '#ffb44f', marginTop: '4px' } }, blocker) : null,
        rank > 0 ? h('div', { class: 'muted', style: { marginTop: '4px', fontSize: '12px' } }, 'Right-click to unlearn a rank.') : null,
      ),
    );
    return btn;
  };

  const branchPanel = (b: Branch) => {
    const list = TALENTS.filter((t) => t.branch === b.id);
    const grid = h('div', { class: `tree-grid${b.id === 'kinship' ? ' kin' : ''}` }, ...list.map(node));
    const gates = [...new Set(list.map((t) => t.gate))].filter((g) => g > 0);
    const spent = spentIn(b.id, save.talents);
    const panel = h(
      'section',
      { class: `tree-branch br-${b.id}` },
      h('div', { class: 'tb-head' }, h('b', null, b.name), h('span', null, `${spent} spent`)),
      h('div', { class: 'tb-blurb' }, b.blurb),
      grid,
      gates.length ? h('div', { class: 'tb-gates' }, 'Rows open at ', ...gates.map((g) => h('span', { class: spent >= g ? 'ok' : '' }, spent >= g ? icon('check', 12) : icon('lock', 12), `${g}`))) : null,
    );
    panel.style.setProperty('--br', b.color);
    return panel;
  };

  render();
  openModal(
    h(
      'div',
      { class: 'tree-wrap' },
      h(
        'div',
        { class: 'tree-top' },
        h('div', null, h('h2', null, 'Talents'), h('div', { class: 'sub' }, 'Earn runestones with campaign stars, spend them here. They apply to every campaign stage (and to multiplayer games, when the host allows it).')),
        h(
          'div',
          { class: 'tree-actions' },
          stones,
          h(
            'button',
            {
              class: 'btn small ghost',
              onclick: () => {
                if (totalSpent(save.talents) === 0) return;
                save.talents = {};
                change();
              },
            },
            icon('reset', 14),
            'Reset (free)',
          ),
        ),
      ),
      body,
    ),
    { wide: true },
  );
}
