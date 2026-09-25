import { randomBytes } from 'node:crypto';
import type { WebSocket } from 'ws';
import { DT, MAX_PLAYERS, SNAPSHOT_EVERY } from '../shared/constants';
import { TOWERS } from '../shared/data/races';
import {
  type ChatLine,
  type ClientMsg,
  DIFFICULTIES,
  type EndStats,
  type GameSettings,
  RACE_MODES,
  type RoomInfo,
  type RoomState,
  type ServerMsg,
} from '../shared/protocol';
import { Bot } from '../shared/sim/bot';
import { Game } from '../shared/sim/game';
import { botName, cleanChat, cleanName, randomName } from './names';

export interface Session {
  id: string;
  token: string;
  name: string;
  ws: WebSocket | null;
  room: Room | null;
  lastSeen: number;
  budget: number;
  budgetAt: number;
}

interface Seat {
  session: Session | null;
  name: string;
  color: number;
  isBot: boolean;
  ready: boolean;
  connected: boolean;
  bot?: Bot;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DEFAULT_SETTINGS: GameSettings = { difficulty: 'normal', raceMode: 'pick', endless: false };

function send(s: Session | null | undefined, msg: ServerMsg | string): void {
  if (!s?.ws || s.ws.readyState !== 1) return;
  s.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
}

export class Room {
  readonly code: string;
  name: string;
  isPublic: boolean;
  state: 'lobby' | 'playing' | 'ended' = 'lobby';
  settings: GameSettings = { ...DEFAULT_SETTINGS };
  seats: (Seat | null)[] = Array.from({ length: MAX_PLAYERS }, () => null);
  host: Session | null = null;
  spectators = new Set<Session>();
  game: Game | null = null;
  chat: ChatLine[] = [];
  private acc = 0;
  private last = performance.now();
  emptySince = 0;
  private endStats: { victory: boolean; stats: EndStats } | null = null;
  private botCounter = 0;

  constructor(code: string, name: string, isPublic: boolean) {
    this.code = code;
    this.name = name;
    this.isPublic = isPublic;
  }

  // ─────────────────────────────────────────────── membership
  seatOf(s: Session): number {
    return this.seats.findIndex((seat) => seat?.session === s);
  }

  humans(): Seat[] {
    return this.seats.filter((s): s is Seat => !!s && !s.isBot);
  }

  connectedHumans(): number {
    return this.humans().filter((s) => s.connected).length + this.spectators.size;
  }

  freeColor(): number {
    for (let c = 0; c < MAX_PLAYERS; c++) if (!this.seats.some((s) => s?.color === c)) return c;
    return 0;
  }

  join(s: Session): string | null {
    const existing = this.seatOf(s);
    if (existing >= 0) {
      const seat = this.seats[existing]!;
      seat.connected = true;
      this.game?.setConnected(existing, true);
      s.room = this;
      this.afterJoin(s);
      return null;
    }
    if (this.state !== 'lobby') {
      // join a running game as a spectator
      this.spectators.add(s);
      s.room = this;
      this.afterJoin(s);
      this.system(`${s.name} is watching.`);
      return null;
    }
    const slot = this.seats.findIndex((x) => x === null);
    if (slot < 0) return 'That room is full.';
    this.seats[slot] = { session: s, name: s.name, color: this.freeColor(), isBot: false, ready: false, connected: true };
    s.room = this;
    if (!this.host) this.host = s;
    this.afterJoin(s);
    this.system(`${s.name} joined.`);
    return null;
  }

  private afterJoin(s: Session): void {
    this.emptySince = 0;
    this.broadcastRoom();
    for (const line of this.chat.slice(-30)) send(s, { type: 'chat', line });
    if (this.game && (this.state === 'playing' || this.state === 'ended')) {
      send(s, { type: 'start', you: this.seatOf(s), state: this.game.fullState() });
      if (this.endStats) send(s, { type: 'gameOver', ...this.endStats });
    }
  }

  leave(s: Session, disconnected: boolean): void {
    if (this.spectators.delete(s)) {
      s.room = null;
      this.broadcastRoom();
      return;
    }
    const slot = this.seatOf(s);
    if (slot < 0) return;
    const seat = this.seats[slot]!;
    if (this.state === 'lobby' && !disconnected) {
      this.seats[slot] = null;
      s.room = null;
      this.system(`${seat.name} left.`);
    } else if (this.state === 'lobby') {
      seat.connected = false;
    } else {
      // in game: keep the lane (its towers keep fighting), just mark the player away
      seat.connected = false;
      this.game?.setConnected(slot, false);
      if (!disconnected) {
        seat.session = null;
        s.room = null;
      }
      this.system(`${seat.name} ${disconnected ? 'disconnected' : 'left the game'}.`);
    }
    if (this.host === s) this.host = this.humans().find((h) => h.session && h.connected && h.session !== s)?.session ?? null;
    this.broadcastRoom();
  }

