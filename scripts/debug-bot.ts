// Plays one solo bot game and prints what the bot built at the start of each wave.
//   npx tsx scripts/debug-bot.ts stone [seed]
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';

const race = process.argv[2] ?? 'stone';
const seed = Number(process.argv[3] ?? 1);
const game = new Game({ difficulty: 'normal', raceMode: 'pick', endless: false }, [{ id: 0, name: 'Bot', color: 0, isBot: true }], seed, { skipSetup: true });
const bot = new Bot(0, seed, [race]);
let wave = -1;
let lives = game.lives;
while (!game.over && game.time < 6000) {
  bot.update(game);
  game.step();
  game.drainEvents();
  if (game.wave !== wave) {
    const p = game.players[0];
    const counts = new Map<string, number>();
    for (const t of game.towers.values()) counts.set(t.def.id, (counts.get(t.def.id) ?? 0) + 1);
    const list = [...counts].sort().map(([k, v]) => `${k}×${v}`).join(' ');
    console.log(`wave ${String(game.wave).padStart(2)} lives ${game.lives} (-${lives - game.lives}) gold ${Math.floor(p.gold)} races ${p.races} | ${list}`);
    wave = game.wave;
    lives = game.lives;
  }
}
console.log('final wave', game.wave, 'lives', game.lives);
