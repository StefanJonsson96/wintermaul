import { armorMultiplier, DAMAGE_TABLE } from '../combat';
import { DT } from '../constants';
import type { AttackDef, DamageType, OnHit, TargetKind, TargetMode } from '../types';
import type { Creep, Dot, Tower } from './entities';
import type { Game } from './game';
import { attackRange, baseDamageMul, typeDamageMul } from './mods';

interface PendingHit {
  at: number;
  tower: number;
  owner: number;
  target: number;
  lane: number;
  x: number;
  y: number;
  dmg: number;
  crit: boolean;
  air: boolean;
  est: number;
}

interface GroundFire {
  lane: number;
  x: number;
  y: number;
  r: number;
  dps: number;
  until: number;
  owner: number;
  tower: number;
}

/** The towers at work: targeting, attacks, damage and everything that happens on a hit. */
export class Combat {
  /** Projectiles in flight. */
  private pending: PendingHit[] = [];
  private fires: GroundFire[] = [];

  constructor(private readonly g: Game) {}

  private armorOf(c: Creep): number {
    let a = c.def.armor + (this.g.rules.armor ?? 0);
    for (let i = c.sunders.length - 1; i >= 0; i--) {
      const s = c.sunders[i];
      if (this.g.time >= s.until) c.sunders.splice(i, 1);
      else a -= s.armor * s.stacks;
    }
    return a;
  }

  private amplifyOf(c: Creep): number {
    return 1 + Math.max(this.g.time < c.amplifyUntil ? c.amplifyPct : 0, c.auraAmplify);
  }

  private applyRawDamage(c: Creep, amount: number, owner: number, towerId: number): number {
    if (!c.alive || amount <= 0) return 0;
    let dealt = amount;
    if (c.shield > 0) {
      const absorbed = Math.min(c.shield, amount);
      c.shield -= absorbed;
      amount -= absorbed;
    }
    c.hp -= amount;
    c.lastOwner = owner;
    c.lastTower = towerId;
    const t = this.g.towers.get(towerId);
    if (t) {
      t.damage += dealt;
      if (t.def.growth && t.level < t.def.growth.maxLevel) {
        t.xp += dealt * t.xpMul;
        while (t.xp >= t.def.growth.xpPerLevel && t.level < t.def.growth.maxLevel) {
          t.xp -= t.def.growth.xpPerLevel;
          t.level++;
          this.g.emit({ e: 'level', t: this.g.time, tw: t.id, level: t.level });
        }
      }
    }
    const p = this.g.player(owner);
    if (p) p.damage += dealt;
    if (c.hp <= 0) this.g.horde.killCreep(c, owner, towerId);
    return dealt;
  }

  /** Typed damage: armor class table, numeric armor, amplification. */
  private damage(c: Creep, amount: number, type: DamageType, owner: number, towerId: number, onHit?: OnHit): number {
    if (!c.alive) return 0;
    let mult = DAMAGE_TABLE[type][c.def.armorType] * armorMultiplier(this.armorOf(c)) * this.amplifyOf(c);
    const frostbite = this.g.player(owner)?.mods.frostbite;
    if (frostbite && ((this.g.time < c.slowUntil && c.slowPct > 0) || c.auraSlow > 0)) mult *= 1 + frostbite;
    if (onHit) {
      if (onHit.bonusVsAir && c.air) mult *= onHit.bonusVsAir;
      const vs = onHit.bonusVsArmor?.[c.def.armorType];
      if (vs) mult *= vs;
      if (onHit.shatter && this.g.time < c.stunUntil) mult *= onHit.shatter;
    }
    return this.applyRawDamage(c, amount * mult, owner, towerId);
  }

  /** Armor-ignoring damage (poison, burn, auras, burning ground). */
  trueDamage(c: Creep, amount: number, owner: number, towerId: number): number {
    return this.applyRawDamage(c, amount * this.amplifyOf(c), owner, towerId);
  }

