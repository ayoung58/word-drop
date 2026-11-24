import Phaser from 'phaser';
import { GAME_H, GAME_W, PALETTE } from '../../ui/theme';

/** Shown when the board fills. Tap / press any key to restart. */
export class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(): void {
    this.add
      .text(GAME_W / 2, GAME_H / 2 - 40, 'GAME OVER', {
        fontSize: '36px',
        color: PALETTE.text,
        fontFamily: "'Segoe UI', sans-serif",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_W / 2, GAME_H / 2 + 20, 'tap or press any key to play again', {
        fontSize: '16px',
        color: PALETTE.accent,
        fontFamily: "'Segoe UI', sans-serif",
      })
      .setOrigin(0.5);

    this.input.once('pointerdown', () => this.scene.start('Play'));
    this.input.keyboard?.once('keydown', () => this.scene.start('Play'));
  }
}
