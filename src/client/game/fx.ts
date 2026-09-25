import { alpha, ellipse, glow, shade, star, type Ctx } from '../art/util';

// Visual effects: projectiles, lightning, impacts, particles and floating text.
// Everything is in world units (cells); `now` is local time in seconds.

export interface Point {
  x: number;
  y: number;
}

interface Projectile {
  kind: string;
  from: Point;
  to: () => Point | null; // live target position (homing)
  last: Point;
  start: number;
  dur: number;
  color: string;
  arc: number;
  size: number;
  trail: Point[];
  onHit?: (p: Point) => void;
}

interface Bolt {
  pts: Point[];
  start: number;
  dur: number;
  color: string;
  width: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  start: number;
  dur: number;
  color: string;
  width: number;
  fill: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number; // height above ground (world units, drawn upwards)
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'dot' | 'shard' | 'smoke' | 'spark' | 'coin' | 'leaf';
  add: boolean;
  grav: number;
  rot: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  start: number;
  dur: number;
  size: number;
}

interface Fire {
  x: number;
  y: number;
  r: number;
  until: number;
  seed: number;
}

interface Streak {
  a: Point;
  b: Point;
  start: number;
  dur: number;
  color: string;
}

export const PROJ_COLORS: Record<string, string> = {
  bolt: '#b8f0ff',
  arrow: '#efe0b8',
  bullet: '#fff0b0',
  rock: '#a89c8a',
  fireball: '#ff8a3c',
  meteor: '#ff6a2a',
  frost: '#aee6ff',
  poison: '#9cff5a',
  arcane: '#dcaeff',
  shadow: '#a47bff',
  holy: '#ffe98a',
  thorn: '#aef2a0',
  coin: '#ffd35a',
  crystal: '#ffaee6',
  missile: '#ffb45a',
  lightning: '#c6f7ff',
  rail: '#ff8a7a',
  flame: '#ff9a3c',
};

export class Fx {
  projectiles: Projectile[] = [];
  bolts: Bolt[] = [];
  rings: Ring[] = [];
  particles: Particle[] = [];
  texts: FloatText[] = [];
  fires: Fire[] = [];
  streaks: Streak[] = [];
  quality = 1;

  projectile(kind: string, from: Point, to: () => Point | null, dur: number, color: string, now: number, onHit?: (p: Point) => void): void {
    const start = to() ?? from;
    let f = from;
    let arc = 0;
    let size = 0.12;
    switch (kind) {
      case 'rock':
        arc = 0.9;
        size = 0.16;
        break;
      case 'poison':
        arc = 0.7;
        size = 0.14;
        break;
      case 'meteor':
        f = { x: start.x - 2.2, y: start.y - 6 };
        size = 0.26;
        break;
      case 'missile':
        arc = 0.8;
        size = 0.12;
        break;
      case 'fireball':
        size = 0.16;
        break;
      case 'frost':
        size = 0.13;
        break;
      case 'coin':
        arc = 0.5;
        break;
    }
    this.projectiles.push({ kind, from: f, to, last: { ...start }, start: now, dur: Math.max(0.05, dur), color, arc, size, trail: [], onHit });
  }

