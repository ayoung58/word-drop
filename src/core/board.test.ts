import { describe, expect, it } from 'vitest';
import { cellAt, collapseColumn, countFillers, createGrid, createPremium, inBounds, isFree, nearestFreeColumn, setCell, spawnColumn } from './board';
import { BOARD_H, BOARD_W, PREMIUM_X2_COUNT, PREMIUM_X3_COUNT } from './config';
import { createRng } from './rng';
import type { Cell } from './types';

const F: Cell = { kind: 'filler' };
const L = (letter: string): Cell => ({ kind: 'letter', letter });

describe('createGrid', () => {
  it('is 10 rows of 8 empty cells', () => {
    const g = createGrid();
    expect(g).toHaveLength(BOARD_H);
    expect(g.every((row) => row.length === BOARD_W && row.every((c) => c === null))).toBe(true);
  });

  it('gives every row its own array', () => {
    const g = createGrid();
    setCell(g, 0, 0, F);
    expect(cellAt(g, 1, 0)).toBeNull();
  });
});

describe('createPremium', () => {
  it('places exactly five x2 and three x3 squares on distinct cells', () => {
    const flat = createPremium(createRng(3)).flat();
    expect(flat).toHaveLength(BOARD_W * BOARD_H);
    expect(flat.filter((m) => m === 2)).toHaveLength(PREMIUM_X2_COUNT);
    expect(flat.filter((m) => m === 3)).toHaveLength(PREMIUM_X3_COUNT);
    expect(flat.every((m) => m === 0 || m === 2 || m === 3)).toBe(true);
  });

  it('gives the same layout for the same seed and a different one for another seed', () => {
    expect(createPremium(createRng(5))).toEqual(createPremium(createRng(5)));
    expect(createPremium(createRng(5))).not.toEqual(createPremium(createRng(6)));
  });
});

describe('cell helpers', () => {
  it('inBounds is true on all four edges and false just outside', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(BOARD_H - 1, BOARD_W - 1)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(BOARD_H, 0)).toBe(false);
    expect(inBounds(0, BOARD_W)).toBe(false);
  });

  it('reads outside the board as empty and ignores writes there', () => {
    const g = createGrid();
    expect(cellAt(g, -1, 0)).toBeNull();
    expect(cellAt(g, 0, 99)).toBeNull();
    expect(() => setCell(g, 99, 0, F)).not.toThrow();
    expect(countFillers(g)).toBe(0);
  });

  it('isFree is false for an occupied cell and for anything off the board', () => {
    const g = createGrid();
    expect(isFree(g, 5, 5)).toBe(true);
    setCell(g, 5, 5, L('A'));
    expect(isFree(g, 5, 5)).toBe(false);
    expect(isFree(g, -1, 5)).toBe(false);
    expect(isFree(g, 5, BOARD_W)).toBe(false);
  });

  it('countFillers counts only filler blocks', () => {
    const g = createGrid();
    setCell(g, 0, 0, F);
    setCell(g, 1, 1, F);
    setCell(g, 2, 2, L('A'));
    expect(countFillers(g)).toBe(2);
  });
});

describe('collapseColumn', () => {
  it('drops every tile to the bottom and keeps their order', () => {
    const g = createGrid();
    setCell(g, 2, 4, L('A'));
    setCell(g, 5, 4, F);
    setCell(g, 7, 4, L('B'));
    collapseColumn(g, 4);
    expect(cellAt(g, 9, 4)).toEqual(L('B'));
    expect(cellAt(g, 8, 4)).toEqual(F);
    expect(cellAt(g, 7, 4)).toEqual(L('A'));
    for (let r = 0; r <= 6; r++) expect(cellAt(g, r, 4)).toBeNull();
  });

  it('leaves other columns and an empty column alone', () => {
    const g = createGrid();
    setCell(g, 3, 0, L('A'));
    collapseColumn(g, 1);
    expect(cellAt(g, 3, 0)).toEqual(L('A'));
    expect(g.every((row) => row[1] === null)).toBe(true);
  });

  it('does not move a column that is already packed', () => {
    const g = createGrid();
    setCell(g, 9, 2, L('A'));
    setCell(g, 8, 2, L('B'));
    collapseColumn(g, 2);
    expect(cellAt(g, 9, 2)).toEqual(L('A'));
    expect(cellAt(g, 8, 2)).toEqual(L('B'));
  });
});

describe('spawnColumn', () => {
  it('starts at the centre column', () => {
    expect(spawnColumn(createGrid())).toBe(3);
  });

  it('moves to the nearest free column when the centre is blocked', () => {
    const g = createGrid();
    setCell(g, 0, 3, F);
    expect(spawnColumn(g)).toBe(4);
    setCell(g, 0, 4, F);
    expect(spawnColumn(g)).toBe(2);
    setCell(g, 0, 2, F);
    expect(spawnColumn(g)).toBe(5);
  });

  it('is null when the top row is full', () => {
    const g = createGrid();
    for (let c = 0; c < BOARD_W; c++) setCell(g, 0, c, F);
    expect(spawnColumn(g)).toBeNull();
  });
});

describe('nearestFreeColumn', () => {
  it('returns the column itself when it is free', () => {
    expect(nearestFreeColumn(createGrid(), 4, 3)).toBe(3);
  });

  it('looks left first, then right, widening one column at a time', () => {
    const g = createGrid();
    setCell(g, 4, 3, F);
    expect(nearestFreeColumn(g, 4, 3)).toBe(2);
    setCell(g, 4, 2, F);
    expect(nearestFreeColumn(g, 4, 3)).toBe(4);
  });

  it('is null when the whole row is blocked', () => {
    const g = createGrid();
    for (let c = 0; c < BOARD_W; c++) setCell(g, 4, c, F);
    expect(nearestFreeColumn(g, 4, 3)).toBeNull();
  });
});
