import { h, hideTooltip } from './dom';

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
    hideTooltip();
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

/** A yes/no question inside the page (the browser's own confirm() is not available everywhere). */
export function confirmDialog(question: string, opts: { ok: string; cancel?: string; danger?: boolean }, onOk: () => void): void {
  const modal = openModal(
    h(
      'div',
      { class: 'confirm' },
      h('div', { class: 'confirm-q' }, question),
      h(
        'div',
        { class: 'field-row', style: { justifyContent: 'flex-end' } },
        h('button', { class: 'btn', onclick: () => modal.close() }, opts.cancel ?? 'Cancel'),
        h('button', { class: `btn ${opts.danger ? 'danger' : 'primary'}`, onclick: () => (modal.close(), onOk()) }, opts.ok),
      ),
    ),
    { narrow: true },
  );
}

export function anyModalOpen(): boolean {
  return (document.getElementById('modal-root')?.children.length ?? 0) > 0;
}
