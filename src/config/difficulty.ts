// src/config/difficulty.ts
import type { DifficultyTier, DifficultyConfig, DifficultyCalc } from '../types/index';

export const DIFFICULTY_TIERS: Record<DifficultyTier, DifficultyConfig> = {
  easy:   { tier: 'easy',   marchSpeedMultiplier: 0.75, spawnRateMultiplier: 0.75, scoreMultiplier: 0.5  },
  normal: { tier: 'normal', marchSpeedMultiplier: 1.0,  spawnRateMultiplier: 1.0,  scoreMultiplier: 1.0  },
  hard:   { tier: 'hard',   marchSpeedMultiplier: 1.3,  spawnRateMultiplier: 1.3,  scoreMultiplier: 1.5  },
  brutal: { tier: 'brutal', marchSpeedMultiplier: 1.6,  spawnRateMultiplier: 1.6,  scoreMultiplier: 2.5  },
};

/**
 * March speed — logarithmic decay so early waves feel approachable
 * and the floor is only reached deep into endless mode.
 *
 * Formula: 1200 - 260 * ln(wave + 1), clamped to [450, 1200]
 *
 * Wave 1:  1200ms   Wave 5:  792ms
 * Wave 2:  1034ms   Wave 8:  688ms
 * Wave 3:   933ms   Wave 12: 590ms
 * Wave 4:   855ms   Wave 20: 500ms
 */
function baseMarchTick(wave: number): number {
  return Math.round(Math.max(450, Math.min(1200, 1200 - 260 * Math.log(wave + 1))));
}

/**
 * Spawn count — wave-only scaling, no combo inflation.
 * Combo pressure comes from march speed and trigger thresholds instead.
 *
 * Formula: 2 + floor(wave / 3)
 *
 * Wave 1–2: 2   Wave 6–8: 4   Wave 12–14: 6
 * Wave 3–5: 3   Wave 9–11: 5  Wave 15+:   7
 */
function baseSpawnCount(wave: number): number {
  return 2 + Math.floor(wave / 3);
}

// Small per-rule spawn bonus retained but capped low
const RULE_SPAWN_BONUS: Record<string, number> = {
  SHAPE_OR_COLOR:  0,
  SHAPE_ONLY:      1,
  COLOR_ONLY:      1,
  SHAPE_AND_COLOR: 2,
};

export function getDifficulty(
  tier: DifficultyTier,
  wave: number,
  _combo: number,        // retained in signature for API compat, no longer used in formula
  ruleId = 'SHAPE_OR_COLOR',
): DifficultyCalc {
  const cfg = DIFFICULTY_TIERS[tier];
  const marchTick  = Math.round(baseMarchTick(wave) / cfg.marchSpeedMultiplier);
  const ruleBonus  = RULE_SPAWN_BONUS[ruleId] ?? 0;
  const spawnCount = Math.round((baseSpawnCount(wave) + ruleBonus) * cfg.spawnRateMultiplier);
  return { marchTick, spawnCount };
}

export function getScoreMultiplier(tier: DifficultyTier): number {
  return DIFFICULTY_TIERS[tier].scoreMultiplier;
}
