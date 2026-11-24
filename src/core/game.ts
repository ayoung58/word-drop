import { BOARD_W, FREEZE_TICKS, PEEK_DROPS, SHOVEL_COST, START_CHARGES } from './config';
import { cellAt, collapseColumn, createGrid, createPremium, inBounds, isFree, nearestFreeColumn, setCell, spawnColumn } from './board';
import { refillQueues, setPieceKind } from './pieces';
import { createRng } from './rng';
import type { Action, GameState, Piece, SwitchTarget } from './types';

/** Creates a new game. The same seed always gives the same premium squares and the same letters. */
export function createGame(seed: number): GameState {
  const rng = createRng(seed);
  const s: GameState = {
    seed,
    rng,
    grid: createGrid(),
    premium: createPremium(rng),
    piece: null,
    vowelQueue: [],
    consonantQueue: [],
    lastLetterType: 'vowel',
    placed: 0,
    spent: 0,
    charges: { ...START_CHARGES },
    peekDropsLeft: 0,
    freezeTicksLeft: 0,
    over: false,
  };
  refillQueues(s);
  spawn(s);
  return s;
}

/**
 * Applies one player action or gravity tick and returns the new state.
 * The state you pass in is never changed. Invalid actions return an unchanged copy.
 */
export function step(state: GameState, action: Action): GameState {
  if (state.over) return state;
  const s = structuredClone(state);
  switch (action.type) {
    case 'moveLeft':
      move(s, -1);
      break;
    case 'moveRight':
      move(s, 1);
      break;
    case 'drop':
      fall(s);
      break;
    case 'tick':
      if (s.freezeTicksLeft > 0) s.freezeTicksLeft--;
      else fall(s);
      break;
    case 'switch':
      switchPiece(s, action.to);
      break;
    case 'wildcard':
      useWildcard(s);
      break;
    case 'peek':
      if (s.charges.peek > 0) {
        s.charges.peek--;
        s.peekDropsLeft = PEEK_DROPS;
      }
      break;
    case 'freeze':
      if (s.charges.freeze > 0) {
        s.charges.freeze--;
        s.freezeTicksLeft = FREEZE_TICKS;
      }
      break;
    case 'shovel':
      useShovel(s, action.row, action.col);
      break;
  }
  return s;
}

function spawn(s: GameState): void {
  const col = spawnColumn(s.grid);
  if (col === null) {
    s.piece = null;
    s.over = true;
    return;
  }
  const piece: Piece = { row: 0, col, kind: 'vowel', letter: null, left: [] };
  setPieceKind(s, piece, s.lastLetterType);
  s.piece = piece;
}

function move(s: GameState, dir: -1 | 1): void {
  const p = s.piece;
  if (!p) return;
  const col = p.col + dir;
  if (col >= 0 && col < BOARD_W && isFree(s.grid, p.row, col)) p.col = col;
}

function fall(s: GameState): void {
  const p = s.piece;
  if (!p) return;
  if (isFree(s.grid, p.row + 1, p.col)) {
    p.row++;
    return;
  }
  setCell(s.grid, p.row, p.col, p.kind === 'filler' ? { kind: 'filler' } : { kind: 'letter', letter: p.letter ?? '?' });
  s.placed++;
  if (s.peekDropsLeft > 0) s.peekDropsLeft--;
  spawn(s);
}

function switchPiece(s: GameState, to: SwitchTarget): void {
  const p = s.piece;
  if (!p || p.kind === to || p.left.includes(to)) return;
  if (p.kind === 'wildcard') s.charges.wildcard++;
  else p.left.push(p.kind);
  setPieceKind(s, p, to);
  p.row = 0;
}

function useWildcard(s: GameState): void {
  const p = s.piece;
  if (!p || s.charges.wildcard < 1 || (p.kind !== 'vowel' && p.kind !== 'consonant')) return;
  s.charges.wildcard--;
  setPieceKind(s, p, 'wildcard');
}

function useShovel(s: GameState, row: number, col: number): void {
  if (!inBounds(row, col) || cellAt(s.grid, row, col) === null) return;
  setCell(s.grid, row, col, null);
  s.spent += SHOVEL_COST;
  collapseColumn(s.grid, col);
  const p = s.piece;
  if (p && !isFree(s.grid, p.row, p.col)) {
    const free = nearestFreeColumn(s.grid, p.row, p.col);
    if (free !== null) p.col = free;
  }
}
