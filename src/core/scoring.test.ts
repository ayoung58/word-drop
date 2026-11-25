import { describe, expect, it } from 'vitest';
import { createGrid, setCell } from './board';
import { evaluate } from './scoring';
import { BOARD_H, BOARD_W, MIN_WORD_LENGTH } from './config';
import { createDictionary } from './words';
import type { Cell, Grid } from './types';

// 'TO' is allowed into the dictionary here on purpose, so the tests below prove that scoring
// itself enforces MIN_WORD_LENGTH and does not rely on the dictionary filtering short words out.
const dict = createDictionary(['CAT', 'TO', 'PLAN', 'STAR', 'MAYBE', 'HOUSE'], { minLength: 2 });
const F: Cell = { kind: 'filler' };

function board(): { grid: Grid; premium: number[][]; spent: number } {
  return { grid: createGrid(), premium: Array.from({ length: BOARD_H }, () => Array<number>(BOARD_W).fill(0)), spent: 0 };
}

function word(b: { grid: Grid }, row: number, col: number, text: string): void {
  [...text].forEach((letter, i) => setCell(b.grid, row, col + i, { kind: 'letter', letter }));
}

describe('evaluate', () => {
  it('scores a word closed by the left wall and a filler', () => {
    const b = board();
    word(b, 9, 0, 'PLAN');
    setCell(b.grid, 9, 4, F);
    const e = evaluate(b, dict);
    expect(e.words).toHaveLength(1);
    expect(e.words[0]?.text).toBe('PLAN');
    expect(e.words[0]?.closed).toBe(true);
    expect(e.wordPoints).toBe(6); // P3 + L1 + A1 + N1
  });

  it('scores a word closed by a filler and the right wall', () => {
    const b = board();
    setCell(b.grid, 8, 3, F);
    word(b, 8, 4, 'STAR');
    expect(evaluate(b, dict).wordPoints).toBe(4);
  });

  it('lists a valid word that is not closed yet, but does not score it', () => {
    const b = board();
    word(b, 9, 0, 'CAT'); // empty cell to its right
    const e = evaluate(b, dict);
    expect(e.words).toHaveLength(1);
    expect(e.words[0]?.closed).toBe(false);
    expect(e.wordPoints).toBe(0);
  });

  it('does not count a longer run that only contains a word (MAYBEJ)', () => {
    const b = board();
    word(b, 9, 0, 'MAYBEJ');
    setCell(b.grid, 9, 6, F);
    expect(evaluate(b, dict).words).toHaveLength(0);
  });

  it('counts MAYBE when a filler follows it', () => {
    const b = board();
    word(b, 9, 0, 'MAYBE');
    setCell(b.grid, 9, 5, F);
    expect(evaluate(b, dict).wordPoints).toBe(3 + 1 + 4 + 3 + 1);
  });

  it('reads vertical words from top to bottom', () => {
    const b = board();
    setCell(b.grid, 6, 0, F);
    setCell(b.grid, 7, 0, { kind: 'letter', letter: 'C' });
    setCell(b.grid, 8, 0, { kind: 'letter', letter: 'A' });
    setCell(b.grid, 9, 0, { kind: 'letter', letter: 'T' });
    const e = evaluate(b, dict);
    expect(e.words).toHaveLength(1);
    expect(e.words[0]?.direction).toBe('down');
    expect(e.words[0]?.text).toBe('CAT');
    expect(e.wordPoints).toBe(5); // C3 + A1 + T1
  });

  it('never counts a single letter', () => {
    const b = board();
    setCell(b.grid, 9, 0, { kind: 'letter', letter: 'A' });
    expect(evaluate(b, dict).words).toHaveLength(0);
  });

  it('never counts a two-letter word, even a closed one that is in the dictionary', () => {
    expect(MIN_WORD_LENGTH).toBe(3); // the decided rule; see docs/GDD.md
    const b = board();
    word(b, 9, 0, 'TO');
    setCell(b.grid, 9, 2, F);
    const e = evaluate(b, dict);
    expect(e.words).toHaveLength(0);
    expect(e.wordPoints).toBe(0);
  });

  it('scores a letter in both directions when it belongs to an across word and a down word', () => {
    const b = board();
    word(b, 6, 0, 'CAT'); // across, closed by the left wall and the filler at (6,3)
    setCell(b.grid, 6, 3, F);
    setCell(b.grid, 7, 0, { kind: 'letter', letter: 'A' }); // down: C (shared), A, T
    setCell(b.grid, 8, 0, { kind: 'letter', letter: 'T' });
    setCell(b.grid, 5, 0, F); // closes the top of the down word
    setCell(b.grid, 9, 0, F); // closes the bottom
    const e = evaluate(b, dict);
    expect(e.words.map((w) => `${w.direction}:${w.text}`).sort()).toEqual(['across:CAT', 'down:CAT']);
    expect(e.wordPoints).toBe(5 + 5);
  });

  it('scores two words in one row when a filler separates them', () => {
    const b = board();
    word(b, 9, 0, 'CAT');
    setCell(b.grid, 9, 3, F);
    word(b, 9, 4, 'STAR'); // runs to the right wall
    const e = evaluate(b, dict);
    expect(e.words).toHaveLength(2);
    expect(e.words.every((w) => w.closed)).toBe(true);
    expect(e.wordPoints).toBe(5 + 4);
  });

  it('stops scoring a word as soon as a letter in it is replaced', () => {
    const b = board();
    word(b, 9, 0, 'PLAN');
    setCell(b.grid, 9, 4, F);
    expect(evaluate(b, dict).wordPoints).toBe(6);
    setCell(b.grid, 9, 2, { kind: 'letter', letter: 'X' }); // PLXN is not a word
    expect(evaluate(b, dict).wordPoints).toBe(0);
  });

  it('lists an open valid word with 0 points', () => {
    const b = board();
    word(b, 9, 0, 'STAR');
    const e = evaluate(b, dict);
    expect(e.words).toHaveLength(1);
    expect(e.words[0]).toMatchObject({ text: 'STAR', closed: false, points: 0 });
  });

  it('multiplies by every premium square the word covers', () => {
    const b = board();
    word(b, 9, 0, 'PLAN');
    setCell(b.grid, 9, 4, F);
    b.premium[9]![0] = 2;
    b.premium[9]![2] = 3;
    expect(evaluate(b, dict).wordPoints).toBe(6 * 2 * 3);
  });

  it('lets a wildcard stand for any letter and worth 0', () => {
    const b = board();
    word(b, 9, 0, 'C?T');
    setCell(b.grid, 9, 3, F);
    const e = evaluate(b, dict);
    expect(e.words[0]?.text).toBe('C?T');
    expect(e.wordPoints).toBe(3 + 0 + 1);
  });

  it('subtracts fillers and shovel costs from the score', () => {
    const b = board();
    word(b, 9, 0, 'PLAN');
    setCell(b.grid, 9, 4, F);
    setCell(b.grid, 0, 0, F);
    setCell(b.grid, 0, 1, F);
    b.spent = 5;
    const e = evaluate(b, dict);
    expect(e.fillerCount).toBe(3);
    expect(e.score).toBe(6 - 3 - 5);
  });
});
