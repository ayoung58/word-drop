// Sound loading and playback. Thin wrapper so the audio backend can be swapped
// (Phaser's sound manager today, Capacitor plugin later if needed).
// Asset keys must match what Boot.ts loads in its preload().

export type SoundKey = 'land' | 'score' | 'shovel' | 'gameOver';

export interface AudioManager {
  play(key: SoundKey): void;
}

/**
 * Returns a no-op manager until sounds are added.
 * Replace with a real Phaser scene reference once Boot.ts loads the assets.
 */
export function createAudio(): AudioManager {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    play(_key: SoundKey): void {
      // Will delegate to scene.sound.play(key) once assets are loaded.
    },
  };
}
