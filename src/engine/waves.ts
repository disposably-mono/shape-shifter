// src/engine/waves.ts
import type { LobbyConfig, Rule, WaveTrigger, WaveTriggerType } from '../types/index';
import { RULES, pickRule, getMutatedRule } from '../config/rules';

// Delta thresholds — added on top of whatever score/combo the player has
// when the wave starts, so requirements always feel meaningful.
const WAVE_SCORE_DELTAS = [500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000, 20000];
const WAVE_COMBO_DELTAS = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];

/**
 * Generate a wave trigger for a given wave index (0-based).
 * currentScore / currentCombo are the player's values at the moment of
 * wave transition — the threshold is set to current + delta, so the
 * requirement is always additive on top of what's already been earned.
 */
export function generateWaveTrigger(
  wave: number,
  triggerType: WaveTriggerType,
  currentScore: number = 0,
  currentCombo: number = 0,
): WaveTrigger {
  const idx = Math.min(wave, WAVE_SCORE_DELTAS.length - 1);
  let type: 'score' | 'combo';

  if (triggerType === 'random') {
    type = Math.random() < 0.5 ? 'score' : 'combo';
  } else {
    type = triggerType;
  }

  const delta = type === 'score'
    ? WAVE_SCORE_DELTAS[idx]
    : WAVE_COMBO_DELTAS[idx];

  const base = type === 'score' ? currentScore : currentCombo;
  const threshold = base + delta;

  return { type, threshold };
}

/** Check whether the current wave trigger condition is met */
export function isWaveTriggerMet(
  trigger: WaveTrigger,
  score: number,
  combo: number
): boolean {
  if (trigger.type === 'score') return score >= trigger.threshold;
  return combo >= trigger.threshold;
}

/** Pick the active rule for a given wave from the config's rule pool */
export function pickWaveRule(wave: number, config: LobbyConfig): Rule {
  if (wave <= 10) {
    return pickRule(config.rulePool);
  }
  const mutationIndex = Math.floor((wave - 11) / 5);
  const mutationPath = ['SHAPE_OR_COLOR', 'SHAPE_ONLY', 'COLOR_ONLY', 'SHAPE_AND_COLOR'];
  const id = mutationPath[Math.min(mutationIndex, mutationPath.length - 1)];
  return RULES[id];
}

/** Returns true if a rule mutation fires at this wave */
export function isMutationWave(wave: number): boolean {
  return wave > 10 && (wave - 10) % 5 === 1;
}
