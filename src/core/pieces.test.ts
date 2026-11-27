import { describe, expect, it } from 'vitest';
import { CONSONANT_BAG, QUEUE_LENGTH, VOWEL_BAG } from './config';
import { createGame } from './game';
import { buttonPreview, refillQueues, setPieceKind } from './pieces';
import type { GameState, Piece } from './types';

function pieceOf(s: GameState): Piece {
  if (!s.piece) throw new Error('no piece');
  return s.piece;
}

describe('queues', () => {
  it('start full and only hold letters of the right kind', () => {
    const s = createGame(1);
    expect(s.vowelQueue).toHaveLength(QUEUE_LENGTH);
    expect(s.consonantQueue).toHaveLength(QUEUE_LENGTH);
    expect(s.vowelQueue.every((l) => VOWEL_BAG.includes(l))).toBe(true);
    expect(s.consonantQueue.every((l) => CONSONANT_BAG.includes(l))).toBe(true);
  });

  it('refillQueues tops both queues back up', () => {
    const s = createGame(1);
    s.vowelQueue.shift();
    s.consonantQueue.length = 1;
    refillQueues(s);
    expect(s.vowelQueue).toHaveLength(QUEUE_LENGTH);
    expect(s.consonantQueue).toHaveLength(QUEUE_LENGTH);
  });
});

describe('setPieceKind', () => {
  it('puts the letter it was holding back at the front of its queue, so no letter is burned', () => {
    const s = createGame(7);
    const p = pieceOf(s);
    const letter = p.letter;
    setPieceKind(s, p, 'consonant');
    expect(s.vowelQueue[0]).toBe(letter);
    setPieceKind(s, p, 'vowel'); // core allows this; the one-way rule is enforced in step()
    expect(p.letter).toBe(letter);
  });

  it('takes the next letter from the new kind and remembers the last letter type', () => {
    const s = createGame(7);
    const p = pieceOf(s);
    const next = s.consonantQueue[0];
    setPieceKind(s, p, 'consonant');
    expect(p.kind).toBe('consonant');
    expect(p.letter).toBe(next);
    expect(s.lastType).toBe('consonant');
  });

  it('gives a filler no letter, and remembers the filler as the last type used', () => {
    const s = createGame(7);
    const p = pieceOf(s);
    setPieceKind(s, p, 'filler');
    expect(p.kind).toBe('filler');
    expect(p.letter).toBeNull();
    expect(s.lastType).toBe('filler');
  });

  it('gives a wildcard "?" and never returns it to a queue', () => {
    const s = createGame(7);
    const p = pieceOf(s);
    setPieceKind(s, p, 'wildcard');
    expect(p.letter).toBe('?');
    expect(s.lastType).toBe('vowel'); // a wildcard is a powerup, not a type the next piece should copy
    setPieceKind(s, p, 'consonant');
    expect([...s.vowelQueue, ...s.consonantQueue]).not.toContain('?');
  });

  it('does not push a null letter into a queue when leaving a filler', () => {
    const s = createGame(7);
    const p = pieceOf(s);
    setPieceKind(s, p, 'filler');
    setPieceKind(s, p, 'vowel');
    expect(s.vowelQueue.every((l) => typeof l === 'string' && l.length === 1)).toBe(true);
    expect(s.vowelQueue).toHaveLength(QUEUE_LENGTH);
  });
});

describe('buttonPreview', () => {
  it('for a vowel piece: the vowel button shows the piece, then the queue', () => {
    const s = createGame(11);
    const p = buttonPreview(s);
    expect(p.vowel).toEqual({ now: pieceOf(s).letter, then: s.vowelQueue[0] });
    expect(p.consonant).toEqual({ now: s.consonantQueue[0], then: s.consonantQueue[1] });
  });

  it('for a consonant piece: the consonant button shows the piece', () => {
    const s = createGame(11);
    setPieceKind(s, pieceOf(s), 'consonant');
    const p = buttonPreview(s);
    expect(p.consonant).toEqual({ now: pieceOf(s).letter, then: s.consonantQueue[0] });
    expect(p.vowel).toEqual({ now: s.vowelQueue[0], then: s.vowelQueue[1] });
  });

  it('for a filler or wildcard piece: both buttons show their queues', () => {
    for (const kind of ['filler', 'wildcard'] as const) {
      const s = createGame(11);
      setPieceKind(s, pieceOf(s), kind);
      const p = buttonPreview(s);
      expect(p.vowel).toEqual({ now: s.vowelQueue[0], then: s.vowelQueue[1] });
      expect(p.consonant).toEqual({ now: s.consonantQueue[0], then: s.consonantQueue[1] });
    }
  });

  it('with no piece: both buttons show their queues', () => {
    const s = createGame(11);
    s.piece = null;
    const p = buttonPreview(s);
    expect(p.vowel.now).toBe(s.vowelQueue[0]);
    expect(p.consonant.now).toBe(s.consonantQueue[0]);
  });
});