  addDot(c: Creep, d: Dot, maxStacks = 1): void {
    const ex = c.dots.find((x) => x.key === d.key);
    if (ex) {
      ex.stacks = Math.min(maxStacks, ex.stacks + 1);
      ex.until = Math.max(ex.until, d.until);
      ex.owner = d.owner;
      ex.tower = d.tower;
      ex.dps = Math.max(ex.dps, d.dps);
    } else c.dots.push({ ...d, stacks: 1 });
  }

  private applyOnHit(c: Creep, oh: OnHit, owner: number, t: Tower): void {
    if (!c.alive) return;
    const cc = !c.def.immune;
    const boss = !!c.def.boss;
    const now = this.g.time;
    const m = this.g.player(t.owner)?.mods;
    if (oh.slow && cc) {
      const pct = oh.slow.pct * (m?.slow ?? 1);
      if (now >= c.slowUntil || pct >= c.slowPct) {
        c.slowPct = Math.max(now < c.slowUntil ? c.slowPct : 0, pct);
        c.slowUntil = Math.max(c.slowUntil, now + oh.slow.dur);
      }
    }
    const stunDur = (d: number) => d * (m?.stun ?? 1);
    if (oh.stun && cc && this.g.rng.chance(oh.stun.chance)) {
      if (boss) {
        c.slowPct = Math.max(c.slowPct, 0.3);
        c.slowUntil = Math.max(c.slowUntil, now + stunDur(oh.stun.dur));
      } else c.stunUntil = Math.max(c.stunUntil, now + stunDur(oh.stun.dur));
    }
    if (oh.root && cc && !boss && this.g.rng.chance(oh.root.chance)) c.rootUntil = Math.max(c.rootUntil, now + stunDur(oh.root.dur));
    if (oh.dot) {
      const kindMul = (oh.dot.kind === 'poison' ? m?.poison : m?.burn) ?? 1;
      this.addDot(c, { key: t.def.id, kind: oh.dot.kind, dps: oh.dot.dps * t.dmgMul * kindMul * this.growthMul(t), stacks: 1, until: now + oh.dot.dur, owner, tower: t.id }, oh.dot.maxStacks);
    }
    if (oh.sunder) {
      const ex = c.sunders.find((s) => s.key === t.def.id);
      if (ex) {
        ex.stacks = Math.min(oh.sunder.maxStacks, ex.stacks + 1);
        ex.until = now + oh.sunder.dur;
      } else c.sunders.push({ key: t.def.id, armor: oh.sunder.armor, stacks: 1, until: now + oh.sunder.dur });
    }
    if (oh.amplify) {
      if (now >= c.amplifyUntil || oh.amplify.pct >= c.amplifyPct) {
        c.amplifyPct = Math.max(now < c.amplifyUntil ? c.amplifyPct : 0, oh.amplify.pct);
        c.amplifyUntil = Math.max(c.amplifyUntil, now + oh.amplify.dur);
      }
    }
    if (oh.percentCurrent && c.alive) {
      const pct = boss ? oh.percentCurrent.bossPct : oh.percentCurrent.pct;
      this.applyRawDamage(c, c.hp * pct, owner, t.id);
    }
    if (oh.execute && c.alive && !boss && c.hp < c.maxHp * oh.execute) {
      this.applyRawDamage(c, c.hp + c.shield + 1, owner, t.id);
    }
    if (oh.knockback && cc && !boss && c.alive && this.g.rng.chance(oh.knockback.chance)) this.g.horde.pushBack(c, oh.knockback.cells);
  }

  private growthMul(t: Tower): number {
    return t.def.growth ? 1 + t.level * t.def.growth.dmgPerLevel : 1;
  }