  /** Lobby seats whose owners never came back are dropped after a grace period. */
  dropStaleSeats(now: number): void {
    if (this.state !== 'lobby') return;
    let changed = false;
    this.seats.forEach((seat, i) => {
      if (seat && !seat.isBot && !seat.connected && seat.session && now - seat.session.lastSeen > 20_000) {
        seat.session.room = null;
        this.seats[i] = null;
        changed = true;
      }
    });
    if (changed) {
      if (this.host && this.seatOf(this.host) < 0) this.host = this.humans().find((h) => h.connected)?.session ?? null;
      this.broadcastRoom();
    }
  }

  // ─────────────────────────────────────────────── messaging
  info(): RoomInfo {
    return {
      code: this.code,
      name: this.name,
      players: this.seats.filter(Boolean).length,
      max: MAX_PLAYERS,
      state: this.state,
      settings: this.settings,
      public: this.isPublic,
    };
  }

  roomState(you: number): RoomState {
    return {
      code: this.code,
      name: this.name,
      public: this.isPublic,
      state: this.state,
      settings: this.settings,
      you,
      players: this.seats.flatMap((seat, id) =>
        seat
          ? [{ id, name: seat.name, color: seat.color, isBot: seat.isBot, ready: seat.ready || seat.isBot, host: !!seat.session && seat.session === this.host, connected: seat.connected || seat.isBot }]
          : [],
      ),
    };
  }

  members(): Session[] {
    const out: Session[] = [];
    for (const seat of this.seats) if (seat?.session) out.push(seat.session);
    for (const sp of this.spectators) out.push(sp);
    return out;
  }

  broadcast(msg: ServerMsg): void {
    const str = JSON.stringify(msg);
    for (const m of this.members()) send(m, str);
  }

  broadcastRoom(): void {
    for (const m of this.members()) send(m, { type: 'room', room: this.roomState(this.seatOf(m)) });
  }

  system(text: string): void {
    this.pushChat({ from: -1, name: '', text, color: -1, t: Date.now() });
  }

  private pushChat(line: ChatLine): void {
    this.chat.push(line);
    if (this.chat.length > 60) this.chat.shift();
    this.broadcast({ type: 'chat', line });
  }

  // ─────────────────────────────────────────────── commands
  handle(s: Session, msg: ClientMsg): void {
    const slot = this.seatOf(s);
    const isHost = this.host === s;
    switch (msg.type) {
      case 'chat': {
        const text = cleanChat(msg.text);
        if (!text) return;
        const seat = slot >= 0 ? this.seats[slot]! : null;
        this.pushChat({ from: slot, name: seat?.name ?? s.name, text, color: seat?.color ?? -1, t: Date.now() });
        return;
      }
      case 'ping':
        if (slot < 0 || !this.game) return;
        this.broadcast({ type: 'ping', from: slot, lane: msg.lane | 0, x: +msg.x || 0, y: +msg.y || 0 });
        return;
      case 'ready':
        if (slot < 0 || this.state !== 'lobby') return;
        this.seats[slot]!.ready = !!msg.value;
        this.broadcastRoom();
        return;
      case 'color': {
        if (slot < 0 || this.state !== 'lobby') return;
        const c = msg.color | 0;
        if (c < 0 || c >= MAX_PLAYERS || this.seats.some((x) => x && x.color === c)) return;
        this.seats[slot]!.color = c;
        this.broadcastRoom();
        return;
      }
      case 'rename': {
        const name = cleanName(msg.name);
        if (!name) return;
        s.name = name;
        if (slot >= 0 && this.state === 'lobby') this.seats[slot]!.name = name;
        this.broadcastRoom();
        return;
      }
      case 'settings': {
        if (!isHost || this.state !== 'lobby') return;
        const st = msg.settings ?? {};
        if (st.difficulty && st.difficulty in DIFFICULTIES) this.settings.difficulty = st.difficulty;
        if (st.raceMode && st.raceMode in RACE_MODES) this.settings.raceMode = st.raceMode;
        if (typeof st.endless === 'boolean') this.settings.endless = st.endless;
        if (typeof msg.public === 'boolean') this.isPublic = msg.public;
        this.broadcastRoom();
        return;
      }
      case 'addBot': {
        if (!isHost || this.state !== 'lobby') return;
        const free = this.seats.findIndex((x) => x === null);
        if (free < 0) return;
        this.seats[free] = { session: null, name: botName(this.botCounter++), color: this.freeColor(), isBot: true, ready: true, connected: true };
        this.broadcastRoom();
        return;
      }
      case 'kick': {
        if (!isHost || this.state !== 'lobby') return;
        const target = this.seats[msg.slot | 0];
        if (!target || target.session === s) return;
        this.seats[msg.slot | 0] = null;
        if (target.session) {
          target.session.room = null;
          send(target.session, { type: 'left' });
          send(target.session, { type: 'error', message: 'You were removed from the room.' });
        }
        this.system(`${target.name} was removed.`);
        this.broadcastRoom();
        return;
      }
      case 'start':
        if (!isHost || this.state !== 'lobby') return;
        this.startGame();
        return;
      case 'playAgain':
        if (!isHost || this.state !== 'ended') return;
        this.backToLobby();
        return;
      case 'cmd': {
        if (!this.game || this.state !== 'playing' || slot < 0) return;
        const res = this.game.command(slot, msg.cmd);
        if (!res.ok) send(s, { type: 'cmdError', message: res.error });
        return;
      }
    }
  }

