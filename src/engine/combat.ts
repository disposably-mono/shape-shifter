// src/engine/combat.ts
import type { PlayerState, Rule, EnemyDef } from '../types/index';
import { enemies, enemyAt, enemyByCell, removeEnemy, markKnockedBack, knockbackTimers, getAvailableShapes, getAvailableColors } from './enemies';
import {
  SHIFT_RANGE,
  KNOCKBACK_RANGE,
  KNOCKBACK_DURATION_MS,
  KNOCKBACK_TRANSITION,
  KNOCKBACK_RESET_TRANSITION,
  MAX_INPUT,
  MIN_VALID_TARGETS,
} from './constants';
import { worldX, worldY, gk } from './grid';

function wouldBreakTargetInvariant(
  blocker: import('../types/index').Enemy,
  activeRule: Rule,
  player: PlayerState,
  playerGX: number,
  playerGY: number,
): boolean {
  if (!activeRule.check(blocker.def, player)) return false;
  const bmd = Math.abs(blocker.gx - playerGX) + Math.abs(blocker.gy - playerGY);
  if (bmd > MAX_INPUT || bmd === 0) return false;
  let validCount = 0;
  for (const e of Object.values(enemies)) {
    if (e.id === blocker.id) continue;
    const md = Math.abs(e.gx - playerGX) + Math.abs(e.gy - playerGY);
    if (md <= MAX_INPUT && md > 0 && activeRule.check(e.def, player)) {
      validCount++;
      if (validCount >= MIN_VALID_TARGETS) return false;
    }
  }
  return true;
}

