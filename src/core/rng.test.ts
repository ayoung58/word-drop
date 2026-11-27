import { describe, expect, it } from 'vitest';
import { CONSONANT_BAG, VOWEL_BAG } from './config';
import { createRng, dailySeed, hashSeed, nextFloat, nextInt, pickChar } from './rng';

const take = (seed: number, n: number): number[] => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => nextFloat(rng));
};

describe('rng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(123, 20)).toEqual(take(123, 20));
  });

  it('gives different sequences for different seeds', () => {
    expect(take(1, 5)).not.toEqual(take(2, 5));
  });

  it('keeps floats in [0, 1) and ints below max', () => {
    const rng = createRng(9);
    for (let i = 0; i < 500; i++) {
      const f = nextFloat(rng);
      expect(f >= 0 && f < 1).toBe(true);
      const n = nextInt(rng, 7);
      expect(Number.isInteger(n) && n >= 0 && n < 7).toBe(true);
    }
  });

  it('hashes text to a stable seed', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'));
  });

  it('gives each date its own daily seed', () => {
    expect(dailySeed('2026-11-24')).toBe(dailySeed('2026-11-24'));
    expect(dailySeed('2026-11-24')).not.toBe(dailySeed('2026-11-25'));
  });
});

describe('pickChar', () => {
  /** Share of draws draws that came out as each letter. */
  function shares(bag: string, draws: number): Map<string, number> {
    const rng = createRng(2026);
    const seen = new Map<string, number>();
    for (let i = 0; i < draws; i++) {
      const letter = pickChar(rng, bag);
      seen.set(letter, (seen.get(letter) ?? 0) + 1);
    }
    return new Map([...seen].map(([l, n]) => [l, n / draws]));
  }
  const expectedShare = (bag: string, letter: string): number => [...bag].filter((l) => l === letter).length / bag.length;

  it('follows the vowel bag: an E about 12 times in 43, a Y about once in 43', () => {
    const seen = shares(VOWEL_BAG, 40_000);
    // The standard deviation of a share this size is under 0.3 percentage points, so 2 points is a very safe margin.
    for (const letter of new Set(VOWEL_BAG)) expect(Math.abs((seen.get(letter) ?? 0) - expectedShare(VOWEL_BAG, letter)), letter).toBeLessThan(0.02);
    expect(Math.abs((seen.get('E') ?? 0) - 12 / 43)).toBeLessThan(0.02);
  });

  it('follows the consonant bag: common letters often, Q and Z rarely', () => {
    const seen = shares(CONSONANT_BAG, 40_000);
    for (const letter of new Set(CONSONANT_BAG)) expect(Math.abs((seen.get(letter) ?? 0) - expectedShare(CONSONANT_BAG, letter)), letter).toBeLessThan(0.02);
    expect(seen.get('T') ?? 0).toBeGreaterThan((seen.get('Q') ?? 0) * 3);
  });

  it('only returns letters that are in the bag', () => {
    const rng = createRng(5);
    for (let i = 0; i < 500; i++) expect(VOWEL_BAG).toContain(pickChar(rng, VOWEL_BAG));
  });
});
