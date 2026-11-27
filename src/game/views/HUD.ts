import type Phaser from 'phaser';
import { GAME_W, LAYOUT, PAD_X, PALETTE, TOUCH } from '../../ui/theme';
import { Button } from './Buttons';
import { shovelPenaltyCaption } from '../logic/labels';
import { makeLabel } from './text';

export interface HudHandlers {
  onPause: () => void;
  onRestart: () => void;
}

/**
 * X-position of the shovel column. It sits to the right of the score number.
 * The score uses size-32 text; two digits are roughly 36 px, three about 54 px.
 * 90 px from PAD_X leaves room for scores up to ±999 before the columns overlap.
 * If scores regularly exceed that, bump this constant.
 */
const SHOVEL_COL_X = PAD_X + 90;

/** The header: live score, a short status message, and the pause and restart buttons. */
export class Hud {
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  /** "Shovel:" label, hidden until the shovel is used. */
  private readonly shovelLabel: Phaser.GameObjects.Text;
  /** The penalty amount, e.g. "(-10)", hidden until the shovel is used. */
  private readonly shovelAmount: Phaser.GameObjects.Text;
  private readonly pauseButton: Button;
  private shown = 0;
  private target = 0;
  private counter: Phaser.Tweens.Tween | null = null;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, h: HudHandlers) {
    this.scene = scene;
    const top = LAYOUT.headerY;

    // Score column (left-aligned at PAD_X)
    makeLabel(scene, PAD_X, top + 6, 'SCORE', { size: 12, weight: 600 }).setOrigin(0, 0.5).setAlpha(0.8);
    this.scoreText = makeLabel(scene, PAD_X, top + 28, '0', { size: 32 }).setOrigin(0, 0.5);

    // Shovel column (fixed x, same vertical rhythm as the score column)
    this.shovelLabel = makeLabel(scene, SHOVEL_COL_X, top + 6, 'Shovel:', { size: 12, weight: 600 }).setOrigin(0, 0.5).setAlpha(0.8).setVisible(false);
    this.shovelAmount = makeLabel(scene, SHOVEL_COL_X, top + 28, '', { size: 20 }).setOrigin(0, 0.5).setVisible(false);

    const pauseX = GAME_W - PAD_X - TOUCH;
    const restartX = pauseX - 6 - TOUCH;
    this.pauseButton = new Button(scene, { x: pauseX, y: top, w: TOUCH, h: TOUCH, icon: 'pause', onPress: h.onPause });
    new Button(scene, { x: restartX, y: top, w: TOUCH, h: TOUCH, icon: 'restart', onPress: h.onRestart });

    this.statusText = makeLabel(scene, restartX - 12, top + TOUCH / 2, '', { size: 12, weight: 600, color: PALETTE.accent }).setOrigin(1, 0.5);
  }

  /** With `animate`, the number counts up (or down) to the new score and pops a little. */
  setScore(score: number, animate: boolean): void {
    if (score === this.target) return;
    const from = this.shown;
    this.target = score;
    this.counter?.stop();
    if (!animate) {
      this.shown = score;
      this.scoreText.setText(String(score));
      return;
    }
    this.counter = this.scene.tweens.addCounter({
      from,
      to: score,
      duration: 350,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        this.shown = Math.round(tween.getValue() ?? score);
        this.scoreText.setText(String(this.shown));
      },
      onComplete: () => {
        this.shown = score;
        this.scoreText.setText(String(score));
      },
    });
    if (score > from) {
      this.scene.tweens.killTweensOf(this.scoreText);
      this.scoreText.setScale(1);
      this.scene.tweens.add({ targets: this.scoreText, scale: 1.15, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    }
  }

  /** Shows or hides the shovel column. Hidden until the shovel has been used at least once. */
  setShovelPenalty(spent: number): void {
    const caption = shovelPenaltyCaption(spent);
    const visible = caption !== null;
    this.shovelLabel.setVisible(visible);
    this.shovelAmount.setVisible(visible).setText(caption ?? '');
  }

  setStatus(text: string): void {
    this.statusText.setText(text);
  }

  setPaused(paused: boolean): void {
    this.pauseButton.update({ on: paused });
  }
}
