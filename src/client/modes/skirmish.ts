import { applyRelics } from '../../shared/relics';
import type { LocalOptions } from '../local';

/** A solo game with the rules dialog and the full 40 waves, carrying the player's relics. */
export function skirmishOptions(relics: string[]): Omit<LocalOptions, 'name'> {
  return {
    mode: 'solo',
    settings: { difficulty: 'normal', raceMode: 'pick', endless: false },
    rules: relics.length ? { mods: { 0: applyRelics({}, relics) } } : undefined,
    save: { kind: { mode: 'skirmish', relics: [...relics] }, title: 'Skirmish' },
  };
}
