import { describe, expect, it } from 'vitest';

// These tests turn the architecture rules in .cursor/rules/word-drop.mdc into checks, so that
// nobody (including an AI assistant) can quietly break them. They read the source files as text.
// Test files are skipped, because they are allowed to mention the things that are banned.
const modules = import.meta.glob(['/src/**/*.ts', '!/src/**/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** Removes comments, so a comment that merely mentions a banned word does not count. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Files (matching `where`) whose code matches `pattern`. An empty list means the rule holds. */
function offenders(where: (path: string) => boolean, pattern: RegExp): string[] {
  return Object.entries(modules)
    .filter(([path]) => where(path))
    .filter(([, source]) => pattern.test(code(source)))
    .map(([path]) => path)
    .sort();
}

const inCore = (path: string): boolean => path.startsWith('/src/core/');

describe('the scan itself', () => {
  it('finds the source files (otherwise every rule below would pass for the wrong reason)', () => {
    const paths = Object.keys(modules);
    expect(paths).toContain('/src/core/game.ts');
    expect(paths).toContain('/src/ui/theme.ts');
    expect(paths).toContain('/src/game/scenes/Play.ts');
    expect(paths.some((p) => p.endsWith('.test.ts'))).toBe(false);
  });

  it('ignores comments but not code', () => {
    expect(code('// Math.random is banned\nconst a = 1;')).not.toContain('Math.random');
    expect(code('/* window */ const a = 1;')).not.toContain('window');
    expect(code('const a = Math.random();')).toContain('Math.random');
  });
});

describe('rule 1: src/core knows nothing about the browser or the screen', () => {
  it('does not import Phaser', () => {
    expect(offenders(inCore, /from\s+['"]phaser['"]/)).toEqual([]);
  });

  it('does not import from game, ui, audio or storage', () => {
    expect(offenders(inCore, /from\s+['"]\.\.\//)).toEqual([]);
  });

  it('does not use window, document, localStorage or other browser globals', () => {
    expect(offenders(inCore, /\b(window|document|localStorage|sessionStorage|navigator|AudioContext)\b/)).toEqual([]);
  });
});

describe('rule 2: src/core is deterministic', () => {
  it('does not use Math.random, Date.now, new Date() or performance.now', () => {
    expect(offenders(inCore, /Math\.random|Date\.now|new Date\(|performance\.now/)).toEqual([]);
  });
});

describe('rule 4: colors live in src/ui/theme.ts', () => {
  it('has no hex color anywhere else', () => {
    // #rrggbb in strings and 0xrrggbb numbers. (Longer hex numbers, like rng constants, are not colors.)
    expect(offenders((p) => p !== '/src/ui/theme.ts', /#[0-9a-fA-F]{6}\b|\b0x[0-9a-fA-F]{6}\b/)).toEqual([]);
  });
});

describe('rule 5: saved data goes through src/storage', () => {
  it('is the only place that touches localStorage', () => {
    expect(offenders((p) => !p.startsWith('/src/storage/'), /\blocalStorage\b/)).toEqual([]);
  });
});

describe('code style', () => {
  it('uses no "any" type', () => {
    expect(offenders(() => true, /:\s*any\b|\bas any\b|<any>|\bany\[\]/)).toEqual([]);
  });
});
