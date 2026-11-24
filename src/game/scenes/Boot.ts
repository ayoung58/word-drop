import Phaser from 'phaser';
import { FONT } from '../../ui/theme';
import { buildDictionary, WORDS_URL } from '../dictionary';

/** Loads the word list and the web font, then starts the game. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.text('words', WORDS_URL);
  }

  create(): void {
    const text = this.cache.text.get('words') as string | undefined;
    this.registry.set('dict', buildDictionary(text));
    void this.waitForFont().then(() => this.scene.start('Play'));
  }

  /**
   * Phaser draws text once, so it must not draw before the web font has arrived or the
   * text would stay in the fallback font. A timeout keeps the game starting when offline.
   */
  private async waitForFont(): Promise<void> {
    const loads = FONT.weights.map((w) => document.fonts.load(`${w} 20px ${FONT.family}`));
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 2000));
    await Promise.race([Promise.all(loads).then(() => undefined), timeout]).catch(() => undefined);
  }
}
