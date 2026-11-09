// The Rune Web: the passive tree on a canvas you can drag and zoom. Click a node to take it and
// every node on the way to it; right-click gives a node back when nothing else hangs on it. On a
// touch screen, tap a node for its card. Respec is free.
import { canRefund, modsFromLoadout, NODE_BY_ID, NODES, type PassiveNode, pathTo, REGION_BY_ID, REGIONS, START, summarize, taken, totalSpent } from '../../shared/talents';
import { raceEmblem } from '../art/emblems';
import { touchDevice } from '../ui/device';
import { clear, h } from '../ui/dom';
import { icon, iconPath } from '../ui/icons';
import { confirmDialog, openModal } from '../ui/modal';
import { type CampaignSave, storeSave, unspent } from './save';

/** Node radius in tree units. */
const RADIUS: Record<PassiveNode['kind'], number> = { start: 0.55, small: 0.24, notable: 0.42, keystone: 0.62 };
/** How far out the tree reaches, in tree units (for fitting it on screen). */
const EXTENT = 11.8;

const KIND_LABEL: Record<PassiveNode['kind'], string> = { start: 'The start', small: 'Passive', notable: 'Notable', keystone: 'Keystone' };

/** Opens the Rune Web for this save; `onChange` runs after every change. */
export function openTalents(save: CampaignSave, onChange: () => void = () => {}): void {
  new RuneWeb(save, onChange);
}

class RuneWeb {
  private canvas = h('canvas', { class: 'web-canvas' }) as HTMLCanvasElement;
  private ctx = this.canvas.getContext('2d')!;
  private stones = h('div', { class: 'web-stones' });
  private tip = h('div', { class: 'web-tip hidden' });
  private card = h('div', { class: 'web-card hidden' });
  private summary = h('div', { class: 'web-summary hidden' });
  private note = h('div', { class: 'web-note' });
  private cam = { x: 0, y: 0, zoom: 30 };
  private fitZoom = 30;
  private size = { w: 0, h: 0, dpr: 1 };
  /** Node under the mouse, and the node whose card is open (touch). */
  private hover: string | null = null;
  private selected: string | null = null;
  private query = '';
  private matches = new Set<string>();
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture: { x: number; y: number; t: number; moved: boolean; camX: number; camY: number; pinch?: { dist: number; zoom: number; wx: number; wy: number } } | null = null;
  private noteTimer = 0;
  private raf = 0;
  private open = true;

  constructor(
    private readonly save: CampaignSave,
    private readonly onChange: () => void,
  ) {
    const search = h('input', { class: 'web-search', placeholder: 'Search', type: 'search' }) as HTMLInputElement;
    search.addEventListener('input', () => this.find(search.value));
    const head = h(
      'div',
      { class: 'web-head' },
      h('div', { class: 'web-title' }, h('h2', null, 'The Rune Web'), h('span', { class: 'muted' }, touchDevice ? 'Tap a node · drag to move · pinch to zoom' : 'Click a node to take the path to it · right-click to give one back · drag and scroll to look around')),
      h(
        'div',
        { class: 'web-tools' },
        this.stones,
        search,
        h('button', { class: 'btn small ghost', onclick: () => this.summary.classList.toggle('hidden') }, icon('scroll', 14), 'Bonuses'),
        h('button', { class: 'btn small ghost', onclick: () => this.reset() }, icon('reset', 14), 'Reset'),
        h('button', { class: 'btn small icon-btn web-close', title: 'Close', onclick: () => modal.close() }, '✕'),
      ),
    );
    const stage = h('div', { class: 'web-stage' }, this.canvas, this.tip, this.card, this.summary, this.note);
    const modal = openModal(h('div', { class: 'web' }, head, stage), {
      full: true,
      onClose: () => {
        this.open = false;
        cancelAnimationFrame(this.raf);
      },
    });
    this.bind();
    this.refresh();
    requestAnimationFrame(() => {
      this.resize();
      this.cam.zoom = this.fitZoom;
      this.loop();
    });
  }

  // ───────────────────────────────────────── state
  private get loadout() {
    return this.save.talents;
  }

  private refresh(): void {
    const free = unspent(this.save);
    clear(this.stones);
    this.stones.append(icon('rune', 17), h('b', null, String(free)), h('span', null, ` of ${this.save.stones} free`));
    clear(this.summary);
    const lines = summarize(modsFromLoadout(this.loadout));
    this.summary.append(h('div', { class: 'ws-title' }, `${totalSpent(this.loadout)} nodes taken`), ...(lines.length ? lines.map((l) => h('div', { class: 'ws-line' }, l)) : [h('div', { class: 'muted' }, 'Nothing yet: take a node next to the Hearth.')]));
    if (this.selected) this.showCard(this.selected);
  }

