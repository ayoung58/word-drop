import { describe, expect, it } from 'vitest';
import { createRng, dailySeed, hashSeed, nextFloat, nextInt } from './rng';

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
