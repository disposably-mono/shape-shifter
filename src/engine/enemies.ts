// src/engine/enemies.ts
import type { Enemy, EnemyDef, PlayerState, Rule } from '../types/index';
import { ENEMY_POOL } from '../config/enemies';
import { COLOR_CSS } from '../config/colors';
import { C, VIS_R, SPAWN_R, MAX_INPUT } from './constants';
import { worldX, worldY, gk } from './grid';

let worldEl: HTMLElement;
let enemyCounter = 0;
export const enemies: Record<string, Enemy> = {};

export function initEnemies(world: HTMLElement): void {
  worldEl = world;
  enemyCounter = 0;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

function makeEnemyEl(def: EnemyDef): { wrap: HTMLElement; shapeEl: HTMLElement } {
  const wrap = document.createElement('div');
  wrap.className = 'en';

  const sh = document.createElement('div');
  sh.className = `eshape ${def.shape}`;
  sh.style.backgroundColor = COLOR_CSS[def.color] ?? '#fff';
  sh.style.boxShadow = `0 0 6px ${COLOR_CSS[def.color] ?? '#fff'}44`;

  // Valid indicator is a sibling of the shape, not a child —
  // so it is never clipped by the triangle clip-path.
  const indicator = document.createElement('div');
  indicator.className = 'valid-indicator';

  wrap.appendChild(sh);
  wrap.appendChild(indicator);
  return { wrap, shapeEl: sh };
}

export function pickDef(): EnemyDef {
  const pool = ENEMY_POOL;
  const tot = pool.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * tot;
  for (const d of pool) { r -= d.weight; if (r <= 0) return d; }
  return pool[0];
}

export function pickValidDef(rule: Rule, player: PlayerState): EnemyDef {
  const valids = ENEMY_POOL.filter(d => rule.check(d, player));
  if (!valids.length) return pickDef();
  return valids[Math.floor(Math.random() * valids.length)];
}

// ─── Spawn / Remove ──────────────────────────────────────────────────────────

export function occupiedAt(gx: number, gy: number, excludeId?: string): boolean {
  for (const e of Object.values(enemies)) {
    if (excludeId && e.id === excludeId) continue;
    if (e.gx === gx && e.gy === gy) return true;
  }
  return false;
}

export function spawnEnemy(
  gx: number,
  gy: number,
  px: number,
  py: number,
  defOverride?: EnemyDef
): Enemy | null {
  if (gx === px && gy === py) return null;
  if (occupiedAt(gx, gy)) return null;

  const def = defOverride ?? pickDef();
  const id  = 'e' + (++enemyCounter);
  const { wrap, shapeEl } = makeEnemyEl(def);

  wrap.style.left = worldX(gx, px) + 'px';
  wrap.style.top  = worldY(gy, py) + 'px';
  worldEl.appendChild(wrap);

  const en: Enemy = { id, def, gx, gy, el: wrap, shapeEl };
  enemies[id] = en;
  updateOffscreenClass(en, px, py);
  return en;
}

export function removeEnemy(id: string): void {
  const e = enemies[id];
  if (!e) return;
  e.el.remove();
  delete enemies[id];
}

export function clearAllEnemies(): void {
  for (const id of Object.keys(enemies)) removeEnemy(id);
}

/** Randomise the shape and color of every live enemy — called on SHIFT */
export function randomiseAllEnemies(): void {
  const shapes: EnemyDef['shape'][] = ['circle', 'square', 'triangle'];
  const colors: EnemyDef['color'][] = ['red', 'blue', 'green', 'yellow'];

  for (const e of Object.values(enemies)) {
    const newShape = shapes[Math.floor(Math.random() * shapes.length)];
    const newColor = colors[Math.floor(Math.random() * colors.length)];

    const newDef: EnemyDef = { ...e.def, shape: newShape, color: newColor };
    e.def = newDef;

    e.shapeEl.className = `eshape ${newShape}`;
    e.shapeEl.style.backgroundColor = COLOR_CSS[newColor] ?? '#fff';
    e.shapeEl.style.boxShadow = `0 0 6px ${COLOR_CSS[newColor] ?? '#fff'}44`;
  }
}

// ─── Valid highlighting ───────────────────────────────────────────────────────

export function refreshValid(en: Enemy, rule: Rule, player: PlayerState): void {
  const v = rule.check(en.def, player);
  en.shapeEl.classList.toggle('valid', v);
  // Indicator lives on the wrapper — toggle via wrapper class so CSS can target it
  en.el.classList.toggle('has-valid', v);
}

export function refreshAllValid(rule: Rule, player: PlayerState): void {
  for (const e of Object.values(enemies)) refreshValid(e, rule, player);
}

// ─── Off-screen class ────────────────────────────────────────────────────────

export function updateOffscreenClass(en: Enemy, px: number, py: number): void {
  const dist = Math.max(Math.abs(en.gx - px), Math.abs(en.gy - py));
  en.el.classList.toggle('offscreen', dist > VIS_R);
}

// ─── Reposition all enemies ──────────────────────────────────────────────────

export function repositionEnemies(px: number, py: number): void {
  for (const e of Object.values(enemies)) {
    e.el.style.left = worldX(e.gx, px) + 'px';
    e.el.style.top  = worldY(e.gy, py) + 'px';
    updateOffscreenClass(e, px, py);
  }
}

// ─── Ensure valid target visible ─────────────────────────────────────────────
// Priority 1: within jump range (Manhattan ≤ MAX_INPUT)
// Priority 2: within visible radius
// Fallback: anywhere in vis range

export function ensureValidTarget(
  px: number,
  py: number,
  rule: Rule,
  player: PlayerState
): void {
  // Already have a reachable valid target?
  for (const e of Object.values(enemies)) {
    const md = Math.abs(e.gx - px) + Math.abs(e.gy - py);
    if (md <= MAX_INPUT && md > 0 && rule.check(e.def, player)) return;
  }

  // Try to spawn one within jump range first (guarantees a chain is always possible)
  for (let attempt = 0; attempt < 30; attempt++) {
    const dist = 1 + Math.floor(Math.random() * MAX_INPUT);
    const angle = Math.random() * Math.PI * 2;
    const gx = px + Math.round(Math.cos(angle) * dist);
    const gy = py + Math.round(Math.sin(angle) * dist);
    if (gx === px && gy === py) continue;
    if (Math.abs(gx - px) + Math.abs(gy - py) > MAX_INPUT) continue;
    if (occupiedAt(gx, gy)) continue;
    spawnEnemy(gx, gy, px, py, pickValidDef(rule, player));
    return;
  }

  // Fallback: anywhere in visible radius
  for (let attempt = 0; attempt < 20; attempt++) {
    const gx = px + Math.floor(Math.random() * (VIS_R * 2 + 1)) - VIS_R;
    const gy = py + Math.floor(Math.random() * (VIS_R * 2 + 1)) - VIS_R;
    if (gx === px && gy === py) continue;
    if (occupiedAt(gx, gy)) continue;
    spawnEnemy(gx, gy, px, py, pickValidDef(rule, player));
    return;
  }
}

// ─── March ───────────────────────────────────────────────────────────────────

function marchOneStep(
  e: Enemy,
  px: number,
  py: number,
  moveSet: Set<string>
): boolean {
  const dx = px - e.gx, dy = py - e.gy;
  if (dx === 0 && dy === 0) return false;
  let sx = 0, sy = 0;
  if (Math.abs(dx) >= Math.abs(dy)) sx = Math.sign(dx);
  else sy = Math.sign(dy);
  const nx = e.gx + sx, ny = e.gy + sy;
  const nk = gk(nx, ny);
  if (moveSet.has(nk)) return false;
  e.gx = nx; e.gy = ny;
  moveSet.add(nk);
  e.el.style.left = worldX(nx, px) + 'px';
  e.el.style.top  = worldY(ny, py) + 'px';
  updateOffscreenClass(e, px, py);
  return true;
}

/**
 * Advances all enemies one march tick.
 * Returns true if an enemy reached the player (triggers SHIFT).
 *
 * Spawn distribution per tick:
 *   ~50% at SPAWN_R (far ring, classic pressure)
 *   ~30% at mid range (VIS_R - 1 .. VIS_R + 1) to replenish visible pool
 *   ~20% guaranteed valid within jump range if valid count is low
 */
export function marchAll(
  px: number,
  py: number,
  spawnCount: number,
  rule: Rule,
  player: PlayerState
): boolean {
  // Count reachable valid targets before spawning
  const reachableValid = Object.values(enemies).filter(e => {
    const md = Math.abs(e.gx - px) + Math.abs(e.gy - py);
    return md <= MAX_INPUT && md > 0 && rule.check(e.def, player);
  }).length;

  for (let i = 0; i < spawnCount; i++) {
    const roll = Math.random();
    let radius: number;

    if (reachableValid === 0 && i === 0) {
      // Guarantee a close valid spawn when the player has nothing to chain
      radius = 1 + Math.floor(Math.random() * MAX_INPUT);
      const angle = Math.random() * Math.PI * 2;
      const gx = px + Math.round(Math.cos(angle) * radius);
      const gy = py + Math.round(Math.sin(angle) * radius);
      spawnEnemy(gx, gy, px, py, pickValidDef(rule, player));
      continue;
    }

    if (roll < 0.5) {
      radius = SPAWN_R; // far ring
    } else if (roll < 0.8) {
      radius = VIS_R - 1 + Math.floor(Math.random() * 3); // mid range
    } else {
      radius = 2 + Math.floor(Math.random() * (MAX_INPUT - 1)); // close ring
    }

    const angle = Math.random() * Math.PI * 2;
    const gx = px + Math.round(Math.cos(angle) * radius);
    const gy = py + Math.round(Math.sin(angle) * radius);
    spawnEnemy(gx, gy, px, py);
  }

  const enemyList = Object.values(enemies);
  if (!enemyList.length) {
    ensureValidTarget(px, py, rule, player);
    return false;
  }

  enemyList.sort((a, b) => {
    const da = Math.abs(a.gx - px) + Math.abs(a.gy - py);
    const db = Math.abs(b.gx - px) + Math.abs(b.gy - py);
    return da - db;
  });

  const moved = new Set<string>();
  const prevPositions = new Map<string, { gx: number; gy: number }>();
  enemyList.forEach(e => prevPositions.set(e.id, { gx: e.gx, gy: e.gy }));

  for (const e of enemyList) {
    const dist = Math.max(Math.abs(e.gx - px), Math.abs(e.gy - py));
    const steps = dist > VIS_R ? 2 : 1;
    for (let s = 0; s < steps; s++) {
      if (!marchOneStep(e, px, py, moved)) break;
      if (e.gx === px && e.gy === py) return true;
    }
  }

  // Resolve overlaps
  const cellMap: Record<string, Enemy[]> = {};
  for (const e of enemyList) {
    const k = gk(e.gx, e.gy);
    if (!cellMap[k]) cellMap[k] = [];
    cellMap[k].push(e);
  }
  for (const stack of Object.values(cellMap)) {
    if (stack.length > 1) {
      for (let i = 1; i < stack.length; i++) {
        const e = stack[i];
        const prev = prevPositions.get(e.id);
        if (prev && !occupiedAt(prev.gx, prev.gy, e.id)) {
          e.gx = prev.gx; e.gy = prev.gy;
          e.el.style.left = worldX(prev.gx, px) + 'px';
          e.el.style.top  = worldY(prev.gy, py) + 'px';
        } else {
          removeEnemy(e.id);
        }
      }
    }
  }

  // Final collision check
  for (const e of Object.values(enemies)) {
    if (e.gx === px && e.gy === py) return true;
  }

  ensureValidTarget(px, py, rule, player);
  return false;
}
