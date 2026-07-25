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
