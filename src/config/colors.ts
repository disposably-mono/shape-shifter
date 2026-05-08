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
    id: 'teal', name: 'TEAL',
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
    id: 'dusk', name: 'DUSK',
    darkTeal:      '#1a0b2e',
    oceanBlue:     '#7c3aed',
    emerald:       '#a78bfa',
    goldenPollen:  '#fbbf24',
    bubblegumPink: '#f472b6',
    white:         '#f5f0ff',
    off:           '#c4b5fd',
    hudBg:         '#0f0720',
    hudBorder:     '#3d1f7a',
    cellA:         '#0b0518',
    cellB:         '#120922',
    panelBg:       'rgba(15,7,32,0.92)',
    overlayBg:     'rgba(26,11,46,0.94)',
    colorRed:      '#fb7185',
    colorBlue:     '#818cf8',
    colorGreen:    '#34d399',
    colorYellow:   '#fde68a',
    colorPurple:   '#c084fc',
    colorOrange:   '#fb923c',
    colorCyan:     '#67e8f9',
    colorLime:     '#d9f99d',
  },
  {
    id: 'amber', name: 'AMBER',
    darkTeal:      '#1c1107',
    oceanBlue:     '#c2410c',
    emerald:       '#f59e0b',
    goldenPollen:  '#fde68a',
    bubblegumPink: '#fb7185',
    white:         '#fffbeb',
    off:           '#c9a87c',
    hudBg:         '#120c04',
    hudBorder:     '#4a2c0a',
    cellA:         '#0e0902',
    cellB:         '#160e04',
    panelBg:       'rgba(18,12,4,0.92)',
    overlayBg:     'rgba(28,17,7,0.94)',
    colorRed:      '#ef4444',
    colorBlue:     '#38bdf8',
    colorGreen:    '#84cc16',
    colorYellow:   '#fde68a',
    colorPurple:   '#a78bfa',
    colorOrange:   '#fb923c',
    colorCyan:     '#22d3ee',
    colorLime:     '#bef264',
  },
  {
    id: 'crimson', name: 'CRIMSON',
    darkTeal:      '#1a0508',
    oceanBlue:     '#b91c1c',
    emerald:       '#f87171',
    goldenPollen:  '#fbbf24',
    bubblegumPink: '#ec4899',
    white:         '#fff1f2',
    off:           '#fca5a5',
    hudBg:         '#110304',
    hudBorder:     '#5c1010',
    cellA:         '#0d0202',
    cellB:         '#140404',
    panelBg:       'rgba(17,3,4,0.92)',
    overlayBg:     'rgba(26,5,8,0.94)',
    colorRed:      '#fca5a5',
    colorBlue:     '#60a5fa',
    colorGreen:    '#4ade80',
    colorYellow:   '#fbbf24',
    colorPurple:   '#e879f9',
    colorOrange:   '#fb923c',
    colorCyan:     '#67e8f9',
    colorLime:     '#86efac',
  },
  {
    id: 'void', name: 'VOID',
    darkTeal:      '#0a0a0f',
    oceanBlue:     '#0284c7',
    emerald:       '#22d3ee',
    goldenPollen:  '#facc15',
    bubblegumPink: '#e879f9',
    white:         '#e2e8f0',
    off:           '#64748b',
    hudBg:         '#050508',
    hudBorder:     '#1e293b',
    cellA:         '#030305',
    cellB:         '#07070d',
    panelBg:       'rgba(5,5,8,0.94)',
    overlayBg:     'rgba(10,10,15,0.96)',
    colorRed:      '#f87171',
    colorBlue:     '#38bdf8',
    colorGreen:    '#4ade80',
    colorYellow:   '#fde047',
    colorPurple:   '#c084fc',
    colorOrange:   '#fb923c',
    colorCyan:     '#67e8f9',
    colorLime:     '#bef264',
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