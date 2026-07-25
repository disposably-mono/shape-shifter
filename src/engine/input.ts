// src/engine/input.ts
import type { Direction } from '../types/index';
import { MAX_INPUT } from './constants';

export const DIRS: Record<string, Direction> = {
  arrowup:    { dx:  0, dy: -1, sym: '↑' },
  w:          { dx:  0, dy: -1, sym: '↑' },
  arrowdown:  { dx:  0, dy:  1, sym: '↓' },
  s:          { dx:  0, dy:  1, sym: '↓' },
  arrowleft:  { dx: -1, dy:  0, sym: '←' },
  a:          { dx: -1, dy:  0, sym: '←' },
  arrowright: { dx:  1, dy:  0, sym: '→' },
  d:          { dx:  1, dy:  0, sym: '→' },
};

type InputCallbacks = {
  onPush:    (seq: Direction[]) => void;
  onConfirm: (seq: Direction[]) => void;
  onClear:   () => void;
};

// Overlay callbacks — fired when game is inactive (overlay visible)
type OverlayCallbacks = {
  onRetry:     () => void;
  onConfigure: () => void;
};

let seq: Direction[] = [];
let callbacks: InputCallbacks | null = null;
let overlayCallbacks: OverlayCallbacks | null = null;
let active = false;

export function initInput(cbs: InputCallbacks): void {
  callbacks = cbs;
  document.addEventListener('keydown', handleKey);
}

export function setOverlayCallbacks(cbs: OverlayCallbacks): void {
  overlayCallbacks = cbs;
}

export function setInputActive(isActive: boolean): void {
  active = isActive;
}

function handleKey(e: KeyboardEvent): void {
  // Don't hijack keystrokes typed into text fields (e.g. auth/username modals)
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const key = e.key.toLowerCase();

  // Overlay shortcuts — fire when game is not active and lose screen is visible
  if (!active) {
    const loseOv = document.getElementById('lose-ov');
    const isLoseVisible = loseOv && loseOv.style.display !== 'none';

    if (isLoseVisible) {
      if (key === 'enter') {
        e.preventDefault();
        overlayCallbacks?.onRetry();
        return;
      }
      if (key === 'backspace') {
        e.preventDefault();
        overlayCallbacks?.onConfigure();
        return;
      }
    }
    return;
  }

  // Active game input
  if (key === 'enter' || key === ' ') {
    e.preventDefault();
    confirm();
    return;
  }
  if (key === 'escape' || key === 'backspace' || key === 'r') {
    e.preventDefault();
    clear();
    return;
  }
  const dir = DIRS[key];
  if (dir) { e.preventDefault(); push(dir); }
}

export function push(dir: Direction): void {
  if (!active || seq.length >= MAX_INPUT) return;
  seq.push(dir);
  callbacks?.onPush([...seq]);
}

export const pushDirection = push;

export function confirm(): void {
  if (!active) return;
  if (!seq.length) return;
  callbacks?.onConfirm([...seq]);
}

export function clear(): void {
  seq = [];
  callbacks?.onClear();
}

export function resetSeq(): void {
  seq = [];
}
