import { LANE_H, LANE_MARGIN_X, LANE_W, laneOriginY } from '../../shared/constants';

export interface Pt {
  x: number;
  y: number;
}

/** Lane-local cell coordinates → world coordinates. */
export function toWorld(lane: number, x: number, y: number): Pt {
  return { x: LANE_MARGIN_X + x, y: laneOriginY(lane) + y };
}

/** World → lane-local coordinates, if the point lies inside a lane. */
export function toLane(wx: number, wy: number, lanes: number): { lane: number; x: number; y: number } | null {
  const x = wx - LANE_MARGIN_X;
  if (x < 0 || x >= LANE_W) return null;
  for (let lane = 0; lane < lanes; lane++) {
    const y = wy - laneOriginY(lane);
    if (y >= 0 && y < LANE_H) return { lane, x, y };
  }
  return null;
}

/** Nearest lane to a world y (even when the point is on a ridge). */
export function nearestLane(wy: number, lanes: number): number {
  let best = 0;
  let bd = Infinity;
  for (let lane = 0; lane < lanes; lane++) {
    const d = Math.abs(wy - (laneOriginY(lane) + LANE_H / 2));
    if (d < bd) {
      bd = d;
      best = lane;
    }
  }
  return best;
}
