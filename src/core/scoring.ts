import { BOARD_H, BOARD_W, FILLER_COST, LETTER_VALUES, MIN_WORD_LENGTH } from './config';
import { cellAt, countFillers } from './board';
import type { Dictionary } from './words';
import type { Evaluation, GameState, Grid, WordHit } from './types';

type Pos = [number, number];

function scanLine(line: Pos[], direction: WordHit['direction'], grid: Grid, premium: number[][], dict: Dictionary, out: WordHit[]): void {
  const kindAt = (p: Pos | undefined): string | undefined => (p ? cellAt(grid, p[0], p[1])?.kind : undefined);
  let i = 0;
  while (i < line.length) {
    if (kindAt(line[i]) !== 'letter') {
      i++;
      continue;
    }
    let j = i;
    let text = '';
    while (j < line.length) {
      const p = line[j];
      const cell = p ? cellAt(grid, p[0], p[1]) : null;
      if (cell?.kind !== 'letter') break;
      text += cell.letter;
      j++;
    }
    const cells = line.slice(i, j);
    if (cells.length >= MIN_WORD_LENGTH && dict.isWord(text)) {
      const closed = (i === 0 || kindAt(line[i - 1]) === 'filler') && (j === line.length || kindAt(line[j]) === 'filler');
      let points = 0;
      if (closed) {
        let sum = 0;
        let multiplier = 1;
        for (const [r, c] of cells) {
          const cell = cellAt(grid, r, c);
          if (cell?.kind === 'letter') sum += LETTER_VALUES[cell.letter] ?? 0;
          const m = premium[r]?.[c] ?? 0;
          if (m > 1) multiplier *= m;
        }
        points = sum * multiplier;
      }
      out.push({ text, cells, direction, closed, points });
    }
    i = j;
  }
}

/**
 * Finds every valid word on the board, across and down. A word is a full run of letters.
 * It scores only when both ends touch the board edge or a filler ("closed").
 */
export function evaluate(state: Pick<GameState, 'grid' | 'premium' | 'spent'>, dict: Dictionary): Evaluation {
  const words: WordHit[] = [];
  for (let r = 0; r < BOARD_H; r++) {
    scanLine(Array.from({ length: BOARD_W }, (_, c): Pos => [r, c]), 'across', state.grid, state.premium, dict, words);
  }
  for (let c = 0; c < BOARD_W; c++) {
    scanLine(Array.from({ length: BOARD_H }, (_, r): Pos => [r, c]), 'down', state.grid, state.premium, dict, words);
  }
  const wordPoints = words.reduce((n, w) => n + w.points, 0);
  const fillerCount = countFillers(state.grid);
  return { words, wordPoints, fillerCount, score: wordPoints - fillerCount * FILLER_COST - state.spent };
}
