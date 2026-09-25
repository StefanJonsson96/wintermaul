import type { LocalOptions } from '../local';

/** A solo game against the classic rules, with the rules dialog and the full 40 waves. */
export function skirmishOptions(): Omit<LocalOptions, 'name'> {
  return {
    mode: 'solo',
    settings: { difficulty: 'normal', raceMode: 'pick', endless: false },
  };
}
