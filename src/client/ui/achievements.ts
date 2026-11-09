// The achievements list: every feat by group, earned or not, with progress for the counted ones.
import { loadSave } from '../campaign/save';
import { FEAT_GROUPS, featCount, FEATS } from '../campaign/feats';
import { h } from './dom';
import { icon } from './icons';
import { openModal } from './modal';

const num = (n: number) => n.toLocaleString('en-US');

export function openAchievements(): void {
  const s = loadSave();
  const { got, all } = featCount(s);
  const body = h(
    'div',
    { class: 'feats' },
    h('div', { class: 'feats-head' }, h('h2', null, 'Achievements'), h('span', null, `${got} of ${all} earned`)),
    h('div', { class: 'feats-bar' }, h('div', { style: { width: `${(got / all) * 100}%` } })),
  );
  for (const g of FEAT_GROUPS) {
    const list = FEATS.filter((f) => f.group === g.id);
    body.append(h('h3', { class: 'feats-group' }, g.name, h('span', null, `${list.filter((f) => s.feats[f.id]).length} / ${list.length}`)));
    const grid = h('div', { class: 'feats-grid' });
    for (const f of list) {
      const at = s.feats[f.id];
      const progress = !at && f.count && f.goal ? Math.min(f.count(s), f.goal) : null;
      grid.append(
        h(
          'div',
          { class: `feat${at ? ' got' : ''}` },
          h('span', { class: 'feat-icon' }, icon(f.icon, 18)),
          h(
            'div',
            { class: 'feat-text' },
            h('b', null, f.name),
            h('span', null, f.text),
            at ? h('small', null, `Earned ${new Date(at).toLocaleDateString()}`) : null,
            progress !== null && progress > 0 ? h('div', { class: 'feat-progress' }, h('div', { class: 'fp-bar' }, h('div', { style: { width: `${(progress / f.goal!) * 100}%` } })), h('small', null, `${num(progress)} / ${num(f.goal!)}`)) : null,
          ),
        ),
      );
    }
    body.append(grid);
  }
  const s2 = s.tally;
  body.append(h('div', { class: 'feats-tally muted' }, `${num(s2.games)} game${s2.games === 1 ? '' : 's'} played to the end · ${num(s2.wins)} won · ${num(s2.kills)} creeps slain`));
  const modal = openModal(h('div', null, body, h('div', { class: 'field-row', style: { justifyContent: 'flex-end', marginTop: '14px' } }, h('button', { class: 'btn primary', onclick: () => modal.close() }, 'Close'))), { wide: true });
}
