// Plays every campaign stage with a bot that owns the talents a player would typically have by
// then (every earlier stage won, no third stars) and prints win rates and stars.
//   npx tsx scripts/campaign-balance.ts [--games 6] [--stage frostfen] [--stones 20]
import { STAGES, starsFor, type Stage } from '../src/shared/campaign';
import { RACES } from '../src/shared/data/races';
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';
import { type Loadout, modsFromLoadout, NODES, pathTo, totalSpent } from '../src/shared/talents';

const args = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const games = Number(opt('games', '6'));
const only = opt('stage', '');
const forcedStones = opt('stones', '');

/** A sensible build: the big notables first, then the masteries of the races in play, then whatever is nearest (no keystones). */
function loadoutFor(stones: number, races: string[]): Loadout {
  const mastery = (race: string) => NODES.find((n) => n.race === race && n.kind === 'notable')!.id;
  const goals = ['arsenal_hub', 'bulwark_hub', 'fortune_hub', ...races.map(mastery), 'precision_hub', 'arsenal_w2', 'arsenal_w4', 'precision_w2', 'bulwark_w2', 'fortune_w2', 'rime_hub', 'alchemy_hub', 'bulwark_deep', 'precision_w4', 'arsenal_spur', 'rime_w4', 'alchemy_w2'];
  let l: Loadout = {};
  let left = stones;
  for (const goal of goals) {
    const path = pathTo(goal, l);
    if (!path.length || path.length > left) continue;
    l = { ...l, ...Object.fromEntries(path.map((id) => [id, 1])) };
    left -= path.length;
  }
  // the rest on the nearest nodes that are not keystones
  while (left > 0) {
    const options = NODES.filter((n) => n.kind !== 'keystone' && !l[n.id] && n.id !== 'hearth').map((n) => ({ n, path: pathTo(n.id, l) })).filter((o) => o.path.length === 1);
    if (!options.length) break;
    const pick = options.find((o) => o.n.kind === 'notable') ?? options[0];
    l = { ...l, [pick.n.id]: 1 };
    left--;
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
