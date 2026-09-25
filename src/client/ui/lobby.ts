import { MAX_PLAYERS, PLAYER_COLORS } from '../../shared/constants';
import type { ChatLine, RoomState } from '../../shared/protocol';
import { loadSave, unspent } from '../campaign/save';
import { openTalents } from '../campaign/tree';
import type { Net } from '../net';
import { ChatBox } from './chat';
import { clear, h, toast } from './dom';
import { icon } from './icons';

export class LobbyScreen {
  private room: RoomState | null = null;
  private main!: HTMLElement;
  chat: ChatBox;

  constructor(
    private root: HTMLElement,
    private net: Net,
    private talentsChanged: () => void,
  ) {
    this.chat = new ChatBox(net, false);
    clear(root);
    this.main = h('div', { class: 'panel lobby-main' });
    root.append(
      h(
        'div',
        { class: 'lobby-wrap' },
        this.main,
        h('div', { class: 'lobby-side' }, h('div', { class: 'panel chat-panel' }, h('div', { class: 'label' }, 'Room chat'), this.chat.el)),
      ),
    );
  }

  addChat(line: ChatLine): void {
    this.chat.add(line);
  }

  update(room: RoomState): void {
    this.room = room;
    const me = room.players.find((p) => p.id === room.you);
    const isHost = !!me?.host;
    clear(this.main);

    const inviteUrl = `${location.origin}${location.pathname}?room=${room.code}`;
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        toast('Invite link copied!', 'good');
      } catch {
        toast(inviteUrl);
      }
    };

    const head = h(
      'div',
      { class: 'lobby-head' },
      h(
        'div',
        null,
        h('h2', null, room.name),
        h('div', { class: 'muted', style: { marginTop: '4px' } }, room.public ? 'Public room — anyone can join from the menu' : 'Private room — share the code with friends'),
      ),
      h(
        'div',
        { class: 'room-code' },
        h('div', null, h('div', { class: 'label', style: { textAlign: 'right' } }, 'Room code'), h('div', { class: 'code' }, room.code)),
        h('button', { class: 'btn icon-btn', title: 'Copy invite link', onclick: copy }, icon('copy', 16)),
      ),
    );

    const slots = h('div', { class: 'slots' });
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const p = room.players.find((x) => x.id === i);
      if (!p) {
        slots.append(
          h(
            'div',
            { class: 'slot empty' },
            isHost && room.state === 'lobby'
              ? h('button', { class: 'btn small ghost', onclick: () => this.net.send({ type: 'addBot' }) }, icon('bot', 14), 'Add bot')
              : 'Open slot',
          ),
        );
        continue;
      }
      const color = PLAYER_COLORS[p.color];
      const mine = p.id === room.you;
      const swatch = h('div', {
        class: 'swatch',
        title: mine ? 'Click to change your color' : color.name,
        style: { background: color.hex, boxShadow: `0 0 12px ${color.hex}88` },
        onclick: () => {
          if (!mine) return;
          for (let k = 1; k <= MAX_PLAYERS; k++) {
            const c = (p.color + k) % MAX_PLAYERS;
            if (!room.players.some((x) => x.color === c)) {
              this.net.send({ type: 'color', color: c });
              break;
            }
          }
        },
      });
      slots.append(
        h(
          'div',
          { class: 'slot', style: mine ? { borderColor: 'var(--accent)' } : null },
          swatch,
          h(
            'div',
            { class: 'who' },
            h('div', { class: 'n' }, p.name, mine ? h('span', { class: 'muted' }, ' (you)') : null),
            h('div', { class: 's' }, `${color.name}${!p.connected ? ' · reconnecting…' : ''}`),
          ),
          room.settings.talents && !p.isBot ? h('span', { class: 'tag talent', title: `${p.talents} runestones in talents` }, icon('rune', 12), String(p.talents)) : null,
          p.host ? h('span', { class: 'tag host' }, 'Host') : null,
          p.isBot ? h('span', { class: 'tag wait' }, 'Bot') : p.host ? null : p.ready ? h('span', { class: 'tag ready' }, 'Ready') : h('span', { class: 'tag wait' }, 'Not ready'),
          isHost && !mine ? h('button', { class: 'btn small ghost', title: 'Remove', onclick: () => this.net.send({ type: 'kick', slot: p.id }) }, '✕') : null,
        ),
      );
    }

    const chooser = room.players.filter((p) => !p.isBot).sort((a, b) => a.id - b.id)[0];
    const info = h(
      'div',
      { class: 'lobby-info' },
      h('b', null, 'Old-school start: '),
      `when the game begins, ${chooser ? chooser.name : 'the first player'} has 30 seconds to choose the difficulty and race mode (like Red in the classic). Then everyone picks a race — or goes `,
      h('b', null, 'random'),
      ' for bonus gold. Wave 1 arrives 45 seconds later.',
    );

    const talentsOn = !!room.settings.talents;
    const talents = h(
      'div',
      { class: `lobby-talents${talentsOn ? ' on' : ''}` },
      isHost
        ? h('div', { class: `switch${talentsOn ? ' on' : ''}`, onclick: () => this.net.send({ type: 'settings', settings: { talents: !talentsOn } }) })
        : h('span', { class: 'tl-state' }, talentsOn ? 'On' : 'Off'),
      h(
        'div',
        { class: 'tl-text' },
        h('b', null, 'Campaign talents'),
        h('span', { class: 'muted' }, talentsOn ? 'Everyone fights with the talents they earned in the campaign.' : 'Off: everyone plays on equal terms, the classic way.'),
      ),
      h(
        'button',
        {
          class: 'btn small ghost',
          onclick: () => {
            const save = loadSave();
            openTalents(save, () => this.talentsChanged());
          },
        },
        icon('star', 14),
        'My talents',
        unspent(loadSave()) > 0 ? h('span', { class: 'dot-badge' }) : null,
      ),
    );

    const humans = room.players.filter((p) => !p.isBot);
    const allReady = humans.every((p) => p.ready || p.host);
    const actions = h('div', { class: 'lobby-actions' });
    if (isHost) {
      actions.append(
        h(
          'button',
          {
            class: 'btn primary big',
            onclick: () => {
              if (!allReady && !confirm('Not everyone is ready. Start anyway?')) return;
              this.net.send({ type: 'start' });
            },
          },
          icon('play', 16),
          'Start game',
        ),
        h('button', { class: 'btn', onclick: () => this.net.send({ type: 'addBot' }), disabled: room.players.length >= MAX_PLAYERS }, icon('bot', 16), 'Add bot'),
        h(
          'label',
          { class: 'setting', style: { gap: '8px', marginLeft: '6px', cursor: 'pointer' } },
          h('div', { class: `switch${room.public ? ' on' : ''}`, onclick: () => this.net.send({ type: 'settings', settings: {}, public: !room.public }) }),
          h('span', { class: 'muted' }, 'Public'),
        ),
      );
    } else {
      actions.append(
        h('button', { class: `btn big ${me?.ready ? 'gold' : 'primary'}`, onclick: () => this.net.send({ type: 'ready', value: !me?.ready }) }, me?.ready ? 'Ready!' : 'I\'m ready'),
        h('span', { class: 'muted' }, 'Waiting for the host to start…'),
      );
    }
    actions.append(h('div', { style: { flex: '1' } }), h('button', { class: 'btn danger', onclick: () => this.net.send({ type: 'leave' }) }, icon('exit', 16), 'Leave'));

    this.main.append(head, slots, talents, info, actions);
  }
}
