import { describe, expect, it } from 'vitest';
import { createGrid, setCell } from './board';
import { evaluate } from './scoring';
import { BOARD_H, BOARD_W, FILLER_COST, MIN_WORD_LENGTH } from './config';
import { createDictionary } from './words';
import type { Cell, Grid } from './types';

// 'TO' is allowed into the dictionary here on purpose, so the tests below prove that scoring
// itself enforces the minimum word length and does not rely on the dictionary filtering short words out.
const dict = createDictionary(['CAT', 'TO', 'PLAN', 'STAR', 'MAYBE', 'HOUSE'], { minLength: 2 });
const F: Cell = { kind: 'filler' };

function board(): { grid: Grid; premium: number[][]; spent: number } {
  return { grid: createGrid(), premium: Array.from({ length: BOARD_H }, () => Array<number>(BOARD_W).fill(0)), spent: 0 };
}

function word(b: { grid: Grid }, row: number, col: number, text: string): void {
  [...text].forEach((letter, i) => setCell(b.grid, row, col + i, { kind: 'letter', letter }));
}

/** Draws rows of text onto the board from the top-left corner. '.' is a filler, ' ' is an empty cell. */
function draw(b: { grid: Grid }, ...rows: string[]): void {
  rows.forEach((text, r) =>
    [...text].forEach((ch, c) => {
      if (ch === '.') setCell(b.grid, r, c, F);
      else if (ch !== ' ') setCell(b.grid, r, c, { kind: 'letter', letter: ch });
    }),
  );
}

describe('evaluate: words', () => {
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
    expect(e.badRuns).toEqual([]);
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

  it('lets a wildcard stand in a vertical word', () => {
    const b = board();
    setCell(b.grid, 6, 0, F);
    setCell(b.grid, 7, 0, { kind: 'letter', letter: 'C' });
    setCell(b.grid, 8, 0, { kind: 'letter', letter: '?' });
    setCell(b.grid, 9, 0, { kind: 'letter', letter: 'T' });
    const e = evaluate(b, dict);
    expect(e.words.map((w) => `${w.direction}:${w.text}`)).toEqual(['down:C?T']);
    expect(e.wordPoints).toBe(3 + 0 + 1);
  });
});

