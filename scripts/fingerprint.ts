// Plays a few seeded bot games to the end and prints a fingerprint of each. Refactors that must
// not change behaviour should leave this output identical.
//   npx tsx scripts/fingerprint.ts > before.txt   (…refactor…)   npx tsx scripts/fingerprint.ts | diff before.txt -
import { createHash } from 'node:crypto';
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';
import { modsFromLoadout } from '../src/shared/talents';

const cases = [
  { players: 1, races: ['fire', 'frost'], difficulty: 'normal' as const },
  { players: 2, races: ['venom', 'storm'], difficulty: 'hard' as const },
  { players: 3, races: ['shadow', 'grove', 'arcane'], difficulty: 'normal' as const },
  { players: 1, races: ['gold', 'prism'], difficulty: 'casual' as const, talents: true },
  { players: 1, races: ['stone', 'sun'], difficulty: 'normal' as const, stage: true },
];

for (const [i, c] of cases.entries()) {
  const seed = 1000 + i;
  const init = Array.from({ length: c.players }, (_, k) => ({ id: k, name: `B${k}`, color: k, isBot: true }));
  const mods = c.talents ? { 0: modsFromLoadout({ honed: 5, hearts: 5, virulence: 3, chill: 3, concussion: 1, warchest: 5, kin_gold: 3, secondwind: 0 }) } : undefined;
  const rules = c.stage ? { firstWave: 11, finalWave: 22, startGold: 1100, startLumber: 2, regen: 0.006, armor: 2, countMul: 1.3 } : {};
  const game = new Game({ difficulty: c.difficulty, raceMode: 'pick', endless: false }, init, seed, { skipSetup: true, rules: { ...rules, mods } });
  const bots = init.map((p, k) => new Bot(p.id, seed + k, [c.races[k % c.races.length], c.races[(k + 1) % c.races.length]]));
  const hash = createHash('sha1');
  let events = 0;
  while (!game.over && game.time < 4000) {
    for (const b of bots) b.update(game);
    game.step();
    for (const ev of game.drainEvents()) {
      events++;
      hash.update(JSON.stringify(ev));
    }
  }
  let damage = 0;
  for (const t of game.towers.values()) damage += t.damage;
  console.log(`case ${i}: ${game.phase} wave ${game.wave} lives ${game.lives} time ${game.time.toFixed(2)} towers ${game.towers.size} damage ${damage.toFixed(1)} events ${events} ${hash.digest('hex').slice(0, 16)}`);
}
