import Phaser from 'phaser';
import { audio } from '../../audio';
import { fallIntervalMs } from '../../core/config';
import { createGame, step } from '../../core/game';
import { evaluate } from '../../core/scoring';
import type { Action, Evaluation, GameState, WordHit } from '../../core/types';
import type { Dictionary } from '../../core/words';
import { load, save } from '../../storage';
import { BoardView } from '../views/BoardView';
import { ControlPanel } from '../views/Buttons';
import { Hud } from '../views/HUD';

/** Lets the last landing animation play before the Game Over screen replaces the board. */
const GAME_OVER_DELAY_MS = 700;
/** The restart button must be pressed twice within this time, so a stray tap cannot throw the game away. */
const RESTART_CONFIRM_MS = 2000;
/** Words of at least this many letters get the bigger pulse. */
const LONG_WORD = 5;

/** A different game each time. Math.random is fine here because this is the view, not src/core. */
const newSeed = (): number => Math.floor(Math.random() * 0x7fffffff);

const wordKey = (w: WordHit): string => `${w.direction}:${w.cells[0]?.join(',') ?? ''}:${w.text}`;

/**
 * The play screen. It owns no rules: every player action goes through core's step(),
 * and everything on screen is drawn from the state step() returns.
 * Pause and the armed shovel are handled here by simply not sending gravity ticks.
 */
export class Play extends Phaser.Scene {
  private dict!: Dictionary;
  private state!: GameState;
  private result!: Evaluation;
  private board!: BoardView;
  private controls!: ControlPanel;
  private hud!: Hud;

  private paused = false;
  private shovelArmed = false;
  private restartArmed = false;
  private ending = false;
  /** Milliseconds since the last gravity tick. */
  private sinceTick = 0;

  constructor() {
    super('Play');
  }

  create(): void {
    // The scene object is reused on restart, so every field starts fresh here.
    this.dict = this.registry.get('dict') as Dictionary;
    this.state = createGame(newSeed());
    this.result = evaluate(this.state, this.dict);
    this.paused = false;
    this.shovelArmed = false;
    this.restartArmed = false;
    this.ending = false;
    this.sinceTick = 0;

    this.board = new BoardView(this, (row, col) => this.onCellTap(row, col));
    this.hud = new Hud(this, { onPause: () => this.togglePause(), onRestart: () => this.onRestart() });
    this.controls = new ControlPanel(this, { act: (a) => this.act(a), toggleShovel: () => this.toggleShovel() });
    this.bindKeys();
    this.refresh(false);
  }

  /** Gravity. Time is measured here and sent to core as 'tick' actions, so core never reads a clock. */
  override update(_time: number, delta: number): void {
    if (this.paused || this.ending || this.state.over) return;
    this.sinceTick += delta;
    if (this.sinceTick >= fallIntervalMs(this.state.placed)) {
      this.sinceTick = 0;
      this.apply({ type: 'tick' });
    }
  }

