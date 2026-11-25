import { describe, expect, it } from 'vitest';
import {
  BOARD_H,
  BOARD_W,
  CONSONANT_BAG,
  FILLER_COST,
  LETTER_VALUES,
  MIN_WORD_LENGTH,
  PREMIUM_X2_COUNT,
  PREMIUM_X3_COUNT,
  QUEUE_LENGTH,
  SHOVEL_COST,
  START_CHARGES,
  VOWEL_BAG,
  fallIntervalMs,
} from './config';

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const VOWELS = [...'AEIOU'];
const CONSONANTS = ALPHABET.filter((l) => !VOWELS.includes(l));

describe('the fixed rules (change these only on purpose, and update docs/GDD.md)', () => {
  it('has an 8 by 10 board', () => {
    expect([BOARD_W, BOARD_H]).toEqual([8, 10]);
  });

  it('needs three letters for a word', () => {
    expect(MIN_WORD_LENGTH).toBe(3);
  });

  it('costs 1 point for a filler and 5 for the shovel', () => {
    expect(FILLER_COST).toBe(1);
    expect(SHOVEL_COST).toBe(5);
  });
});

describe('letter values and bags', () => {
  it('has a positive value for every letter and 0 for the wildcard', () => {
    for (const l of ALPHABET) expect(LETTER_VALUES[l]).toBeGreaterThan(0);
    expect(LETTER_VALUES['?']).toBe(0);
  });

  it('draws vowels only from vowels, and every vowel can appear', () => {
    expect([...VOWEL_BAG].every((l) => VOWELS.includes(l))).toBe(true);
    for (const v of VOWELS) expect(VOWEL_BAG).toContain(v);
  });

  it('draws consonants only from consonants (Y counts), and every consonant can appear', () => {
    expect([...CONSONANT_BAG].every((l) => CONSONANTS.includes(l))).toBe(true);
    for (const c of CONSONANTS) expect(CONSONANT_BAG).toContain(c);
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

describe('fallIntervalMs', () => {
  it('starts at 700 ms and gets faster with the first pieces', () => {
    expect(fallIntervalMs(0)).toBe(700);
    expect(fallIntervalMs(1)).toBeLessThan(fallIntervalMs(0));
  });

  it('never gets slower as more pieces are placed', () => {
    for (let n = 0; n < 300; n++) expect(fallIntervalMs(n + 1)).toBeLessThanOrEqual(fallIntervalMs(n));
  });

  it('never goes below 250 ms, so the game stays playable', () => {
    expect(fallIntervalMs(10_000)).toBe(250);
  });
});
