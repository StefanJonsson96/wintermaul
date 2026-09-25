import { drawArcane } from './arcane';
import type { Build, Ctx, Spec } from './common';
import { drawFire, fireHead } from './fire';
import { drawFrost, frostHead } from './frost';
import { drawGold, goldHead } from './gold';
import { drawGrove } from './grove';
import { drawPrism, prismHead } from './prism';
import { drawShadow } from './shadow';
import { drawStone, stoneHead } from './stone';
import { drawStorm } from './storm';
import { drawSun } from './sun';
import { drawTech, techHead } from './tech';
import { drawVenom, venomHead } from './venom';

export interface Kit {
  /** Draws the foundation and the building; returns muzzle, head pivot and animated parts. */
  draw(ctx: Ctx, p: Spec): Build;
  /** Rotating weapon, drawn facing right around (64, 64) in a 128 px canvas. */
  head?(ctx: Ctx, p: Spec): void;
}

export const KITS: Record<string, Kit> = {
  frost: { draw: drawFrost, head: frostHead },
  fire: { draw: drawFire, head: fireHead },
  storm: { draw: drawStorm },
  stone: { draw: drawStone, head: stoneHead },
  arcane: { draw: drawArcane },
  venom: { draw: drawVenom, head: venomHead },
  tech: { draw: drawTech, head: techHead },
  shadow: { draw: drawShadow },
  sun: { draw: drawSun },
  grove: { draw: drawGrove },
  gold: { draw: drawGold, head: goldHead },
  prism: { draw: drawPrism, head: prismHead },
};
