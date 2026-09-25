import { SNAPSHOT_EVERY, TICK_RATE } from '../constants';
import { TOWERS } from '../data/races';
import type { EndStats, Snapshot } from '../protocol';
import type { Bot } from './bot';
import type { Game } from './game';

const DT = 1 / TICK_RATE;

/**
 * Drives a Game in real time: fixed simulation steps, bots, snapshots every few ticks and a
 * speed multiplier (0 pauses). Used by the server rooms and by single-player games in the browser.
 */
export class GameRunner {
  private acc = 0;
  private _speed = 1;

  constructor(
    readonly game: Game,
    readonly bots: Bot[],
    private readonly emit: (s: Snapshot) => void,
    private readonly onOver: () => void,
  ) {}

  get speed(): number {
    return this._speed;
  }

  /** Changes the game speed and tells clients right away (so a pause freezes their clocks too). */
  setSpeed(speed: number): void {
    this._speed = Math.max(0, Math.min(8, speed));
    this.emit(this.snapshot());
  }

  /** Advances the game by `elapsedMs` of wall-clock time. */
  advance(elapsedMs: number): void {
    if (this.game.over || this._speed === 0) return;
    this.acc += (Math.min(250, elapsedMs) / 1000) * this._speed;
    let steps = 0;
    while (this.acc >= DT && steps < 5 * Math.ceil(this._speed)) {
      this.acc -= DT;
      steps++;
      for (const b of this.bots) b.update(this.game);
      this.game.step();
      if (this.game.tick % SNAPSHOT_EVERY === 0 || this.game.over) this.emit(this.snapshot());
      if (this.game.over) {
        this.onOver();
        break;
      }
    }
  }

  snapshot(): Snapshot {
    const s = this.game.snapshot();
    if (this._speed !== 1) s.sp = this._speed;
    return s;
  }
}

/** Scoreboard for the end screen. */
export function endStats(g: Game): EndStats {
  return {
    wave: g.wave,
    lives: Math.max(0, g.lives),
    duration: g.time,
    players: g.players.map((p) => {
      let mvp: string | null = null;
      let best = -1;
      for (const t of g.towers.values()) {
        if (t.owner === p.id && t.damage > best) {
          best = t.damage;
          mvp = TOWERS[t.def.id].name;
        }
      }
      return { id: p.id, name: p.name, color: p.color, races: p.races, kills: p.kills, leaks: p.leaks, damage: Math.round(p.damage), goldEarned: Math.round(p.goldEarned), mvpTower: mvp };
    }),
  };
}