describe('evaluate: adjacent letters that are not a word are penalised', () => {
  it('never penalises a letter on its own', () => {
    const b = board();
    setCell(b.grid, 9, 0, { kind: 'letter', letter: 'A' });
    const e = evaluate(b, dict);
    expect(e.words).toHaveLength(0);
    expect(e.badRuns).toHaveLength(0);
    expect(e.penaltyPoints).toBe(0);
  });

  it('penalises a run that is not a word by the points of its letters (MAYBEJ)', () => {
    const b = board();
    word(b, 9, 0, 'MAYBEJ');
    setCell(b.grid, 9, 6, F);
    const e = evaluate(b, dict);
    expect(e.words).toHaveLength(0); // MAYBE hidden inside MAYBEJ does not count
    expect(e.badRuns).toHaveLength(1);
    expect(e.badRuns[0]).toMatchObject({ text: 'MAYBEJ', direction: 'across', penalty: 3 + 1 + 4 + 3 + 1 + 8 });
    expect(e.penaltyPoints).toBe(20);
  });

  it('penalises a two-letter run when the minimum word length is three, even if it is in the dictionary', () => {
    expect(MIN_WORD_LENGTH).toBe(3); // the decided rule; see docs/GDD.md
    const b = board();
    word(b, 9, 0, 'TO');
    setCell(b.grid, 9, 2, F);
    const e = evaluate(b, dict);
    expect(e.words).toHaveLength(0);
    expect(e.wordPoints).toBe(0);
    expect(e.badRuns.map((r) => r.text)).toEqual(['TO']);
    expect(e.penaltyPoints).toBe(2); // T1 + O1
  });

  it('penalises a run that is not a word even while it is still open (empty cell next to it)', () => {
    const b = board();
    word(b, 9, 0, 'XQ'); // nothing to the right
    expect(evaluate(b, dict).penaltyPoints).toBe(8 + 10);
  });

  it('does not penalise a valid word that is not closed yet', () => {
    const b = board();
    word(b, 9, 0, 'CAT');
    const e = evaluate(b, dict);
    expect(e.badRuns).toHaveLength(0);
    expect(e.penaltyPoints).toBe(0);
  });

  it('subtracts the plain letter points: premium squares only multiply words, never penalties', () => {
    const b = board();
    word(b, 9, 0, 'XQ');
    b.premium[9]![0] = 3;
    b.premium[9]![1] = 2;
    expect(evaluate(b, dict).penaltyPoints).toBe(8 + 10);
  });

  it('counts a wildcard in a bad run as 0 points', () => {
    const b = board();
    word(b, 9, 0, '?Q');
    expect(evaluate(b, createDictionary(['CAT'])).penaltyPoints).toBe(10);
  });

  it('penalises a vertical run that is not a word', () => {
    const b = board();
    setCell(b.grid, 8, 0, { kind: 'letter', letter: 'J' });
    setCell(b.grid, 9, 0, { kind: 'letter', letter: 'K' });
    const e = evaluate(b, dict);
    expect(e.badRuns).toHaveLength(1);
    expect(e.badRuns[0]).toMatchObject({ text: 'JK', direction: 'down', penalty: 8 + 5 });
  });

  it('penalises a letter once for each bad run it sits in', () => {
    const b = board();
    draw(b, 'XQ', 'J ');
    // across XQ (8 + 10), down XJ (8 + 8): the X is paid for twice.
    const e = evaluate(b, dict);
    expect(e.badRuns.map((r) => r.text).sort()).toEqual(['XJ', 'XQ']);
    expect(e.penaltyPoints).toBe(18 + 16);
  });

  it('stops scoring a word as soon as a letter in it is replaced, and penalises what is left', () => {
    const b = board();
    word(b, 9, 0, 'PLAN');
    setCell(b.grid, 9, 4, F);
    expect(evaluate(b, dict).wordPoints).toBe(6);
    expect(evaluate(b, dict).penaltyPoints).toBe(0);
    setCell(b.grid, 9, 2, { kind: 'letter', letter: 'X' }); // PLXN is not a word
    const e = evaluate(b, dict);
    expect(e.wordPoints).toBe(0);
    expect(e.penaltyPoints).toBe(3 + 1 + 8 + 1);
  });

  it('is a run, not a closed run: a bad run closed by walls and fillers is penalised too', () => {
    const b = board();
    draw(b, 'XQ.');
    expect(evaluate(b, dict).penaltyPoints).toBe(18);
  });
});

describe('evaluate: the worked example from the design notes', () => {
  // GEAR.
  // MAYBE
  // BEE..      ('.' is a filler)
  // Across, GEAR, MAYBE and BEE are words. Down, GMB, EAE and RB are not, AYE is, and the E in column 4 is alone.
  const examples = createDictionary(['GEAR', 'MAYBE', 'BEE', 'AYE'], { minLength: 2 });

  function exampleBoard(): ReturnType<typeof board> {
    const b = board();
    draw(b, 'GEAR.', 'MAYBE.', 'BEE..');
    setCell(b.grid, 3, 2, F); // closes the bottom of AYE
    return b;
  }

  it('finds the words and the bad runs', () => {
    const e = evaluate(exampleBoard(), examples);
    expect(e.words.map((w) => w.text).sort()).toEqual(['AYE', 'BEE', 'GEAR', 'MAYBE']);
    expect(e.badRuns.map((r) => r.text).sort()).toEqual(['EAE', 'GMB', 'RB']);
  });

  it('leaves the lone E alone', () => {
    const e = evaluate(exampleBoard(), examples);
    const touched = [...e.words, ...e.badRuns].filter((r) => r.cells.some(([row, col]) => row === 1 && col === 4));
    expect(touched.map((r) => r.text)).toEqual(['MAYBE']); // only its row, nothing down the column
  });

  it('adds the words and subtracts every letter of the bad runs', () => {
    const e = evaluate(exampleBoard(), examples);
    const gear = 2 + 1 + 1 + 1;
    const maybe = 3 + 1 + 4 + 3 + 1;
    const bee = 3 + 1 + 1;
    const aye = 1 + 4 + 1;
    expect(e.wordPoints).toBe(gear + maybe + bee + aye);
    const gmb = 2 + 3 + 3;
    const eae = 1 + 1 + 1;
    const rb = 1 + 3;
    expect(e.penaltyPoints).toBe(gmb + eae + rb);
    const fillers = e.fillerCount * FILLER_COST;
    expect(e.score).toBe(gear + maybe + bee + aye - (gmb + eae + rb) - fillers);
  });
});

