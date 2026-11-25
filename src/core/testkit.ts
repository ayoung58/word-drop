import { BOARD_H, BOARD_W } from './config';
import { createRng, nextInt } from './rng';
import type { Action, SwitchTarget } from './types';

const SWITCH_TARGETS: readonly SwitchTarget[] = ['vowel', 'consonant', 'filler'];

/**
 * A reproducible list of random player actions, for replay and invariant tests (not used by the game).
 * Uses core's own seeded generator, so the same seed gives the same list on every machine.
 * Gravity ticks and drops are weighted up so that games actually fill the board.
 */
export function randomActions(seed: number, count: number): Action[] {
  const rng = createRng(seed);
  const actions: Action[] = [];
  for (let i = 0; i < count; i++) {
    const n = nextInt(rng, 24);
    if (n < 8) actions.push({ type: 'tick' });
    else if (n < 12) actions.push({ type: 'drop' });
    else if (n < 15) actions.push({ type: 'moveLeft' });
    else if (n < 18) actions.push({ type: 'moveRight' });
    else if (n < 21) actions.push({ type: 'switch', to: SWITCH_TARGETS[nextInt(rng, SWITCH_TARGETS.length)] ?? 'vowel' });
    else if (n === 21) actions.push({ type: ['wildcard', 'peek', 'freeze'][nextInt(rng, 3)] as 'wildcard' | 'peek' | 'freeze' });
    else actions.push({ type: 'shovel', row: nextInt(rng, BOARD_H), col: nextInt(rng, BOARD_W) });
  }
  return actions;
}
