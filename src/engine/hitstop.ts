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
    // Extend existing freeze (combo chain) — cap at 1.5× base
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

export function cancelHitstop(): void {
  if (activeTimer !== null) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  applyFreezeVisual(false);
}

function applyFreezeVisual(active: boolean): void {
  document.getElementById('vp')?.classList.toggle('time-freeze', active);
}
