// src/engine/combat.ts
import type { PlayerState, Rule, EnemyDef } from '../types/index';
import { enemies, enemyAt, enemyByCell, removeEnemy, markKnockedBack, knockbackTimers, pickDef } from './enemies';
import {
  SHIFT_RANGE,
  KNOCKBACK_RANGE,
  KNOCKBACK_DURATION_MS,
  KNOCKBACK_TRANSITION,
  KNOCKBACK_RESET_TRANSITION,
} from './constants';
import { worldX, worldY, gk } from './grid';

/**
 * Knockback: push all enemies within Euclidean distance ~2.5 of the kill cell.
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

  const moves: Array<{ enemy: import('../types/index').Enemy; nx: number; ny: number; dist: number }> = [];

  for (const e of Object.values(enemies)) {
    const dx = e.gx - elimGX, dy = e.gy - elimGY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5 || dist > KNOCKBACK_RANGE) continue;

    const nx = e.gx + Math.sign(dx);
    const ny = e.gy + Math.sign(dy);
    if (nx === playerGX && ny === playerGY) continue;

    moves.push({ enemy: e, nx, ny, dist });
  }

  const claimed = new Map<string, import('../types/index').Enemy>();
  for (const m of moves) {
    const key = `${m.nx},${m.ny}`;
    const existing = claimed.get(key);
    if (!existing || m.dist < moves.find(x => x.enemy === existing)!.dist) {
      claimed.set(key, m.enemy);
    }
  }

  const sortedMoves = [...claimed.entries()].sort(([, ea], [, eb]) => {
    const da = moves.find(m => m.enemy === ea)!.dist;
    const db = moves.find(m => m.enemy === eb)!.dist;
    return db - da;
  });

  const taken = new Set<string>();

  for (const [key, e] of sortedMoves) {
    if (!enemies[e.id]) continue;

    const [nx, ny] = key.split(',').map(Number);

    const rawBlocker = enemyAt(nx, ny);
    const blocker = rawBlocker && rawBlocker.id !== e.id ? rawBlocker : undefined;

    if (blocker && Math.abs(nx - e.gx) === 1 && Math.abs(ny - e.gy) === 1) {
      const options = [
        { fx: nx, fy: e.gy },
        { fx: e.gx, fy: ny },
      ];

      let applied = false;
      for (const opt of options) {
        const fallbackKey = `${opt.fx},${opt.fy}`;
        const rawFb = enemyAt(opt.fx, opt.fy);
        const fallbackBlocker = rawFb && rawFb.id !== e.id ? rawFb : undefined;

        if (!taken.has(fallbackKey) && !fallbackBlocker) {
          taken.add(fallbackKey);
          updateEnemyCell(e, opt.fx, opt.fy);
          applyKnockbackTransition(e, opt.fx, opt.fy, playerGX, playerGY);
          applied = true;
          break;
        }
      }

      if (applied) continue;
    }

    if (blocker) {
      chainKills.push(blocker.def);
      removeEnemy(blocker.id);
      taken.add(key);
      updateEnemyCell(e, nx, ny);
      applyKnockbackTransition(e, nx, ny, playerGX, playerGY);
      continue;
    }

    taken.add(key);
    updateEnemyCell(e, nx, ny);
    applyKnockbackTransition(e, nx, ny, playerGX, playerGY);
  }

  return chainKills;
}

function updateEnemyCell(e: import('../types/index').Enemy, nx: number, ny: number): void {
  const oldK = gk(e.gx, e.gy);
  if (enemyByCell.get(oldK) === e) enemyByCell.delete(oldK);
  e.gx = nx;
  e.gy = ny;
  enemyByCell.set(gk(nx, ny), e);
}

function applyKnockbackTransition(
  e: import('../types/index').Enemy,
  gx: number,
  gy: number,
  pgx: number,
  pgy: number,
): void {
  e.el.style.transition = KNOCKBACK_TRANSITION;
  e.el.style.left = worldX(gx, pgx) + 'px';
  e.el.style.top  = worldY(gy, pgy) + 'px';
  markKnockedBack(e.id);

  clearTimeout(knockbackTimers.get(e.id));
  knockbackTimers.set(e.id, setTimeout(() => {
    knockbackTimers.delete(e.id);
    if (enemies[e.id]) {
      e.el.style.transition = KNOCKBACK_RESET_TRANSITION;
    }
  }, KNOCKBACK_DURATION_MS));
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
  const def = pickDef();
  return { shape: def.shape, color: def.color };
}
