import type { LobbyConfig, Rule, WaveTrigger, WaveTriggerType } from '../types/index';
import { RULES, pickRule, getMutatedRule } from '../config/rules';

const WAVE_SCORE_THRESHOLDS  = [500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000, 20000];
const WAVE_COMBO_THRESHOLDS  = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];

/** Generate a wave trigger for a given wave index (0-based) */
export function generateWaveTrigger(
  wave: number,
  triggerType: WaveTriggerType
): WaveTrigger {
  const idx = Math.min(wave, WAVE_SCORE_THRESHOLDS.length - 1);
  let type: 'score' | 'combo';

  if (triggerType === 'random') {
    type = Math.random() < 0.5 ? 'score' : 'combo';
  } else {
    type = triggerType;
  }

  const threshold = type === 'score'
    ? WAVE_SCORE_THRESHOLDS[idx]
    : WAVE_COMBO_THRESHOLDS[idx];

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
  // Waves 1–10: pick from pool
  if (wave <= 10) {
    return pickRule(config.rulePool);
  }
  // Endless: start from SHAPE_OR_COLOR, escalate every 5 waves
  const mutationIndex = Math.floor((wave - 11) / 5);
  const mutationPath = ['SHAPE_OR_COLOR', 'SHAPE_ONLY', 'COLOR_ONLY', 'SHAPE_AND_COLOR'];
  const id = mutationPath[Math.min(mutationIndex, mutationPath.length - 1)];
  return RULES[id];
}

/** Returns true if a rule mutation fires at this wave */
export function isMutationWave(wave: number): boolean {
  return wave > 10 && (wave - 10) % 5 === 1;
}