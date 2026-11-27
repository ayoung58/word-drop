import type { Charges } from './types';

export const BOARD_W = 8;
export const BOARD_H = 10;

/**
 * Shortest run of letters that can count as a word. 3, so that the many two-letter words
 * in the word list do not make scoring too easy (docs/GDD.md, section 6).
 * Any run of two or more letters that is not a word of this length is penalised (see scoring.ts),
 * so changing this number changes both what scores and what costs.
 */
export const MIN_WORD_LENGTH = 3;

/** Points a filler costs. 0 for now (a design decision from the first ten playtest games); the rule stays so it can be tuned in M3. */
export const FILLER_COST = 0;
export const SHOVEL_COST = 5;

/** How many piece landings a peek lasts. */
export const PEEK_DROPS = 3;
/** How many gravity ticks a freeze skips. Time is counted in ticks, not milliseconds, so the core stays deterministic. */
export const FREEZE_TICKS = 8;

export const START_CHARGES: Charges = { wildcard: 2, peek: 2, freeze: 2 };

export const PREMIUM_X2_COUNT = 5;
export const PREMIUM_X3_COUNT = 3;

/**
 * Milliseconds between gravity ticks. The view uses this to schedule 'tick' actions.
 * Fixed on purpose: the game no longer speeds up as it fills (playtest feedback).
 */
export const FALL_INTERVAL_MS = 700;

/** How many upcoming letters each pool keeps ready (used by the peek preview). */
export const QUEUE_LENGTH = 4;

// Letters ---------------------------------------------------------------------

export interface Tile {
  /** Scrabble points: what the letter is worth in a word, and what it costs in a bad run. */
  points: number;
  /** Scrabble copies in the 100-tile set. This decides how often the letter falls. */
  copies: number;
}

/**
 * The Scrabble tile set. Points and copies are the single source for both scoring and letter frequency.
 * '?' is the blank: worth 0, and never drawn at random, because the Wildcard powerup is the blank.
 */
export const TILE_SET: Readonly<Record<string, Tile>> = {
  '?': { points: 0, copies: 2 },
  E: { points: 1, copies: 12 },
  A: { points: 1, copies: 9 },
  I: { points: 1, copies: 9 },
  O: { points: 1, copies: 8 },
  N: { points: 1, copies: 6 },
  R: { points: 1, copies: 6 },
  T: { points: 1, copies: 6 },
  L: { points: 1, copies: 4 },
  S: { points: 1, copies: 4 },
  U: { points: 1, copies: 4 },
  D: { points: 2, copies: 4 },
  G: { points: 2, copies: 3 },
  B: { points: 3, copies: 2 },
  C: { points: 3, copies: 2 },
  M: { points: 3, copies: 2 },
  P: { points: 3, copies: 2 },
  F: { points: 4, copies: 2 },
  H: { points: 4, copies: 2 },
  V: { points: 4, copies: 2 },
  W: { points: 4, copies: 2 },
  Y: { points: 4, copies: 2 },
  K: { points: 5, copies: 1 },
  J: { points: 8, copies: 1 },
  X: { points: 8, copies: 1 },
  Q: { points: 10, copies: 1 },
  Z: { points: 10, copies: 1 },
};

const TRUE_VOWELS = 'AEIOU';
/** Counts as a vowel and as a consonant: its copies are shared between the two pools. */
const BOTH = 'Y';

/** Points per letter, for lookups by letter. Derived from TILE_SET so the two can never disagree. */
export const LETTER_VALUES: Readonly<Record<string, number>> = Object.fromEntries(Object.entries(TILE_SET).map(([letter, t]) => [letter, t.points]));

/** Points of one letter. 0 for the wildcard and for anything that is not a letter. */
export function letterValue(letter: string): number {
  return LETTER_VALUES[letter] ?? 0;
}

/** One entry per copy, so drawing a random character from the bag is drawing with the Scrabble frequencies. */
function makeBag(pool: 'vowel' | 'consonant'): string {
  let bag = '';
  for (const [letter, tile] of Object.entries(TILE_SET)) {
    if (letter === '?') continue;
    const copies = BOTH.includes(letter) ? tile.copies / 2 : TRUE_VOWELS.includes(letter) === (pool === 'vowel') ? tile.copies : 0;
    bag += letter.repeat(copies);
  }
  return bag;
}

/** Letters are drawn from these bags. 43 vowels (E is 12 in 43) and 55 consonants; Y is in both. */
export const VOWEL_BAG = makeBag('vowel');
export const CONSONANT_BAG = makeBag('consonant');