  /** Recomputes tower-to-tower aura buffs in a lane (auras of the same kind don't stack). */
  refreshAuras(lane: number): void {
    const list = [...this.g.towers.values()].filter((t) => t.lane === lane);
    const auras = list.filter((t) => t.def.aura && (t.def.aura.towerDmgPct || t.def.aura.towerSpdPct || t.def.aura.xpRate));
    for (const t of list) {
      let dmg = 0;
      let spd = 0;
      let xp = 0;
      for (const a of auras) {
        if (a === t && !a.def.aura!.xpRate) continue;
        const r = a.def.aura!.radius;
        const dx = a.cx - t.cx;
        const dy = a.cy - t.cy;
        if (dx * dx + dy * dy > r * r) continue;
        dmg = Math.max(dmg, a.def.aura!.towerDmgPct ?? 0);
        spd = Math.max(spd, a.def.aura!.towerSpdPct ?? 0);
        xp = Math.max(xp, a.def.aura!.xpRate ?? 0);
      }
      const m = this.g.player(t.owner)?.mods;
      t.dmgMul = (1 + dmg) * baseDamageMul(t.def.race, m) * (this.g.lastStand ? 1 + (m?.lastStand ?? 0) : 1);
      t.spdMul = (1 + spd) * (m?.speed ?? 1);
      t.xpMul = 1 + xp;
    }
  }

  updateAuraEffects(): void {
    for (const t of this.g.towers.values()) {
      const a = t.def.aura;
      if (!a || (!a.enemySlowPct && !a.enemyDps && !a.enemyAmplify)) continue;
      if (this.g.time < t.buildUntil) continue;
      const r2 = a.radius * a.radius;
      for (const c of this.g.lanes[t.lane].creeps) {
        if (!c.alive || c.lane !== t.lane) continue;
        const dx = c.x - t.cx;
        const dy = c.y - t.cy;
        if (dx * dx + dy * dy > r2) continue;
        if (a.enemySlowPct && !c.def.immune) c.auraSlow = Math.max(c.auraSlow, a.enemySlowPct * (this.g.player(t.owner)?.mods.slow ?? 1));
        if (a.enemyAmplify) c.auraAmplify = Math.max(c.auraAmplify, a.enemyAmplify);
        if (a.enemyDps) this.trueDamage(c, a.enemyDps * t.dmgMul * DT, t.owner, t.id);
      }
    }
  }

