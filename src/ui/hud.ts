// src/ui/hud.ts
import type { GameState } from '../types/index';

let scEl:            HTMLElement;
let comboEl:         HTMLElement;
let cbarEl:          HTMLElement;
let ruleEl:          HTMLElement;
let livesEl:         HTMLElement;
let waveBadgeEl:     HTMLElement;
let nextWaveLabelEl: HTMLElement;
let nextWaveBarEl:   HTMLElement;
let nextWaveReqEl:   HTMLElement;
let shiftChargeEl:   HTMLElement;

export function initHUD(): void {
  scEl             = document.getElementById('sc')!;
  comboEl          = document.getElementById('combo-v')!;
  cbarEl           = document.getElementById('cbar')!;
  ruleEl           = document.getElementById('rule-t')!;
  livesEl          = document.getElementById('lives-num')!;
  waveBadgeEl      = document.getElementById('wave-badge')!;
  nextWaveLabelEl  = document.getElementById('next-wave-label')!;
  nextWaveBarEl    = document.getElementById('next-wave-bar')!;
  nextWaveReqEl    = document.getElementById('next-wave-req')!;
  shiftChargeEl    = document.getElementById('shift-charge')!;
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

  cbarEl.style.width = state.waveTrigger.type === 'combo'
    ? Math.min(100, (state.combo / state.waveTrigger.threshold) * 100) + '%'
    : '0%';

  // Next wave panel
  const t = state.waveTrigger;
  if (nextWaveLabelEl && nextWaveBarEl && nextWaveReqEl) {
    if (t.type === 'score') {
      const pct = Math.min(100, (state.score / t.threshold) * 100);
      nextWaveLabelEl.textContent = 'SCORE';
      nextWaveBarEl.style.width   = pct + '%';
      nextWaveReqEl.textContent   = `${state.score.toLocaleString()} / ${t.threshold.toLocaleString()}`;
    } else {
      const pct = Math.min(100, (state.combo / t.threshold) * 100);
      nextWaveLabelEl.textContent = 'COMBO';
      nextWaveBarEl.style.width   = pct + '%';
      nextWaveReqEl.textContent   = `×${state.combo} / ×${t.threshold}`;
    }
  }

  // Shift charge badge
  if (shiftChargeEl && shiftCharges !== undefined && shiftProgress !== undefined) {
    const progressStr = shiftProgress > 0 ? ` (${shiftProgress}/5)` : '';
    shiftChargeEl.textContent = `[Q] SHIFT ×${shiftCharges}${progressStr}`;
    const isReady = shiftCharges > 0 && !shiftCooldown;
    shiftChargeEl.classList.toggle('ready', isReady);
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

// ── Auth chip (top-right HUD) ──────────────────────
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
