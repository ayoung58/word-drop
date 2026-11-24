// All visual tokens — colors, sizes, radii, fonts.
// No other file may contain hard-coded values for these.

/** Game canvas logical size (mobile-first 360 × 640). */
export const GAME_W = 360;
export const GAME_H = 640;

/** Grid cell size in pixels. 8 × 34 = 272 px wide, 10 × 34 = 340 px tall. */
export const CELL_SIZE = 34;

/** Top-left corner of the grid within the canvas. */
export const GRID_LEFT = Math.round((GAME_W - 8 * CELL_SIZE) / 2); // 44 px
export const GRID_TOP  = 70; // below the score/HUD strip

// ── Palette B: Night Grid ─────────────────────────────────────────────────────
// Swap this block (and only this block) to switch to palette A or C.
export const PALETTE = {
  bg:       '#0f1023', // canvas background
  gridBg:   '#12142a', // empty cell interior
  gridLine: '#1e2040', // grid line
  letter:   '#2a4a8a', // placed letter tile
  filler:   '#1a1a2e', // filler block (darker than bg to feel like a wall)
  wildcard: '#5a2a8a', // wildcard tile
  scored:   '#00e5a0', // closed-word highlight (mint glow)
  open:     '#e5b800', // open-word hint (amber)
  text:     '#e0e4ff', // primary text
  accent:   '#00bfff', // active piece / accent (cyan)
  premium2: '#1a3060', // ×2 premium square tint
  premium3: '#301a60', // ×3 premium square tint
} as const;

export const FONT = {
  tile: "'Courier New', monospace", // replaced with the chosen tile font later
  ui:   "'Segoe UI', sans-serif",
} as const;

/** Single corner radius used for tiles and buttons (px). */
export const RADIUS = 4;

/**
 * Convert a CSS hex color string ('#rrggbb') to the number Phaser's
 * fillStyle / lineStyle expects (0xrrggbb).
 * This keeps the palette strings readable while still feeding Phaser.
 */
export function hex(color: string): number {
  return parseInt(color.replace('#', ''), 16);
}
