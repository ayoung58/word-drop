import { describe, expect, it } from 'vitest';
import {
  BOARD_H,
  BOARD_W,
  CONSONANT_BAG,
  FALL_INTERVAL_MS,
  FILLER_COST,
  LETTER_VALUES,
  MIN_WORD_LENGTH,
  PREMIUM_X2_COUNT,
  PREMIUM_X3_COUNT,
  QUEUE_LENGTH,
  SHOVEL_COST,
  START_CHARGES,
  TILE_SET,
  VOWEL_BAG,
  letterValue,
} from './config';

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const VOWELS = [...'AEIOU'];
/** Y is both: it sits in the vowel bag and in the consonant bag. */
const CONSONANTS = ALPHABET.filter((l) => !VOWELS.includes(l));
const count = (bag: string, letter: string): number => [...bag].filter((l) => l === letter).length;

describe('the fixed rules (change these only on purpose, and update docs/GDD.md)', () => {
  it('has an 8 by 10 board', () => {
    expect([BOARD_W, BOARD_H]).toEqual([8, 10]);
  });

  it('needs three letters for a word', () => {
    expect(MIN_WORD_LENGTH).toBe(3);
  });

  it('costs nothing for a filler (for now) and 5 for the shovel', () => {
    expect(FILLER_COST).toBe(0);
    expect(SHOVEL_COST).toBe(5);
  });
});

describe('the tile set (Scrabble points and copies)', () => {
  // Written out in full on purpose: this is the table from the design notes, so a typo in config.ts shows up here.
  const expected: Record<string, [points: number, copies: number]> = {
    '?': [0, 2],
    E: [1, 12], A: [1, 9], I: [1, 9], O: [1, 8], N: [1, 6], R: [1, 6], T: [1, 6], L: [1, 4], S: [1, 4], U: [1, 4],
    D: [2, 4], G: [2, 3],
    B: [3, 2], C: [3, 2], M: [3, 2], P: [3, 2],
    F: [4, 2], H: [4, 2], V: [4, 2], W: [4, 2], Y: [4, 2],
    K: [5, 1],
    J: [8, 1], X: [8, 1],
    Q: [10, 1], Z: [10, 1],
  };

  it('matches the Scrabble table letter for letter', () => {
    const actual = Object.fromEntries(Object.entries(TILE_SET).map(([l, t]) => [l, [t.points, t.copies]]));
    expect(actual).toEqual(expected);
  });

  it('adds up to the 100 tiles of a Scrabble set', () => {
    expect(Object.values(TILE_SET).reduce((n, t) => n + t.copies, 0)).toBe(100);
  });

  it('gives LETTER_VALUES a positive value for every letter and 0 for the wildcard', () => {
    for (const l of ALPHABET) expect(LETTER_VALUES[l]).toBeGreaterThan(0);
    expect(LETTER_VALUES['?']).toBe(0);
  });

  it('letterValue reads the table, and is 0 for anything unknown', () => {
    expect(letterValue('Q')).toBe(10);
    expect(letterValue('E')).toBe(1);
    expect(letterValue('Y')).toBe(4);
    expect(letterValue('?')).toBe(0);
    expect(letterValue('1')).toBe(0);
  });
});

describe('letter bags', () => {
  it('draws vowels only from A E I O U and Y, and every one of them can appear', () => {
    expect([...VOWEL_BAG].every((l) => VOWELS.includes(l) || l === 'Y')).toBe(true);
    for (const v of [...VOWELS, 'Y']) expect(VOWEL_BAG).toContain(v);
  });

  it('draws consonants only from consonants (Y counts), and every consonant can appear', () => {
    expect([...CONSONANT_BAG].every((l) => CONSONANTS.includes(l))).toBe(true);
    for (const c of CONSONANTS) expect(CONSONANT_BAG).toContain(c);
  });

  it('never draws the blank: the wildcard powerup is the blank', () => {
    expect(VOWEL_BAG).not.toContain('?');
    expect(CONSONANT_BAG).not.toContain('?');
  });

  it('gives vowels the Scrabble copies, with Y adding 1 (half of its 2 copies)', () => {
    const copies = { E: 12, A: 9, I: 9, O: 8, U: 4, Y: 1 };
    for (const [letter, n] of Object.entries(copies)) expect(count(VOWEL_BAG, letter), letter).toBe(n);
    expect(VOWEL_BAG).toHaveLength(12 + 9 + 9 + 8 + 4 + 1);
  });

  it('gives consonants the Scrabble copies, with Y adding 1 (the other half)', () => {
    const copies = { N: 6, R: 6, T: 6, L: 4, S: 4, D: 4, G: 3, B: 2, C: 2, M: 2, P: 2, F: 2, H: 2, V: 2, W: 2, Y: 1, K: 1, J: 1, X: 1, Q: 1, Z: 1 };
    for (const [letter, n] of Object.entries(copies)) expect(count(CONSONANT_BAG, letter), letter).toBe(n);
    expect(CONSONANT_BAG).toHaveLength(55);
  });

  it('makes an E 12 out of 43 draws from the vowel pool', () => {
    expect(count(VOWEL_BAG, 'E') / VOWEL_BAG.length).toBeCloseTo(12 / (12 + 9 + 9 + 8 + 4 + 1), 10);
  });

  it('keeps at least two letters ready in each queue, so peek can show the letter after next', () => {
    expect(QUEUE_LENGTH).toBeGreaterThanOrEqual(2);
  });
});

describe('powerups and premium squares', () => {
  it('starts with a whole, non-negative number of charges', () => {
    for (const n of Object.values(START_CHARGES)) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it('fits the premium squares on the board', () => {
    expect(PREMIUM_X2_COUNT + PREMIUM_X3_COUNT).toBeLessThanOrEqual(BOARD_W * BOARD_H);
  });
});

describe('gravity', () => {
  it('has one fixed fall speed: pieces do not speed up as the game goes on', () => {
    expect(FALL_INTERVAL_MS).toBe(700);
  });
});
