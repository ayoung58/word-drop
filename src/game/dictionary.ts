import { MIN_WORD_LENGTH } from '../core/config';
import { createDictionary, parseWordList } from '../core/words';
import type { Dictionary } from '../core/words';

/** Where Boot looks for the ENABLE word list (one word per line). */
export const WORDS_URL = `${import.meta.env.BASE_URL}words/enable.txt`;

/** A real word list has tens of thousands of words, so anything tiny means the file is missing or wrong. */
const MIN_EXPECTED_WORDS = 1000;

/**
 * Builds the dictionary from the word list text, keeping words that fit the board
 * (MIN_WORD_LENGTH to 8 letters, which is also the board width).
 * If the file is missing the game still runs, but no word can score.
 */
export function buildDictionary(text: string | undefined): Dictionary {
  // createDictionary drops anything that is not A-Z, so an HTML error page (which the dev server
  // sends for a missing file) simply produces an empty dictionary.
  const dict = createDictionary(parseWordList(text ?? ''), { minLength: MIN_WORD_LENGTH, maxLength: 8 });
  if (dict.size < MIN_EXPECTED_WORDS) {
    console.warn(`Word list not loaded (${dict.size} words). Put ENABLE at public/words/enable.txt, then reload. No word can score until then.`);
  }
  return dict;
}
