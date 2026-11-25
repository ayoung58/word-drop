# Credits

Word Drop stands on other people's work. This file lists it, with the licence text where a
licence asks for that. Keep it up to date whenever a word list, font or sound is added or removed.

**Status:** word lists are done. Fonts, sounds and artwork are listed at the bottom and will be
completed in later milestones (see `docs/PROJECT_STATUS_AND_ROADMAP.md`).

## Word lists

All three files come from
[BartMassey/wordlists](https://github.com/BartMassey/wordlists) (MIT licence, see below).
They are byte-for-byte copies of the files published there (checked on 2026-11-25).

| File in this project | Upstream file | Words | Used by the game? |
| --- | --- | --- | --- |
| `public/words/enable.txt` | `enable2k.txt.gz` | 173,528 | **Yes**, the only list the game loads, and it ships in the build |
| `data/wordlists/eowl.txt` | `eowl.txt.gz` | 128,985 | No. Spare copy, **not** shipped (outside `public/`) |
| `data/wordlists/freq-word.txt` | `freq-word.txt.gz` | 60,540 | No. Spare copy, **not** shipped (outside `public/`) |

`src/game/wordlists.test.ts` checks the word counts above, so a changed file is noticed.

### enable.txt: ENABLE 2K

The Enhanced North American Benchmark LExicon (ENABLE), second edition ("ENABLE 2K"), researched
and compiled by **Alan Beale** with **M\Cooper** (thegrendel@theriver.com) and the Scrabble
community. It is released into the **Public Domain**. Its authors ask that game designers
"mention the source and credit us as originators of the list", so we do:

> The ENABLE master word list, WORD.LST, is herewith formally released into the Public Domain.
> Anyone is free to use it or distribute it in any manner they see fit. [...] Please mention the
> source and credit us as originators of the list.
> (ENABLE 2K README, M\Cooper)

The authors also ask that you may not "legally copyright or in any way restrict redistribution of
the WORD.LST portion of your product". The word list stays free for everyone, even though the
game itself may be licensed differently. ENABLE is not a trademark. Scrabble and OSPD are
trademarks of Hasbro and are not used by this project.

Full upstream notice:
[README-enable2k.txt](https://github.com/BartMassey/wordlists/blob/master/README-enable2k.txt).

### eowl.txt: English Open Word List (EOWL)

Developed by **Ken Loge**, almost entirely derived from the **UK Advanced Cryptics Dictionary**
(UKACD) version 1.6 by **J Ross Beresford**. Official notice (a copy of the EOWL web page):
[README-eowl-official.html](https://github.com/BartMassey/wordlists/blob/master/README-eowl-official.html).

> **Licence condition: this list is not used by the game and is not shipped to players (it lives in
> `data/wordlists/`, outside `public/`, so the build does not copy it). If it is ever used in the
> game or shipped, the copyright notice below must be prominently displayed (for example on an
> in-game Credits screen) and the UKACD licence document must be included verbatim.** The notice
> is kept here so that the repository itself, which contains the file, stays compliant.
> Do not move this file back into `public/` without adding the in-game notice first.

Licence text, as published on the EOWL page:

> Copyright © J Ross Beresford 1993-1999. All Rights Reserved. The following restriction is placed
> on the use of this publication: if the UK Advanced Cryptics Dictionary is used in a software
> package or redistributed in any form, the copyright notice must be prominently displayed and the
> text of this document must be included verbatim.
>
> There are no other restrictions: I would like to see the list distributed as widely as possible.

Known problem in the upstream file: 219 lines contain garbled accented characters (for example
`adiÛs`, `alc·zar`) although EOWL is meant to have no diacritics. Clean them before using the
list as a dictionary. `src/game/wordlists.test.ts` records this.

### freq-word.txt: Frequently Used Word List

Compiled by **Bart Massey** from Peter Norvig's `count_1w.txt` (MIT licence, derived from the Google
Web Trillion Word Corpus), Kevin Atkinson's SCOWL, YAWL (Mendel Leo Cooper with Alan Beale), EOWL and
ENABLE 2K. Only words found in the Google/Norvig list, SCOWL and at least one of YAWL, EOWL or ENABLE
are kept. Method:
[README-freq.md](https://github.com/BartMassey/wordlists/blob/master/README-freq.md).

Because it is derived from SCOWL, YAWL and EOWL, check their notices
([SCOWL](https://github.com/BartMassey/wordlists/blob/master/README-scowl-official.txt),
[YAWL](https://github.com/BartMassey/wordlists/blob/master/README-yawl-official.md)) before shipping
this list to players.

### The wordlists repository: MIT licence

The upstream repository is published under the MIT licence:

```text
Copyright © 2025 Bart Massey

MIT License

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall
be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

The MIT licence covers Bart Massey's own work in that repository (the packaging and the frequency
list). It does not replace the separate terms of ENABLE (public domain) and EOWL (above).

## Software

- [Phaser](https://phaser.io/) (MIT), game framework.
- [Vite](https://vite.dev/) (MIT), [Vitest](https://vitest.dev/) (MIT) and
  [TypeScript](https://www.typescriptlang.org/) (Apache 2.0), tooling.

## Fonts, sounds, artwork (to be completed)

- **Chakra Petch** (Cadson Demak), SIL Open Font Licence 1.1, loaded from Google Fonts. To be
  bundled with the game and its licence file added in a later milestone.
- **Sounds:** generated in code with the Web Audio API. No third-party sound files yet.
- **Icon and artwork:** the favicon is a placeholder. The final icon is planned for milestone M6.
