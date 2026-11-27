import { describe, expect, it } from 'vitest';
import { FILLER_COST } from '../../core/config';
import { createGame } from '../../core/game';
import { buttonPreview } from '../../core/pieces';
import type { BadRun, WordHit } from '../../core/types';
import { badCells, fillerCaption, markWords, poolLetters, powerupCaptions, shovelPenaltyCaption, tileFill } from './labels';

const word = (cells: [number, number][], closed: boolean): WordHit => ({ text: 'CAT', cells, direction: 'across', closed, points: 0 });
const run = (cells: [number, number][]): BadRun => ({ text: 'XQ', cells, direction: 'across', penalty: 0 });

describe('poolLetters (the Vowel and Consonant buttons)', () => {
  it('shows the next letter with its points', () => {
    expect(poolLetters({ now: 'E', then: 'Q' }, false)).toEqual([{ letter: 'E', points: 1 }]);
    expect(poolLetters({ now: 'Q', then: 'E' }, false)).toEqual([{ letter: 'Q', points: 10 }]);
  });

  it('adds the letter after it, also with its points, while peek is on', () => {
    expect(poolLetters({ now: 'K', then: 'Y' }, true)).toEqual([
      { letter: 'K', points: 5 },
      { letter: 'Y', points: 4 },
    ]);
  });

  it('skips a missing letter instead of showing an empty one', () => {
    expect(poolLetters({ now: 'A', then: '' }, true)).toEqual([{ letter: 'A', points: 1 }]);
  });

  it('works on the real preview of a new game, for both buttons', () => {
    const p = buttonPreview(createGame(3));
    expect(poolLetters(p.vowel, true)).toHaveLength(2);
    expect(poolLetters(p.consonant, false)).toHaveLength(1);
  });
});

describe('powerupCaptions', () => {
  it('wraps the remaining amounts in parentheses', () => {
    expect(powerupCaptions({ wildcard: 2, peek: 1, freeze: 0 })).toEqual({ wildcard: 'Wildcard (2)', peek: 'Peek (1)', freeze: 'Freeze (0)' });
  });
});

describe('fillerCaption', () => {
  it('says the filler is free while it costs nothing, and shows the cost otherwise', () => {
    expect(fillerCaption(0)).toBe('free');
    expect(fillerCaption(1)).toBe('\u22121');
  });

  it('matches the cost in the config', () => {
    expect(fillerCaption(FILLER_COST)).toBe(FILLER_COST === 0 ? 'free' : `\u2212${FILLER_COST}`);
  });
});

describe('markWords', () => {
  it('marks closed words as scored and open ones as open', () => {
    const marks = markWords([word([[0, 0], [0, 1]], true), word([[1, 0]], false)]);
    expect(marks.get('0,0')).toBe('scored');
    expect(marks.get('1,0')).toBe('open');
  });

  it('lets a scored word win over an open word on a shared letter, in either order', () => {
    const closed = word([[0, 0]], true);
    const open = word([[0, 0]], false);
    expect(markWords([closed, open]).get('0,0')).toBe('scored');
    expect(markWords([open, closed]).get('0,0')).toBe('scored');
  });
});

describe('badCells', () => {
  it('lists every letter of every bad run, once', () => {
    const cells = badCells([run([[0, 0], [0, 1]]), run([[0, 1], [1, 1]])]);
    expect([...cells].sort()).toEqual(['0,0', '0,1', '1,1']);
  });

  it('is empty when there are no bad runs', () => {
    expect(badCells([]).size).toBe(0);
  });
});

describe('tileFill (the color behind a placed letter)', () => {
  const states = ['none', 'open', 'scored'] as const;

  it('uses the word color when the square has no premium', () => {
    expect(tileFill('none', 0)).toBe('tile');
    expect(tileFill('open', 0)).toBe('open');
    expect(tileFill('scored', 0)).toBe('ok');
  });

  it('uses the x2 color on an x2 square, whatever the letter is doing', () => {
    for (const word of states) expect(tileFill(word, 2), word).toBe('x2');
  });

  it('uses the x3 color on an x3 square, whatever the letter is doing', () => {
    for (const word of states) expect(tileFill(word, 3), word).toBe('x3');
  });
});

describe('shovelPenaltyCaption (next to the main score)', () => {
  it('is hidden until the shovel has been used', () => {
    expect(shovelPenaltyCaption(0)).toBeNull();
  });

  it('shows the total as a parenthesised negative, no prose', () => {
    expect(shovelPenaltyCaption(5)).toBe('(-5)');
    expect(shovelPenaltyCaption(15)).toBe('(-15)');
  });
});