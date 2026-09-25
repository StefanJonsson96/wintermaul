import type { ArmorType, DamageType } from './types';

/** Damage multiplier by attack type (rows) against armor class (columns). */
export const DAMAGE_TABLE: Record<DamageType, Record<ArmorType, number>> = {
  pierce: { light: 1.5, medium: 1.0, heavy: 0.75, fortified: 0.5, spirit: 0.5 },
  impact: { light: 0.75, medium: 1.0, heavy: 1.25, fortified: 1.5, spirit: 0.5 },
  magic: { light: 1.0, medium: 0.85, heavy: 1.5, fortified: 0.6, spirit: 1.5 },
  elemental: { light: 1.25, medium: 1.25, heavy: 0.9, fortified: 0.75, spirit: 1.0 },
  pure: { light: 1.0, medium: 1.0, heavy: 1.0, fortified: 1.0, spirit: 1.0 },
};

export const DAMAGE_LABEL: Record<DamageType, string> = {
  pierce: 'Pierce',
  impact: 'Impact',
  magic: 'Magic',
  elemental: 'Elemental',
  pure: 'Pure',
};

export const ARMOR_LABEL: Record<ArmorType, string> = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
  fortified: 'Fortified',
  spirit: 'Spirit',
};

/** Warcraft-style numeric armor: each point reduces damage by a diminishing amount. */
export function armorMultiplier(armor: number): number {
  if (armor >= 0) return 1 / (1 + 0.06 * armor);
  return 2 - Math.pow(0.94, -armor);
}
