// The campaign screen: a map per act, a briefing for the chosen stage and the runestone purse.
import { type Chapter, CHAPTERS, chapterOf, ENDLESS_AFTER, STAGE_BY_ID, type Stage } from '../../shared/campaign';
import { openAchievements, relicLine } from '../ui/achievements';
import { RACE_BY_ID } from '../../shared/data/races';
import { CREEPS, wavesOf } from '../../shared/data/waves';
import { abilityLines } from '../game/describe';
import { ARMOR_LABEL } from '../../shared/combat';
import { creepPortrait } from '../art/creeps';
import { DIFFICULTIES } from '../../shared/protocol';
import { raceEmblem } from '../art/emblems';
import { canResume, type SavedGame } from '../saved';
import { clear, h, tooltip } from '../ui/dom';
import { openModal } from '../ui/modal';
import { icon } from '../ui/icons';
import { CampaignMap, type MapNode } from './map';
import { stageLabel } from './play';
import { type CampaignSave, chapterOpen, currentStage, isUnlocked, loadSave, storeSave, unspent } from './save';
import { openTalents } from './tree';

export interface CampaignActions {
  play(stage: Stage, save: CampaignSave): void;
  back(): void;
  /** The talent loadout changed (multiplayer rooms want to know). */
  talentsChanged?(): void;
  /** The game in progress, and continuing it. */
  saved?(): SavedGame | null;
  resume?(): void;
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
  const waves = wavesOf(stage.waves);
  const first = stage.rules.firstWave ?? 1;
  const last = stage.rules.finalWave ?? waves.length;
  const all = waves.slice(first - 1, last).map((w, i) => ({ wave: first + i, id: w.creep }));
  const bosses = all.filter((c) => CREEPS[c.id].boss);
  const rest = all.filter((c) => !CREEPS[c.id].boss);
  const step = Math.max(1, rest.length / Math.max(1, max - bosses.length));
  const picked = rest.filter((_, i) => Math.floor(i % step) === 0).slice(0, max - bosses.length);
  return [...picked, ...bosses].sort((a, b) => a.wave - b.wave);
}

/** Portraits of the creeps a stage throws at you, with what each can do in its tooltip. */
export function enemyRoster(s: Stage): HTMLElement | null {
  const roster = stageRoster(s);
  if (!roster.length) return null;
  return h(
    'div',
    { class: 'cb-enemies' },
    ...roster.map(({ wave, id }) => {
      const def = CREEPS[id];
      const c = creepPortrait(def, 44);
      const el = h('div', { class: `cb-enemy${def.boss ? ' boss' : ''}${def.air ? ' air' : ''}` }, c, h('span', null, String(wave)));
      tooltip(el, () => h('div', null, h('div', { class: 'tt-title' }, def.name), h('div', { class: 'tt-meta' }, `Wave ${wave} · ${ARMOR_LABEL[def.armorType]}${def.boss ? ' · Boss' : ''}${def.air ? ' · Air' : ''}${def.immune ? ' · Immune' : ''}`), ...abilityLines(def).map((l) => h('div', null, l))));
      return el;
    }),
  );
}

