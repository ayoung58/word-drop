import type Phaser from 'phaser';
import { FILLER_COST, SHOVEL_COST } from '../../core/config';
import { buttonPreview } from '../../core/pieces';
import { fillerCaption, poolLetters, powerupCaptions } from '../logic/labels';
import type { PoolLetter } from '../logic/labels';
import type { Action, GameState, SwitchTarget } from '../../core/types';
import { EDGE, GAME_W, hex, LAYOUT, PAD_X, PALETTE, POINTS_SIZE, RADIUS } from '../../ui/theme';
import { makeLabel } from './text';

export type IconName = 'pause' | 'restart' | 'left' | 'right' | 'down';

export interface ButtonOptions {
  /** Top-left corner and size, in canvas pixels. Keep both sides at least 44 px (touch rule). */
  x: number;
  y: number;
  w: number;
  h: number;
  onPress: () => void;
  icon?: IconName;
  /** Text size when the button has a single line of text. Defaults to 12. */
  labelSize?: number;
  /** Hold the button to fire onPress again: first after `delay` ms, then every `interval` ms. */
  repeat?: { delay: number; interval: number };
}

export interface ButtonState {
  /** Small caption. With `bottom` it sits above the big text. */
  top?: string;
  /** Large text under the caption (a letter, a number). */
  bottom?: string;
  /** Letters shown big under the caption, each with its points as a small subscript. Used instead of `bottom`. */
  pool?: PoolLetter[];
  /** Selected: drawn with the accent border. */
  on?: boolean;
  /** Dimmed and ignores touches. */
  disabled?: boolean;
}

/** Most letters a pool button shows at once: the next one, and the one after it while peek is on. */
const MAX_POOL_LETTERS = 2;
/** Gap between a letter and its subscript, and around the dot between two letters. */
const SUB_GAP = 2;
const DOT_GAP = 7;

/** A tappable button that reacts on touch-down (a falling-piece game cannot wait for the finger to lift). */
export class Button {
  private readonly root: Phaser.GameObjects.Container;
  private readonly face: Phaser.GameObjects.Graphics;
  private readonly topText: Phaser.GameObjects.Text;
  private readonly bottomText: Phaser.GameObjects.Text;
  /** Pre-made pieces for a pool button: a big letter and a small subscript per letter, and the dot between them. */
  private readonly poolLetters: Phaser.GameObjects.Text[] = [];
  private readonly poolSubs: Phaser.GameObjects.Text[] = [];
  private readonly poolDot: Phaser.GameObjects.Text;
  private state: ButtonState = {};
  private pressed = false;
  private delayTimer: Phaser.Time.TimerEvent | null = null;
  private repeatTimer: Phaser.Time.TimerEvent | null = null;
  private readonly scene: Phaser.Scene;
  private readonly o: ButtonOptions;

  constructor(scene: Phaser.Scene, o: ButtonOptions) {
    this.scene = scene;
    this.o = o;
    this.face = scene.add.graphics();
    this.topText = makeLabel(scene, 0, 0, '', { size: o.labelSize ?? 12, weight: 600 });
    this.bottomText = makeLabel(scene, 0, 0, '', { size: 21 });
    for (let i = 0; i < MAX_POOL_LETTERS; i++) {
      this.poolLetters.push(makeLabel(scene, 0, 0, '', { size: 21 }).setOrigin(0, 0.5));
      this.poolSubs.push(makeLabel(scene, 0, 0, '', { size: POINTS_SIZE.button, weight: 600 }).setOrigin(0, 0.5).setAlpha(0.75));
    }
    this.poolDot = makeLabel(scene, 0, 0, '\u00b7', { size: 21 }).setOrigin(0, 0.5);
    const parts: Phaser.GameObjects.GameObject[] = [this.face, this.topText, this.bottomText, ...this.poolLetters, ...this.poolSubs, this.poolDot];
    if (o.icon) parts.push(this.makeIcon(o.icon));
    this.root = scene.add.container(o.x + o.w / 2, o.y + o.h / 2, parts);
    this.root.setSize(o.w, o.h).setInteractive({ useHandCursor: true });
    this.root.on('pointerdown', () => this.press());
    for (const event of ['pointerup', 'pointerout', 'pointerupoutside']) this.root.on(event, () => this.release());
    this.redraw();
  }

  update(next: ButtonState): void {
    this.state = { ...this.state, ...next };
    this.redraw();
  }