  updateFires(): void {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      if (this.g.time >= f.until) {
        this.fires.splice(i, 1);
        continue;
      }
      const r2 = f.r * f.r;
      for (const c of this.g.lanes[f.lane].creeps) {
        if (!c.alive || c.air || c.lane !== f.lane) continue;
        const dx = c.x - f.x;
        const dy = c.y - f.y;
        if (dx * dx + dy * dy <= r2) this.trueDamage(c, f.dps * DT, f.owner, f.tower);
      }
    }
  }

  private canTarget(kind: TargetKind, c: Creep): boolean {
    return kind === 'both' || (kind === 'air') === c.air;
  }

  private score(mode: TargetMode, t: Tower, c: Creep): number {
    switch (mode) {
      case 'first':
        return c.progress;
      case 'last':
        return -c.progress;
      case 'strong':
        return -c.hp;
      case 'weak':
        return c.hp;
      case 'close':
        return (c.x - t.cx) ** 2 + (c.y - t.cy) ** 2;
    }
  }

  private acquire(t: Tower, range: number, kind: TargetKind, count: number): Creep[] {
    const r2 = range * range;
    const cands: Creep[] = [];
    let best: Creep | null = null;
    let bestScore = Infinity;
    let doomed: Creep | null = null;
    let doomedScore = Infinity;
    for (const c of this.g.lanes[t.lane].creeps) {
      if (!c.alive || c.lane !== t.lane || !this.canTarget(kind, c)) continue;
      const dx = c.x - t.cx;
      const dy = c.y - t.cy;
      if (dx * dx + dy * dy > r2) continue;
      const s = this.score(t.mode, t, c);
      // creeps that projectiles already in the air will kill are only a fallback
      if (c.incoming >= c.hp + c.shield) {
        if (s < doomedScore) {
          doomedScore = s;
          doomed = c;
        }
        continue;
      }
      if (count === 1) {
        if (s < bestScore) {
          bestScore = s;
          best = c;
        }
      } else cands.push(c);
    }
    if (count === 1) return best ? [best] : doomed ? [doomed] : [];
    cands.sort((a, b) => this.score(t.mode, t, a) - this.score(t.mode, t, b));
    if (cands.length === 0 && doomed) cands.push(doomed);
    return cands.slice(0, count);
  }

  private rollDamage(t: Tower, a: AttackDef): { dmg: number; crit: boolean } {
    const p = this.g.player(t.owner);
    let dmg = this.g.rng.range(a.dmg[0], a.dmg[1]) * t.dmgMul * this.growthMul(t) * typeDamageMul(a.type, p?.mods);
    if (a.goldScaling && p) dmg += Math.min(a.goldScaling.max, p.gold * a.goldScaling.pct);
    let crit = false;
    if (a.crit && this.g.rng.chance(a.crit.chance)) {
      dmg *= a.crit.mult;
      crit = true;
    } else if (p?.mods.crit && this.g.rng.chance(p.mods.crit)) {
      dmg *= 2;
      crit = true;
    }
    return { dmg, crit };
  }

  private rangeOf(t: Tower, a: AttackDef): number {
    return attackRange(a.range, this.g.player(t.owner)?.mods);
  }

  updateTowers(): void {
    for (const t of this.g.towers.values()) {
      if (this.g.time < t.buildUntil) continue;
      const a = t.def.attack;
      if (a) {
        if (a.beam) this.updateBeam(t, a);
        else this.updateAttack(t, a);
      }
      if (t.def.pulse) this.updatePulse(t);
    }
  }

  private updateAttack(t: Tower, a: AttackDef): void {
    t.cd -= DT * t.spdMul;
    if (t.cd > 0) return;
    const targets = this.acquire(t, this.rangeOf(t, a), a.targets, a.multishot ?? 1);
    if (targets.length === 0) {
      t.cd = 0;
      return;
    }
    for (const target of targets) this.fire(t, a, target);
    t.cd = Math.max(t.cd + a.cd, 0.02);
  }

  private fire(t: Tower, a: AttackDef, target: Creep): void {
    const { dmg, crit } = this.rollDamage(t, a);
    if (a.line) {
      // everything on the line from the tower through the target, to max range
      const dx = target.x - t.cx;
      const dy = target.y - t.cy;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const range = this.rangeOf(t, a);
      const ex = t.cx + ux * range;
      const ey = t.cy + uy * range;
      this.g.emit({ e: 'line', t: this.g.time, tw: t.id, x: ex, y: ey });
      for (const c of [...this.g.lanes[t.lane].creeps]) {
        if (!c.alive || c.lane !== t.lane || !this.canTarget(a.targets, c)) continue;
        const px = c.x - t.cx;
        const py = c.y - t.cy;
        const along = px * ux + py * uy;
        if (along < 0 || along > range) continue;
        const off = Math.abs(px * uy - py * ux);
        if (off > 0.7) continue;
        this.hitCreep(t, a, c, dmg, crit);
      }
      return;
    }
    if (a.chain) {
      const chainTargets = [target];
      let cur = target;
      const hit = new Set<number>([target.id]);
      for (let k = 0; k < a.chain.count; k++) {
        let next: Creep | null = null;
        let bd = a.chain.range * a.chain.range;
        for (const c of this.g.lanes[t.lane].creeps) {
          if (!c.alive || c.lane !== t.lane || hit.has(c.id) || !this.canTarget(a.targets, c)) continue;
          const d = (c.x - cur.x) ** 2 + (c.y - cur.y) ** 2;
          if (d <= bd) {
            bd = d;
            next = c;
          }
        }
        if (!next) break;
        hit.add(next.id);
        chainTargets.push(next);
        cur = next;
      }
      const instant = a.proj === 'lightning' || !a.projSpeed;
      const travel = instant ? 0 : Math.max(0.05, Math.hypot(target.x - t.cx, target.y - t.cy) / a.projSpeed!);
      this.g.emit({ e: 'chain', t: this.g.time, tw: t.id, ids: chainTargets.map((c) => c.id), d: +travel.toFixed(3) });
      let mult = 1;
      chainTargets.forEach((c, k) => {
        if (k > 0) mult *= 1 - a.chain!.falloff;
        if (instant) this.hitCreep(t, a, c, dmg * mult, crit && k === 0);
        else this.queueHit(t, c, dmg * mult, crit && k === 0, travel + 0.12 * k);
      });
      return;
    }
    if (!a.projSpeed || a.proj === 'lightning' || a.proj === 'rail') {
      this.g.emit({ e: 'shot', t: this.g.time, tw: t.id, c: target.id, d: 0, k: a.proj });
      this.hitCreep(t, a, target, dmg, crit);
      return;
    }
    const dist = Math.hypot(target.x - t.cx, target.y - t.cy);
    const travel = Math.max(0.05, dist / a.projSpeed);
    this.g.emit({ e: 'shot', t: this.g.time, tw: t.id, c: target.id, d: +travel.toFixed(3), k: a.proj });
    this.queueHit(t, target, dmg, crit, travel);
  }

  private queueHit(t: Tower, target: Creep, dmg: number, crit: boolean, delay: number): void {
    const a = t.def.attack!;
    const est = dmg * DAMAGE_TABLE[a.type][target.def.armorType] * armorMultiplier(this.armorOf(target)) * this.amplifyOf(target);
    target.incoming += est;
    this.pending.push({ at: this.g.time + delay, tower: t.id, owner: t.owner, target: target.id, lane: t.lane, x: target.x, y: target.y, dmg, crit, air: target.air, est });
  }

  resolveHits(): void {
    if (!this.pending.length) return;
    const keep: PendingHit[] = [];
    for (const h of this.pending) {
      if (h.at > this.g.time) {
        keep.push(h);
        continue;
      }
      const t = this.g.towers.get(h.tower);
      const def = t?.def;
      const a = def?.attack;
      const target = this.g.creeps.get(h.target);
      if (target) target.incoming = Math.max(0, target.incoming - h.est);
      if (target && target.alive && target.lane === h.lane) {
        h.x = target.x;
        h.y = target.y;
      }
      if (!t || !a) {
        // tower sold mid-flight: the shot still lands, without effects
        if (target?.alive && target.lane === h.lane) this.applyRawDamage(target, h.dmg * 0.5, h.owner, -1);
        continue;
      }
      if (a.splash) {
        this.splash(t, a, h.lane, h.x, h.y, h.dmg, h.crit, h.air, target && target.lane === h.lane ? target : undefined);
      } else if (target && target.alive && target.lane === h.lane) {
        this.hitCreep(t, a, target, h.dmg, h.crit);
      }
    }
    this.pending = keep;
  }

  private splash(t: Tower, a: AttackDef, lane: number, x: number, y: number, dmg: number, crit: boolean, air: boolean, primary?: Creep): void {
    const r = a.splash!;
    const edge = a.splashFalloff ?? 0.4;
    this.g.emit({ e: 'impact', t: this.g.time, tw: t.id, x, y, r, lane });
    for (const c of [...this.g.lanes[lane].creeps]) {
      if (!c.alive || c.lane !== lane || c.air !== air) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d > r) continue;
      const f = c === primary ? 1 : 1 - (1 - edge) * (d / r);
      this.hitCreep(t, a, c, dmg * f, crit && c === primary);
    }
    if (a.groundFire && !air) {
      const g = a.groundFire;
      const burn = this.g.player(t.owner)?.mods.burn ?? 1;
      this.fires.push({ lane, x, y, r: g.radius, dps: g.dps * t.dmgMul * burn, until: this.g.time + g.dur, owner: t.owner, tower: t.id });
      this.g.emit({ e: 'fire', t: this.g.time, lane, x, y, r: g.radius, until: this.g.time + g.dur });
    }
  }

  private hitCreep(t: Tower, a: AttackDef, c: Creep, dmg: number, crit: boolean): void {
    if (!c.alive) return;
    const dealt = this.damage(c, dmg, a.type, t.owner, t.id, a.onHit);
    if (crit && dealt > 0) this.g.emit({ e: 'crit', t: this.g.time, id: c.id, amount: Math.round(dealt) });
    if (a.onHit && c.alive) this.applyOnHit(c, a.onHit, t.owner, t);
  }

  private updateBeam(t: Tower, a: AttackDef): void {
    const beam = a.beam!;
    let target = t.beamTarget >= 0 ? this.g.creeps.get(t.beamTarget) : undefined;
    const range = this.rangeOf(t, a);
    const r2 = range * range;
    if (target && (!target.alive || target.lane !== t.lane || (target.x - t.cx) ** 2 + (target.y - t.cy) ** 2 > r2)) {
      const died = !target.alive;
      target = undefined;
      t.beamTarget = -1;
      t.beamRamp = died ? Math.max(1, t.beamRamp * beam.keepOnKill) : 1;
    }
    if (!target) {
      const found = this.acquire(t, range, a.targets, 1)[0];
      if (!found) {
        t.beamRamp = Math.max(1, t.beamRamp - DT);
        return;
      }
      target = found;
      t.beamTarget = found.id;
    }
    const dps = a.dmg[0] * t.dmgMul * t.spdMul * this.growthMul(t) * t.beamRamp * typeDamageMul(a.type, this.g.player(t.owner)?.mods);
    this.damage(target, dps * DT, a.type, t.owner, t.id, a.onHit);
    t.beamRamp = Math.min(beam.maxMult, t.beamRamp + beam.ramp * DT);
  }

  private updatePulse(t: Tower): void {
    const pu = t.def.pulse!;
    t.pulseCd -= DT * t.spdMul;
    if (t.pulseCd > 0) return;
    const r2 = pu.radius * pu.radius;
    let hits = this.g.lanes[t.lane].creeps.filter((c) => c.alive && c.lane === t.lane && this.canTarget(pu.targets, c) && (c.x - t.cx) ** 2 + (c.y - t.cy) ** 2 <= r2);
    if (hits.length === 0) {
      t.pulseCd = 0;
      return;
    }
    if (pu.maxTargets) hits = hits.sort((a, b) => (a.x - t.cx) ** 2 + (a.y - t.cy) ** 2 - ((b.x - t.cx) ** 2 + (b.y - t.cy) ** 2)).slice(0, pu.maxTargets);
    this.g.emit({ e: 'pulse', t: this.g.time, tw: t.id });
    for (const c of hits) {
      if (!c.alive) continue;
      if (pu.annihilate) {
        if (c.def.boss) this.applyRawDamage(c, c.hp * pu.annihilate.bossPct, t.owner, t.id);
        else this.applyRawDamage(c, c.hp + c.shield + 1, t.owner, t.id);
        continue;
      }
      if (pu.dmg) this.damage(c, pu.dmg * t.dmgMul * this.growthMul(t) * typeDamageMul(pu.type ?? 'magic', this.g.player(t.owner)?.mods), pu.type ?? 'magic', t.owner, t.id, pu.onHit);
      if (pu.onHit && c.alive) this.applyOnHit(c, pu.onHit, t.owner, t);
      if (pu.pull && c.alive && !c.def.immune && !c.def.boss) this.g.horde.pushBack(c, pu.pull);
    }
    t.pulseCd = pu.every;
  }
}
