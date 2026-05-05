// Stub — full implementation in Phase 2. Provides minimal show/hide for Phase 1 testing.

export function showOverlay(id: string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

export function hideOverlay(id: string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

export function hideAllOverlays(): void {
  ['start-ov', 'win-ov', 'lose-ov'].forEach(id => hideOverlay(id));
}