import Phaser from 'phaser';
import { GAME_H, GAME_W, hex, PALETTE } from '../ui/theme';
import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Play } from './scenes/Play';

/**
 * Creates and returns the Phaser game instance.
 * Called once from src/main.ts.
 * Menu is not wired in yet — Boot goes straight to Play for now.
 */
export function startGame(): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: hex(PALETTE.bg),
    parent: 'app',
    scene: [Boot, Play, GameOver],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
}
