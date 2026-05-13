import type { PlayerState } from '../types/index';
import { COLOR_CSS } from '../config/colors';

let pbody: HTMLElement;
let pRings: SVGElement;

export function initPlayer(bodyEl: HTMLElement, ringsEl: SVGElement): void {
  pbody  = bodyEl;
  pRings = ringsEl;
}

export function renderPlayer(player: PlayerState): void {
  const color = COLOR_CSS[player.color] ?? '#ffffff';
  pbody.style.backgroundColor = color;
  pbody.style.boxShadow = [
    `0 0 0 3px ${color}44`,
    `0 0 16px ${color}88`,
    `0 0 40px ${color}44`,
  ].join(', ');

  switch (player.shape) {
    case 'circle':
      pbody.style.borderRadius = '50%';
      pbody.style.clipPath = '';
      break;
    case 'square':
      pbody.style.borderRadius = '3px';
      pbody.style.clipPath = '';
      break;
    case 'triangle':
      pbody.style.borderRadius = '0';
      pbody.style.clipPath = 'polygon(50% 4%, 96% 92%, 4% 92%)';
      break;
    case 'diamond':
      pbody.style.borderRadius = '0';
      pbody.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
      break;
    case 'pentagon':
      pbody.style.borderRadius = '0';
      pbody.style.clipPath = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
      break;
  }
}

export function updateComboRings(combo: number): void {
  const speed = Math.max(0.7, 1.8 / (1 + combo * 0.1));
  pRings.style.animationDuration = speed + 's';
  const alpha = Math.min(0.3 + combo * 0.03, 0.8);
  pRings.querySelectorAll('circle').forEach(c => {
    c.setAttribute('stroke', `rgba(255,255,255,${alpha.toFixed(2)})`);
  });
}

export function animateJump(bodyEl: HTMLElement): void {
  bodyEl.classList.remove('jumped');
  void bodyEl.offsetWidth; // reflow
  bodyEl.classList.add('jumped');
}
