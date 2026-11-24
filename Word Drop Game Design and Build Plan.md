# Word Drop: Game Design and Build Plan

*Working title. Updated November 2026. Written for a solo developer building with Cursor, targeting Android.*

## 1. Pitch

Word Drop is a falling-letter puzzle where you build a crossword as you play. Each piece is a vowel, a consonant or a black filler block. You place them on a small grid, and every word that is closed off by a wall or a filler block scores, across and down. The score updates live and drops if you break a word.

## 2. Design pillars

- **Planning over reflexes.** Filler blocks let you build structure, so the best players think in layouts, not just letters.
- **Every choice costs something.** Fillers cost points, the shovel costs points, and switching piece type is one-way.
- **Live feedback.** Valid words light up as you build them, so you always know where you stand.
- **Short sessions.** A small board means a round lasts a few minutes, which suits mobile.

## 3. Core rules

- **Grid:** 8 columns by 10 rows. One piece falls at a time. Move it left or right, or drop it faster.
- **Piece type:** each new piece starts as the last letter type you used (vowel or consonant). You can switch type, but once you leave a type you cannot return to it for that piece. Switching restarts the drop from the top. After a piece lands, all types are available again for the next one.
- **Fillers:** black blocks that act as walls, like the black squares in a crossword. Each costs 1 point.
- **Words:** a word counts only if it is a full run of letters bounded at both ends by the board edge or a filler block. MAYBE followed by a wall counts; MAYBEJ does not.
- **Directions:** words read left to right and top to bottom. Both count.
- **Length:** words need at least 2 letters for now. This is a setting, and 3 may feel better.
- **Scoring:** letters have Scrabble-style values. A premium square (x2 or x3) multiplies the score of any word that covers it, and several premiums in one word multiply together.
- **Feedback:** green means a scored word; yellow means a valid word that is not closed off yet.
- **End of game:** the game ends when no piece can enter the board. The final score is the sum of closed words minus filler and shovel costs.
- **Pause:** a pause button freezes everything, and any other button resumes the game. Arming the shovel also pauses the game.

## 4. Powerups

- **Wildcard:** the piece matches any letter. Switching away from it refunds the charge.
- **Peek:** shows the letter after the next vowel and consonant for a few drops.
- **Freeze:** stops gravity for a few seconds, but you can still move the piece.
- **Shovel:** removes a placed tile for 5 points, and the tiles above it fall.
- **Parked ideas:** bomb and swap, dropped because the shovel covers the need.

## 5. Modes

- **Classic:** play until the board fills.
- **Daily board:** everyone gets the same seeded piece sequence and premium layout. This is the strongest retention feature for the cost, and it needs a seeded random generator from day one.
- **Limited pool:** a fixed bag of letters, like a Scrabble tile bag, so the game becomes a planning puzzle and the remaining spaces fill up.
- **Versus:** see section 9.

## 6. Open design questions

A playable build answers these faster than discussion does.

- Minimum word length: 2 or 3? A 2-letter minimum makes scoring easy and weakens the filler penalty.
- Filler cost and supply: is -1 enough, and should fillers also be limited?
- Shovel: should it be locked until you have enough points, and should tiles above it fall or leave a gap?
- Vertical words need a filler above the stack to close, because stacks grow upward. Is that intuitive, or does the game need a hint?
- Pacing: how fast should gravity ramp up, and does an 80-cell board take too long to fill?
- Powerups: a starting allowance, found on the board, or earned with score?
- Premium squares: random each game, or fixed layouts that enable strategy and a daily puzzle?
- Word strictness: how obscure may a valid word be, and which slang is allowed?

## 7. Product plan

### Platform order

- **Web first.** The game runs in any phone browser, including an iPhone, and players can add it to their home screen. This is the cheapest way to reach everyone during the MVP.
- **Android second.** The same code is wrapped with Capacitor and published on Google Play. With a personal account, Play requires a closed test before production, so plan for it early (section 13).
- **iPhone app third.** Capacitor can produce it from the same code. It needs an Apple Developer Program membership (an annual fee, so check the current price) and a build on macOS, which a cloud build service can provide if you have no Mac.