  private changed(): void {
    storeSave(this.save);
    this.refresh();
    this.onChange();
  }

  /** Takes a node and the cheapest path to it. */
  private take(id: string): void {
    const path = pathTo(id, this.loadout);
    if (!path.length) return;
    const free = unspent(this.save);
    if (path.length > free) {
      this.say(`That takes ${path.length} runestone${path.length > 1 ? 's' : ''}; you have ${free}.`);
      return;
    }
    this.save.talents = { ...this.loadout, ...Object.fromEntries(path.map((p) => [p, 1])) };
    this.changed();
  }

  private giveBack(id: string): void {
    if (!canRefund(id, this.loadout)) {
      this.say('Other nodes hang on this one: give those back first.');
      return;
    }
    const next = { ...this.loadout };
    delete next[id];
    this.save.talents = next;
    this.changed();
  }

  private reset(): void {
    if (totalSpent(this.loadout) === 0) return;
    confirmDialog('Give back every node? Your runestones return to you.', { ok: 'Reset the web', danger: true }, () => {
      this.save.talents = {};
      this.selected = null;
      this.card.classList.add('hidden');
      this.changed();
    });
  }

  private find(q: string): void {
    this.query = q.trim().toLowerCase();
    this.matches.clear();
    if (this.query.length < 2) return;
    for (const n of NODES) {
      const text = `${n.name} ${n.effects.map((e) => e.text).join(' ')}`.toLowerCase();
      if (text.includes(this.query)) this.matches.add(n.id);
    }
    this.say(`${this.matches.size} node${this.matches.size === 1 ? '' : 's'} match`);
  }

  private say(text: string): void {
    this.note.textContent = text;
    this.note.classList.add('on');
    clearTimeout(this.noteTimer);
    this.noteTimer = window.setTimeout(() => this.note.classList.remove('on'), 2200);
  }

  // ───────────────────────────────────────── details
  private details(id: string): HTMLElement[] {
    const n = NODE_BY_ID[id];
    const region = n.region ? REGION_BY_ID[n.region] : null;
    const out: HTMLElement[] = [
      h('div', { class: `wt-name ${n.kind}` }, n.name),
      h('div', { class: 'wt-kind', style: { color: region?.color ?? '#ffb46a' } }, `${KIND_LABEL[n.kind]}${region ? ` · ${region.name}` : ''}`),
      ...n.effects.map((e) => h('div', { class: `wt-line${e.bad ? ' bad' : ''}` }, e.text)),
    ];
    if (n.kind === 'start') out.push(h('div', { class: 'wt-line' }, 'Where every path begins. Take the nodes around it first.'));
    return out;
  }

  /** What clicking would do, for the tooltip and the card. */
  private action(id: string): { label: string; can: boolean; run?: () => void; refund?: boolean } {
    const have = taken(this.loadout);
    if (id === START) return { label: 'Always yours', can: false };
    if (have.has(id)) {
      const ok = canRefund(id, this.loadout);
      return { label: ok ? 'Give back' : 'Other nodes hang on this one', can: ok, run: () => this.giveBack(id), refund: true };
    }
    const path = pathTo(id, this.loadout);
    const free = unspent(this.save);
    const cost = `${path.length} runestone${path.length === 1 ? '' : 's'}`;
    if (path.length > free) return { label: `Needs ${cost} (you have ${free})`, can: false };
    return { label: path.length > 1 ? `Take the path · ${cost}` : `Take · ${cost}`, can: true, run: () => this.take(id) };
  }

  private showTip(id: string, x: number, y: number): void {
    const act = this.action(id);
    clear(this.tip);
    this.tip.append(...this.details(id), h('div', { class: `wt-act${act.can ? '' : ' no'}` }, act.refund && act.can ? 'Right-click to give it back' : act.can ? `Click: ${act.label.toLowerCase()}` : act.label));
    this.tip.classList.remove('hidden');
    const r = this.canvas.getBoundingClientRect();
    const tw = this.tip.offsetWidth;
    const th = this.tip.offsetHeight;
    this.tip.style.left = `${Math.min(r.width - tw - 8, x + 16)}px`;
    this.tip.style.top = `${Math.max(8, Math.min(r.height - th - 8, y - th / 2))}px`;
  }

