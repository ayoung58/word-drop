import { CONSONANT_BAG, QUEUE_LENGTH, VOWEL_BAG } from './config';
import { pickChar } from './rng';
import type { GameState, LetterType, Piece, PieceKind } from './types';

/** Tops both letter queues up to QUEUE_LENGTH. Mutates the state it is given. */
export function refillQueues(s: GameState): void {
  while (s.vowelQueue.length < QUEUE_LENGTH) s.vowelQueue.push(pickChar(s.rng, VOWEL_BAG));
  while (s.consonantQueue.length < QUEUE_LENGTH) s.consonantQueue.push(pickChar(s.rng, CONSONANT_BAG));
}

/**
 * Changes a piece to another kind. The letter it was holding goes back to the front
 * of its queue, so switching away and back never burns letters. Mutates the state.
 */
export function setPieceKind(s: GameState, piece: Piece, kind: PieceKind): void {
  if (piece.letter) {
    if (piece.kind === 'vowel') s.vowelQueue.unshift(piece.letter);
    else if (piece.kind === 'consonant') s.consonantQueue.unshift(piece.letter);
  }
  piece.kind = kind;
  piece.letter = null;
  // The next piece starts as the last type the player chose, filler included. The wildcard is
  // left out: it is a one-off powerup, so the piece after it goes back to vowel or consonant.
  if (kind !== 'wildcard') s.lastType = kind;
  if (kind === 'vowel' || kind === 'consonant') {
    const queue = kind === 'vowel' ? s.vowelQueue : s.consonantQueue;
    piece.letter = queue.shift() ?? null;
    refillQueues(s);
  } else if (kind === 'wildcard') {
    piece.letter = '?';
  }
}

export interface PoolPreview {
  /** The letter you would get by choosing this pool now. */
  now: string;
  /** The letter after that. Show it only while peek is active (peekDropsLeft > 0). */
  then: string;
}

/** What the Vowel and Consonant buttons should show. */
export function buttonPreview(s: GameState): Record<LetterType, PoolPreview> {
  const preview = (type: LetterType): PoolPreview => {
    const queue = type === 'vowel' ? s.vowelQueue : s.consonantQueue;
    const active = s.piece?.kind === type;
    return active
      ? { now: s.piece?.letter ?? '', then: queue[0] ?? '' }
      : { now: queue[0] ?? '', then: queue[1] ?? '' };
  };
  return { vowel: preview('vowel'), consonant: preview('consonant') };
}
