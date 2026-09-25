type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown>;

/** Tiny element builder: h('div', { class: 'x', onclick: fn }, 'text', child). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'text') el.textContent = String(v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: HTMLElement, children: (Child | Child[])[]): void {
  for (const c of children) {
    if (Array.isArray(c)) append(el, c);
    else if (c === null || c === undefined || c === false) continue;
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function $(sel: string): HTMLElement {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el as HTMLElement;
}

export function toast(text: string, kind: '' | 'error' | 'good' | 'warn' = '', ms = 2600): void {
  const root = document.getElementById('toasts');
  if (!root) return;
  // collapse duplicates
  for (const t of Array.from(root.children)) {
    if (t.textContent === text) {
      t.remove();
    }
  }
  const el = h('div', { class: `toast ${kind}` }, text);
  root.appendChild(el);
  while (root.children.length > 5) root.firstElementChild?.remove();
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 450);
}

export function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.floor(n));
}

let tooltipEl: HTMLElement | null = null;

/** Rich hover tooltip: content is built lazily when the pointer enters. */
export function tooltip(target: HTMLElement, build: () => Node | string): void {
  target.addEventListener('mouseenter', (e) => showTooltip(build(), e as MouseEvent));
  target.addEventListener('mousemove', (e) => positionTooltip(e as MouseEvent));
  target.addEventListener('mouseleave', hideTooltip);
  target.addEventListener('mousedown', hideTooltip);
}

export function showTooltip(content: Node | string, e: MouseEvent): void {
  tooltipEl ??= document.getElementById('tooltip');
  if (!tooltipEl) return;
  clear(tooltipEl);
  tooltipEl.append(typeof content === 'string' ? document.createTextNode(content) : content);
  tooltipEl.classList.remove('hidden');
  positionTooltip(e);
}

export function positionTooltip(e: MouseEvent): void {
  if (!tooltipEl || tooltipEl.classList.contains('hidden')) return;
  const r = tooltipEl.getBoundingClientRect();
  let x = e.clientX + 16;
  let y = e.clientY - r.height - 12;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 16;
  if (y < 8) y = e.clientY + 18;
  tooltipEl.style.left = `${x}px`;
  tooltipEl.style.top = `${y}px`;
}

export function hideTooltip(): void {
  tooltipEl?.classList.add('hidden');
}
