// Sound effects, synthesized with the Web Audio API so the game needs no audio files
// (and no licences). Scenes only call audio.play(key); the backend can be swapped later.

export type SoundKey = 'land' | 'score' | 'shovel' | 'switch' | 'powerup' | 'gameOver';

export interface AudioManager {
  /** `detail` is the word length for 'score': longer words get a longer chime. */
  play(key: SoundKey, detail?: number): void;
}

interface ToneOptions {
  from: number;
  to?: number;
  type: OscillatorType;
  at: number;
  length: number;
  gain: number;
}

function tone(ctx: AudioContext, out: AudioNode, o: ToneOptions): void {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const t0 = ctx.currentTime + o.at;
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.from, t0);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.length);
  // A fast attack and an exponential decay avoid clicks at the start and end.
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + o.length);
  osc.connect(amp).connect(out);
  osc.start(t0);
  osc.stop(t0 + o.length + 0.02);
}

function noise(ctx: AudioContext, out: AudioNode, at: number, length: number, gain: number, filterFrom: number, filterTo: number): void {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * length));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Math.random is fine here: sound is not game logic, so it does not need to be deterministic.
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  const amp = ctx.createGain();
  const t0 = ctx.currentTime + at;
  filter.frequency.setValueAtTime(filterFrom, t0);
  filter.frequency.exponentialRampToValueAtTime(filterTo, t0 + length);
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  src.connect(filter).connect(amp).connect(out);
  src.start(t0);
}

/** Semitone steps above the first note: a major pentatonic run that always sounds pleasant. */
const CHIME_STEPS = [0, 4, 7, 12, 16, 19];
const BASE_HZ = 523.25;
const hz = (steps: number): number => BASE_HZ * 2 ** (steps / 12);

const SOUNDS: Record<SoundKey, (ctx: AudioContext, out: AudioNode, detail: number) => void> = {
  // Soft thunk: a short falling low tone plus a muffled click.
  land(ctx, out) {
    tone(ctx, out, { from: 150, to: 55, type: 'triangle', at: 0, length: 0.13, gain: 0.5 });
    noise(ctx, out, 0, 0.05, 0.12, 500, 200);
  },
  // Rising chime: one more note for each extra letter in the word.
  score(ctx, out, detail) {
    const notes = Math.min(CHIME_STEPS.length, Math.max(3, detail - 1));
    for (let i = 0; i < notes; i++) {
      tone(ctx, out, { from: hz(CHIME_STEPS[i] ?? 0), type: 'sine', at: i * 0.07, length: 0.35, gain: 0.22 });
    }
  },
  // Scrape then thump, clearly different from the landing sound.
  shovel(ctx, out) {
    noise(ctx, out, 0, 0.22, 0.35, 1400, 300);
    tone(ctx, out, { from: 110, to: 60, type: 'sawtooth', at: 0.05, length: 0.18, gain: 0.18 });
  },
  switch(ctx, out) {
    tone(ctx, out, { from: 660, to: 880, type: 'square', at: 0, length: 0.04, gain: 0.07 });
  },
  powerup(ctx, out) {
    tone(ctx, out, { from: 440, to: 880, type: 'triangle', at: 0, length: 0.16, gain: 0.25 });
    tone(ctx, out, { from: 660, to: 1320, type: 'sine', at: 0.08, length: 0.16, gain: 0.15 });
  },
  // End-of-game sting: four falling notes.
  gameOver(ctx, out) {
    [392, 330, 262, 196].forEach((f, i) => {
      tone(ctx, out, { from: f, type: 'triangle', at: i * 0.16, length: 0.3, gain: 0.3 });
    });
  },
};

export function createAudio(): AudioManager {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;

  // Browsers keep audio locked until the player touches or presses something.
  const unlock = (): void => {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    void ctx.resume();
    if (ctx.state === 'running') {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  return {
    play(key, detail = 0) {
      // Before the first touch there is nothing to play on: skip silently.
      if (!ctx || !master || ctx.state !== 'running') return;
      SOUNDS[key](ctx, master, detail);
    },
  };
}

/** Shared by every scene, so the audio context is created only once. */
export const audio: AudioManager = createAudio();
