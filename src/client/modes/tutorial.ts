// The tutorial: a real, short game (8 waves, Emberforge) with a coach that explains one idea at
// a time and waits for the player to try it.
import { PILLAR_LINES } from '../../shared/constants';
import type { Game } from '../../shared/sim/game';
import type { GameView } from '../game/view';
import type { LocalGame, LocalOptions } from '../local';
import { h } from '../ui/dom';

interface Ctx {
  game: Game;
  view: GameView;
  /** Seconds since the step started. */
  age: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Step {
  title: string;
  body: (string | HTMLElement)[];
  /** Cells to light up on the map. */
  marks?: (c: Ctx) => Rect[];
  /** HUD element to pulse. */
  pulse?: string;
  /** The step ends when this is true; without it the player clicks Next. */
  done?: (c: Ctx) => boolean;
}

const key = (k: string) => h('kbd', null, k);
const b = (t: string) => h('b', null, t);

/** Top-left cells of the open gaps in a pillar column, minus the one left open. */
function gaps(line: number, leaveOpen: 'top' | 'bottom'): { x: number; y: number }[] {
  const { x, rows } = PILLAR_LINES[line];
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y + 1 < 24; y += 2) if (!rows.includes(y)) out.push({ x, y });
  return leaveOpen === 'bottom' ? out.slice(0, -1) : out.slice(1);
}

function mine(g: Game) {
  return [...g.towers.values()].filter((t) => t.owner === 0);
}

function openSpots(g: Game, spots: { x: number; y: number }[]) {
  const taken = new Set(mine(g).map((t) => `${t.x},${t.y}`));
  return spots.filter((p) => !taken.has(`${p.x},${p.y}`));
}

/** Tower-sized highlights on the spots still to build. */
function spotMarks(g: Game, spots: { x: number; y: number }[]): Rect[] {
  return openSpots(g, spots).map((p) => ({ ...p, w: 2, h: 2 }));
}

const FIRST = gaps(0, 'bottom');
const SECOND = gaps(1, 'top');
const THIRD = gaps(2, 'bottom');

const STEPS: Step[] = [
  {
    title: 'Welcome to Winterward',
    body: [
      'The Forces of the North come through the ',
      b('portal on the left'),
      ' and head for the ',
      b('gate on the right'),
      ', always along the shortest path (the dashed line). Every creep that gets through costs you a life.',
    ],
  },
  {
    title: 'Build a wall',
    body: ['Every tower is also a wall. Press ', key('Q'), ' (or click the Cinder Pot in the Build panel) and place it on a glowing spot between the pillars.'],
    marks: (c) => spotMarks(c.game, FIRST),
    pulse: '.build-grid .cmd-btn',
    done: (c) => mine(c.game).length >= 1,
  },
  {
    title: 'Plug the gaps',
    body: ['The gaps between pillars are exactly one tower wide. Plug the other glowing gaps — hold ', key('Shift'), ' to keep placing. The bottom gap stays open, so the creeps have to walk down to it.'],
    marks: (c) => spotMarks(c.game, FIRST),
    done: (c) => openSpots(c.game, FIRST).length <= 0 || (mine(c.game).length >= 6 && c.age > 20),
  },
  {
    title: 'Make them zig-zag',
    body: ['Now the next line of pillars: plug every gap except the ', b('top'), ' one. Watch the dashed path bend — every extra step is another shot from your towers.'],
    marks: (c) => spotMarks(c.game, SECOND),
    done: (c) => openSpots(c.game, SECOND).length <= 1 || (mine(c.game).length >= 11 && c.age > 25),
  },
  {
    title: 'Call the first wave',
    body: ['Your gold is almost gone — kills pay the rest. Press ', key('G'), ' or ', b('Call wave'), ' when you are ready. Calling early even pays a small bonus.'],
    pulse: '.ready-btn',
    done: (c) => c.game.wave >= 1,
  },
  {
    title: 'Keep building!',
    body: ['Every kill pays gold. ', b('Spend it right away'), ': keep plugging gaps on the third pillar line while the wave runs. In the first waves, gold in your pocket is gold wasted.'],
    marks: (c) => spotMarks(c.game, THIRD),
    done: (c) => c.game.phase === 'build' && c.game.wave >= 1,
  },
  {
    title: 'Upgrades',
    body: ['Wave cleared! Click one of your towers to select it. Upgrades happen ', b('in place'), ', so they never break your maze.'],
    done: (c) => c.view.selected.size > 0 || mine(c.game).some((t) => t.def.tier >= 2),
  },
  {
    title: 'Pick a branch',
    body: ['Each tower upgrades along one of two branches. Press ', key('Q'), ' or ', key('W'), ' (or click an upgrade) to upgrade it. Hover a button to compare them.'],
    pulse: '.upg-btn',
    done: (c) => mine(c.game).some((t) => t.def.tier >= 2),
  },
  {
    title: 'Upgrade many at once',
    body: ['Drag a box over several towers (or double-click one) to select them all, then upgrade them together. Call the next waves when you are ready.'],
    done: (c) => c.game.wave >= 3,
  },
  {
    title: 'Know what is coming',
    body: ['The strip under the wave banner shows the next waves and their armor. ', b('Wave 4'), ' brings Heavy boars: Impact and Magic hurt them most, and Emberforge is fine against them.'],
    done: (c) => c.game.wave >= 4,
  },
  {
    title: 'Air!',
    body: [b('Wave 5 flies.'), ' Crows ignore your maze and cross the middle of the lane in a straight line. Upgrade the towers near the ', b('middle rows'), ' before it arrives.'],
    marks: () => [{ x: 3, y: 9, w: 38, h: 6 }],
    done: (c) => c.game.wave >= 5 && c.game.phase === 'build',
  },
  {
    title: 'Leaks',
    body: ['If a creep reaches the gate you lose lives and it runs through your maze again. In multiplayer it runs into your ', b("neighbour's lane"), ' instead — and whoever kills it gets the bounty.'],
    done: (c) => c.game.wave >= 7 && (c.game.phase === 'build' || c.age > 40),
  },
  {
    title: 'Lumber',
    body: ['After wave 7 you get ', b('lumber'), '. Press ', key('L'), ' to add a second race — or save it for a Legend tower (800 gold + 1 lumber) later.'],
    pulse: '.cmd-btn.special',
    done: (c) => (c.game.player(0)?.races.length ?? 0) >= 2 || c.age > 30 || c.game.wave >= 8,
  },
  {
    title: 'The last wave',
    body: ['Wave 8 is the end of the tutorial. Hold the line! Tip: ', key('P'), ' pauses the game and ', key('F'), ' fast-forwards.'],
    done: () => false,
  },
];

