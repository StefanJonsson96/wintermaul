// Touch controls for phones and tablets. While building, a finger aims the tower (the ghost
// follows it) and lifting it builds there. Otherwise one finger pans and a tap selects; a
// double-tap selects every tower of that kind, a long press adds or removes one. Two fingers
// always pan and pinch-zoom.
import type { Point } from './fx';
import type { Camera } from './renderer';

export interface TouchHost {
  camera(): Camera;
  building(): boolean;
  /** The finger is over this point while building. */
  aim(p: Point): void;
  /** The finger left the screen after aiming. */
  release(p: Point): void;
  /** Aiming was abandoned (a second finger came down). */
  stopAim(): void;
  tap(p: Point): void;
  longPress(p: Point): void;
}

type Bind = (target: HTMLElement, ev: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel', fn: (e: TouchEvent) => void) => void;

const MOVE_SLOP = 10;
const LONG_PRESS_MS = 450;

export class TouchControls {
  private points = new Map<number, Point>();
  private start: { p: Point; t: number; camX: number; camY: number } | null = null;
  private moved = false;
  private aiming = false;
  /** Set once a gesture can no longer end in a tap or a placement. */
  private spent = false;
  private pinch: { dist: number; zoom: number; world: Point } | null = null;
  private pressTimer = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly host: TouchHost,
  ) {}

  bind(on: Bind): void {
    on(this.canvas, 'touchstart', (e) => this.down(e));
    on(this.canvas, 'touchmove', (e) => this.move(e));
    on(this.canvas, 'touchend', (e) => this.up(e));
    on(this.canvas, 'touchcancel', (e) => this.up(e, true));
  }

  private local(t: Touch): Point {
    const r = this.canvas.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  private down(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) this.points.set(t.identifier, this.local(t));
    const cam = this.host.camera();
    if (this.points.size === 1) {
      const p = [...this.points.values()][0];
      this.start = { p, t: performance.now(), camX: cam.x, camY: cam.y };
      this.moved = false;
      this.spent = false;
      if (this.host.building()) {
        this.aiming = true;
        this.host.aim(p);
      } else {
        this.pressTimer = window.setTimeout(() => {
          if (this.points.size !== 1 || this.moved || this.spent) return;
          this.spent = true;
          this.host.longPress(p);
        }, LONG_PRESS_MS);
      }
      return;
    }
    // a second finger: the gesture becomes a pan and pinch
    window.clearTimeout(this.pressTimer);
    this.spent = true;
    if (this.aiming) {
      this.aiming = false;
      this.host.stopAim();
    }
    this.startPinch();
  }

  private startPinch(): void {
    const [a, b] = [...this.points.values()];
    if (!a || !b) return;
    const cam = this.host.camera();
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.pinch = { dist: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), zoom: cam.zoom, world: cam.toWorld(mid.x, mid.y) };
  }

  private move(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) if (this.points.has(t.identifier)) this.points.set(t.identifier, this.local(t));
    const cam = this.host.camera();
    if (this.points.size >= 2 && this.pinch) {
      const [a, b] = [...this.points.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
      cam.zoom = Math.max(cam.minZoom, Math.min(cam.maxZoom, (this.pinch.zoom * dist) / this.pinch.dist));
      // keep the world point that started under the fingers under them
      const now = cam.toWorld(mid.x, mid.y);
      cam.x += this.pinch.world.x - now.x;
      cam.y += this.pinch.world.y - now.y;
      return;
    }
    if (this.points.size !== 1 || !this.start) return;
    const p = [...this.points.values()][0];
    const dx = p.x - this.start.p.x;
    const dy = p.y - this.start.p.y;
    if (!this.moved && Math.hypot(dx, dy) > MOVE_SLOP) {
      this.moved = true;
      window.clearTimeout(this.pressTimer);
    }
    if (this.aiming) {
      this.host.aim(p);
      return;
    }
    if (this.moved) {
      cam.x = this.start.camX - dx / cam.zoom;
      cam.y = this.start.camY - dy / cam.zoom;
    }
  }

  private up(e: TouchEvent, cancelled = false): void {
    e.preventDefault();
    let last: Point | null = null;
    for (const t of Array.from(e.changedTouches)) {
      last = this.points.get(t.identifier) ?? last;
      this.points.delete(t.identifier);
    }
    if (this.points.size === 1) {
      // one finger of a pinch lifted: keep panning with the other, but never tap or build
      const p = [...this.points.values()][0];
      const cam = this.host.camera();
      this.start = { p, t: performance.now(), camX: cam.x, camY: cam.y };
      this.moved = true;
      this.pinch = null;
      return;
    }
    if (this.points.size > 1) {
      this.startPinch();
      return;
    }
    window.clearTimeout(this.pressTimer);
    const start = this.start;
    this.start = null;
    this.pinch = null;
    if (this.aiming) {
      this.aiming = false;
      if (cancelled || this.spent || !last) this.host.stopAim();
      else this.host.release(last);
      return;
    }
    if (!cancelled && !this.spent && !this.moved && start && last && performance.now() - start.t < 600) this.host.tap(last);
  }
}
