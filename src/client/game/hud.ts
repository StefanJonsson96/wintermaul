import { raceEmblem } from '../art/emblems';
import { towerIcon } from '../art/towers';
import { audio } from '../audio';
import { PLAYER_COLORS, SELL_REFUND } from '../../shared/constants';
import { ARMOR_LABEL } from '../../shared/combat';
import { RACE_BY_ID, RACES, TOWERS, towersOfRace } from '../../shared/data/races';
import { CREEPS, FINAL_WAVE, waveDef } from '../../shared/data/waves';
import { DIFFICULTIES, type Difficulty, type EndStats, type GameSettings, RACE_MODES, startingLives } from '../../shared/protocol';
import { TARGET_MODES, type CreepDef, type TargetMode, type TowerDef } from '../../shared/types';
import { ChatBox } from '../ui/chat';
import { clear, fmt, h, hideTooltip, toast, tooltip } from '../ui/dom';
import { openHelp } from '../ui/help';
import { icon } from '../ui/icons';
import { openModal, type ModalHandle } from '../ui/modal';
import { towerTooltip, dps } from './describe';
import type { GameView } from './view';

const MODE_LABEL: Record<TargetMode, string> = { first: 'First', last: 'Last', strong: 'Strong', weak: 'Weak', close: 'Close' };
export const BUILD_KEYS = ['q', 'w', 'e', 'r', 't', 'y'];

export class Hud {
  root: HTMLElement;
  chat: ChatBox;
  minimap: HTMLCanvasElement;
  private waveNum!: HTMLElement;
  private waveName!: HTMLElement;
  private waveSub!: HTMLElement;
  private timerFill!: HTMLElement;
  private livesNum!: HTMLElement;
  private livesBlock!: HTMLElement;
  private goldEl!: HTMLElement;
  private lumberEl!: HTMLElement;
  private readyBtn!: HTMLButtonElement;
  private scoreboard!: HTMLElement;
  private buildPanel!: HTMLElement;
  private buildGrid!: HTMLElement;
  private selectPanel!: HTMLElement;
  private preview!: HTMLElement;
  private buildKey = '';
  private selKey = '';
  private sbKey = '';
  private lastLives = -1;
  buildButtons: { key: string; def: TowerDef | null; action: () => void }[] = [];
  selectionKeys: { key: string; action: () => void }[] = [];
  private raceModal: ModalHandle | null = null;
  private setupModal: ModalHandle | null = null;
  private setupEls: { refresh: () => void } | null = null;
  private endModal: ModalHandle | null = null;

  constructor(
    root: HTMLElement,
    private view: GameView,
  ) {
    this.root = root;
    clear(root);
    this.chat = new ChatBox(view.net, true);
    this.minimap = h('canvas', { width: 170, height: 120 }) as HTMLCanvasElement;
    this.build();
  }

  private get state() {
    return this.view.state;
  }

