// What combat looks and sounds like: projectiles, lightning, impacts, bursts and floating numbers.
import { LANE_H, LANE_MARGIN_X, LANE_W } from '../../shared/constants';
import type { GameEvent } from '../../shared/protocol';
import { creepLift } from '../art/creeps';
import { towerMeta } from '../art/towers';
import { audio } from '../audio';
import { toast } from '../ui/dom';
import { type Fx, PROJ_COLORS, type Point } from './fx';
import { toWorld } from './layout';
import type { Renderer } from './renderer';
import type { CCreep, ClientState, CTower } from './state';

export class Effects {
  private leakToastAt = 0;

  constructor(
    private readonly state: ClientState,
    private readonly fx: Fx,
    private readonly renderer: Renderer,
    private readonly alive: () => boolean,
  ) {}

  /** Shows and plays a combat event. Returns false for events that are not about combat. */
  play(ev: GameEvent): boolean {
    const s = this.state;
    const now = performance.now() / 1000;
    const fx = this.fx;
    switch (ev.e) {
      case 'shot': {
        const t = s.towers.get(ev.tw);
        const c = s.creeps.get(ev.c);
        if (!t) return true;
        const target = c ? this.worldOfCreep(c) : null;
        const base = toWorld(t.lane, t.x + 1, t.y + 1);
        if (target) t.targetAngle = Math.atan2(target.y - base.y, target.x - base.x);
        t.firedAt = now;
        const from = this.muzzle(t);
        const color = ev.k === 'lightning' || ev.k === 'rail' ? t.tdef.art.glow : PROJ_COLORS[ev.k] ? (['bolt', 'frost', 'crystal', 'arcane', 'shadow', 'holy', 'poison', 'fireball'].includes(ev.k) ? t.tdef.art.glow : PROJ_COLORS[ev.k]) : t.tdef.art.glow;
        const g = this.gainAt(from);
        if (g > 0.05) audio.play(`shot:${ev.k}`, g * 0.45);
        if (!target) return true;
        if (ev.d <= 0 || ev.k === 'lightning' || ev.k === 'rail') {
          if (ev.k === 'rail') fx.beamFlash(from, target, color, now, 0.1);
          else fx.lightning([from, target], color, now);
          fx.burst(target.x, target.y + 0.3, color, 4, { speed: 1.5, life: 0.3, size: 0.05, z: 0.2 });
        } else {
          const getter = () => (c && s.isVisible(c) && s.creeps.has(c.id) ? this.worldOfCreep(c) : null);
          fx.projectile(ev.k, from, getter, this.realSeconds(ev.d), color, now, (p) => fx.burst(p.x, p.y + 0.3, color, 3, { speed: 1.2, life: 0.25, size: 0.05, z: 0.3 }));
        }
        return true;
      }
      case 'chain': {
        const t = s.towers.get(ev.tw);
        if (!t) return true;
        t.firedAt = now;
        const pts: Point[] = [this.muzzle(t)];
        for (const id of ev.ids) {
          const c = s.creeps.get(id);
          if (c) pts.push(this.worldOfCreep(c));
        }
        if (pts.length < 2) return true;
        const color = t.tdef.art.glow;
        const base = toWorld(t.lane, t.x + 1, t.y + 1);
        t.targetAngle = Math.atan2(pts[1].y - base.y, pts[1].x - base.x);
        if (ev.d <= 0) {
          fx.lightning(pts, color, now);
          audio.play('shot:lightning', this.gainAt(pts[0]) * 0.45);
        } else {
          const kind = t.tdef.attack?.proj ?? 'bolt';
          const first = s.creeps.get(ev.ids[0]);
          fx.projectile(kind, pts[0], () => (first && s.creeps.has(first.id) ? this.worldOfCreep(first) : null), this.realSeconds(ev.d), color, now);
          const rest = pts.slice(1);
          setTimeout(() => this.alive() && fx.lightning(rest, color, performance.now() / 1000, 0.09), this.realSeconds(ev.d) * 1000);
          audio.play(`shot:${kind}`, this.gainAt(pts[0]) * 0.45);
        }
        for (const p of pts.slice(1)) fx.burst(p.x, p.y + 0.3, color, 3, { speed: 1.2, life: 0.3, size: 0.05 });
        return true;
      }
      case 'line': {
        const t = s.towers.get(ev.tw);
        if (!t) return true;
        const from = this.muzzle(t);
        const end = toWorld(t.lane, ev.x, ev.y);
        const base = toWorld(t.lane, t.x + 1, t.y + 1);
        t.targetAngle = Math.atan2(end.y - base.y, end.x - base.x);
        t.firedAt = now;
        const kind = t.tdef.attack?.proj;
        if (kind === 'flame') {
          for (let i = 0; i < 14 * fx.quality; i++) {
            const k = Math.random();
            fx.burst(from.x + (end.x - from.x) * k, from.y + (end.y - from.y) * k + 0.4, i % 3 ? '#ff9a3c' : '#ffe08a', 1, { speed: 0.8, life: 0.35, size: 0.12, up: 1, grav: -1, z: 0.3 });
          }
          fx.beamFlash(from, end, '#ff7a2f', now, 0.22);
          audio.play('shot:flame', this.gainAt(from) * 0.45);
        } else {
          fx.beamFlash(from, end, t.tdef.art.glow, now, 0.13);
          audio.play('shot:rail', this.gainAt(from) * 0.5);
        }
        return true;
      }
      case 'impact': {
        const t = s.towers.get(ev.tw);
        const p = toWorld(ev.lane, ev.x, ev.y);
        const color = t?.tdef.art.glow ?? '#ffae4f';
        fx.ring(p.x, p.y, ev.r, color, now, 0.4, 0.07, true);
        fx.burst(p.x, p.y, color, Math.min(18, 4 + ev.r * 5), { speed: ev.r * 2, life: 0.45, size: 0.07 });
        if (ev.r >= 1.4) {
          fx.burst(p.x, p.y, '#9aa4b8', Math.round(ev.r * 3), { speed: ev.r, life: 0.8, size: 0.14, kind: 'smoke', add: false, up: 0.8, grav: 0 });
          audio.play('impact', this.gainAt(p) * Math.min(1, ev.r / 2.5) * 0.7);
        }
        return true;
      }
      case 'pulse': {
        const t = s.towers.get(ev.tw);
        if (!t) return true;
        t.pulsedAt = now;
        t.firedAt = now;
        const p = toWorld(t.lane, t.x + 1, t.y + 1);
        const r = t.tdef.pulse?.radius ?? 3;
        const color = t.tdef.art.glow;
        fx.ring(p.x, p.y, r, color, now, 0.55, 0.14, true);
        const isFrost = t.tdef.race === 'frost';
        fx.burst(p.x, p.y, isFrost ? '#e6f8ff' : color, 14, { speed: r * 1.6, life: 0.5, size: 0.07, kind: isFrost ? 'shard' : 'dot' });
        if (t.tdef.pulse?.annihilate) fx.ring(p.x, p.y, r * 1.2, '#36f0c8', now, 0.7, 0.2, true);
        audio.play(isFrost ? 'freeze' : 'pulse', this.gainAt(p) * 0.6);
        return true;
      }
      case 'crit': {
        const c = s.creeps.get(ev.id);
        if (!c) return true;
        const p = this.worldOfCreep(c);
        fx.text(p.x, p.y, `${ev.amount}!`, '#ffb44f', now, 15);
        return true;
      }
      case 'fire': {
        const p = toWorld(ev.lane, ev.x, ev.y);
        fx.fire(p.x, p.y, ev.r, now + (ev.until - ev.t));
        return true;
      }
      case 'heal': {
        const c = s.creeps.get(ev.id);
        if (!c) return true;
        const p = this.worldOfCreep(c);
        fx.ring(p.x, p.y + c.def.size, 2.5, '#9cff5a', now, 0.6, 0.05, false);
        fx.burst(p.x, p.y, '#b8ff80', 6, { speed: 1.2, life: 0.6, size: 0.06, up: 1.4, grav: 0 });
        return true;
      }
      case 'split':
        return true;
      case 'level': {
        const t = s.towers.get(ev.tw);
        if (!t) return true;
        const p = toWorld(t.lane, t.x + 1, t.y + 1);
        fx.text(p.x, p.y - 1.5, `Level ${ev.level}`, '#b8ff80', now, 13, 1.4);
        fx.burst(p.x, p.y - 0.5, '#d5f28a', 12, { speed: 1.5, life: 0.8, size: 0.06, kind: 'leaf', add: false });
        return true;
      }
      case 'die': {
        const c = s.creeps.get(ev.id);
        if (!c) return true;
        const p = this.worldOfCreep(c);
        const [a, b, d] = c.def.colors;
        const n = c.def.boss ? 40 : 10;
        fx.burst(p.x, p.y, a, n, { speed: 2.4, life: 0.7, size: 0.07 + c.def.size * 0.06, kind: 'shard', add: false, up: 2.5 });
        fx.burst(p.x, p.y, d, Math.round(n / 2), { speed: 1.8, life: 0.5, size: 0.05 });
        fx.burst(p.x, p.y + 0.3, b, 3, { speed: 0.6, life: 0.7, size: 0.14, kind: 'smoke', add: false, grav: 0, up: 0.4 });
        if (c.def.boss) fx.ring(p.x, p.y + c.def.size, 3, '#ffffff', now, 0.8, 0.12, true);
        if (ev.by === s.you && ev.gold > 0) fx.text(p.x, p.y - 0.2, `+${ev.gold}`, '#ffd35a', now, c.def.boss ? 18 : 13);
        if (ev.exec) fx.text(p.x, p.y - 0.8, 'Executed', '#c9a6ff', now, 12);
        audio.play('die', this.gainAt(p) * (c.def.boss ? 1 : 0.35));
        if (ev.gold > 0 && ev.by === s.you) audio.play('coin', this.gainAt(p) * 0.12);
        return true;
      }
      case 'leak': {
        const exit = toWorld(ev.from, LANE_W - 0.3, ev.y);
        fx.ring(exit.x, exit.y, 1.6, '#ff5f6d', now, 0.6, 0.12, true);
        fx.text(exit.x - 0.8, exit.y - 0.5, `-${ev.cost} ♥`, '#ff8a96', now, ev.cost > 1 ? 18 : 14, 1.5);
        if (!ev.escaped) {
          const to = toWorld(ev.to, 0.3, (LANE_H / 2) | 0);
          fx.streak(exit, { x: LANE_MARGIN_X - 0.9, y: to.y }, '#ff5f6d', now, 0.9);
        }
        const mine = s.laneOwners[ev.from] === s.you;
        audio.play('leak', mine ? 0.8 : Math.max(0.25, this.gainAt(exit) * 0.6));
        if (mine && now - this.leakToastAt > 6) {
          this.leakToastAt = now;
          const next = s.player(s.laneOwners[ev.to]);
          toast(ev.escaped ? 'A creep escaped!' : `Leak! It runs into ${next?.id === s.you ? 'your lane again' : `${next?.name}'s lane`}.`, 'warn', 2200);
        }
        return true;
      }
      case 'spawn': {
        if (ev.creep.x < 1) {
          const p = toWorld(ev.creep.lane, 0.2, ev.creep.y);
          fx.burst(p.x, p.y, '#c9a6ff', 3, { speed: 1, life: 0.4, size: 0.05 });
        }
        return true;
      }
      case 'build': {
        const t = ev.tower;
        const p = toWorld(t.lane, t.x + 1, t.y + 1);
        fx.burst(p.x, p.y + 0.4, '#dfe9f5', 10, { speed: 1.6, life: 0.6, size: 0.1, kind: 'smoke', add: false, up: 0.6, grav: 0 });
        if (t.owner === s.you) audio.play('build', 0.6);
        return true;
      }
      case 'upgrade': {
        const t = s.towers.get(ev.id);
        if (!t) return true;
        const p = toWorld(t.lane, t.x + 1, t.y + 1);
        fx.burst(p.x, p.y - 0.4, '#ffe98a', 14, { speed: 1.5, life: 0.7, size: 0.06, up: 2.5 });
        fx.ring(p.x, p.y, 1.3, t.tdef.art.glow, now, 0.5, 0.08, false);
        if (t.owner === s.you) audio.play('upgrade', 0.5);
        return true;
      }
    }
    return false;
  }

  sold(t: CTower, refund: number): void {
    const p = toWorld(t.lane, t.x + 1, t.y + 1);
    const now = performance.now() / 1000;
    this.fx.burst(p.x, p.y - 0.3, '#ffd35a', 12, { speed: 2, life: 0.7, size: 0.08, kind: 'coin', add: false, up: 3 });
    if (t.owner === this.state.you) {
      this.fx.text(p.x, p.y - 0.5, `+${refund}`, '#ffd35a', now, 14);
      audio.play('sell', 0.5);
    }
  }

  private worldOfCreep(c: CCreep): Point {
    const p = toWorld(c.rlane, c.x, c.y);
    return { x: p.x, y: p.y - c.def.size * 1.1 - creepLift(c.def) };
  }

  /** Converts a duration in game time to real time at the current game speed. */
  private realSeconds(gameSeconds: number): number {
    return gameSeconds / Math.max(1, this.state.speed);
  }

  private muzzle(t: CTower): Point {
    const p = toWorld(t.lane, t.x + 1, t.y + 1);
    const m = towerMeta(t.tdef);
    if (m.head !== null) {
      const len = 0.55 + t.tdef.tier * 0.08;
      return { x: p.x + Math.cos(t.angle) * len, y: p.y - m.head + Math.sin(t.angle) * len };
    }
    return { x: p.x, y: p.y - m.muzzle };
  }

  private gainAt(p: Point): number {
    const cam = this.renderer.cam;
    const dx = Math.abs(p.x - cam.x) / (cam.w / cam.zoom / 2 + 2);
    const dy = Math.abs(p.y - cam.y) / (cam.h / cam.zoom / 2 + 2);
    const d = Math.max(dx, dy);
    return d <= 1 ? 1 : Math.max(0, 1 - (d - 1) * 1.5);
  }
}
