
import { towerMeta } from '../art/towers';
import { audio } from '../audio';
import { LANE_H, LANE_MARGIN_X, LANE_W, laneOriginY, PLAYER_COLORS } from '../../shared/constants';
import { RACE_BY_ID, TOWERS } from '../../shared/data/races';
import { CELL_TOWER, LaneGrid } from '../../shared/grid';
import { type ChatLine, DIFFICULTIES, type EndStats, type FullState, type GameCommand, type GameEvent, type GameSettings, RACE_MODES, type Snapshot } from '../../shared/protocol';
import type { TargetMode, TowerDef } from '../../shared/types';
import { type Link, SPEEDS } from '../local';
import { toast } from '../ui/dom';
import { openHelp } from '../ui/help';
import { anyModalOpen } from '../ui/modal';
import { Effects } from './effects';
import { Fx, type Point } from './fx';
import { BUILD_KEYS, Hud } from './hud';
import { nearestLane, toLane, toWorld } from './layout';
import { type Ghost, Renderer, type ViewState } from './renderer';
import { ClientState, type CTower } from './state';
import { TipDeck } from './tips';

interface Prefs {
  showPath: boolean;
  showGrid: boolean;
  edgePan: boolean;
  hq: boolean;
  tips: boolean;
}

function loadPrefs(): Prefs {
  const d: Prefs = { showPath: true, showGrid: true, edgePan: false, hq: true, tips: true };
  try {
    return { ...d, ...JSON.parse(localStorage.getItem('winterward.prefs') ?? '{}') };
  } catch {
    return d;
  }
}

export class GameView {
  state: ClientState;
  renderer: Renderer;
  fx = new Fx();
  private effects: Effects;
  hud: Hud;
  selected = new Set<number>();
  hover = -1;
  buildDef: TowerDef | null = null;
  prefs = loadPrefs();
  private tips = new TipDeck();
  /** Cells to highlight (set by the tutorial coach). */
  marks: ViewState['marks'] = [];
  /** Called every frame, e.g. by the tutorial coach. */
  frameHooks: ((now: number) => void)[] = [];
  private ghost: Ghost | null = null;
  private ghostKey = '';
  private pings: ViewState['pings'] = [];
  private keys = new Set<string>();
  private mouse = { x: 0, y: 0, in: false };
  private drag: { button: number; x: number; y: number; camX: number; camY: number; moved: boolean } | null = null;
  private box: ViewState['box'] = null;
  private raf = 0;
  private lastFrame = performance.now();
  private hudTimer = 0;
  private miniTimer = 0;
  private alive = true;
  /** The last wave seen starting, so "cleared" is only announced for waves actually played. */
  private startedWave = 0;
  private cleanup: (() => void)[] = [];
  private lastClick = { t: 0, id: -1 };