  private showCard(id: string): void {
    this.selected = id;
    const act = this.action(id);
    clear(this.card);
    this.card.append(
      h('div', { class: 'wc-body' }, ...this.details(id)),
      h(
        'div',
        { class: 'wc-actions' },
        act.run && act.can ? h('button', { class: `btn ${act.refund ? 'danger' : 'primary'}`, onclick: () => act.run?.() }, act.label) : h('span', { class: 'muted wc-why' }, act.label),
        h('button', { class: 'btn ghost', onclick: () => this.closeCard() }, 'Close'),
      ),
    );
    this.card.classList.remove('hidden');
  }

  private closeCard(): void {
    this.selected = null;
    this.card.classList.add('hidden');
  }

  // ───────────────────────────────────────── input
  private bind(): void {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const id = this.nodeAt(e.offsetX, e.offsetY);
      if (id && taken(this.loadout).has(id)) this.giveBack(id);
    });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (this.pointers.size === 1) this.gesture = { x: e.offsetX, y: e.offsetY, t: performance.now(), moved: false, camX: this.cam.x, camY: this.cam.y };
      else if (this.pointers.size === 2 && this.gesture) {
        const [a, b] = [...this.pointers.values()];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const w = this.toWorld(mx, my);
        this.gesture.moved = true;
        this.gesture.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: this.cam.zoom, wx: w.x, wy: w.y };
      }
    });
    c.addEventListener('pointermove', (e) => {
      const g = this.gesture;
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
      if (g?.pinch && this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        this.cam.zoom = this.clampZoom((g.pinch.zoom * dist) / g.pinch.dist);
        // keep the point between the fingers under the fingers
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        this.cam.x = g.pinch.wx - (mx - this.size.w / 2) / this.cam.zoom;
        this.cam.y = g.pinch.wy - (my - this.size.h / 2) / this.cam.zoom;
        return;
      }
      if (g && this.pointers.size === 1) {
        const dx = e.offsetX - g.x;
        const dy = e.offsetY - g.y;
        if (Math.abs(dx) + Math.abs(dy) > 8) g.moved = true;
        if (g.moved) {
          this.cam.x = g.camX - dx / this.cam.zoom;
          this.cam.y = g.camY - dy / this.cam.zoom;
          this.tip.classList.add('hidden');
          return;
        }
      }
      if (e.pointerType === 'mouse') {
        this.hover = this.nodeAt(e.offsetX, e.offsetY);
        if (this.hover) this.showTip(this.hover, e.offsetX, e.offsetY);
        else this.tip.classList.add('hidden');
        c.style.cursor = this.hover ? 'pointer' : 'grab';
      }
    });
    const up = (e: PointerEvent) => {
      const g = this.gesture;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size > 0) {
        // one finger left after a pinch: keep panning from here
        const [p] = [...this.pointers.values()];
        if (g) this.gesture = { x: p.x, y: p.y, t: g.t, moved: true, camX: this.cam.x, camY: this.cam.y };
        return;
      }
      this.gesture = null;
      if (!g || g.moved || e.type === 'pointercancel' || e.button === 2) return;
      const id = this.nodeAt(e.offsetX, e.offsetY);
      if (e.pointerType === 'mouse') {
        if (id && !taken(this.loadout).has(id)) this.take(id);
        if (id) this.showTip(id, e.offsetX, e.offsetY);
      } else if (id) this.showCard(id);
      else this.closeCard();
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') {
        this.hover = null;
        this.tip.classList.add('hidden');
      }
    });
  }

  private clampZoom(z: number): number {
    return Math.max(this.fitZoom * 0.8, Math.min(95, z));
  }

  private zoomAt(sx: number, sy: number, factor: number): void {
    const before = this.toWorld(sx, sy);
    this.cam.zoom = this.clampZoom(this.cam.zoom * factor);
    const after = this.toWorld(sx, sy);
    this.cam.x += before.x - after.x;
    this.cam.y += before.y - after.y;
  }

  private toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: this.cam.x + (sx - this.size.w / 2) / this.cam.zoom, y: this.cam.y + (sy - this.size.h / 2) / this.cam.zoom };
  }

  private toScreen(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.cam.x) * this.cam.zoom + this.size.w / 2, y: (y - this.cam.y) * this.cam.zoom + this.size.h / 2 };
  }

  private nodeAt(sx: number, sy: number): string | null {
    let best: string | null = null;
    let bestD = Infinity;
    for (const n of NODES) {
      const p = this.toScreen(n.x, n.y);
      // generous on touch screens: fingers are wide
      const r = Math.max(touchDevice ? 18 : 10, RADIUS[n.kind] * this.cam.zoom + 4);
      const d = Math.hypot(p.x - sx, p.y - sy);
      if (d <= r && d < bestD) {
        bestD = d;
        best = n.id;
      }
    }
    return best;
  }

  // ───────────────────────────────────────── drawing
  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (r.width === this.size.w && r.height === this.size.h && dpr === this.size.dpr) return;
    this.size = { w: r.width, h: r.height, dpr };
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    const fit = Math.min(r.width, r.height) / (2 * EXTENT);
    const wasFit = Math.abs(this.cam.zoom - this.fitZoom) < 0.01;
    this.fitZoom = fit;
    if (wasFit) this.cam.zoom = fit;
    this.cam.zoom = this.clampZoom(this.cam.zoom);
  }

  private loop(): void {
    if (!this.open) return;
    this.raf = requestAnimationFrame(() => this.loop());
    this.resize();
    this.draw(performance.now() / 1000);
  }

  private draw(now: number): void {
    const { ctx, cam } = this;
    const { w, h: hh, dpr } = this.size;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, Math.max(w, hh) * 0.75);
    bg.addColorStop(0, '#111c30');
    bg.addColorStop(1, '#060a14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, hh);
    const have = taken(this.loadout);
    const preview = new Set(this.hover && !have.has(this.hover) ? pathTo(this.hover, this.loadout) : this.selected && !have.has(this.selected) ? pathTo(this.selected, this.loadout) : []);
    const reach = (id: string) => !have.has(id) && NODE_BY_ID[id].links.some((l) => have.has(l));

    // each region's glow and name
    REGIONS.forEach((reg, i) => {
      const a = ((-90 + i * 60) * Math.PI) / 180;
      const hub = this.toScreen(Math.cos(a) * 5.35, Math.sin(a) * 5.35);
      const g = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, 5 * cam.zoom);
      g.addColorStop(0, `${reg.color}26`);
      g.addColorStop(1, `${reg.color}00`);
      ctx.fillStyle = g;
      ctx.fillRect(hub.x - 5 * cam.zoom, hub.y - 5 * cam.zoom, 10 * cam.zoom, 10 * cam.zoom);
      const label = this.toScreen(Math.cos(a) * 11.15, Math.sin(a) * 11.15);
      ctx.font = `600 ${Math.max(12, Math.min(22, cam.zoom * 0.55))}px Cinzel, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `${reg.color}99`;
      ctx.fillText(reg.name.toUpperCase(), label.x, label.y);
    });

    // links
    for (const n of NODES) {
      const a = this.toScreen(n.x, n.y);
      for (const l of n.links) {
        if (l < n.id) continue;
        const o = NODE_BY_ID[l];
        const b = this.toScreen(o.x, o.y);
        const both = have.has(n.id) && have.has(l);
        const one = have.has(n.id) || have.has(l);
        const lit = (preview.has(n.id) || have.has(n.id)) && (preview.has(l) || have.has(l)) && !both;
        ctx.lineWidth = both ? Math.max(2.5, cam.zoom * 0.09) : lit ? 2.5 : 1.5;
        ctx.strokeStyle = both ? this.colorOf(n.region ? n : o, 0.95) : lit ? 'rgba(255,224,138,0.9)' : one ? 'rgba(143,180,216,0.55)' : 'rgba(110,140,185,0.22)';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // nodes
    const pulse = 0.5 + 0.5 * Math.sin(now * 4);
    for (const n of NODES) {
      const p = this.toScreen(n.x, n.y);
      const r = Math.max(n.kind === 'small' ? 4 : 7, RADIUS[n.kind] * cam.zoom);
      if (p.x < -r * 3 || p.y < -r * 3 || p.x > w + r * 3 || p.y > hh + r * 3) continue;
      const on = have.has(n.id);
      const open = reach(n.id);
      if (this.matches.has(n.id)) {
        ctx.strokeStyle = `rgba(255,214,90,${0.5 + 0.5 * pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 5 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (preview.has(n.id)) {
        ctx.fillStyle = 'rgba(255,224,138,0.25)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (n.id === this.selected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      this.drawNode(n, p.x, p.y, r, on, open, now);
    }
    // names on top of everything: keystones and race masteries sit apart and keep theirs, the
    // crowded notables only up close
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const n of NODES) {
      const named = n.kind === 'keystone' || (n.kind === 'notable' && (n.race ? cam.zoom > 24 : cam.zoom > 50));
      if (!named && (n.kind === 'small' || (n.id !== this.hover && n.id !== this.selected))) continue;
      const p = this.toScreen(n.x, n.y);
      const r = Math.max(7, RADIUS[n.kind] * cam.zoom);
      ctx.font = `${n.kind === 'keystone' ? 700 : 600} ${n.kind === 'keystone' ? 12 : 11}px Inter, sans-serif`;
      // the two keystones of the top and bottom regions sit side by side: their names lean apart, and
      // at the top they go above the nodes, where there is room
      let x = p.x;
      let y = p.y + r + 4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      if (n.kind === 'keystone' && n.region) {
        const a = ((-90 + REGIONS.findIndex((reg) => reg.id === n.region) * 60) * Math.PI) / 180;
        if (Math.abs(Math.sin(a)) > 0.9) {
          const side = n.x - Math.cos(a) * Math.hypot(n.x, n.y);
          ctx.textAlign = side < 0 ? 'right' : 'left';
          x = p.x + (side < 0 ? r : -r);
          if (Math.sin(a) < 0) {
            ctx.textBaseline = 'bottom';
            y = p.y - r - 4;
          }
        }
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(6,10,20,0.85)';
      ctx.strokeText(n.name, x, y);
      ctx.fillStyle = have.has(n.id) ? '#fff3cf' : 'rgba(207,224,244,0.8)';
      ctx.fillText(n.name, x, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
  }

  private colorOf(n: PassiveNode, a = 1): string {
    const c = n.region ? REGION_BY_ID[n.region].color : '#ffb46a';
    return a >= 1 ? c : `${c}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
  }

  private drawNode(n: PassiveNode, x: number, y: number, r: number, on: boolean, open: boolean, now: number): void {
    const ctx = this.ctx;
    const color = this.colorOf(n);
    ctx.save();
    if (n.kind === 'keystone') {
      // an eight-sided seal with a double frame
      const shape = (rr: number) => {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
      };
      if (on) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
      }
      shape(r);
      ctx.fillStyle = on ? this.gradient(x, y, r, color) : '#151d2c';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 3;
      ctx.strokeStyle = on ? '#ffe08a' : open ? color : 'rgba(150,170,200,0.5)';
      ctx.stroke();
      shape(r * 0.8);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = on ? 'rgba(255,240,200,0.8)' : 'rgba(150,170,200,0.35)';
      ctx.stroke();
      this.glyph(n, x, y, r * 1.0, on);
    } else if (n.kind === 'notable' || n.kind === 'start') {
      if (on || n.kind === 'start') {
        ctx.shadowColor = color;
        ctx.shadowBlur = n.kind === 'start' ? 16 + 6 * Math.sin(now * 2) : 12;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = on ? this.gradient(x, y, r, color) : '#162032';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = on ? '#ffe08a' : open ? color : 'rgba(150,170,200,0.5)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r + 3, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = on ? 'rgba(255,224,138,0.6)' : 'rgba(150,170,200,0.25)';
      ctx.stroke();
      this.glyph(n, x, y, r, on);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = on ? color : open ? '#22324a' : '#141c2b';
      ctx.fill();
      ctx.lineWidth = open ? 2 : 1.3;
      ctx.strokeStyle = on ? '#fff3cf' : open ? color : n.race ? 'rgba(200,170,255,0.45)' : 'rgba(150,170,200,0.4)';
      ctx.stroke();
    }
    ctx.restore();
  }

  private gradient(x: number, y: number, r: number, color: string): CanvasGradient {
    const g = this.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, color);
    g.addColorStop(1, '#0d1626');
    return g;
  }

  private glyph(n: PassiveNode, x: number, y: number, r: number, on: boolean): void {
    const ctx = this.ctx;
    if (n.race) {
      const em = raceEmblem(n.race, 64);
      ctx.globalAlpha = on ? 1 : 0.55;
      ctx.drawImage(em, x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
      ctx.globalAlpha = 1;
      return;
    }
    const s = r * 1.15;
    ctx.save();
    ctx.translate(x - s / 2, y - s / 2);
    ctx.scale(s / 24, s / 24);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = on ? '#ffffff' : 'rgba(200,215,235,0.7)';
    ctx.stroke(iconPath(n.kind === 'start' ? 'flame' : n.glyph));
    ctx.restore();
  }
}
