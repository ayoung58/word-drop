import Phaser from 'phaser';
import { BOARD_H, BOARD_W, fallIntervalMs } from '../../core/config';
import { createGame, step } from '../../core/game';
import { evaluate } from '../../core/scoring';
import type { Action, GameState } from '../../core/types';
import { createDictionary } from '../../core/words';
import { CELL_SIZE, FONT, GAME_W, GRID_LEFT, GRID_TOP, hex, PALETTE } from '../../ui/theme';

// Empty dictionary until public/words/enable.txt is loaded.
// Scoring still works (closed words score 0 until a real dict is wired in).
const DICT = createDictionary([]);

export class Play extends Phaser.Scene {
  private state!: GameState;
  private gfx!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  /** Reusable text objects for letters drawn on placed tiles. */
  private cellTexts: Phaser.GameObjects.Text[] = [];

  constructor() { super('Play'); }

  create(): void {
    // Seed 1 is a fixed start; will be replaced with Date-based daily seed.
    this.state = createGame(1);

    // Static background graphics layer (grid lines stay constant).
    this.gfx = this.add.graphics();

    this.scoreText = this.add
      .text(GAME_W / 2, 16, 'Score: 0', {
        fontSize: '22px',
        color: PALETTE.text,
        fontFamily: FONT.ui,
      })
      .setOrigin(0.5, 0);

    this.infoText = this.add
      .text(GAME_W / 2, 44, '', {
        fontSize: '14px',
        color: PALETTE.accent,
        fontFamily: FONT.ui,
      })
      .setOrigin(0.5, 0);

    this.bindKeys();
    this.draw();

    // Gravity — sends a 'tick' action on a timer.  Delay adjusts with speed.
    this.time.addEvent({
      delay: fallIntervalMs(0),
      loop: true,
      callback: () => this.dispatch({ type: 'tick' }),
    });
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown-LEFT',  () => this.dispatch({ type: 'moveLeft' }));
    kb.on('keydown-RIGHT', () => this.dispatch({ type: 'moveRight' }));
    kb.on('keydown-DOWN',  () => this.dispatch({ type: 'drop' }));
    kb.on('keydown-SPACE', () => this.dispatch({ type: 'drop' }));
    // Piece type switching (Q = vowel, W = consonant, E = filler).
    kb.on('keydown-Q', () => this.dispatch({ type: 'switch', to: 'vowel' }));
    kb.on('keydown-W', () => this.dispatch({ type: 'switch', to: 'consonant' }));
    kb.on('keydown-E', () => this.dispatch({ type: 'switch', to: 'filler' }));
  }

  // ── State ──────────────────────────────────────────────────────────────────

  private dispatch(action: Action): void {
    if (this.state.over) return;
    this.state = step(this.state, action);
    this.draw();
    if (this.state.over) this.scene.start('GameOver');
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private draw(): void {
    // Destroy per-frame letter texts before rebuilding.
    for (const t of this.cellTexts) t.destroy();
    this.cellTexts = [];

    const g = this.gfx;
    g.clear();

    this.drawGrid(g);
    this.drawPremium(g);
    this.drawPlacedCells(g);
    this.drawPiece(g);
    this.updateHUD();
  }

  private drawGrid(g: Phaser.GameObjects.Graphics): void {
    // Grid background.
    g.fillStyle(hex(PALETTE.gridBg));
    g.fillRect(GRID_LEFT, GRID_TOP, BOARD_W * CELL_SIZE, BOARD_H * CELL_SIZE);

    // Grid lines.
    g.lineStyle(1, hex(PALETTE.gridLine));
    for (let r = 0; r <= BOARD_H; r++) {
      g.lineBetween(
        GRID_LEFT, GRID_TOP + r * CELL_SIZE,
        GRID_LEFT + BOARD_W * CELL_SIZE, GRID_TOP + r * CELL_SIZE,
      );
    }
    for (let c = 0; c <= BOARD_W; c++) {
      g.lineBetween(
        GRID_LEFT + c * CELL_SIZE, GRID_TOP,
        GRID_LEFT + c * CELL_SIZE, GRID_TOP + BOARD_H * CELL_SIZE,
      );
    }
  }

  private drawPremium(g: Phaser.GameObjects.Graphics): void {
    for (let r = 0; r < BOARD_H; r++) {
      for (let c = 0; c < BOARD_W; c++) {
        const m = this.state.premium[r]?.[c] ?? 0;
        if (m < 2) continue;
        const color = m === 3 ? PALETTE.premium3 : PALETTE.premium2;
        g.fillStyle(hex(color));
        g.fillRect(
          GRID_LEFT + c * CELL_SIZE + 1,
          GRID_TOP  + r * CELL_SIZE + 1,
          CELL_SIZE - 2, CELL_SIZE - 2,
        );
      }
    }
  }

  private drawPlacedCells(g: Phaser.GameObjects.Graphics): void {
    for (let r = 0; r < BOARD_H; r++) {
      for (let c = 0; c < BOARD_W; c++) {
        const cell = this.state.grid[r][c];
        if (!cell) continue;
        const x = GRID_LEFT + c * CELL_SIZE;
        const y = GRID_TOP  + r * CELL_SIZE;
        g.fillStyle(hex(cell.kind === 'filler' ? PALETTE.filler : PALETTE.letter));
        g.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        if (cell.kind === 'letter') {
          this.cellTexts.push(
            this.add.text(x + CELL_SIZE / 2, y + CELL_SIZE / 2, cell.letter, {
              fontSize: '17px', color: PALETTE.text, fontFamily: FONT.tile,
            }).setOrigin(0.5),
          );
        }
      }
    }
  }

  private drawPiece(g: Phaser.GameObjects.Graphics): void {
    const p = this.state.piece;
    if (!p) return;
    const x = GRID_LEFT + p.col * CELL_SIZE;
    const y = GRID_TOP  + p.row * CELL_SIZE;
    const color = p.kind === 'wildcard' ? PALETTE.wildcard
                : p.kind === 'filler'   ? PALETTE.filler
                : PALETTE.accent;
    g.fillStyle(hex(color));
    g.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    if (p.letter) {
      this.cellTexts.push(
        this.add.text(x + CELL_SIZE / 2, y + CELL_SIZE / 2, p.letter, {
          fontSize: '17px', color: PALETTE.bg, fontFamily: FONT.tile,
        }).setOrigin(0.5),
      );
    }
  }

  private updateHUD(): void {
    const { score } = evaluate(this.state, DICT);
    this.scoreText.setText(`Score: ${score}`);
    const p = this.state.piece;
    if (p) {
      const kind = p.kind.toUpperCase();
      const letter = p.letter ?? '';
      this.infoText.setText(`${kind}  ${letter}  ← → ↓`);
    } else {
      this.infoText.setText('GAME OVER');
    }
  }
}