  constructor(
    readonly link: Link,
    private canvas: HTMLCanvasElement,
    hudRoot: HTMLElement,
    full: FullState,
    you: number,
    private isHost: () => boolean,
  ) {
    this.state = new ClientState(full, you);
    if (full.wave.phase === 'wave') this.startedWave = full.wave.n;
    this.renderer = new Renderer(canvas, this.state, this.fx);
    this.effects = new Effects(this.state, this.fx, this.renderer, () => this.alive);
    this.hud = new Hud(hudRoot, this);
    this.fx.quality = this.prefs.hq ? 1 : 0.4;
    this.state.onEvent = (ev) => this.onEvent(ev);
    this.state.onSold = (t, refund) => this.onSold(t, refund);
    this.renderer.resize();
    this.renderer.focusLane(you >= 0 ? this.state.myLane : 0);
    this.bindInput();
    if (this.state.wave.phase === 'setup') this.hud.openSetup();
    else if (this.state.me && this.state.me.races.length === 0 && this.state.me.lumber > 0 && full.settings.raceMode !== 'random') this.hud.openRacePicker();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  destroy(): void {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    for (const fn of this.cleanup) fn();
    this.hud.closeAll();
  }

  // ───────────────────────────────────────── network
  onSnapshot(s: Snapshot): void {
    this.state.applySnapshot(s, performance.now());
  }

  onChat(line: ChatLine): void {
    this.hud.chat.add(line);
  }

  onPing(from: number, lane: number, x: number, y: number): void {
    const p = this.state.player(from);
    const w = toWorld(lane, x, y);
    this.pings.push({ x: w.x, y: w.y, color: PLAYER_COLORS[p?.color ?? 0].hex, start: performance.now() / 1000 });
    audio.play('click', 0.6);
  }

  onCmdError(message: string): void {
    toast(message, 'error', 1800);
    audio.play('error', 0.5);
  }

  onGameOver(victory: boolean, stats: EndStats): void {
    audio.play(victory ? 'victory' : 'defeat');
    const local = this.link.local;
    setTimeout(() => this.alive && this.hud.showEnd(victory, stats, this.isHost(), local?.endActions(victory, stats), local?.endNote(victory, stats)), victory ? 600 : 1200);
  }

  togglePause(): void {
    const local = this.link.local;
    if (!local || this.state.wave.phase === 'victory' || this.state.wave.phase === 'defeat') return;
    local.togglePause();
    audio.play('click', 0.5);
    this.hud.refreshLocalControls();
  }

  cycleSpeed(): void {
    const local = this.link.local;
    if (!local) return;
    local.setSpeed(SPEEDS[(SPEEDS.indexOf(local.speed) + 1) % SPEEDS.length]);
    audio.play('click', 0.5);
    this.hud.refreshLocalControls();
  }

  send(cmd: GameCommand): void {
    this.link.send({ type: 'cmd', cmd });
  }

  // ───────────────────────────────────────── actions (from HUD / input)
  startBuild(defId: string): void {
    const def = TOWERS[defId];
    if (!def || this.state.you < 0) return;
    const me = this.state.me!;
    const cost = this.state.costOf(def);
    if (me.gold < cost) {
      toast(`Not enough gold (${cost} needed)`, 'error', 1500);
      audio.play('error', 0.5);
      return;
    }
    if (def.lumber && me.lumber < def.lumber) {
      toast('Legends cost 1 lumber', 'error', 1500);
      return;
    }
    this.buildDef = this.buildDef?.id === defId ? null : def;
    this.selected.clear();
    this.ghostKey = '';
    audio.play('click', 0.4);
    this.hud.refreshBuildPanel(true);
  }

  cancelBuild(): void {
    this.buildDef = null;
    this.ghost = null;
    this.ghostKey = '';
    this.hud.refreshBuildPanel(true);
  }

  upgrade(ids: number[], to: string): void {
    const def = TOWERS[to];
    const me = this.state.me;
    if (!me) return;
    const n = Math.max(1, Math.min(ids.length, Math.floor(me.gold / def.cost)));
    if (me.gold < def.cost) {
      toast(`Not enough gold (${def.cost} needed)`, 'error', 1500);
      audio.play('error', 0.5);
      return;
    }
    this.send({ c: 'upgrade', ids: ids.slice(0, n), to });
  }

  sell(ids: number[]): void {
    if (!ids.length) return;
    this.send({ c: 'sell', ids });
    for (const id of ids) this.selected.delete(id);
  }

  setMode(ids: number[], mode: TargetMode): void {
    this.send({ c: 'target', ids, mode });
  }

  pickRace(race: string): void {
    this.send({ c: 'race', race });
  }

  toggleReady(): void {
    const me = this.state.me;
    if (!me || this.state.wave.phase !== 'build') return;
    this.send({ c: 'ready', value: !me.ready });
    me.ready = !me.ready;
    audio.play('click', 0.5);
  }

  setup(patch: Partial<GameSettings>): void {
    this.send({ c: 'setup', settings: patch });
  }

  setupDone(): void {
    this.send({ c: 'setupDone' });
  }

  gift(to: number, amount: number): void {
    if (!(amount > 0)) return;
    this.send({ c: 'gift', to, amount: Math.floor(amount) });
  }

  focusLane(lane: number): void {
    this.renderer.focusLane(lane);
  }

  minimapClick(e: MouseEvent, canvas: HTMLCanvasElement): void {
    const r = canvas.getBoundingClientRect();
    const p = this.renderer.minimapToWorld(canvas, ((e.clientX - r.left) / r.width) * canvas.width, ((e.clientY - r.top) / r.height) * canvas.height);
    this.renderer.cam.x = p.x;
    this.renderer.cam.y = p.y;
  }

  confirmLeave(): void {
    const over = this.state.wave.phase === 'victory' || this.state.wave.phase === 'defeat';
    const question = this.link.local ? 'Leave the game? This single-player game will end.' : 'Leave the game? Your towers keep fighting without you.';
    if (over || confirm(question)) this.leave();
  }

  leave(): void {
    this.link.send({ type: 'leave' });
  }

  playAgain(): void {
    this.link.send({ type: 'playAgain' });
  }

  setPref<K extends keyof Prefs>(k: K, v: Prefs[K]): void {
    this.prefs[k] = v;
    try {
      localStorage.setItem('winterward.prefs', JSON.stringify(this.prefs));
    } catch {
      /* ignore */
    }
    this.fx.quality = this.prefs.hq ? 1 : 0.4;
  }

  /** Old-school chat commands. */
  chatCommand(cmd: string, _args: string[]): boolean {
    switch (cmd) {
      case 'random':
        if (!this.state.me?.lumber) {
          toast('No lumber to spend.', 'error');
          return true;
        }
        this.pickRace('random');
        this.hud.closeRacePicker();
        return true;
      case 'ready':
        this.toggleReady();
        return true;
      case 'help':
        openHelp();
        return true;
      case 'zoom':
        this.renderer.cam.zoom = Math.max(this.renderer.cam.minZoom, Math.min(this.renderer.cam.maxZoom, Number(_args[0]) || 36));
        return true;
    }
    return false;
  }

  /** Game-flow announcements: waves, bonuses, races, gifts and the rules. */
  private onEvent(ev: GameEvent): void {
    if (this.effects.play(ev)) return;
    const s = this.state;
    switch (ev.e) {
      case 'wave': {
        if (ev.phase === 'wave') {
          this.startedWave = ev.n;
          const info = this.hud.waveInfo(ev.n);
          const boss = info?.creep.boss;
          this.hud.banner(`Wave ${ev.n}`, info ? `${info.creep.name}${info.title ? ` — ${info.title}` : ''}` : '', boss ? 'boss' : '');
          if (info?.hint) this.hud.chat.system(`Wave ${ev.n}: ${info.hint}`);
          audio.play(boss ? 'boss' : 'wave', 0.8);
        } else if (ev.phase === 'build' && ev.n > 0 && ev.n === this.startedWave) {
          toast(`Wave ${ev.n} cleared!`, 'good', 2000);
          if (ev.n < 15 || ev.n % 2 === 0) this.showTip(4000);
        }
        return;
      }
      case 'bonus': {
        if (ev.p !== s.you) return;
        if (ev.reason.startsWith('wave')) toast(`+${ev.gold} gold level bonus`, 'good', 1800);
        else if (ev.reason === 'interest') toast(`+${ev.gold} gold interest`, 'good', 1800);
        else if (ev.reason === 'early call') toast(`+${ev.gold} gold for calling early`, 'good', 1600);
        else if (ev.reason === 'random race') toast(`+${ev.gold} gold for going random`, 'good', 2000);
        return;
      }
      case 'race': {
        const p = s.player(ev.p);
        const race = RACE_BY_ID[ev.race];
        if (!p || !race) return;
        if (p.id === s.you) {
          toast(`You now command the ${race.name}!`, 'good', 2500);
          audio.play('upgrade', 0.5);
          this.hud.refreshBuildPanel(true);
        } else this.hud.chat.system(`${p.name} chose the ${race.name}.`);
        return;
      }
      case 'lumber':
        toast(`+1 lumber! Pick a new race or build a Legend.`, 'good', 3500);
        audio.play('lumber', 0.7);
        return;
      case 'rally':
        this.hud.banner('Second Wind!', `The line holds: ${ev.lives} lives restored`, 'boss');
        this.hud.chat.system(`Second Wind! The team rallies with ${ev.lives} lives. It only happens once.`);
        audio.play('lumber', 0.9);
        return;
      case 'gift': {
        const a = s.player(ev.from);
        const b = s.player(ev.to);
        if (ev.to === s.you) toast(`${a?.name} sent you ${ev.amount} gold!`, 'good', 3000);
        else this.hud.chat.system(`${a?.name} sent ${b?.name} ${ev.amount} gold.`);
        return;
      }
      case 'setup': {
        if (!ev.done) {
          this.hud.openSetup();
          return;
        }
        this.hud.closeSetup();
        const st = ev.settings;
        const rules = `${DIFFICULTIES[st.difficulty].label} · ${RACE_MODES[st.raceMode].label}${st.endless ? ' · Endless' : ''} · ${ev.lives} ${ev.lives === 1 ? 'life' : 'lives'}`;
        this.hud.banner('The march begins', rules);
        this.hud.chat.system(`Rules: ${rules}.`);
        audio.play('wave', 0.6);
        if ((st.raceMode === 'pick' || st.raceMode === 'double') && s.you >= 0) setTimeout(() => this.alive && this.state.me && this.state.me.lumber > 0 && this.hud.openRacePicker(), 400);
        this.showTip(9000);
        return;
      }
    }
  }

  private onSold(t: CTower, refund: number): void {
    this.effects.sold(t, refund);
    this.selected.delete(t.id);
  }

  private showTip(delayMs: number): void {
    if (!this.prefs.tips || this.state.you < 0) return;
    setTimeout(() => {
      if (this.alive && this.prefs.tips) this.hud.chat.tip(this.tips.next());
    }, delayMs);
  }

  // ───────────────────────────────────────── frame loop
  private frame(t: number): void {
    if (!this.alive) return;
    this.raf = requestAnimationFrame((tt) => this.frame(tt));
    const dt = Math.min(0.1, (t - this.lastFrame) / 1000);
    this.lastFrame = t;
    const now = t / 1000;
    this.renderer.resize();
    this.state.update(t, dt);
    this.fx.update(dt, now);
    this.updateCamera(dt);
    this.updateGhost();
    this.updateHover();
    this.pings = this.pings.filter((p) => now - p.start < 2.5);
    for (const id of [...this.selected]) if (!this.state.towers.has(id)) this.selected.delete(id);
    const view: ViewState = {
      selected: this.selected,
      hover: this.hover,
      ghost: this.ghost,
      box: this.box,
      pings: this.pings,
      marks: this.marks,
      showPath: this.prefs.showPath,
      showGrid: this.prefs.showGrid && !!this.buildDef,
    };
    this.renderer.render(now, dt, view);
    for (const hook of this.frameHooks) hook(now);
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.hud.update(now);
    }
    this.miniTimer -= dt;
    if (this.miniTimer <= 0) {
      this.miniTimer = 0.12;
      this.sizeMinimap();
      this.renderer.drawMinimap(this.hud.minimap);
    }
  }

