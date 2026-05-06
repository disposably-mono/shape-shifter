// src/ui/lobby.ts
import type { LobbyConfig, DifficultyTier } from '../types/index';
import { RULES } from '../config/rules';

const LOBBY_STORAGE_KEY = 'ss_lobby_config';

const DEFAULT_CONFIG: LobbyConfig = {
  startingWave: 1,
  startingLives: 3,
  difficulty: 'normal',
  rulePool: Object.keys(RULES),
  waveTrigger: 'random',
};

let lobbyEl: HTMLElement | null = null;
let onLaunch: ((config: LobbyConfig) => void) | null = null;

export function initLobby(launchCallback: (config: LobbyConfig) => void): void {
  onLaunch = launchCallback;
  lobbyEl = document.createElement('div');
  lobbyEl.id = 'lobby-overlay';
  lobbyEl.style.display = 'none';
  lobbyEl.innerHTML = buildLobbyHTML();
  document.body.appendChild(lobbyEl);
  bindLobbyEvents();
}

export function openLobby(): void {
  if (!lobbyEl) return;
  loadSavedConfig();
  lobbyEl.style.display = 'flex';
}

export function closeLobby(): void {
  if (!lobbyEl) return;
  lobbyEl.style.display = 'none';
}

function buildLobbyHTML(): string {
  const rules = Object.values(RULES).map(r => `
    <label class="rule-toggle" data-rule-id="${r.id}">
      <input type="checkbox" value="${r.id}" checked />
      <span class="rule-label">${r.label}</span>
      <span class="rule-diff">D${r.difficulty}</span>
    </label>
  `).join('');

  return `
    <div id="lobby-inner">
      <h2>MISSION BRIEFING</h2>
      <p class="lobby-sub">Configure your run before you drop in.</p>

      <div class="lobby-grid">

        <div class="lobby-field">
          <label class="lobby-label">Starting Wave</label>
          <div class="lobby-number-row">
            <button class="num-btn" data-target="startingWave" data-delta="-1">−</button>
            <span class="num-val" id="val-startingWave">1</span>
            <button class="num-btn" data-target="startingWave" data-delta="1">+</button>
          </div>
          <p class="lobby-warn" id="warn-wave" style="display:none">
            ⚠ Higher starting waves skip early score accumulation.
          </p>
        </div>

        <div class="lobby-field">
          <label class="lobby-label">Starting Lives</label>
          <div class="lobby-number-row">
            <button class="num-btn" data-target="startingLives" data-delta="-1">−</button>
            <span class="num-val" id="val-startingLives">3</span>
            <button class="num-btn" data-target="startingLives" data-delta="1">+</button>
          </div>
        </div>

        <div class="lobby-field lobby-field-full">
          <label class="lobby-label">Difficulty</label>
          <div class="lobby-tier-row" id="difficulty-tiers">
            <button class="tier-btn active" data-tier="easy">EASY<span>×0.5 score</span></button>
            <button class="tier-btn" data-tier="normal">NORMAL<span>×1.0 score</span></button>
            <button class="tier-btn" data-tier="hard">HARD<span>×1.5 score</span></button>
            <button class="tier-btn" data-tier="brutal">BRUTAL<span>×2.5 score</span></button>
          </div>
        </div>

        <div class="lobby-field lobby-field-full">
          <label class="lobby-label">Wave Trigger</label>
          <div class="lobby-tier-row" id="wave-trigger-row">
            <button class="tier-btn" data-trigger="score">SCORE<span>reach a threshold</span></button>
            <button class="tier-btn" data-trigger="combo">COMBO<span>reach a milestone</span></button>
            <button class="tier-btn active" data-trigger="random">RANDOM<span>varies per wave</span></button>
          </div>
        </div>

        <div class="lobby-field lobby-field-full">
          <label class="lobby-label">Rule Pool <span class="lobby-label-note">(min 1)</span></label>
          <div id="rule-toggles">${rules}</div>
          <p class="lobby-warn" id="warn-rules" style="display:none">
            ⚠ At least one rule must be enabled.
          </p>
        </div>

      </div>

      <div class="lobby-actions">
        <button id="lobby-cancel" class="lobby-btn-secondary">CANCEL</button>
        <button id="lobby-launch" class="lobby-btn-primary">LAUNCH</button>
      </div>
    </div>
  `;
}

