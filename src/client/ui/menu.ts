import type { RoomInfo } from '../../shared/protocol';
import { DIFFICULTIES } from '../../shared/protocol';
import type { Net } from '../net';
import { openHelp } from './help';
import { clear, h, toast } from './dom';
import { icon } from './icons';

export class MenuScreen {
  private roomList!: HTMLElement;
  private status!: HTMLElement;
  private nameInput!: HTMLInputElement;
  private codeInput!: HTMLInputElement;

  constructor(
    private root: HTMLElement,
    private net: Net,
  ) {
    this.render();
  }

  private render(): void {
    clear(this.root);
    const feature = (ic: string, title: string, text: string) =>
      h('div', { class: 'feature' }, h('div', { class: 'dot' }, icon(ic, 15)), h('div', null, h('b', null, title), text));

    this.nameInput = h('input', { maxlength: 18, placeholder: 'Your name', value: this.net.name }) as HTMLInputElement;
    this.nameInput.addEventListener('change', () => {
      const v = this.nameInput.value.trim();
      if (v) this.net.setName(v);
    });
    this.codeInput = h('input', { maxlength: 4, placeholder: 'CODE', style: { textTransform: 'uppercase', letterSpacing: '0.2em', width: '110px', flex: '0 0 auto' } }) as HTMLInputElement;
    this.codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.join();
    });

    this.status = h('div', { class: 'conn-status' }, 'Connecting…');
    this.roomList = h('div', { class: 'room-list' });

    const card = h(
      'div',
      { class: 'panel menu-card' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('h3', null, 'Play'), this.status),
      h('div', null, h('div', { class: 'label' }, 'Name'), h('div', { class: 'field-row' }, this.nameInput)),
      h(
        'div',
        { class: 'field-row' },
        h('button', { class: 'btn primary big', style: { flex: '1' }, onclick: () => this.quick() }, icon('play', 16), 'Quick play'),
        h('button', { class: 'btn big', style: { flex: '1' }, onclick: () => this.create(false) }, 'Private room'),
      ),
      h(
        'div',
        { class: 'field-row' },
        this.codeInput,
        h('button', { class: 'btn', onclick: () => this.join() }, 'Join by code'),
        h('button', { class: 'btn ghost', onclick: () => this.create(true) }, 'Host public room'),
      ),
      h('div', { class: 'divider' }),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('h3', null, 'Open rooms'), h('button', { class: 'btn small ghost', onclick: () => this.net.send({ type: 'list' }) }, 'Refresh')),
      this.roomList,
    );

    const brand = h(
      'div',
      { class: 'brand' },
      h('h1', null, 'WINTERWARD'),
      h('div', { class: 'tagline' }, 'Co-op maze tower defense'),
      h(
        'p',
        { class: 'pitch' },
        'The Forces of the North are marching. Build a maze on the open snowfield, pick a race and hold the line with up to seven friends. Whatever slips through your maze runs straight into your neighbour\'s.',
      ),
      h(
        'div',
        { class: 'feature-list' },
        feature('maze', 'Maze the field', 'Every tower is a wall. Force the longest walk past your guns.'),
        feature('arrows', 'Leaks are shared', 'Creeps you miss cost a life and invade the next lane.'),
        feature('star', '12 races, 96 towers', 'Pick a race, add a second after wave 7, a Legend later.'),
        feature('people', '1–8 players, no login', 'Share a 4-letter room code. Add bots to fill seats.'),
      ),
      h('div', { style: { marginTop: '22px', display: 'flex', gap: '10px' } }, h('button', { class: 'btn', onclick: () => openHelp() }, icon('help', 16), 'How to play')),
    );

    this.root.append(
      h(
        'div',
        { class: 'menu-wrap' },
        brand,
        card,
        h('div', { class: 'menu-footer' }, h('span', null, 'Inspired by Wintermaul for Warcraft III. All art is procedurally drawn.'), h('span', null, 'Tip: add ?room=CODE to the URL to share an invite.')),
      ),
    );
    this.setRooms([]);
  }

  private create(isPublic: boolean): void {
    this.commitName();
    this.net.send({ type: 'create', public: isPublic });
  }

  private quick(): void {
    this.commitName();
    this.net.send({ type: 'quick' });
  }

  private join(): void {
    const code = this.codeInput.value.trim().toUpperCase();
    if (code.length !== 4) {
      toast('Room codes have 4 letters', 'error');
      return;
    }
    this.commitName();
    this.net.send({ type: 'join', code });
  }

  private commitName(): void {
    const v = this.nameInput.value.trim();
    if (v && v !== this.net.name) this.net.setName(v);
  }

  setName(name: string): void {
    if (document.activeElement !== this.nameInput) this.nameInput.value = name;
  }

  setStatus(connected: boolean): void {
    this.status.textContent = connected ? 'Online' : 'Connecting…';
    this.status.classList.toggle('ok', connected);
  }

  setRooms(rooms: RoomInfo[]): void {
    clear(this.roomList);
    if (rooms.length === 0) {
      this.roomList.append(h('div', { class: 'empty-note' }, 'No public rooms right now — start one with Quick play!'));
      return;
    }
    for (const r of rooms.sort((a, b) => Number(a.state !== 'lobby') - Number(b.state !== 'lobby'))) {
      this.roomList.append(
        h(
          'div',
          { class: 'room-item', onclick: () => this.net.send({ type: 'join', code: r.code }) },
          h('span', { class: 'code' }, r.code),
          h('span', { class: 'name' }, r.name),
          h('span', { class: 'pill' }, `${r.players}/${r.max}`),
          r.state === 'lobby' ? h('span', { class: 'pill' }, DIFFICULTIES[r.settings.difficulty].label) : h('span', { class: 'pill live' }, 'In game · watch'),
        ),
      );
    }
  }
}
