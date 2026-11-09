import { describe, expect, it } from 'vitest';
import type { GameCommand, GameSettings } from '../src/shared/protocol';
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';
import { type JournalEntry, Replay } from '../src/shared/sim/replay';

const settings: GameSettings = { difficulty: 'normal', raceMode: 'pick', endless: false };

/** Everything about a game's state that later steps depend on, as one string. */
function fingerprint(g: Game): string {
  // definitions are shared data: compare them by id
  const isDef = (v: unknown, key: string) => !!v && typeof v === 'object' && key in v && 'id' in v;
  const byDef = (_k: string, v: unknown) => (isDef(v, 'upgrades') ? (v as { id: string }).id : v);
  const creepDef = (_k: string, v: unknown) => (isDef(v, 'armorType') ? (v as { id: string }).id : byDef(_k, v));
  return JSON.stringify({
    tick: g.tick,
    time: g.time,
    rng: g.rng,
    state: g.fullState(),
    creeps: JSON.parse(JSON.stringify([...g.creeps.values()], creepDef)),
    towers: JSON.parse(JSON.stringify([...g.towers.values()], byDef)),
    spawns: g.horde.spawnQueue,
    combat: JSON.parse(JSON.stringify(g.combat, (k, v) => (k === 'g' ? undefined : v))),
  });
}

/** Plays a game where a bot stands in for the human (whose commands are recorded) next to an AI ally. */
function playLive(seed: number, ticks: number, opts: { setup?: GameCommand[]; ally?: boolean } = {}) {
  const players = [{ id: 0, name: 'You', color: 0, isBot: false }, ...(opts.ally ? [{ id: 1, name: 'Ally', color: 1, isBot: true }] : [])];
  const game = new Game(settings, players, seed, { skipSetup: !opts.setup });
  const entries: JournalEntry[] = [];
  const command = game.command.bind(game);
  game.command = (p, cmd) => {
    if (p === 0) entries.push([game.tick, p, structuredClone(cmd)]);
    return command(p, cmd);
  };
  for (const cmd of opts.setup ?? []) game.command(0, cmd);
  const human = new Bot(0, seed + 100);
  const ally = opts.ally ? [new Bot(1, seed + 1)] : [];
  while (game.tick < ticks && !game.over) {
    human.update(game);
    for (const b of ally) b.update(game);
    game.step();
    game.drainEvents();
    // a few things a person would do between steps
    if (game.tick % 997 === 0) game.command(0, { c: 'ready', value: true });
    // and the shrine's last boon, a little after it is offered
    const omen = game.player(0)!.omen;
    if (omen && game.tick % 61 === 0) game.command(0, { c: 'omen', pick: omen[omen.length - 1] });
    if (game.tick % 1499 === 0) {
      const mine = [...game.towers.values()].filter((t) => t.owner === 0).map((t) => t.id);
      game.command(0, { c: 'target', ids: mine.slice(0, 3), mode: 'strong' });
    }
  }
  return { game, entries, players, ally: !!opts.ally };
}

function replayed(live: ReturnType<typeof playLive>, seed: number, slice = 700): Game {
  const game = new Game(settings, live.players, seed, { skipSetup: !live.entries.some((e) => e[2].c === 'setupDone') });
  const bots = live.ally ? [new Bot(1, seed + 1)] : [];
  const replay = new Replay(game, bots, live.entries, live.game.tick);
  let guard = 0;
  while (!replay.run(slice)) if (guard++ > 10_000) throw new Error('replay never finished');
  return game;
}

describe('saved games', () => {
  it('replaying the recorded commands rebuilds the game exactly', () => {
    const live = playLive(42, 20 * 60 * 8);
    expect(live.game.wave).toBeGreaterThan(4);
    expect(live.entries.length).toBeGreaterThan(20);
    // shrines came and boons were taken, through commands the replay repeats
    expect(live.game.player(0)!.boons.length).toBeGreaterThan(0);
    const game = replayed(live, 42);
    expect(game.tick).toBe(live.game.tick);
    expect(fingerprint(game)).toBe(fingerprint(live.game));
  });

  it('works with the rules dialog and an AI ally in the game', () => {
    const live = playLive(7, 20 * 60 * 6, {
      ally: true,
      setup: [
        { c: 'setup', settings: { difficulty: 'hard', raceMode: 'random' } },
        { c: 'setupDone' },
      ],
    });
    expect(live.game.settings.difficulty).toBe('hard');
    expect([...live.game.towers.values()].some((t) => t.owner === 1)).toBe(true);
    expect(fingerprint(replayed(live, 7, 333))).toBe(fingerprint(live.game));
  });

  it('a different seed gives a different game', () => {
    // the random race comes out different, so the recorded builds fail and the lane is lost
    const live = playLive(42, 20 * 60 * 3);
    expect(fingerprint(replayed(live, 43))).not.toBe(fingerprint(live.game));
  });
});
