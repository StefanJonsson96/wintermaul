import { SELL_REFUND } from '../constants';
import type { DamageType, TowerDef } from '../types';

/**
 * Per-player bonuses, from campaign talents. Every field is optional and a missing field changes
 * nothing, so an empty object is a player without talents.
 */
export interface PlayerMods {
  /** Damage multipliers: every tower, by damage type and by race. */
  dmg?: number;
  dmgType?: Partial<Record<DamageType, number>>;
  dmgRace?: Record<string, number>;
  /** Multipliers on poison and burn damage (burning ground included). */
  poison?: number;
  burn?: number;
  /** Attack speed and attack range multipliers. */
  speed?: number;
  range?: number;
  /** Chance for any attack to deal double damage. */
  crit?: number;
  /** Multipliers on slow strength and on stun and root duration. */
  slow?: number;
  stun?: number;
  /** Poison jumps to creeps within this radius when its carrier dies. */
  spread?: number;
  /** Slowed creeps take this much extra damage from your towers. */
  frostbite?: number;
  /** Extra tower damage while the team is down to a quarter of its lives. */
  lastStand?: number;
  startGold?: number;
  startLumber?: number;
  /** Multipliers on kill gold and on the end-of-wave bonus. */
  bounty?: number;
  waveBonus?: number;
  /** Added to the sell refund. */
  refund?: number;
  /** Gold off every tier-1 tower. */
  wallDiscount?: number;
  /** Interest paid on banked gold after each wave, up to interestCap. */
  interest?: number;
  interestCap?: number;
  lives?: number;
  /** Lives restored once when the team would lose (never when the Winter Tyrant escapes). */
  secondWind?: number;
  /** Lives saved when a boss leaks out of your lane. */
  bossLeak?: number;
  /** Creeps in your lane walk this much slower (0.06 = 6%). */
  creepSlow?: number;
  /** Extra seconds before the first wave. */
  prep?: number;
}

/** Gold price of a tower for a player with these bonuses. */
export function towerCost(def: TowerDef, m?: PlayerMods): number {
  return def.tier === 1 && m?.wallDiscount ? Math.max(1, def.cost - m.wallDiscount) : def.cost;
}

/** Attack range after bonuses (pulse and aura radii are not affected). */
export function attackRange(range: number, m?: PlayerMods): number {
  return range * (m?.range ?? 1);
}

export function sellRefund(m?: PlayerMods): number {
  return Math.min(1, SELL_REFUND + (m?.refund ?? 0));
}

/** Damage multiplier a player's towers of this race get against everything. */
export function baseDamageMul(race: string, m?: PlayerMods): number {
  return (m?.dmg ?? 1) * (m?.dmgRace?.[race] ?? 1);
}

export function typeDamageMul(type: DamageType, m?: PlayerMods): number {
  return m?.dmgType?.[type] ?? 1;
}

export function hasMods(m?: PlayerMods): boolean {
  return !!m && Object.keys(m).length > 0;
}
