import type { ChatLine, ClientMsg, EndStats, GameSettings, ServerMsg } from '../shared/protocol';
import { Bot } from '../shared/sim/bot';
import { Game, type GameRules } from '../shared/sim/game';
import { type JournalEntry, Replay } from '../shared/sim/replay';
import { VERSION } from '../shared/version';
import type { GameView } from './game/view';
import { endStats, GameRunner } from '../shared/sim/runner';
import { clearGame, type SavedGame, type SavedKind, storeGame } from './saved';

/** What a game view needs from its connection: a server socket or a game in the browser. */
export interface Link {
  send(msg: ClientMsg): void;
  /** Present for single-player games simulated locally (they can pause and change speed). */
  readonly local?: LocalGame;
}

export interface EndAction {
  label: string;
  kind?: 'primary' | 'danger';
  run: () => void;
}

export interface LocalOptions {
  mode: 'solo' | 'tutorial' | 'campaign';
  settings: GameSettings;
  name: string;
  bots?: { name: string; races?: string[] }[];
  /** Skip the rules dialog (tutorial and campaign stages fix the rules). */
  skipSetup?: boolean;
  rules?: GameRules;
  /** Called with the game view once the game is on screen (tutorial coach, stage banners). */
  attach?: (view: GameView, local: LocalGame) => void;
  /** Last chance to adjust a fresh game: stage modifiers, talents, scripted tutorials. */
  prepare?: (game: Game) => void;
  /** Buttons on the end screen; defaults to play again / main menu. */
  endActions?: (victory: boolean, stats: EndStats, local: LocalGame) => EndAction[];
  /** Extra panel on the end screen (campaign rewards). */
  endNote?: (victory: boolean, stats: EndStats) => HTMLElement | undefined;
  onGameOver?: (victory: boolean, stats: EndStats, game: Game) => void;
  /** Saves the game as it goes, so it can be continued after the page closes. */
  save?: { kind: SavedKind; title: string };
  /** A fixed seed, instead of a random one. */
  seed?: number;
}

export const SPEEDS = [1, 2, 3];

/** How often a running game is written to storage (it is also saved when the tab is hidden). */
const SAVE_EVERY_MS = 5000;

/**
 * A single-player game simulated in the browser. It speaks the same protocol as the server, so
 * the game view cannot tell the difference, and it can pause and fast-forward.
 */
export class LocalGame implements Link {
  readonly local = this;
  game!: Game;
  private runner!: GameRunner;
  private timer = 0;
  private last = 0;
  private wantedSpeed = 1;
  private userPaused = false;
  private hiddenPaused = false;
  private onVisibility = () => {
    this.applyPause();
    if (document.hidden) this.saveNow();
  };
  private onPageHide = () => this.saveNow();
  /** Where leaving this game goes. */
  exitTo: 'menu' | 'campaign';
  private seed = 0;
  /** Every command the player gave, with its tick: with the seed, enough to rebuild the game. */
  private journal: JournalEntry[] = [];
  private saved = { tick: -1, cmds: -1, at: 0 };
  /** A testing shortcut changed the game outside its commands, so it can no longer be saved. */
  private tainted = false;

  /** False once developer commands were used: such a game earns no achievements. */
  get fair(): boolean {
    return !this.tainted;
  }

  constructor(
    private readonly deliver: (msg: ServerMsg) => void,
    readonly opts: LocalOptions,
  ) {
    this.exitTo = opts.mode === 'campaign' ? 'campaign' : 'menu';
  }

  get mode(): LocalOptions['mode'] {
    return this.opts.mode;
  }

  get speed(): number {
    return this.wantedSpeed;
  }

  get paused(): boolean {
    return this.userPaused;
  }

  start(): void {
    this.setUp(this.opts.seed ?? (Math.random() * 2 ** 31) | 0);
    this.launch(false);
  }

  /** Rebuilds a saved game by replaying it a slice at a time, then shows it paused. */
  async resume(saved: SavedGame, onProgress?: (done: number) => void): Promise<void> {
    this.setUp(saved.seed);
    const replay = new Replay(this.game, this.runner.bots, saved.cmds, saved.tick);
    while (!replay.run(2000)) {
      onProgress?.(replay.progress);
      await new Promise((r) => setTimeout(r, 0));
    }
    this.journal = saved.cmds.slice();
    this.launch(true);
    const g = this.game;
    this.system(g.phase === 'wave' ? `Welcome back! The game is paused during wave ${g.wave}.` : `Welcome back! The game is paused before wave ${g.wave + 1}.`);
  }

  private setUp(seed: number): void {
    this.stop();
    this.seed = seed;
    this.journal = [];
    this.saved = { tick: -1, cmds: -1, at: 0 };
    this.tainted = false;
    const bots = this.opts.bots ?? [];
    const players = [{ id: 0, name: this.opts.name, color: 0, isBot: false }, ...bots.map((b, i) => ({ id: i + 1, name: b.name, color: i + 1, isBot: true }))];
    this.game = new Game({ ...this.opts.settings }, players, seed, { skipSetup: this.opts.skipSetup, rules: this.opts.rules });
    this.opts.prepare?.(this.game);
    const brains = bots.map((b, i) => new Bot(i + 1, seed + i + 1, b.races));
    this.runner = new GameRunner(this.game, brains, (s) => this.deliver({ type: 'snap', s }), () => this.finish());
  }

