// Plays bot games on a run of daily challenges and prints the medal each one earns, to check that
// days are neither free nor hopeless. Bots cast no spells, so a person should do a little better.
//   npx tsx scripts/daily-balance.ts [first date] [days]
import { dailyFor, dayKey, MEDAL_NAMES, medalFor } from '../src/shared/daily';
import { RACES } from '../src/shared/data/races';
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';

const from = new Date(`${process.argv[2] ?? dayKey()}T12:00:00`);
const n = Number(process.argv[3] ?? 30);
const medals = [0, 0, 0, 0];
for (let i = 0; i < n; i++) {
  const day = new Date(from);
  day.setDate(day.getDate() + i);
  const d = dailyFor(dayKey(day));
  const pool = d.rules.races ?? RACES.map((r) => r.id);
  const init = [{ id: 0, name: 'B', color: 0, isBot: true }];
  const game = new Game({ difficulty: d.difficulty, raceMode: 'pick', endless: false, waves: d.waves }, init, d.seed, { skipSetup: true, rules: d.rules });
  const bot = new Bot(0, d.seed, [pool[d.seed % pool.length], pool[(d.seed >> 4) % pool.length]]);
  while (!game.over && game.time < 5000) {
    bot.update(game);
    game.step();
    game.drainEvents();
  }
  const victory = game.phase === 'victory';
  const m = medalFor(d, { victory, wave: game.wave, livesLost: game.maxLives - Math.max(0, game.lives) });
  medals[m]++;
  const twists = d.mutators.map((t) => t.name).join(', ');
  console.log(`${d.date}  ${d.waves.padEnd(7)} ${d.difficulty.padEnd(6)} waves ${String(d.rules.firstWave).padStart(2)}-${String(d.rules.finalWave).padEnd(2)}  ${twists.padEnd(22)} → wave ${String(game.wave).padStart(2)} ${victory ? 'won ' : 'lost'} lives ${String(game.lives).padStart(2)}  ${MEDAL_NAMES[m]}`);
}
console.log(`\n${medals.map((c, m) => `${MEDAL_NAMES[m]}: ${c}`).join(' · ')}`);
