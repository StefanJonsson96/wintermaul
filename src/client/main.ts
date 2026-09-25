import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './styles.css';
import type { RoomState } from '../shared/protocol';
import { GameView } from './game/view';
import { Net } from './net';
import { Backdrop } from './ui/background';
import { $, toast } from './ui/dom';
import { LobbyScreen } from './ui/lobby';
import { MenuScreen } from './ui/menu';

const qs = new URLSearchParams(location.search);
if (qs.has('gallery')) {
  const which = qs.get('gallery');
  void import('./gallery').then((m) => (which === 'creeps' ? m.showCreeps() : which ? m.showCreep(which) : m.showGallery()));
} else boot();

function boot(): void {
const net = new Net();
const backdrop = new Backdrop($('#bg-canvas') as HTMLCanvasElement);
const menu = new MenuScreen($('#screen-menu'), net);
const lobby = new LobbyScreen($('#screen-lobby'), net);
let game: GameView | null = null;
let room: RoomState | null = null;
let pendingJoin = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? null;

type Screen = 'menu' | 'lobby' | 'game';
function show(screen: Screen): void {
  $('#screen-menu').classList.toggle('hidden', screen !== 'menu');
  $('#screen-lobby').classList.toggle('hidden', screen !== 'lobby');
  $('#screen-game').classList.toggle('hidden', screen !== 'game');
  backdrop.setRunning(screen !== 'game');
  if (screen !== 'game' && game) {
    game.destroy();
    game = null;
  }
}

show('menu');

net.onStatus = (ok) => menu.setStatus(ok);

net.on('welcome', (m) => {
  menu.setName(m.name);
  if (pendingJoin) {
    net.send({ type: 'join', code: pendingJoin });
    pendingJoin = null;
  }
});

net.on('rooms', (m) => menu.setRooms(m.rooms));

net.on('room', (m) => {
  room = m.room;
  history.replaceState(null, '', `?room=${m.room.code}`);
  if (m.room.state === 'lobby') {
    show('lobby');
    lobby.update(m.room);
  } else if (!game) {
    // in a running game: the server sends 'start' right after this
  }
});

net.on('left', () => {
  room = null;
  history.replaceState(null, '', location.pathname);
  lobby.chat.clear();
  show('menu');
});

net.on('error', (m) => toast(m.message, 'error', 3500));

net.on('chat', (m) => {
  if (game) game.onChat(m.line);
  else lobby.addChat(m.line);
});

net.on('start', (m) => {
  show('game');
  game?.destroy();
  game = new GameView(net, $('#game-canvas') as HTMLCanvasElement, $('#hud'), m.state, m.you, () => !!room?.players.find((p) => p.id === room?.you)?.host);
});

net.on('snap', (m) => game?.onSnapshot(m.s));
net.on('cmdError', (m) => game?.onCmdError(m.message));
net.on('ping', (m) => game?.onPing(m.from, m.lane, m.x, m.y));
net.on('gameOver', (m) => game?.onGameOver(m.victory, m.stats));

net.connect();

// handy for debugging in the console
(window as unknown as { winterward: unknown }).winterward = { net, get game() { return game; } };
}
