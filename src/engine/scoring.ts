import type { DifficultyTier } from '../types/index';
import { getScoreMultiplier } from '../config/difficulty';

const BASE_SCORE = 100;
const PERFECT_SHIFT_MULTIPLIER = 2.5;

export function calcScore(combo: number, difficulty: DifficultyTier): number {
  const multiplier = getScoreMultiplier(difficulty);
  return Math.floor(BASE_SCORE * Math.max(1, combo) * multiplier);
}

export function calcPerfectShiftScore(combo: number, difficulty: DifficultyTier): number {
  const multiplier = getScoreMultiplier(difficulty);
  return Math.floor(BASE_SCORE * Math.max(1, combo) * multiplier * PERFECT_SHIFT_MULTIPLIER);
}

export function calcRawScore(combo: number): number {
  return BASE_SCORE * Math.max(1, combo);
}
