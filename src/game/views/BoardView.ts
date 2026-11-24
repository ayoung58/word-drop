import type Phaser from 'phaser';
import { BOARD_H, BOARD_W } from '../../core/config';
import type { GameState, WordHit } from '../../core/types';
import { BOARD_PX_H, BOARD_PX_W, cellAtPoint, cellCenter, LAYOUT } from '../../ui/theme';
import { TileView } from './TileView';
import type { TileLook } from './TileView';

type WordMark = 'scored' | 'open';

/** Draws the grid and the falling piece from a GameState, and plays the tile animations. */
export class BoardView {
  private readonly tiles: TileView[][] = [];
  private readonly piece: TileView;
  private pieceTween: Phaser.Tweens.Tween | null = null;
  private lastPiece: { row: number; col: number } | null = null;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, onCellTap: (row: number, col: number) => void) {
    this.scene = scene;
    for (let r = 0; r < BOARD_H; r++) {
      const line: TileView[] = [];
      for (let c = 0; c < BOARD_W; c++) {
        const { x, y } = cellCenter(r, c);
        line.push(new TileView(scene, x, y));
      }
      this.tiles.push(line);
    }
    // Created after the cells so the piece is drawn on top of them.
    this.piece = new TileView(scene, 0, 0);
    this.piece.root.setVisible(false);

    // One touch zone over the whole board; it is only used to pick a tile for the shovel.
    scene.add
      .zone(LAYOUT.boardX + BOARD_PX_W / 2, LAYOUT.boardY + BOARD_PX_H / 2, BOARD_PX_W, BOARD_PX_H)
      .setInteractive()
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const hit = cellAtPoint(pointer.x, pointer.y);
        if (hit) onCellTap(hit.row, hit.col);
      });
  }

  /**
   * Draws the state. `words` colors the letters: green for scored words, yellow for valid words
   * that are not closed yet. `targeting` outlines every tile while the shovel is armed.
   */
  render(state: GameState, words: readonly WordHit[], targeting: boolean): void {
    const marks = this.markWords(words);
    for (let r = 0; r < BOARD_H; r++) {
      for (let c = 0; c < BOARD_W; c++) {
        const cell = state.grid[r]?.[c] ?? null;
        let look: TileLook;
        if (cell === null) look = { kind: 'empty', premium: state.premium[r]?.[c] ?? 0 };
        else if (cell.kind === 'filler') look = { kind: 'filler', target: targeting };
        else look = { kind: 'letter', letter: cell.letter, word: marks.get(`${r},${c}`) ?? 'none', target: targeting };
        this.tiles[r]?.[c]?.setLook(look);
      }
    }
    this.renderPiece(state);
  }

  /** The tile at the landing cell squashes, like a soft thud. */
  landed(row: number, col: number): void {
    const tile = this.tiles[row]?.[col];
    if (tile) this.bump(tile, 1.14, 0.78, 70, 0);
  }

  /** Letters of a scored word pulse one after another. `strength` is 1 for a normal word and up to 2 for a long one. */
  wordScored(cells: readonly [number, number][], strength: number): void {
    const size = 1 + 0.1 * strength;
    cells.forEach(([r, c], i) => {
      const tile = this.tiles[r]?.[c];
      if (tile) this.bump(tile, size, size, 110, i * 45);
    });
  }

  /** The tiles above a removed tile drop one cell, so they squash a little. */
  shoveled(row: number, col: number): void {
    for (let r = 0; r <= row; r++) {
      const tile = this.tiles[r]?.[col];
      if (tile) this.bump(tile, 0.85, 1.1, 90, (row - r) * 25);
    }
  }

  private renderPiece(state: GameState): void {
    const p = state.piece;
    if (!p) {
      this.piece.root.setVisible(false);
      this.lastPiece = null;
      return;
    }
    this.piece.setLook({ kind: 'piece', face: p.kind === 'filler' ? 'filler' : p.kind === 'wildcard' ? 'wildcard' : 'letter', letter: p.letter ?? '' });
    const { x, y } = cellCenter(p.row, p.col);
    const root = this.piece.root;
    // Glide when the piece moves one step down or sideways; snap when it spawns or restarts at the top.
    const last = this.lastPiece;
    const oneStep = root.visible && last !== null && p.row - last.row >= 0 && p.row - last.row <= 1 && Math.abs(p.col - last.col) <= 1;
    this.pieceTween?.stop();
    this.pieceTween = null;
    root.setVisible(true);
    if (oneStep) this.pieceTween = this.scene.tweens.add({ targets: root, x, y, duration: 60, ease: 'Linear' });
    else root.setPosition(x, y);
    this.lastPiece = { row: p.row, col: p.col };
  }

  private markWords(words: readonly WordHit[]): Map<string, WordMark> {
    const marks = new Map<string, WordMark>();
    for (const w of words) {
      for (const [r, c] of w.cells) {
        const key = `${r},${c}`;
        // A letter shared by a scored word and an open word counts as scored.
        if (w.closed) marks.set(key, 'scored');
        else if (!marks.has(key)) marks.set(key, 'open');
      }
    }
    return marks;
  }

  /** Scales a tile to (sx, sy) and back, from its resting size. */
  private bump(tile: TileView, sx: number, sy: number, duration: number, delay: number): void {
    this.scene.tweens.killTweensOf(tile.root);
    tile.root.setScale(1);
    this.scene.tweens.add({ targets: tile.root, scaleX: sx, scaleY: sy, duration, delay, yoyo: true, ease: 'Quad.easeOut' });
  }
}