import type Phaser from 'phaser';
import { FONT, PALETTE } from '../../ui/theme';

/**
 * Phaser draws text to a small canvas. On a phone with a high-density screen it looks
 * blurry unless the text is rendered at the screen's pixel ratio, so every label goes through here.
 */
const TEXT_RESOLUTION = Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1)));

export interface LabelOptions {
  size: number;
  weight?: 600 | 700;
  color?: string;
}

export function makeLabel(scene: Phaser.Scene, x: number, y: number, text: string, o: LabelOptions): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT.family,
      fontSize: `${o.size}px`,
      fontStyle: String(o.weight ?? 700),
      color: o.color ?? PALETTE.ink,
      resolution: TEXT_RESOLUTION,
    })
    .setOrigin(0.5);
}
