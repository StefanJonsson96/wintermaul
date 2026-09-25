import { h } from './dom';
import { openModal } from './modal';

export function openHelp(): void {
  const key = (k: string, what: string) => [h('span', null, ...k.split(' ').map((x) => h('span', { class: 'kbd', style: { marginRight: '3px' } }, x))), h('span', null, what)];
  openModal(
    h(
      'div',
      null,
      h('h2', null, 'How to play'),
      h('div', { class: 'sub' }, 'Winterward is a cooperative maze tower defense in the spirit of the Warcraft III map Wintermaul.'),
      h(
        'div',
        { class: 'help-grid' },
        h('div', null, h('h4', null, 'Build a maze'), h('p', null, 'Creeps walk from the portal on the left of your lane to the gate on the right, always taking the shortest path. Every tower is also a wall: force them to walk as far as possible past your guns. You can never fully block the path — the game refuses such a placement.')),
        h('div', null, h('h4', null, 'Use the pillars'), h('p', null, 'Ancient pillars stand in four columns. The gaps between them are exactly one tower wide: plugging all but one gap bends the whole path for very little gold. Alternate the open gap top/bottom to make a zig-zag.')),
        h('div', null, h('h4', null, 'Leaks are shared'), h('p', null, 'A creep that reaches your gate costs the team a life (bosses cost more) and teleports into the next player\'s lane with the health it has left. If it gets through that maze too, it escapes. Whoever lands the killing blow gets the bounty.')),
        h('div', null, h('h4', null, 'Races & lumber'), h('p', null, 'You start with 1 lumber: spend it on a race. You get another after waves 10 and 25 — for a second race, a third, or a Legend tower. Build the cheap tier-1 tower of your race, then upgrade it in place along one of two branches.')),
        h('div', null, h('h4', null, 'Gold'), h('p', null, 'Every kill pays a bounty; every cleared wave pays everyone 10 + 2×wave gold. In the first waves, keep building with every coin or you will be overrun. Selling refunds 75% (100% if you undo during the same build phase). Selling during a wave leaves rubble until the wave ends.')),
        h('div', null, h('h4', null, 'Waves'), h('p', null, 'Forty waves, then the Winter Tyrant. Watch for AIR (flies straight over the maze — not every tower can hit it), SWARM, FORTIFIED, SPIRIT, IMMUNE (ignores slows and stuns), healers, splitters and bosses. Damage types matter: hover a tower to see what it is good against.')),
        h(
          'div',
          null,
          h('h4', null, 'Controls'),
          h(
            'div',
            { class: 'keys' },
            ...key('LMB', 'Select / place tower (hold Shift to keep placing)'),
            ...key('RMB Esc', 'Cancel placement / deselect'),
            ...key('Q W E R', 'Build buttons, or upgrades when a tower is selected'),
            ...key('X', 'Sell selected towers'),
            ...key('Drag', 'Box-select towers (then upgrade them all at once)'),
            ...key('Wheel', 'Zoom'),
            ...key('Arrows / RMB-drag', 'Move the camera (or drag with the middle button)'),
            ...key('Space', 'Jump to your lane'),
            ...key('Alt+Click', 'Ping the map for your team'),
            ...key('Enter', 'Chat (try -random, -ready)'),
          ),
        ),
        h(
          'div',
          null,
          h('h4', null, 'Damage vs armor'),
          h('p', null, 'Pierce: great vs Light, poor vs Fortified and Spirit. Impact: great vs Fortified and Heavy. Magic: great vs Heavy and Spirit. Elemental: good vs Light and Medium. Pure: equal against everything. Poison, burning and auras ignore armor entirely.'),
        ),
      ),
    ),
  );
}
