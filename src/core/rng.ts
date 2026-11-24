/** A tiny seeded random generator (mulberry32). Same seed, same sequence, on every device. */
export interface Rng {
  s: number;
}

export function createRng(seed: number): Rng {
  return { s: seed >>> 0 };
}

/** Returns a number in [0, 1). Advances the generator. */
export function nextFloat(rng: Rng): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Returns an integer in [0, max). */
export function nextInt(rng: Rng, max: number): number {
  return Math.floor(nextFloat(rng) * max);
}

export function pickChar(rng: Rng, bag: string): string {
  return bag.charAt(nextInt(rng, bag.length));
}

/** Turns text into a seed number (FNV-1a). */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seed for the daily board. Pass a date like '2026-11-24'; the caller decides the time zone. */
export function dailySeed(date: string): number {
  return hashSeed('word-drop:' + date);
}
