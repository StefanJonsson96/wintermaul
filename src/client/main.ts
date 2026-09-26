import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './styles.css';
import type { Stage } from '../shared/campaign';
import type { RoomState, ServerMsg } from '../shared/protocol';
import { stageOptions } from './campaign/play';
import { loadSave, progressLine } from './campaign/save';
import { CampaignScreen } from './campaign/screen';
import { VERSION } from '../shared/version';
import { GameView } from './game/view';
import { type Link, LocalGame, type LocalOptions } from './local';
import { skirmishOptions } from './modes/skirmish';
import { tutorialOptions } from './modes/tutorial';
import { Net } from './net';
import { Backdrop } from './ui/background';
import { $, toast } from './ui/dom';
import { LobbyScreen } from './ui/lobby';
import { MenuScreen } from './ui/menu';

const qs = new URLSearchParams(location.search);
if (qs.has('gallery')) {
  const which = qs.get('gallery');
  void import('./gallery').then((m) => {
    if (which === 'creeps') m.showCreeps();
    else if (which === 'towers') m.showTowers(qs.get('race'));
    else if (which) m.showCreep(which);
    else m.showGallery();
  });
} else boot();

type Screen = 'menu' | 'lobby' | 'campaign' | 'game';

function boot(): void {
  const net = new Net();
  const backdrop = new Backdrop($('#bg-canvas') as HTMLCanvasElement);
  let game: GameView | null = null;
  let room: RoomState | null = null;
  let local: LocalGame | null = null;
  let pendingJoin = qs.get('room')?.toUpperCase() ?? null;

  const leaveTo = (to: 'menu' | 'campaign') => () => {
    if (!local) return show(to);
    local.exitTo = to;
    local.send({ type: 'leave' });
  };
  const menu = new MenuScreen($('#screen-menu'), net, {
    tutorial: () => startLocal(tutorialOptions({ campaign: leaveTo('campaign'), menu: leaveTo('menu') })),
    campaign: () => show('campaign'),
    skirmish: () => startLocal(skirmishOptions()),
    campaignProgress: () => progressLine(loadSave()),
  });
  const lobby = new LobbyScreen($('#screen-lobby'), net, () => sendTalents());
  const playStage = (stage: Stage) => startLocal(stageOptions(stage, loadSave(), { play: playStage, map: leaveTo('campaign') }));
  const sendTalents = () => net.send({ type: 'talents', loadout: loadSave().talents });
  const campaign = new CampaignScreen($('#screen-campaign'), { play: playStage, back: () => show('menu'), talentsChanged: sendTalents });

  function show(screen: Screen): void {
    for (const s of ['menu', 'lobby', 'campaign', 'game'] as const) $(`#screen-${s}`).classList.toggle('hidden', screen !== s);
    backdrop.setRunning(screen !== 'game');
    if (screen !== 'game' && game) {
      game.destroy();
      game = null;
    }
    if (screen === 'menu') menu.refresh();
    if (screen === 'campaign') campaign.show();
    else campaign.hide();
  }

  /** Starts a single-player game that runs in this browser tab. */
  function startLocal(opts: Omit<LocalOptions, 'name'>): void {
    local?.stop();
    const link = new LocalGame((msg) => route(msg, link), { ...opts, name: net.name || 'You' });
    local = link;
    link.start();
  }

  /** Handles a message from the server or from a local game. */
  function route(msg: ServerMsg, from: Link): void {
    // a stray message from a game we already left
    if (from !== net && from !== local) return;
    switch (msg.type) {
      case 'welcome':
        menu.setName(msg.name);
        sendTalents();
        if (msg.version !== VERSION) toast(`The server runs Winterward ${msg.version} (you have ${VERSION}). Reload the page to update.`, 'warn', 8000);
        if (pendingJoin) {
          net.send({ type: 'join', code: pendingJoin });
          pendingJoin = null;
        }
        return;
      case 'rooms':
        menu.setRooms(msg.rooms);
        return;
      case 'room':
        room = msg.room;
        history.replaceState(null, '', `?room=${msg.room.code}`);
        if (msg.room.state === 'lobby') {
          show('lobby');
          lobby.update(msg.room);
        }
        // in a running game the server sends 'start' right after this
        return;
      case 'left':
        if (from === local) {
          local = null;
          show(from.local?.exitTo ?? 'menu');
          return;
        }
        room = null;
        history.replaceState(null, '', location.pathname);
        lobby.chat.clear();
        show('menu');
        return;
      case 'error':
        toast(msg.message, 'error', 3500);
        return;
      case 'chat':
        if (game) game.onChat(msg.line);
        else lobby.addChat(msg.line);
        return;
      case 'start':
        show('game');
        game?.destroy();
        game = new GameView(from, $('#game-canvas') as HTMLCanvasElement, $('#hud'), msg.state, msg.you, () => !!room?.players.find((p) => p.id === room?.you)?.host);
        if (from.local) from.local.opts.attach?.(game, from.local);
        return;
      case 'snap':
        game?.onSnapshot(msg.s);
        return;
      case 'cmdError':
        game?.onCmdError(msg.message);
        return;
      case 'ping':
        game?.onPing(msg.from, msg.lane, msg.x, msg.y);
        return;
      case 'gameOver':
        game?.onGameOver(msg.victory, msg.stats);
        return;
    }
  }

  net.onStatus = (ok) => menu.setStatus(ok);
  net.onAny((msg) => route(msg, net));
  show('menu');
  net.connect();

  // handy for debugging in the console
  (window as unknown as { winterward: unknown }).winterward = {
    net,
    get game() {
      return game;
    },
    get local() {
      return local;
    },
  };
}
