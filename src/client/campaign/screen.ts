// The campaign screen: the map of the road north, a briefing for the chosen stage and the
// runestone purse.
import { ENDLESS, ENDLESS_AFTER, STAGES, STAGE_BY_ID, type Stage } from '../../shared/campaign';
import { RACE_BY_ID } from '../../shared/data/races';
import { CREEPS, WAVES } from '../../shared/data/waves';
import { ARMOR_LABEL } from '../../shared/combat';
import { creepPortrait } from '../art/creeps';
import { DIFFICULTIES } from '../../shared/protocol';
import { raceEmblem } from '../art/emblems';
import { clear, h, tooltip } from '../ui/dom';
import { icon } from '../ui/icons';
import { CampaignMap, type MapNode } from './map';
import { type CampaignSave, currentStage, isUnlocked, loadSave, unspent } from './save';
import { openTalents } from './tree';

export interface CampaignActions {
  play(stage: Stage, save: CampaignSave): void;
  back(): void;
  /** The talent loadout changed (multiplayer rooms want to know). */
  talentsChanged?(): void;
}

/** Plain-language lines for a stage's rules, beyond its named mutators. */
export function stageFacts(stage: Stage): { label: string; value: string }[] {
  const r = stage.rules;
  const first = r.firstWave ?? 1;
  const last = stage.endless ? '∞' : String(r.finalWave ?? 40);
  const hp = DIFFICULTIES[stage.difficulty].hp * (r.hpMul ?? 1);
  return [
    { label: 'Waves', value: first === 1 ? `1–${last}` : `${first}–${last}` },
    { label: 'Lives', value: String(r.lives ?? DIFFICULTIES[stage.difficulty].lives) },
    { label: 'Gold', value: String(r.startGold ?? 120) },
    { label: 'Creep health', value: `${Math.round(hp * 100)}%` },
  ];
}

/** The creeps a stage throws at you, bosses first, at most `max` of them. */
export function stageRoster(stage: Stage, max = 12): { wave: number; id: string }[] {
  if (stage.endless) return [];
  const first = stage.rules.firstWave ?? 1;
  const last = stage.rules.finalWave ?? WAVES.length;
  const all = WAVES.slice(first - 1, last).map((w, i) => ({ wave: first + i, id: w.creep }));
  const bosses = all.filter((c) => CREEPS[c.id].boss);
  const rest = all.filter((c) => !CREEPS[c.id].boss);
  const step = Math.max(1, rest.length / Math.max(1, max - bosses.length));
  const picked = rest.filter((_, i) => Math.floor(i % step) === 0).slice(0, max - bosses.length);
  return [...picked, ...bosses].sort((a, b) => a.wave - b.wave);
}

export class CampaignScreen {
  private save: CampaignSave = loadSave();
  private map: CampaignMap;
  private brief: HTMLElement;
  private purse: HTMLElement;
  private talentBtn: HTMLButtonElement;
  private selected: Stage;

  constructor(
    root: HTMLElement,
    private actions: CampaignActions,
  ) {
    this.selected = currentStage(this.save);
    const canvas = h('canvas', { class: 'camp-canvas' }) as HTMLCanvasElement;
    this.map = new CampaignMap(canvas, () => this.nodes());
    this.map.onSelect = (s) => this.select(s);
    this.brief = h('aside', { class: 'panel camp-brief' });
    this.purse = h('div', { class: 'camp-purse' });
    const changed = () => {
      this.refresh();
      this.actions.talentsChanged?.();
    };
    this.talentBtn = h('button', { class: 'btn primary', onclick: () => openTalents(this.save, changed) }, icon('star', 16), 'Talents') as HTMLButtonElement;
    root.append(
      h(
        'div',
        { class: 'camp-wrap' },
        h(
          'header',
          { class: 'camp-head' },
          h('button', { class: 'btn ghost', onclick: () => this.actions.back() }, icon('back', 16), 'Menu'),
          h('div', { class: 'camp-title' }, h('h2', null, 'The Long Winter'), h('span', null, 'Campaign')),
          h('div', { class: 'camp-head-right' }, this.purse, this.talentBtn),
        ),
        h('div', { class: 'camp-body' }, h('div', { class: 'panel camp-map' }, canvas), this.brief),
      ),
    );
  }

  /** Called whenever the screen is shown. */
  show(): void {
    this.save = loadSave();
    const last = this.save.last ? STAGE_BY_ID[this.save.last] : undefined;
    // after a win, point at the next stage; otherwise stay on the stage just played
    this.selected = last && (this.save.stars[last.id] ?? 0) < 2 && isUnlocked(last, this.save) ? last : currentStage(this.save);
    this.refresh();
    this.map.start();
  }

  hide(): void {
    this.map.stop();
  }

  private nodes(): MapNode[] {
    const cur = currentStage(this.save);
    return [...STAGES, ENDLESS].map((stage) => ({ stage, unlocked: isUnlocked(stage, this.save), stars: this.save.stars[stage.id] ?? 0, current: stage === cur && (this.save.stars[stage.id] ?? 0) < 2 }));
  }

  private select(stage: Stage): void {
    this.selected = stage;
    this.refresh();
  }

