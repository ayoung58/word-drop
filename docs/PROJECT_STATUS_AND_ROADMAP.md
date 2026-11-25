# Word Drop: Project Status and Roadmap

*Written 23 November 2026, after the "prototype V1" commit. This is the engineering status and plan. The game design itself lives in `Word Drop Game Design and Build Plan.md` (the GDD, to be moved to `docs/GDD.md`, see M0). The project rules live in `.cursor/rules/word-drop.mdc`.*

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
| Game rules (`src/core`) | Done and tested (40 tests). Missing: game modes (Daily, Limited pool), a few test files. |
| Playable screen (Phaser) | Done as a first version: board, touch buttons, powerups, pause, shovel, game over, animations, sound. Checked by hand in a desktop browser only, not yet on the S23. |
| Word list | **Not added.** Without `public/words/enable.txt` no word can score, so the core mechanic cannot be played yet. |
| Saved data | Best score is saved. Streak and settings are only a data shape, with no logic. |
| Menu, Daily mode, tutorial, settings | Not started. |
| Web deployment, installable web app | Not started. |
| Android (Capacitor, cloud build, Play) | Not started. |
| Automated tests for the screen code | None, because the logic is tangled with Phaser. Section 5 and milestone M2 fix this. |

**Where you are in the GDD schedule:** the Week 1 items are done except "load a real word list" and "touch controls working on your S23" (built, untested on the phone). Roughly half of Week 2 (board, HUD, powerup buttons, theme, sound, pause, game over) is also built.

**The single most important next step** is the ENABLE word list (M1). Until it is in, nobody has actually played the real game.

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
| `config.ts` | Board size 8x10, `MIN_WORD_LENGTH` (currently 2), costs (filler 1, shovel 5), peek and freeze lengths, starting charges (2 each), letter bags, Scrabble letter values, `fallIntervalMs` (700 ms, faster by 8 ms per piece, never below 250 ms). |
| `types.ts` | `GameState`, `Piece`, `Cell`, `Action`, `WordHit`, `Evaluation`. State is plain data (cloneable, savable, replayable). |
| `rng.ts` | Seeded random generator, `hashSeed`, `dailySeed(date)`. |
| `words.ts` | `createDictionary` (case-insensitive, length filter, `?` wildcard lookup), `parseWordList`. |
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

Six synthesized effects: land (soft thunk), score (rising chime, one note more for longer words), shovel, switch, powerup, game over. No files and no licences. Audio is skipped until the first touch or key press (browsers require this). There is no mute setting yet.

### 2.5 Storage (`src/storage`)

`load()` and `save()` for `{ bestScore, streak, lastPlayedDate }` in localStorage. Only `bestScore` is used so far.

### 2.6 Tests

40 tests, all passing, in four files: `words.test.ts` (4), `scoring.test.ts` (10), `rng.test.ts` (5), `game.test.ts` (21). Everything tested is in `src/core`. Run with `npm test`.

### 2.7 Project setup

Vite, TypeScript, Phaser 4, Vitest installed. `.cursor/rules/word-drop.mdc` in place. Git remote is `github.com/ayoung58/word-drop`. Scripts: `dev`, `build` (`tsc` then `vite build`), `preview`, `test`.

---

## 3. MVP checklist against the GDD

The GDD's MVP scope is: Classic and Daily board; the four powerups; light and dark themes; sound; first-run tutorial; local best score and streak; no accounts, no ads.

| MVP item | Status | Milestone |
| --- | --- | --- |
| Classic mode | Done (needs the word list to be meaningful) | M1 |
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
| `public/words/enable.txt` | High | Missing. Manual step for you (see M1). The empty folder `public/words` exists but git does not track empty folders. |
| `docs/GDD.md` | Medium | Currently a 5-line stub. The rules file points to it. Proposal: move the root `Word Drop Game Design and Build Plan.md` there (`git mv`) so there is one source of truth. |
| Project `README.md` | Medium | None exists. Needs: what the game is, the four commands, how to test on a phone, link to the GDD and this file. |
| Favicon and app icons | Medium | `index.html` links `/favicon.svg`, which does not exist (404 in the console). Real icons come in M6 and M7. |
| `src/game/scenes/Menu.ts` | Medium | Empty placeholder. Built in M4. |
| `.github/workflows/` | Medium | None yet. A test-and-build workflow is proposed in M0, the Android one in M7. |
| `public/sounds/`, `public/fonts/` | Low | Not needed yet (sound is synthesized). Fonts need self-hosting in M6. |
| `capacitor.config.ts` | Later | M7. |
| Credits file (fonts, word list, any assets) | Medium | The GDD asks for one. Create it when ENABLE is added. |