describe('evaluate: the minimum word length decides what is a word', () => {
  // BIT
  // OF.     with fillers closing the ends: (0,3), (1,2) and (2,1)
  const small = createDictionary(['BIT', 'OF', 'IF'], { minLength: 2 });

  function smallBoard(): ReturnType<typeof board> {
    const b = board();
    draw(b, 'BIT.', 'OF.');
    setCell(b.grid, 2, 1, F);
    return b;
  }

  it('with a minimum of 2: IF and OF count, BO is penalised', () => {
    const e = evaluate(smallBoard(), small, { minLength: 2 });
    expect(e.words.map((w) => w.text).sort()).toEqual(['BIT', 'IF', 'OF']);
    expect(e.badRuns.map((r) => r.text)).toEqual(['BO']);
    expect(e.wordPoints).toBe(5 + 5 + 5); // BIT 3+1+1, OF 1+4, IF 1+4
    expect(e.penaltyPoints).toBe(3 + 1); // B3 + O1
  });

  it('with a minimum of 3: only BIT counts, and OF, IF and BO are all penalised', () => {
    const e = evaluate(smallBoard(), small, { minLength: 3 });
    expect(e.words.map((w) => w.text)).toEqual(['BIT']);
    expect(e.badRuns.map((r) => r.text).sort()).toEqual(['BO', 'IF', 'OF']);
    expect(e.wordPoints).toBe(5);
    expect(e.penaltyPoints).toBe(5 + 5 + 4);
  });

  it('uses MIN_WORD_LENGTH when no minimum is given', () => {
    const byDefault = evaluate(smallBoard(), small);
    const explicit = evaluate(smallBoard(), small, { minLength: MIN_WORD_LENGTH });
    expect(byDefault).toEqual(explicit);
  });
});

describe('evaluate: the score', () => {
  it('subtracts fillers and shovel costs from the score', () => {
    const b = board();
    word(b, 9, 0, 'PLAN');
    setCell(b.grid, 9, 4, F);
    setCell(b.grid, 0, 0, F);
    setCell(b.grid, 0, 1, F);
    b.spent = 5;
    const e = evaluate(b, dict);
    expect(e.fillerCount).toBe(3);
    expect(e.score).toBe(6 - 3 * FILLER_COST - 5);
  });

  it('is words minus penalties minus fillers minus shovel costs', () => {
    const b = board();
    word(b, 9, 0, 'PLAN');
    setCell(b.grid, 9, 4, F); // + 6
    word(b, 7, 0, 'XQ'); // bad run: - 18
    b.spent = 5;
    const e = evaluate(b, dict);
    expect(e.score).toBe(6 - 18 - FILLER_COST - 5);
  });

  it('can go below zero, and recovers when the bad run is fixed', () => {
    const b = board();
    word(b, 9, 0, 'CA');
    expect(evaluate(b, dict).score).toBe(-(3 + 1));
    setCell(b.grid, 9, 2, { kind: 'letter', letter: 'T' });
    setCell(b.grid, 9, 3, F);
    expect(evaluate(b, dict).score).toBe(3 + 1 + 1 - FILLER_COST);
  });
});

describe('evaluate: the board score and the shovel penalty are shown apart', () => {
  it('boardScore is only what is on the board: words minus penalties minus fillers, no shovel', () => {
    const b = board();
    word(b, 9, 0, 'PLAN');
    setCell(b.grid, 9, 4, F); // + 6
    word(b, 7, 0, 'XQ'); // bad run: - 18
    b.spent = 15;
    const e = evaluate(b, dict);
    expect(e.boardScore).toBe(6 - 18 - FILLER_COST);
    expect(e.shovelPenalty).toBe(15);
  });

  it('score is boardScore minus the shovel penalty', () => {
    const b = board();
    word(b, 9, 0, 'PLAN');
    setCell(b.grid, 9, 4, F);
    b.spent = 5;
    const e = evaluate(b, dict);
    expect(e.score).toBe(e.boardScore - e.shovelPenalty);
    expect(e.score).toBe(6 - FILLER_COST - 5);
  });

  it('with no shovel used, the board score is the whole score', () => {
    const b = board();
    word(b, 9, 0, 'PLAN');
    const e = evaluate(b, dict);
    expect(e.shovelPenalty).toBe(0);
    expect(e.boardScore).toBe(e.score);
  });
});