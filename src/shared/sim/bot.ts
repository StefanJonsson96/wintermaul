import { BUILD_MAX_X, BUILD_MIN_X, LANE_H, PILLAR_LINES } from '../constants';
import { RACES, TOWERS } from '../data/races';
import { CREEPS, WAVES } from '../data/waves';
import { Rng } from '../rng';
import type { TowerDef } from '../types';
import type { Game, Tower } from './game';

/**
 * A simple AI builder: it lays down a serpentine maze (vertical walls with alternating gaps),
 * then spends spare gold upgrading the towers that see the most of the creep path.
 */
export class Bot {
  readonly playerId: number;
  private rng: Rng;
  private plan: { x: number; y: number }[] = [];
  private planIndex = 0;
  private built = new Set<number>();
  private wallsBuilt = 0;
  private nextThink = 0;
  private branchPref = new Map<string, 'a' | 'b'>();
  private coverageVersion = -1;
  private coverage = new Map<number, number>();
  private preferredRaces: string[];
  /** 0..1: how much of its gold goes to walls before upgrades. */
  private greed: number;

  constructor(playerId: number, seed = 1, races?: string[]) {
    this.playerId = playerId;
    this.rng = new Rng(seed * 7919 + playerId * 104729);
    this.preferredRaces = races ?? [];
    this.greed = this.rng.range(0.35, 0.6);
    this.plan = Bot.serpentine();
    for (const r of RACES) this.branchPref.set(r.id, this.rng.chance(0.7) ? 'a' : 'b');
    // economy/aura branches are situational: bots mostly go for damage
    this.branchPref.set('gold', 'a');
    this.branchPref.set('sun', this.rng.chance(0.8) ? 'a' : 'b');
  }

