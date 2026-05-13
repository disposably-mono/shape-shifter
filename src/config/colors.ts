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

/** Maps game colour names to CSS hex values — mutated by applyPalette at runtime */
export const COLOR_CSS: Record<string, string> = {
  red:    '#ef476f',
  blue:   '#118ab2',
  green:  '#06d6a0',
  yellow: '#ffd166',
  purple: '#a855f7',
  orange: '#f97316',
  cyan:   '#22d3ee',
  lime:   '#bef264',
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

// ─── Palette system ───────────────────────────────────────────────────────────

export interface Palette {
  id:            string;
  name:          string;
  description:   string;
  darkTeal:      string;
  oceanBlue:     string;
  emerald:       string;
  goldenPollen:  string;
  bubblegumPink: string;
  white:         string;
  off:           string;
  hudBg:         string;
  hudBorder:     string;
  cellA:         string;
  cellB:         string;
  panelBg:       string;
  overlayBg:     string;
  colorRed:      string;
  colorBlue:     string;
  colorGreen:    string;
  colorYellow:   string;
  colorPurple:   string;
  colorOrange:   string;
  colorCyan:     string;
  colorLime:     string;
}

export const PALETTES: Palette[] = [
  {
    id: 'teal', name: 'NEON', description: 'Classic high-readability arcade teal.',
    darkTeal:      '#073b4c',
    oceanBlue:     '#118ab2',
    emerald:       '#06d6a0',
    goldenPollen:  '#ffd166',
    bubblegumPink: '#ef476f',
    white:         '#ffffff',
    off:           '#a8c5d0',
    hudBg:         '#052535',
    hudBorder:     '#0e4d66',
    cellA:         '#062030',
    cellB:         '#072840',
    panelBg:       'rgba(5,37,53,0.90)',
    overlayBg:     'rgba(7,59,76,0.94)',
    colorRed:      '#ef476f',
    colorBlue:     '#118ab2',
    colorGreen:    '#06d6a0',
    colorYellow:   '#ffd166',
    colorPurple:   '#a855f7',
    colorOrange:   '#f97316',
    colorCyan:     '#22d3ee',
    colorLime:     '#bef264',
  },
  {
    id: 'dusk', name: 'AURORA', description: 'Cool violet field with bright readable pieces.',
    darkTeal:      '#111827',
    oceanBlue:     '#38bdf8',
    emerald:       '#34d399',
    goldenPollen:  '#fbbf24',
    bubblegumPink: '#f472b6',
    white:         '#f8fafc',
    off:           '#c4b5fd',
    hudBg:         '#0b1020',
    hudBorder:     '#334155',
    cellA:         '#101423',
    cellB:         '#161a2e',
    panelBg:       'rgba(11,16,32,0.92)',
    overlayBg:     'rgba(17,24,39,0.94)',
    colorRed:      '#fb7185',
    colorBlue:     '#60a5fa',
    colorGreen:    '#34d399',
    colorYellow:   '#facc15',
    colorPurple:   '#c084fc',
    colorOrange:   '#fb923c',
    colorCyan:     '#67e8f9',
    colorLime:     '#a3e635',
  },
  {
    id: 'amber', name: 'EMBER', description: 'Warm interface, cool enemy contrast.',
    darkTeal:      '#19130b',
    oceanBlue:     '#0ea5e9',
    emerald:       '#f59e0b',
    goldenPollen:  '#fde68a',
    bubblegumPink: '#fb7185',
    white:         '#fff7ed',
    off:           '#d6b98b',
    hudBg:         '#120d08',
    hudBorder:     '#62411b',
    cellA:         '#100b07',
    cellB:         '#1a1209',
    panelBg:       'rgba(18,13,8,0.92)',
    overlayBg:     'rgba(25,19,11,0.94)',
    colorRed:      '#f87171',
    colorBlue:     '#38bdf8',
    colorGreen:    '#4ade80',
    colorYellow:   '#fde047',
    colorPurple:   '#c084fc',
    colorOrange:   '#fb923c',
    colorCyan:     '#22d3ee',
    colorLime:     '#a3e635',
  },
  {
    id: 'crimson', name: 'PULSE', description: 'Danger-forward red UI without losing color IDs.',
    darkTeal:      '#18070d',
    oceanBlue:     '#22d3ee',
    emerald:       '#fb7185',
    goldenPollen:  '#fbbf24',
    bubblegumPink: '#e879f9',
    white:         '#fff1f2',
    off:           '#fecdd3',
    hudBg:         '#100409',
    hudBorder:     '#5f1728',
    cellA:         '#0c0307',
    cellB:         '#16060c',
    panelBg:       'rgba(16,4,9,0.92)',
    overlayBg:     'rgba(24,7,13,0.94)',
    colorRed:      '#f43f5e',
    colorBlue:     '#38bdf8',
    colorGreen:    '#22c55e',
    colorYellow:   '#fde047',
    colorPurple:   '#d946ef',
    colorOrange:   '#fb923c',
    colorCyan:     '#67e8f9',
    colorLime:     '#a3e635',
  },
  {
    id: 'void', name: 'PRISM', description: 'Neutral dark field with maximum piece separation.',
    darkTeal:      '#09090b',
    oceanBlue:     '#3b82f6',
    emerald:       '#14b8a6',
    goldenPollen:  '#eab308',
    bubblegumPink: '#ec4899',
    white:         '#f4f4f5',
    off:           '#a1a1aa',
    hudBg:         '#050507',
    hudBorder:     '#27272a',
    cellA:         '#08080a',
    cellB:         '#101014',
    panelBg:       'rgba(5,5,7,0.94)',
    overlayBg:     'rgba(9,9,11,0.96)',
    colorRed:      '#ff4b5c',
    colorBlue:     '#3b82f6',
    colorGreen:    '#22c55e',
    colorYellow:   '#facc15',
    colorPurple:   '#a855f7',
    colorOrange:   '#f97316',
    colorCyan:     '#06b6d4',
    colorLime:     '#84cc16',
  },
];

const PALETTE_KEY = 'ss_palette';

export function applyPalette(p: Palette): void {
  const r = document.documentElement;
  r.style.setProperty('--dark-teal',      p.darkTeal);
  r.style.setProperty('--ocean-blue',     p.oceanBlue);
  r.style.setProperty('--emerald',        p.emerald);
  r.style.setProperty('--golden-pollen',  p.goldenPollen);
  r.style.setProperty('--bubblegum-pink', p.bubblegumPink);
  r.style.setProperty('--white',          p.white);
  r.style.setProperty('--off',            p.off);
  r.style.setProperty('--hud-bg',         p.hudBg);
  r.style.setProperty('--hud-border',     p.hudBorder);
  r.style.setProperty('--cell-a',         p.cellA);
  r.style.setProperty('--cell-b',         p.cellB);
  r.style.setProperty('--panel-bg',       p.panelBg);
  r.style.setProperty('--overlay-bg',     p.overlayBg);

  COLOR_CSS.red    = p.colorRed;
  COLOR_CSS.blue   = p.colorBlue;
  COLOR_CSS.green  = p.colorGreen;
  COLOR_CSS.yellow = p.colorYellow;
  COLOR_CSS.purple = p.colorPurple;
  COLOR_CSS.orange = p.colorOrange;
  COLOR_CSS.cyan   = p.colorCyan;
  COLOR_CSS.lime   = p.colorLime;

  localStorage.setItem(PALETTE_KEY, p.id);
  document.dispatchEvent(new CustomEvent('palettechange'));
}

export function loadSavedPalette(): void {
  const saved = localStorage.getItem(PALETTE_KEY);
  const palette = PALETTES.find(p => p.id === saved) ?? PALETTES[0];
  applyPalette(palette);
}

export function getActivePaletteId(): string {
  return localStorage.getItem(PALETTE_KEY) ?? 'teal';
}
