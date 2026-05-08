// src/engine/enemies.ts
import type { Enemy, EnemyDef, PlayerState, Rule } from '../types/index';
import { ENEMY_POOL } from '../config/enemies';
import { COLOR_CSS } from '../config/colors';
import { VIS_R, SPAWN_R, MAX_INPUT } from './constants';
import { worldX, worldY, gk } from './grid';

const MIN_SPAWN_DIST = 2; // Chebyshev — player always needs ≥2 inputs to reach

let worldEl: HTMLElement;
let enemyCounter = 0;
let activeWave = 1;
export const enemies: Record<string, Enemy> = {};

// Enemies knocked back this tick skip marching
const knockedBackThisTick = new Set<string>();

export function initEnemies(world: HTMLElement): void {
  worldEl = world;
  enemyCounter = 0;
}

export function setActiveWave(wave: number): void {
  activeWave = wave;
}

function getActivePool(): EnemyDef[] {
  return ENEMY_POOL.filter(d => (d.unlockWave ?? 1) <= activeWave);
}

export function markKnockedBack(id: string): void {
  knockedBackThisTick.add(id);
}

export function clearKnockbackFlags(): void {
  knockedBackThisTick.clear();
}

// ─── Factory ─────────────────────────────────────────────────────────────────

function makeEnemyEl(def: EnemyDef): { wrap: HTMLElement; shapeEl: HTMLElement } {
  const wrap = document.createElement('div');
  wrap.className = 'en';

  const sh = document.createElement('div');
  sh.className = `eshape ${def.shape}`;
  sh.style.backgroundColor = COLOR_CSS[def.color] ?? '#fff';
  sh.style.boxShadow = `0 0 6px ${COLOR_CSS[def.color] ?? '#fff'}44`;

  wrap.appendChild(sh);
  return { wrap, shapeEl: sh };
}

export function pickDef(): EnemyDef {
  const pool = getActivePool();
  const tot = pool.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * tot;
  for (const d of pool) { r -= d.weight; if (r <= 0) return d; }
  return pool[0];
}

export function pickValidDef(rule: Rule, player: PlayerState): EnemyDef {
  const pool   = getActivePool();
  const valids = pool.filter(d => rule.check(d, player));
  if (!valids.length) return pickDef();
  return valids[Math.floor(Math.random() * valids.length)];
}

// ─── Spawn / Remove ──────────────────────────────────────────────────────────

export function refreshAllEnemyColors(): void {
  for (const e of Object.values(enemies)) {
    const c = COLOR_CSS[e.def.color] ?? '#fff';
    e.shapeEl.style.backgroundColor = c;
    e.shapeEl.style.boxShadow = `0 0 6px ${c}44`;
  }
}

export function occupiedAt(gx: number, gy: number, excludeId?: string): boolean {
  for (const e of Object.values(enemies)) {
    if (excludeId && e.id === excludeId) continue;
    if (e.gx === gx && e.gy === gy) return true;
  }
  return false;
}

function tooClose(gx: number, gy: number, px: number, py: number): boolean {
  return Math.max(Math.abs(gx - px), Math.abs(gy - py)) < MIN_SPAWN_DIST;
}

export function spawnEnemy(
  gx: number,
  gy: number,
  px: number,
  py: number,
  defOverride?: EnemyDef
): Enemy | null {
  if (gx === px && gy === py) return null;
  if (tooClose(gx, gy, px, py)) return null;
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
  knockedBackThisTick.delete(id);
}

export function clearAllEnemies(): void {
  for (const id of Object.keys(enemies)) removeEnemy(id);
  knockedBackThisTick.clear();
}