  lightning(pts: Point[], color: string, now: number, width = 0.07): void {
    const jag: Point[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(2, Math.round(d * 3));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const off = k === 0 ? 0 : (Math.random() - 0.5) * 0.35;
        jag.push({ x: a.x + (b.x - a.x) * t + off * (a.y - b.y) / (d || 1), y: a.y + (b.y - a.y) * t + off * (b.x - a.x) / (d || 1) });
      }
    }
    jag.push(pts[pts.length - 1]);
    this.bolts.push({ pts: jag, start: now, dur: 0.16, color, width });
  }

  beamFlash(a: Point, b: Point, color: string, now: number, width = 0.12): void {
    this.bolts.push({ pts: [a, b], start: now, dur: 0.2, color, width });
  }

  ring(x: number, y: number, r: number, color: string, now: number, dur = 0.45, width = 0.08, fill = false): void {
    this.rings.push({ x, y, r, start: now, dur, color, width, fill });
  }

  burst(x: number, y: number, color: string, n: number, opts: Partial<{ speed: number; life: number; size: number; kind: Particle['kind']; add: boolean; up: number; grav: number; z: number }> = {}): void {
    n = Math.round(n * this.quality);
    for (let i = 0; i < n; i++) {
      if (this.particles.length > 2200) this.particles.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 2) * (0.3 + Math.random() * 0.9);
      const life = (opts.life ?? 0.6) * (0.6 + Math.random() * 0.6);
      this.particles.push({
        x,
        y,
        z: opts.z ?? 0.3,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.6,
        vz: (opts.up ?? 1.5) * (0.4 + Math.random()),
        life,
        max: life,
        size: (opts.size ?? 0.07) * (0.6 + Math.random() * 0.8),
        color,
        kind: opts.kind ?? 'dot',
        add: opts.add ?? true,
        grav: opts.grav ?? 6,
        rot: Math.random() * 6.28,
      });
    }
  }

  text(x: number, y: number, text: string, color: string, now: number, size = 14, dur = 1.1): void {
    if (this.texts.length > 120) this.texts.shift();
    this.texts.push({ x: x + (Math.random() - 0.5) * 0.3, y, text, color, start: now, dur, size });
  }

  fire(x: number, y: number, r: number, until: number): void {
    this.fires.push({ x, y, r, until, seed: Math.random() * 10 });
  }

  streak(a: Point, b: Point, color: string, now: number, dur = 0.7): void {
    this.streaks.push({ a, b, start: now, dur, color });
  }

  update(dt: number, now: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const k = (now - p.start) / p.dur;
      const tgt = p.to();
      if (tgt) p.last = tgt;
      if (k >= 1) {
        p.onHit?.(p.last);
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z = Math.max(0, q.z + q.vz * dt);
      q.vz -= q.grav * dt;
      q.vx *= 1 - 1.5 * dt;
      q.vy *= 1 - 1.5 * dt;
      q.rot += dt * 6;
    }
    this.bolts = this.bolts.filter((b) => now - b.start < b.dur);
    this.rings = this.rings.filter((r) => now - r.start < r.dur);
    this.texts = this.texts.filter((t) => now - t.start < t.dur);
    this.fires = this.fires.filter((f) => f.until > now);
    this.streaks = this.streaks.filter((s) => now - s.start < s.dur);
  }

  /** Ground-level effects drawn under the entities. */
  drawGround(ctx: Ctx, now: number): void {
    for (const f of this.fires) {
      const fl = 0.75 + 0.25 * Math.sin(now * 13 + f.seed);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, f.x, f.y, f.r * 1.3, '#ff7a2f', 0.35 * fl);
      ctx.restore();
      ctx.fillStyle = `rgba(60,25,10,0.25)`;
      ellipse(ctx, f.x, f.y, f.r * 0.9, f.r * 0.55);
      ctx.fill();
      if (Math.random() < 0.3 * this.quality) this.burst(f.x + (Math.random() - 0.5) * f.r, f.y + (Math.random() - 0.5) * f.r * 0.6, '#ffae4f', 1, { speed: 0.3, life: 0.5, up: 1.2, grav: -0.5, size: 0.06 });
    }
    for (const r of this.rings) {
      const k = (now - r.start) / r.dur;
      const rr = r.r * (0.25 + 0.75 * Math.sqrt(k));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (r.fill) {
        ctx.fillStyle = alpha(r.color, 0.22 * (1 - k));
        ellipse(ctx, r.x, r.y, rr, rr * 0.7);
        ctx.fill();
      }
      ctx.strokeStyle = alpha(r.color, 0.85 * (1 - k));
      ctx.lineWidth = r.width * (1 - k * 0.6);
      ellipse(ctx, r.x, r.y, rr, rr * 0.7);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Airborne effects drawn above the entities. */
  drawAir(ctx: Ctx, now: number): void {
    ctx.save();
    // leak streaks
    for (const s of this.streaks) {
      const k = (now - s.start) / s.dur;
      const t = Math.min(1, k * 1.4);
      const mx = (s.a.x + s.b.x) / 2 + 4;
      const my = (s.a.y + s.b.y) / 2;
      const px = (1 - t) * (1 - t) * s.a.x + 2 * (1 - t) * t * mx + t * t * s.b.x;
      const py = (1 - t) * (1 - t) * s.a.y + 2 * (1 - t) * t * my + t * t * s.b.y;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, px, py, 0.9, s.color, 0.8 * (1 - k * 0.5));
    }
    // projectiles
    for (const p of this.projectiles) {
      const k = Math.min(1, (now - p.start) / p.dur);
      const x = p.from.x + (p.last.x - p.from.x) * k;
      const yGround = p.from.y + (p.last.y - p.from.y) * k;
      const lift = p.arc * Math.sin(Math.PI * k) * Math.min(3, Math.hypot(p.last.x - p.from.x, p.last.y - p.from.y) * 0.25 + 0.4);
      const y = yGround - lift;
      p.trail.push({ x, y });
      if (p.trail.length > 6) p.trail.shift();
      this.drawProjectile(ctx, p, x, y, now);
    }
    // lightning & beams
    for (const b of this.bolts) {
      const k = (now - b.start) / b.dur;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [w, a] of [
        [b.width * 3.2, 0.25],
        [b.width, 0.95],
      ] as const) {
        ctx.strokeStyle = alpha(a > 0.5 ? shade(b.color, 0.5) : b.color, a * (1 - k));
        ctx.lineWidth = w;
        ctx.beginPath();
        b.pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
        ctx.stroke();
      }
    }
    // particles
    for (const q of this.particles) {
      const a = Math.min(1, q.life / q.max * 1.5);
      const y = q.y - q.z;
      ctx.globalCompositeOperation = q.add ? 'lighter' : 'source-over';
      switch (q.kind) {
        case 'dot':
        case 'spark':
          ctx.fillStyle = alpha(q.color, a);
          ctx.beginPath();
          ctx.arc(q.x, y, q.size * (q.kind === 'spark' ? a : 1), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'smoke':
          ctx.fillStyle = alpha(q.color, a * 0.35);
          ctx.beginPath();
          ctx.arc(q.x, y, q.size * (2 - a), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'shard':
        case 'leaf':
        case 'coin':
          ctx.save();
          ctx.translate(q.x, y);
          ctx.rotate(q.rot);
          ctx.fillStyle = alpha(q.color, a);
          if (q.kind === 'coin') {
            ctx.scale(Math.abs(Math.cos(q.rot)) + 0.2, 1);
            ctx.beginPath();
            ctx.arc(0, 0, q.size, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(0, -q.size * 1.5);
            ctx.lineTo(q.size * 0.6, 0);
            ctx.lineTo(0, q.size * 1.5);
            ctx.lineTo(-q.size * 0.6, 0);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
          break;
      }
    }
    ctx.restore();
  }

  private drawProjectile(ctx: Ctx, p: Projectile, x: number, y: number, now: number): void {
    const c = p.color;
    const dx = p.last.x - p.from.x;
    const dy = p.last.y - p.from.y;
    const ang = Math.atan2(dy, dx);
    ctx.globalCompositeOperation = 'lighter';
    // trail
    if (p.trail.length > 1 && p.kind !== 'bullet') {
      ctx.strokeStyle = alpha(c, 0.35);
      ctx.lineWidth = p.size * 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      p.trail.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
    }
    switch (p.kind) {
      case 'bullet': {
        ctx.strokeStyle = alpha(c, 0.9);
        ctx.lineWidth = 0.06;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(ang) * 0.4, y - Math.sin(ang) * 0.4);
        ctx.lineTo(x, y);
        ctx.stroke();
        glow(ctx, x, y, 0.18, c, 0.7);
        break;
      }
      case 'arrow':
      case 'thorn': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillStyle = shade(c, -0.1);
        ctx.fillRect(-0.3, -0.025, 0.36, 0.05);
        ctx.beginPath();
        ctx.moveTo(0.12, -0.07);
        ctx.lineTo(0.24, 0);
        ctx.lineTo(0.12, 0.07);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'rock': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = shade(c, -0.1);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(8,14,28,0.6)';
        ctx.lineWidth = 0.03;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(x - p.size * 0.3, y - p.size * 0.3, p.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'missile': {
        ctx.globalCompositeOperation = 'source-over';
        const tdx = p.trail.length > 1 ? x - p.trail[p.trail.length - 2].x : dx;
        const tdy = p.trail.length > 1 ? y - p.trail[p.trail.length - 2].y : dy;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(tdy, tdx));
        ctx.fillStyle = '#d8d0c0';
        ctx.fillRect(-0.2, -0.05, 0.3, 0.1);
        ctx.fillStyle = '#ff5a4f';
        ctx.beginPath();
        ctx.moveTo(0.1, -0.05);
        ctx.lineTo(0.2, 0);
        ctx.lineTo(0.1, 0.05);
        ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, x - Math.cos(Math.atan2(tdy, tdx)) * 0.22, y - Math.sin(Math.atan2(tdy, tdx)) * 0.22, 0.2, '#ffae4f', 0.9);
        if (Math.random() < 0.6 * this.quality) this.particles.push({ x, y, z: 0, vx: 0, vy: 0, vz: 0.2, life: 0.5, max: 0.5, size: 0.08, color: '#b8b8c8', kind: 'smoke', add: false, grav: 0, rot: 0 });
        break;
      }
      case 'coin': {
        ctx.globalCompositeOperation = 'source-over';
        const w = Math.abs(Math.cos(now * 18)) * 0.11 + 0.02;
        ctx.fillStyle = '#ffd35a';
        ellipse(ctx, x, y, w, 0.11);
        ctx.fill();
        ctx.strokeStyle = '#a06a00';
        ctx.lineWidth = 0.025;
        ctx.stroke();
        break;
      }
      case 'crystal':
      case 'frost': {
        glow(ctx, x, y, p.size * 3, c, 0.55);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillStyle = shade(c, 0.5);
        ctx.beginPath();
        ctx.moveTo(p.size * 1.8, 0);
        ctx.lineTo(0, p.size * 0.6);
        ctx.lineTo(-p.size * 1.2, 0);
        ctx.lineTo(0, -p.size * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'meteor': {
        glow(ctx, x, y, 0.7, c, 0.75);
        ctx.fillStyle = '#fff0c0';
        ctx.beginPath();
        ctx.arc(x, y, p.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        if (Math.random() < 0.8 * this.quality) this.particles.push({ x, y, z: 0, vx: (Math.random() - 0.5) * 0.4, vy: -0.3, vz: 0.1, life: 0.4, max: 0.4, size: 0.12, color: '#ff7a2f', kind: 'dot', add: true, grav: 0, rot: 0 });
        break;
      }
      case 'holy': {
        glow(ctx, x, y, 0.35, c, 0.85);
        ctx.fillStyle = '#fffbe8';
        star(ctx, x, y, 0.14, 0.05, 4, now * 6);
        ctx.fill();
        break;
      }
      default: {
        glow(ctx, x, y, p.size * 3.2, c, 0.7);
        ctx.fillStyle = shade(c, 0.6);
        ctx.beginPath();
        ctx.arc(x, y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** Screen-space text layer; `toScreen` maps world → CSS pixels. */
  drawTexts(ctx: Ctx, now: number, toScreen: (x: number, y: number) => Point, zoom: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = (now - t.start) / t.dur;
      const p = toScreen(t.x, t.y - 0.6 - k * 0.9);
      const size = t.size * Math.min(1.25, Math.max(0.75, zoom / 38)) * (k < 0.15 ? 0.7 + k * 2 : 1);
      ctx.font = `800 ${size.toFixed(1)}px Inter, system-ui, sans-serif`;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(6,10,20,0.85)';
      ctx.strokeText(t.text, p.x, p.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, p.x, p.y);
    }
    ctx.restore();
  }
}
