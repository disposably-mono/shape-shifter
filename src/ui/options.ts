// src/ui/options.ts
import { PALETTES, applyPalette, getActivePaletteId } from '../config/colors';

let overlayEl: HTMLElement | null = null;

// ── Init ─────────────────────────────────────────────────────────────────────
export function initOptions(): void {
  overlayEl = document.createElement('div');
  overlayEl.id = 'options-overlay';
  overlayEl.style.display = 'none';
  overlayEl.innerHTML = buildHTML();
  document.body.appendChild(overlayEl);
  bindEvents();
}

// ── Open / Close ──────────────────────────────────────────────────────────────
export function openOptions(): void {
  if (!overlayEl) return;
  syncActiveState();
  overlayEl.style.display = 'flex';
}

export function closeOptions(): void {
  if (!overlayEl) return;
  overlayEl.style.display = 'none';
}

// ── HTML ──────────────────────────────────────────────────────────────────────
function buildHTML(): string {
  const cards = PALETTES.map(p => {
    const swatches = [
      p.colorRed, p.colorBlue, p.colorGreen, p.colorYellow,
      p.colorPurple, p.colorOrange, p.colorCyan, p.colorLime,
    ]
      .map(c => `<span class="pal-swatch" style="background:${c}"></span>`)
      .join('');
    return `
      <button class="pal-card" data-palette="${p.id}" style="--pal-bg:${p.hudBg};--pal-cell-a:${p.cellA};--pal-cell-b:${p.cellB};--pal-border:${p.hudBorder};--pal-accent:${p.emerald};--pal-text:${p.white};--pal-muted:${p.off}">
        <span class="pal-preview" aria-hidden="true">
          <span class="pal-preview-grid"></span>
          <span class="pal-preview-player"></span>
        </span>
        <span class="pal-card-copy">
          <span class="pal-name">${p.name}</span>
          <span class="pal-desc">${p.description}</span>
        </span>
        <span class="pal-swatches" aria-hidden="true">${swatches}</span>
      </button>
    `;
  }).join('');

  return `
    <div id="options-inner">
      <div id="options-header">
        <h2>OPTIONS</h2>
        <button id="options-close" aria-label="Close">✕</button>
      </div>

      <div class="options-section">
        <span class="options-section-label">COLOR PALETTE</span>
        <p class="options-section-copy">Palettes tune the arena, HUD, player, enemies, and start-screen simulation together.</p>
        <div id="pal-grid">${cards}</div>
      </div>
    </div>
  `;
}

// ── Events ────────────────────────────────────────────────────────────────────
function bindEvents(): void {
  overlayEl!.querySelector('#options-close')!.addEventListener('click', closeOptions);
  overlayEl!.addEventListener('click', (e) => {
    if (e.target === overlayEl) { closeOptions(); return; }

    const card = (e.target as HTMLElement).closest<HTMLElement>('.pal-card');
    if (!card) return;

    const id = card.dataset.palette!;
    const palette = PALETTES.find(p => p.id === id);
    if (!palette) return;

    applyPalette(palette);
    syncActiveState();
  });
}

function syncActiveState(): void {
  const activeId = getActivePaletteId();
  overlayEl!.querySelectorAll('.pal-card').forEach(card => {
    card.classList.toggle('active', (card as HTMLElement).dataset.palette === activeId);
  });
}
