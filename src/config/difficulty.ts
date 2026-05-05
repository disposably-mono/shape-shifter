import type { DifficultyTier, DifficultyConfig, DifficultyCalc } from '../types/index';

export const DIFFICULTY_TIERS: Record<DifficultyTier, DifficultyConfig> = {
  easy:   { tier: 'easy',   marchSpeedMultiplier: 0.75, spawnRateMultiplier: 0.75, scoreMultiplier: 0.5  },
  normal: { tier: 'normal', marchSpeedMultiplier: 1.0,  spawnRateMultiplier: 1.0,  scoreMultiplier: 1.0  },
  hard:   { tier: 'hard',   marchSpeedMultiplier: 1.3,  spawnRateMultiplier: 1.3,  scoreMultiplier: 1.5  },
  brutal: { tier: 'brutal', marchSpeedMultiplier: 1.6,  spawnRateMultiplier: 1.6,  scoreMultiplier: 2.5  },
};

const RULE_SPAWN_BONUS: Record<string, number> = {
  SHAPE_OR_COLOR: 0,
  SHAPE_ONLY:     2,
  COLOR_ONLY:     2,
};

export function getDifficulty(
  tier: DifficultyTier,
  wave: number,
  combo: number,
  ruleId = 'SHAPE_OR_COLOR'
): DifficultyCalc {
  const cfg = DIFFICULTY_TIERS[tier];
  const baseTick   = Math.max(450, 1200 - (wave - 1) * 90);
  const marchTick  = Math.round(baseTick / cfg.marchSpeedMultiplier);
  const baseSpawns = 2 + Math.floor(wave / 2);
  const comboBonus = Math.floor(combo / 12);
  const ruleBonus  = RULE_SPAWN_BONUS[ruleId] ?? 0;
  const spawnCount = Math.round((baseSpawns + comboBonus + ruleBonus) * cfg.spawnRateMultiplier);
  return { marchTick, spawnCount };
}

export function getScoreMultiplier(tier: DifficultyTier): number {
  return DIFFICULTY_TIERS[tier].scoreMultiplier;
}
