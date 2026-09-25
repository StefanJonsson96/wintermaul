// Plays solo bot games and reports how the final boss fares (HP left when it leaks).
//   npx tsx scripts/debug-boss.ts <race> [difficulty] [seed]
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';
import type { Difficulty } from '../src/shared/protocol';
import { baseHp, CREEPS } from '../src/shared/data/waves';

// optional: TYRANT=15 sets the final boss to 15x a normal wave-40 creep
if (process.env.TYRANT) CREEPS.w40.hp = Math.round(baseHp(40) * Number(process.env.TYRANT));

const race = process.argv[2] ?? 'prism';
const difficulty = (process.argv[3] ?? 'casual') as Difficulty;
const seed = Number(process.argv[4] ?? 1);
const game = new Game({ difficulty, raceMode: 'pick', endless: false }, [{ id: 0, name: 'Bot', color: 0, isBot: true }], seed, { skipSetup: true });
const bot = new Bot(0, seed, [race]);
while (!game.over && game.time < 8000) {
  bot.update(game);
  game.step();
  for (const e of game.drainEvents()) {
    if (e.e === 'leak') {
      const c = game.creeps.get(e.id);
      if (c?.def.boss) console.log(`wave ${game.wave}: ${c.def.name} leaked with ${Math.round(c.hp)}/${c.maxHp} hp (${((100 * c.hp) / c.maxHp).toFixed(0)}%), cost ${e.cost}, escaped ${e.escaped}`);
    }
    if (e.e === 'die') {
      const c = game.creeps.get(e.id);
      if (c?.def.boss) console.log(`wave ${game.wave}: ${c.def.name} slain`);
    }
  }
}
console.log(`result: ${game.phase} at wave ${game.wave}, lives ${game.lives}`);
