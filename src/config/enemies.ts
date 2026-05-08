import type { EnemyDef } from '../types/index';

// 12 standard enemies: 3 shapes × 4 colours, all weight 1
export const ENEMY_DEFS: Record<string, EnemyDef> = {
  rc: { id: 'rc', shape: 'circle',   color: 'red',    weight: 1 },
  bc: { id: 'bc', shape: 'circle',   color: 'blue',   weight: 1 },
  gc: { id: 'gc', shape: 'circle',   color: 'green',  weight: 1 },
  yc: { id: 'yc', shape: 'circle',   color: 'yellow', weight: 1 },
  rs: { id: 'rs', shape: 'square',   color: 'red',    weight: 1 },
  bs: { id: 'bs', shape: 'square',   color: 'blue',   weight: 1 },
  gs: { id: 'gs', shape: 'square',   color: 'green',  weight: 1 },
  ys: { id: 'ys', shape: 'square',   color: 'yellow', weight: 1 },
  rt: { id: 'rt', shape: 'triangle', color: 'red',    weight: 1 },
  bt: { id: 'bt', shape: 'triangle', color: 'blue',   weight: 1 },
  gt: { id: 'gt', shape: 'triangle', color: 'green',  weight: 1 },
  yt: { id: 'yt', shape: 'triangle', color: 'yellow', weight: 1 },
  // Compound color enemies — weight 0.6, staggered unlock
  pc: { id: 'pc', shape: 'circle',   color: 'purple', weight: 0.6, unlockWave: 3 },
  oc: { id: 'oc', shape: 'circle',   color: 'orange', weight: 0.6, unlockWave: 3 },
  cc: { id: 'cc', shape: 'circle',   color: 'cyan',   weight: 0.6, unlockWave: 4 },
  lc: { id: 'lc', shape: 'circle',   color: 'lime',   weight: 0.6, unlockWave: 5 },
  ps: { id: 'ps', shape: 'square',   color: 'purple', weight: 0.6, unlockWave: 3 },
  os: { id: 'os', shape: 'square',   color: 'orange', weight: 0.6, unlockWave: 3 },
  cs: { id: 'cs', shape: 'square',   color: 'cyan',   weight: 0.6, unlockWave: 4 },
  ls: { id: 'ls', shape: 'square',   color: 'lime',   weight: 0.6, unlockWave: 5 },
  pt: { id: 'pt', shape: 'triangle', color: 'purple', weight: 0.6, unlockWave: 3 },
  ot: { id: 'ot', shape: 'triangle', color: 'orange', weight: 0.6, unlockWave: 3 },
  ct: { id: 'ct', shape: 'triangle', color: 'cyan',   weight: 0.6, unlockWave: 4 },
  lt: { id: 'lt', shape: 'triangle', color: 'lime',   weight: 0.6, unlockWave: 5 },
  // Diamond shape — weight 0.5, unlocks wave 4
  rdi: { id: 'rdi', shape: 'diamond', color: 'red',    weight: 0.5, unlockWave: 4 },
  bdi: { id: 'bdi', shape: 'diamond', color: 'blue',   weight: 0.5, unlockWave: 4 },
  gdi: { id: 'gdi', shape: 'diamond', color: 'green',  weight: 0.5, unlockWave: 4 },
  ydi: { id: 'ydi', shape: 'diamond', color: 'yellow', weight: 0.5, unlockWave: 4 },
  pdi: { id: 'pdi', shape: 'diamond', color: 'purple', weight: 0.5, unlockWave: 4 },
  odi: { id: 'odi', shape: 'diamond', color: 'orange', weight: 0.5, unlockWave: 4 },
  cdi: { id: 'cdi', shape: 'diamond', color: 'cyan',   weight: 0.5, unlockWave: 4 },
  ldi: { id: 'ldi', shape: 'diamond', color: 'lime',   weight: 0.5, unlockWave: 5 },
  // Pentagon shape — weight 0.5, unlocks wave 5
  rpe: { id: 'rpe', shape: 'pentagon', color: 'red',    weight: 0.5, unlockWave: 5 },
  bpe: { id: 'bpe', shape: 'pentagon', color: 'blue',   weight: 0.5, unlockWave: 5 },
  gpe: { id: 'gpe', shape: 'pentagon', color: 'green',  weight: 0.5, unlockWave: 5 },
  ype: { id: 'ype', shape: 'pentagon', color: 'yellow', weight: 0.5, unlockWave: 5 },
  ppe: { id: 'ppe', shape: 'pentagon', color: 'purple', weight: 0.5, unlockWave: 5 },
  ope: { id: 'ope', shape: 'pentagon', color: 'orange', weight: 0.5, unlockWave: 5 },
  cpe: { id: 'cpe', shape: 'pentagon', color: 'cyan',   weight: 0.5, unlockWave: 5 },
  lpe: { id: 'lpe', shape: 'pentagon', color: 'lime',   weight: 0.5, unlockWave: 5 },
};

export const ENEMY_POOL = Object.values(ENEMY_DEFS);