  private sizeMinimap(): void {
    const mm = this.hud.minimap;
    const lanes = this.state.laneOwners.length;
    const worldH = lanes * 30 + 6;
    const maxW = 190;
    const maxH = 230;
    const k = Math.min(maxW / 54, maxH / worldH);
    const w = Math.round(54 * k);
    const h = Math.round(worldH * k);
    if (mm.width !== w || mm.height !== h) {
      mm.width = w;
      mm.height = h;
      const chat = this.hud.chat.el;
      chat.style.bottom = `${h + 34}px`;
    }
  }

  private updateCamera(dt: number): void {
    const cam = this.renderer.cam;
    if (this.hud.chat.opened) return;
    const speed = (900 / cam.zoom) * dt;
    if (this.keys.has('arrowleft')) cam.x -= speed;
    if (this.keys.has('arrowright')) cam.x += speed;
    if (this.keys.has('arrowup')) cam.y -= speed;
    if (this.keys.has('arrowdown')) cam.y += speed;
    if (this.prefs.edgePan && this.mouse.in && !this.drag) {
      const m = 10;
      if (this.mouse.x < m) cam.x -= speed;
      if (this.mouse.x > cam.w - m) cam.x += speed;
      if (this.mouse.y < m) cam.y -= speed;
      if (this.mouse.y > cam.h - m) cam.y += speed;
    }
  }

