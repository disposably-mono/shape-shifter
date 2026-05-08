import type { Rule, Color } from '../types/index';

// Compound colors and the base colors they absorb
const COLOR_COMPONENTS: Partial<Record<Color, Color[]>> = {
  purple: ['red', 'blue'],
  orange: ['red', 'yellow'],
  cyan:   ['blue', 'green'],
  lime:   ['green', 'yellow'],
};

// One-directional: compound player color kills its components; base colors don't kill compounds
function colorMatches(playerColor: Color, enemyColor: Color): boolean {
  if (playerColor === enemyColor) return true;
  return (COLOR_COMPONENTS[playerColor] ?? []).includes(enemyColor);
}

export const RULES: Record<string, Rule> = {
  SHAPE_OR_COLOR: {
    id: 'SHAPE_OR_COLOR',
    label: 'Same <b>SHAPE</b> or <b>COLOR</b>',
    description: 'Eliminate enemies that share your shape or your colour.',
    difficulty: 1,
    check: (e, p) => e.shape === p.shape || colorMatches(p.color as Color, e.color as Color),
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
    check: (e, p) => colorMatches(p.color as Color, e.color as Color),
  },
  // SHAPE_AND_COLOR removed from playable pool.
  // It is only used internally to detect bonus SHIFT kills.
};

export const RULE_POOL = Object.values(RULES);

/** Weighted rule selection — SHAPE_OR_COLOR is 3× more likely than the others */
export const RULE_WEIGHTS: Record<string, number> = {
  SHAPE_OR_COLOR: 3,
  SHAPE_ONLY:     1,
  COLOR_ONLY:     1,
};

/** Pick a rule from a given ID pool using weights */
export function pickRule(ruleIds: string[]): Rule {
  const valid = ruleIds.filter(id => RULES[id]);
  if (!valid.length) return RULES['SHAPE_OR_COLOR'];

  const totalWeight = valid.reduce((s, id) => s + (RULE_WEIGHTS[id] ?? 1), 0);
  let r = Math.random() * totalWeight;
  for (const id of valid) {
    r -= RULE_WEIGHTS[id] ?? 1;
    if (r <= 0) return RULES[id];
  }
  return RULES[valid[0]];
}

/** Endless mode mutation path — never reaches SHAPE_AND_COLOR */
export const MUTATION_PATH: string[] = [
  'SHAPE_OR_COLOR',
  'SHAPE_ONLY',
  'COLOR_ONLY',
];

export function getMutatedRule(currentRuleId: string): Rule {
  const idx = MUTATION_PATH.indexOf(currentRuleId);
  if (idx === -1 || idx >= MUTATION_PATH.length - 1) {
    return RULES['COLOR_ONLY'];
  }
  return RULES[MUTATION_PATH[idx + 1]];
}

/** True if the enemy is an exact match (bonus SHIFT condition) */
export function isExactMatch(
  enemy: { shape: string; color: string },
  player: { shape: string; color: string }
): boolean {
  return enemy.shape === player.shape && enemy.color === player.color;
}