### MVP scope

Classic mode and the Daily board; the wildcard, peek, freeze and shovel; a minimalist theme with light and dark modes; sound; a short first-run tutorial; a local best score and streak. No accounts, no ads.

### Four-week schedule

- **Week 1:** create the repo and Cursor rules, port the core logic with tests, load a real word list, add the seeded random generator, and get touch controls working on your S23.
- **Week 2:** the Phaser board and HUD, powerup buttons, theme tokens, sound, and pause, game-over and restart screens. Start recruiting testers.
- **Week 3:** animation polish, the tutorial, balancing with friend playtests, the daily seed and local streak, the installable web app, deployment to a free host, and an itch.io page.
- **Week 4:** public launch to strangers (section 14), then fix the top issues from feedback.
- **In parallel:** build a debug Android app in the cloud as soon as the game runs, and start the Play closed test early. Production access comes roughly three weeks after the test begins, so expect the web MVP at about four weeks and Google Play at five to seven.

### After the MVP

Leaderboards, then the async duel, then the iPhone app. Decide on ads or purchases once you see how people play.

## 8. Tech stack

**Decision: TypeScript, Vite, Phaser and Vitest, wrapped as an Android app with Capacitor.**

### Why this fits

- **Phone testing needs almost nothing installed.** On the laptop you need Node.js and Cursor, and you open the game on your phone over Wi-Fi.
- **You are comfortable with TypeScript, and Cursor is strongest in it.**
- **The prototype is already web code,** so its rules can be ported instead of rewritten.
- **An 8 by 10 grid is light.** Performance is not a concern on a current phone.
- **Phaser supplies the game parts** you would otherwise build: a game loop, tweens, particles, input, audio and scenes. Check which major version is current when you start.
- **Capacitor wraps the web game as a real Android app,** and later as an iPhone app, with plugins for native features.

### Trade-offs

- Ads and in-app purchases come through plugins (community AdMob plugins and RevenueCat’s Capacitor SDK exist). Check how current and maintained they are before committing.
- A WebView app can have small audio-latency and haptics quirks. Test on the S23 early.
- Building the Android package locally needs the Android SDK. You avoid installing it by building in the cloud (section 12).

### Alternatives considered

- **Godot 4:** excellent 2D, particles and audio, and one-click deploy to a USB phone. But it needs the Android SDK and a JDK on your laptop, Cursor knows GDScript less well, and the prototype must be rewritten.
- **Flutter with Flame:** great UI and hot reload, but fewer game examples and it needs Android Studio.
- **React Native with Expo:** easy phone testing with Expo Go, but the continuous falling-piece loop is fiddlier than in a game framework.
- **Unity:** powerful but heavy, and overkill for this game.

### Architecture

Keep the rules separate from the drawing. This is the most important decision when working with an AI coding tool, because the rules can then be tested without a screen.

- `src/core/` holds pure TypeScript with no browser or Phaser code: grid state, piece queue, seeded random generator, word matching, scoring, powerups and end-of-game checks. It is deterministic.
- Unit tests cover the cases in section 3: closed versus open words, vertical words, wildcards, multipliers and the shovel.
- `src/game/` holds the Phaser scenes. `src/ui/theme.ts` holds the design tokens, so changing the look is a one-file change.
- Determinism pays off twice: the daily board is reproducible, and a server can later replay a player’s moves to verify a score.

## 9. Leaderboards and multiplayer (after the MVP)

- **Leaderboards** need a small backend. Managed services such as Firebase or Supabase mean you run no server. The daily board is the natural first leaderboard.
- **Anti-cheat:** because the game is deterministic and seeded, a player submits the seed and the list of moves, and a small server function replays them to confirm the score.
- **Versus, from easiest to hardest:**
  1. *Async duel:* both players get the same seeded board at different times, and the higher score wins. It builds directly on the daily board.
  2. *Live race:* the same seed, both playing at once, each seeing the other’s live score. It needs real-time messaging.
  3. *Attack mode:* like Tetris versus, a long or high-scoring word sends filler blocks to the opponent. It is the most fun and the hardest to balance, and the server must be the authority.
