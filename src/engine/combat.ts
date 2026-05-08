// src/engine/combat.ts
import type { PlayerState, Rule, EnemyDef } from '../types/index';
import { enemies, removeEnemy, markKnockedBack } from './enemies';
import { SHIFT_RANGE } from './constants';
import { worldX, worldY } from './grid';
import { SHAPES, COLORS } from './constants';

const knockbackTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Knockback: push all enemies in the 3×3 ring around the kill cell.
 * Collects all desired moves first, then resolves conflicts by distance.
 * Diagonal moves get a cardinal fallback if the diagonal target is blocked.
 * The ripple shape matches the eliminated enemy.
 */
export function displaceNearby(
  elimGX: number,
  elimGY: number,
  playerGX: number,
  playerGY: number,
  activeRule: Rule,
  player: PlayerState,
  worldEl: HTMLElement,
  shape: string,
): EnemyDef[] {
  spawnRipple(elimGX, elimGY, playerGX, playerGY, shape, worldEl);

  const chainKills: EnemyDef[] = [];

  // 1. Collect all (enemy → desired cell) pairs
  const moves: Array<{ enemy: import('../types/index').Enemy; nx: number; ny: number; dist: number }> = [];

  for (const e of Object.values(enemies)) {
    const dx = e.gx - elimGX, dy = e.gy - elimGY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5 || dist > 2.5) continue;

    const nx = e.gx + Math.sign(dx);
    const ny = e.gy + Math.sign(dy);
    if (nx === playerGX && ny === playerGY) continue; // never land on player

    moves.push({ enemy: e, nx, ny, dist });
  }

  // 2. Resolve conflicts: if two enemies want the same cell,
  //    the one closer to the blast center wins (smaller dist = more directly hit)
  const claimed = new Map<string, import('../types/index').Enemy>();
  for (const m of moves) {
    const key = `${m.nx},${m.ny}`;
    const existing = claimed.get(key);
    if (!existing || m.dist < moves.find(x => x.enemy === existing)!.dist) {
      claimed.set(key, m.enemy);
    }
  }

  // 3. Apply moves — process farthest-first so outer enemies vacate cells
  //    before closer enemies try to occupy them. Use live positions throughout
  //    so we never land on an enemy that failed to move.
  //    `taken` tracks every cell committed to this pass (including fallbacks
  //    not in `claimed`) to prevent two enemies landing on the same cell.
  const sortedMoves = [...claimed.entries()].sort(([, ea], [, eb]) => {
    const da = moves.find(m => m.enemy === ea)!.dist;
    const db = moves.find(m => m.enemy === eb)!.dist;
    return db - da; // farthest first
  });

  const taken = new Set<string>();

  for (const [key, e] of sortedMoves) {
    const [nx, ny] = key.split(',').map(Number);

    const blocker = Object.values(enemies).find(
      other => other.id !== e.id && other.gx === nx && other.gy === ny
    );

    // Diagonal fallback: if diagonal move is blocked, try cardinal components
    if (blocker && Math.abs(nx - e.gx) === 1 && Math.abs(ny - e.gy) === 1) {
      const options = [
        { fx: nx, fy: e.gy },  // horizontal only
        { fx: e.gx, fy: ny },  // vertical only
      ];

      let applied = false;
      for (const opt of options) {
        const fallbackKey = `${opt.fx},${opt.fy}`;
        const fallbackBlocker = Object.values(enemies).find(
          other => other.id !== e.id && other.gx === opt.fx && other.gy === opt.fy
        );

        if (!taken.has(fallbackKey) && !fallbackBlocker) {
          taken.add(fallbackKey);
          e.gx = opt.fx;
          e.gy = opt.fy;
          e.el.style.transition = 'left .3s cubic-bezier(.23,1.4,.32,1), top .3s cubic-bezier(.23,1.4,.32,1)';
          e.el.style.left = worldX(opt.fx, playerGX) + 'px';
          e.el.style.top  = worldY(opt.fy, playerGY) + 'px';
          markKnockedBack(e.id);
          applied = true;

          clearTimeout(knockbackTimers.get(e.id));
          knockbackTimers.set(e.id, setTimeout(() => {
            knockbackTimers.delete(e.id);
            if (enemies[e.id]) {
              e.el.style.transition = 'left .22s cubic-bezier(.23,1.2,.32,1), top .22s cubic-bezier(.23,1.2,.32,1)';
            }
          }, 350));
          break;
        }
      }

      if (applied) continue;
    }

    if (blocker) {
      // chain kill: stationary enemy is eliminated by the knocked-back enemy
      chainKills.push(blocker.def);
      removeEnemy(blocker.id);
      taken.add(key);
      e.gx = nx; e.gy = ny;
      e.el.style.transition = 'left .3s cubic-bezier(.23,1.4,.32,1), top .3s cubic-bezier(.23,1.4,.32,1)';
      e.el.style.left = worldX(nx, playerGX) + 'px';
      e.el.style.top  = worldY(ny, playerGY) + 'px';
      markKnockedBack(e.id);
      clearTimeout(knockbackTimers.get(e.id));
      knockbackTimers.set(e.id, setTimeout(() => {
        knockbackTimers.delete(e.id);
        if (enemies[e.id]) {
          e.el.style.transition = 'left .22s cubic-bezier(.23,1.2,.32,1), top .22s cubic-bezier(.23,1.2,.32,1)';
        }
      }, 350));
      continue;
    }

    taken.add(key);
    e.gx = nx;
    e.gy = ny;
    e.el.style.transition = 'left .3s cubic-bezier(.23,1.4,.32,1), top .3s cubic-bezier(.23,1.4,.32,1)';
    e.el.style.left = worldX(nx, playerGX) + 'px';
    e.el.style.top  = worldY(ny, playerGY) + 'px';
    markKnockedBack(e.id);

    clearTimeout(knockbackTimers.get(e.id));
    knockbackTimers.set(e.id, setTimeout(() => {
      knockbackTimers.delete(e.id);
      if (enemies[e.id]) {
        e.el.style.transition = 'left .22s cubic-bezier(.23,1.2,.32,1), top .22s cubic-bezier(.23,1.2,.32,1)';
      }
    }, 350));
  }

  return chainKills;
}

function spawnRipple(
  gx: number,
  gy: number,
  pgx: number,
  pgy: number,
  shape: string,
  worldEl: HTMLElement,
): void {
  const ring = document.createElement('div');
  ring.className = `disp-ring ${shape}`;
  ring.style.left = worldX(gx, pgx) + 'px';
  ring.style.top  = worldY(gy, pgy) + 'px';
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

function randomPlayer(): PlayerState {
  return {
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}
