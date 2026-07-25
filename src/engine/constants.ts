// ─────────────────────────────────────────────
// Global gameplay constants
// ─────────────────────────────────────────────

export const C          = 68;     // cell size px
export const VIS_R      = 6;      // player sees ±6 cells
export const SPAWN_R    = 7;      // enemies spawn at radius 7
export const SHIFT_RANGE = 2;     // SHIFT clears ±2 cells (5×5)
export const MAX_INPUT  = 4;      // max directional inputs per jump
export const DEFAULT_LIVES         = 3;
export const MAX_SHIFT_CHARGES     = 3;
export const PERFECT_KILLS_PER_CHARGE = 5;
export const INITIAL_ENEMY_COUNT   = 8;
export const SHIFT_COOLDOWN_MS     = 1000;
export const WAVE_BANNER_DELAY_MS  = 1800;
export const WAVE_BANNER_SHOW_MS   = 1400;
export const KNOCKBACK_RANGE       = 2.5;
export const KNOCKBACK_DURATION_MS = 350;
export const KNOCKBACK_TRANSITION  = 'left .3s cubic-bezier(.23,1.4,.32,1), top .3s cubic-bezier(.23,1.4,.32,1)';
export const KNOCKBACK_RESET_TRANSITION = 'left .22s cubic-bezier(.23,1.2,.32,1), top .22s cubic-bezier(.23,1.2,.32,1)';

export const SHAPES  = ['circle', 'square', 'triangle', 'diamond', 'pentagon'] as const;
export const COLORS  = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'lime'] as const;