// Traces the boss of a given wave in a solo bot game.
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';
import type { Difficulty } from '../src/shared/protocol';

const race = process.argv[2] ?? 'prism';
const target = Number(process.argv[3] ?? 30);
const difficulty = (process.argv[4] ?? 'casual') as Difficulty;
const seed = Number(process.argv[5] ?? 1);
const game = new Game({ difficulty, raceMode: 'pick', endless: false }, [{ id: 0, name: 'Bot', color: 0, isBot: true }], seed, { skipSetup: true });
const bot = new Bot(0, seed, [race]);
let next = 0;
while (!game.over && game.time < 8000 && game.wave <= target + 1) {
  bot.update(game);
  game.step();
  game.drainEvents();
  if (game.wave < target) continue;
  const boss = [...game.creeps.values()].find((c) => c.def.boss);
  if (boss && game.time >= next) {
    next = game.time + 4;
    let inRange = 0;
    for (const t of game.towers.values()) {
      const r = t.def.attack?.range ?? 0;
      if ((t.cx - boss.x) ** 2 + (t.cy - boss.y) ** 2 <= r * r) inRange++;
    }
    console.log(`t=${game.time.toFixed(1)} wave ${game.wave} ${boss.def.name} hp ${Math.round(boss.hp)}/${boss.maxHp} shield ${Math.round(boss.shield)} pos ${boss.x.toFixed(1)},${boss.y.toFixed(1)} lane ${boss.lane} visits ${boss.visits} incoming ${Math.round(boss.incoming)} towersInRange ${inRange}`);
  }
}
