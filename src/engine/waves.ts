// src/engine/waves.ts
import type { LobbyConfig, Rule, WaveTrigger, WaveTriggerType, DifficultyTier } from '../types/index';
import { RULES, pickRule } from '../config/rules';
import { THRESHOLD_MULTIPLIER } from '../config/difficulty';

// ─── Base deltas (at Normal difficulty) ──────────────────────────────────────
// Score: 3500 * 1.45^(wave-1) — exponential, lenient early, brutal in endless
// Combo: linear +5 per wave starting at 20 — predictable, inherently harder

export function getScoreDelta(wave: number, tier: DifficultyTier = 'normal'): number {
  const base = Math.round(3500 * Math.pow(1.45, wave - 1));
  return Math.round(base * THRESHOLD_MULTIPLIER[tier]);
}

export function getComboDelta(wave: number, tier: DifficultyTier = 'normal'): number {
  const base = 15 + (wave * 5); // wave 1=20, wave 2=25, wave 3=30 ...
  return Math.round(base * THRESHOLD_MULTIPLIER[tier]);
}

/**
 * Generate a wave trigger.
 * Thresholds are delta-based — always measured from snapshot at wave start —
 * and scaled by difficulty tier.
 */
export function generateWaveTrigger(
  wave: number,
  triggerType: WaveTriggerType,
  waveBaseScore: number = 0,
  waveBaseCombo: number = 0,
  tier: DifficultyTier = 'normal',
): WaveTrigger {
  let type: 'score' | 'combo';

  if (triggerType === 'random') {
    type = Math.random() < 0.5 ? 'score' : 'combo';
  } else {
    type = triggerType;
  }

  const threshold = type === 'score'
    ? waveBaseScore + getScoreDelta(wave, tier)
    : waveBaseCombo + getComboDelta(wave, tier);

  return { type, threshold };
}

export function isWaveTriggerMet(
  trigger: WaveTrigger,
  score: number,
  combo: number,
): boolean {
  if (trigger.type === 'score') return score >= trigger.threshold;
  return combo >= trigger.threshold;
}

/**
 * Rule selection per wave zone:
 * Waves 1–2  → SHAPE_OR_COLOR only (learning)
 * Waves 3–4  → no SHAPE_AND_COLOR (pressure)
 * Waves 5+   → full pool
 * Endless mutations every 5 waves from wave 11
 */
export function pickWaveRule(wave: number, config: LobbyConfig): Rule {
  if (wave <= 2) return RULES['SHAPE_OR_COLOR'];

  if (wave <= 4) {
    const safePool = config.rulePool.filter(id => id !== 'SHAPE_AND_COLOR');
    return pickRule(safePool.length > 0 ? safePool : config.rulePool);
  }

  if (isMutationWave(wave)) return getMutationRule(wave);

  return pickRule(config.rulePool);
}

export function getMutationRule(wave: number): Rule {
  const mutationIndex = Math.floor((wave - 11) / 5);
  const path = ['SHAPE_OR_COLOR', 'SHAPE_ONLY', 'COLOR_ONLY', 'SHAPE_AND_COLOR'];
  return RULES[path[Math.min(mutationIndex, path.length - 1)]];
}

export function isMutationWave(wave: number): boolean {
  return wave > 10 && (wave - 10) % 5 === 1;
}
