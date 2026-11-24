import Phaser from 'phaser';
import { GAME_H, GAME_W, PALETTE, TOUCH } from '../../ui/theme';
import { Button } from '../views/Buttons';
import { makeLabel } from '../views/text';

export interface GameOverData {
  score: number;
  best: number;
  newBest: boolean;
}

/** Final score, best score, and a button to play again. */
export class GameOver extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: Partial<GameOverData>): void {
    const { score = 0, best = 0, newBest = false } = data;
    const cx = GAME_W / 2;
    const top = GAME_H / 2 - 150;

    makeLabel(this, cx, top, 'GAME OVER', { size: 34 });
    makeLabel(this, cx, top + 70, 'SCORE', { size: 12, weight: 600 }).setAlpha(0.8);
    makeLabel(this, cx, top + 118, String(score), { size: 64 });
    makeLabel(this, cx, top + 178, newBest ? 'NEW BEST' : `BEST ${best}`, { size: 14, weight: 600, color: newBest ? PALETTE.accent : PALETTE.ink }).setAlpha(newBest ? 1 : 0.8);

    const w = 220;
    const h = TOUCH + 8;
    const again = new Button(this, { x: cx - w / 2, y: top + 230, w, h, labelSize: 18, onPress: () => this.scene.start('Play') });
    again.update({ top: 'Play again', on: true });

    // Wait a moment before listening, so a key still held down from the game (Space, Down)
    // cannot skip this screen through key-repeat.
    this.time.delayedCall(800, () => {
      this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('Play'));
      this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Play'));
    });
  }
}
