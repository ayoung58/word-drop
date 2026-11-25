import { describe, expect, it } from 'vitest';
import { MIN_WORD_LENGTH } from '../core/config';
import { parseWordList } from '../core/words';
import { buildDictionary } from './dictionary';

// Reads the real word lists, so a damaged or swapped file is noticed.
// public/words/ holds what the game loads (and ships). data/wordlists/ holds spare lists that are
// NOT shipped, which is why they live outside public/.
// If you change a file on purpose, update the counts here and in CREDITS.md.
const files = import.meta.glob(['/public/words/*.txt', '/data/wordlists/*.txt'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const text = (name: string): string => files[`/public/words/${name}`] ?? files[`/data/wordlists/${name}`] ?? '';

const EXPECTED = [
  { name: 'enable.txt', words: 173_528 }, // ENABLE 2K
  { name: 'eowl.txt', words: 128_985 }, // English Open Word List
  { name: 'freq-word.txt', words: 60_540 }, // Bart Massey's frequently used word list
] as const;

const notPlainLowercase = (name: string): number =>
  parseWordList(text(name)).filter((w) => !/^[a-z]+$/.test(w)).length;

describe('word list files', () => {
  it.each(EXPECTED)('$name is present and has the expected number of words', ({ name, words }) => {
    expect(parseWordList(text(name))).toHaveLength(words);
  });

  it.each(['enable.txt', 'freq-word.txt'])('%s is plain lowercase a-z, one word per line', (name) => {
    expect(notPlainLowercase(name)).toBe(0);
  });

  // Known upstream problem (our copy is byte-identical to BartMassey/wordlists): some accented
  // words are garbled (e.g. "adiÛs"). The game does not load this file. Clean it before using it.
  it('eowl.txt has the known 219 garbled lines (update this if the file is cleaned)', () => {
    expect(notPlainLowercase('eowl.txt')).toBe(219);
  });
});

describe('the game dictionary built from enable.txt', () => {
  const dict = buildDictionary(text('enable.txt'));

  it('knows ordinary words', () => {
    for (const w of ['cat', 'house', 'maybe', 'quiz', 'zebra']) expect(dict.has(w), w).toBe(true);
  });

  it('rejects words that are not words', () => {
    for (const w of ['xqzv', 'catz', 'houze']) expect(dict.has(w), w).toBe(false);
  });

  it('drops words shorter than the minimum length, so two-letter words cannot be formed', () => {
    expect(MIN_WORD_LENGTH).toBe(3);
    for (const w of ['to', 'is', 'qi', 'za']) expect(dict.has(w), w).toBe(false);
  });

  it('drops words longer than the board is wide (8 letters)', () => {
    expect(dict.has('house')).toBe(true);
    expect(dict.has('household')).toBe(false); // 9 letters
  });

  it('answers wildcard questions', () => {
    expect(dict.isWord('c?t')).toBe(true);
    expect(dict.isWord('q?iz')).toBe(true);
    expect(dict.isWord('x??x')).toBe(false);
  });

  it('is a sensible size after filtering to 3 to 8 letters', () => {
    // 3 to 8 letters out of 173,528 words leaves about 80,000.
    expect(dict.size).toBeGreaterThan(70_000);
    expect(dict.size).toBeLessThan(100_000);
  });
});

describe('buildDictionary with a missing or wrong file', () => {
  it('gives an empty dictionary for no text and for an HTML page (what the dev server sends for a missing file)', () => {
    expect(buildDictionary(undefined).size).toBe(0);
    expect(buildDictionary('<!doctype html>\n<html>\n<body>\n</body>\n</html>').size).toBe(0);
  });
});
