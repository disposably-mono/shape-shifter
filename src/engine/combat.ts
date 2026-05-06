// src/engine/combat.ts
import type { PlayerState, Rule } from '../types/index';
import { enemies, removeEnemy, occupiedAt, markKnockedBack } from './enemies';
import { SHIFT_RANGE } from './constants';
import { worldX, worldY } from './grid';
import { SHAPES, COLORS } from './constants';

/**
 * Knockback: push enemies in the 3×3 grid around the kill cell.
 * Enemies that are valid targets under the current rule are immune.
 * Knocked-back enemies are flagged so they skip marching this tick.
 * shape param: the eliminated enemy's shape — used for the ripple ring.
 */
export function displaceNearby(
  elimGX: number,
  elimGY: number,
  px: number,
  py: number,
  rule: Rule,
  player: PlayerState,
  worldEl: HTMLElement,
  elimShape: 'circle' | 'square' | 'triangle' = 'circle'
): void {
  spawnDispRing(elimGX, elimGY, px, py, worldEl, elimShape);

  for (const e of Object.values(enemies)) {
    const dx = e.gx - elimGX;
    const dy = e.gy - elimGY;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) continue;
    if (dx === 0 && dy === 0) continue;

    // Valid targets are immune to knockback
    if (rule.check(e.def, player)) continue;

    const nx = e.gx + Math.sign(dx === 0 ? (Math.random() < 0.5 ? 1 : -1) : dx);
    const ny = e.gy + Math.sign(dy === 0 ? (Math.random() < 0.5 ? 1 : -1) : dy);

    // Block knockback if it would land on player
    if (nx === px && ny === py) continue;

    if (!occupiedAt(nx, ny, e.id)) {
      e.gx = nx; e.gy = ny;
      e.el.style.transition =
        'left .35s cubic-bezier(.23,1.4,.32,1), top .35s cubic-bezier(.23,1.4,.32,1)';
      e.el.style.left = worldX(nx, px) + 'px';
      e.el.style.top  = worldY(ny, py) + 'px';
      setTimeout(() => {
        if (enemies[e.id]) {
          e.el.style.transition =
            'left .22s cubic-bezier(.23,1.2,.32,1), top .22s cubic-bezier(.23,1.2,.32,1)';
        }
      }, 400);

      // Mark as knocked back — will skip march this tick
      markKnockedBack(e.id);
    }
  }
}

function spawnDispRing(
  gx: number,
  gy: number,
  px: number,
  py: number,
  worldEl: HTMLElement,
  shape: 'circle' | 'square' | 'triangle'
): void {
  const ring = document.createElement('div');
  ring.className = `disp-ring ${shape}`;
  ring.style.left = worldX(gx, px) + 'px';
  ring.style.top  = worldY(gy, py) + 'px';
  worldEl.appendChild(ring);
  setTimeout(() => ring.remove(), 550);
}

/**
 * Standard SHIFT (life lost): clears ±SHIFT_RANGE, randomises player.
 */
export function executeShift(px: number, py: number): PlayerState {
  for (const e of Object.values(enemies)) {
    if (
      Math.abs(e.gx - px) <= SHIFT_RANGE &&
      Math.abs(e.gy - py) <= SHIFT_RANGE
    ) {
      removeEnemy(e.id);
    }
  }
  return randomPlayer();
}

/**
 * Bonus SHIFT (no life lost): triggered by eliminating an exact shape+color match.
 */
export function executeBonusShift(px: number, py: number): PlayerState {
  for (const e of Object.values(enemies)) {
    if (
      Math.abs(e.gx - px) <= SHIFT_RANGE &&
      Math.abs(e.gy - py) <= SHIFT_RANGE
    ) {
      removeEnemy(e.id);
    }
  }
  return randomPlayer();
}

function randomPlayer(): PlayerState {
  return {
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}
