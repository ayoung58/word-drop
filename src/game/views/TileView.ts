import type Phaser from 'phaser';
import { CELL, EDGE, hex, PALETTE, RADIUS } from '../../ui/theme';
import { makeLabel } from './text';

/** Everything the tile needs to know to draw itself. Plain data, so equal looks can be skipped. */
export type TileLook =
  /** `premium` is 0, 2 or 3. */
  | { kind: 'empty'; premium: number }
  /** `word`: part of a scored (closed) word, a valid but open word, or neither. */
  | { kind: 'letter'; letter: string; word: 'none' | 'open' | 'scored'; target: boolean }
  | { kind: 'filler'; target: boolean }
  /** The falling piece: same faces as a placed tile, with the accent border and glow ring. */
  | { kind: 'piece'; face: 'letter' | 'wildcard' | 'filler'; letter: string };

const HALF = CELL / 2;

/**
 * One square on the board (or the falling piece). The container is centred on the tile,
 * so scaling it squashes the tile around its middle.
 */
export class TileView {
  readonly root: Phaser.GameObjects.Container;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private lookKey = '';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.gfx = scene.add.graphics();
    this.label = makeLabel(scene, 0, 0, '', { size: 20 });
    this.root = scene.add.container(x, y, [this.gfx, this.label]);
  }

  setLook(look: TileLook): void {
    const key = JSON.stringify(look);
    if (key === this.lookKey) return;
    this.lookKey = key;
    this.gfx.clear();
    switch (look.kind) {
      case 'empty':
        this.drawEmpty(look.premium);
        break;
      case 'letter':
        this.drawFace(look.word === 'scored' ? PALETTE.ok : look.word === 'open' ? PALETTE.open : PALETTE.tile, look.word === 'scored' ? PALETTE.okBorder : PALETTE.line, look.target);
        this.setText(look.letter, 20, PALETTE.ink);
        break;
      case 'filler':
        this.gfx.fillStyle(hex(PALETTE.fill));
        this.gfx.fillRoundedRect(-HALF, -HALF, CELL, CELL, RADIUS);
        if (look.target) this.strokeBorder(PALETTE.accent, 1);
        this.setText('', 20, PALETTE.ink);
        break;
      case 'piece':
        this.drawPiece(look.face, look.letter);
        break;
    }
  }

  private drawEmpty(premium: number): void {
    const color = premium === 3 ? PALETTE.x3 : premium === 2 ? PALETTE.x2 : PALETTE.empty;
    this.gfx.fillStyle(hex(color));
    this.gfx.fillRoundedRect(-HALF, -HALF, CELL, CELL, RADIUS);
    this.setText(premium > 1 ? `\u00d7${premium}` : '', 11, PALETTE.ink);
  }

  /** A raised tile: a 2 px edge below, the face, and a 1 px border. */
  private drawFace(fill: string, border: string, target: boolean): void {
    this.gfx.fillStyle(hex(PALETTE.shadow));
    this.gfx.fillRoundedRect(-HALF, -HALF + EDGE, CELL, CELL, RADIUS);
    this.gfx.fillStyle(hex(fill));
    this.gfx.fillRoundedRect(-HALF, -HALF, CELL, CELL, RADIUS);
    this.strokeBorder(target ? PALETTE.accent : border, 1);
  }

  private drawPiece(face: 'letter' | 'wildcard' | 'filler', letter: string): void {
    // Glow ring first, so the tile sits on top of it.
    this.gfx.lineStyle(3, hex(PALETTE.glow));
    this.gfx.strokeRoundedRect(-HALF - 2.5, -HALF - 2.5, CELL + 5, CELL + 5, RADIUS + 2);
    this.gfx.fillStyle(hex(PALETTE.shadow));
    this.gfx.fillRoundedRect(-HALF, -HALF + EDGE, CELL, CELL, RADIUS);
    this.gfx.fillStyle(hex(face === 'filler' ? PALETTE.fill : PALETTE.tile));
    this.gfx.fillRoundedRect(-HALF, -HALF, CELL, CELL, RADIUS);
    this.strokeBorder(PALETTE.accent, 2);
    this.setText(face === 'filler' ? '' : letter, 20, face === 'wildcard' ? PALETTE.accent : PALETTE.ink);
  }

  /** Strokes inside the tile edge so the border never grows the tile. */
  private strokeBorder(color: string, width: number): void {
    this.gfx.lineStyle(width, hex(color));
    const inset = width / 2;
    this.gfx.strokeRoundedRect(-HALF + inset, -HALF + inset, CELL - width, CELL - width, RADIUS);
  }

  private setText(text: string, size: number, color: string): void {
    this.label.setText(text).setFontSize(size).setColor(color);
  }
}