  private mouseWorld(): Point {
    return this.renderer.cam.toWorld(this.mouse.x, this.mouse.y);
  }

  private updateGhost(): void {
    if (!this.buildDef || !this.mouse.in) {
      this.ghost = null;
      return;
    }
    const s = this.state;
    const w = this.mouseWorld();
    const lane = s.you >= 0 ? s.myLane : 0;
    const local = { x: w.x - LANE_MARGIN_X, y: w.y - laneOriginY(lane) };
    const gx = Math.round(local.x - 1);
    const gy = Math.round(local.y - 1);
    const key = `${lane},${gx},${gy},${s.grids[lane].version},${this.buildDef.id},${Math.floor(s.renderTime * 4)}`;
    if (key === this.ghostKey && this.ghost) return;
    this.ghostKey = key;
    const inLane = toLane(w.x, w.y, s.laneOwners.length);
    const grid = s.grids[lane];
    let ok = true;
    let reason = '';
    if (!inLane || inLane.lane !== lane) {
      ok = false;
      reason = 'Build in your own lane';
    } else {
      const occ = new Set<number>();
      for (const c of s.creeps.values()) {
        if (c.rlane !== lane || c.def.air || !s.isVisible(c)) continue;
        const cx = Math.floor(c.x);
        const cy = Math.floor(c.y);
        if (grid.inBounds(cx, cy)) occ.add(grid.idx(cx, cy));
      }
      const res = grid.canPlace(gx, gy, occ);
      ok = res.ok;
      if (!res.ok) reason = res.reason;
    }
    const clampX = Math.max(0, Math.min(LANE_W - 2, gx));
    const clampY = Math.max(0, Math.min(LANE_H - 2, gy));
    let path: number[] | null = null;
    let pathLen = grid.pathLength();
    const baseLen = pathLen;
    if (ok) {
      const tmp = new LaneGrid();
      tmp.cells.set(grid.cells);
      tmp.setFootprint(gx, gy, CELL_TOWER);
      tmp.recompute();
      path = tmp.tracePath(tmp.spawnCells[Math.floor(tmp.spawnCells.length / 2)]);
      pathLen = tmp.pathLength();
    }
    this.ghost = { def: this.buildDef, lane, x: ok ? gx : clampX, y: ok ? gy : clampY, ok, reason, path, pathLen, baseLen };
  }