/** The on-screen coach: shows the current step and advances when its goal is met. */
class Coach {
  private step = 0;
  private started = performance.now() / 1000;
  private panel: HTMLElement;
  private lastPulse: Element | null = null;
  private nextCheck = 0;

  constructor(
    private view: GameView,
    private local: LocalGame,
  ) {
    this.panel = h('div', { class: 'coach panel' });
    document.getElementById('hud')?.append(this.panel);
    view.frameHooks.push((now) => this.update(now));
    this.show();
  }

  private ctx(now: number): Ctx {
    return { game: this.local.game, view: this.view, age: now - this.started };
  }

  private show(): void {
    const s = STEPS[this.step];
    const buttons = h('div', { class: 'coach-actions' });
    if (!s.done) buttons.append(h('button', { class: 'btn small primary', onclick: () => this.advance() }, 'Next'));
    else if (this.step < STEPS.length - 1) buttons.append(h('button', { class: 'btn small ghost', onclick: () => this.advance() }, 'Skip'));
    this.panel.replaceChildren(
      h('div', { class: 'coach-head' }, h('span', null, 'Tutorial'), h('span', null, `${this.step + 1} / ${STEPS.length}`)),
      h('div', { class: 'coach-title' }, s.title),
      h('div', { class: 'coach-body' }, ...s.body.map((part) => (typeof part === 'string' ? document.createTextNode(part) : part.cloneNode(true)))),
      buttons,
    );
    this.panel.classList.remove('coach-in');
    void this.panel.offsetWidth;
    this.panel.classList.add('coach-in');
  }

  private advance(): void {
    if (this.step >= STEPS.length - 1) return;
    this.step++;
    this.started = performance.now() / 1000;
    this.show();
  }

  private update(now: number): void {
    if (!this.panel.isConnected) return;
    const s = STEPS[this.step];
    const c = this.ctx(now);
    const lane = this.view.state.myLane;
    this.view.marks = (s.marks?.(c) ?? []).map((r) => ({ lane, ...r }));
    const target = s.pulse ? document.querySelector(s.pulse) : null;
    if (target !== this.lastPulse) {
      this.lastPulse?.classList.remove('coach-pulse');
      target?.classList.add('coach-pulse');
      this.lastPulse = target;
    }
    if (now < this.nextCheck) return;
    this.nextCheck = now + 0.25;
    if (s.done?.(c)) this.advance();
  }
}

export function tutorialOptions(actions: { campaign: () => void; menu: () => void }): Omit<LocalOptions, 'name'> {
  return {
    mode: 'tutorial',
    settings: { difficulty: 'normal', raceMode: 'pick', endless: false },
    skipSetup: true,
    rules: { finalWave: 8, lives: 20, firstWaveDelay: 90, hpMul: 1.1 },
    prepare: (game) => {
      game.command(0, { c: 'race', race: 'fire' });
    },
    attach: (view, local) => {
      new Coach(view, local);
    },
    endActions: (victory, _stats, local) =>
      victory
        ? [
            { label: 'Start the campaign', kind: 'primary', run: actions.campaign },
            { label: 'Main menu', run: actions.menu },
          ]
        : [
            { label: 'Try again', kind: 'primary', run: () => local.start() },
            { label: 'Main menu', run: actions.menu },
          ],
  };
}
