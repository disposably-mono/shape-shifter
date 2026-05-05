import type { Direction, PlayerState } from '../types/index';
import { COLOR_CSS } from '../config/colors';
import { worldX, worldY, vpCX, vpCY } from './grid';

let projEl: HTMLElement;
let projBody: HTMLElement;
let trailSvg: SVGElement;

export function initProjection(
  proj: HTMLElement,
  body: HTMLElement,
  svg: SVGElement
): void {
  projEl   = proj;
  projBody = body;
  trailSvg = svg;
}

export function updateProjection(
  inputSeq: Direction[],
  px: number,
  py: number,
  player: PlayerState,
  gameActive: boolean
): void {
  if (!gameActive || inputSeq.length === 0) {
    projEl.style.display = 'none';
    return;
  }
  let dx = 0, dy = 0;
  for (const d of inputSeq) { dx += d.dx; dy += d.dy; }
  const gx = px + dx, gy = py + dy;

  projEl.style.display = 'flex';
  projEl.style.left = worldX(gx, px) + 'px';
  projEl.style.top  = worldY(gy, py) + 'px';

  const color = COLOR_CSS[player.color] ?? '#ffffff';
  projBody.className = player.shape;
  projBody.style.backgroundColor = color;
  projBody.style.boxShadow = `0 0 12px ${color}88, 0 0 24px ${color}44`;
}

export function drawTrail(
  fromGX: number,
  fromGY: number,
  toGX: number,
  toGY: number,
  px: number,
  py: number
): void {
  const x1 = vpCX(fromGX, px), y1 = vpCY(fromGY, py);
  const x2 = vpCX(toGX,   px), y2 = vpCY(toGY,   py);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('stroke', 'rgba(255,255,255,0.9)');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');
  trailSvg.appendChild(line);

  let op = 0.9;
  const fade = setInterval(() => {
    op -= 0.07;
    if (op <= 0) { line.remove(); clearInterval(fade); return; }
    line.setAttribute('stroke', `rgba(255,255,255,${op.toFixed(2)})`);
  }, 30);
}