### 4.2 Rule conflicts and decisions already made but not applied

| Item | Priority | Detail |
| --- | --- | --- |
| `MIN_WORD_LENGTH` is 2, but the GDD's "decisions" section says **3 letters** | High | Core rule, so I did not change it without asking. Change plan: update the scoring tests first (they assume 2), then the constant. See section 7. |
| `tsconfig.json` has no `"strict": true`, but the rules file says TypeScript strict | High | Checked: `tsc --strict` already passes with zero errors, so enabling it is a one-line change with no fallout. |

### 4.3 Bugs and risks found

| Item | Priority | Detail |
| --- | --- | --- |
| Unexplained instant Game Over in one browser test | High | In a scripted test (reload, then send key events for wildcard, left, drop) the game ended with score 0 almost immediately. I could not reproduce or explain it before the dev server was stopped. It may be an artifact of sending synthetic events during scene start, but it must be ruled out. Plan: reproduce with a controller test (M2), then on the phone (M3). |
| Audio may stay silent on iPhone | Medium | The audio unlock listens to `pointerdown` and `keydown`. iOS Safari generally needs `touchend` or `click`. Add those events. Cannot be tested without an iPhone, so make the change and verify later. |
| Blurry rendering on high-density phone screens | Medium | The canvas is 360x640 and scaled up by CSS, so shapes may look soft on the S23 (text is already rendered at screen density). Needs a look on the phone, then probably rendering the canvas at 2x or 3x. |
| Empty bars on tall phones | Medium | The S23 screen is taller than 16:9, and "scale to fit" leaves empty bands above and below the game. Options: leave it, or make the canvas height adapt and spread the layout. |
| Word list size and speed | Medium | ENABLE is about 170,000 words. Loading and parsing on a phone should be fast, but measure it. Consider pre-filtering the file to 2 to 8 letters. Also, wildcard lookups scan every word of that length on each step. Likely fine, but add a performance test (section 5) and an index if it is slow. |
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

### 5.2 What exists (40 tests)

Covered: dictionary basics and wildcard lookup, closed and open words, vertical words, MAYBE versus MAYBEJ, premium multiplication, wildcard worth zero, filler and shovel costs, rng determinism, daily seeds, creating a game, moving, falling, landing, one-way switching, wildcard refund, peek, freeze, shovel, previews, game over, immutability of `step`.

### 5.3 Core test backlog

| Test file | Tests to write |
| --- | --- |
| `board.test.ts` (new, the plan wants one per module) | Grid is 8x10 and empty. Premium squares: exactly five x2 and three x3, all on distinct cells, same seed gives same layout. `collapseColumn` keeps order and leaves no gaps. `spawnColumn` prefers the centre, skips blocked cells, returns null when the top row is full. `nearestFreeColumn` picks the closer side. `countFillers`. `inBounds` at all four edges. |
| `pieces.test.ts` (new) | Queues refill to `QUEUE_LENGTH`. Switching away returns the letter to the front of its queue (no letters burned). `buttonPreview` for a vowel piece, a consonant piece, a filler piece, a wildcard piece and no piece. |
| `config.test.ts` (new) | `fallIntervalMs` never increases as pieces are placed and never goes below 250. Letter values exist for every A to Z and `?` is 0. Both letter bags contain only letters of the right kind and every letter of each kind can appear. Premium counts fit the board. |
| `scoring.test.ts` (add) | One letter shared by an across word and a down word scores in both. Two words in one row separated by a filler both score. A wildcard in a vertical word. x2 and x3 together give x6. A word broken by a later piece stops scoring (score goes down). Open words are listed with 0 points. Run of 9 or 10 letters is never a word. Behaviour with `MIN_WORD_LENGTH` = 3 (use `vi.mock` on the config) so the switch is safe. |
| `game.test.ts` (add) | A new piece spawns at the nearest free column when the centre is blocked. Shovel under the falling piece moves the piece to a free column. Using the shovel on a filler removes it and costs 5. Freeze followed by a landing. Wildcard used twice refunds correctly. Invalid actions return an unchanged state for every action type. Actions after game over return the same object. |
| `replay.test.ts` (new) | Same seed plus same action list always gives an identical final state (this is what future score verification relies on). A stored "golden" game: seed, action list, expected final score and board. Replaying from a JSON-saved state works. |
| `invariants.test.ts` (new) | Random games: for many seeds, apply a few hundred random actions with core's rng. Check after every step: nothing throws, no tile floats above an empty cell, number of tiles equals pieces placed minus shovel uses, charges never go negative, score is a finite number, piece is never inside an occupied cell. |
| `rng.test.ts` (add) | `pickChar` frequencies roughly follow the bag. Seeds 0, negative and very large work. Generator state is plain JSON. |
| `words.test.ts` (add) | CRLF and blank lines in a word list. `minLength` and `maxLength` options. More than one `?` in a pattern. A speed test with about 170,000 synthetic words (wildcard lookup should stay well under a few milliseconds). |

