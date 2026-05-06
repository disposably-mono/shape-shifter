// src/ui/dpad.ts
import { pushDirection } from '../engine/input';

const DIRECTIONS = [
  { id: 'dpad-up',    label: '↑', dx:  0, dy: -1 },
  { id: 'dpad-down',  label: '↓', dx:  0, dy:  1 },
  { id: 'dpad-left',  label: '←', dx: -1, dy:  0 },
  { id: 'dpad-right', label: '→', dx:  1, dy:  0 },
] as const;

function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

export function initDpad(): void {
  if (!isTouchDevice()) return;
  if (document.getElementById('dpad')) return;

  const container = document.createElement('div');
  container.id = 'dpad';
  container.setAttribute('aria-hidden', 'true');

  const center = document.createElement('div');
  center.id = 'dpad-center';
  container.appendChild(center);

  for (const dir of DIRECTIONS) {
    const btn = document.createElement('button');
    btn.id = dir.id;
    btn.className = 'dpad-btn';
    btn.textContent = dir.label;
    btn.setAttribute('aria-label', `Move ${dir.label}`);

    let lastTouch = 0;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault(); // blocks scroll, zoom, AND the synthetic mousedown
      const now = Date.now();
      if (now - lastTouch < 80) return; // debounce: ignore if fired within 80ms
      lastTouch = now;
      btn.classList.add('pressed');
      pushDirection({ dx: dir.dx, dy: dir.dy, sym: dir.label });
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      btn.classList.remove('pressed');
    }, { passive: false });

    btn.addEventListener('touchcancel', () => {
      btn.classList.remove('pressed');
    }, { passive: true });

    // Mouse fallback for desktop testing only — skipped on real touch devices
    if (!window.matchMedia('(pointer: coarse)').matches) {
      btn.addEventListener('mousedown', () => {
        btn.classList.add('pressed');
        pushDirection({ dx: dir.dx, dy: dir.dy, sym: dir.label });
      });
      btn.addEventListener('mouseup', () => btn.classList.remove('pressed'));
      btn.addEventListener('mouseleave', () => btn.classList.remove('pressed'));
    }

    container.appendChild(btn);
  }

  document.body.appendChild(container);
}