export function displaceNearby(
  elimGX: number,
  elimGY: number,
  playerGX: number,
  playerGY: number,
  activeRule: Rule,
  player: PlayerState,
  worldEl: HTMLElement,
  shape: string,
  combo = 0,
  isExact = false,
  fromGX?: number,
  fromGY?: number,
  depth = 0,
): EnemyDef[] {
  if (depth > 3) return [];

  const depthFactor = 1 / (1 + depth);
  const comboRangeBonus = Math.min(Math.floor(combo / 10) * 0.5, 2.0);
  const comboDistBonus = Math.min(Math.floor(combo / 15), 2);
  const exactTop = isExact && depth === 0;
  const kbRange = Math.min(
    (KNOCKBACK_RANGE + comboRangeBonus) * (exactTop ? 1.5 : 1),
    5.0,
  ) * depthFactor;
  const kbDist = Math.max(1, Math.min(1 + comboDistBonus + (exactTop ? 1 : 0), 3));

  const jdx = elimGX - (fromGX ?? elimGX);
  const jdy = elimGY - (fromGY ?? elimGY);
  const jLen = Math.sqrt(jdx * jdx + jdy * jdy);

  spawnRipple(elimGX, elimGY, playerGX, playerGY, shape, worldEl, kbRange / KNOCKBACK_RANGE);

  const chainKills: EnemyDef[] = [];
  const cascadeSites: Array<{ gx: number; gy: number; shape: string }> = [];

  type KBMove = {
    enemy: import('../types/index').Enemy;
    targetX: number; targetY: number;
    clearX: number; clearY: number;
    dist: number;
  };
  const moves: KBMove[] = [];

  for (const e of Object.values(enemies)) {
    const dx = e.gx - elimGX, dy = e.gy - elimGY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5 || dist > kbRange) continue;

    const sx = Math.sign(dx), sy = Math.sign(dy);

    let dirFactor = 1.0;
    if (jLen > 0 && depth === 0) {
      const kbLen = Math.sqrt(sx * sx + sy * sy);
      if (kbLen > 0) {
        const dot = (sx * jdx + sy * jdy) / (kbLen * jLen);
        dirFactor = 1 + dot * 0.5;
      }
    }

    const pushDist = Math.max(1, Math.round(kbDist * dirFactor * depthFactor));

    let targetX = e.gx, targetY = e.gy;
    let clearX = e.gx, clearY = e.gy;

    for (let step = 1; step <= pushDist; step++) {
      const cx = e.gx + sx * step;
      const cy = e.gy + sy * step;
      if (cx === playerGX && cy === playerGY) break;
      const occ = enemyAt(cx, cy);
      if (occ && occ.id !== e.id) {
        targetX = cx; targetY = cy;
        break;
      }
      clearX = cx; clearY = cy;
      targetX = cx; targetY = cy;
    }

    if (targetX === e.gx && targetY === e.gy) continue;
    moves.push({ enemy: e, targetX, targetY, clearX, clearY, dist });
  }

  const claimed = new Map<string, KBMove>();
  for (const m of moves) {
    const key = `${m.targetX},${m.targetY}`;
    const existing = claimed.get(key);
    if (!existing || m.dist < existing.dist) {
      claimed.set(key, m);
    }
  }

  const sortedMoves = [...claimed.values()].sort((a, b) => b.dist - a.dist);
  const taken = new Set<string>();

  for (const m of sortedMoves) {
    const e = m.enemy;
    if (!enemies[e.id]) continue;

    const rawBlocker = enemyAt(m.targetX, m.targetY);
    const blocker = rawBlocker && rawBlocker.id !== e.id ? rawBlocker : undefined;

    if (!blocker) {
      const key = `${m.targetX},${m.targetY}`;
      taken.add(key);
      updateEnemyCell(e, m.targetX, m.targetY);
      applyKnockbackTransition(e, m.targetX, m.targetY, playerGX, playerGY);
      continue;
    }

    if (activeRule.check(blocker.def, player) &&
        !wouldBreakTargetInvariant(blocker, activeRule, player, playerGX, playerGY)) {
      chainKills.push(blocker.def);
      cascadeSites.push({ gx: blocker.gx, gy: blocker.gy, shape: blocker.def.shape });
      removeEnemy(blocker.id);
      const key = `${m.targetX},${m.targetY}`;
      taken.add(key);
      updateEnemyCell(e, m.targetX, m.targetY);
      applyKnockbackTransition(e, m.targetX, m.targetY, playerGX, playerGY);
      continue;
    }

    if (m.clearX !== e.gx || m.clearY !== e.gy) {
      const fbKey = `${m.clearX},${m.clearY}`;
      if (!taken.has(fbKey)) {
        taken.add(fbKey);
        updateEnemyCell(e, m.clearX, m.clearY);
        applyKnockbackTransition(e, m.clearX, m.clearY, playerGX, playerGY);
        continue;
      }
    }

    const sx = Math.sign(m.targetX - e.gx);
    const sy = Math.sign(m.targetY - e.gy);
    if (sx !== 0 && sy !== 0) {
      const options = [
        { fx: e.gx + sx, fy: e.gy },
        { fx: e.gx, fy: e.gy + sy },
      ];
      for (const opt of options) {
        const optKey = `${opt.fx},${opt.fy}`;
        const rawFb = enemyAt(opt.fx, opt.fy);
        const fbBlocker = rawFb && rawFb.id !== e.id ? rawFb : undefined;
        if (!taken.has(optKey) && !fbBlocker &&
            !(opt.fx === playerGX && opt.fy === playerGY)) {
          taken.add(optKey);
          updateEnemyCell(e, opt.fx, opt.fy);
          applyKnockbackTransition(e, opt.fx, opt.fy, playerGX, playerGY);
          break;
        }
      }
    }
  }

  for (const site of cascadeSites) {
    const cascaded = displaceNearby(
      site.gx, site.gy,
      playerGX, playerGY,
      activeRule, player, worldEl,
      site.shape,
      combo, false,
      undefined, undefined,
      depth + 1,
    );
    chainKills.push(...cascaded);
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
  scale = 1,
): void {
  const ring = document.createElement('div');
  ring.className = `disp-ring ${shape}`;
  ring.style.left = worldX(gx, pgx) + 'px';
  ring.style.top  = worldY(gy, pgy) + 'px';
  if (scale > 1) ring.style.scale = String(scale);
  worldEl.appendChild(ring);
  setTimeout(() => ring.remove(), 600);
}

export function executeShift(px: number, py: number): PlayerState {
  for (const e of Object.values(enemies)) {
    if (Math.abs(e.gx - px) <= SHIFT_RANGE && Math.abs(e.gy - py) <= SHIFT_RANGE) {
      removeEnemy(e.id);
    }
  }
  const shapes = getAvailableShapes();
  const colors = getAvailableColors();
  return {
    shape: shapes[Math.floor(Math.random() * shapes.length)] as PlayerState['shape'],
    color: colors[Math.floor(Math.random() * colors.length)] as PlayerState['color'],
  };
}
