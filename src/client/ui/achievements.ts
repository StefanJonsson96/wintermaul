// Relics and achievements: the relics you carry (and the ones still to win), and every
// achievement by group, earned or not, with what it unlocks and progress for the counted ones.
import { RELIC_BY_ID, RELICS, type Relic, relicSlots, SECOND_SLOT_AT } from '../../shared/relics';
import { FEAT_BY_ID, FEAT_GROUPS, featCount, FEATS } from '../campaign/feats';
import { type CampaignSave, loadSave, storeSave } from '../campaign/save';
import { clear, h, toast } from './dom';
import { icon } from './icons';
import { openModal } from './modal';

const num = (n: number) => n.toLocaleString('en-US');

/** Relics a save has unlocked (their achievement is earned). */
export function unlockedRelics(s: CampaignSave): Relic[] {
  return RELICS.filter((r) => s.feats[r.feat]);
}

/** "Hearthstone Shard, Ward Stone", or "none", for buttons and briefings. */
export function relicLine(s: CampaignSave): string {
  return s.relics.length ? s.relics.map((id) => RELIC_BY_ID[id]?.name).join(', ') : 'none';
}

export function openAchievements(opts: { tab?: 'relics' | 'feats'; onChange?: () => void } = {}): void {
  let tab = opts.tab ?? 'relics';
  const root = h('div', { class: 'feats' });
  const render = () => {
    const s = loadSave();
    const { got, all } = featCount(s);
    clear(root);
    const tabs = h(
      'div',
      { class: 'feats-tabs' },
      h('button', { class: `camp-tab${tab === 'relics' ? ' on' : ''}`, onclick: () => ((tab = 'relics'), render()) }, 'Relics'),
      h('button', { class: `camp-tab${tab === 'feats' ? ' on' : ''}`, onclick: () => ((tab = 'feats'), render()) }, 'Achievements'),
    );
    root.append(
      h('div', { class: 'feats-head' }, h('h2', null, tab === 'relics' ? 'Relics' : 'Achievements'), tabs, h('span', null, `${got} of ${all} earned`)),
      h('div', { class: 'feats-bar' }, h('div', { style: { width: `${(got / all) * 100}%` } })),
    );
    if (tab === 'relics') relics(root, s, render, opts.onChange);
    else feats(root, s);
  };
  render();
  const modal = openModal(h('div', null, root, h('div', { class: 'field-row', style: { justifyContent: 'flex-end', marginTop: '14px' } }, h('button', { class: 'btn primary', onclick: () => modal.close() }, 'Close'))), { wide: true });
}

function effectLines(r: Relic): HTMLElement {
  return h('div', { class: 'relic-fx' }, ...r.effects.map((e) => h('span', { class: e.bad ? 'bad' : '' }, e.text)));
}

function relics(root: HTMLElement, s: CampaignSave, render: () => void, onChange?: () => void): void {
  const slots = relicSlots(Object.keys(s.feats).length);
  const have = new Set(unlockedRelics(s).map((r) => r.id));
  const equip = (id: string) => {
    const save = loadSave();
    if (save.relics.includes(id)) save.relics = save.relics.filter((r) => r !== id);
    else if (save.relics.length < slots) save.relics = [...save.relics, id];
    else save.relics = [...save.relics.slice(1), id];
    storeSave(save);
    onChange?.();
    render();
  };
  root.append(
    h(
      'p',
      { class: 'relic-intro muted' },
      `Every achievement wins a relic. Carry ${slots === 1 ? 'one' : 'two'} into your games: the campaign, skirmish, and online games when the host allows campaign talents.`,
      slots === 1 ? ` A second slot opens at ${SECOND_SLOT_AT} achievements.` : '',
    ),
  );
  const slotRow = h('div', { class: 'relic-slots' });
  for (let i = 0; i < slots; i++) {
    const r = RELIC_BY_ID[s.relics[i]];
    slotRow.append(
      r
        ? h('div', { class: 'relic-slot on' }, h('span', { class: 'relic-icon' }, icon(r.icon, 22)), h('div', null, h('b', null, r.name), effectLines(r)), h('button', { class: 'btn small ghost', onclick: () => equip(r.id) }, 'Take off'))
        : h('div', { class: 'relic-slot' }, h('span', { class: 'relic-icon' }, icon('lock', 18)), h('span', { class: 'muted' }, have.size ? 'Empty: pick a relic below' : 'Empty: earn an achievement to win your first relic')),
    );
  }
  root.append(slotRow);
  const grid = h('div', { class: 'feats-grid' });
  for (const r of RELICS) {
    const owned = have.has(r.id);
    const worn = s.relics.includes(r.id);
    grid.append(
      h(
        'button',
        { class: `relic${owned ? ' got' : ''}${worn ? ' worn' : ''}`, disabled: !owned, onclick: () => (owned ? equip(r.id) : toast(`Earn “${FEAT_BY_ID[r.feat].name}” to win it.`)) },
        h('span', { class: 'relic-icon' }, icon(owned ? r.icon : 'lock', 18)),
        h(
          'div',
          { class: 'feat-text' },
          h('b', null, r.name, worn ? h('span', { class: 'relic-worn' }, 'carried') : null),
          owned ? effectLines(r) : h('span', null, `Earn “${FEAT_BY_ID[r.feat].name}”: ${FEAT_BY_ID[r.feat].text.charAt(0).toLowerCase()}${FEAT_BY_ID[r.feat].text.slice(1)}`),
          h('small', { class: 'relic-flavor' }, r.flavor),
        ),
      ),
    );
  }
  root.append(grid);
}

function feats(root: HTMLElement, s: CampaignSave): void {
  const relicOf = (feat: string) => RELICS.find((r) => r.feat === feat);
  for (const g of FEAT_GROUPS) {
    const list = FEATS.filter((f) => f.group === g.id);
    root.append(h('h3', { class: 'feats-group' }, g.name, h('span', null, `${list.filter((f) => s.feats[f.id]).length} / ${list.length}`)));
    const grid = h('div', { class: 'feats-grid' });
    for (const f of list) {
      const at = s.feats[f.id];
      const progress = !at && f.count && f.goal ? Math.min(f.count(s), f.goal) : null;
      const relic = relicOf(f.id);
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
            relic ? h('small', { class: 'feat-reward' }, icon(relic.icon, 11), ` ${relic.name}`) : null,
            at ? h('small', null, `Earned ${new Date(at).toLocaleDateString()}`) : null,
            progress !== null && progress > 0 ? h('div', { class: 'feat-progress' }, h('div', { class: 'fp-bar' }, h('div', { style: { width: `${(progress / f.goal!) * 100}%` } })), h('small', null, `${num(progress)} / ${num(f.goal!)}`)) : null,
          ),
        ),
      );
    }
    root.append(grid);
  }
  const t = s.tally;
  root.append(h('div', { class: 'feats-tally muted' }, `${num(t.games)} game${t.games === 1 ? '' : 's'} played to the end · ${num(t.wins)} won · ${num(t.kills)} creeps slain`));
}