### 5.4 Word list test (after M1)

`wordlist.test.ts`: if `public/words/enable.txt` exists, load it with `?raw` and check: it has between 100,000 and 200,000 lines, only letters, contains known words (CAT, QUIZ, MAYBE), does not contain the blocklist words (if you choose a blocklist), and after filtering to 2 to 8 letters has the expected count. Skip when the file is absent so a fresh clone still passes.

### 5.5 Screen-logic tests (need the M2 refactor first)

Extract these from `Play.ts`, `Buttons.ts` and `theme.ts` into `src/game/logic/` (no Phaser imports):

| New module | What it holds | Tests |
| --- | --- | --- |
| `events.ts` | `describeChange(before, after, action, previousWords)` returns a list of events: landed (with cell), word scored (with cells and length), shoveled, switched, powerup used. | A landing event only when `placed` goes up. A word event only for a newly closed word, not for one that was already closed. Longest word picks the chime length. Shovel and switch events. No events for an invalid action. |
| `controls.ts` | `controlStates(state, shovelArmed)` returns the label, selected and disabled state for each of the ten buttons. | Left-behind type is disabled. Wildcard disabled with no charges or on a filler. Peek and Freeze show as active. Peek shows the extra letter. Shovel shows as selected when armed. No piece disables everything. |
| `session.ts` | A `PlaySession` class holding the state, evaluation, `paused`, `shovelArmed`, `restartArmed`, `ending` and the gravity timer. Methods: `act`, `frame(deltaMs)`, `togglePause`, `toggleShovel`, `tapCell`, `restart`. Takes the dictionary, a storage object and a seed as inputs. | Gravity ticks at the right interval and speeds up. Paused and shovel-armed games send no ticks. Any button resumes and also performs its action. Pause pressed while shovel armed only cancels the shovel. Tapping an empty cell keeps the shovel armed. Restart needs two presses inside 2 seconds. Switching or landing resets the gravity timer. Game over saves a new best score and not a lower one. Full game over with a fake storage. |
| (existing) `theme.ts` | `cellCenter`, `cellAtPoint`, layout numbers. | `cellAtPoint(cellCenter(r, c))` returns `(r, c)` for every cell. A point in a gap or outside the board returns null. Every button row is at least 44 px tall and wide. The layout fits inside 640 px with no overlap. |
| `storage` | `load` and `save`. | Missing key gives defaults. Corrupted JSON gives defaults. Older saves missing a field get defaults for it. `load` returns a fresh object each call. |
| `dictionary.ts` | `buildDictionary`. | Empty text gives an empty dictionary. HTML text (what a dev server returns for a missing file) gives an empty dictionary. Real lines are kept. |

### 5.6 Architecture guard tests

These turn the rules file into tests, so Cursor or a future you cannot quietly break them. Use `import.meta.glob(..., { query: '?raw' })`.

- Nothing in `src/core` imports `phaser` or mentions `window`, `document`, `localStorage`, `Math.random` or `Date.now`.
- No hex color (`#rrggbb` or `0xrrggbb`) appears outside `src/ui/theme.ts` (the `NightGrid.dc.html` file is a design reference and is excluded).
- `src/game` and `src/ui` import no scoring or word logic beyond calling core functions (hard to test exactly; a simple check that they do not define their own letter values is enough).
- Only `src/storage` touches `localStorage`.
- No file uses `any`.

