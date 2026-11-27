# Word Drop

[![CI](https://github.com/ayoung58/word-drop/actions/workflows/ci.yml/badge.svg)](https://github.com/ayoung58/word-drop/actions/workflows/ci.yml)

A mobile-first falling-letter word puzzle. Letters, fillers and powerups fall onto an 8 x 10 grid.
Any run of three or more letters that is closed off by a wall or a filler block becomes a word and
scores. Letters that sit side by side without making a word cost their points, and breaking a word loses its points, so every drop is a decision. Letters use Scrabble values and Scrabble frequencies, and each tile shows its points.

The full design is in [docs/GDD.md](docs/GDD.md). What is built, what is next and what is still
broken is in [docs/PROJECT_STATUS_AND_ROADMAP.md](docs/PROJECT_STATUS_AND_ROADMAP.md).

## Quick start

You need [Node.js](https://nodejs.org/) 24 or newer.

```bash
npm install          # once, installs the dependencies
npm run dev -- --host   # dev server, also reachable from your phone
npm test             # unit tests
npm run build        # type check (strict) and production build into dist/
```

### Playing on your phone

1. Put the phone on the same Wi-Fi as the computer.
2. Run `npm run dev -- --host`. Vite prints a line like `Network: http://192.168.1.20:5173/`.
3. Open that address in the phone's browser.

If it does not load, allow Node.js through the Windows firewall for private networks.

### Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Move | Left / right buttons | Arrow keys |
| Drop | Down button (hold to repeat) | Down arrow or Space |
| Switch piece type | Vowel / consonant / filler buttons | Q / W / E |
| Powerups | Wildcard, peek, freeze | 1 / 2 / 3 |
| Shovel | Shovel button, then tap a tile | 4 |
| Pause | Pause button | P or Esc |

## How the code is organised

| Folder | What lives there |
| --- | --- |
| `src/core` | All game rules. Pure, deterministic TypeScript with no Phaser, no browser APIs and no `Math.random`. Fully unit tested. |
| `src/game` | Phaser scenes and views. They only draw state and send player actions to the core. |
| `src/ui` | `theme.ts`, the single home of colours, fonts, sizes and layout. |
| `src/audio` | Sounds, synthesised with the Web Audio API (no sound files). |
| `src/storage` | Saved data (best score and so on) behind one small interface. |
| `public/words` | The word list the game loads (`enable.txt`). Everything in `public/` is shipped to players. |
| `data/wordlists` | Spare word lists that are not shipped (see `CREDITS.md`). |

These rules are enforced automatically by `src/architecture.test.ts`, so breaking one fails
`npm test`.

## Quality checks

- **TypeScript strict mode** is on (`"strict": true` in `tsconfig.json`) and `npm run build`
  fails on any type error.
- **Unit tests** (Vitest) cover the core rules, random-play invariants, replay determinism, the
  architecture rules and the real word lists.
- **Continuous integration:** GitHub Actions runs `npm ci`, `npm test` and `npm run build` on every
  push to `main` and on every pull request. See `.github/workflows/ci.yml`.

## Continuous integration

The workflow in `.github/workflows/ci.yml` starts by itself when you push to `main` or open a pull
request. To see it, open the repository on GitHub and click the **Actions** tab. A green tick means
the tests and the build passed, a red cross means something broke: click the run, then the failed
step, to read the log. You can also start it by hand: Actions, CI, **Run workflow**.

To check the same things on your computer before pushing, run `npm test` and `npm run build`.

## Word lists and credits

The dictionary is ENABLE 2K (public domain). See [CREDITS.md](CREDITS.md) for the sources and
licence notices of all word lists.

## Not done yet

These are planned in later milestones, see the roadmap: menu and settings, daily challenge, a
bundled font, a real icon, store builds with Capacitor (Android and iOS), and different board
sizes. A project licence has not been chosen yet.
