// src/ui/hud.ts
import type { GameState } from '../types/index';
import { MAX_SHIFT_CHARGES, PERFECT_KILLS_PER_CHARGE } from '../engine/constants';

let scEl:           HTMLElement;
let comboEl:        HTMLElement;
let cbarEl:         HTMLElement;
let ruleEl:         HTMLElement;
let livesEl:        HTMLElement;
let waveBadgeEl:    HTMLElement;
let wpLabelEl:      HTMLElement;
let wpValueEl:      HTMLElement;
let shiftChargeEl:  HTMLElement;
let ariaLiveEl:     HTMLElement | null = null;

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

  if (!document.getElementById('aria-live-game')) {
    ariaLiveEl = document.createElement('div');
    ariaLiveEl.id = 'aria-live-game';
    ariaLiveEl.setAttribute('role', 'status');
    ariaLiveEl.setAttribute('aria-live', 'polite');
    ariaLiveEl.setAttribute('aria-atomic', 'true');
    ariaLiveEl.className = 'sr-only';
    document.body.appendChild(ariaLiveEl);
  } else {
    ariaLiveEl = document.getElementById('aria-live-game');
  }
}

export function announceToScreenReader(msg: string): void {
  if (!ariaLiveEl) return;
  ariaLiveEl.textContent = '';
  requestAnimationFrame(() => { if (ariaLiveEl) ariaLiveEl.textContent = msg; });
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
    ? Math.min(100, (state.maxCombo / state.waveTrigger.threshold) * 100) + '%'
    : '0%';

  const t = state.waveTrigger;
  if (t.type === 'score') {
    wpLabelEl.textContent = 'SCORE';
    wpValueEl.textContent = `${state.score.toLocaleString()} / ${t.threshold.toLocaleString()}`;
  } else {
    wpLabelEl.textContent = 'COMBO';
    wpValueEl.textContent = `×${state.maxCombo} / ×${t.threshold}`;
  }

  if (shiftChargeEl && shiftCharges !== undefined && shiftProgress !== undefined) {
    const progressStr = shiftCharges < MAX_SHIFT_CHARGES ? ` (${shiftProgress}/${PERFECT_KILLS_PER_CHARGE})` : '';
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
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
      <span class="hv auth-username">${escapeHtml(username)}</span>
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