export class CampaignScreen {
  private save: CampaignSave = loadSave();
  private map: CampaignMap;
  private brief: HTMLElement;
  private purse: HTMLElement;
  private relicBtn: HTMLButtonElement;
  private talentBtn: HTMLButtonElement;
  private selected: Stage;
  private chapter: Chapter = CHAPTERS[0];
  private tabs: HTMLElement;
  private title: HTMLElement;

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
    this.talentBtn = h('button', { class: 'btn primary', onclick: () => openTalents(this.save, changed) }, icon('star', 16), 'Rune Web') as HTMLButtonElement;
    this.relicBtn = h('button', { class: 'btn', title: 'Relics you carry', onclick: () => openAchievements({ onChange: () => (this.save = loadSave(), changed()) }) }, icon('gem', 16), h('span', { class: 'roomy-only' }, 'Relics')) as HTMLButtonElement;
    this.tabs = h('div', { class: 'camp-tabs' });
    this.title = h('h2', null, '');
    root.append(
      h(
        'div',
        { class: 'camp-wrap' },
        h(
          'header',
          { class: 'camp-head' },
          h('button', { class: 'btn ghost', onclick: () => this.actions.back() }, icon('back', 16), 'Menu'),
          h('div', { class: 'camp-title' }, this.title, this.tabs),
          h('div', { class: 'camp-head-right' }, this.purse, this.relicBtn, this.talentBtn),
        ),
        h('div', { class: 'camp-body' }, h('div', { class: 'panel camp-map' }, canvas), this.brief),
      ),
    );
  }

  /** Called whenever the screen is shown. */
  show(): void {
    this.save = loadSave();
    const last = this.save.last ? STAGE_BY_ID[this.save.last] : undefined;
    // the act of the stage played last, if it is open
    this.chapter = last && chapterOpen(chapterOf(last), this.save) ? chapterOf(last) : CHAPTERS[0];
    // after a win, point at the next stage; otherwise stay on the stage just played
    this.selected = last && chapterOf(last) === this.chapter && (this.save.stars[last.id] ?? 0) < 2 && isUnlocked(last, this.save) ? last : currentStage(this.save, this.chapter);
    this.map.setChapter(this.chapter);
    this.refresh();
    this.map.start();
    if (this.save.refunded) this.announceWeb();
  }

  /** Once, for players who had talents in the old tree. */
  private announceWeb(): void {
    this.save.refunded = undefined;
    storeSave(this.save);
    const modal = openModal(
      h(
        'div',
        null,
        h('h2', null, 'The Rune Web'),
        h('div', { class: 'sub' }, 'The talent tree has grown into a web of passives, in the spirit of Path of Exile: small nodes, named notables and keystones that change how you play. Your runestones were all refunded, so you can build again.'),
        h('div', { class: 'field-row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn', onclick: () => modal.close() }, 'Later'), h('button', { class: 'btn primary', onclick: () => (modal.close(), openTalents(this.save, () => (this.refresh(), this.actions.talentsChanged?.()))) }, 'Open the Rune Web')),
      ),
      { narrow: true },
    );
  }

  hide(): void {
    this.map.stop();
  }

  private nodes(): MapNode[] {
    const cur = currentStage(this.save, this.chapter);
    const stages = [...this.chapter.stages, ...(this.chapter.endless ? [this.chapter.endless] : [])];
    return stages.map((stage) => ({ stage, unlocked: isUnlocked(stage, this.save), stars: this.save.stars[stage.id] ?? 0, current: stage === cur && (this.save.stars[stage.id] ?? 0) < 2 }));
  }

  /** Switches to another act's map. */
  private openChapter(chapter: Chapter): void {
    if (chapter === this.chapter) return;
    this.chapter = chapter;
    this.map.setChapter(chapter);
    this.selected = currentStage(this.save, chapter);
    this.refresh();
  }

  private renderTabs(): void {
    clear(this.tabs);
    this.title.textContent = this.chapter.name;
    for (const c of CHAPTERS) {
      const open = chapterOpen(c, this.save);
      const tab = h('button', { class: `camp-tab${c === this.chapter ? ' on' : ''}${open ? '' : ' locked'}`, onclick: () => this.openChapter(c) }, open ? null : icon('lock', 12), c.act, c.id !== 'winter' && open && !(this.save.stars[c.stages[0].id] ?? 0) ? h('span', { class: 'camp-new' }, 'new') : null);
      tooltip(tab, () => (open ? `${c.act}: ${c.name}. ${c.blurb}` : `${c.act}: ${c.name}. Win ${STAGE_BY_ID[c.opensAfter!].name} in Act I to open it.`));
      this.tabs.append(tab);
    }
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
    this.relicBtn.title = `Relics you carry: ${relicLine(this.save)}`;
    this.renderTabs();
    this.renderBrief();
  }

  /** Begin, play again, or continue the game in progress on this stage. */
  private playButtons(s: Stage): HTMLElement[] {
    const saved = this.actions.saved?.();
    const play = () => this.actions.play(s, this.save);
    if (saved && canResume(saved) && saved.kind.mode === 'campaign' && saved.kind.stage === s.id) {
      return [
        h('button', { class: 'btn primary big', onclick: () => this.actions.resume?.() }, icon('play', 16), `Continue · wave ${saved.wave}`),
        h('button', { class: 'btn big', onclick: play }, 'Restart'),
      ];
    }
    const played = (this.save.stars[s.id] ?? 0) > 0 || !!this.save.best[s.id];
    return [h('button', { class: 'btn primary big', onclick: play }, icon('play', 16), played ? 'Play again' : 'Begin')];
  }

  private renderBrief(): void {
    const s = this.selected;
    const save = this.save;
    const unlocked = isUnlocked(s, save);
    const stars = save.stars[s.id] ?? 0;
    const chapter = chapterOf(s);
    const index = chapter.stages.indexOf(s);
    clear(this.brief);
    const facts = h('div', { class: 'cb-facts' }, ...stageFacts(s).map((f) => h('div', null, h('span', null, f.label), h('b', null, f.value))));
    const late = s.rules.firstWave && s.rules.firstWave > 1 ? [{ name: 'Late arrival', text: `The fight starts at wave ${s.rules.firstWave}, with ${s.rules.startGold ?? 120} gold and ${s.rules.startLumber ?? 1} lumber. The first wave waits ${s.rules.firstWaveDelay ?? 45}s: build fast (you can pause).` }] : [];
    const mutators = [...s.mutators, ...late];
    const goal = (n: number, text: string, reward: number) =>
      h('div', { class: `cb-goal${stars >= n ? ' done' : ''}` }, h('span', { class: 'cb-star' }, '★'.repeat(n)), h('span', { class: 'cb-goal-text' }, text), h('span', { class: 'cb-reward' }, stars >= n ? icon('check', 14) : null, `+${reward}`, icon('rune', 13)));
    const races = s.rules.races;
    let lockNote = '';
    if (!unlocked) lockNote = s.endless ? `Win ${STAGE_BY_ID[ENDLESS_AFTER].name} to open the frontier.` : index > 0 ? `Win ${chapter.stages[index - 1].name} to unlock.` : `Win ${STAGE_BY_ID[chapter.opensAfter!].name} in Act I to open ${chapter.name}.`;
    const nextMark = Math.max(25, Math.floor((save.endlessBest - 20) / 5) * 5 + 25);
    const parts: (HTMLElement | null)[] = [
      h('div', { class: 'cb-kicker' }, s.endless ? 'Endless' : `${stageLabel(s)} of ${chapter.stages.length}`, h('span', null, `${DIFFICULTIES[s.difficulty].label}${s.waves === 'thaw' ? ' · The Thaw' : ''}`)),
      h('h2', { class: 'cb-name' }, s.name),
      h('p', { class: 'cb-story' }, s.story),
      facts,
      mutators.length ? h('div', { class: 'cb-mutators' }, ...mutators.map((m) => h('div', { class: 'cb-mut' }, h('b', null, m.name), h('span', null, m.text)))) : null,
      enemyRoster(s),
      races ? h('div', { class: 'cb-races' }, h('span', { class: 'muted' }, 'Races'), ...races.map((r) => {
        const c = raceEmblem(r, 64) as HTMLCanvasElement;
        c.title = RACE_BY_ID[r]?.name ?? r;
        return c;
      })) : null,
      s.endless
        ? h('div', { class: 'cb-goals' }, h('div', { class: 'cb-goal' }, h('span', { class: 'cb-star' }, icon('infinity', 16)), h('span', { class: 'cb-goal-text' }, save.endlessBest ? `Best: wave ${save.endlessBest}. Next runestone at wave ${nextMark}.` : 'A runestone at wave 25, 30, 35 and every 5 waves after.'), h('span', { class: 'cb-reward' }, '+1', icon('rune', 13))))
        : h('div', { class: 'cb-goals' }, goal(1, `Reach wave ${s.reach}`, s.rewards[0]), goal(2, 'Win the stage', s.rewards[1]), goal(3, `Win losing at most ${s.flawless} ${s.flawless === 1 ? 'life' : 'lives'}`, s.rewards[2])),
      !s.endless && save.best[s.id] ? h('div', { class: 'cb-best muted' }, stars >= 2 ? `Won${stars >= 3 ? ' flawlessly' : ''}. Replay it any time.` : `Best so far: wave ${save.best[s.id]}.`) : null,
      h('div', { class: 'cb-actions' }, unlocked ? this.playButtons(s) : h('div', { class: 'cb-locked' }, icon('lock', 16), lockNote)),
    ];
    this.brief.append(...parts.filter((p): p is HTMLElement => !!p));
  }
}
