export type LetterType = 'vowel' | 'consonant';
export type PieceKind = LetterType | 'filler' | 'wildcard';
/** Types a player can switch to. The wildcard is a powerup, not a switch target. */
export type SwitchTarget = LetterType | 'filler';

export type Cell = { kind: 'letter'; letter: string } | { kind: 'filler' } | null;
export type Grid = Cell[][];

export interface Piece {
  row: number;
  col: number;
  kind: PieceKind;
  /** 'A'-'Z', '?' for a wildcard, null for a filler. */
  letter: string | null;
  /** Types the player has already left for this piece. They cannot switch back to them. */
  left: SwitchTarget[];
}

export interface Charges {
  wildcard: number;
  peek: number;
  freeze: number;
}

/** Plain data only (no classes or functions), so it can be cloned, saved and replayed. */
export interface GameState {
  seed: number;
  rng: { s: number };
  grid: Grid;
  /** 0 = no premium, otherwise 2 or 3. */
  premium: number[][];
  piece: Piece | null;
  vowelQueue: string[];
  consonantQueue: string[];
  lastLetterType: LetterType;
  placed: number;
  /** Points spent on the shovel. */
  spent: number;
  charges: Charges;
  peekDropsLeft: number;
  freezeTicksLeft: number;
  over: boolean;
}

export type Action =
  | { type: 'moveLeft' }
  | { type: 'moveRight' }
  /** Soft drop: move the piece down one row now (works while frozen). */
  | { type: 'drop' }
  /** One gravity step. The view sends these on a timer. */
  | { type: 'tick' }
  | { type: 'switch'; to: SwitchTarget }
  | { type: 'wildcard' }
  | { type: 'peek' }
  | { type: 'freeze' }
  | { type: 'shovel'; row: number; col: number };

export interface WordHit {
  text: string;
  cells: [number, number][];
  direction: 'across' | 'down';
  /** True when both ends touch the board edge or a filler. Only closed words score. */
  closed: boolean;
  points: number;
}

export interface Evaluation {
  words: WordHit[];
  wordPoints: number;
  fillerCount: number;
  /** wordPoints minus filler costs minus shovel costs. */
  score: number;
}
