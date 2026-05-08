// src/ui/hud.ts
import type { GameState } from '../types/index';
import { MAX_SHIFT_CHARGES } from '../engine/constants';

let scEl:           HTMLElement;
let comboEl:        HTMLElement;
let cbarEl:         HTMLElement;
let ruleEl:         HTMLElement;
let livesEl:        HTMLElement;
let waveBadgeEl:    HTMLElement;
let wpLabelEl:      HTMLElement;
let wpValueEl:      HTMLElement;
let shiftChargeEl:  HTMLElement;

export function initHUD(): void {
  scEl           = document.getElementById('sc')!;
  comboEl        = document.getElementById('combo-v')!;
  cbarEl         = document.getElementById('cbar')!;
  ruleEl         = document.getElementById('rule-t')!;
  livesEl        = document.getElementById('lives-num')!;
  waveBadgeEl    = document.getElementById('wave-badge')!;
  wpLabelEl      = document.getElementById('wp-label')!;
  wpValueEl      = document.getElementById('wp-value')!;
  shiftChargeEl  = document.getElementById('shift-charge')!;
}

export function updateHUD(
  state: GameState,
  shiftCharges?: number,
  shiftProgress?: number,
  shiftCooldown?: boolean,
): void {
  scEl.textContent        = state.score.toLocaleString();
  comboEl.textContent     = '×' + state.combo;
  livesEl.textContent     = String(state.lives);
  waveBadgeEl.textContent = 'WAVE ' + state.wave;
  ruleEl.innerHTML        = state.activeRule.label;

  // Combo bar — tracks progress when trigger is combo-based
  cbarEl.style.width = state.waveTrigger.type === 'combo'
    ? Math.min(100, (state.combo / state.waveTrigger.threshold) * 100) + '%'
    : '0%';

  // Wave progress overlay — top-left of viewport
  const t = state.waveTrigger;
  if (t.type === 'score') {
    wpLabelEl.textContent = 'SCORE';
    wpValueEl.textContent = `${state.score.toLocaleString()} / ${t.threshold.toLocaleString()}`;
  } else {
    wpLabelEl.textContent = 'COMBO';
    wpValueEl.textContent = `×${state.combo} / ×${t.threshold}`;
  }

  // Shift charge badge
  if (shiftChargeEl && shiftCharges !== undefined && shiftProgress !== undefined) {
    const progressStr = shiftCharges < MAX_SHIFT_CHARGES ? ` (${shiftProgress}/5)` : '';
    shiftChargeEl.textContent = `[Q] SHIFT ×${shiftCharges}${progressStr}`;
    shiftChargeEl.classList.toggle('ready', shiftCharges > 0 && !shiftCooldown);
    shiftChargeEl.classList.toggle('cooldown', !!shiftCooldown);
  }
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

// ── Auth chip ─────────────────────────────────────────────────────────────────
export function updateAuthChip(username: string | null): void {
  let chip = document.getElementById('auth-chip');
  if (!chip) {
    chip = document.createElement('div');
    chip.id = 'auth-chip';
    chip.className = 'hc';
    document.getElementById('ht')?.appendChild(chip);
  }

  if (username) {
    chip.innerHTML = `
      <span class="hl">Player</span>
      <span class="hv auth-username">${username}</span>
    `;
    chip.style.cursor = 'default';
    chip.onclick = null;
  } else {
    chip.innerHTML = `
      <span class="hl">Guest</span>
      <span class="hv auth-username" style="font-size:13px;opacity:.5">Sign In</span>
    `;
    chip.style.cursor = 'pointer';
  }
}
