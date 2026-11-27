// What the screen shows, decided in plain functions with no Phaser, so Vitest can check it.
// The Phaser views (Buttons, BoardView) only draw what these return.
import { letterValue } from '../../core/config';
import type { PoolPreview } from '../../core/pieces';
import type { BadRun, Charges, WordHit } from '../../core/types';

export interface PoolLetter {
  letter: string;
  points: number;
}

/** Letters on a Vowel or Consonant button: the next one, and the one after it while peek is on. Each carries its points. */
export function poolLetters(preview: PoolPreview, peeking: boolean): PoolLetter[] {
  return (peeking ? [preview.now, preview.then] : [preview.now]).filter((l) => l !== '').map((letter) => ({ letter, points: letterValue(letter) }));
}

/** Captions of the three counted powerups. The remaining amount is in parentheses. */
export function powerupCaptions(charges: Charges): Record<keyof Charges, string> {
  return { wildcard: `Wildcard (${charges.wildcard})`, peek: `Peek (${charges.peek})`, freeze: `Freeze (${charges.freeze})` };
}

export function fillerCaption(cost: number): string {
  return cost > 0 ? `\u2212${cost}` : 'free';
}

export type WordMark = 'scored' | 'open';

/** Which letters belong to a scored word or an open word. A letter shared by both counts as scored. Keys are "row,col". */
export function markWords(words: readonly WordHit[]): Map<string, WordMark> {
  const marks = new Map<string, WordMark>();
  for (const w of words) {
    for (const [r, c] of w.cells) {
      const key = `${r},${c}`;
      if (w.closed) marks.set(key, 'scored');
      else if (!marks.has(key)) marks.set(key, 'open');
    }
  }
  return marks;
}

/** Letters that sit in a run that is not a word (they cost points). Keys are "row,col". */
export function badCells(badRuns: readonly BadRun[]): Set<string> {
  return new Set(badRuns.flatMap((run) => run.cells.map(([r, c]) => `${r},${c}`)));
}

/** Keys of the palette colors a placed letter can be filled with. */
export type TileFill = 'tile' | 'open' | 'ok' | 'x2' | 'x3';

/**
 * Fill behind a placed letter. A premium square wins over the word state, so the player can always see
 * which letters sit on an x2 or x3 square, even when the letter is wrong or its word is still open.
 * (The word state is still shown by the border, and a bad run never gets the multiplier: that is in core.)
 */
export function tileFill(word: 'none' | WordMark, premium: number): TileFill {
  if (premium === 3) return 'x3';
  if (premium === 2) return 'x2';
  return word === 'scored' ? 'ok' : word === 'open' ? 'open' : 'tile';
}

/** The number line of the shovel column, e.g. "(-10)". Null until the shovel has been used. */
export function shovelPenaltyCaption(spent: number): string | null {
  return spent > 0 ? `(-${spent})` : null;
}