  // ─────────────────────────────────────────────── game lifecycle
  startGame(): void {
    const players = this.seats.flatMap((seat, id) => (seat ? [{ id, name: seat.name, color: seat.color, isBot: seat.isBot }] : []));
    if (players.length === 0) return;
    const seed = (Math.random() * 2 ** 31) | 0;
    this.game = new Game({ ...this.settings }, players, seed);
    this.seats.forEach((seat, id) => {
      if (seat?.isBot) seat.bot = new Bot(id, seed + id);
      if (seat && !seat.isBot && !seat.connected) this.game!.setConnected(id, false);
    });
    this.state = 'playing';
    this.endStats = null;
    this.acc = 0;
    this.last = performance.now();
    const state = this.game.fullState();
    for (const m of this.members()) send(m, { type: 'start', you: this.seatOf(m), state });
    this.broadcastRoom();
    this.system(`The game begins! ${DIFFICULTIES[this.settings.difficulty].label}, ${RACE_MODES[this.settings.raceMode].label}${this.settings.endless ? ', endless' : ''}.`);
  }

  backToLobby(): void {
    this.state = 'lobby';
    this.game = null;
    this.endStats = null;
    for (const seat of this.seats) if (seat) seat.ready = seat.isBot;
    // spectators take free seats when possible
    for (const sp of [...this.spectators]) {
      const free = this.seats.findIndex((x) => x === null);
      if (free < 0) break;
      this.spectators.delete(sp);
      this.seats[free] = { session: sp, name: sp.name, color: this.freeColor(), isBot: false, ready: false, connected: true };
    }
    this.seats.forEach((seat, i) => {
      if (seat && !seat.isBot && !seat.session) this.seats[i] = null;
    });
    if (!this.host || this.seatOf(this.host) < 0) this.host = this.humans().find((h) => h.connected)?.session ?? null;
    this.broadcastRoom();
  }

  update(now: number): void {
    if (this.state !== 'playing' || !this.game) {
      this.last = now;
      return;
    }
    this.acc += Math.min(250, now - this.last) / 1000;
    this.last = now;
    let steps = 0;
    while (this.acc >= DT && steps < 5) {
      this.acc -= DT;
      steps++;
      for (const seat of this.seats) seat?.bot?.update(this.game);
      this.game.step();
      if (this.game.tick % SNAPSHOT_EVERY === 0 || this.game.over) {
        this.broadcast({ type: 'snap', s: this.game.snapshot() });
      }
      if (this.game.over) {
        this.finishGame();
        break;
      }
    }
  }

  private finishGame(): void {
    const g = this.game!;
    const victory = g.phase === 'victory';
    const stats: EndStats = {
      wave: g.wave,
      lives: Math.max(0, g.lives),
      duration: g.time,
      players: g.players.map((p) => {
        let mvp: string | null = null;
        let best = -1;
        for (const t of g.towers.values()) {
          if (t.owner === p.id && t.damage > best) {
            best = t.damage;
            mvp = TOWERS[t.def.id].name;
          }
        }
        return { id: p.id, name: p.name, color: p.color, races: p.races, kills: p.kills, leaks: p.leaks, damage: Math.round(p.damage), goldEarned: Math.round(p.goldEarned), mvpTower: mvp };
      }),
    };
    this.state = 'ended';
    this.endStats = { victory, stats };
    this.broadcast({ type: 'gameOver', victory, stats });
    this.broadcastRoom();
    this.system(victory ? 'Victory! The north stands.' : `Defeat on wave ${g.wave}.`);
  }
}

export class Lobby {
  sessions = new Map<string, Session>();
  private byToken = new Map<string, Session>();
  rooms = new Map<string, Room>();

  newSession(ws: WebSocket): Session {
    const s: Session = {
      id: randomBytes(6).toString('hex'),
      token: randomBytes(16).toString('hex'),
      name: randomName(),
      ws,
      room: null,
      lastSeen: Date.now(),
      budget: 60,
      budgetAt: Date.now(),
    };
    this.sessions.set(s.id, s);
    this.byToken.set(s.token, s);
    return s;
  }

