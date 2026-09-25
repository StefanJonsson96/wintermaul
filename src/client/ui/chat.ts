import { PLAYER_COLORS } from '../../shared/constants';
import type { ChatLine } from '../../shared/protocol';
import type { Link } from '../local';
import { h } from './dom';

/** Chat log + input. In game the log fades out and the input opens with Enter. */
export class ChatBox {
  el: HTMLElement;
  log: HTMLElement;
  input: HTMLInputElement;
  /** Return true when a "-command" was handled locally. */
  onCommand: (cmd: string, args: string[]) => boolean = () => false;
  private isOpen = false;

  constructor(
    private link: Link,
    private inGame: boolean,
  ) {
    this.log = h('div', { class: 'chat-log' });
    this.input = h('input', { maxlength: 200, placeholder: inGame ? 'Say something… (Enter to send, Esc to close)' : 'Say something…' }) as HTMLInputElement;
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        this.submit();
        if (this.inGame) this.close();
      } else if (e.key === 'Escape') {
        this.input.value = '';
        if (this.inGame) this.close();
      }
    });
    if (inGame) {
      this.el = h('div', { class: 'game-chat' }, this.log, this.input);
      this.input.classList.add('hidden');
    } else {
      this.el = h('div', { style: { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' } }, this.log, h('div', { class: 'chat-input' }, this.input, h('button', { class: 'btn', onclick: () => this.submit() }, 'Send')));
    }
  }

  get opened(): boolean {
    return this.isOpen;
  }

  open(): void {
    this.isOpen = true;
    this.el.classList.add('open');
    this.input.classList.remove('hidden');
    this.input.focus();
  }

  close(): void {
    this.isOpen = false;
    this.el.classList.remove('open');
    this.input.classList.add('hidden');
    this.input.blur();
  }

  private submit(): void {
    const text = this.input.value.trim();
    this.input.value = '';
    if (!text) return;
    if (text.startsWith('-')) {
      const [cmd, ...args] = text.slice(1).split(/\s+/);
      if (this.onCommand(cmd.toLowerCase(), args)) return;
    }
    this.link.send({ type: 'chat', text });
  }

  add(line: ChatLine): void {
    const row = h('div', { class: `chat-line${line.from < 0 ? ' sys' : ''}` });
    if (line.from >= 0) {
      const c = PLAYER_COLORS[line.color] ?? PLAYER_COLORS[0];
      row.append(h('span', { class: 'who', style: { color: c.light } }, `${line.name}: `), line.text);
    } else row.append(line.text);
    this.log.append(row);
    while (this.log.children.length > 80) this.log.firstElementChild?.remove();
    this.log.scrollTop = this.log.scrollHeight;
    if (this.inGame) setTimeout(() => row.classList.add('faded'), 12000);
  }

  system(text: string): void {
    this.add({ from: -1, name: '', text, color: -1, t: Date.now() });
  }

  /** A gameplay tip, shown only to this player. */
  tip(text: string): void {
    const row = h('div', { class: 'chat-line tip' }, h('span', { class: 'tag' }, 'TIP'), text);
    this.log.append(row);
    while (this.log.children.length > 80) this.log.firstElementChild?.remove();
    this.log.scrollTop = this.log.scrollHeight;
    if (this.inGame) setTimeout(() => row.classList.add('faded'), 16000);
  }

  clear(): void {
    this.log.replaceChildren();
  }
}
