import { describe, expect, it } from 'vitest';
import { cellAt, setCell } from './board';
import { CONSONANT_BAG, FILLER_COST, FREEZE_TICKS, PEEK_DROPS, VOWEL_BAG } from './config';
import { createGame, step } from './game';
import { buttonPreview } from './pieces';
import { evaluate } from './scoring';
import { createDictionary } from './words';
import type { Action, GameState } from './types';

const dict = createDictionary(['CAT']);
const run = (s: GameState, ...actions: Action[]): GameState => actions.reduce((acc, a) => step(acc, a), s);
const times = (n: number, a: Action): Action[] => Array.from({ length: n }, () => a);
const piece = (s: GameState) => {
  if (!s.piece) throw new Error('no piece');
  return s.piece;
};

describe('createGame', () => {
  it('is deterministic for a seed', () => {
    expect(createGame(42)).toEqual(createGame(42));
  });

  it('starts with a vowel at the top centre and an empty board', () => {
    const s = createGame(1);
    expect(piece(s).kind).toBe('vowel');
    expect(piece(s).row).toBe(0);
    expect(piece(s).col).toBe(3);
    expect(VOWEL_BAG.includes(piece(s).letter ?? '')).toBe(true);
    expect(s.grid.flat().every((c) => c === null)).toBe(true);
  });

  it('places five x2 and three x3 premium squares', () => {
    const flat = createGame(5).premium.flat();
    expect(flat.filter((m) => m === 2)).toHaveLength(5);
    expect(flat.filter((m) => m === 3)).toHaveLength(3);
  });

  it('never changes the state it was given', () => {
    const s = createGame(4);
    const snapshot = JSON.stringify(s);
    step(s, { type: 'moveLeft' });
    step(s, { type: 'tick' });
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('movement and falling', () => {
  it('moves sideways and stops at the walls', () => {
    expect(piece(run(createGame(1), ...times(10, { type: 'moveLeft' }))).col).toBe(0);
    expect(piece(run(createGame(1), ...times(10, { type: 'moveRight' }))).col).toBe(7);
  });

  it('cannot move into an occupied cell', () => {
    const s = createGame(1);
    setCell(s.grid, 0, 2, { kind: 'filler' });
    expect(piece(step(s, { type: 'moveLeft' })).col).toBe(3);
  });

  it('falls one row per tick, locks at the floor and spawns the next piece', () => {
    let s = run(createGame(7), ...times(9, { type: 'tick' }));
    expect(piece(s).row).toBe(9);
    s = step(s, { type: 'tick' });
    expect(cellAt(s.grid, 9, 3)?.kind).toBe('letter');
    expect(s.placed).toBe(1);
    expect(piece(s).row).toBe(0);
  });

  it('lands on top of tiles', () => {
    const s = createGame(7);
    setCell(s.grid, 9, 3, { kind: 'filler' });
    expect(piece(run(s, ...times(8, { type: 'tick' }))).row).toBe(8);
    const locked = run(s, ...times(9, { type: 'tick' }));
    expect(cellAt(locked.grid, 8, 3)?.kind).toBe('letter');
  });
});

describe('switching piece type', () => {
  it('switches forward, restarts the drop from the top and keeps the unused letter', () => {
    let s = createGame(7);
    const original = piece(s).letter;
    s = run(s, { type: 'tick' }, { type: 'tick' }, { type: 'switch', to: 'consonant' });
    expect(piece(s).kind).toBe('consonant');
    expect(piece(s).row).toBe(0);
    expect(CONSONANT_BAG.includes(piece(s).letter ?? '')).toBe(true);
    expect(s.vowelQueue[0]).toBe(original);
  });

  it('does not allow going back to a type that was left', () => {
    const s = run(createGame(7), { type: 'switch', to: 'consonant' });
    const snapshot = JSON.stringify(s);
    expect(JSON.stringify(step(s, { type: 'switch', to: 'vowel' }))).toBe(snapshot);
  });

  it('starts the next piece as the last letter type used, with every type available again', () => {
    const s = run(createGame(7), { type: 'switch', to: 'consonant' }, ...times(10, { type: 'drop' }));
    expect(piece(s).kind).toBe('consonant');
    expect(piece(s).left).toEqual([]);
    expect(piece(step(s, { type: 'switch', to: 'vowel' })).kind).toBe('vowel');
  });

  it('places a filler that costs FILLER_COST (nothing, for now)', () => {
    const s = run(createGame(7), { type: 'switch', to: 'filler' }, ...times(10, { type: 'drop' }));
    expect(cellAt(s.grid, 9, 3)?.kind).toBe('filler');
    expect(evaluate(s, dict).score).toBe(0 - FILLER_COST);
  });

  it('keeps the filler selected for the next piece, and for the one after that', () => {
    let s = run(createGame(7), { type: 'switch', to: 'filler' }, ...times(10, { type: 'drop' }));
    expect(piece(s).kind).toBe('filler');
    expect(piece(s).left).toEqual([]);
    s = run(s, ...times(10, { type: 'drop' }));
    expect(piece(s).kind).toBe('filler');
    expect(s.placed).toBe(2);
  });

  it('lets the player leave filler, and then the next piece follows the new choice', () => {
    let s = run(createGame(7), { type: 'switch', to: 'filler' }, ...times(10, { type: 'drop' }));
    s = run(s, { type: 'switch', to: 'consonant' });
    expect(piece(s).kind).toBe('consonant');
    s = run(s, ...times(10, { type: 'drop' }));
    expect(piece(s).kind).toBe('consonant');
  });

  it('keeps the vowel or consonant choice for the next piece when a wildcard was dropped in between', () => {
    const s = run(createGame(7), { type: 'switch', to: 'consonant' }, { type: 'wildcard' }, ...times(10, { type: 'drop' }));
    expect(s.placed).toBe(1);
    expect(piece(s).kind).toBe('consonant');
  });
});

describe('powerups', () => {
  it('turns the piece into a wildcard and refunds it when you switch away', () => {
    let s = run(createGame(3), { type: 'wildcard' });
    expect(piece(s).kind).toBe('wildcard');
    expect(piece(s).letter).toBe('?');
    expect(s.charges.wildcard).toBe(1);
    s = step(s, { type: 'switch', to: 'consonant' });
    expect(s.charges.wildcard).toBe(2);
    expect(piece(s).left).toEqual([]);
  });

  it('ignores a wildcard with no charges or on a filler', () => {
    const empty = createGame(3);
    empty.charges.wildcard = 0;
    expect(piece(step(empty, { type: 'wildcard' })).kind).toBe('vowel');
    const filler = run(createGame(3), { type: 'switch', to: 'filler' }, { type: 'wildcard' });
    expect(piece(filler).kind).toBe('filler');
  });

  it('peek lasts a few landings', () => {
    let s = run(createGame(3), { type: 'peek' });
    expect(s.peekDropsLeft).toBe(PEEK_DROPS);
    expect(s.charges.peek).toBe(1);
    s = run(s, ...times(10, { type: 'drop' }));
    expect(s.peekDropsLeft).toBe(PEEK_DROPS - 1);
  });

  it('freeze skips gravity ticks but not soft drops', () => {
    let s = run(createGame(3), { type: 'freeze' });
    expect(s.freezeTicksLeft).toBe(FREEZE_TICKS);
    s = run(s, ...times(FREEZE_TICKS, { type: 'tick' }));
    expect(piece(s).row).toBe(0);
    s = step(s, { type: 'tick' });
    expect(piece(s).row).toBe(1);
    expect(piece(run(createGame(3), { type: 'freeze' }, { type: 'drop' })).row).toBe(1);
  });

  it('shovel removes a tile for 5 points and drops the tiles above it', () => {
    const s = createGame(5);
    setCell(s.grid, 9, 0, { kind: 'letter', letter: 'A' });
    setCell(s.grid, 8, 0, { kind: 'filler' });
    setCell(s.grid, 7, 0, { kind: 'letter', letter: 'B' });
    const after = step(s, { type: 'shovel', row: 8, col: 0 });
    expect(after.spent).toBe(5);
    expect(cellAt(after.grid, 9, 0)).toEqual({ kind: 'letter', letter: 'A' });
    expect(cellAt(after.grid, 8, 0)).toEqual({ kind: 'letter', letter: 'B' });
    expect(cellAt(after.grid, 7, 0)).toBeNull();
  });

  it('shovel on an empty cell does nothing', () => {
    expect(step(createGame(5), { type: 'shovel', row: 9, col: 0 }).spent).toBe(0);
  });
});

describe('previews', () => {
  it('shows what each button would give, and the letter after it', () => {
    const s = createGame(11);
    const p = buttonPreview(s);
    expect(p.vowel.now).toBe(piece(s).letter);
    expect(p.vowel.then).toBe(s.vowelQueue[0]);
    expect(p.consonant.now).toBe(s.consonantQueue[0]);
    expect(p.consonant.then).toBe(s.consonantQueue[1]);
  });
});

describe('end of game', () => {
  it('ends when no piece can enter the top row, and ignores further actions', () => {
    const s = createGame(8);
    for (let c = 0; c < 8; c++) if (c !== 3) setCell(s.grid, 0, c, { kind: 'filler' });
    setCell(s.grid, 1, 3, { kind: 'filler' });
    const done = step(s, { type: 'tick' });
    expect(done.over).toBe(true);
    expect(done.piece).toBeNull();
    expect(step(done, { type: 'moveLeft' })).toBe(done);
  });

  it('a whole game of plain ticks finishes with a number for a score', () => {
    let s = createGame(99);
    for (let i = 0; i < 5000 && !s.over; i++) s = step(s, { type: 'tick' });
    expect(s.over).toBe(true);
    expect(Number.isFinite(evaluate(s, dict).score)).toBe(true);
  });
});
