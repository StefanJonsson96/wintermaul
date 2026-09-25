// Plays every campaign stage with a bot that owns the talents a player would typically have by
// then (every earlier stage won, no third stars) and prints win rates and stars.
//   npx tsx scripts/campaign-balance.ts [--games 6] [--stage frostfen] [--stones 20]
import { STAGES, starsFor, type Stage } from '../src/shared/campaign';
import { RACES } from '../src/shared/data/races';
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';
import { type Loadout, modsFromLoadout, rankUpBlocker, TALENT_BY_ID, totalSpent } from '../src/shared/talents';

const args = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const games = Number(opt('games', '6'));
const only = opt('stage', '');
const forcedStones = opt('stones', '');

/** A sensible spread of talents: a bit of everything, then damage for the races in play. */
function loadoutFor(stones: number, races: string[]): Loadout {
  const order = ['honed', 'hearts', 'warchest', 'eagle', 'bounty', ...races.map((r) => `kin_${r}`), 'honed', 'pierce', 'impact', 'magic', 'elemental', 'quick', 'tithe', 'snow', 'gate', 'virulence', 'kindling', 'chill', 'concussion', 'deadeye', 'laststand', 'secondwind', 'salvage', 'mason', 'timber'];
  const l: Loadout = {};
  let left = stones;
  for (let pass = 0; pass < 6 && left > 0; pass++) {
    for (const id of order) {
      const t = TALENT_BY_ID[id];
      if (!t || rankUpBlocker(t, l, left)) continue;
      l[id] = (l[id] ?? 0) + 1;
      left -= t.cost;
    }
  }
  return l;
}

function play(stage: Stage, seed: number, stones: number) {
  const pool = stage.rules.races?.length ? stage.rules.races : RACES.map((r) => r.id);
  const a = pool[seed % pool.length];
  const b = pool[(seed * 7 + 3) % pool.length] === a ? pool[(seed + 1) % pool.length] : pool[(seed * 7 + 3) % pool.length];
  const loadout = loadoutFor(stones, [a, b]);
  const init = [{ id: 0, name: 'Bot', color: 0, isBot: true }];
  const game = new Game({ difficulty: stage.difficulty, raceMode: 'pick', endless: false }, init, seed, { skipSetup: true, rules: { ...stage.rules, mods: { 0: modsFromLoadout(loadout) } } });
  const bot = new Bot(0, seed, [a, b]);
  while (!game.over && game.time < 6000) {
    bot.update(game);
    game.step();
    game.drainEvents();
  }
  const victory = game.phase === 'victory';
  const livesLost = game.maxLives - Math.max(0, game.lives);
  return { victory, wave: game.wave, livesLost, stars: starsFor(stage, { victory, wave: game.wave, livesLost }), races: `${a}+${b}`, spent: totalSpent(loadout) };
}

let stones = 0;
for (const stage of STAGES) {
  const budget = forcedStones ? Number(forcedStones) : stones;
  stones += stage.rewards[0] + stage.rewards[1];
  if (only && stage.id !== only) continue;
  const results = Array.from({ length: games }, (_, i) => play(stage, i + 1, budget));
  const wins = results.filter((r) => r.victory).length;
  const stars = [0, 0, 0, 0];
  for (const r of results) stars[r.stars]++;
  const lost = results.filter((r) => r.victory).map((r) => r.livesLost);
  const avgLost = lost.length ? (lost.reduce((x, y) => x + y, 0) / lost.length).toFixed(1) : '-';
  const losses = results.filter((r) => !r.victory).map((r) => `${r.races}@${r.wave}`);
  console.log(`${stage.name.padEnd(18)} stones ${String(budget).padStart(3)}  wins ${wins}/${games}  stars 0:${stars[0]} 1:${stars[1]} 2:${stars[2]} 3:${stars[3]}  lives lost when won ${avgLost}${losses.length ? `  lost: ${losses.join(' ')}` : ''}`);
}
