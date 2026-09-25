// Early-game check: a bot that keeps building vs one that stops after spending its starting gold.
//   npx tsx scripts/debug-lazy.ts [race] [difficulty]
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';
import type { Difficulty } from '../src/shared/protocol';

const race = process.argv[2] ?? 'frost';
const difficulty = (process.argv[3] ?? 'normal') as Difficulty;
for (const lazy of process.argv.includes('--lazy') ? [false, true] : [false]) {
  const lost: number[] = [];
  for (let seed = 1; seed <= 6; seed++) {
    const game = new Game({ difficulty, raceMode: 'pick', endless: false }, [{ id: 0, name: 'Bot', color: 0, isBot: true }], seed, { skipSetup: true });
    const bot = new Bot(0, seed, [race]);
    const start = game.lives;
    while (!game.over && game.wave <= 6) {
      // the lazy player only builds before wave 1, then idles through wave 6
      if (!lazy || game.wave === 0) bot.update(game);
      else game.player(0)!.ready = true;
      game.step();
      game.drainEvents();
    }
    lost.push(start - game.lives);
  }
  console.log(`${race} ${difficulty} ${lazy ? 'stops building' : 'keeps building'}: lives lost by wave 6 = [${lost.join(' ')}] of ${new Game({ difficulty, raceMode: 'pick', endless: false }, [{ id: 0, name: 'x', color: 0, isBot: true }], 1, { skipSetup: true }).lives}`);
}
