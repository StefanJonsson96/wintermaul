import { h } from './dom';

export interface ModalHandle {
  el: HTMLElement;
  close: () => void;
}

/** Opens a modal dialog. Esc and clicking the backdrop close it when `dismissable`. */
export function openModal(content: HTMLElement, opts: { narrow?: boolean; wide?: boolean; dismissable?: boolean; soft?: boolean; onClose?: () => void } = {}): ModalHandle {
  const root = document.getElementById('modal-root')!;
  const box = h('div', { class: `panel modal${opts.narrow ? ' narrow' : ''}${opts.wide ? ' wide' : ''}` }, content);
  const back = h('div', { class: `modal-back${opts.soft ? ' soft' : ''}` }, box);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.remove();
    removeEventListener('keydown', onKey, true);
    opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && opts.dismissable !== false) {
      e.stopPropagation();
      close();
    }
  };
  if (opts.dismissable !== false) {
    back.addEventListener('mousedown', (e) => {
      if (e.target === back) close();
    });
  }
  addEventListener('keydown', onKey, true);
  root.appendChild(back);
  return { el: box, close };
}

export function anyModalOpen(): boolean {
  return (document.getElementById('modal-root')?.children.length ?? 0) > 0;
}
