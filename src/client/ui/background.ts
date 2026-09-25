// Animated menu backdrop: starry sky, aurora ribbons, layered snowy mountains and falling snow.

interface Flake {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
}

export class Backdrop {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private stars: { x: number; y: number; r: number; p: number }[] = [];
  private flakes: Flake[] = [];
  private ridges: number[][] = [];
  private running = false;
  private mx = 0;
  private my = 0;
  private start = performance.now();

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    addEventListener('resize', () => this.resize());
    addEventListener('mousemove', (e) => {
      this.mx = e.clientX / innerWidth - 0.5;
      this.my = e.clientY / innerHeight - 0.5;
    });
    this.resize();
  }

  private resize(): void {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.w = innerWidth;
    this.h = innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.stars = Array.from({ length: 180 }, () => ({ x: Math.random(), y: Math.random() * 0.6, r: Math.random() * 1.3 + 0.2, p: Math.random() * 6.28 }));
    this.flakes = Array.from({ length: Math.round((this.w * this.h) / 9000) }, () => this.newFlake(true));
    this.ridges = [0.52, 0.62, 0.74].map((base, layer) => {
      const pts: number[] = [];
      let seed = 17 + layer * 31;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i <= 64; i++) {
        const x = i / 64;
        const v = Math.sin(x * (7 + layer * 3) + layer) * 0.035 + Math.sin(x * (19 + layer * 5)) * 0.018 + (rnd() - 0.5) * 0.02;
        pts.push(base + v - (layer === 0 ? Math.max(0, 0.12 - Math.abs(x - 0.68) * 0.5) : 0));
      }
      return pts;
    });
  }

  private newFlake(anywhere = false): Flake {
    return {
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : -10,
      r: Math.random() * 2.2 + 0.4,
      vy: Math.random() * 30 + 18,
      phase: Math.random() * 6.28,
    };
  }

  setRunning(on: boolean): void {
    if (on === this.running) return;
    this.running = on;
    this.canvas.style.display = on ? 'block' : 'none';
    if (on) {
      let last = performance.now();
      const loop = (now: number) => {
        if (!this.running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        this.draw(dt, (now - this.start) / 1000);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  private draw(dt: number, t: number): void {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#050914');
    sky.addColorStop(0.45, '#0b1730');
    sky.addColorStop(0.75, '#13284a');
    sky.addColorStop(1, '#1b3358');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // stars
    for (const s of this.stars) {
      const a = 0.45 + 0.55 * Math.sin(t * 1.5 + s.p) ** 2;
      ctx.fillStyle = `rgba(220,235,255,${a * 0.8})`;
      ctx.beginPath();
      ctx.arc(s.x * w + this.mx * -6, s.y * h + this.my * -4, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // aurora ribbons
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bands = [
      { y: 0.2, amp: 0.06, len: 0.22, hue: 158, speed: 0.12, freq: 2.4 },
      { y: 0.14, amp: 0.05, len: 0.16, hue: 190, speed: 0.08, freq: 3.1 },
      { y: 0.26, amp: 0.04, len: 0.12, hue: 275, speed: 0.1, freq: 1.7 },
    ];
    for (const b of bands) {
      for (let x = -20; x < w + 20; x += 5) {
        const u = x / w;
        const y = h * (b.y + Math.sin(u * b.freq * 6.28 + t * b.speed * 6.28) * b.amp + Math.sin(u * 13 + t * 0.7) * 0.012);
        const len = h * b.len * (0.6 + 0.4 * Math.sin(u * 9 + t * 0.9) ** 2);
        const alpha = 0.07 * (0.5 + 0.5 * Math.sin(u * 5 + t * 0.6)) * Math.min(1, u * 4, (1 - u) * 4);
        const g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, `hsla(${b.hue},90%,65%,0)`);
        g.addColorStop(0.25, `hsla(${b.hue},90%,65%,${alpha})`);
        g.addColorStop(1, `hsla(${b.hue + 20},90%,55%,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x + this.mx * -10, y, 6, len);
      }
    }
    ctx.restore();

    // mountains (far → near)
    const colors = [
      ['#1a2c4c', '#9fc3e8'],
      ['#142540', '#cfe3f7'],
      ['#0e1b31', '#e8f3ff'],
    ];
    this.ridges.forEach((pts, layer) => {
      const px = this.mx * -(8 + layer * 14);
      const py = this.my * -(4 + layer * 6);
      ctx.beginPath();
      ctx.moveTo(-40, h);
      pts.forEach((v, i) => ctx.lineTo((i / 64) * (w + 80) - 40 + px, v * h + py));
      ctx.lineTo(w + 40, h);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, h * 0.4, 0, h);
      g.addColorStop(0, colors[layer][0]);
      g.addColorStop(1, '#070d1a');
      ctx.fillStyle = g;
      ctx.fill();
      // snow caps
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = colors[layer][1];
      ctx.globalAlpha = 0.18 + layer * 0.05;
      ctx.lineWidth = 3 + layer;
      ctx.beginPath();
      pts.forEach((v, i) => {
        const X = (i / 64) * (w + 80) - 40 + px;
        const Y = v * h + py + 2;
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      });
      ctx.stroke();
      ctx.restore();
    });

    // pine silhouettes along the bottom
    ctx.fillStyle = '#060b16';
    for (let i = 0; i < 26; i++) {
      const x = ((i * 97) % 100) / 100 * w + this.mx * -30;
      const s = 40 + ((i * 53) % 60);
      const base = h + 6;
      ctx.beginPath();
      ctx.moveTo(x, base - s * 1.6);
      ctx.lineTo(x + s * 0.42, base);
      ctx.lineTo(x - s * 0.42, base);
      ctx.fill();
    }

    // snow
    ctx.fillStyle = 'rgba(235,245,255,0.85)';
    for (const f of this.flakes) {
      f.y += f.vy * dt;
      f.x += Math.sin(t * 0.8 + f.phase) * 12 * dt + 8 * dt;
      if (f.y > h + 8 || f.x > w + 10) Object.assign(f, this.newFlake());
      ctx.globalAlpha = 0.35 + f.r * 0.25;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}