  private updateHover(): void {
    if (!this.mouse.in || this.buildDef) {
      this.hover = -1;
      return;
    }
    this.hover = this.towerAt(this.mouseWorld());
  }

  private towerAt(w: Point): number {
    const s = this.state;
    let best = -1;
    let bestD = Infinity;
    for (const t of s.towers.values()) {
      const p = toWorld(t.lane, t.x + 1, t.y + 1);
      const m = towerMeta(t.tdef);
      if (w.x < p.x - 1 || w.x > p.x + 1) continue;
      if (w.y > p.y + 1 || w.y < p.y - Math.max(1, m.muzzle + 0.3)) continue;
      const d = Math.abs(w.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = t.id;
      }
    }
    return best;
  }

  // ───────────────────────────────────────── input
  private bindInput(): void {
    const c = this.canvas;
    const on = <K extends keyof WindowEventMap>(target: Window | HTMLElement, ev: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      target.addEventListener(ev, fn as EventListener, opts);
      this.cleanup.push(() => target.removeEventListener(ev, fn as EventListener, opts));
    };
    on(c, 'contextmenu', (e) => e.preventDefault());
    on(c, 'mousemove', (e) => {
      this.mouse.x = e.offsetX;
      this.mouse.y = e.offsetY;
      this.mouse.in = true;
      if (this.drag) {
        const dx = e.clientX - this.drag.x;
        const dy = e.clientY - this.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) this.drag.moved = true;
        if (this.drag.button !== 0) {
          const cam = this.renderer.cam;
          cam.x = this.drag.camX - dx / cam.zoom;
          cam.y = this.drag.camY - dy / cam.zoom;
        } else if (this.drag.moved && !this.buildDef) {
          this.box = { x0: this.drag.x - c.getBoundingClientRect().left, y0: this.drag.y - c.getBoundingClientRect().top, x1: e.offsetX, y1: e.offsetY };
        }
      }
    });
    on(c, 'mouseleave', () => (this.mouse.in = false));
    on(c, 'mousedown', (e) => {
      c.focus();
      const cam = this.renderer.cam;
      this.drag = { button: e.button, x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y, moved: false };
      if (e.button === 2 && this.buildDef) this.cancelBuild();
    });
    on(window, 'mouseup', (e) => {
      const d = this.drag;
      this.drag = null;
      if (!d) return;
      if (d.button === 2 && !d.moved) {
        this.cancelBuild();
        this.selected.clear();
        return;
      }
      if (d.button !== 0) return;
      if (this.box) {
        this.finishBox(e.shiftKey);
        this.box = null;
        return;
      }
      if (d.moved) return;
      this.leftClick(e);
    });
    on(c, 'wheel', (e) => {
      e.preventDefault();
      const cam = this.renderer.cam;
      const before = cam.toWorld(e.offsetX, e.offsetY);
      const f = Math.exp(-e.deltaY * 0.0015);
      cam.zoom = Math.max(cam.minZoom, Math.min(cam.maxZoom, cam.zoom * f));
      const after = cam.toWorld(e.offsetX, e.offsetY);
      cam.x += before.x - after.x;
      cam.y += before.y - after.y;
    }, { passive: false });
    on(window, 'keydown', (e) => this.keyDown(e));
    on(window, 'keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    on(window, 'blur', () => this.keys.clear());
  }

