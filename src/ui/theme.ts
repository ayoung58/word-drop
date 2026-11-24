// All visual tokens: colors, fonts, sizes, radii and layout.
// No other file may hard-code these. Values come from src/ui/NightGrid.dc.html
// (palette B, "Night Grid"). To try another palette, change PALETTE only.
import { BOARD_H, BOARD_W } from '../core/config';

/** Logical canvas size. Phaser scales it to fit the phone (mobile first, 360 x 640). */
export const GAME_W = 360;
export const GAME_H = 640;

export const PALETTE = {
  bg: '#0E1320', // page and canvas background
  ink: '#E9EEF8', // text and icons
  tile: '#1D2535', // letter tile and button face
  line: '#2C364B', // tile and button border
  empty: '#151C2B', // empty board cell
  fill: '#04060B', // filler block (a wall)
  ok: '#1C6B58', // letter in a scored (closed) word
  okBorder: '#34E0B4',
  open: '#6B5A1F', // letter in a valid word that is not closed yet
  x2: '#213A6E', // double-word square
  x3: '#5A2748', // triple-word square
  accent: '#2EE6D6', // the falling piece and the selected button
  glow: '#134A50', // ring around the falling piece
  shadow: '#0A0F1A', // the 2 px "edge" under tiles and buttons
} as const;

export const FONT = {
  /** Loaded from Google Fonts in index.html. The fallback is used if it cannot load. */
  family: "'Chakra Petch', sans-serif",
  /** Weights the game uses, so Boot can wait for exactly these. */
  weights: [600, 700],
} as const;

/** One corner radius everywhere. */
export const RADIUS = 4;
/** Depth of the "edge" under a tile or button. */
export const EDGE = 2;

// Board geometry: the grid size comes from core, so the two can never disagree.
export const CELL = 35;
export const GAP = 4;
export const BOARD_PX_W = BOARD_W * CELL + (BOARD_W - 1) * GAP;
export const BOARD_PX_H = BOARD_H * CELL + (BOARD_H - 1) * GAP;

/** Left and right margin of the header and the button rows. */
export const PAD_X = 18;
/** Every touch target is at least this tall and wide (project rule: 44 px). */
export const TOUCH = 44;

/** Vertical layout, top to bottom. Each row starts where the previous one ends plus a gap. */
export const LAYOUT = {
  headerY: 20,
  headerH: TOUCH,
  boardX: Math.round((GAME_W - BOARD_PX_W) / 2),
  boardY: 72,
  switchY: 466,
  switchH: 52,
  powerY: 524,
  powerH: TOUCH,
  moveY: 574,
  moveH: 48,
  rowGap: 8,
} as const;

/** Centre of a board cell, in canvas pixels. */
export function cellCenter(row: number, col: number): { x: number; y: number } {
  return {
    x: LAYOUT.boardX + col * (CELL + GAP) + CELL / 2,
    y: LAYOUT.boardY + row * (CELL + GAP) + CELL / 2,
  };
}

/** Board cell under a canvas point, or null if the point is in a gap or outside the board. */
export function cellAtPoint(x: number, y: number): { row: number; col: number } | null {
  const step = CELL + GAP;
  const col = Math.floor((x - LAYOUT.boardX + GAP / 2) / step);
  const row = Math.floor((y - LAYOUT.boardY + GAP / 2) / step);
  if (col < 0 || col >= BOARD_W || row < 0 || row >= BOARD_H) return null;
  return { row, col };
}

/** Converts '#rrggbb' to the number Phaser's fillStyle expects. */
export function hex(color: string): number {
  return parseInt(color.replace('#', ''), 16);
}
