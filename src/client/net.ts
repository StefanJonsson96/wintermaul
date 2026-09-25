import type { ClientMsg, ServerMsg } from '../shared/protocol';

type Handler<T extends ServerMsg['type']> = (msg: Extract<ServerMsg, { type: T }>) => void;

const TOKEN_KEY = 'winterward.token';
const NAME_KEY = 'winterward.name';

function storage(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** One WebSocket to the server, with automatic reconnects (the server resumes us by token). */
export class Net {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<(m: ServerMsg) => void>>();
  private retry = 0;
  connected = false;
  name = storage(NAME_KEY) ?? '';
  onStatus: (connected: boolean) => void = () => {};

  connect(): void {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.connected = true;
      this.retry = 0;
      this.onStatus(true);
      this.send({ type: 'hello', name: this.name, token: storage(TOKEN_KEY) ?? undefined });
    };
    ws.onmessage = (ev) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === 'welcome') {
        storage(TOKEN_KEY, msg.token);
        this.name = msg.name;
        storage(NAME_KEY, msg.name);
      }
      this.handlers.get(msg.type)?.forEach((h) => h(msg));
      this.handlers.get('*')?.forEach((h) => h(msg));
    };
    ws.onclose = (ev) => {
      this.connected = false;
      this.onStatus(false);
      if (ev.code === 4000) return; // replaced by another tab
      const delay = Math.min(5000, 400 * 2 ** this.retry++);
      setTimeout(() => this.connect(), delay);
    };
  }

  on<T extends ServerMsg['type']>(type: T, fn: Handler<T>): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(fn as (m: ServerMsg) => void);
  }

  send(msg: ClientMsg): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  setName(name: string): void {
    this.name = name;
    storage(NAME_KEY, name);
    this.send({ type: 'rename', name });
  }
}