  private build(): void {
    const v = this.view;
    this.waveNum = h('span', { class: 'num' }, 'Wave 1');
    this.waveName = h('span', { class: 'name' }, '');
    this.waveSub = h('div', { class: 'wave-sub' });
    this.timerFill = h('div', { style: { width: '0%' } });
    const waveBlock = h('div', { class: 'panel top-block wave-block' }, h('div', { class: 'wave-title' }, this.waveNum, this.waveName), this.waveSub, h('div', { class: 'timer-bar' }, this.timerFill));
    this.livesNum = h('div', { class: 'lives-num' }, '30');
    this.livesBlock = h('div', { class: 'panel top-block lives-block', title: 'Team lives. A leaked creep costs lives (bosses cost more).' }, this.livesNum, h('div', { class: 'lives-label' }, 'Lives'));
    this.goldEl = h('span', null, '0');
    this.lumberEl = h('span', null, '0');
    this.readyBtn = h('button', { class: 'btn small ready-btn', onclick: () => v.toggleReady() }, 'Call wave') as HTMLButtonElement;
    tooltip(this.readyBtn, () => 'When every player is ready the countdown skips ahead (early callers earn a little gold). Hotkey: G');
    const res = h(
      'div',
      { class: 'panel top-block res-block' },
      h('div', { class: 'res gold', title: 'Gold' }, icon('coin', 18), this.goldEl),
      h('div', { class: 'res lumber', title: 'Lumber — buys races and Legends' }, icon('log', 18), this.lumberEl),
      this.readyBtn,
    );
    const top = h('div', { class: 'topbar' }, waveBlock, this.livesBlock, res);
    this.preview = h('div', { class: 'wave-preview' });

    const sound = h('button', { class: 'btn icon-btn', title: 'Sound' }, icon('sound', 17));
    sound.addEventListener('click', () => {
      audio.setMuted(!audio.muted);
      sound.style.opacity = audio.muted ? '0.45' : '1';
    });
    sound.style.opacity = audio.muted ? '0.45' : '1';
    const topRight = h(
      'div',
      { class: 'top-right' },
      h('button', { class: 'btn icon-btn', title: 'How to play (F1)', onclick: () => openHelp() }, icon('help', 17)),
      sound,
      h('button', { class: 'btn icon-btn', title: 'Settings', onclick: () => this.openSettings() }, icon('gear', 17)),
      h('button', { class: 'btn icon-btn', title: 'Leave game', onclick: () => v.confirmLeave() }, icon('exit', 17)),
    );

    this.scoreboard = h('div', { class: 'panel scoreboard' });
    this.minimap.addEventListener('mousedown', (e) => v.minimapClick(e, this.minimap));
    this.minimap.addEventListener('mousemove', (e) => {
      if (e.buttons & 1) v.minimapClick(e, this.minimap);
    });
    const mini = h('div', { class: 'panel minimap' }, this.minimap);

    this.buildGrid = h('div', { class: 'build-grid' });
    this.buildPanel = h('div', { class: 'panel build-panel' }, h('div', { class: 'panel-title' }, h('span', null, 'Build'), h('span', null, 'Shift = keep placing')), this.buildGrid);
    this.selectPanel = h('div', { class: 'panel select-panel hidden' });
    const card = h('div', { class: 'command-card' }, this.buildPanel, this.selectPanel);

    this.root.append(top, this.preview, topRight, this.scoreboard, this.chat.el, mini, card);
    if (this.state.you < 0) this.root.append(h('div', { class: 'panel spectating' }, 'Spectating — enjoy the show'));
    this.chat.onCommand = (cmd, args) => v.chatCommand(cmd, args);
  }

