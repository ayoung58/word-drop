import Phaser from 'phaser';
import { GAME_H, GAME_W, PALETTE } from '../ui/theme';
import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Play } from './scenes/Play';

/**
 * Creates the Phaser game. Called once from src/main.ts.
 * Menu exists but is not wired in yet: Boot goes straight to Play.
 */
export function startGame(): Phaser.Game {
  // The canvas is scaled to fit, so the page behind it must match to avoid visible bars.
  document.body.style.backgroundColor = PALETTE.bg;

  return new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: PALETTE.bg,
    parent: 'app',
    scene: [Boot, Play, GameOver],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Three pointers so a thumb can hold "right" while another finger taps a button.
    input: { activePointers: 3 },
  });
}
