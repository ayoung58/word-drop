export interface Dictionary {
  readonly size: number;
  /** Exact word check, case-insensitive. */
  has(word: string): boolean;
  /** Like has(), but '?' in the text matches any single letter. */
  isWord(pattern: string): boolean;
}

export interface DictionaryOptions {
  minLength?: number;
  maxLength?: number;
}

/** Splits a word list file (one word per line) into words. */
export function parseWordList(text: string): string[] {
  return text.split(/\r?\n/).map((w) => w.trim()).filter((w) => w.length > 0);
}

export function createDictionary(words: Iterable<string>, options: DictionaryOptions = {}): Dictionary {
  const minLength = options.minLength ?? 2;
  const maxLength = options.maxLength ?? 8;
  const all = new Set<string>();
  const byLength = new Map<number, string[]>();
  for (const raw of words) {
    const w = raw.toUpperCase();
    if (w.length < minLength || w.length > maxLength || !/^[A-Z]+$/.test(w) || all.has(w)) continue;
    all.add(w);
    const list = byLength.get(w.length);
    if (list) list.push(w);
    else byLength.set(w.length, [w]);
  }
  return {
    size: all.size,
    has: (word) => all.has(word.toUpperCase()),
    isWord(pattern) {
      const p = pattern.toUpperCase();
      if (!p.includes('?')) return all.has(p);
      const candidates = byLength.get(p.length) ?? [];
      return candidates.some((w) => {
        for (let i = 0; i < p.length; i++) {
          if (p.charAt(i) !== '?' && p.charAt(i) !== w.charAt(i)) return false;
        }
        return true;
      });
    },
  };
}
