import { describe, expect, it } from 'vitest';
import { cellAt, inBounds, isFree } from './board';
import { BOARD_H, BOARD_W, QUEUE_LENGTH, SHOVEL_COST, START_CHARGES } from './config';
import { createGame, step } from './game';
import { evaluate } from './scoring';
import { randomActions } from './testkit';
import type { Action, GameState } from './types';
import { createDictionary } from './words';

const dict = createDictionary(['CAT', 'DOG', 'THE', 'AND', 'ARE', 'BUT', 'HOT', 'NOT', 'PIT', 'SIT', 'TAN', 'TEN', 'TIN', 'TON']);

/** Things that must be true after every single step, whatever the player does. Returns what is wrong. */
function problems(s: GameState): string[] {
  const out: string[] = [];

  let tiles = 0;
  for (let r = 0; r < BOARD_H; r++) {
    for (let c = 0; c < BOARD_W; c++) {
      if (cellAt(s.grid, r, c) === null) continue;
      tiles++;
      // Gravity: a tile always rests on another tile or the floor.
      if (r < BOARD_H - 1 && cellAt(s.grid, r + 1, c) === null) out.push(`floating tile at ${r},${c}`);
    }
  }
  // Every landed piece adds one tile and every shovel use (5 points each) removes one.
  const shovelUses = s.spent / SHOVEL_COST;
  if (!Number.isInteger(shovelUses)) out.push(`spent ${s.spent} is not a multiple of the shovel cost`);
  if (tiles !== s.placed - shovelUses) out.push(`tiles ${tiles} != placed ${s.placed} - shovels ${shovelUses}`);

  for (const key of ['wildcard', 'peek', 'freeze'] as const) {
    if (s.charges[key] < 0 || s.charges[key] > START_CHARGES[key]) out.push(`${key} charges out of range: ${s.charges[key]}`);
  }
  if (s.peekDropsLeft < 0) out.push('peekDropsLeft below 0');
  if (s.freezeTicksLeft < 0) out.push('freezeTicksLeft below 0');
  if (s.vowelQueue.length < QUEUE_LENGTH || s.consonantQueue.length < QUEUE_LENGTH) out.push('a letter queue ran short');

  if (s.over !== (s.piece === null)) out.push('over and piece disagree');
  const p = s.piece;
  if (p) {
    if (!inBounds(p.row, p.col)) out.push(`piece out of bounds at ${p.row},${p.col}`);
    else if (!isFree(s.grid, p.row, p.col)) out.push(`piece inside a tile at ${p.row},${p.col}`);
  }

  if (!Number.isFinite(evaluate(s, dict).score)) out.push('score is not a finite number');
  return out;
}

describe('random games', () => {
  const seeds = Array.from({ length: 24 }, (_, i) => i + 1);

  it.each(seeds)('seed %i keeps every rule invariant over 300 random actions', (seed) => {
    let s = createGame(seed);
    expect(problems(s)).toEqual([]);
    randomActions(seed * 101 + 7, 300).forEach((action, i) => {
      const before = JSON.stringify(s);
      const next = step(s, action);
      // step() must never change the state it was given.
      expect(JSON.stringify(s), `input changed by action ${i} ${JSON.stringify(action)}`).toBe(before);
      const bad = problems(next);
      expect(bad, `after action ${i} ${JSON.stringify(action)}`).toEqual([]);
      s = next;
    });
  });

  it.each([1, 2, 3])('seed %i fills the board and ends the game without breaking any invariant', (seed) => {
    // Mostly soft drops (so the board really fills up), with moves and switches mixed in.
    // No shovel: it would dig the board out again.
    const targets = ['consonant', 'filler', 'vowel'] as const;
    let s = createGame(seed);
    for (let i = 1; i < 6000 && !s.over; i++) {
      const action: Action =
        i % 11 === 0 ? { type: 'switch', to: targets[(i / 11) % 3] ?? 'vowel' }
        : i % 7 === 0 ? { type: 'moveLeft' }
        : i % 5 === 0 ? { type: 'moveRight' }
        : { type: 'drop' };
      s = step(s, action);
      if (i % 25 === 0) expect(problems(s), `seed ${seed}, action ${i}`).toEqual([]);
    }
    expect(s.over).toBe(true);
    expect(s.piece).toBeNull();
    expect(problems(s)).toEqual([]);
  });
});