  // ───────────────────────────────────────── per-frame (cheap) updates
  update(now: number): void {
    const s = this.state;
    const me = s.me;
    const w = s.wave;
    // wave block
    let title = '';
    let name = '';
    let sub: (string | HTMLElement)[] = [];
    let fill = 0;
    const nextN = w.phase === 'wave' ? w.n : w.n + 1;
    const next = this.waveInfo(nextN);
    if (w.phase === 'setup') {
      const chooser = s.player(w.chooser);
      title = 'Setting up';
      name = `${chooser?.name ?? 'Red'} picks the rules`;
      sub = [`${Math.ceil(w.countdown)}s`];
      fill = w.countdown / 30;
    } else if (w.phase === 'build') {
      title = `Wave ${nextN}`;
      name = next ? next.creep.name : '';
      sub = [`in ${Math.ceil(w.countdown)}s`, ...(next ? this.traits(next.creep, next.title) : [])];
      fill = w.countdown / (w.n === 0 ? 45 : 25);
    } else if (w.phase === 'wave') {
      title = `Wave ${w.n}${w.finalWave ? `/${w.finalWave}` : ''}`;
      name = next ? next.creep.name : '';
      let alive = 0;
      for (const c of s.creeps.values()) if (c.wave === w.n && s.isVisible(c)) alive++;
      sub = [`${alive} left`, ...(next ? this.traits(next.creep, next.title) : [])];
      fill = 1;
    } else {
      title = w.phase === 'victory' ? 'Victory!' : 'Defeat';
      name = `Wave ${w.n}`;
    }
    this.setText(this.waveNum, title);
    this.setText(this.waveName, name);
    const subKey = sub.map((x) => (typeof x === 'string' ? x : x.textContent)).join('|');
    if (this.waveSub.dataset.k !== subKey) {
      this.waveSub.dataset.k = subKey;
      clear(this.waveSub);
      this.waveSub.append(...sub.map((x) => (typeof x === 'string' ? h('span', null, x) : x)));
    }
    this.timerFill.style.width = `${Math.max(0, Math.min(1, fill)) * 100}%`;
    // lives
    this.setText(this.livesNum, String(Math.max(0, w.lives)));
    if (this.lastLives >= 0 && w.lives < this.lastLives) {
      this.livesBlock.classList.remove('hit');
      void this.livesBlock.offsetWidth;
      this.livesBlock.classList.add('hit');
    }
    this.lastLives = w.lives;
    // resources
    this.setText(this.goldEl, fmt(me?.gold ?? 0));
    this.setText(this.lumberEl, String(me?.lumber ?? 0));
    // ready button
    const humans = s.players.filter((p) => !p.isBot && p.connected);
    const readyN = humans.filter((p) => p.ready).length;
    const canReady = w.phase === 'build' && s.you >= 0;
    this.readyBtn.disabled = !canReady;
    this.readyBtn.classList.toggle('on', !!me?.ready);
    this.setText(this.readyBtn, canReady ? (me?.ready ? `Ready ${readyN}/${humans.length}` : humans.length > 1 ? `Call wave ${readyN}/${humans.length}` : 'Call wave') : 'Call wave');

    // preview chips
    const pk = `${w.n}|${w.phase}`;
    if (this.preview.dataset.k !== pk) {
      this.preview.dataset.k = pk;
      clear(this.preview);
      for (let n = nextN + 1; n <= nextN + 3; n++) {
        const info = this.waveInfo(n);
        if (!info) break;
        const tags = this.traitWords(info.creep, info.title);
        this.preview.append(h('div', { class: 'wp-item' }, `W${n} `, h('b', null, info.creep.name), tags ? ` · ${tags}` : ''));
      }
    }

    this.updateScoreboard();
    this.refreshBuildPanel();
    this.refreshSelection();
    void now;
  }

  private setText(el: HTMLElement, text: string): void {
    if (el.textContent !== text) el.textContent = text;
  }

  waveInfo(n: number): { creep: CreepDef; title: string; hint: string } | null {
    if (n < 1) return null;
    if (n > FINAL_WAVE) {
      if (!this.state.settings.endless) return null;
      const d = this.state.creepDef(`e${n}`);
      return d ? { creep: d, title: 'ENDLESS', hint: '' } : null;
    }
    const w = waveDef(n);
    if (!w) return null;
    return { creep: CREEPS[w.creep], title: w.title, hint: w.hint };
  }

  private traitWords(c: CreepDef, title: string): string {
    const t: string[] = [];
    if (c.boss) t.push('Boss');
    if (c.air) t.push('Air');
    if (title === 'SWARM') t.push('Swarm');
    if (c.immune) t.push('Immune');
    t.push(ARMOR_LABEL[c.armorType]);
    return t.join(' · ');
  }

  private traits(c: CreepDef, title: string): HTMLElement[] {
    const out: HTMLElement[] = [];
    if (c.boss) out.push(h('span', { class: 'trait boss' }, title === 'FINAL BOSS' ? 'Final boss' : 'Boss'));
    if (c.air) out.push(h('span', { class: 'trait air' }, 'Air'));
    if (title === 'SWARM') out.push(h('span', { class: 'trait' }, 'Swarm'));
    if (c.immune) out.push(h('span', { class: 'trait immune' }, 'Immune'));
    if (c.regen) out.push(h('span', { class: 'trait' }, 'Regen'));
    if (c.heal) out.push(h('span', { class: 'trait' }, 'Healer'));
    if (c.split) out.push(h('span', { class: 'trait' }, 'Splits'));
    if (c.shield) out.push(h('span', { class: 'trait' }, 'Shield'));
    out.push(h('span', { class: 'trait' }, ARMOR_LABEL[c.armorType]));
    return out;
  }

