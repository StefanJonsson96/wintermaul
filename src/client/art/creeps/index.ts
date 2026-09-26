import type { CreepDef } from '../../../shared/types';
import { ellipse, makeCanvas, SP, type Ctx } from '../util';
import { type Look, bossAura } from './parts';
import { beetle, boar, crab, hydra, rat, spider, wolf } from './beasts';
import { bat, bird, dragon } from './flyers';
import { ghoul, giant, imp, knight, kobold, troll, tyrant } from './humanoids';
import { banshee, elemental, golem, lich, skull, wraith } from './spirits';

// Creatures are drawn facing right in 8 animation frames and cached per creep type.
export const FRAMES = 8;

export interface CreepSprite {
  frames: HTMLCanvasElement[];
  size: number; // frame size in px
  gx: number; // ground point in the frame
  gy: number;
  lift: number; // flyers hover this many cells above their shadow
}

/** Shapes that float a little above the ground even though they walk the maze. */
const HOVERING = new Set(['wraith', 'banshee', 'skull', 'elemental', 'lich']);

/** Top of each creature, in units of its drawing radius (used for health bars). */
const TOP: Record<string, number> = {
  ghoul: 2.2,
  wendigo: 2.9,
  biped: 2.45,
  imp: 2.25,
  rat: 1.15,
  wolf: 1.75,
  boar: 2.0,
  troll: 2.55,
  giant: 3.15,
  knight: 3.05,
  boss: 3.55,
  spider: 1.5,
  crab: 1.65,
  beetle: 1.55,
  hydra: 2.1,
  bird: 1.9,
  bat: 1.95,
  dragon: 2.0,
  skull: 1.9,
  wraith: 2.2,
  banshee: 2.2,
  lich: 2.45,
  elemental: 1.95,
  golem: 2.5,
};

/** How far above its shadow a creep is drawn, in cells. */
export function creepLift(def: CreepDef): number {
  return def.air ? 0.55 : HOVERING.has(def.shape) ? 0.12 : 0;
}

/** Height of a creep's head above its shadow, in cells. */
export function creepTop(def: CreepDef): number {
  return (TOP[def.shape] ?? 2) * def.size * 1.18 + creepLift(def);
}

const cache = new Map<string, CreepSprite>();

export function creepSprite(def: CreepDef): CreepSprite {
  const key = `${def.shape}:${def.colors.join(',')}:${def.size}:${def.boss ? 1 : 0}:${def.armorType}`;
  let s = cache.get(key);
  if (s) return s;
  const R = def.size * SP * 1.18;
  const size = Math.ceil(Math.max(1.6 * SP, R * 4.6));
  const gx = size / 2;
  const gy = size * 0.85;
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const [c, ctx] = makeCanvas(size, size);
    ctx.translate(gx, gy);
    drawCreature(ctx, def, R, (f / FRAMES) * Math.PI * 2);
    frames.push(c);
  }
  s = { frames, size, gx, gy, lift: creepLift(def) };
  cache.set(key, s);
  return s;
}

function drawCreature(ctx: Ctx, def: CreepDef, R: number, ph: number): void {
  const [body, dark, eye] = def.colors;
  const k: Look = { body, dark, eye, boss: !!def.boss, armored: def.armorType === 'fortified' };
  if (k.boss) bossAura(ctx, R, eye);
  switch (def.shape) {
    case 'ghoul':
      return ghoul(ctx, R, ph, k, false);
    case 'wendigo':
      return ghoul(ctx, R, ph, k, true);
    case 'biped':
      return kobold(ctx, R, ph, k);
    case 'imp':
      return imp(ctx, R, ph, k);
    case 'rat':
      return rat(ctx, R, ph, k);
    case 'wolf':
      return wolf(ctx, R, ph, k);
    case 'boar':
      return boar(ctx, R, ph, k);
    case 'troll':
      return troll(ctx, R, ph, k);
    case 'giant':
      return giant(ctx, R, ph, k);
    case 'knight':
      return knight(ctx, R, ph, k);
    case 'boss':
      return tyrant(ctx, R, ph, k);
    case 'spider':
      return spider(ctx, R, ph, k);
    case 'crab':
      return crab(ctx, R, ph, k);
    case 'beetle':
      return beetle(ctx, R, ph, k);
    case 'hydra':
      return hydra(ctx, R, ph, k);
    case 'bird':
      return bird(ctx, R, ph, k);
    case 'bat':
      return bat(ctx, R, ph, k);
    case 'dragon':
      return dragon(ctx, R, ph, k);
    case 'skull':
      return skull(ctx, R, ph, k);
    case 'wraith':
      return wraith(ctx, R, ph, k);
    case 'banshee':
      return banshee(ctx, R, ph, k);
    case 'lich':
      return lich(ctx, R, ph, k);
    case 'elemental':
      return elemental(ctx, R, ph, k);
    case 'golem':
      return golem(ctx, R, ph, k);
  }
}

/** A still of a creep for menus, standing on a soft shadow. */
export function creepPortrait(def: CreepDef, px = 64): HTMLCanvasElement {
  const spr = creepSprite(def);
  const [c, ctx] = makeCanvas(px, px);
  const k = (px * 1.05) / spr.size;
  ctx.translate(px / 2 - spr.gx * k, px * 0.88 - spr.gy * k);
  ctx.scale(k, k);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ellipse(ctx, spr.gx, spr.gy, def.size * SP * 0.9, def.size * SP * 0.3);
  ctx.fill();
  ctx.drawImage(spr.frames[1], 0, -spr.lift * SP);
  return c;
}