  private press(): void {
    if (this.state.disabled) return;
    this.pressed = true;
    this.redraw();
    this.o.onPress();
    const repeat = this.o.repeat;
    if (!repeat) return;
    this.delayTimer = this.scene.time.delayedCall(repeat.delay, () => {
      this.repeatTimer = this.scene.time.addEvent({ delay: repeat.interval, loop: true, callback: () => this.o.onPress() });
    });
  }

  private release(): void {
    this.delayTimer?.remove();
    this.repeatTimer?.remove();
    this.delayTimer = null;
    this.repeatTimer = null;
    if (!this.pressed) return;
    this.pressed = false;
    this.redraw();
  }

  private redraw(): void {
    const { w, h } = this.o;
    // A pressed button sinks into its own edge, like a physical key.
    const drop = this.pressed ? EDGE : 0;
    this.face.clear();
    if (!this.pressed) {
      this.face.fillStyle(hex(PALETTE.shadow));
      this.face.fillRoundedRect(-w / 2, -h / 2 + EDGE, w, h, RADIUS);
    }
    this.face.fillStyle(hex(PALETTE.tile));
    this.face.fillRoundedRect(-w / 2, -h / 2 + drop, w, h, RADIUS);
    const width = this.state.on ? 2 : 1;
    this.face.lineStyle(width, hex(this.state.on ? PALETTE.accent : PALETTE.line));
    this.face.strokeRoundedRect(-w / 2 + width / 2, -h / 2 + drop + width / 2, w - width, h - width, RADIUS);

    const { top, bottom, pool } = this.state;
    const twoLines = top !== undefined && (bottom !== undefined || pool !== undefined);
    this.topText.setText(top ?? '').setY((twoLines ? -h / 2 + 14 : 0) + drop);
    this.bottomText.setText(pool ? '' : (bottom ?? '')).setY(h / 2 - 17 + drop);
    this.layoutPool(pool ?? [], h / 2 - 17 + drop);
    this.root.setAlpha(this.state.disabled ? 0.4 : 1);
  }

  /** Lays out "E1 · A1" centred on the button: big letters, small points beside each, a dot between. */
  private layoutPool(pool: PoolLetter[], y: number): void {
    const shown = pool.slice(0, MAX_POOL_LETTERS);
    const widths = shown.map((p, i) => {
      this.poolLetters[i]?.setText(p.letter);
      this.poolSubs[i]?.setText(String(p.points));
      return (this.poolLetters[i]?.width ?? 0) + SUB_GAP + (this.poolSubs[i]?.width ?? 0);
    });
    const total = widths.reduce((n, w) => n + w, 0) + (shown.length > 1 ? DOT_GAP * 2 + this.poolDot.width : 0);
    let x = -total / 2;
    for (let i = 0; i < MAX_POOL_LETTERS; i++) {
      const letter = this.poolLetters[i];
      const sub = this.poolSubs[i];
      const used = i < shown.length;
      letter?.setVisible(used);
      sub?.setVisible(used);
      if (!used || !letter || !sub) continue;
      letter.setPosition(x, y);
      sub.setPosition(x + letter.width + SUB_GAP, y + 6); // lower than the letter, like a subscript
      x += (widths[i] ?? 0) + DOT_GAP;
      if (i === 0 && shown.length > 1) {
        this.poolDot.setPosition(x, y);
        x += this.poolDot.width + DOT_GAP;
      }
    }
    this.poolDot.setVisible(shown.length > 1).setY(y);
  }

  /** Icons are stroked paths, like the SVG icons in the mockup. */
  private makeIcon(name: IconName): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.lineStyle(3, hex(PALETTE.ink));
    g.fillStyle(hex(PALETTE.ink));
    const path = (...pts: number[]): void => {
      g.beginPath();
      g.moveTo(pts[0] ?? 0, pts[1] ?? 0);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] ?? 0, pts[i + 1] ?? 0);
      g.strokePath();
    };
    switch (name) {
      case 'pause':
        g.fillRect(-5.5, -7, 3, 14);
        g.fillRect(2.5, -7, 3, 14);
        break;
      case 'left':
        path(4, -8, -4, 0, 4, 8);
        break;
      case 'right':
        path(-4, -8, 4, 0, -4, 8);
        break;
      case 'down':
        path(-8, -4, 0, 4, 8, -4);
        break;
      case 'restart': {
        // An almost-full circle with an arrowhead at its end.
        const r = 7;
        const end = degToRad(-40);
        g.lineStyle(2.5, hex(PALETTE.ink));
        g.beginPath();
        g.arc(0, 0, r, degToRad(20), end, false);
        g.strokePath();
        const ex = r * Math.cos(end);
        const ey = r * Math.sin(end);
        // Tangent (direction of travel) and its normal at the end of the arc.
        const tx = -Math.sin(end);
        const ty = Math.cos(end);
        g.fillTriangle(ex + tx * 5, ey + ty * 5, ex - ty * 4, ey + tx * 4, ex + ty * 4, ey - tx * 4);
        break;
      }
    }
    return g;
  }
}