  private leftClick(e: MouseEvent): void {
    const s = this.state;
    const w = this.mouseWorld();
    if (e.altKey) {
      const lane = nearestLane(w.y, s.laneOwners.length);
      this.link.send({ type: 'ping', lane, x: w.x - LANE_MARGIN_X, y: w.y - laneOriginY(lane) });
      return;
    }
    if (this.buildDef) {
      const g = this.ghost;
      if (!g) return;
      if (!g.ok) {
        toast(g.reason, 'error', 1400);
        audio.play('error', 0.4);
        return;
      }
      this.send({ c: 'build', tower: this.buildDef.id, x: g.x, y: g.y });
      const me = s.me;
      const cost = s.costOf(this.buildDef);
      const keep = e.shiftKey && this.buildDef.tier !== 5 && (me?.gold ?? 0) - cost >= cost;
      if (!keep) this.cancelBuild();
      return;
    }
    const id = this.towerAt(w);
    const now = performance.now();
    if (id >= 0) {
      if (now - this.lastClick.t < 350 && this.lastClick.id === id) {
        // double click: select all own towers of this type in view
        const def = s.towers.get(id)!.def;
        const cam = this.renderer.cam;
        const tl = cam.toWorld(0, 0);
        const br = cam.toWorld(cam.w, cam.h);
        this.selected.clear();
        for (const t of s.towers.values()) {
          if (t.def !== def || t.owner !== s.towers.get(id)!.owner) continue;
          const p = toWorld(t.lane, t.x + 1, t.y + 1);
          if (p.x >= tl.x && p.x <= br.x && p.y >= tl.y && p.y <= br.y) this.selected.add(t.id);
        }
      } else if (e.shiftKey) {
        if (this.selected.has(id)) this.selected.delete(id);
        else this.selected.add(id);
      } else {
        this.selected.clear();
        this.selected.add(id);
      }
      this.lastClick = { t: now, id };
      audio.play('click', 0.3);
    } else if (!e.shiftKey) this.selected.clear();
  }

  private finishBox(add: boolean): void {
    const b = this.box!;
    const cam = this.renderer.cam;
    const a = cam.toWorld(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1));
    const z = cam.toWorld(Math.max(b.x0, b.x1), Math.max(b.y0, b.y1));
    if (!add) this.selected.clear();
    const s = this.state;
    for (const t of s.towers.values()) {
      if (t.owner !== s.you && s.you >= 0) continue;
      const p = toWorld(t.lane, t.x + 1, t.y + 1);
      if (p.x >= a.x && p.x <= z.x && p.y >= a.y - 0.5 && p.y <= z.y + 0.5) this.selected.add(t.id);
    }
  }

  private keyDown(e: KeyboardEvent): void {
    if (this.hud.chat.opened) return;
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    const k = e.key.toLowerCase();
    if (k === 'enter') {
      e.preventDefault();
      this.hud.chat.open();
      return;
    }
    if (anyModalOpen()) return;
    this.keys.add(k);
    if (k === 'escape') {
      if (this.buildDef) this.cancelBuild();
      else this.selected.clear();
      return;
    }
    if (k === ' ') {
      e.preventDefault();
      this.renderer.focusLane(this.state.you >= 0 ? this.state.myLane : 0);
      return;
    }
    if (k === 'f1' || k === 'h') {
      e.preventDefault();
      openHelp();
      return;
    }
    if (k === 'g') {
      this.toggleReady();
      return;
    }
    if (k === 'p' && this.link.local) {
      this.togglePause();
      return;
    }
    if (k === 'f' && this.link.local) {
      this.cycleSpeed();
      return;
    }
    if (k === 'l') {
      this.hud.openRacePicker();
      return;
    }
    if (k === 'x' || k === 'delete') {
      const mine = [...this.selected].filter((id) => this.state.towers.get(id)?.owner === this.state.you);
      if (mine.length) this.sell(mine);
      return;
    }
    if (BUILD_KEYS.includes(k)) {
      e.preventDefault();
      if (this.selected.size > 0 && !this.buildDef) {
        this.hud.refreshSelection(true);
        this.hud.selectionKeys.find((s) => s.key === k)?.action();
      } else {
        this.hud.refreshBuildPanel(true);
        this.hud.buildButtons.find((b) => b.key === k)?.action();
      }
    }
  }
}

