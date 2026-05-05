// ─────────────────────────────────────────────
// Global gameplay constants
// ─────────────────────────────────────────────

export const C          = 68;     // cell size px
export const VIS_R      = 6;      // player sees ±3 cells
export const SPAWN_R    = 7;      // enemies spawn at radius 4
export const SHIFT_RANGE = 2;     // SHIFT clears ±2 cells (5×5)
export const MAX_INPUT  = 4;      // max directional inputs per jump
export const MAX_LIVES  = 3;

export const SHAPES  = ['circle', 'square', 'triangle'] as const;
export const COLORS  = ['red', 'blue', 'green', 'yellow'] as const;