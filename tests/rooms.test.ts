import type { WebSocket } from 'ws';
import { describe, expect, it } from 'vitest';
import { Lobby, type Session } from '../src/server/rooms';

// sessions without a socket: the server simply doesn't send them anything
const connect = (lobby: Lobby, name: string): Session => {
  const s = lobby.newSession(null as unknown as WebSocket);
  lobby.handle(s, { type: 'hello', name });
  return s;
};

describe('rooms', () => {
  it('seat players, keep the host and start a game', () => {
    const lobby = new Lobby();
    const a = connect(lobby, 'Ann');
    const b = connect(lobby, 'Bob');
    lobby.handle(a, { type: 'create', public: false });
    const room = a.room!;
    lobby.handle(b, { type: 'join', code: room.code });
    expect(room.roomState(0).players.map((p) => p.name)).toEqual(['Ann', 'Bob']);
    // only the host starts
    lobby.handle(b, { type: 'start' });
    expect(room.state).toBe('lobby');
    lobby.handle(a, { type: 'start' });
    expect(room.state).toBe('playing');
    expect(room.game?.players.length).toBe(2);
  });

  it('bring campaign talents only when the host allows them', () => {
    const lobby = new Lobby();
    const a = connect(lobby, 'Ann');
    const b = connect(lobby, 'Bob');
    lobby.handle(a, { type: 'create', public: false });
    const room = a.room!;
    lobby.handle(b, { type: 'join', code: room.code });
    // loadouts are cleaned: unknown talents dropped, ranks capped
    lobby.handle(a, { type: 'talents', loadout: { honed: 5, hearts: 99, bogus: 3 } });
    expect(room.roomState(0).players[0].talents).toBe(10);
    // a guest cannot switch talents on
    lobby.handle(b, { type: 'settings', settings: { talents: true } });
    expect(room.settings.talents).toBe(false);
    lobby.handle(a, { type: 'start' });
    expect(room.game!.player(0)!.mods).toEqual({});
    room.backToLobby();
    lobby.handle(a, { type: 'settings', settings: { talents: true } });
    expect(room.settings.talents).toBe(true);
    lobby.handle(a, { type: 'start' });
    const g = room.game!;
    expect(g.player(0)!.mods.dmg).toBeCloseTo(1.1);
    expect(g.player(1)!.mods).toEqual({});
    expect(g.fullState().mods?.[0]?.lives).toBe(10);
  });
});