  /** Called on 'hello': re-attach to an earlier session when the browser presents its token. */
  resume(fresh: Session, token: string | undefined, ws: WebSocket): Session {
    const old = token ? this.byToken.get(token) : undefined;
    if (!old || old === fresh) return fresh;
    // drop the fresh placeholder
    this.sessions.delete(fresh.id);
    this.byToken.delete(fresh.token);
    if (old.ws && old.ws !== ws && old.ws.readyState === 1) old.ws.close(4000, 'Opened in another tab');
    old.ws = ws;
    old.lastSeen = Date.now();
    return old;
  }

  private makeCode(): string {
    for (;;) {
      let c = '';
      for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      if (!this.rooms.has(c)) return c;
    }
  }

  listRooms(): RoomInfo[] {
    return [...this.rooms.values()].filter((r) => r.isPublic).map((r) => r.info());
  }

  handle(s: Session, msg: ClientMsg): void {
    const now = Date.now();
    s.lastSeen = now;
    // simple rate limit: 60 messages, refilled at 30/s
    s.budget = Math.min(60, s.budget + ((now - s.budgetAt) / 1000) * 30);
    s.budgetAt = now;
    if (s.budget < 1) return;
    s.budget -= 1;

    switch (msg.type) {
      case 'hello': {
        const name = cleanName(msg.name);
        if (name) s.name = name;
        send(s, { type: 'welcome', id: s.id, token: s.token, name: s.name });
        if (s.room) s.room.join(s);
        else send(s, { type: 'rooms', rooms: this.listRooms() });
        return;
      }
      case 'list':
        send(s, { type: 'rooms', rooms: this.listRooms() });
        return;
      case 'rename': {
        const name = cleanName(msg.name);
        if (name) s.name = name;
        s.room?.handle(s, msg);
        return;
      }
      case 'create': {
        this.leaveRoom(s);
        const room = new Room(this.makeCode(), cleanName(msg.name) || `${s.name}'s game`, !!msg.public);
        if (msg.settings) {
          const st = msg.settings;
          if (st.difficulty && st.difficulty in DIFFICULTIES) room.settings.difficulty = st.difficulty;
          if (st.raceMode && st.raceMode in RACE_MODES) room.settings.raceMode = st.raceMode;
          if (typeof st.endless === 'boolean') room.settings.endless = st.endless;
        }
        this.rooms.set(room.code, room);
        room.join(s);
        return;
      }
      case 'join': {
        const code = String(msg.code ?? '').toUpperCase().trim();
        const room = this.rooms.get(code);
        if (!room) {
          send(s, { type: 'error', message: `No room with code ${code || '?'}.` });
          return;
        }
        if (s.room !== room) this.leaveRoom(s);
        const err = room.join(s);
        if (err) send(s, { type: 'error', message: err });
        return;
      }
      case 'quick': {
        this.leaveRoom(s);
        const open = [...this.rooms.values()].find((r) => r.isPublic && r.state === 'lobby' && r.seats.some((x) => x === null) && r.humans().length > 0);
        if (open) {
          open.join(s);
          return;
        }
        const room = new Room(this.makeCode(), `${s.name}'s game`, true);
        this.rooms.set(room.code, room);
        room.join(s);
        return;
      }
      case 'leave':
        this.leaveRoom(s);
        send(s, { type: 'left' });
        send(s, { type: 'rooms', rooms: this.listRooms() });
        return;
      default:
        s.room?.handle(s, msg);
    }
  }

  leaveRoom(s: Session): void {
    const room = s.room;
    if (!room) return;
    room.leave(s, false);
    s.room = null;
    if (room.connectedHumans() === 0 && (room.state !== 'playing' || room.humans().every((h) => !h.session))) this.rooms.delete(room.code);
  }

  disconnect(s: Session): void {
    s.ws = null;
    s.lastSeen = Date.now();
    s.room?.leave(s, true);
  }

  update(): void {
    const now = performance.now();
    for (const room of this.rooms.values()) room.update(now);
  }

  /** Periodic housekeeping: forget abandoned sessions and rooms. */
  cleanup(): void {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      room.dropStaleSeats(now);
      if (room.connectedHumans() === 0) {
        if (!room.emptySince) room.emptySince = now;
        const grace = room.state === 'playing' ? 180_000 : 30_000;
        if (now - room.emptySince > grace) {
          for (const m of room.members()) m.room = null;
          for (const seat of room.seats) if (seat?.session) seat.session.room = null;
          this.rooms.delete(room.code);
        }
      } else room.emptySince = 0;
    }
    for (const s of this.sessions.values()) {
      if (!s.ws && now - s.lastSeen > 600_000 && !s.room) {
        this.sessions.delete(s.id);
        this.byToken.delete(s.token);
      }
    }
  }
}
