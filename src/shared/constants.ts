// Core tunables shared by server, client and tools.

export const TICK_RATE = 20; // simulation ticks per second
export const DT = 1 / TICK_RATE;
export const SNAPSHOT_EVERY = 2; // send a snapshot every N ticks (10 Hz)

// ---- Lane geometry (cells) ------------------------------------------------
// Creeps enter on the left edge and leave on the right edge of every lane.
export const LANE_W = 44;
export const LANE_H = 24;
export const BUILD_MIN_X = 3; // columns 0..2 are the spawn apron
export const BUILD_MAX_X = LANE_W - 4; // columns 41..43 are the exit apron (inclusive max = 40)
export const GATE_MIN_Y = 9; // rows used by the spawn portal / exit gate
export const GATE_MAX_Y = 14;
export const TOWER_SIZE = 2; // towers are 2x2 cells

// Ancient pillars: fixed 2x2 rocks in four columns. The 2-cell gaps between them are exactly one tower
// wide, so plugging gaps is the cheap early way to bend the path (you must always leave one open).
export const PILLAR_LINES: { x: number; rows: number[] }[] = [
  { x: 9, rows: [0, 4, 8, 12, 16, 20] },
  { x: 18, rows: [2, 6, 10, 14, 18, 22] },
  { x: 27, rows: [0, 4, 8, 12, 16, 20] },
  { x: 36, rows: [2, 6, 10, 14, 18, 22] },
];

// World layout (for rendering / minimap): lanes are stacked vertically.
export const LANE_MARGIN_X = 5; // decorative border left/right of a lane
export const LANE_GAP = 6; // decorative ridge between lanes
export const LANE_STRIDE = LANE_H + LANE_GAP;
export const WORLD_W = LANE_W + LANE_MARGIN_X * 2;
export const worldHeight = (lanes: number) => lanes * LANE_STRIDE + LANE_GAP;
export const laneOriginY = (lane: number) => LANE_GAP + lane * LANE_STRIDE;

export const MAX_PLAYERS = 8;

export interface PlayerColor {
  name: string;
  hex: string;
  light: string;
}

export const PLAYER_COLORS: PlayerColor[] = [
  { name: 'Red', hex: '#e8483f', light: '#ff8a80' },
  { name: 'Blue', hex: '#3c7dff', light: '#8ab4ff' },
  { name: 'Teal', hex: '#1fc7b3', light: '#7ef0e0' },
  { name: 'Purple', hex: '#9b5cf0', light: '#c9a6ff' },
  { name: 'Yellow', hex: '#f3c623', light: '#ffe482' },
  { name: 'Orange', hex: '#f5862e', light: '#ffc08a' },
  { name: 'Green', hex: '#44c24a', light: '#9cf09f' },
  { name: 'Pink', hex: '#f25ea9', light: '#ffa6d4' },
];

// ---- Economy -------------------------------------------------------------
export const START_GOLD = 120; // ~12 basic towers: build fast, then keep building with every bounty
export const START_LUMBER = 1;
export const SELL_REFUND = 0.75;
export const LUMBER_WAVES = [7, 20]; // +1 lumber after clearing these waves
export const waveBonus = (wave: number) => 10 + 2 * wave; // classic Wintermaul level bonus

// ---- Wave flow -------------------------------------------------------------
export const SETUP_TIME = 30; // Red has 30 seconds to pick the rules (like the classic difficulty dialog)
export const FIRST_WAVE_DELAY = 45; // seconds before wave 1 once the rules are set
export const BETWEEN_WAVES = 25; // seconds of build time after a wave is cleared
export const WAVE_FORCE_TIMEOUT = 75; // seconds after the last spawn before the next countdown starts anyway
export const READY_SKIP_TO = 3; // countdown jumps to this when everyone is ready
export const RANDOM_RACE_BONUS = 15; // gold for picking a random race (the old -random)
