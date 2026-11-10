// Plays every campaign stage with a bot that owns the talents a player would typically have by
// then (every earlier stage won, no third stars) and prints win rates and stars.
//   npx tsx scripts/campaign-balance.ts [--games 6] [--stage frostfen] [--stones 20]
import { CHAPTERS, starsFor, type Stage } from '../src/shared/campaign';
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
  const game = new Game({ difficulty: stage.difficulty, raceMode: 'pick', endless: false, waves: stage.waves, weather: true, omens: true }, init, seed, { skipSetup: true, rules: { ...stage.rules, mods: { 0: modsFromLoadout(loadout) } } });
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

/** Runestones from two stars on every stage up to and including `count` stages of a chapter. */
const twoStars = (stages: Stage[], count: number) => stages.slice(0, count).reduce((n, s) => n + s.rewards[0] + s.rewards[1], 0);

function report(stage: Stage, budget: number): void {
  const results = Array.from({ length: games }, (_, i) => play(stage, i + 1, budget));
  const wins = results.filter((r) => r.victory).length;
  const stars = [0, 0, 0, 0];
  for (const r of results) stars[r.stars]++;
  const lost = results.filter((r) => r.victory).map((r) => r.livesLost);
  const avgLost = lost.length ? (lost.reduce((x, y) => x + y, 0) / lost.length).toFixed(1) : '-';
  const losses = results.filter((r) => !r.victory).map((r) => `${r.races}@${r.wave}`);
  console.log(`${stage.name.padEnd(22)} stones ${String(budget).padStart(3)}  wins ${wins}/${games}  stars 0:${stars[0]} 1:${stars[1]} 2:${stars[2]} 3:${stars[3]}  lives lost when won ${avgLost}${losses.length ? `  lost: ${losses.join(' ')}` : ''}`);
}

// Act I in order; Act II as played alongside it: a player starts its stage k having won Act I
// up to the stage that opens it plus k more, and Act II up to stage k
const [act1, act2, act3, act4] = CHAPTERS;
const opens = act1.stages.findIndex((s) => s.id === act2.opensAfter) + 1;
act1.stages.forEach((stage, i) => {
  if (!only || stage.id === only) report(stage, forcedStones ? Number(forcedStones) : twoStars(act1.stages, i));
});
act2.stages.forEach((stage, k) => {
  if (!only || stage.id === only) report(stage, forcedStones ? Number(forcedStones) : twoStars(act1.stages, Math.min(act1.stages.length, opens + k)) + twoStars(act2.stages, k));
});
// Act III opens after a stage of Act II; its players have come about that far in both earlier acts
const opens3 = act2.stages.findIndex((s) => s.id === act3.opensAfter) + 1;
act3.stages.forEach((stage, k) => {
  const budget = twoStars(act1.stages, Math.min(act1.stages.length, opens + opens3 + k)) + twoStars(act2.stages, Math.min(act2.stages.length, opens3 + k)) + twoStars(act3.stages, k);
  if (!only || stage.id === only) report(stage, forcedStones ? Number(forcedStones) : budget);
});
// Act IV opens after a stage of Act III; by then a player has come far in all three
const opens4 = act3.stages.findIndex((s) => s.id === act4.opensAfter) + 1;
act4.stages.forEach((stage, k) => {
  const budget = twoStars(act1.stages, act1.stages.length) + twoStars(act2.stages, Math.min(act2.stages.length, opens3 + opens4 + k)) + twoStars(act3.stages, Math.min(act3.stages.length, opens4 + k)) + twoStars(act4.stages, k);
  if (!only || stage.id === only) report(stage, forcedStones ? Number(forcedStones) : budget);
});
