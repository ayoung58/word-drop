import { BOARD_H, BOARD_W, PREMIUM_X2_COUNT, PREMIUM_X3_COUNT } from './config';
import { nextInt } from './rng';
import type { Rng } from './rng';
import type { Cell, Grid } from './types';

export function createGrid(): Grid {
  return Array.from({ length: BOARD_H }, () => Array<Cell>(BOARD_W).fill(null));
}

/** Places x2 and x3 squares at distinct random cells. */
export function createPremium(rng: Rng): number[][] {
  const premium = Array.from({ length: BOARD_H }, () => Array<number>(BOARD_W).fill(0));
  const place = (multiplier: number, count: number): void => {
    let placed = 0;
    while (placed < count) {
      const r = nextInt(rng, BOARD_H);
      const c = nextInt(rng, BOARD_W);
      const row = premium[r];
      if (row && row[c] === 0) {
        row[c] = multiplier;
        placed++;
      }
    }
  };
  place(2, PREMIUM_X2_COUNT);
  place(3, PREMIUM_X3_COUNT);
  return premium;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_H && col >= 0 && col < BOARD_W;
}

export function cellAt(grid: Grid, row: number, col: number): Cell {
  return grid[row]?.[col] ?? null;
}

export function setCell(grid: Grid, row: number, col: number, cell: Cell): void {
  const r = grid[row];
  if (r) r[col] = cell;
}

export function isFree(grid: Grid, row: number, col: number): boolean {
  return inBounds(row, col) && cellAt(grid, row, col) === null;
}

/** Makes every tile in a column fall to the bottom, keeping their order. */
export function collapseColumn(grid: Grid, col: number): void {
  const tiles: Cell[] = [];
  for (let r = 0; r < BOARD_H; r++) {
    const cell = cellAt(grid, r, col);
    if (cell) tiles.push(cell);
  }
  for (let r = BOARD_H - 1; r >= 0; r--) setCell(grid, r, col, tiles.pop() ?? null);
}

/** Column where a new piece appears: the free top cell closest to the centre, or null if the top row is full. */
export function spawnColumn(grid: Grid): number | null {
  const centre = (BOARD_W - 1) / 2;
  const cols = [...Array(BOARD_W).keys()].sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
  return cols.find((c) => cellAt(grid, 0, c) === null) ?? null;
}

export function nearestFreeColumn(grid: Grid, row: number, col: number): number | null {
  for (let d = 0; d < BOARD_W; d++) {
    if (isFree(grid, row, col - d)) return col - d;
    if (isFree(grid, row, col + d)) return col + d;
  }
  return null;
}

export function countFillers(grid: Grid): number {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell?.kind === 'filler') n++;
  return n;
}
