import type { PlayerState, Rule } from '../types/index';
import { enemies, removeEnemy, occupiedAt, refreshAllValid } from './enemies';
import { SHIFT_RANGE, SHAPES, COLORS } from './constants';
import { worldX, worldY } from './grid';

/**
 * Displace nearby enemies after a kill (knockback).
 * Enemies of the same shape as the player are immune.
 */
export function displaceNearby(
  elimGX: number,
  elimGY: number,
  px: number,
  py: number,
  worldEl: HTMLElement
): void {
  // Shape-specific ripple
  spawnDispRing(elimGX, elimGY, px, py, worldEl);

  for (const e of Object.values(enemies)) {
    const dx = e.gx - elimGX, dy = e.gy - elimGY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1 || dist > 2.5) continue;
    const nx = e.gx + Math.sign(dx);
    const ny = e.gy + Math.sign(dy);
    if (!occupiedAt(nx, ny, e.id)) {
      e.gx = nx; e.gy = ny;
      e.el.style.transition =
        'left .35s cubic-bezier(.23,1.4,.32,1), top .35s cubic-bezier(.23,1.4,.32,1)';
      e.el.style.left = worldX(nx, px) + 'px';
      e.el.style.top  = worldY(ny, py) + 'px';
      setTimeout(() => {
        e.el.style.transition =
          'left .22s cubic-bezier(.23,1.2,.32,1), top .22s cubic-bezier(.23,1.2,.32,1)';
      }, 400);
    }
  }
}

function spawnDispRing(
  gx: number,
  gy: number,
  px: number,
  py: number,
  worldEl: HTMLElement
): void {
  const ring = document.createElement('div');
  ring.className = 'disp-ring circle'; // default; shape-specific handled by caller
  ring.style.left = worldX(gx, px) + 'px';
  ring.style.top  = worldY(gy, py) + 'px';
  worldEl.appendChild(ring);
  setTimeout(() => ring.remove(), 550);
}

/**
 * Execute the SHIFT mechanic:
 * - Clear ±SHIFT_RANGE cells around player
 * - Randomise player shape + color
 * - Return { newPlayer } — caller handles life/combo deduction
 */
export function executeShift(
  px: number,
  py: number,
  rule: Rule
): PlayerState {
  // Clear nearby enemies
  for (const e of Object.values(enemies)) {
    if (
      Math.abs(e.gx - px) <= SHIFT_RANGE &&
      Math.abs(e.gy - py) <= SHIFT_RANGE
    ) {
      removeEnemy(e.id);
    }
  }
  // Randomise player
  const newPlayer: PlayerState = {
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
  return newPlayer;
}