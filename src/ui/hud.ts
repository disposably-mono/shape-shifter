import type { GameState } from '../types/index';

let scEl:    HTMLElement;
let comboEl: HTMLElement;
let cbarEl:  HTMLElement;
let ruleEl:  HTMLElement;
let livesEl: HTMLElement;
let waveBadgeEl: HTMLElement;

export function initHUD(): void {
  scEl        = document.getElementById('sc')!;
  comboEl     = document.getElementById('combo-v')!;
  cbarEl      = document.getElementById('cbar')!;
  ruleEl      = document.getElementById('rule-t')!;
  livesEl     = document.getElementById('lives-num')!;
  waveBadgeEl = document.getElementById('wave-badge')!;
}

export function updateHUD(state: GameState): void {
  scEl.textContent        = state.score.toLocaleString();
  comboEl.textContent     = '×' + state.combo;
  livesEl.textContent     = String(state.lives);
  waveBadgeEl.textContent = 'WAVE ' + state.wave;
  ruleEl.innerHTML        = state.activeRule.label;
  cbarEl.style.width      = Math.min(100, (state.combo / state.waveTrigger.threshold) * 100) + '%';
}

export function flashCombo(): void {
  comboEl.style.transform = 'scale(1.5)';
  setTimeout(() => { comboEl.style.transform = ''; }, 130);
}

export function showComboReset(): void {
  const f = document.createElement('div');
  f.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:50;' +
    'background:rgba(239,71,111,0.1);animation:rflash .4s ease-out forwards;';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 450);
}