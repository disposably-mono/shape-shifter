import type { Direction } from '../types/index';
import { MAX_INPUT } from './constants';

export const DIRS: Record<string, Direction> = {
  ArrowUp:    { dx:  0, dy: -1, sym: '↑' },
  w:          { dx:  0, dy: -1, sym: '↑' },
  ArrowDown:  { dx:  0, dy:  1, sym: '↓' },
  s:          { dx:  0, dy:  1, sym: '↓' },
  ArrowLeft:  { dx: -1, dy:  0, sym: '←' },
  a:          { dx: -1, dy:  0, sym: '←' },
  ArrowRight: { dx:  1, dy:  0, sym: '→' },
  d:          { dx:  1, dy:  0, sym: '→' },
};

type InputCallbacks = {
  onPush:    (seq: Direction[]) => void;
  onConfirm: (seq: Direction[]) => void;
  onClear:   () => void;
};

let seq: Direction[] = [];
let callbacks: InputCallbacks | null = null;
let active = false;

export function initInput(cbs: InputCallbacks): void {
  callbacks = cbs;
  document.addEventListener('keydown', handleKey);
}

export function setInputActive(isActive: boolean): void {
  active = isActive;
}

function handleKey(e: KeyboardEvent): void {
  if (!active) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    confirm();
    return;
  }
  if (e.key === 'Escape' || e.key === 'Backspace') {
    e.preventDefault();
    clear();
    return;
  }
  const dir = DIRS[e.key];
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

export function getSeq(): Direction[] {
  return [...seq];
}

export function resetSeq(): void {
  seq = [];
}