  /**
   * The maze plan. First plug the gaps between the pillars (one tower each, leaving the top gap
   * open on one line and the bottom gap on the next) — that bends the path into a zig-zag for very
   * little gold. Then fill complete walls every 3 columns (two cells thick, alternating gaps), which
   * turns the field into a long serpentine. Towers near the creeps' path go first.
   */
  static serpentine(): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    const seen = new Set<string>();
    const add = (x: number, y: number) => {
      const k = `${x},${y}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ x, y });
      }
    };
    const walls: number[] = [];
    for (let x = BUILD_MIN_X; x + 1 <= BUILD_MAX_X; x += 3) walls.push(x);
    const byMiddle = (a: number, b: number) => Math.abs(a + 1 - LANE_H / 2) - Math.abs(b + 1 - LANE_H / 2);
    // 1) pillar gaps
    PILLAR_LINES.forEach((line, li) => {
      const gaps: number[] = [];
      for (let y = 0; y + 1 < LANE_H; y += 2) if (!line.rows.includes(y)) gaps.push(y);
      const keepOpen = li % 2 === 0 ? gaps[gaps.length - 1] : gaps[0];
      gaps.filter((g) => g !== keepOpen).sort(byMiddle).forEach((g) => add(line.x, g));
    });
    // 2) full walls between the pillar lines
    const pillarXs = PILLAR_LINES.map((l) => l.x);
    walls.forEach((x) => {
      if (pillarXs.includes(x)) return;
      // gap on the side opposite to the neighbouring pillar line's open gap
      const k = walls.indexOf(x);
      const gapBottom = k % 2 === 0;
      const ys: number[] = [];
      if (gapBottom) for (let y = 0; y + 1 <= LANE_H - 3; y += 2) ys.push(y);
      else for (let y = LANE_H - 2; y >= 2; y -= 2) ys.push(y);
      ys.sort(byMiddle).forEach((y) => add(x, y));
    });
    return out;
  }

  update(game: Game): void {
    if (game.time < this.nextThink || game.over) return;
    this.nextThink = game.time + 0.4 + this.rng.next() * 0.3;
    const p = game.player(this.playerId);
    if (!p) return;
    p.ready = true;

    // races
    if (p.lumber > 0 && p.races.length < 2) {
      const want = this.preferredRaces.find((r) => !p.races.includes(r));
      game.command(p.id, { c: 'race', race: want ?? 'random' });
      return;
    }
    // Legend with the third lumber
    if (p.lumber > 0 && p.races.length >= 2) {
      const legend = p.races.map((r) => TOWERS[`${r}_L`]).find((d) => d && !p.legends.includes(d.id));
      if (legend && p.gold >= legend.cost) {
        const spot = this.findLegendSpot(game);
        if (spot) {
          game.command(p.id, { c: 'build', tower: legend.id, x: spot.x, y: spot.y });
          return;
        }
      }
      if (game.wave > 30 && p.races.length < 3) {
        game.command(p.id, { c: 'race', race: 'random' });
        return;
      }
      if (legend && game.wave >= 26) return; // save up
    }
    if (p.races.length === 0) return;

    const myTowers = [...game.towers.values()].filter((t) => t.owner === p.id);
    const wallDef = this.wallDef(p.races);
    const mazeDone = this.planIndex >= this.plan.length;
    const wallTarget = 14 + game.wave * (2.5 + this.greed * 3);
    if (!mazeDone && myTowers.length < wallTarget && p.gold >= wallDef.cost) {
      this.buildWall(game, wallDef);
      return;
    }
    if (this.tryUpgrade(game, myTowers, p.gold)) return;
    if (!mazeDone && p.gold >= wallDef.cost + 30) this.buildWall(game, wallDef);
  }

  /** Picks the best of the next few planned spots: towers that see a lot of the path and lengthen it. */
  private buildWall(game: Game, wallDef: TowerDef): void {
    const lane = game.laneOf(this.playerId)!;
    const grid = lane.grid;
    const occupied = game.occupiedCells(lane.index);
    const path = grid.tracePath(grid.spawnCells[Math.floor(grid.spawnCells.length / 2)]);
    const base = grid.pathLength();
    const range = (wallDef.attack?.range ?? 4) + 0.5;
    let best: { i: number; score: number } | null = null;
    let looked = 0;
    for (let i = this.planIndex; i < this.plan.length && looked < 14; i++) {
      const spot = this.plan[i];
      if (this.built.has(i)) continue;
      if (!grid.canPlace(spot.x, spot.y, occupied).ok) {
        if (!Array.from(grid.footprint(spot.x, spot.y)).some((c) => occupied.has(c)) && grid.cells[grid.idx(spot.x, spot.y)] !== 0) this.built.add(i);
        continue;
      }
      looked++;
      let cover = 0;
      for (const c of path) {
        const x = (c % grid.w) + 0.5;
        const y = Math.floor(c / grid.w) + 0.5;
        if ((x - spot.x - 1) ** 2 + (y - spot.y - 1) ** 2 <= range * range) cover++;
      }
      const gain = grid.previewPathLength(spot.x, spot.y) - base;
      const score = cover + gain * 1.5 - looked * 0.5;
      if (!best || score > best.score) best = { i, score };
    }
    while (this.planIndex < this.plan.length && this.built.has(this.planIndex)) this.planIndex++;
    if (!best) return;
    const spot = this.plan[best.i];
    const res = game.command(this.playerId, { c: 'build', tower: wallDef.id, x: spot.x, y: spot.y });
    if (res.ok) {
      this.built.add(best.i);
      this.wallsBuilt++;
    }
    while (this.planIndex < this.plan.length && this.built.has(this.planIndex)) this.planIndex++;
  }

  private wallDef(races: string[]): TowerDef {
    // take turns between our races so a second race actually gets towers to upgrade
    return TOWERS[`${races[this.wallsBuilt % races.length]}_1`];
  }

  private refreshCoverage(game: Game): void {
    const lane = game.laneOf(this.playerId)!;
    // flyers cross the middle rows: before an air wave, towers there matter a lot more
    const airSoon = [0, 1, 2].some((k) => {
      const w = WAVES[game.wave - 1 + k];
      return !!w && !!CREEPS[w.creep].air && (k > 0 || game.phase === 'wave');
    });
    const version = lane.grid.version * 2 + (airSoon ? 1 : 0);
    if (version === this.coverageVersion) return;
    this.coverageVersion = version;
    const grid = lane.grid;
    const path = grid.tracePath(grid.spawnCells[Math.floor(grid.spawnCells.length / 2)]);
    this.coverage.clear();
    for (const t of game.towers.values()) {
      if (t.owner !== this.playerId) continue;
      const r = (t.def.attack?.range ?? t.def.pulse?.radius ?? t.def.aura?.radius ?? 4.5) + 0.5;
      let n = 0;
      for (const i of path) {
        const x = (i % grid.w) + 0.5;
        const y = Math.floor(i / grid.w) + 0.5;
        if ((x - t.cx) ** 2 + (y - t.cy) ** 2 <= r * r) n++;
      }
      if (Math.abs(t.cy - LANE_H / 2) < r) n += airSoon ? 30 : 6;
      this.coverage.set(t.id, n);
    }
  }

  private pickUpgrade(t: Tower): TowerDef | undefined {
    const ups = t.def.upgrades.map((id) => TOWERS[id]);
    if (ups.length === 0) return undefined;
    if (ups.length === 1) return ups[0];
    const pref = this.branchPref.get(t.def.race) ?? 'a';
    const a = ups.find((u) => u.id.endsWith('a')) ?? ups[0];
    const b = ups.find((u) => u.id.endsWith('b')) ?? ups[1];
    let choice = pref === 'a' ? a : b;
    // mix in some variety for support branches: at most a few of them
    if (this.rng.chance(0.15)) choice = choice === a ? b : a;
    // keep air coverage near the middle
    const groundOnly = (d: TowerDef) => (d.attack?.targets ?? d.pulse?.targets) === 'ground';
    if (Math.abs(t.cy - LANE_H / 2) < 4 && groundOnly(choice) && !groundOnly(choice === a ? b : a)) choice = choice === a ? b : a;
    return choice;
  }

  /** Rough "how much does this tower help" number, used to rank upgrades. */
  static value(def: TowerDef): number {
    const a = def.attack;
    let v = 0;
    if (a) {
      const avg = (a.dmg[0] + a.dmg[1]) / 2;
      v = a.beam ? (avg * (1 + a.beam.maxMult)) / 2 : avg / a.cd;
      v *= a.multishot ?? 1;
      if (a.chain) v *= 1 + a.chain.count * 0.45;
      if (a.splash) v *= 1.5;
      if (a.line) v *= 1.8;
      if (a.crit) v *= 1 + a.crit.chance * (a.crit.mult - 1);
      const oh = a.onHit;
      if (oh?.dot) v += oh.dot.dps * Math.min(3, oh.dot.maxStacks) * 0.8;
      if (oh?.slow) v *= 1 + oh.slow.pct * 0.8;
      if (oh?.percentCurrent) v += 60 / a.cd * (def.tier * def.tier);
      if (oh?.execute) v *= 1.25;
      if (oh?.amplify) v *= 1 + oh.amplify.pct;
      if (oh?.sunder) v *= 1.2;
    }
    const p = def.pulse;
    if (p) {
      // a pulse hits everything nearby: count ~2.5 creeps per pulse
      v += ((p.dmg ?? 0) / p.every) * 2.5;
      if (p.onHit?.percentCurrent) v += 80 * def.tier * def.tier;
      if (p.onHit?.stun) v += ((p.onHit.stun.chance * p.onHit.stun.dur) / p.every) * 60 * def.tier * def.tier;
      if (p.pull) v += 50 * def.tier * def.tier;
      if (p.annihilate) v += 3000;
    }
    const au = def.aura;
    if (au) {
      v += (au.enemyDps ?? 0) * 3;
      v += ((au.towerDmgPct ?? 0) + (au.towerSpdPct ?? 0)) * 60 * def.tier * def.tier;
      v += (au.enemySlowPct ?? 0) * 60 * def.tier * def.tier;
    }
    if (def.econ?.interestPct) v += def.econ.interestPct * 800;
    return v;
  }

  private tryUpgrade(game: Game, mine: Tower[], gold: number): boolean {
    this.refreshCoverage(game);
    let bestAny: { t: Tower; to: TowerDef; score: number } | null = null;
    let bestAff: { t: Tower; to: TowerDef; score: number } | null = null;
    for (const t of mine) {
      if (game.time < t.buildUntil) continue;
      const to = this.pickUpgrade(t);
      if (!to) continue;
      if (to.limitGroup && to.limit && !t.def.limitGroup) {
        const n = mine.filter((m) => m.def.limitGroup === to.limitGroup).length;
        if (n >= Math.min(2, to.limit)) continue;
      }
      const cov = this.coverage.get(t.id) ?? 0;
      const gain = Math.max(1, Bot.value(to) - Bot.value(t.def));
      const score = (cov + 2) * (gain / to.cost) * (0.9 + this.rng.next() * 0.2);
      const cand = { t, to, score };
      if (!bestAny || score > bestAny.score) bestAny = cand;
      if (to.cost <= gold && (!bestAff || score > bestAff.score)) bestAff = cand;
    }
    if (!bestAff) return false;
    // save up for a clearly better upgrade instead of frittering gold away
    if (bestAny && bestAny !== bestAff && bestAff.score < bestAny.score * 0.6 && game.phase === 'build') return true;
    return game.command(this.playerId, { c: 'upgrade', ids: [bestAff.t.id], to: bestAff.to.id }).ok;
  }

  private findLegendSpot(game: Game): { x: number; y: number } | null {
    // Replace a low-tier tower near the middle of the maze (only between waves, so no rubble).
    if (game.phase !== 'build') return null;
    const t = [...game.towers.values()]
      .filter((t) => t.owner === this.playerId && t.def.tier <= 2 && game.time >= t.buildUntil)
      .sort((a, b) => Math.abs(a.cy - LANE_H / 2) - Math.abs(b.cy - LANE_H / 2))[0];
    if (!t) return null;
    game.command(this.playerId, { c: 'sell', ids: [t.id] });
    const lane = game.laneOf(this.playerId)!;
    return lane.grid.canPlace(t.x, t.y, game.occupiedCells(lane.index)).ok ? { x: t.x, y: t.y } : null;
  }
}
