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
};

export const ENEMY_POOL = Object.values(ENEMY_DEFS);