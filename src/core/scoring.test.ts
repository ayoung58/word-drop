import { describe, expect, it } from 'vitest';
import { createGrid, setCell } from './board';
import { evaluate } from './scoring';
import { BOARD_H, BOARD_W } from './config';
import { createDictionary } from './words';
import type { Cell, Grid } from './types';

const dict = createDictionary(['CAT', 'TO', 'PLAN', 'STAR', 'MAYBE', 'HOUSE']);
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
    setCell(b.grid, 7, 0, F);
    setCell(b.grid, 8, 0, { kind: 'letter', letter: 'T' });
    setCell(b.grid, 9, 0, { kind: 'letter', letter: 'O' });
    const e = evaluate(b, dict);
    expect(e.words).toHaveLength(1);
    expect(e.words[0]?.direction).toBe('down');
    expect(e.words[0]?.text).toBe('TO');
    expect(e.wordPoints).toBe(2);
  });

  it('never counts a single letter', () => {
    const b = board();
    setCell(b.grid, 9, 0, { kind: 'letter', letter: 'A' });
    expect(evaluate(b, dict).words).toHaveLength(0);
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
