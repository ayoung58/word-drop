# Word Drop core

The game rules as pure TypeScript. No Phaser, no DOM, no browser storage, no Math.random, no Date.now.
Unzip at the repo root so the files land in `src/core/`. Tests use Vitest (`npm test`).

## Use

```ts
import { createGame, step, evaluate, createDictionary, parseWordList, buttonPreview, dailySeed, fallIntervalMs } from './core';

const dict = createDictionary(parseWordList(wordListText)); // ENABLE, loaded by the view
let state = createGame(dailySeed('2026-11-24'));            // or any number for a Classic game

state = step(state, { type: 'moveLeft' });                  // every change goes through step()
state = step(state, { type: 'tick' });                      // the view sends one every fallIntervalMs(state.placed)

const { words, score } = evaluate(state, dict);             // words: closed (scored) and open (valid, not closed yet)
const buttons = buttonPreview(state);                       // letters for the Vowel and Consonant buttons
```

`step` never changes the state you pass in. Invalid actions (switching back, no charges, shoveling an empty cell) return an unchanged copy.

## Actions

`moveLeft`, `moveRight`, `drop` (soft drop), `tick` (gravity), `switch` (to `vowel`, `consonant` or `filler`), `wildcard`, `peek`, `freeze`, `shovel` (with `row` and `col`).

## Rules in code

- `config.ts`: board size, `MIN_WORD_LENGTH`, costs, letter values, letter bags, powerup counts.
- `pieces.ts`: one-way switching, letters returned to their queue, button previews.
- `scoring.ts`: whole-run words, closed by edge or filler, across and down, premium multipliers, wildcards.
- `game.ts`: spawning, falling, locking, powerups, game over.

## Differences from the HTML prototype

- Freeze lasts `FREEZE_TICKS` gravity ticks instead of 6 seconds, so the core stays deterministic. The view just keeps sending ticks.
- Pause, and the pause while the shovel is armed, are view jobs: stop sending ticks.
- Premium squares come from the seed, so a daily board is the same for everyone.
- The word list is passed in. The prototype's small list and suffix shortcut are gone; use a real list (ENABLE).
- Wildcard words are matched by pattern against the dictionary.

## Not included yet

Rendering, input, sound, saved scores, the limited-pool mode, leaderboards and versus. To verify scores on a server later, store `seed` plus the list of actions and replay them through `step`.
