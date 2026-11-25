import type { Charges } from './types';

export const BOARD_W = 8;
export const BOARD_H = 10;

/**
 * Shortest run of letters that can count as a word. 3, so that the many two-letter words
 * in the word list do not make scoring too easy or weaken the filler penalty (docs/GDD.md, section 6).
 */
export const MIN_WORD_LENGTH = 3;

export const FILLER_COST = 1;
export const SHOVEL_COST = 5;

/** How many piece landings a peek lasts. */
export const PEEK_DROPS = 3;
/** How many gravity ticks a freeze skips. Time is counted in ticks, not milliseconds, so the core stays deterministic. */
export const FREEZE_TICKS = 8;

export const START_CHARGES: Charges = { wildcard: 2, peek: 2, freeze: 2 };

export const PREMIUM_X2_COUNT = 5;
export const PREMIUM_X3_COUNT = 3;

/** Letters are drawn from these bags, so repeated letters are more likely. */
export const VOWEL_BAG = 'AAAAAEEEEEEIIIIOOOOUU';
export const CONSONANT_BAG = 'BBCCDDDFFGGHHJKLLLMMNNNNPPQRRRRSSSSTTTTTVWWXYYZ';

/** How many upcoming letters each pool keeps ready (used by the peek preview). */
export const QUEUE_LENGTH = 4;

export const LETTER_VALUES: Readonly<Record<string, number>> = {
  A: 1, E: 1, I: 1, O: 1, U: 1, L: 1, N: 1, R: 1, S: 1, T: 1,
  D: 2, G: 2,
  B: 3, C: 3, M: 3, P: 3,
  F: 4, H: 4, V: 4, W: 4, Y: 4,
  K: 5,
  J: 8, X: 8,
  Q: 10, Z: 10,
  '?': 0,
};

/** Milliseconds between gravity ticks. The view uses this to schedule 'tick' actions. */
export function fallIntervalMs(piecesPlaced: number): number {
  return Math.max(250, 700 - piecesPlaced * 8);
}
