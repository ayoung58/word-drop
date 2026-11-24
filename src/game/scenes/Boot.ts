import Phaser from 'phaser';

/**
 * Preloads global assets (sounds, atlas, fonts).
 * Currently a pass-through — goes straight to Play once assets are added.
 */
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    // this.load.audio('land', 'sounds/land.ogg');
    // this.load.atlas(...) — atlas and sound loading goes here.
  }

  create(): void {
    this.scene.start('Play');
  }
}