  private refresh(): void {
    this.map.selected = this.selected.id;
    const free = unspent(this.save);
    clear(this.purse);
    this.purse.append(icon('rune', 18), h('b', null, String(free)), h('span', null, free === 1 ? 'runestone' : 'runestones'));
    this.talentBtn.classList.toggle('glow', free > 0);
    this.renderBrief();
  }

  private enemies(s: Stage): HTMLElement | null {
    const roster = stageRoster(s);
    if (!roster.length) return null;
    return h(
      'div',
      { class: 'cb-enemies' },
      ...roster.map(({ wave, id }) => {
        const def = CREEPS[id];
        const c = creepPortrait(def, 44);
        const el = h('div', { class: `cb-enemy${def.boss ? ' boss' : ''}${def.air ? ' air' : ''}` }, c, h('span', null, String(wave)));
        tooltip(el, () => h('div', null, h('div', { class: 'tt-title' }, def.name), h('div', { class: 'tt-meta' }, `Wave ${wave} · ${ARMOR_LABEL[def.armorType]}${def.boss ? ' · Boss' : ''}${def.air ? ' · Air' : ''}${def.immune ? ' · Immune' : ''}`)));
        return el;
      }),
    );
  }

  private renderBrief(): void {
    const s = this.selected;
    const save = this.save;
    const unlocked = isUnlocked(s, save);
    const stars = save.stars[s.id] ?? 0;
    const index = STAGES.indexOf(s);
    clear(this.brief);
    const facts = h('div', { class: 'cb-facts' }, ...stageFacts(s).map((f) => h('div', null, h('span', null, f.label), h('b', null, f.value))));
    const late = s.rules.firstWave && s.rules.firstWave > 1 ? [{ name: 'Late arrival', text: `The fight starts at wave ${s.rules.firstWave}, with ${s.rules.startGold ?? 120} gold and ${s.rules.startLumber ?? 1} lumber. The first wave waits ${s.rules.firstWaveDelay ?? 45}s: build fast (you can pause).` }] : [];
    const mutators = [...s.mutators, ...late];
    const goal = (n: number, text: string, reward: number) =>
      h('div', { class: `cb-goal${stars >= n ? ' done' : ''}` }, h('span', { class: 'cb-star' }, '★'.repeat(n)), h('span', { class: 'cb-goal-text' }, text), h('span', { class: 'cb-reward' }, stars >= n ? icon('check', 14) : null, `+${reward}`, icon('rune', 13)));
    const races = s.rules.races;
    let lockNote = '';
    if (!unlocked) lockNote = s.endless ? `Win ${STAGE_BY_ID[ENDLESS_AFTER].name} to open the frontier.` : `Win ${STAGES[index - 1].name} to unlock.`;
    const nextMark = Math.max(25, Math.floor((save.endlessBest - 20) / 5) * 5 + 25);
    const parts: (HTMLElement | null)[] = [
      h('div', { class: 'cb-kicker' }, s.endless ? 'Endless' : `Stage ${index + 1} of ${STAGES.length}`, h('span', null, DIFFICULTIES[s.difficulty].label)),
      h('h2', { class: 'cb-name' }, s.name),
      h('p', { class: 'cb-story' }, s.story),
      facts,
      mutators.length ? h('div', { class: 'cb-mutators' }, ...mutators.map((m) => h('div', { class: 'cb-mut' }, h('b', null, m.name), h('span', null, m.text)))) : null,
      this.enemies(s),
      races ? h('div', { class: 'cb-races' }, h('span', { class: 'muted' }, 'Races'), ...races.map((r) => {
        const c = raceEmblem(r, 64) as HTMLCanvasElement;
        c.title = RACE_BY_ID[r]?.name ?? r;
        return c;
      })) : null,
      s.endless
        ? h('div', { class: 'cb-goals' }, h('div', { class: 'cb-goal' }, h('span', { class: 'cb-star' }, icon('infinity', 16)), h('span', { class: 'cb-goal-text' }, save.endlessBest ? `Best: wave ${save.endlessBest}. Next runestone at wave ${nextMark}.` : 'A runestone at wave 25, 30, 35 and every 5 waves after.'), h('span', { class: 'cb-reward' }, '+1', icon('rune', 13))))
        : h('div', { class: 'cb-goals' }, goal(1, `Reach wave ${s.reach}`, s.rewards[0]), goal(2, 'Win the stage', s.rewards[1]), goal(3, `Win losing at most ${s.flawless} ${s.flawless === 1 ? 'life' : 'lives'}`, s.rewards[2])),
      !s.endless && save.best[s.id] ? h('div', { class: 'cb-best muted' }, stars >= 2 ? `Won${stars >= 3 ? ' flawlessly' : ''}. Replay it any time.` : `Best so far: wave ${save.best[s.id]}.`) : null,
      h(
        'div',
        { class: 'cb-actions' },
        unlocked
          ? h('button', { class: 'btn primary big', onclick: () => this.actions.play(s, this.save) }, icon('play', 16), stars > 0 || save.best[s.id] ? 'Play again' : 'Begin')
          : h('div', { class: 'cb-locked' }, icon('lock', 16), lockNote),
      ),
    ];
    this.brief.append(...parts.filter((p): p is HTMLElement => !!p));
  }
}