### 5.7 What stays manual

Look, feel, sound quality, touch comfort on the S23, performance on the phone, and balance. See the playtest checklist in section 8.3. If you later want a basic automated browser check (page loads, canvas appears), Playwright would do it, but that is a new dependency and I would ask first.

---

## 6. Roadmap in milestones

Each milestone ends with something you can run and check. "Code" is work I do in Cursor sessions. "You" is manual work that needs your accounts, your phone or your decision.

### M0: Housekeeping (small, do first)

**Goal:** the repo matches its own rules and the next steps have a safe base.

- **Code**
  - Add `"strict": true` to `tsconfig.json` (already verified to compile).
  - Move the plan to `docs/GDD.md`, or copy it, and fix the link at the top of this file.
  - Write the project `README.md`.
  - Add a placeholder favicon so the console is clean.
  - Add `.github/workflows/ci.yml`: on every push, run `npm ci`, `npm test`, `npm run build`.
  - Set `base: './'` in `vite.config.ts` so the build works from any folder (needed for itch.io and Capacitor later).
  - Add the audio unlock events for iOS (`touchend`, `click`).
  - Write the missing core test files that do not depend on decisions: `board.test.ts`, `pieces.test.ts`, `config.test.ts`, `replay.test.ts`, `invariants.test.ts`, and the architecture guard tests.
- **You**
  - Decide where the GDD lives (section 7).
  - Decide on minimum word length (section 7). If 3, I do it test-first here.
  - Make sure GitHub Actions is enabled on the repo.
- **Done when:** `npm test` and `npm run build` pass in CI on GitHub, and the rules file and the code agree.

### M1: Real words (the game becomes playable)

**Goal:** closed words actually score, so you can judge the core game.

- **You**
  1. Download the ENABLE word list from a trusted source and read its licence note (ENABLE is widely described as public domain, but check what the copy you download says).
  2. Put it at `public/words/enable.txt`.
  3. Decide the slang and offensive-word policy (section 7).
  4. Play ten games on the laptop and note what feels wrong.
- **Code**
  - Optional build step or script that filters the file to 2 to 8 letters, so the phone downloads less. I would only add a Node script, with no new dependency.
  - A blocklist file and loader, if you want one.
  - `wordlist.test.ts` (section 5.4) and the speed test.
  - A credits file listing ENABLE and Chakra Petch.
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
- **Score verification:** the player submits the seed and the action list, and a server function replays it through `step`. The replay tests from section 5.3 are the foundation for this.
- **Async duel**, then only if people keep playing: live race and attack mode.
- **iPhone app:** Capacitor, Apple Developer Program, a macOS build (cloud service if you have no Mac).
- **Monetisation:** decide ads, remove-ads purchase or cosmetics only after you see how people play.
- **Limited pool mode** and other modes from the GDD.

### Suggested order and rough size

M0 and M1 are one or two sessions each. M2 is one or two sessions. M3 depends on your playtesting time. M4 and M5 are the largest code milestones. M6 is mostly your setup work. M7 depends on the Play Console timeline, so **start recruiting testers during M5 or M6**, not after.

---

## 7. Decisions needed from you

| # | Question | Needed by |
| --- | --- | --- |
| 1 | **Minimum word length:** 2 (code today) or 3 (GDD decision note)? | M0 |
| 2 | Where does the GDD live: move the root file to `docs/GDD.md`? | M0 |
| 3 | Word list: will you download ENABLE, or should I fetch it? Slang and offensive-word policy, and do you want a blocklist? | M1 |
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
  .github/workflows/                 (missing; ci.yml in M0, Android in M7)
  docs/
    GDD.md                           stub, to be populated (M0)
    PROJECT_STATUS_AND_ROADMAP.md    this file
  public/
    words/enable.txt                 MISSING (M1)
    sounds/, fonts/                  not needed yet / M6
  src/
    core/                            rules, 7 modules + 4 test files (done)
    game/
      main.ts, dictionary.ts         done
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
  vite.config.ts                     empty config (base './' in M0)
  tsconfig.json                      add strict (M0)
  package.json
  Word Drop Game Design and Build Plan.md   the GDD (move to docs/, M0)
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
