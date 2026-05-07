// src/engine/combat.ts
import type { PlayerState, Rule } from '../types/index';
import { enemies, removeEnemy, occupiedAt, markKnockedBack } from './enemies';
import { SHIFT_RANGE } from './constants';
import { worldX, worldY } from './grid';
import { SHAPES, COLORS } from './constants';

/**
 * Knockback: push all enemies in the strict 3×3 grid around the kill cell.
 * Only valid targets (matchable under current rule) are immune.
 * Knocked-back enemies are flagged to skip marching this tick.
 * The ripple shape matches the eliminated enemy.
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

  // Collect knockback candidates first — don't mutate while iterating
  const candidates: Array<{ id: string; nx: number; ny: number }> = [];

  for (const e of Object.values(enemies)) {
    const dx = e.gx - elimGX;
    const dy = e.gy - elimGY;

    // Strict 3×3: dx and dy both in [-1, 1], not the center cell itself
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) continue;
    if (dx === 0 && dy === 0) continue;

    // Push direction: away from the eliminated cell
    // For dx===0 or dy===0, pick the axis that has movement; diagonal otherwise
    const pushX = dx === 0 ? 0 : Math.sign(dx);
    const pushY = dy === 0 ? 0 : Math.sign(dy);

    const nx = e.gx + pushX;
    const ny = e.gy + pushY;

    // Never push onto the player
    if (nx === px && ny === py) continue;

    candidates.push({ id: e.id, nx, ny });
  }

  // Apply knockback — check occupancy against already-confirmed final positions
  // to avoid cascade blocking from multiple enemies in the 3×3
  const reservedCells = new Set<string>();

  for (const { id, nx, ny } of candidates) {
    const e = enemies[id];
    if (!e) continue;

    const cellKey = `${nx},${ny}`;

    // Skip if destination already claimed by another knocked-back enemy
    if (reservedCells.has(cellKey)) continue;

    // Skip if an enemy that isn't being knocked back is already there
    // (but allow if it's another candidate — they'll move out of the way)
    const blocker = Object.values(enemies).find(
      other => other.id !== id && other.gx === nx && other.gy === ny
    );
    const blockerIsCandidate = blocker
      ? candidates.some(c => c.id === blocker.id)
      : false;

    if (blocker && !blockerIsCandidate) continue;

    // Apply
    e.gx = nx;
    e.gy = ny;
    reservedCells.add(cellKey);

    e.el.style.transition =
      'left .32s cubic-bezier(.23,1.4,.32,1), top .32s cubic-bezier(.23,1.4,.32,1)';
    e.el.style.left = worldX(nx, px) + 'px';
    e.el.style.top  = worldY(ny, py) + 'px';

    setTimeout(() => {
      if (enemies[id]) {
        e.el.style.transition =
          'left .22s cubic-bezier(.23,1.2,.32,1), top .22s cubic-bezier(.23,1.2,.32,1)';
      }
    }, 360);

    markKnockedBack(id);
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
  setTimeout(() => ring.remove(), 600);
}

export function executeShift(px: number, py: number): PlayerState {
  for (const e of Object.values(enemies)) {
    if (Math.abs(e.gx - px) <= SHIFT_RANGE && Math.abs(e.gy - py) <= SHIFT_RANGE) {
      removeEnemy(e.id);
    }
  }
  return randomPlayer();
}

export function executeBonusShift(px: number, py: number): PlayerState {
  for (const e of Object.values(enemies)) {
    if (Math.abs(e.gx - px) <= SHIFT_RANGE && Math.abs(e.gy - py) <= SHIFT_RANGE) {
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
