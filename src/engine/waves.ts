// src/engine/waves.ts
import type { LobbyConfig, Rule, WaveTrigger, WaveTriggerType } from '../types/index';
import { RULES, pickRule } from '../config/rules';

// ─── Wave trigger thresholds ─────────────────────────────────────────────────
// Both use exponential growth from the player-chosen base values.
// Score:  2000 * 1.45^(wave - 1)
// Combo:  floor(20 * 1.15^(wave - 1))
// These are DELTAS — added on top of the snapshot taken at wave start.

export function getScoreDelta(wave: number): number {
  return Math.round(2000 * Math.pow(1.45, wave - 1));
}

export function getComboDelta(wave: number): number {
  return Math.floor(20 * Math.pow(1.15, wave - 1));
}

/**
 * Generate a wave trigger for a given wave number (1-based).
 * waveBaseScore / waveBaseCombo are snapshots taken at the moment the
 * wave starts — threshold = snapshot + delta, so the player always needs
 * to earn the full delta within the wave regardless of prior progress.
 */
export function generateWaveTrigger(
  wave: number,
  triggerType: WaveTriggerType,
  waveBaseScore: number = 0,
  waveBaseCombo: number = 0,
): WaveTrigger {
  let type: 'score' | 'combo';

  if (triggerType === 'random') {
    type = Math.random() < 0.5 ? 'score' : 'combo';
  } else {
    type = triggerType;
  }

  const threshold = type === 'score'
    ? waveBaseScore + getScoreDelta(wave)
    : waveBaseCombo + getComboDelta(wave);

  return { type, threshold };
}

/**
 * Check whether the current wave trigger condition is met.
 * score and combo here are absolute current values — the baseline is
 * already baked into the threshold at wave generation time.
 */
export function isWaveTriggerMet(
  trigger: WaveTrigger,
  score: number,
  combo: number,
): boolean {
  if (trigger.type === 'score') return score >= trigger.threshold;
  return combo >= trigger.threshold;
}

/**
 * Pick the active rule for a given wave.
 * Waves 1–2: SHAPE_OR_COLOR only (locked — learning zone).
 * Waves 3–4: exclude SHAPE_AND_COLOR (pressure zone).
 * Waves 5+:  full pool (endless ready).
 */
export function pickWaveRule(wave: number, config: LobbyConfig): Rule {
  if (wave <= 2) {
    return RULES['SHAPE_OR_COLOR'];
  }

  if (wave <= 4) {
    const safePool = config.rulePool.filter(id => id !== 'SHAPE_AND_COLOR');
    const pool = safePool.length > 0 ? safePool : config.rulePool;
    return pickRule(pool);
  }

  // Wave 5+: full pool; endless mutations override via isMutationWave
  if (isMutationWave(wave)) {
    return getMutationRule(wave);
  }

  return pickRule(config.rulePool);
}

/**
 * Endless mutation escalation path (wave 11+, every 5 waves).
 * SHAPE_OR_COLOR → SHAPE_ONLY / COLOR_ONLY → SHAPE_AND_COLOR
 */
export function getMutationRule(wave: number): Rule {
  const mutationIndex = Math.floor((wave - 11) / 5);
  const path = ['SHAPE_OR_COLOR', 'SHAPE_ONLY', 'COLOR_ONLY', 'SHAPE_AND_COLOR'];
  const id = path[Math.min(mutationIndex, path.length - 1)];
  return RULES[id];
}

/** Returns true if a rule mutation fires at this wave */
export function isMutationWave(wave: number): boolean {
  return wave > 10 && (wave - 10) % 5 === 1;
}