  // ───────────────────────────────────────── scoreboard
  private updateScoreboard(): void {
    const s = this.state;
    const key = s.players.map((p) => `${p.gold}|${p.kills}|${p.leaks}|${p.ready}|${p.connected}|${p.races.join(',')}`).join(';') + s.wave.phase;
    if (key === this.sbKey) return;
    this.sbKey = key;
    clear(this.scoreboard);
    this.scoreboard.append(h('div', { class: 'sb-head' }, h('span', null, 'Player'), h('span', { style: { textAlign: 'right' } }, 'Gold'), h('span', { style: { textAlign: 'right' } }, 'Kills'), h('span', { style: { textAlign: 'right' } }, 'Leaks')));
    for (const p of [...s.players].sort((a, b) => a.lane - b.lane)) {
      const color = PLAYER_COLORS[p.color];
      const dots = h('span', { class: 'race-dots' });
      for (const r of p.races) {
        const em = raceEmblem(r, 28);
        const c = h('canvas', { width: 28, height: 28, class: 'race-dot', title: RACE_BY_ID[r].name }) as HTMLCanvasElement;
        c.getContext('2d')!.drawImage(em, 0, 0);
        dots.append(c);
      }
      const row = h(
        'div',
        { class: `sb-row${p.id === s.you ? ' me' : ''}${p.connected ? '' : ' away'}`, onclick: () => this.view.focusLane(p.lane) },
        h('span', { class: 'c', style: { background: color.hex } }),
        h('span', { class: 'nm' }, h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, p.name), dots, s.wave.phase === 'build' && p.ready ? h('span', { class: 'rdy' }, '✓') : null),
        h('span', { class: 'num gold-text' }, fmt(p.gold)),
        h('span', { class: 'num' }, String(p.kills)),
        h('span', { class: 'num leaks' }, String(p.leaks)),
      );
      if (p.id !== s.you && s.you >= 0 && !p.isBot) {
        row.title = 'Click: view lane · Right-click: send gold';
        row.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.openGift(p.id);
        });
      } else row.title = 'Click to view this lane';
      this.scoreboard.append(row);
    }
  }

  // ───────────────────────────────────────── build panel
  refreshBuildPanel(force = false): void {
    const s = this.state;
    const me = s.me;
    if (!me) {
      this.buildPanel.classList.add('hidden');
      return;
    }
    const key = `${me.races.join(',')}|${me.lumber}|${me.legends.join(',')}|${Math.floor(me.gold)}|${this.view.buildDef?.id ?? ''}|${s.wave.phase}|${s.settings.raceMode}`;
    if (key === this.buildKey && !force) return;
    this.buildKey = key;
    clear(this.buildGrid);
    this.buildButtons = [];
    // tower buttons get Q, W, E… in order; the race button always has L, so the tower
    // hotkeys don't shift when lumber arrives mid-wave
    let towerKeys = 0;
    const add = (btn: HTMLElement, key: string | null, def: TowerDef | null, action: () => void) => {
      const hk = key ?? BUILD_KEYS[towerKeys++];
      if (hk) btn.append(h('span', { class: 'hk' }, hk.toUpperCase()));
      this.buildButtons.push({ key: hk ?? '', def, action });
      this.buildGrid.append(btn);
    };
    for (const r of me.races) {
      const def = TOWERS[`${r}_1`];
      const btn = this.towerButton(def, def.cost, me.gold >= def.cost, this.view.buildDef?.id === def.id);
      add(btn, null, def, () => this.view.startBuild(def.id));
    }
    for (const r of me.races) {
      const def = TOWERS[`${r}_L`];
      if (!def || me.legends.includes(def.id)) continue;
      const affordable = me.gold >= def.cost && me.lumber >= (def.lumber ?? 1);
      const btn = this.towerButton(def, def.cost, affordable, this.view.buildDef?.id === def.id);
      btn.append(h('span', { class: 'cost lumber' }, `${def.lumber}🪵`.replace('🪵', 'L')));
      add(btn, null, def, () => this.view.startBuild(def.id));
    }
    const canPickRace = me.lumber > 0 && me.races.length < 3 && s.wave.phase !== 'setup';
    if (canPickRace) {
      const btn = h('button', { class: 'cmd-btn special', onclick: () => this.openRacePicker() }, me.races.length === 0 ? 'Choose\nrace' : 'New race\n/ Legend');
      btn.style.whiteSpace = 'pre-line';
      tooltip(btn, () => (me.races.length === 0 ? 'Spend your lumber on a race to start building.' : 'You have lumber! Spend it on a new race, or on a Legend tower of a race you own.'));
      add(btn, 'l', null, () => this.openRacePicker());
    }
    if (this.buildButtons.length === 0) {
      this.buildGrid.append(h('div', { class: 'muted', style: { gridColumn: 'span 4', padding: '8px', width: '240px', alignSelf: 'center' } }, s.wave.phase === 'setup' ? 'Waiting for the rules…' : 'No races yet.'));
    }
  }

  private towerButton(def: TowerDef, cost: number, affordable: boolean, active: boolean): HTMLElement {
    const icon = towerIcon(def, 64);
    const c = h('canvas', { width: 64, height: 64 }) as HTMLCanvasElement;
    c.getContext('2d')!.drawImage(icon, 0, 0);
    const btn = h('button', { class: `cmd-btn${affordable ? '' : ' poor'}${active ? ' active' : ''}`, onclick: () => this.view.startBuild(def.id) }, c, h('span', { class: 'cost' }, String(cost)));
    tooltip(btn, () => towerTooltip(def));
    return btn;
  }

  // ───────────────────────────────────────── selection panel
  refreshSelection(force = false): void {
    const s = this.state;
    const ids = [...this.view.selected].filter((id) => s.towers.has(id));
    const towers = ids.map((id) => s.towers.get(id)!);
    const me = s.me;
    const key = `${ids.join(',')}|${towers.map((t) => `${t.def}${t.mode}${t.kills}${t.level}${t.buildUntil > s.renderTime}`).join(',')}|${Math.floor(me?.gold ?? 0)}`;
    if (key === this.selKey && !force) return;
    this.selKey = key;
    this.selectionKeys = [];
    if (towers.length === 0) {
      this.selectPanel.classList.add('hidden');
      return;
    }
    this.selectPanel.classList.remove('hidden');
    clear(this.selectPanel);
    const mine = towers.filter((t) => t.owner === s.you);
    const first = towers[0];
    const def = first.tdef;
    const same = towers.every((t) => t.def === first.def);
    const iconC = h('canvas', { class: 'sel-icon', width: 52, height: 52 }) as HTMLCanvasElement;
    iconC.getContext('2d')!.drawImage(towerIcon(def, 64), 0, 0, 52, 52);
    const owner = s.player(first.owner);
    const race = RACE_BY_ID[def.race];
    this.selectPanel.append(
      h(
        'div',
        { class: 'sel-head' },
        iconC,
        h(
          'div',
          { style: { minWidth: '0' } },
          h('div', { class: 'sel-name', style: { color: race.color } }, towers.length > 1 ? `${towers.length} towers${same ? ` · ${def.name}` : ''}` : def.name),
          h('div', { class: 'sel-sub' }, `${def.tier === 5 ? 'Legend' : `Tier ${def.tier}`} · ${race.name}${owner && owner.id !== s.you ? ` · ${owner.name}'s` : ''}${first.buildUntil > s.renderTime ? ' · building…' : ''}`),
        ),
      ),
    );
    if (towers.length === 1) {
      const a = def.attack;
      const grid = h('div', { class: 'stat-grid' });
      const stat = (label: string, value: string) => grid.append(h('div', { class: 'stat' }, label, h('b', null, value)));
      if (a) {
        stat('Damage', a.beam ? `${a.dmg[0]}/s` : `${a.dmg[0]}–${a.dmg[1]}`);
        stat('Speed', a.beam ? 'beam' : `${a.cd}s`);
        stat('Range', String(a.range));
        stat('DPS', String(Math.round(dps(def))));
      }
      stat('Kills', String(first.kills));
      stat('Damage dealt', fmt(first.damage));
      if (def.growth) stat('Level', `${first.level}/${def.growth.maxLevel}`);
      stat('Value', `${Math.floor(first.invested * SELL_REFUND)}g`);
      this.selectPanel.append(grid, h('div', { class: 'sel-desc' }, def.desc));
    }
    if (mine.length === 0) return;
    // upgrades
    const options = new Map<string, number[]>();
    for (const t of mine) for (const u of t.tdef.upgrades) options.set(u, [...(options.get(u) ?? []), t.id]);
    const actions = h('div', { class: 'sel-actions' });
    let k = 0;
    for (const [to, tids] of options) {
      const up = TOWERS[to];
      const cost = up.cost * tids.length;
      const hk = BUILD_KEYS[k++];
      const icon = h('canvas', { width: 36, height: 36 }) as HTMLCanvasElement;
      icon.getContext('2d')!.drawImage(towerIcon(up, 64), 0, 0, 36, 36);
      const act = () => this.view.upgrade(tids, to);
      const btn = h(
        'button',
        { class: 'upg-btn', onclick: act, disabled: (me?.gold ?? 0) < up.cost },
        icon,
        h('div', { style: { minWidth: '0' } }, h('div', { class: 't' }, `${hk ? `[${hk.toUpperCase()}] ` : ''}${up.name}${tids.length > 1 ? ` ×${tids.length}` : ''}`), h('div', { class: 'c' }, `${cost} gold`)),
      ) as HTMLButtonElement;
      tooltip(btn, () => towerTooltip(up, { note: tids.length > 1 ? `Upgrades ${tids.length} towers (as many as you can afford)` : undefined }));
      actions.append(btn);
      if (hk) this.selectionKeys.push({ key: hk, action: act });
    }
    const refund = mine.reduce((sum, t) => sum + Math.floor(t.invested * SELL_REFUND), 0);
    const sellBtn = h('button', { class: 'btn danger small', onclick: () => this.view.sell(mine.map((t) => t.id)) }, `Sell [X] +${refund}`);
    tooltip(sellBtn, () => 'Refunds 75% (100% if you built it during this build phase). Selling while creeps are on the field leaves rubble until the wave ends.');
    this.selectionKeys.push({ key: 'x', action: () => this.view.sell(mine.map((t) => t.id)) });
    if (options.size === 0 && mine.length > 0) actions.append(h('div', { class: 'muted', style: { fontSize: '12px', flex: '1' } }, 'Fully upgraded.'));
    this.selectPanel.append(actions);
    const hasAttack = mine.some((t) => t.tdef.attack);
    const row = h('div', { class: 'mode-row' });
    if (hasAttack) {
      row.append(h('span', null, 'Target:'));
      for (const m of TARGET_MODES) {
        row.append(h('button', { class: `btn small${mine.every((t) => t.mode === m) ? ' on' : ''}`, onclick: () => this.view.setMode(mine.map((t) => t.id), m) }, MODE_LABEL[m]));
      }
    }
    row.append(h('div', { style: { flex: '1' } }), sellBtn);
    this.selectPanel.append(row);
  }

  // ───────────────────────────────────────── banners & modals
  banner(big: string, small: string, kind = ''): void {
    const el = h('div', { class: `banner ${kind}` }, h('div', { class: 'big' }, big), h('div', { class: 'small' }, small));
    this.root.append(el);
    setTimeout(() => el.remove(), 3300);
  }

  openRacePicker(): void {
    const s = this.state;
    const me = s.me;
    if (!me || this.raceModal) return;
    if (me.lumber < 1) {
      toast('You need lumber to pick a race.', 'error');
      return;
    }
    const randomMode = s.settings.raceMode === 'random';
    const grid = h('div', { class: 'race-grid' });
    const pick = (race: string) => {
      this.view.pickRace(race);
      this.raceModal?.close();
    };
    if (!randomMode) {
      for (const r of RACES) {
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
        grid.append(
          h(
            'div',
            { class: `race-card${owned ? ' owned' : ''}`, style: { '--rc': r.color } as unknown as Record<string, string>, onclick: () => pick(r.id) },
            h('div', { class: 'rc-head' }, em, h('div', null, h('div', { class: 'rc-name', style: { color: r.color } }, r.name), h('div', { class: 'rc-el' }, r.element, ' · ', h('span', { class: 'stars' }, '★'.repeat(r.difficulty) + '☆'.repeat(3 - r.difficulty))))),
            h('div', { class: 'rc-blurb' }, r.blurb),
            h('div', { class: 'rc-tags' }, ...r.tags.map((t) => h('span', { class: 'trait' }, t))),
            towers,
          ),
        );
        (grid.lastElementChild as HTMLElement).style.setProperty('--rc', r.color);
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
    this.raceModal = openModal(
      h(
        'div',
        null,
        h('h2', null, me.races.length === 0 ? 'Choose your race' : 'Choose another race'),
        h('div', { class: 'sub' }, `You have ${me.lumber} lumber. Each race costs 1. Stars show how tricky a race is to play well. Hover the little towers for details.`),
        grid,
        legendNote,
      ),
      { wide: true, onClose: () => (this.raceModal = null) },
    );
  }

  closeRacePicker(): void {
    this.raceModal?.close();
  }

  openSetup(): void {
    if (this.setupModal) {
      this.setupEls?.refresh();
      return;
    }
    const s = this.state;
    const isChooser = s.you === s.wave.chooser;
    const body = h('div');
    const countdown = h('span', { class: 'countdown-ring' });
    const refresh = () => {
      clear(body);
      const st = this.state.settings;
      const set = (patch: Partial<GameSettings>) => {
        if (isChooser) {
          audio.play('click');
          this.view.setup(patch);
        }
      };
      const diffRow = h('div', { class: 'setup-grid' });
      for (const [id, d] of Object.entries(DIFFICULTIES)) {
        const lives = startingLives(id as Difficulty, this.state.players.length);
        const note = `${lives} ${lives === 1 ? 'life' : 'lives'} · ${d.blurb}`;
        diffRow.append(h('div', { class: `choice${st.difficulty === id ? ' on' : ''}${isChooser ? '' : ' locked'}`, onclick: () => set({ difficulty: id as GameSettings['difficulty'] }) }, h('div', { class: 't' }, d.label), h('div', { class: 'd' }, note)));
      }
      const modeRow = h('div', { class: 'setup-grid', style: { gridTemplateColumns: 'repeat(4, 1fr)' } });
      for (const [id, m] of Object.entries(RACE_MODES)) {
        modeRow.append(h('div', { class: `choice${st.raceMode === id ? ' on' : ''}${isChooser ? '' : ' locked'}`, onclick: () => set({ raceMode: id as GameSettings['raceMode'] }) }, h('div', { class: 't' }, m.label), h('div', { class: 'd' }, m.blurb)));
      }
      const endRow = h('div', { class: 'setup-grid', style: { gridTemplateColumns: 'repeat(2, 1fr)' } });
      endRow.append(
        h('div', { class: `choice${!st.endless ? ' on' : ''}${isChooser ? '' : ' locked'}`, onclick: () => set({ endless: false }) }, h('div', { class: 't' }, 'Classic'), h('div', { class: 'd' }, '40 waves, ending with the Winter Tyrant')),
        h('div', { class: `choice${st.endless ? ' on' : ''}${isChooser ? '' : ' locked'}`, onclick: () => set({ endless: true }) }, h('div', { class: 't' }, 'Endless'), h('div', { class: 'd' }, 'Keep going after wave 40 — how far can you get?')),
      );
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
      isChooser ? h('button', { class: 'btn primary big', onclick: () => this.view.setupDone() }, 'Lock in & start') : h('span', { class: 'muted' }, 'Get ready to pick a race!'),
    );
    this.setupModal = openModal(h('div', null, h('h2', null, 'The rules of the north'), h('div', { class: 'sub' }, 'Before the first wave, the rules are set. If the timer runs out, it\'s Normal · All Pick.'), body, foot), {
      dismissable: false,
      soft: true,
      onClose: () => {
        this.setupModal = null;
        this.setupEls = null;
      },
    });
    const tick = () => {
      if (!this.setupModal) return;
      countdown.textContent = `${Math.ceil(this.state.wave.countdown)}s`;
      requestAnimationFrame(tick);
    };
    tick();
    this.setupEls = { refresh };
  }

  closeSetup(): void {
    this.setupModal?.close();
  }

  openGift(to: number): void {
    const s = this.state;
    const target = s.player(to);
    const me = s.me;
    if (!target || !me) return;
    const input = h('input', { type: 'number', min: 1, value: String(Math.max(1, Math.floor(me.gold / 4))), style: { width: '120px' } }) as HTMLInputElement;
    const send = (amount: number) => {
      this.view.gift(to, amount);
      m.close();
    };
    const m = openModal(
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

  openSettings(): void {
    const v = this.view;
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
          row('Show creep path', toggle(v.prefs.showPath, (on) => v.setPref('showPath', on))),
          row('Show build grid', toggle(v.prefs.showGrid, (on) => v.setPref('showGrid', on))),
          row('Scroll at screen edges', toggle(v.prefs.edgePan, (on) => v.setPref('edgePan', on))),
          row('High quality effects', toggle(v.prefs.hq, (on) => v.setPref('hq', on))),
          row('Tips in chat', toggle(v.prefs.tips, (on) => v.setPref('tips', on))),
        ),
      ),
      { narrow: true },
    );
  }

  showEnd(victory: boolean, stats: EndStats, isHost: boolean): void {
    hideTooltip();
    this.endModal?.close();
    const rows = stats.players.map((p) =>
      h(
        'tr',
        null,
        h('td', null, h('span', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: PLAYER_COLORS[p.color].hex, marginRight: '8px' } }), p.name),
        h('td', null, p.races.map((r) => RACE_BY_ID[r]?.name).join(' + ') || '—'),
        h('td', null, String(p.kills)),
        h('td', { style: { color: '#ff9aa4' } }, String(p.leaks)),
        h('td', null, fmt(p.damage)),
        h('td', { class: 'gold-text' }, fmt(p.goldEarned)),
        h('td', null, p.mvpTower ?? '—'),
      ),
    );
    const mins = Math.floor(stats.duration / 60);
    this.endModal = openModal(
      h(
        'div',
        null,
        h('h2', { style: { color: victory ? '#9cf09f' : '#ff9aa4', fontSize: '34px' } }, victory ? 'Victory!' : 'The north has fallen'),
        h('div', { class: 'sub' }, victory ? `You held the line against all ${stats.wave} waves with ${stats.lives} lives to spare. (${mins} min)` : `You reached wave ${stats.wave}. (${mins} min) Try another race combination!`),
        h('table', { class: 'end-table' }, h('thead', null, h('tr', null, ...['Player', 'Races', 'Kills', 'Leaks', 'Damage', 'Gold', 'MVP tower'].map((t) => h('th', null, t)))), h('tbody', null, rows)),
        h(
          'div',
          { class: 'field-row', style: { justifyContent: 'flex-end' } },
          h('button', { class: 'btn', onclick: () => this.endModal?.close() }, 'Look around'),
          isHost ? h('button', { class: 'btn primary', onclick: () => this.view.playAgain() }, 'Back to lobby') : h('span', { class: 'muted', style: { alignSelf: 'center' } }, 'The host can take everyone back to the lobby.'),
          h('button', { class: 'btn danger', onclick: () => this.view.leave() }, 'Main menu'),
        ),
      ),
      { dismissable: true },
    );
  }

  closeAll(): void {
    this.raceModal?.close();
    this.setupModal?.close();
    this.endModal?.close();
  }
}
