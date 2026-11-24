import Phaser from 'phaser';

/**
 * Title screen and mode selection.
 * Not yet wired into the scene list — Boot goes straight to Play for now.
 * Wire it in by replacing Boot's this.scene.start('Play') with 'Menu'.
 */
export class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(): void {
    // Title, mode buttons (Classic / Daily), settings icon.
    // Calls this.scene.start('Play') with the chosen seed and mode.
  }
}