  // Input -------------------------------------------------------------------

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    // Stop the browser from scrolling the page with the arrow keys and space.
    kb.addCapture('LEFT,RIGHT,DOWN,UP,SPACE');
    const on = (key: string, fn: () => void): void => {
      kb.on(`keydown-${key}`, fn);
    };
    on('LEFT', () => this.act({ type: 'moveLeft' }));
    on('RIGHT', () => this.act({ type: 'moveRight' }));
    on('DOWN', () => this.act({ type: 'drop' }));
    on('SPACE', () => this.act({ type: 'drop' }));
    on('Q', () => this.act({ type: 'switch', to: 'vowel' }));
    on('W', () => this.act({ type: 'switch', to: 'consonant' }));
    on('E', () => this.act({ type: 'switch', to: 'filler' }));
    on('ONE', () => this.act({ type: 'wildcard' }));
    on('TWO', () => this.act({ type: 'peek' }));
    on('THREE', () => this.act({ type: 'freeze' }));
    on('FOUR', () => this.toggleShovel());
    on('P', () => this.togglePause());
    on('ESC', () => this.togglePause());
  }

  /** A player action. Any button except Pause and Restart also ends a pause or a shovel selection. */
  private act(action: Action): void {
    if (this.ending || this.state.over) return;
    this.paused = false;
    this.shovelArmed = false;
    this.apply(action);
  }

  private togglePause(): void {
    if (this.ending || this.state.over) return;
    // Pressing Pause while the shovel is armed just cancels the shovel.
    if (this.shovelArmed) {
      this.shovelArmed = false;
      this.paused = false;
    } else {
      this.paused = !this.paused;
    }
    this.refresh(false);
  }

  private toggleShovel(): void {
    if (this.ending || this.state.over) return;
    this.shovelArmed = !this.shovelArmed;
    // Arming the shovel pauses the game; cancelling it resumes.
    this.paused = this.shovelArmed;
    this.refresh(false);
  }

  private onCellTap(row: number, col: number): void {
    if (!this.shovelArmed || this.ending || this.state.over) return;
    // Tapping an empty cell keeps the shovel armed so the player can try again.
    if (!this.state.grid[row]?.[col]) return;
    this.shovelArmed = false;
    this.paused = false;
    this.apply({ type: 'shovel', row, col });
  }

  private onRestart(): void {
    if (this.restartArmed) {
      this.scene.restart();
      return;
    }
    this.restartArmed = true;
    this.refresh(false);
    this.time.delayedCall(RESTART_CONFIRM_MS, () => {
      this.restartArmed = false;
      this.refresh(false);
    });
  }

  // State -------------------------------------------------------------------

  /** Runs one action through core, then reacts to what changed. */
  private apply(action: Action): void {
    const before = this.state;
    const after = step(before, action);
    const previousWords = this.result.words;
    this.state = after;
    this.result = evaluate(after, this.dict);
    this.celebrate(before, after, action, previousWords);
    this.refresh(true);
    if (after.over) this.finish();
  }

  /** Compares the state before and after an action to decide which animation and sound to play. */
  private celebrate(before: GameState, after: GameState, action: Action, previousWords: readonly WordHit[]): void {
    if (after.placed > before.placed && before.piece) {
      this.board.landed(before.piece.row, before.piece.col);
      audio.play('land');
      this.sinceTick = 0; // the next piece gets a full interval before its first step
    }

    const known = new Set(previousWords.filter((w) => w.closed).map(wordKey));
    const fresh = this.result.words.filter((w) => w.closed && !known.has(wordKey(w)));
    for (const w of fresh) this.board.wordScored(w.cells, w.text.length >= LONG_WORD ? 2 : 1);
    if (fresh.length > 0) audio.play('score', Math.max(...fresh.map((w) => w.text.length)));

    if (action.type === 'shovel' && after.spent > before.spent) {
      this.board.shoveled(action.row, action.col);
      audio.play('shovel');
    } else if (action.type === 'switch' && before.piece?.kind !== after.piece?.kind) {
      this.sinceTick = 0; // switching restarts the drop from the top
      audio.play('switch');
    } else if ((action.type === 'wildcard' || action.type === 'peek' || action.type === 'freeze') && after.charges[action.type] !== before.charges[action.type]) {
      audio.play('powerup');
    }
  }

  private refresh(animate: boolean): void {
    this.board.render(this.state, this.result.words, this.shovelArmed);
    this.controls.update(this.state, this.shovelArmed);
    this.hud.setScore(this.result.score, animate);
    this.hud.setPaused(this.paused && !this.shovelArmed);
    this.hud.setStatus(this.statusText());
  }

  private statusText(): string {
    if (this.restartArmed) return 'TAP AGAIN';
    if (this.shovelArmed) return 'TAP A TILE';
    if (this.paused) return 'PAUSED';
    if (this.state.freezeTicksLeft > 0) return 'FROZEN';
    return '';
  }

  private finish(): void {
    this.ending = true;
    const score = this.result.score;
    const stored = load();
    const newBest = score > stored.bestScore;
    if (newBest) save({ ...stored, bestScore: score });
    audio.play('gameOver');
    this.time.delayedCall(GAME_OVER_DELAY_MS, () => {
      this.scene.start('GameOver', { score, best: Math.max(score, stored.bestScore), newBest });
    });
  }
}
