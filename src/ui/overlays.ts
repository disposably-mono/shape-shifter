// src/ui/overlays.ts

const OVERLAY_IDS = ['start-ov', 'win-ov', 'lose-ov'] as const;
type OverlayId = typeof OVERLAY_IDS[number];

export function showOverlay(id: OverlayId | string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

export function hideOverlay(id: OverlayId | string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

export function hideAllOverlays(): void {
  OVERLAY_IDS.forEach(id => hideOverlay(id));
}

/**
 * Show the start screen.
 * Called once on app load; the overlay is already visible in the HTML,
 * so this is mainly for returning to it after a game.
 */
export function showStartScreen(): void {
  hideAllOverlays();
  showOverlay('start-ov');
}

/**
 * Show the lose overlay.
 * Populates the stats line and (for guests) shows the registration CTA.
 */
export function showLoseScreen(statsText: string): void {
  const statsEl = document.getElementById('lose-s');
  if (statsEl) statsEl.textContent = statsText;

  // Guest CTA is always visible for now (Phase 3 will hide it for logged-in users)
  const cta = document.querySelector<HTMLElement>('.guest-cta');
  if (cta) cta.style.display = 'flex';

  hideAllOverlays();
  showOverlay('lose-ov');
}

/**
 * Show the win overlay.
 * Populates the stats line.
 */
export function showWinScreen(statsText: string): void {
  const statsEl = document.getElementById('win-s');
  if (statsEl) statsEl.textContent = statsText;

  hideAllOverlays();
  showOverlay('win-ov');
}
