// ─────────────────────────────────────────────
// Design token colours — PRD §3.1
// ─────────────────────────────────────────────

export const TOKENS = {
  darkTeal:       '#073b4c',
  oceanBlue:      '#118ab2',
  emerald:        '#06d6a0',
  goldenPollen:   '#ffd166',
  bubblegumPink:  '#ef476f',
  white:          '#ffffff',
  off:            '#a8c5d0',
  hudBg:          '#052535',
  hudBorder:      '#0e4d66',
  cellA:          '#062030',
  cellB:          '#072840',
} as const;

/** Maps game colour names to CSS hex values */
export const COLOR_CSS: Record<string, string> = {
  red:    '#ef476f',   // bubblegum-pink as red stand-in
  blue:   '#118ab2',   // ocean-blue
  green:  '#06d6a0',   // emerald
  yellow: '#ffd166',   // golden-pollen
};

/** CSS variable declarations — inject into :root */
export const CSS_VARS = `
  --dark-teal:      ${TOKENS.darkTeal};
  --ocean-blue:     ${TOKENS.oceanBlue};
  --emerald:        ${TOKENS.emerald};
  --golden-pollen:  ${TOKENS.goldenPollen};
  --bubblegum-pink: ${TOKENS.bubblegumPink};
  --white:          ${TOKENS.white};
  --off:            ${TOKENS.off};
  --hud-bg:         ${TOKENS.hudBg};
  --hud-border:     ${TOKENS.hudBorder};
  --cell-a:         ${TOKENS.cellA};
  --cell-b:         ${TOKENS.cellB};
`;