import { BOARD_H, BOARD_W, FILLER_COST, MIN_WORD_LENGTH, letterValue } from './config';
import { cellAt, countFillers } from './board';
import type { Dictionary } from './words';
import type { BadRun, Evaluation, GameState, Grid, WordHit } from './types';

type Pos = [number, number];

export interface EvaluateOptions {
  /** Shortest run that can be a word. Defaults to MIN_WORD_LENGTH. Passing it lets tests (and later, game modes) try other lengths. */
  minLength?: number;
}

interface Context {
  grid: Grid;
  premium: number[][];
  dict: Dictionary;
  minLength: number;
}

interface Found {
  words: WordHit[];
  badRuns: BadRun[];
}

function letterAt(grid: Grid, p: Pos): string | null {
  const cell = cellAt(grid, p[0], p[1]);
  return cell?.kind === 'letter' ? cell.letter : null;
}

/** Points of a closed word: its letters, times every premium square it covers. */
function wordPoints(cells: Pos[], ctx: Context): number {
  let sum = 0;
  let multiplier = 1;
  for (const [r, c] of cells) {
    sum += letterValue(letterAt(ctx.grid, [r, c]) ?? '');
    const m = ctx.premium[r]?.[c] ?? 0;
    if (m > 1) multiplier *= m;
  }
  return sum * multiplier;
}

/**
 * Sorts every run of letters in one row or column into a word, a bad run, or nothing.
 * A run is a maximal stretch of letters, so MAYBE inside MAYBEJ is not a word. A run of one letter is
 * left alone. A longer run is either a word (valid, and at least the minimum length) or a bad run.
 */
function scanLine(line: Pos[], direction: WordHit['direction'], ctx: Context, out: Found): void {
  const kindAt = (p: Pos | undefined): string | undefined => (p ? cellAt(ctx.grid, p[0], p[1])?.kind : undefined);
  let i = 0;
  while (i < line.length) {
    if (kindAt(line[i]) !== 'letter') {
      i++;
      continue;
    }
    let j = i;
    let text = '';
    while (j < line.length && kindAt(line[j]) === 'letter') {
      text += letterAt(ctx.grid, line[j] as Pos);
      j++;
    }
    const cells = line.slice(i, j);
    if (cells.length >= 2) {
      if (cells.length >= ctx.minLength && ctx.dict.isWord(text)) {
        const closed = (i === 0 || kindAt(line[i - 1]) === 'filler') && (j === line.length || kindAt(line[j]) === 'filler');
        out.words.push({ text, cells, direction, closed, points: closed ? wordPoints(cells, ctx) : 0 });
      } else {
        // Plain letter values: a premium square multiplies a word, it does not make a mistake cost more.
        const penalty = cells.reduce((n, p) => n + letterValue(letterAt(ctx.grid, p) ?? ''), 0);
        out.badRuns.push({ text, cells, direction, penalty });
      }
    }
    i = j;
  }
}

/**
 * Reads every row and column of the board.
 *
 * - A valid run of letters is a word. It scores only when both ends touch the board edge or a filler ("closed").
 * - A run of two or more letters that is not a word costs the points of its letters, closed or not.
 * - A single letter on its own is neither.
 *
 * score = word points - bad run penalties - filler costs - shovel costs.
 */
export function evaluate(state: Pick<GameState, 'grid' | 'premium' | 'spent'>, dict: Dictionary, options: EvaluateOptions = {}): Evaluation {
  const ctx: Context = { grid: state.grid, premium: state.premium, dict, minLength: options.minLength ?? MIN_WORD_LENGTH };
  const found: Found = { words: [], badRuns: [] };
  for (let r = 0; r < BOARD_H; r++) {
    scanLine(Array.from({ length: BOARD_W }, (_, c): Pos => [r, c]), 'across', ctx, found);
  }
  for (let c = 0; c < BOARD_W; c++) {
    scanLine(Array.from({ length: BOARD_H }, (_, r): Pos => [r, c]), 'down', ctx, found);
  }
  const wordTotal = found.words.reduce((n, w) => n + w.points, 0);
  const penaltyPoints = found.badRuns.reduce((n, b) => n + b.penalty, 0);
  const fillerCount = countFillers(state.grid);
  const boardScore = wordTotal - penaltyPoints - fillerCount * FILLER_COST;
  return { words: found.words, badRuns: found.badRuns, wordPoints: wordTotal, penaltyPoints, fillerCount, boardScore, shovelPenalty: state.spent, score: boardScore - state.spent };
}
