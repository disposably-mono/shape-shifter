// src/engine/waves.ts
import type { LobbyConfig, Rule, WaveTrigger, WaveTriggerType, DifficultyTier } from '../types/index';
import { RULES, MUTATION_PATH, pickRule } from '../config/rules';
import { THRESHOLD_MULTIPLIER } from '../config/difficulty';

// ─── Base deltas (at Normal difficulty) ──────────────────────────────────────
//
// Score: two-regime exponential.
//   Waves 1–5  : 3000 × 1.42^(wave-1)  → 3 000 / 4 260 / 6 049 / 8 589 / 12 196
//   Waves 6+   : anchor at wave-5 value, grow at 1.28×/wave instead of 1.42×
//                so endless thresholds stay reachable deep into a run.
//
// Combo: linear up to wave 10, then near-flat to stay feasible in endless.
//   Waves 1–10 : 15 + wave × 4  → 19 … 55
//   Waves 11+  : 55 + floor((wave-10)/3)  → grows by 1 every 3 waves

export function getScoreDelta(wave: number, tier: DifficultyTier = 'normal'): number {
  let base: number;
  if (wave <= 5) {
    base = Math.round(3000 * Math.pow(1.42, wave - 1));
  } else {
    const wave5 = Math.round(3000 * Math.pow(1.42, 4)); // ≈ 12 196
    base = Math.round(wave5 * Math.pow(1.28, wave - 5));
  }
  return Math.round(base * THRESHOLD_MULTIPLIER[tier]);
}

export function getComboDelta(wave: number, tier: DifficultyTier = 'normal'): number {
  const base = wave <= 10
    ? 15 + wave * 4
    : 55 + Math.floor((wave - 10) / 3);
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
  const ruleId = MUTATION_PATH[Math.min(mutationIndex, MUTATION_PATH.length - 1)];
  return RULES[ruleId];
}

export function isMutationWave(wave: number): boolean {
  return wave > 10 && (wave - 10) % 5 === 1;
}
