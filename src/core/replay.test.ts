import { describe, expect, it } from 'vitest';
import { createGame, step } from './game';
import { hashSeed } from './rng';
import { evaluate } from './scoring';
import { randomActions } from './testkit';
import type { Action, GameState } from './types';
import { createDictionary } from './words';

const dict = createDictionary(['CAT', 'DOG', 'THE', 'AND', 'ARE', 'BUT', 'HOT', 'NOT', 'PIT', 'SIT', 'TAN', 'TEN', 'TIN', 'TON']);
const replay = (state: GameState, actions: readonly Action[]): GameState => actions.reduce((s, a) => step(s, a), state);
const fingerprint = (s: GameState): number => hashSeed(JSON.stringify(s));

// A game is fully described by its seed and the actions the player took. This is what makes the
// daily board fair and lets a server check a submitted score later, so it must never drift.
describe('replaying a game', () => {
  const actions = randomActions(99, 1500);

  it('gives the identical final state every time for the same seed and actions', () => {
    const a = replay(createGame(2026), actions);
    const b = replay(createGame(2026), actions);
    expect(b).toEqual(a);
  });

  it('gives a different game for a different seed', () => {
    expect(fingerprint(replay(createGame(2027), actions))).not.toBe(fingerprint(replay(createGame(2026), actions)));
  });

  it('continues exactly the same after the state is saved as JSON and loaded again', () => {
    const half = Math.floor(actions.length / 2);
    const middle = replay(createGame(2026), actions.slice(0, half));
    const restored = JSON.parse(JSON.stringify(middle)) as GameState;
    const straight = replay(middle, actions.slice(half));
    const viaJson = replay(restored, actions.slice(half));
    expect(viaJson).toEqual(straight);
  });

  it('is stable across code changes (golden game)', () => {
    // These numbers were recorded from a known-good run. If this test fails after a change you
    // meant to make (letter bags, rng, piece rules, scoring), check the change was intended, then
    // update the numbers. If you did not mean to change game behaviour, you broke determinism.
    expect(fingerprint(createGame(2026))).toBe(268625160);
    const end = replay(createGame(2026), actions);
    expect(end.placed).toBe(87);
    expect(end.over).toBe(false);
    expect(end.spent).toBe(185);
    expect(evaluate(end, dict).score).toBe(-195);
    expect(fingerprint(end)).toBe(3530047589);
  });

  it('gives each calendar date its own, repeatable board', () => {
    const day = (seed: number): number => fingerprint(createGame(seed));
    expect(day(hashSeed('a'))).toBe(day(hashSeed('a')));
    expect(day(hashSeed('a'))).not.toBe(day(hashSeed('b')));
  });
});
