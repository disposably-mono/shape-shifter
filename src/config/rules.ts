import type { Rule } from '../types/index';

export const RULES: Record<string, Rule> = {
  SHAPE_OR_COLOR: {
    id: 'SHAPE_OR_COLOR',
    label: 'Same <b>SHAPE</b> or <b>COLOR</b>',
    description: 'Eliminate enemies that share your shape or your colour.',
    difficulty: 1,
    check: (e, p) => e.shape === p.shape || e.color === p.color,
  },
  SHAPE_ONLY: {
    id: 'SHAPE_ONLY',
    label: 'Same <b>SHAPE</b> only',
    description: 'Only enemies that match your exact shape can be eliminated.',
    difficulty: 2,
    check: (e, p) => e.shape === p.shape,
  },
  COLOR_ONLY: {
    id: 'COLOR_ONLY',
    label: 'Same <b>COLOR</b> only',
    description: 'Only enemies that match your exact colour can be eliminated.',
    difficulty: 2,
    check: (e, p) => e.color === p.color,
  },
  SHAPE_AND_COLOR: {
    id: 'SHAPE_AND_COLOR',
    label: 'Same <b>SHAPE</b> and <b>COLOR</b>',
    description: 'Only enemies that match both your shape and colour can be eliminated.',
    difficulty: 3,
    check: (e, p) => e.shape === p.shape && e.color === p.color,
  },
};

export const RULE_POOL = Object.values(RULES);

/**
 * Endless mode mutation escalation path.
 * Every 5 waves past wave 10, escalate the rule difficulty.
 */
export const MUTATION_PATH: string[] = [
  'SHAPE_OR_COLOR',
  'SHAPE_ONLY',
  'COLOR_ONLY',
  'SHAPE_AND_COLOR',
];

/** Pick a random rule from a given ID pool */
export function pickRule(ruleIds: string[]): Rule {
  const valid = ruleIds.filter(id => RULES[id]);
  if (!valid.length) return RULES['SHAPE_OR_COLOR'];
  return RULES[valid[Math.floor(Math.random() * valid.length)]];
}

/** Get the next mutation rule given the current one */
export function getMutatedRule(currentRuleId: string): Rule {
  const idx = MUTATION_PATH.indexOf(currentRuleId);
  if (idx === -1 || idx >= MUTATION_PATH.length - 1) {
    return RULES['SHAPE_AND_COLOR'];
  }
  return RULES[MUTATION_PATH[idx + 1]];
}