- **Recommendation:** build the async duel after the daily board, and only build attack mode if people keep playing.
- Google Play Games has its own Android leaderboards, but a web leaderboard serves Android and iPhone alike.

## 10. Visual direction and feel

The direction is minimal and slick, like Wordle and Tetris. It suits a solo developer because it depends on typography, color, motion and sound rather than illustration. See the style tile with three palettes: [Word Drop style tile](https://claude.ai/artifact/DjpppN6wnjXoGV7YEhwscw).

- **A. Paper and Ink:** a light, Wordle-like look with white tiles on warm paper, black fillers and an orange-red accent. The safest and most familiar.
- **B. Night Grid:** a dark, Tetris-like look with a navy background, a mint scoring glow and a cyan accent. The most arcade-like.
- **C. Warm Print:** cream paper, ink-black fillers, gold scored words and a tomato-red accent, with a serif tile font. The most distinctive, and the one that most easily stands apart from other word games.

Pick one as the main identity, then derive the light or dark variant from it. View the three artboards on your S23 before choosing.

### Rules for avoiding a generic look

- Keep to 3 colors plus neutrals, with one distinctive font for tiles and the logo and one readable font for interface text.
- Use one corner radius everywhere and icons from a single consistent set. Do not use emoji as icons.
- Avoid purple-to-blue gradients, glassy cards and uniform soft shadows.
- Put your effort into the tile, because it appears hundreds of times: a visible edge, a point value in the corner, a clear difference between letter, filler and wildcard, and a distinct premium-square look.

### Motion and sound

- Tiles squash slightly when they land. Scored words pulse and tally up. Multipliers flash. A long word earns a bigger celebration. Phaser tweens and particles cover this.
- Sound matters as much as graphics: a soft thunk on landing, a rising chime for a scored word, a distinct sound for the shovel, and an end-of-game sting. Design one signature moment for a closed word.

### Assets and paying for help

- Kenney.nl offers many free CC0 game assets. Itch.io and OpenGameArt have packs with varying licenses. Google Fonts has many open-licensed display fonts. Check each license before commercial use and keep a credits file.
- Almost everything in a minimal look can be built in code. The best use of money is a logo, an app icon and a store-screenshot template from a freelance designer, plus possibly a sound pack. Ask for quotes first.
- AI image tools are fine for mood boards. Use real, licensed art for the final assets.

## 11. Word list and legal

- Start with **ENABLE**, a free word list of roughly 170,000 words that is widely used in games. The official Scrabble lists (TWL and Collins) are licensed, so do not bundle them without permission.
- Decide on a slang and offensive-word policy, and consider a blocklist.
- Load the list as a Set for fast lookup, keeping only words that fit the board (about 2 to 8 letters).
- Replace the prototype’s small word list and suffix shortcut with the real list.
- Pick a name that does not echo Tetris or Scrabble, and run a trademark and app store search before committing. Consult a lawyer if you plan to monetize. This is not legal advice.

## 12. Testing on your phone (Windows laptop, Samsung S23)

Work through these stages. Each adds a little more software, so stop at the earliest one that answers your question.

- **Stage 1: daily development.** Run the dev server with the host option, find your laptop’s IPv4 address with `ipconfig`, and open `http://<that address>:5173` in Chrome on the S23 while on the same Wi-Fi. Allow Node.js through the Windows firewall on private networks when prompted. If your network blocks device-to-device traffic, use a free tunnel tool or go to Stage 2.
- **Stage 2: share a link.** Deploy every push to a free static host (Netlify, Vercel, Cloudflare Pages or GitHub Pages). You get an HTTPS link for your phone and for friends.
- **Stage 3: a real Android build.** A GitHub Actions workflow builds the debug APK in the cloud, so you do not need Android Studio. Download the APK to the S23 and install it, which needs the install-unknown-apps permission for your browser or file manager.
- **Stage 4: Play testing.** Upload to the Play Console’s internal testing track (up to 100 testers, no review) and install through a Play Store link.
- **Debugging on the phone:** turn on Developer options and USB debugging on the S23, connect it by USB, and open `chrome://inspect` in Chrome on the laptop to see the phone’s console.

**Sideloading rules.** Google is rolling out developer verification for apps installed on certified Android devices. Enforcement starts in September 2026 in Brazil, Indonesia, Singapore and Thailand, with a global rollout planned from 2027. Google says sideloading stays possible and that free limited-distribution accounts (up to 20 devices) will exist for students and hobbyists. This should not block testing on your own phone, but check the current Android developer verification page when you reach Stage 3.

For touch, plan thumb controls from the start: big left, right and drop buttons, plus optional swipe or tap-a-column controls. Test the 8-column layout on a small screen early.

## 13. Publishing on Google Play

- A Play Console developer account has a one-time registration fee (currently $25).
- **Testing rule for new personal accounts.** A personal account created after November 13, 2023 must run a closed test with at least 12 testers opted in continuously for the preceding 14 days before applying for production access. If testers drop out, the clock resets, so recruit more than 12 (20 or more is safer) and ask them to open the app regularly. Google then reviews your production application and your answers about the test. Plan roughly three weeks for a first launch.
- Organization accounts are exempt, but they need a D-U-N-S number, which can take a while to obtain.
- Internal testing (up to 100 testers) needs no review and does not count toward the closed-testing requirement, so use it for your own iteration.
- Prepare a privacy policy, the Data safety form, the content rating questionnaire, the store listing (icon, screenshots, short and full descriptions) and an app bundle (AAB). Play also requires a recent target API level; Capacitor templates generally track it, but verify at submission.
- If you use ads, add a consent flow where required (for example, the EU) and follow the ad network’s current policies.

## 14. Promoting the MVP to strangers

- **itch.io:** upload the game as an HTML5 game that people play in the browser. Add screenshots, tags and a devlog. Treat it as your landing page: itch developers commonly report that most outside visitors arrive from Reddit rather than from itch itself. Game jams on itch bring built-in players and feedback.
- **Reddit:** r/WebGames, r/playmygame, r/playtesters, r/destroymygame, r/WebMobileGames, r/IndieDev and r/IndieGaming are the ones developers usually recommend. Large general subs such as r/gaming often remove promotion. Read each sub’s rules, post when you can answer comments, and ask a specific question, for example whether the filler penalty feels fair.
- **Web game portals:** Poki, CrazyGames, GameDistribution and Playgama accept HTML5 games. They have review standards, so try them once the game is stable.
- **Short clips:** 15 to 30 second videos of a satisfying word chain on TikTok, YouTube Shorts and Instagram Reels.
- **People you know:** use friends and classmates as your first 20 players and as Play closed-test testers. Do not buy testers: Google checks that testers genuinely use the app, and a rejected application restarts the 14 days.
- **What to measure:** how many players start a second game, how long a session lasts, and where people quit.

## 15. Money

Falling-letter word games already exist, so the concept alone will not stand out. Your hooks are filler blocks as a building tool, closed-word scoring in both directions, and the shovel and one-way switching decisions. The category is crowded and discoverability is the hard part for an indie game, so treat profit as uncertain and the first release as a way to learn.

Common models are ads plus a one-time remove-ads purchase, cosmetic themes, rewarded video for extra powerups, and a daily puzzle that builds habit. Avoid pay-to-win. The MVP ships free with no ads. This is general market context, not financial advice.

## 16. Risks

- The core loop may not stay fun after the novelty fades. Playtest with strangers, not only friends.
- Filler blocks may make the game too easy or too tedious. Balance carefully.
- Discoverability is hard for any new word game. Plan some marketing, such as short gameplay clips.
- Word list and trademark problems can force a late rename or removal.
- Scope creep. Ship Classic and the Daily board first, and add modes later.

## 17. Cursor rules file

Save this as `.cursor/rules/word-drop.mdc` in the repo (Cursor’s project rules; check Cursor’s current docs if the format has changed). An `AGENTS.md` at the repo root with the same text also works. The rules keep Cursor from quietly changing decided design or breaking the core/rendering split.

```markdown
---
description: Word Drop project rules
alwaysApply: true
---

# Word Drop: project rules

## What this project is
Word Drop is a mobile-first falling-letter word puzzle. Pieces (vowel, consonant or filler block) fall onto an 8x10 grid. Words closed off by a wall or a filler block score. Full design: docs/GDD.md.

## Stack
- TypeScript (strict), Vite, Phaser, Vitest. Capacitor is added later for Android and iOS.
- Do not add a dependency or framework without asking first.

## Architecture rules (never break these)
1. All game rules live in src/core. Nothing in src/core imports Phaser, the DOM, window, localStorage or any browser API.
2. src/core is deterministic. The only randomness is the seeded generator in src/core/rng.ts. Never use Math.random or Date.now in src/core.
3. src/game and src/ui only draw state and send player actions to src/core. They never contain scoring or word rules.
4. Colors, fonts, sizes and radii live in src/ui/theme.ts. No hard-coded colors elsewhere.
5. Saved data (best score, streak, settings) goes through src/storage so it can be swapped later.

## Game rules (source of truth, do not change without asking)
- Grid is 8 columns by 10 rows. One piece falls at a time.
- Piece types: vowel, consonant, filler, wildcard. A new piece starts as the last letter type used. Once the player switches away from a type, they cannot switch back to it for that piece. Switching restarts the drop from the top. The wildcard is a powerup; switching away from it refunds it.
- A word counts only if it is a full run of letters (at least MIN_WORD_LENGTH, set in src/core/config.ts) bounded on both ends by the board edge or a filler block. Words read left to right and top to bottom.
- Letters use Scrabble-style values. A premium square multiplies the word score (x2 or x3). Multipliers in one word multiply together.
- A filler costs 1 point. The shovel costs 5 points, removes a tile, and the tiles above it fall.
- Powerups: wildcard, peek, freeze, shovel. Pause freezes everything.
- The game ends when no new piece can enter the board.
- Score = closed words minus filler costs minus shovel costs. It can go down when a word is broken.

## How to work
- Write or update tests first for any rule change. Run npm test before saying a task is done.
- Work in small steps: one feature or fix per change, and list the files changed.
- If a request conflicts with the rules above, stop and ask.
- Mobile first. Design for a 360 x 640 screen. Touch targets are at least 44 px.
- Keep functions in src/core small and pure. Use strict types and no any.
- Comments explain why, not what.
- The developer is learning: briefly explain non-obvious choices.
- Use the ENABLE word list in public/words. Do not add word lists with unclear licenses.

## Commands
- npm run dev -- --host : dev server reachable from the phone
- npm test : unit tests
- npm run build : production build
```

## 18. Repo skeleton

```text
word-drop/
  .cursor/rules/word-drop.mdc     rules from section 17
  .github/workflows/              cloud Android build (added in week 3 or 4)
  docs/GDD.md                     this document, exported as Markdown
  public/
    words/enable.txt              word list (ENABLE), filtered to 2-8 letters
    sounds/                       sound effects
    fonts/                        tile and logo fonts if self-hosted
  src/
    core/                         pure TypeScript, no browser code
      config.ts                   board size, costs, MIN_WORD_LENGTH
      types.ts                    Cell, PieceKind, GameState, Action
      rng.ts                      seeded random generator
      words.ts                    word list loading and word checks (with wildcards)
      board.ts                    grid, gravity, shovel collapse
      pieces.ts                   piece queue and one-way switching
      scoring.ts                  find closed words, letter values, multipliers
      powerups.ts                 wildcard, peek, freeze, shovel
      game.ts                     createGame(seed, mode), step(state, action)
      *.test.ts                   one test file per module
    game/                         Phaser code
      main.ts                     game config and start
      scenes/                     Boot, Menu, Play, GameOver
      views/                      board view, tile view, HUD, buttons
    ui/theme.ts                   colors, fonts, sizes, radii
    storage/                      saved best score, streak, settings
    audio/                        sound loading and playback
    main.ts                       entry point
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  capacitor.config.ts             added when you wrap the app for Android
```

The central idea is `game.ts`: a function that takes the current state and a player action (move left, move right, drop, switch type, use a powerup, tick) and returns the new state. Phaser only calls it and draws the result.

## 19. Setup process (Windows)

1. **Install the tools.** Open PowerShell and run `winget install OpenJS.NodeJS.LTS` and `winget install Git.Git`. Install Cursor from cursor.com and sign in. Close and reopen the terminal, then check `node -v` and `git --version`.
2. **Make a GitHub account** and an empty repository named `word-drop`.
3. **Create the project.** In a folder of your choice run:

```bash
npm create vite@latest word-drop -- --template vanilla-ts
cd word-drop
npm install
npm install phaser
npm install -D vitest
```

4. **Add a test script.** In `package.json`, add a `test` script that runs `vitest run`. Create `src/core/` and one trivial test to confirm `npm test` works.
5. **Add the rules and the plan.** Create `.cursor/rules/word-drop.mdc` from section 17. Export this document as Markdown into `docs/GDD.md`. Open the folder in Cursor.
6. **Commit and push.** Run `git init`, `git add .`, `git commit -m first commit`, then connect the GitHub remote and push, following the instructions GitHub shows for an empty repository.
7. **Test on the S23.** Run `npm run dev -- --host`. Allow Node.js through the Windows firewall for private networks if asked. Run `ipconfig` to find your laptop’s IPv4 address, then open `http://<that address>:5173` in Chrome on the S23 on the same Wi-Fi.
8. **Deploy a shareable link.** Connect the GitHub repo to Cloudflare Pages, Netlify or Vercel, with the build command `npm run build` and the output folder `dist`. Every push then updates a public link.
9. **Add the word list.** Download the ENABLE list, check its license terms, put it at `public/words/enable.txt`, and have Cursor write a loader that keeps only words of 2 to 8 letters.
10. **Later, wrap for Android (week 3 or 4).** Run `npm install @capacitor/core @capacitor/android` and `npm install -D @capacitor/cli`, then `npx cap init` and `npx cap add android`. After each build, `npx cap sync android` copies the web build into the Android project. Then add a cloud build, for example this GitHub Actions workflow in `.github/workflows/android-debug.yml`:

```yaml
name: android-debug
on: workflow_dispatch
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - run: npm ci
      - run: npm run build
      - run: npx cap sync android
      - run: cd android && ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

Check the current action versions and the Java version your Android Gradle setup needs before relying on this. Run the workflow from the Actions tab on GitHub, download the APK from the finished run, and install it on the S23.

## 20. First prompts for Cursor

Give these one at a time, check the result, and commit before the next.

1. Read docs/GDD.md and the rules file. Scaffold the folders in section 18 with empty modules and one passing test. Do not write game logic yet.
2. Implement `rng.ts`: a small seeded random generator with tests proving the same seed gives the same sequence.
3. Implement `words.ts` and `scoring.ts` with tests for: a closed horizontal word, a closed vertical word, an open word that does not score, a wildcard matching a word, and premium multipliers.
4. Implement `board.ts` and `pieces.ts` with tests for gravity, the shovel collapse, and the one-way piece-switching rule.
5. Implement `game.ts` with `createGame` and `step`, and tests for a full short game ending when the board is full.
6. Build a minimal Phaser Play scene that draws the board from the game state and has left, right and drop buttons. Make it playable on the phone before adding any styling.
7. Apply `theme.ts` with the chosen palette, then add landing animations and sound.

The prototype’s logic is the starting point for steps 3 to 5. I can write that TypeScript core module, with tests, for you to paste into step 1 if you would like.

## 21. Decisions still open

- Which palette from the style tile, A, B or C, becomes the main identity?
- Minimum word length: 2 or 3? 3 letters.
- Ads, purchases or neither after the MVP? This can wait until you see how people play.
- Do you want the TypeScript core module written next, so week 1 starts with working, tested rules?
