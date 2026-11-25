import { describe, expect, it } from 'vitest';
import { MIN_WORD_LENGTH } from './config';
import { createDictionary, parseWordList } from './words';

describe('dictionary', () => {
  const dict = createDictionary(['cat', 'TO', 'Plan', 'x', 'it\'s', 'abcdefghijk']);

  it('normalises case and ignores unsuitable words', () => {
    expect(dict.has('CAT')).toBe(true);
    expect(dict.has('plan')).toBe(true);
    expect(dict.has('X')).toBe(false); // too short
    expect(dict.has('TO')).toBe(false); // shorter than MIN_WORD_LENGTH
    expect(dict.has('ITS')).toBe(false); // the apostrophe entry is dropped
    expect(dict.has('ABCDEFGHIJK')).toBe(false); // too long
    expect(dict.size).toBe(2);
  });

  it('uses MIN_WORD_LENGTH as its default minimum, so the dictionary and scoring agree', () => {
    expect(MIN_WORD_LENGTH).toBe(3);
    expect(createDictionary(['AB', 'ABC']).has('AB')).toBe(false);
    expect(createDictionary(['AB', 'ABC']).has('ABC')).toBe(true);
  });

  it('accepts explicit length limits', () => {
    const custom = createDictionary(['TO', 'CAT', 'PLAN', 'HOUSE'], { minLength: 2, maxLength: 4 });
    expect(custom.has('TO')).toBe(true);
    expect(custom.has('PLAN')).toBe(true);
    expect(custom.has('HOUSE')).toBe(false);
  });

  it('checks exact words', () => {
    expect(dict.isWord('CAT')).toBe(true);
    expect(dict.isWord('CAR')).toBe(false);
  });

  it('lets ? stand for any one letter', () => {
    expect(dict.isWord('C?T')).toBe(true);
    expect(dict.isWord('P?AN')).toBe(true);
    expect(dict.isWord('C?Z')).toBe(false);
    expect(dict.isWord('???')).toBe(true); // CAT
    expect(dict.isWord('?????')).toBe(false); // no five-letter word
  });

  it('lets several ? stand for several letters', () => {
    expect(dict.isWord('?A?')).toBe(true);
    expect(dict.isWord('C??')).toBe(true);
    expect(dict.isWord('P??N')).toBe(true);
    expect(dict.isWord('Z??')).toBe(false);
  });

  it('parses a word list file', () => {
    expect(parseWordList('cat\r\n dog \n\nfox\n')).toEqual(['cat', 'dog', 'fox']);
  });

  it('parses an empty file and a file with only blank lines', () => {
    expect(parseWordList('')).toEqual([]);
    expect(parseWordList('\n\r\n  \n')).toEqual([]);
  });

  it('ignores duplicates', () => {
    expect(createDictionary(['cat', 'CAT', 'Cat']).size).toBe(1);
  });
});
