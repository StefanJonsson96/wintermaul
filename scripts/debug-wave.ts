// Plays a solo bot game and reports one wave: damage by tower type, leaks, creep HP.
//   npx tsx scripts/debug-wave.ts <race> <wave> [seed]
import { Bot } from '../src/shared/sim/bot';
import { Game } from '../src/shared/sim/game';
import { CREEPS, WAVES } from '../src/shared/data/waves';

const race = process.argv[2] ?? 'frost';
const target = Number(process.argv[3] ?? 27);
const seed = Number(process.argv[4] ?? 1);
const game = new Game({ difficulty: 'normal', raceMode: 'pick', endless: false }, [{ id: 0, name: 'Bot', color: 0, isBot: true }], seed, { skipSetup: true });
const bot = new Bot(0, seed, [race]);
const before = new Map<number, number>();
let leaks = 0;
let escaped = 0;
let deaths = 0;
const leakBy = new Map<string, number>();
let started = false;
while (!game.over && game.time < 6000 && game.wave <= target) {
  bot.update(game);
  game.step();
  const ev = game.drainEvents();
  if (game.wave !== target) continue;
  if (!started) {
    started = true;
    for (const t of game.towers.values()) before.set(t.id, t.damage);
  }
  for (const e of ev) {
    if (e.e === 'die') deaths++;
    if (e.e === 'leak') {
      leaks++;
      if (e.escaped) escaped++;
      const c = game.creeps.get(e.id);
      const k = c ? `${c.def.id}${e.escaped ? '!' : ''}` : '?';
      leakBy.set(k, (leakBy.get(k) ?? 0) + e.cost);
    }
  }
}
const byType = new Map<string, { n: number; dmg: number }>();
for (const t of game.towers.values()) {
  const r = byType.get(t.def.id) ?? { n: 0, dmg: 0 };
  r.n++;
  r.dmg += t.damage - (before.get(t.id) ?? t.damage);
  byType.set(t.def.id, r);
}
const w = WAVES[target - 1];
const c = CREEPS[w.creep];
console.log(`wave ${target} ${c.name}: ${w.count}x ${c.hp}hp armor ${c.armor} ${c.armorType}${c.air ? ' AIR' : ''} speed ${c.speed} | deaths ${deaths} leaks ${leaks} (escaped ${escaped}) lives ${game.lives}`);
console.log('lives lost by creep (! = escaped):', [...leakBy].map(([k, v]) => `${k}:${v}`).join(' '));
console.log([...byType].sort((a, b) => b[1].dmg - a[1].dmg).map(([k, v]) => `${k}×${v.n}: ${Math.round(v.dmg)}`).join('  '));
