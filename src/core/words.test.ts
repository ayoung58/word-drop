import { describe, expect, it } from 'vitest';
import { createDictionary, parseWordList } from './words';

describe('dictionary', () => {
  const dict = createDictionary(['cat', 'TO', 'Plan', 'x', 'it\'s', 'abcdefghijk']);

  it('normalises case and ignores unsuitable words', () => {
    expect(dict.has('CAT')).toBe(true);
    expect(dict.has('plan')).toBe(true);
    expect(dict.has('X')).toBe(false); // too short
    expect(dict.has('ITS')).toBe(false); // the apostrophe entry is dropped
    expect(dict.has('ABCDEFGHIJK')).toBe(false); // too long
    expect(dict.size).toBe(3);
  });

  it('checks exact words', () => {
    expect(dict.isWord('CAT')).toBe(true);
    expect(dict.isWord('CAR')).toBe(false);
  });

  it('lets ? stand for any one letter', () => {
    expect(dict.isWord('C?T')).toBe(true);
    expect(dict.isWord('?O')).toBe(true);
    expect(dict.isWord('C?Z')).toBe(false);
    expect(dict.isWord('??')).toBe(true);
    expect(dict.isWord('?????')).toBe(false);
  });

  it('parses a word list file', () => {
    expect(parseWordList('cat\r\n dog \n\nfox\n')).toEqual(['cat', 'dog', 'fox']);
  });
});
