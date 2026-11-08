// Saved single-player games: the simulation is deterministic, so a game is its seed, its starting
// options and the commands it received, each with the tick it arrived on. Playing those commands
// into a fresh game at the same ticks rebuilds it exactly.
import type { GameCommand } from '../protocol';
import type { Bot } from './bot';
import type { Game } from './game';

/** A command as [tick, player, command]: it arrived after `tick` simulation steps. */
export type JournalEntry = [number, number, GameCommand];

/**
 * Fast-forwards a fresh game (built with the same seed and options) through recorded commands,
 * a slice at a time so a browser stays responsive: call `run` until it returns true.
 */
export class Replay {
  private next = 0;

  constructor(
    private readonly game: Game,
    private readonly bots: Bot[],
    private readonly entries: JournalEntry[],
    /** The tick to stop at: where the game was saved. */
    readonly target: number,
  ) {}

  get progress(): number {
    return this.target > 0 ? Math.min(1, this.game.tick / this.target) : 1;
  }

  /** Runs at most `maxSteps` simulation steps. True once the game is back where it was saved. */
  run(maxSteps: number): boolean {
    for (let n = 0; n < maxSteps && this.game.tick < this.target && !this.game.over; n++) {
      this.applyDue();
      // the same order as the live runner: commands, bots, then the step
      for (const b of this.bots) b.update(this.game);
      this.game.step();
      this.game.drainEvents();
    }
    if (this.game.tick < this.target && !this.game.over) return false;
    this.applyDue();
    this.game.drainEvents();
    return true;
  }

  private applyDue(): void {
    while (this.next < this.entries.length && this.entries[this.next][0] <= this.game.tick) {
      const [, player, cmd] = this.entries[this.next++];
      this.game.command(player, cmd);
    }
  }
}
