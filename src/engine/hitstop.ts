import type { DifficultyTier } from '../types/index';

// Duration scales inversely with difficulty — fast games need shorter pauses
// to maintain pressure, slow games get longer pauses for satisfaction
const HITSTOP_DURATION: Record<DifficultyTier, number> = {
  easy:   220,
  normal: 160,
  hard:   100,
  brutal: 60,
};

// On exact-match (bonus) kills, add a bit extra for impact
const BONUS_MULTIPLIER = 1.35;

let activeTimer: ReturnType<typeof setTimeout> | null = null;
let pauseFn:  (() => void) | null = null;
let resumeFn: (() => void) | null = null;

export function initHitstop(pause: () => void, resume: () => void): void {
  pauseFn  = pause;
  resumeFn = resume;
}

export function triggerHitstop(tier: DifficultyTier, bonus = false): void {
  const base     = HITSTOP_DURATION[tier];
  const duration = bonus ? Math.round(base * BONUS_MULTIPLIER) : base;

  if (activeTimer !== null) {
    // Extend existing freeze (combo chain) — resets the timer to full
    // duration on every kill. There is no cap/accumulation: back-to-back
    // kills just keep pushing the freeze's end further out.
    clearTimeout(activeTimer);
  } else {
    pauseFn?.();
    applyFreezeVisual(true);
  }

  activeTimer = setTimeout(() => {
    activeTimer = null;
    applyFreezeVisual(false);
    resumeFn?.();
  }, duration);
}

export function isHitstopActive(): boolean {
  return activeTimer !== null;
}

/**
 * Cancels any pending hitstop freeze.
 *
 * @param skipResume When true (used by external callers like the march
 *   timer's stopMarchTimer(), which is already tearing things down for a
 *   wave transition or win/lose), the freeze is cleared WITHOUT invoking
 *   resumeFn — otherwise resuming here would immediately recreate the march
 *   interval that the caller just stopped.
 */
export function cancelHitstop(skipResume = false): void {
  const wasActive = activeTimer !== null;
  if (activeTimer !== null) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  applyFreezeVisual(false);
  if (wasActive && !skipResume) {
    resumeFn?.();
  }
}

function applyFreezeVisual(active: boolean): void {
  document.getElementById('vp')?.classList.toggle('time-freeze', active);
}