// ── State ─────────────────────────────
const cfg: LobbyConfig = { ...DEFAULT_CONFIG };

function loadSavedConfig(): void {
  try {
    const raw = localStorage.getItem(LOBBY_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<LobbyConfig>;
      Object.assign(cfg, DEFAULT_CONFIG, saved);
    } else {
      Object.assign(cfg, DEFAULT_CONFIG);
    }
  } catch {
    Object.assign(cfg, DEFAULT_CONFIG);
  }
  applyConfigToUI();
}

function saveConfig(): void {
  localStorage.setItem(LOBBY_STORAGE_KEY, JSON.stringify(cfg));
}

function applyConfigToUI(): void {
  (lobbyEl!.querySelector('#val-startingWave') as HTMLElement).textContent = String(cfg.startingWave);
  (lobbyEl!.querySelector('#val-startingLives') as HTMLElement).textContent = String(cfg.startingLives);
  updateWaveWarn();

  // Difficulty
  lobbyEl!.querySelectorAll('.tier-btn[data-tier]').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tier === cfg.difficulty);
  });

  // Wave trigger
  lobbyEl!.querySelectorAll('.tier-btn[data-trigger]').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.trigger === cfg.waveTrigger);
  });

  // Rule pool
  lobbyEl!.querySelectorAll('#rule-toggles input[type="checkbox"]').forEach(cb => {
    const input = cb as HTMLInputElement;
    input.checked = cfg.rulePool.includes(input.value);
  });
}

// ── Events ────────────────────────────
function bindLobbyEvents(): void {
  // Number pickers
  lobbyEl!.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = (btn as HTMLElement).dataset.target as 'startingWave' | 'startingLives';
      const delta = parseInt((btn as HTMLElement).dataset.delta!);
      const limits = target === 'startingWave' ? [1, 10] : [1, 5];
      cfg[target] = Math.max(limits[0], Math.min(limits[1], cfg[target] + delta));
      (lobbyEl!.querySelector(`#val-${target}`) as HTMLElement).textContent = String(cfg[target]);
      if (target === 'startingWave') updateWaveWarn();
    });
  });

  // Difficulty tiers
  lobbyEl!.querySelectorAll('.tier-btn[data-tier]').forEach(btn => {
    btn.addEventListener('click', () => {
      cfg.difficulty = (btn as HTMLElement).dataset.tier as DifficultyTier;
      lobbyEl!.querySelectorAll('.tier-btn[data-tier]').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
    });
  });

  // Wave trigger
  lobbyEl!.querySelectorAll('.tier-btn[data-trigger]').forEach(btn => {
    btn.addEventListener('click', () => {
      cfg.waveTrigger = (btn as HTMLElement).dataset.trigger as LobbyConfig['waveTrigger'];
      lobbyEl!.querySelectorAll('.tier-btn[data-trigger]').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
    });
  });

  // Rule toggles
  lobbyEl!.querySelectorAll('#rule-toggles input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = Array.from(
        lobbyEl!.querySelectorAll('#rule-toggles input[type="checkbox"]:checked')
      ).map(el => (el as HTMLInputElement).value);
      (lobbyEl!.querySelector('#warn-rules') as HTMLElement).style.display =
        checked.length === 0 ? 'block' : 'none';
      cfg.rulePool = checked.length > 0 ? checked : cfg.rulePool; // don't allow empty
    });
  });

  // Cancel / Launch
  lobbyEl!.querySelector('#lobby-cancel')!.addEventListener('click', closeLobby);
  lobbyEl!.querySelector('#lobby-launch')!.addEventListener('click', handleLaunch);
}

function updateWaveWarn(): void {
  (lobbyEl!.querySelector('#warn-wave') as HTMLElement).style.display =
    cfg.startingWave >= 5 ? 'block' : 'none';
}

function handleLaunch(): void {
  const checked = Array.from(
    lobbyEl!.querySelectorAll('#rule-toggles input[type="checkbox"]:checked')
  ).map(el => (el as HTMLInputElement).value);

  if (checked.length === 0) {
    (lobbyEl!.querySelector('#warn-rules') as HTMLElement).style.display = 'block';
    return;
  }

  cfg.rulePool = checked;
  saveConfig();
  closeLobby();
  onLaunch?.(cfg);
}
