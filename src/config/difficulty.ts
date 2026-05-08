// src/config/difficulty.ts
import type { DifficultyTier, DifficultyConfig, DifficultyCalc } from '../types/index';

// ─── BPM-based march ticks ───────────────────────────────────────────────────
// marchTick (ms) = 60000 / BPM
//
//  Easy   →  60 BPM → 1000ms  lo-fi / slow hip-hop
//  Normal →  80 BPM →  750ms  mid-tempo
//  Hard   → 100 BPM →  600ms  uptempo
//  Brutal → 120 BPM →  500ms  drum & bass

const BPM_MARCH_TICK: Record<DifficultyTier, number> = {
  easy:   1000,  //  60 BPM
  normal:  750,  //  80 BPM
  hard:    600,  // 100 BPM
  brutal:  500,  // 120 BPM
};

export const DIFFICULTY_TIERS: Record<DifficultyTier, DifficultyConfig> = {
  easy:   { tier: 'easy',   marchSpeedMultiplier: 1.0, spawnRateMultiplier: 0.75, scoreMultiplier: 0.5  },
  normal: { tier: 'normal', marchSpeedMultiplier: 1.0, spawnRateMultiplier: 1.0,  scoreMultiplier: 1.0  },
  hard:   { tier: 'hard',   marchSpeedMultiplier: 1.0, spawnRateMultiplier: 1.3,  scoreMultiplier: 1.5  },
  brutal: { tier: 'brutal', marchSpeedMultiplier: 1.0, spawnRateMultiplier: 1.6,  scoreMultiplier: 2.5  },
};

// Wave trigger threshold multiplier per tier.
// Score per kill already scales with difficulty (0.5–2.5×), so score thresholds
// must be calibrated against that rate. Combo thresholds don't benefit from score
// multipliers, so brutal combo is intentionally lower than score might suggest.
export const THRESHOLD_MULTIPLIER: Record<DifficultyTier, number> = {
  easy:   0.65,
  normal: 1.0,
  hard:   1.35,
  brutal: 1.75,
};

const RULE_SPAWN_BONUS: Record<string, number> = {
  SHAPE_OR_COLOR:  0,
  SHAPE_ONLY:      1,
  COLOR_ONLY:      1,
  SHAPE_AND_COLOR: 2,
};

// Base spawn count: wave-only scaling, no combo inflation
function baseSpawnCount(wave: number): number {
  return 2 + Math.floor(wave / 3);
}

// Endless spawn pressure: +5% per wave beyond wave 10, capped at 3×
function endlessMultiplier(wave: number): number {
  if (wave <= 10) return 1;
  return Math.min(3, Math.pow(1.05, wave - 10));
}

export function getDifficulty(
  tier: DifficultyTier,
  wave: number,
  _combo: number,
  ruleId = 'SHAPE_OR_COLOR',
): DifficultyCalc {
  const cfg       = DIFFICULTY_TIERS[tier];
  const marchTick = BPM_MARCH_TICK[tier];
  const ruleBonus  = RULE_SPAWN_BONUS[ruleId] ?? 0;
  const spawnCount = Math.round(
    (baseSpawnCount(wave) + ruleBonus) * cfg.spawnRateMultiplier * endlessMultiplier(wave)
  );
  return { marchTick, spawnCount };
}

export function getScoreMultiplier(tier: DifficultyTier): number {
  return DIFFICULTY_TIERS[tier].scoreMultiplier;
}
