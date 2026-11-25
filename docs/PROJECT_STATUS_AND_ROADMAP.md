# Word Drop: Project Status and Roadmap

*Written 23 November 2026, after the "prototype V1" commit. Updated 25 November 2026 after the M0 code work. This is the engineering status and plan. The game design itself lives in `docs/GDD.md` (the GDD). The project rules live in `.cursor/rules/word-drop.mdc`. Credits and licences are in `CREDITS.md`.*

*Update this file at the end of each milestone: tick things off, move finished items into section 2, and add new findings to section 4.*

## Contents

1. [Summary](#1-summary)
2. [What is implemented](#2-what-is-implemented)
3. [MVP checklist against the GDD](#3-mvp-checklist-against-the-gdd)
4. [Things to fix and files to populate](#4-things-to-fix-and-files-to-populate)
5. [Testing strategy and test backlog](#5-testing-strategy-and-test-backlog)
6. [Roadmap in milestones](#6-roadmap-in-milestones)
7. [Decisions needed from you](#7-decisions-needed-from-you)
8. [Appendix: file map, commands, phone playtest checklist](#8-appendix)

---

## 1. Summary

| Area | Status |
| --- | --- |
| Game rules (`src/core`) | Done and tested (minimum word length 3). Missing: game modes (Daily, Limited pool). |
| Playable screen (Phaser) | Done as a first version: board, touch buttons, powerups, pause, shovel, game over, animations, sound. Checked by hand in a desktop browser only, not yet on the S23. |
| Word list | **Added** (`enable.txt` plus two spare lists, all identical to upstream). Loads and filters correctly in tests (about 80,600 words of 3 to 8 letters). Not yet played with by hand, which is M1. |
| Quality gates | TypeScript `strict` on, 144 tests in 11 files (including architecture guards), CI workflow written (needs your first push to run). |
| Saved data | Best score is saved. Streak and settings are only a data shape, with no logic. |
| Menu, Daily mode, tutorial, settings | Not started. |
| Web deployment, installable web app | Not started. |
| Android (Capacitor, cloud build, Play) | Not started. |
| Automated tests for the screen code | None, because the logic is tangled with Phaser. Section 5 and milestone M2 fix this. |

**Where you are in the GDD schedule:** the Week 1 items are done except "load a real word list" and "touch controls working on your S23" (built, untested on the phone). Roughly half of Week 2 (board, HUD, powerup buttons, theme, sound, pause, game over) is also built.

**The single most important next step** is to play the real game with the word list and look into the unexplained instant Game Over (M1). The word list is now in, but nobody has played with it by hand yet.

---

## 2. What is implemented

### 2.1 Architecture (follows the rules file)

```
src/core      Pure rules. No Phaser, no browser. Deterministic (seeded rng).
src/game      Phaser scenes and views. Draws state, sends actions to core.
src/ui        theme.ts: every color, size, radius, font and layout number.
src/audio     Synthesized sound effects (Web Audio), no audio files.
src/storage   Saved data (localStorage today, swappable).
src/main.ts   Entry point: starts the Phaser game.
```

The data flow is one loop: a player action (touch, key) or a gravity tick goes into `step(state, action)` in core, which returns the new state. `Play.ts` then compares the old and new state to decide which animation and sound to trigger, and the views redraw from the new state.

### 2.2 Core (`src/core`)

| File | What it does |
| --- | --- |
| `config.ts` | Board size 8x10, `MIN_WORD_LENGTH` (3), costs (filler 1, shovel 5), peek and freeze lengths, starting charges (2 each), letter bags, Scrabble letter values, `fallIntervalMs` (700 ms, faster by 8 ms per piece, never below 250 ms). |
| `types.ts` | `GameState`, `Piece`, `Cell`, `Action`, `WordHit`, `Evaluation`. State is plain data (cloneable, savable, replayable). |
| `rng.ts` | Seeded random generator, `hashSeed`, `dailySeed(date)`. |
| `words.ts` | `createDictionary` (case-insensitive, length filter that defaults to `MIN_WORD_LENGTH`, `?` wildcard lookup), `parseWordList`. |
| `board.ts` | Grid, premium squares (five x2, three x3), column collapse for the shovel, spawn column, bounds helpers. |
| `pieces.ts` | Letter queues, one-way type switching, button previews (current and next letter). |
| `scoring.ts` | `evaluate`: finds whole-run words across and down, marks them closed or open, applies premium multipliers, subtracts filler and shovel costs. |
| `game.ts` | `createGame(seed)`, `step(state, action)`: moving, falling, locking, switching, wildcard, peek, freeze, shovel, game over. Never mutates its input. |
| `index.ts` | Re-exports everything. |

Game rules implemented in core match the rules file: closed-word scoring in both directions, premium multipliers multiplied together, one-way switching that resets after landing, wildcard refund, shovel collapse, game ends when no piece can enter.

### 2.3 Screen (`src/game`, `src/ui`)

| File | What it does |
| --- | --- |
| `main.ts` | Creates the Phaser game: 360x640, scale to fit, three simultaneous touch points. |
| `scenes/Boot.ts` | Loads the word list (if present), builds the dictionary, waits for the web font, starts Play. |
| `scenes/Play.ts` | The play screen. Sends player input to `step`, schedules gravity, handles pause, armed shovel and restart confirmation, triggers animation and sound, saves the best score at game over. |
| `scenes/GameOver.ts` | Final score, best score or "NEW BEST", Play again button. |
| `scenes/Menu.ts` | **Empty placeholder**, not in the scene list. |
| `views/BoardView.ts` | 80 cell tiles plus the falling piece. Green for scored words, yellow for valid open words. Landing squash, word pulse, shovel pop, piece glide. |
| `views/TileView.ts` | One tile: empty, premium, letter, filler, falling piece (accent border and glow). |
| `views/Buttons.ts` | `Button` (reacts on touch-down, pressed look, hold-to-repeat, dims when unavailable) and `ControlPanel` (Vowel / Consonant / Filler row, Wildcard / Peek / Freeze / Shovel row, Left / Down / Right row). |
| `views/HUD.ts` | Score with count-up animation, status text (PAUSED, TAP A TILE, TAP AGAIN, FROZEN), pause and restart buttons. |
| `views/text.ts` | Shared text helper (font, high-density rendering). |
| `dictionary.ts` | Turns the word list text into a core dictionary; warns in the console if it is missing. |
| `ui/theme.ts` | Palette B "Night Grid" from `NightGrid.dc.html`, layout numbers, helpers `cellCenter` and `cellAtPoint`. |

**Controls**

| Action | Touch | Keyboard |
| --- | --- | --- |
| Move left / right | Left / Right buttons (hold to repeat) | Left / Right arrows |
| Soft drop | Down button (hold to repeat) | Down arrow or Space |
| Switch to vowel / consonant / filler | Three buttons | Q / W / E |
| Wildcard, Peek, Freeze | Powerup buttons | 1 / 2 / 3 |
| Shovel | Shovel button, then tap a tile | 4, then tap a tile |
| Pause | Pause button | P or Esc |
| Restart | Restart button, twice within 2 seconds | none |

**Behaviours decided in the view layer** (not rules, but worth reviewing):

- Pause and the armed shovel work by not sending gravity ticks. The board stays visible while paused, so the player can plan.
- Pressing any button other than Pause and Restart ends a pause or cancels the armed shovel, and performs that button's action. This follows the GDD ("any other button resumes").
- Tapping an empty cell with the shovel armed does nothing and keeps it armed.
- A full restart needs two taps within 2 seconds so a stray tap cannot lose a game.
- Every Classic game uses a new random seed (the view uses `Math.random`, which is allowed outside core).
- Game over waits 0.7 s so the last landing animation finishes. The Game Over screen ignores Space and Enter for 0.8 s so a held key cannot skip it.

### 2.4 Audio (`src/audio`)

Six synthesized effects: land (soft thunk), score (rising chime, one note more for longer words), shovel, switch, powerup, game over. No files and no licences. Audio is skipped until the first touch or key press (browsers require this; the unlock listens to `pointerdown`, `touchend`, `click` and `keydown` for iOS). There is no mute setting yet.

### 2.5 Storage (`src/storage`)

`load()` and `save()` for `{ bestScore, streak, lastPlayedDate }` in localStorage. Only `bestScore` is used so far.

### 2.6 Tests

144 tests in 11 files, all passing (about 4 seconds). Run with `npm test`.

| File | Covers |
| --- | --- |
| `core/words.test.ts`, `scoring.test.ts`, `rng.test.ts`, `game.test.ts` | Dictionary, scoring (including the 3-letter minimum), rng, and the game step rules. |
| `core/board.test.ts`, `pieces.test.ts`, `config.test.ts` | Grid and premium squares, collapse and spawn, queues and switching, button previews, and the pinned configuration values. |
| `core/invariants.test.ts` | Random games: many seeds, hundreds of random actions each, checking the board and state rules after every step, plus games played until the board is full. |
| `core/replay.test.ts` | Same seed and actions give the same state, JSON round trip, a golden game that fails if any rule changes by accident. (`core/testkit.ts` builds the random action lists.) |
| `architecture.test.ts` | The rules file as tests: core is pure, colours only in `theme.ts`, `localStorage` only in `src/storage`, no `any`. |
| `game/wordlists.test.ts` | The real files in `public/words` and `data/wordlists`: counts, plain a-z, and the dictionary built from `enable.txt` (3 to 8 letters). |

### 2.7 Project setup

Vite, TypeScript (`strict`), Phaser 4, Vitest installed. `.cursor/rules/word-drop.mdc` in place. Git remote is `github.com/ayoung58/word-drop`. Scripts: `dev`, `build` (`tsc` then `vite build`), `preview`, `test`. `vite.config.ts` sets `base: './'`, so the build works from any folder. `.github/workflows/ci.yml` runs `npm ci`, `npm test` and `npm run build` on every push to `main` and every pull request. `README.md`, `CREDITS.md` and a placeholder `public/favicon.svg` exist.

---

## 3. MVP checklist against the GDD

The GDD's MVP scope is: Classic and Daily board; the four powerups; light and dark themes; sound; first-run tutorial; local best score and streak; no accounts, no ads.

| MVP item | Status | Milestone |
| --- | --- | --- |
| Classic mode | Done, word list in place, needs hand play (M1) | M1 |
| Daily board (same seed and premium layout for everyone) | Core has `dailySeed`. No mode, no menu, no UI. | M4 |
| Wildcard, peek, freeze, shovel | Done | M3 (tuning) |
| Night Grid theme (dark) | Done | |
| Light theme | Not started | M5 |
| Sound | Effects done. No mute, not tested on a phone. | M3, M5 |
| First-run tutorial | Not started | M5 |
| Local best score | Done | |
| Local streak | Not started (fields exist, no logic) | M4 |
| Pause, game over, restart | Done | |
| Installable web app (home screen) | Not started | M6 |
| Free host link, itch.io page | Not started | M6 |
| Android build, Play closed test | Not started | M7 |

---

## 4. Things to fix and files to populate

Priority: **High** blocks real play or breaks a project rule. **Medium** should be done before the public web release. **Low** is cleanup.

### 4.1 Files that are empty, stubs or missing

| Item | Priority | Detail |
| --- | --- | --- |
Done in M0 (kept here as a record): `public/words/enable.txt` added, `docs/GDD.md` is the full plan, `README.md` and `CREDITS.md` written, placeholder `public/favicon.svg`, `.github/workflows/ci.yml` written.

| Item | Priority | Detail |
| --- | --- | --- |
| ~~`eowl.txt` and `freq-word.txt` shipped in the build~~ | Done | Moved to `data/wordlists/` (outside `public/`), so the build no longer carries them. Rule of thumb: everything in `public/` is shipped to players. `CREDITS.md` explains the EOWL licence condition if it is ever used. |
| `eowl.txt` has 219 garbled accented lines | Low | It is an upstream problem. Recorded in `wordlists.test.ts`. Only matters if EOWL is ever used. |
| Real favicon and app icons | Medium | The favicon is a placeholder (a W tile). Real icons come in M6 and M7. |
| `src/game/scenes/Menu.ts` | Medium | Empty placeholder. Built in M4. |
| Android workflow in `.github/workflows/` | Later | M7. |
| `public/sounds/`, `public/fonts/` | Low | Not needed yet (sound is synthesized). Fonts need self-hosting in M6. |
| `capacitor.config.ts` | Later | M7. |
| `CREDITS.md`: fonts, icon, any assets | Medium | Word lists are credited. Chakra Petch is listed as "to be completed"; finish when fonts are self-hosted (M6). |
| Project licence (`LICENSE`) | Medium | None chosen. Needed before the code is public. See section 7. |

### 4.2 Rule conflicts and decisions already made but not applied

None open. Both items below were resolved in M0:

- `MIN_WORD_LENGTH` is now **3** (your decision). The scoring tests were updated first. The dictionary default follows the constant, and scoring tests use a 2-letter dictionary to prove the scoring itself rejects short words.
- `tsconfig.json` now has `"strict": true`. It compiled with zero errors.

### 4.3 Bugs and risks found

| Item | Priority | Detail |
| --- | --- | --- |
| Unexplained instant Game Over in one browser test | High | In a scripted test (reload, then send key events for wildcard, left, drop) the game ended with score 0 almost immediately. I could not reproduce or explain it before the dev server was stopped. It may be an artifact of sending synthetic events during scene start, but it must be ruled out. Plan: reproduce with a controller test (M2), then on the phone (M3). |
| Audio may stay silent on iPhone | Medium | Code fixed in M0: the unlock now also listens to `touchend` and `click`. Still unverified without an iPhone. |
| Blurry rendering on high-density phone screens | Medium | The canvas is 360x640 and scaled up by CSS, so shapes may look soft on the S23 (text is already rendered at screen density). Needs a look on the phone, then probably rendering the canvas at 2x or 3x. |
| Empty bars on tall phones | Medium | The S23 screen is taller than 16:9, and "scale to fit" leaves empty bands above and below the game. Options: leave it, or make the canvas height adapt and spread the layout. |
| Word list size and speed | Medium | ENABLE is 173,528 words (1.7 MB download), about 80,600 after filtering to 3 to 8 letters. Loading and parsing on a phone should be fast, but measure it. Consider pre-filtering the file to 3 to 8 letters at build time. Also, wildcard lookups scan every word of that length on each step. Likely fine, but add a performance test (section 5) and an index if it is slow. |
| Dictionary max length 8 while columns are 10 tall | Low | A vertical run of 9 or 10 valid letters cannot exist in the list, so it never scores. This is probably fine, but it should be a conscious decision. |
| Google Fonts loaded from the internet | Medium | Fails offline and inside a future Android app. Self-host the two Chakra Petch weights (licence is open) in M6. |
| Bundle size | Low | The built JavaScript is about 1.4 MB (Phaser). Fine for now. Revisit before the itch.io and portal releases. |
| Shovel when you are below 5 points | Low | Currently always allowed (score can go negative). This is an open GDD question. |
| Core README is slightly stale | Low | First lines talk about unzipping files. Trim when writing the project README. |
| `peek` display | Low | Shows "E . A" on the pool buttons. Check on the phone that it is readable. |

### 4.4 Rules still not implemented in the product

- Daily board mode and streak logic.
- Limited pool mode (GDD section 5, listed as a possible mode, not MVP).
- Light theme and a theme switch.
- Mute and other settings.

---

## 5. Testing strategy and test backlog

You asked to rely on Vitest rather than the browser. That works well for core, and it can also work for the screen **if the screen's logic is separated from Phaser**. Phaser needs a canvas, so scenes and views are hard to test, but the decisions they make are not.

### 5.1 Principles

1. Every rule change starts with a failing test (already in the rules file).
2. Anything that is a decision (what to animate, which button is enabled, what pause does) should live in plain functions or classes that do not import Phaser, so Vitest can test it.
3. Phaser files should only translate decisions into drawing. Those stay manual.
4. No new dependencies are needed for the tests below:
   - Reading source files in a test: use Vite's `import.meta.glob('/src/**/*.ts', { query: '?raw', eager: true })` instead of adding `@types/node`.
   - Fake browser storage: use `vi.stubGlobal('localStorage', ...)` instead of adding `jsdom`.
   - Random testing: use core's own seeded `createRng`, not a library.

### 5.2 What exists (144 tests, 11 files)

See section 2.6 for the file-by-file list. Done in M0: `board`, `pieces`, `config`, `replay` and `invariants` tests, the architecture guards, the extra scoring and words tests, and the word list test.

### 5.3 Core test backlog (what is still open)

| Test file | Tests still to write |
| --- | --- |
| `scoring.test.ts` | A wildcard inside a vertical word. A run of 9 or 10 letters is never a word (dictionary maximum is 8). |
| `game.test.ts` | A new piece spawns at the nearest free column when the centre is blocked. Shovel under the falling piece moves the piece to a free column. Using the shovel on a filler removes it and costs 5. Freeze followed by a landing. Wildcard used twice refunds correctly. Invalid actions return an unchanged state for every action type. Actions after game over return the same object. (The random-play invariants already cover much of this indirectly.) |
| `rng.test.ts` | `pickChar` frequencies roughly follow the bag. Seeds 0, negative and very large work. Generator state is plain JSON. |
| `words.test.ts` | A speed test with about 170,000 synthetic words (wildcard lookup should stay well under a few milliseconds). |

### 5.4 Word list tests

Done in `src/game/wordlists.test.ts`: all three files have the expected word counts, `enable.txt` and `freq-word.txt` are plain a-z, the dictionary built from `enable.txt` knows ordinary words, rejects non-words and 2-letter words, drops words over 8 letters, answers wildcard questions and has a sensible size, and a missing or HTML file gives an empty dictionary. A blocklist test is only needed if a blocklist is added (planned after M8).

### 5.5 Screen-logic tests (need the M2 refactor first)

Extract these from `Play.ts`, `Buttons.ts` and `theme.ts` into `src/game/logic/` (no Phaser imports):

| New module | What it holds | Tests |
| --- | --- | --- |
| `events.ts` | `describeChange(before, after, action, previousWords)` returns a list of events: landed (with cell), word scored (with cells and length), shoveled, switched, powerup used. | A landing event only when `placed` goes up. A word event only for a newly closed word, not for one that was already closed. Longest word picks the chime length. Shovel and switch events. No events for an invalid action. |
| `controls.ts` | `controlStates(state, shovelArmed)` returns the label, selected and disabled state for each of the ten buttons. | Left-behind type is disabled. Wildcard disabled with no charges or on a filler. Peek and Freeze show as active. Peek shows the extra letter. Shovel shows as selected when armed. No piece disables everything. |
| `session.ts` | A `PlaySession` class holding the state, evaluation, `paused`, `shovelArmed`, `restartArmed`, `ending` and the gravity timer. Methods: `act`, `frame(deltaMs)`, `togglePause`, `toggleShovel`, `tapCell`, `restart`. Takes the dictionary, a storage object and a seed as inputs. | Gravity ticks at the right interval and speeds up. Paused and shovel-armed games send no ticks. Any button resumes and also performs its action. Pause pressed while shovel armed only cancels the shovel. Tapping an empty cell keeps the shovel armed. Restart needs two presses inside 2 seconds. Switching or landing resets the gravity timer. Game over saves a new best score and not a lower one. Full game over with a fake storage. |
| (existing) `theme.ts` | `cellCenter`, `cellAtPoint`, layout numbers. | `cellAtPoint(cellCenter(r, c))` returns `(r, c)` for every cell. A point in a gap or outside the board returns null. Every button row is at least 44 px tall and wide. The layout fits inside 640 px with no overlap. |
| `storage` | `load` and `save`. | Missing key gives defaults. Corrupted JSON gives defaults. Older saves missing a field get defaults for it. `load` returns a fresh object each call. (Needs `vi.stubGlobal('localStorage', ...)`; can be written before M2 since `storage` does not depend on Phaser.) |
| `dictionary.ts` | `buildDictionary`. | Covered in M0 by `wordlists.test.ts` (empty text, HTML text, real list). |

### 5.6 Architecture guard tests (done in M0)

`src/architecture.test.ts` turns the rules file into tests, so Cursor or a future you cannot quietly break them. It checks that core imports no Phaser or browser APIs and uses no `Math.random`, `Date.now` or `new Date`; that hex colours appear only in `src/ui/theme.ts`; that only `src/storage` touches `localStorage`; and that no file uses `any`. It was proven not to be vacuous by adding a deliberate violation and watching it fail. Still open: a check that `src/game` and `src/ui` do not define their own letter values or scoring (hard to test exactly).

### 5.7 What stays manual

Look, feel, sound quality, touch comfort on the S23, performance on the phone, and balance. See the playtest checklist in section 8.3. If you later want a basic automated browser check (page loads, canvas appears), Playwright would do it, but that is a new dependency and I would ask first.

---

## 6. Roadmap in milestones

Each milestone ends with something you can run and check. "Code" is work I do in Cursor sessions. "You" is manual work that needs your accounts, your phone or your decision.

### M0: Housekeeping (small, do first)

**Goal:** the repo matches its own rules and the next steps have a safe base.

**Status: code done (25 November 2026). Waiting on your first push to prove CI is green.**

- **Code (all done)**
  - [x] `"strict": true` in `tsconfig.json`.
  - [x] Plan moved to `docs/GDD.md`.
  - [x] `README.md` and `CREDITS.md` written.
  - [x] Placeholder favicon.
  - [x] `.github/workflows/ci.yml`: on every push to `main` and every pull request, run `npm ci`, `npm test`, `npm run build`.
  - [x] `base: './'` in `vite.config.ts` (checked: `dist/index.html` uses `./assets/...`).
  - [x] Audio unlock events for iOS (`touchend`, `click`).
  - [x] `MIN_WORD_LENGTH` is 3, test first.
  - [x] Core tests: `board`, `pieces`, `config`, `replay`, `invariants`, plus the architecture guard tests and the word list test.
- **You**
  - [x] GDD location, minimum word length: decided.
  - [ ] Commit and push, and check the **Actions** tab on GitHub shows a green run (see "Continuous integration" in `README.md`).
  - [x] Unused word lists moved to `data/wordlists/`.
- **Done when:** `npm test` and `npm run build` pass in CI on GitHub, and the rules file and the code agree. Locally both pass.

### M1: Real words (the game becomes playable)

**Goal:** closed words actually score, so you can judge the core game.

- **You**
  1. [x] ENABLE downloaded and placed at `public/words/enable.txt` (checked identical to upstream; licence in `CREDITS.md`).
  2. [x] Slang and offensive words: no blocklist for now (single-player). Moved to the end of the roadmap (after M8).
  3. [x] Unused lists moved out of `public/` to `data/wordlists/`.
  4. [ ] Play ten games on the laptop and note what feels wrong.
- **Code**
  - Optional build step or script that filters the file to 3 to 8 letters, so the phone downloads less (about 1.7 MB today). I would only add a Node script, with no new dependency.
  - The word list tests and the credits file are already done (M0). The speed test is still open (section 5.3).
  - Show a visible message in the game (not only the console) if the word list fails to load.
  - Investigate the unexplained instant Game Over from section 4.3.
- **Done when:** words turn yellow, then green when closed, the score changes, and the wordlist tests pass.

### M2: Make the screen testable

**Goal:** the logic in `Play.ts` can be tested in Vitest (section 5.5).

- **Code**
  - Extract `events.ts`, `controls.ts` and `session.ts` into `src/game/logic/`.
  - Make `Play.ts`, `Buttons.ts` and `HUD.ts` thin: they ask the session what to do and draw it.
  - Write all the tests from section 5.5, including the `theme.ts` layout tests and storage tests.
  - Add a reproduction test for the instant Game Over bug, if it turns out to be real.
- **You:** review the pause, shovel and restart behaviours listed in section 2.3 and tell me if any should change before they are locked in by tests.
- **Done when:** no behaviour changed, `npm test` covers pause, shovel, restart, gravity and game over, and the Phaser files contain no decisions.

### M3: Phone playtest and feel (GDD Week 2 to 3)

**Goal:** it feels good on the S23, and the open design questions get real answers.

- **You**
  - Run `npm run dev -- --host`, allow Node through the Windows firewall (private networks), open `http://<your IPv4>:5173` on the phone. Follow the checklist in section 8.3.
  - If the network blocks it, use a free tunnel tool, or deploy early (M6) and use that link.
  - Test with two or three friends and write down answers to the GDD section 6 questions: minimum word length, filler cost, shovel rules, pacing, vertical words closing, premium squares.
- **Code** (driven by what you find)
  - Sharpness on high-density screens (render the canvas at 2x or 3x).
  - Use of the extra height on tall phones.
  - Touch comfort: button sizes, hold-to-repeat timings, accidental restart.
  - Tuning: `fallIntervalMs`, starting charges, peek and freeze lengths, filler and shovel costs (all in `config.ts`, with test updates).
  - Optional: tap-a-column or swipe controls (GDD section 12).
  - Performance check on the phone.
- **Done when:** you are happy playing a full game on the phone and the tuning values are agreed.

### M4: Menu, Daily board and streak (GDD Week 3)

**Goal:** the MVP's two modes and the retention hook.

- **Code**
  - Build `Menu.ts`: title, Classic, Daily, best score, streak, settings icon. Wire it between Boot and Play.
  - Mode parameter for `createGame(seed, mode)` in core (tests first). Daily uses `dailySeed(date)` with the date passed in by the view, so core stays free of clocks.
  - Daily rules: one result per day, same board for everyone, "already played today" state, share text.
  - Streak logic in `src/storage` (consecutive days played, resets after a missed day), with tests for month and year boundaries and time zones.
  - Pass the mode and seed through scenes; Game Over shows the daily result.
- **You**
  - Decide whether a Daily game can be replayed for practice and whether the streak counts on playing or on finishing.
  - Decide what time zone defines "today" (the player's local date is the simplest).
- **Done when:** Daily gives the same pieces and premium squares on two different devices on the same date, and the streak survives a page reload.

### M5: Polish and onboarding (GDD Week 3)

**Goal:** it looks and sounds finished.

- **Code**
  - Tutorial on first run (a short guided scripted game using a fixed seed, driven by the session so it is testable).
  - Settings: mute (saved), maybe reduced motion.
  - Light theme: a second palette in `theme.ts` and a switch, saved in storage (derive it from the same identity; see GDD section 10).
  - Remaining feel items from the GDD: multiplier flash, bigger celebration for long words, tile point values in the corner (GDD section 10 asks for these), and a game-over sting check.
  - Accessibility pass: contrast of the green and yellow states (they are also shown by color only, so consider a second cue such as a border or marker).
- **You**
  - Choose the final palette identity if not Night Grid (the GDD lists this as undecided), and approve the light variant.
  - Optional: commission a logo, app icon and screenshot template (the GDD suggests this is the best use of money).
  - Optional: a sound pack, if the synthesized sounds are not good enough.
- **Done when:** a stranger can start playing without being told the rules.

### M6: Web release (GDD Week 3 to 4)

**Goal:** a public link, installable from the browser.

- **Code**
  - Web app manifest, icons, and a small service worker so the game works offline and can be added to the home screen. A plugin like `vite-plugin-pwa` would be a new dependency, so I would ask first; a hand-written manifest and worker need none.
  - Self-host the Chakra Petch fonts under `public/fonts` and remove the Google link.
  - Page title, description and social preview image.
  - Optional: code-split the Phaser bundle if load time is a problem.
- **You**
  - Pick a host (Cloudflare Pages, Netlify, Vercel or GitHub Pages), connect the repo, build command `npm run build`, output folder `dist`. Every push then updates the link.
  - Create the itch.io page: upload the `dist` folder as a zip (HTML5 game), add screenshots, tags and a devlog.
  - Name, trademark and app store search before you commit publicly (GDD section 11).
  - Prepare short clips and the Reddit posts (GDD section 14), and one specific question to ask players.
- **Done when:** a friend can open the link on an iPhone, add it to their home screen, and play offline.

### M7: Android (start the Play clock early)

**Goal:** a debug APK on your S23, then Play internal testing, then the closed test.

- **Code**
  - Add Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`), `capacitor.config.ts`, then `npx cap add android`. These are new dependencies, so I will ask first.
  - `.github/workflows/android-debug.yml` to build the APK in the cloud (GDD section 19), checking current action and Java versions.
  - Check audio, haptics and the saved data in the WebView.
- **You**
  - Create the Play Console developer account (one-time fee, currently $25) and start the **closed test as early as possible**: a new personal account needs at least 12 testers opted in for 14 continuous days before applying for production, so recruit 20 or more.
  - Write the privacy policy, fill the Data safety form and content rating, prepare the store listing (icon, screenshots, short and full descriptions).
  - Install the debug APK on the S23 (allow installs from your browser or file manager; check Google's current developer verification page).
- **Done when:** the app runs on the S23 from an APK, and the closed test is running with enough testers.

### M8: After the MVP (not scheduled)

- **Leaderboards:** start with the Daily board. Needs a small backend (Supabase or Firebase).
- **Different board sizes** can select from the menu.
- **Score verification:** the player submits the seed and the action list, and a server function replays it through `step`. The replay tests from section 5.3 are the foundation for this.
- **Async duel**, then only if people keep playing: live race and attack mode.
- **iPhone app:** Capacitor, Apple Developer Program, a macOS build (cloud service if you have no Mac).
- **Monetisation:** decide ads, remove-ads purchase or cosmetics only after you see how people play.
- **Limited pool mode** and other modes from the GDD.
- **Slang and offensive-word blocklist** (decided: not now, since the game is single-player). A blocklist file plus loader, with a test, if you later want it, for example before leaderboards or sharing.

### Suggested order and rough size

M0 and M1 are one or two sessions each. M2 is one or two sessions. M3 depends on your playtesting time. M4 and M5 are the largest code milestones. M6 is mostly your setup work. M7 depends on the Play Console timeline, so **start recruiting testers during M5 or M6**, not after.

---

## 7. Decisions needed from you

| # | Question | Needed by |
| --- | --- | --- |
| 1 | ~~Minimum word length~~ **Decided: 3.** | done |
| 2 | ~~Where the GDD lives~~ **Decided: `docs/GDD.md`.** | done |
| 3 | ~~Word lists~~ **Decided:** no blocklist for now (single-player; revisit after M8). Unused lists moved to `data/wordlists/`. | done |
| 12 | Project licence for your own code (MIT, all rights reserved, other)? Not needed to play, but needed before the repository is made public. | before M6 |
| 4 | Should the board stay visible while paused (current), or be hidden to prevent planning during a pause? | M2 |
| 5 | Shovel: allow it below 5 points (current), or lock it until you have enough? Should tiles above fall (current) or leave a gap? | M3 |
| 6 | Is Night Grid the final palette? Do you want a light variant derived from it? | M5 |
| 7 | Daily rules: practice replays, streak counted on play or finish, and which date defines "today"? | M4 |
| 8 | Which host: Cloudflare Pages, Netlify, Vercel or GitHub Pages? | M6 |
| 9 | Game name: has a trademark and store search been done? | before M6 |
| 10 | App identifier for Android (for example `com.yourname.worddrop`) and developer account name. | M7 |
| 11 | Approval to add dependencies when needed: Capacitor (M7). Optional: `vite-plugin-pwa` (M6), ESLint and Prettier (any time), Playwright (browser test). | as needed |

---

## 8. Appendix

### 8.1 File map

```
word-drop/
  .cursor/rules/word-drop.mdc        project rules (done)
  .github/workflows/ci.yml           tests + build on push (done; Android workflow in M7)
  docs/
    GDD.md                           the full design and build plan (done)
    PROJECT_STATUS_AND_ROADMAP.md    this file
  public/
    favicon.svg                      placeholder (real icon in M6)
    words/enable.txt                 the dictionary the game loads (done)
  data/wordlists/                    eowl.txt, freq-word.txt: spare lists, NOT shipped (done)
    sounds/, fonts/                  not needed yet / M6
  src/
    architecture.test.ts             the rules file as tests (done)
    core/                            rules, 7 modules + 9 test files (done)
    game/
      main.ts, dictionary.ts         done (wordlists.test.ts checks the real files)
      scenes/ Boot, Play, GameOver   done;  Menu = empty placeholder
      views/  BoardView, TileView, Buttons, HUD, text   done
      logic/                         (new in M2: events, controls, session)
    ui/
      theme.ts                       done
      NightGrid.dc.html              design reference (not loaded by the game)
    audio/index.ts                   done (synthesized)
    storage/index.ts                 done (best score only)
    main.ts                          done
  index.html                         done (loads Google Font; self-host in M6)
  vite.config.ts                     base './' (done)
  tsconfig.json                      strict on (done)
  package.json
  README.md, CREDITS.md              done (CREDITS finished for word lists; fonts in M6)
```

### 8.2 Commands

| Command | What it does |
| --- | --- |
| `npm run dev -- --host` | Dev server reachable from your phone (port 5173, or the next free one). |
| `npm test` | Run all unit tests once. |
| `npm run build` | Type-check and make the production build in `dist`. |
| `npm run preview` | Serve the production build locally. |

### 8.3 Phone playtest checklist (S23)

1. Does the page fill the screen without scrolling, zooming or pull-to-refresh?
2. Is the text and are the tiles sharp? Are the empty bands above and below acceptable?
3. Can your thumb hit Left, Down and Right reliably? Does holding repeat at a comfortable speed?
4. Do two fingers work (hold Right, tap Filler)?
5. Is any button too small or too close to another? Did you ever restart by accident?
6. Do sounds play after the first touch? Is the landing sound pleasant after 50 repeats? Is the chime clear?
7. Is the piece speed fair at the start, after 20 pieces and after 50?
8. Do green and yellow read clearly outdoors and in a dark room?
9. Does the shovel flow (arm, tap, remove) make sense without explanation?
10. Does anything lag, stutter or heat the phone?
11. Does pause, rotate the phone, switch apps and come back leave the game in a good state?
12. Write down the first thing a new player asks you.

### 8.4 Dependencies in use

`phaser` 4.2.1 (runtime). `typescript`, `vite`, `vitest` (development). Nothing else. Any addition needs your approval (rules file).
