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
  // Compound color enemies (weight 0.6 — rarer than base)
  pc: { id: 'pc', shape: 'circle',   color: 'purple', weight: 0.6 },
  oc: { id: 'oc', shape: 'circle',   color: 'orange', weight: 0.6 },
  cc: { id: 'cc', shape: 'circle',   color: 'cyan',   weight: 0.6 },
  lc: { id: 'lc', shape: 'circle',   color: 'lime',   weight: 0.6 },
  ps: { id: 'ps', shape: 'square',   color: 'purple', weight: 0.6 },
  os: { id: 'os', shape: 'square',   color: 'orange', weight: 0.6 },
  cs: { id: 'cs', shape: 'square',   color: 'cyan',   weight: 0.6 },
  ls: { id: 'ls', shape: 'square',   color: 'lime',   weight: 0.6 },
  pt: { id: 'pt', shape: 'triangle', color: 'purple', weight: 0.6 },
  ot: { id: 'ot', shape: 'triangle', color: 'orange', weight: 0.6 },
  ct: { id: 'ct', shape: 'triangle', color: 'cyan',   weight: 0.6 },
  lt: { id: 'lt', shape: 'triangle', color: 'lime',   weight: 0.6 },
};

export const ENEMY_POOL = Object.values(ENEMY_DEFS);