export function randomiseAllEnemies(): void {
  const pool   = getActivePool();
  const shapes = [...new Set(pool.map(d => d.shape))] as EnemyDef['shape'][];
  const colors = [...new Set(pool.map(d => d.color))] as EnemyDef['color'][];

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
// White dot only shows for enemies within MAX_INPUT Manhattan distance (reachable)

export function refreshValid(
  en: Enemy,
  rule: Rule,
  player: PlayerState,
  px: number,
  py: number,
): void {
  const isValid    = rule.check(en.def, player);
  const manhattan  = Math.abs(en.gx - px) + Math.abs(en.gy - py);
  const reachable  = manhattan <= MAX_INPUT && manhattan > 0;

  en.shapeEl.classList.toggle('valid', isValid);
  // has-valid drives the centered white dot — only show if reachable
  en.el.classList.toggle('has-valid', isValid && reachable);
}

export function refreshAllValid(
  rule: Rule,
  player: PlayerState,
  px: number,
  py: number,
): void {
  for (const e of Object.values(enemies)) refreshValid(e, rule, player, px, py);
}

// ─── Off-screen class ────────────────────────────────────────────────────────

export function updateOffscreenClass(en: Enemy, px: number, py: number): void {
  const dist = Math.max(Math.abs(en.gx - px), Math.abs(en.gy - py));
  en.el.classList.toggle('offscreen', dist > VIS_R);
}

// ─── Reposition ──────────────────────────────────────────────────────────────

export function repositionEnemies(px: number, py: number): void {
  for (const e of Object.values(enemies)) {
    e.el.style.left = worldX(e.gx, px) + 'px';
    e.el.style.top  = worldY(e.gy, py) + 'px';
    updateOffscreenClass(e, px, py);
  }
}

// ─── Ensure valid target visible ─────────────────────────────────────────────

export function ensureValidTarget(
  px: number,
  py: number,
  rule: Rule,
  player: PlayerState
): void {
  for (const e of Object.values(enemies)) {
    const md = Math.abs(e.gx - px) + Math.abs(e.gy - py);
    if (md <= MAX_INPUT && md > 0 && rule.check(e.def, player)) return;
  }

  for (let attempt = 0; attempt < 30; attempt++) {
    const dist  = MIN_SPAWN_DIST + Math.floor(Math.random() * (MAX_INPUT - MIN_SPAWN_DIST + 1));
    const angle = Math.random() * Math.PI * 2;
    const gx    = px + Math.round(Math.cos(angle) * dist);
    const gy    = py + Math.round(Math.sin(angle) * dist);
    if (Math.abs(gx - px) + Math.abs(gy - py) > MAX_INPUT) continue;
    if (tooClose(gx, gy, px, py)) continue;
    if (occupiedAt(gx, gy)) continue;
    spawnEnemy(gx, gy, px, py, pickValidDef(rule, player));
    return;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const gx = px + Math.floor(Math.random() * (VIS_R * 2 + 1)) - VIS_R;
    const gy = py + Math.floor(Math.random() * (VIS_R * 2 + 1)) - VIS_R;
    if (tooClose(gx, gy, px, py)) continue;
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

export function marchAll(
  px: number,
  py: number,
  spawnCount: number,
  rule: Rule,
  player: PlayerState
): boolean {
  clearKnockbackFlags();

  const reachableValid = Object.values(enemies).filter(e => {
    const md = Math.abs(e.gx - px) + Math.abs(e.gy - py);
    return md <= MAX_INPUT && md > 0 && rule.check(e.def, player);
  }).length;

  for (let i = 0; i < spawnCount; i++) {
    const roll = Math.random();

    if (reachableValid === 0 && i === 0) {
      const radius = MIN_SPAWN_DIST + Math.floor(Math.random() * (MAX_INPUT - MIN_SPAWN_DIST + 1));
      const angle  = Math.random() * Math.PI * 2;
      spawnEnemy(
        px + Math.round(Math.cos(angle) * radius),
        py + Math.round(Math.sin(angle) * radius),
        px, py, pickValidDef(rule, player)
      );
      continue;
    }

    let radius: number;
    if (roll < 0.5)      radius = SPAWN_R;
    else if (roll < 0.8) radius = VIS_R - 1 + Math.floor(Math.random() * 3);
    else                 radius = MIN_SPAWN_DIST + Math.floor(Math.random() * (MAX_INPUT - MIN_SPAWN_DIST + 1));

    const angle = Math.random() * Math.PI * 2;
    spawnEnemy(
      px + Math.round(Math.cos(angle) * radius),
      py + Math.round(Math.sin(angle) * radius),
      px, py
    );
  }

  const enemyList = Object.values(enemies);
  if (!enemyList.length) { ensureValidTarget(px, py, rule, player); return false; }

  enemyList.sort((a, b) =>
    (Math.abs(a.gx - px) + Math.abs(a.gy - py)) -
    (Math.abs(b.gx - px) + Math.abs(b.gy - py))
  );

  const moved         = new Set<string>();
  const prevPositions = new Map<string, { gx: number; gy: number }>();
  enemyList.forEach(e => prevPositions.set(e.id, { gx: e.gx, gy: e.gy }));

  for (const e of enemyList) {
    if (knockedBackThisTick.has(e.id)) continue;
    const dist  = Math.max(Math.abs(e.gx - px), Math.abs(e.gy - py));
    const steps = dist > VIS_R ? 2 : 1;
    for (let s = 0; s < steps; s++) {
      if (!marchOneStep(e, px, py, moved)) break;
      if (e.gx === px && e.gy === py) return true;
    }
  }

  // Resolve overlaps
  const cellMap: Record<string, Enemy[]> = {};
  for (const e of enemyList) {
    if (!enemies[e.id]) continue;
    const k = gk(e.gx, e.gy);
    if (!cellMap[k]) cellMap[k] = [];
    cellMap[k].push(e);
  }
  for (const stack of Object.values(cellMap)) {
    if (stack.length > 1) {
      for (let i = 1; i < stack.length; i++) {
        const e    = stack[i];
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

  for (const e of Object.values(enemies)) {
    if (e.gx === px && e.gy === py) return true;
  }

  ensureValidTarget(px, py, rule, player);
  return false;
}
