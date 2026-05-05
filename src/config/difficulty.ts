import type { DifficultyTier, DifficultyConfig, DifficultyCalc } from '../types/index';

export const DIFFICULTY_TIERS: Record<DifficultyTier, DifficultyConfig> = {
  easy: {
    tier: 'easy',
    marchSpeedMultiplier: 0.75,
    spawnRateMultiplier: 0.75,
    scoreMultiplier: 0.5,
  },
  normal: {
    tier: 'normal',
    marchSpeedMultiplier: 1.0,
    spawnRateMultiplier: 1.0,
    scoreMultiplier: 1.0,
  },
  hard: {
    tier: 'hard',
    marchSpeedMultiplier: 1.3,
    spawnRateMultiplier: 1.3,
    scoreMultiplier: 1.5,
  },
  brutal: {
    tier: 'brutal',
    marchSpeedMultiplier: 1.6,
    spawnRateMultiplier: 1.6,
    scoreMultiplier: 2.5,
  },
};

export function getDifficulty(
  tier: DifficultyTier,
  wave: number,
  combo: number
): DifficultyCalc {
  const cfg = DIFFICULTY_TIERS[tier];
  const baseTick = Math.max(450, 1200 - (wave - 1) * 90);
  // Apply march speed multiplier: faster multiplier = shorter tick interval
  const marchTick = Math.round(baseTick / cfg.marchSpeedMultiplier);
  const baseSpawns = 2 + Math.floor(wave / 2);
  const comboSpawns = Math.floor(combo / 12);
  const spawnCount = Math.round((baseSpawns + comboSpawns) * cfg.spawnRateMultiplier);
  return { marchTick, spawnCount };
}

export function getScoreMultiplier(tier: DifficultyTier): number {
  return DIFFICULTY_TIERS[tier].scoreMultiplier;
}