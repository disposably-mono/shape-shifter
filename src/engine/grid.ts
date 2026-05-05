import { C, VIS_R } from './constants';

let vpEl: HTMLElement;
let worldEl: HTMLElement;
const cellPool: Record<string, HTMLElement> = {};

export function initGrid(vp: HTMLElement, world: HTMLElement): void {
  vpEl = vp;
  worldEl = world;
}

export function cx(): number { return vpEl.clientWidth  / 2 - C / 2; }
export function cy(): number { return vpEl.clientHeight / 2 - C / 2; }

export function worldX(gx: number, px: number): number { return (gx - px) * C; }
export function worldY(gy: number, py: number): number { return (gy - py) * C; }

export function vpCX(gx: number, px: number): number { return cx() + C / 2 + (gx - px) * C; }
export function vpCY(gy: number, py: number): number { return cy() + C / 2 + (gy - py) * C; }

export function gk(gx: number, gy: number): string { return `${gx},${gy}`; }

function ensureCell(gx: number, gy: number): HTMLElement {
  const k = gk(gx, gy);
  if (cellPool[k]) return cellPool[k];
  const el = document.createElement('div');
  el.className = 'cell ' + ((gx + gy) % 2 === 0 ? 'ca' : 'cb');
  worldEl.appendChild(el);
  cellPool[k] = el;
  return el;
}

function posCell(el: HTMLElement, gx: number, gy: number, px: number, py: number): void {
  el.style.left = worldX(gx, px) + 'px';
  el.style.top  = worldY(gy, py) + 'px';
}

export function renderCells(px: number, py: number, jumpable: Set<string>): void {
  const r = VIS_R + 2;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const gx = px + dx, gy = py + dy;
      const cell = ensureCell(gx, gy);
      posCell(cell, gx, gy, px, py);
    }
  }
  // Update jumpable highlights
  for (const el of Object.values(cellPool)) el.classList.remove('jumpable');
  for (const k of jumpable) {
    if (cellPool[k]) cellPool[k].classList.add('jumpable');
  }
}

export function getJumpableCells(px: number, py: number, maxInput: number): Set<string> {
  const result = new Set<string>();
  for (let dy = -maxInput; dy <= maxInput; dy++) {
    const maxDx = maxInput - Math.abs(dy);
    for (let dx = -maxDx; dx <= maxDx; dx++) {
      result.add(gk(px + dx, py + dy));
    }
  }
  return result;
}

export function layoutWorld(worldEl: HTMLElement, vpEl: HTMLElement): void {
  const wEl = worldEl;
  wEl.style.left = cx() + 'px';
  wEl.style.top  = cy() + 'px';
}

export function clearCellPool(): void {
  for (const el of Object.values(cellPool)) el.remove();
  for (const k in cellPool) delete cellPool[k];
}