  private launch(paused: boolean): void {
    this.userPaused = paused;
    this.deliver({ type: 'start', you: 0, state: this.game.fullState() });
    this.applyPause();
    this.last = performance.now();
    this.timer = window.setInterval(() => this.tick(), 16);
    document.addEventListener('visibilitychange', this.onVisibility);
    addEventListener('pagehide', this.onPageHide);
    this.saveNow();
  }

  stop(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
    document.removeEventListener('visibilitychange', this.onVisibility);
    removeEventListener('pagehide', this.onPageHide);
  }

  /** Whether this game is kept for Continue when the player leaves. */
  get saves(): boolean {
    return !!this.opts.save && !this.tainted;
  }

  /** Writes the game to storage, unless nothing changed since the last time. */
  private saveNow(): void {
    this.saved.at = performance.now();
    const spec = this.opts.save;
    const g = this.game;
    if (!spec || this.tainted || !g || g.over) return;
    if (g.tick === this.saved.tick && this.journal.length === this.saved.cmds) return;
    this.saved.tick = g.tick;
    this.saved.cmds = this.journal.length;
    // the wave being fought, or the one coming next
    const wave = g.phase === 'wave' ? g.wave : g.wave + 1;
    storeGame({ version: VERSION, kind: spec.kind, seed: this.seed, tick: g.tick, cmds: this.journal, title: spec.title, wave, lives: Math.max(0, g.lives), savedAt: Date.now() });
  }

  setSpeed(speed: number): void {
    this.wantedSpeed = speed;
    this.applyPause();
  }

  togglePause(): void {
    this.userPaused = !this.userPaused;
    this.applyPause();
  }

  /** Game speed actually in effect: paused by the player, or while the tab is hidden. */
  private applyPause(): void {
    if (!this.runner) return;
    this.hiddenPaused = document.hidden;
    const speed = this.userPaused || this.hiddenPaused ? 0 : this.wantedSpeed;
    if (speed !== this.runner.speed) this.runner.setSpeed(speed);
  }

  private tick(): void {
    const now = performance.now();
    this.runner.advance(now - this.last);
    this.last = now;
    if (now - this.saved.at > SAVE_EVERY_MS) this.saveNow();
  }

  private finish(): void {
    if (this.opts.save) clearGame();
    const victory = this.game.phase === 'victory';
    const stats = endStats(this.game);
    this.opts.onGameOver?.(victory, stats, this.game);
    this.deliver({ type: 'gameOver', victory, stats });
  }

  endNote(victory: boolean, stats: EndStats): HTMLElement | undefined {
    return this.opts.endNote?.(victory, stats);
  }

  endActions(victory: boolean, stats: EndStats): EndAction[] {
    return (
      this.opts.endActions?.(victory, stats, this) ?? [
        { label: 'Play again', kind: 'primary', run: () => this.start() },
        { label: 'Main menu', kind: 'danger', run: () => this.send({ type: 'leave' }) },
      ]
    );
  }

  send(msg: ClientMsg): void {
    switch (msg.type) {
      case 'cmd': {
        this.journal.push([this.game.tick, 0, structuredClone(msg.cmd)]);
        const res = this.game.command(0, msg.cmd);
        if (!res.ok && res.error) this.deliver({ type: 'cmdError', message: res.error });
        // while paused nothing else would tell the view what just happened
        else if (this.runner.speed === 0) this.deliver({ type: 'snap', s: this.runner.snapshot() });
        return;
      }
      case 'chat': {
        const text = msg.text.trim().slice(0, 200);
        if (!text) return;
        if (text.startsWith('-') && this.devCommand(text)) return;
        this.say({ from: 0, name: this.opts.name, text, color: 0, t: Date.now() });
        return;
      }
      case 'ping':
        this.deliver({ type: 'ping', from: 0, lane: msg.lane, x: msg.x, y: msg.y });
        return;
      case 'playAgain':
        this.start();
        return;
      case 'leave':
        this.saveNow();
        this.stop();
        this.deliver({ type: 'left' });
        return;
    }
  }

  say(line: ChatLine): void {
    this.deliver({ type: 'chat', line });
  }

  system(text: string): void {
    this.say({ from: -1, name: '', text, color: -1, t: Date.now() });
  }

  /** Testing shortcuts, only in development builds. */
  private devCommand(text: string): boolean {
    if (!import.meta.env.DEV) return false;
    const [cmd, arg] = text.slice(1).split(/\s+/);
    const n = Number(arg);
    switch (cmd) {
      case 'gold':
        this.game.devGold(0, Number.isFinite(n) ? n : 1000);
        break;
      case 'lumber':
        this.game.devLumber(0, Number.isFinite(n) ? n : 1);
        break;
      case 'wave':
        this.game.devSkipTo(Number.isFinite(n) ? n : this.game.wave + 1);
        break;
      default:
        return false;
    }
    // the save could not replay this
    if (this.opts.save) clearGame();
    this.tainted = true;
    this.system(`[dev] ${text}`);
    return true;
  }
}
