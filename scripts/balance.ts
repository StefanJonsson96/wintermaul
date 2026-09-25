// Headless balance runner: plays full games with bots and prints how far they get.
//   npm run balance -- --players 2 --games 6 --difficulty normal --races fire,frost
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';
import type { Difficulty } from '../src/shared/protocol';
import { RACES, TOWERS } from '../src/shared/data/races';
import { CREEPS } from '../src/shared/data/waves';

const args = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const players = Number(opt('players', '1'));
const games = Number(opt('games', '4'));
const difficulty = opt('difficulty', 'normal') as Difficulty;
const races = opt('races', '').split(',').filter(Boolean);
const seed0 = Number(opt('seed', '1'));
const verbose = args.includes('--verbose');
const quiet = args.includes('--quiet');

// --patch '{"stone_1.attack.range": 4, "w21.hp": 1500}' tweaks tower or creep data for this run.
const patch = JSON.parse(opt('patch', '{}')) as Record<string, number>;
for (const [path, value] of Object.entries(patch)) {
  const [id, ...keys] = path.split('.');
  let obj: Record<string, unknown> = (TOWERS[id] ?? CREEPS[id]) as unknown as Record<string, unknown>;
  if (!obj) throw new Error(`unknown id ${id}`);
  for (const k of keys.slice(0, -1)) obj = obj[k] as Record<string, unknown>;
  const last = keys[keys.length - 1];
  obj[last] = typeof obj[last] === 'object' && Array.isArray(obj[last]) ? (obj[last] as number[]).map((v) => v * value) : value;
}

interface Result {
  wave: number;
  victory: boolean;
  lives: number;
  leaksByWave: number[];
  races: string[][];
  seconds: number;
}

function play(seed: number): Result {
  const init = Array.from({ length: players }, (_, i) => ({ id: i, name: `Bot${i}`, color: i, isBot: true }));
  const game = new Game({ difficulty, raceMode: 'pick', endless: false }, init, seed, { skipSetup: true });
  const bots = init.map((p, i) => new Bot(p.id, seed + i, races.length ? [races[(i + seed) % races.length], races[(i + seed + 1) % races.length]] : undefined));
  const leaksByWave: number[] = [];
  let lastLives = game.lives;
  let lastWave = 0;
  const t0 = performance.now();
  while (!game.over && game.time < 6000) {
    for (const b of bots) b.update(game);
    game.step();
    game.drainEvents();
    if (game.wave !== lastWave) {
      if (lastWave > 0) leaksByWave[lastWave] = (leaksByWave[lastWave] ?? 0) + (lastLives - game.lives);
      lastWave = game.wave;
      lastLives = game.lives;
    }
  }
  leaksByWave[lastWave] = (leaksByWave[lastWave] ?? 0) + (lastLives - game.lives);
  const sim = (performance.now() - t0) / 1000;
  if (verbose) {
    for (const p of game.players) console.log(`  ${p.name} races=${p.races} gold=${Math.floor(p.gold)} kills=${p.kills} leaks=${p.leaks} towers=${[...game.towers.values()].filter((t) => t.owner === p.id).length}`);
  }
  return {
    wave: game.wave,
    victory: game.phase === 'victory',
    lives: game.lives,
    leaksByWave,
    races: game.players.map((p) => p.races),
    seconds: sim,
  };
}

console.log(`players=${players} difficulty=${difficulty} races=${races.join(',') || 'random'} games=${games}`);
const results: Result[] = [];
for (let g = 0; g < games; g++) {
  const r = play(seed0 + g * 101);
  results.push(r);
  const leaks = r.leaksByWave.map((l, w) => (l ? `${w}:${l}` : '')).filter(Boolean).join(' ');
  if (!quiet) console.log(`game ${g}: ${r.victory ? 'WIN ' : 'LOSS'} wave=${r.wave} lives=${r.lives} races=${r.races.map((x) => x.join('+')).join(' | ')} (${r.seconds.toFixed(1)}s)\n   lives lost per wave: ${leaks}`);
}
const avgWave = results.reduce((s, r) => s + r.wave, 0) / results.length;
const waves = results.map((r) => r.wave).sort((a, b) => a - b);
const lost = new Map<number, number>();
for (const r of results) r.leaksByWave.forEach((l, w) => l && lost.set(w, (lost.get(w) ?? 0) + l));
const worst = [...lost].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w, l]) => `${w}:${(l / results.length).toFixed(1)}`).join(' ');
console.log(`${quiet ? '' : '\n'}wins ${results.filter((r) => r.victory).length}/${results.length}, average wave ${avgWave.toFixed(1)}, median ${waves[Math.floor(waves.length / 2)]}, waves [${waves.join(' ')}], lives lost/game at ${worst}`);
void RACES;