const degToRad = (deg: number): number => (deg * Math.PI) / 180;

export interface ControlHandlers {
  /** Sends a player action to the game. */
  act(action: Action): void;
  /** Arms the shovel (which pauses the game), or cancels it when it is already armed. */
  toggleShovel(): void;
}

/** Evenly spaced rectangles across the content width, for one row of buttons. */
function rowRects(count: number, y: number, h: number, gap: number): { x: number; y: number; w: number; h: number }[] {
  const total = GAME_W - PAD_X * 2;
  const w = (total - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => ({ x: PAD_X + i * (w + gap), y, w, h }));
}

/** The three rows under the board: piece type, powerups, and move/drop. */
export class ControlPanel {
  private readonly vowel: Button;
  private readonly consonant: Button;
  private readonly filler: Button;
  private readonly wildcard: Button;
  private readonly peek: Button;
  private readonly freeze: Button;
  private readonly shovel: Button;

  constructor(scene: Phaser.Scene, h: ControlHandlers) {
    const gap = LAYOUT.rowGap;
    const sw = (to: SwitchTarget) => (): void => h.act({ type: 'switch', to });

    const [v, c, f] = rowRects(3, LAYOUT.switchY, LAYOUT.switchH, gap);
    this.vowel = new Button(scene, { ...v!, onPress: sw('vowel') });
    this.consonant = new Button(scene, { ...c!, onPress: sw('consonant') });
    this.filler = new Button(scene, { ...f!, onPress: sw('filler') });

    const [wi, pe, fr, sh] = rowRects(4, LAYOUT.powerY, LAYOUT.powerH, 6);
    this.wildcard = new Button(scene, { ...wi!, onPress: () => h.act({ type: 'wildcard' }) });
    this.peek = new Button(scene, { ...pe!, onPress: () => h.act({ type: 'peek' }) });
    this.freeze = new Button(scene, { ...fr!, onPress: () => h.act({ type: 'freeze' }) });
    this.shovel = new Button(scene, { ...sh!, onPress: () => h.toggleShovel() });

    const [l, d, r] = rowRects(3, LAYOUT.moveY, LAYOUT.moveH, gap);
    new Button(scene, { ...l!, icon: 'left', onPress: () => h.act({ type: 'moveLeft' }), repeat: { delay: 220, interval: 75 } });
    new Button(scene, { ...d!, icon: 'down', onPress: () => h.act({ type: 'drop' }), repeat: { delay: 180, interval: 50 } });
    new Button(scene, { ...r!, icon: 'right', onPress: () => h.act({ type: 'moveRight' }), repeat: { delay: 220, interval: 75 } });
  }

  /** Refreshes captions, the selected button and which buttons are available. */
  update(state: GameState, shovelArmed: boolean): void {
    const piece = state.piece;
    const preview = buttonPreview(state);
    // While peek is on, each pool also shows the letter after the next one.
    const peeking = state.peekDropsLeft > 0;
    const captions = powerupCaptions(state.charges);
    const left = (to: SwitchTarget): boolean => piece === null || piece.left.includes(to);

    this.vowel.update({ top: 'Vowel', pool: poolLetters(preview.vowel, peeking), on: piece?.kind === 'vowel', disabled: left('vowel') });
    this.consonant.update({ top: 'Consonant', pool: poolLetters(preview.consonant, peeking), on: piece?.kind === 'consonant', disabled: left('consonant') });
    this.filler.update({ top: 'Filler', bottom: fillerCaption(FILLER_COST), on: piece?.kind === 'filler', disabled: left('filler') });

    const isWild = piece?.kind === 'wildcard';
    const canWild = piece !== null && (piece.kind === 'vowel' || piece.kind === 'consonant') && state.charges.wildcard > 0;
    this.wildcard.update({ top: captions.wildcard, bottom: undefined, on: isWild, disabled: !isWild && !canWild });
    this.peek.update({ top: captions.peek, bottom: undefined, on: peeking, disabled: state.charges.peek < 1 });
    this.freeze.update({ top: captions.freeze, bottom: undefined, on: state.freezeTicksLeft > 0, disabled: state.charges.freeze < 1 });
    this.shovel.update({ top: `Shovel \u2212${SHOVEL_COST}`, bottom: undefined, on: shovelArmed, disabled: false });
  }
}
