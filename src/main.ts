// src/main.ts
import './style.css';
import { CSS_VARS } from './config/colors';
import { getDifficulty } from './config/difficulty';
import { pickWaveRule, generateWaveTrigger, isWaveTriggerMet, isMutationWave } from './engine/waves';
import { store, resetStore, DEFAULT_LOBBY_CONFIG } from './engine/state';
import { initGrid, renderCells, getJumpableCells, clearCellPool } from './engine/grid';
import { initPlayer, renderPlayer, updateComboRings, animateJump } from './engine/player';
import {
  initEnemies, enemies, spawnEnemy, removeEnemy, clearAllEnemies,
  marchAll, refreshAllValid, repositionEnemies, ensureValidTarget,
  randomiseAllEnemies,
} from './engine/enemies';
import { initInput, setInputActive, confirm as confirmInput, clear as clearInput, resetSeq } from './engine/input';
import { initProjection, updateProjection, drawTrail } from './engine/projection';
import { displaceNearby, executeShift, executeBonusShift } from './engine/combat';
import { isExactMatch } from './config/rules';
import { calcScore, calcPerfectShiftScore } from './engine/scoring';
import { initHUD, updateHUD, flashCombo, showComboReset, updateAuthChip } from './ui/hud';
import { showOverlay, hideAllOverlays } from './ui/overlays';
import { initMetronome, tickMetronome, showMetronome, hideMetronome } from './ui/metronome';
import { initDpad } from './ui/dpad';
import { initLobby, openLobby } from './ui/lobby';
import { initAuthModal, openAuthModal, handleUserResolved } from './ui/auth-modal';
import { initUsernameModal } from './ui/username-modal';
import { getCurrentUser, onAuthStateChange, signOut } from './supabase/auth';
import { getCachedProfile, clearProfileCache } from './supabase/profiles';
import {
  sfxElim, sfxComboReset, sfxShift,
  sfxComboMilestone, sfxWaveUp,
  sfxMetronomeDown, sfxMetronomeUp,
} from './engine/audio';
import { SPAWN_R, MAX_INPUT } from './engine/constants';
import type { LobbyConfig } from './types/index';

// ─── Inject CSS tokens ────────────────────────────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = `:root { ${CSS_VARS} }`;
document.head.appendChild(styleEl);

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const vpEl       = document.getElementById('vp')!;
const worldEl    = document.getElementById('world')!;
const playerEl   = document.getElementById('player')!;
const pbody      = document.getElementById('p-body')!;
const pRings     = document.getElementById('p-rings') as unknown as SVGElement;
const projEl     = document.getElementById('projection')!;
const projBody   = document.getElementById('proj-body')!;
const trailSvg   = document.getElementById('trail-svg') as unknown as SVGElement;
const shiftMsg   = document.getElementById('shift-msg')!;
const breakHeart = document.getElementById('break-heart')!;

// ─── Module init ──────────────────────────────────────────────────────────────
initGrid(vpEl, worldEl);
initPlayer(pbody, pRings);
initEnemies(worldEl);
initProjection(projEl, projBody, trailSvg);
initHUD();
initMetronome();
initDpad();

// ─── Metro beat tracker ───────────────────────────────────────────────────────
let metroBeat = 0;

// ─── Perfect shift charge tracker ────────────────────────────────────────────
const PERFECT_KILLS_PER_CHARGE = 5;
const MAX_SHIFT_CHARGES = 3;
const SHIFT_COOLDOWN_MS = 1000;

let perfectShiftCharges  = 1;
let perfectKillCounter   = 0;
let shiftOnCooldown      = false;

function onPerfectKill(): void {
  perfectKillCounter++;
  if (perfectKillCounter >= PERFECT_KILLS_PER_CHARGE) {
    perfectKillCounter = 0;
    perfectShiftCharges = Math.min(perfectShiftCharges + 1, MAX_SHIFT_CHARGES);
  }
  hudUpdate();
}

// ─── HUD helper ───────────────────────────────────────────────────────────────
function hudUpdate(): void {
  updateHUD(store.get(), perfectShiftCharges, perfectKillCounter, shiftOnCooldown);
}

// ─── March timer ──────────────────────────────────────────────────────────────
let marchTimer: ReturnType<typeof setInterval> | null = null;

function stopMarchTimer(): void {
  if (marchTimer !== null) { clearInterval(marchTimer); marchTimer = null; }
}

function startMarchTimer(): void {
  stopMarchTimer();
  const s = store.get();
  const diff = getDifficulty(s.config.difficulty, s.wave, s.combo, s.activeRule.id);
  document.documentElement.style.setProperty('--metro-duration', diff.marchTick + 'ms');
  marchTimer = setInterval(marchTick, diff.marchTick);
}

function refreshMarchTimer(): void {
  if (!store.get().gameActive) return;
  startMarchTimer();
}

function marchTick(): void {
  const s = store.get();
  if (!s.gameActive) return;

  metroBeat = (metroBeat + 1) % 2;
  tickMetronome();
  metroBeat === 0 ? sfxMetronomeDown() : sfxMetronomeUp();

  const diff = getDifficulty(s.config.difficulty, s.wave, s.combo, s.activeRule.id);
  const hit = marchAll(s.px, s.py, diff.spawnCount, s.activeRule, s.player);
  if (hit) { doShift(); return; }
  refreshAllValid(s.activeRule, s.player);
  hudUpdate();
}

// ─── Input callbacks ──────────────────────────────────────────────────────────
initInput({
  onPush(seq) {
    const s = store.get();
    store.set({ inputSeq: seq });
    updateProjection(seq, s.px, s.py, s.player, s.gameActive);
    renderSlots(seq);
  },
  onConfirm(seq) {
    const s = store.get();
    if (!s.gameActive) return;

    const enterBtn = document.getElementById('eb');
    if (enterBtn) { enterBtn.classList.add('on'); setTimeout(() => enterBtn.classList.remove('on'), 120); }

    let dx = 0, dy = 0;
    for (const d of seq) { dx += d.dx; dy += d.dy; }

    if (Math.abs(dx) > MAX_INPUT || Math.abs(dy) > MAX_INPUT) {
      doComboReset(); resetSeq(); store.set({ inputSeq: [] }); return;
    }

    const tx = s.px + dx, ty = s.py + dy;
    const target = Object.values(enemies).find(e => e.gx === tx && e.gy === ty);

    if (!target) { doComboReset(); resetSeq(); store.set({ inputSeq: [] }); return; }

    if (s.activeRule.check(target.def, s.player)) {
      const fromGX = s.px, fromGY = s.py;
      const exact = isExactMatch(target.def, s.player);
      const elimShape = target.def.shape; // capture before removal

      displaceNearby(tx, ty, s.px, s.py, s.activeRule, s.player, worldEl, elimShape);
      removeEnemy(target.id);
      store.update(() => ({ px: tx, py: ty }));
      const ns = store.get();

      drawTrail(fromGX, fromGY, tx, ty, ns.px, ns.py);
      animateJump(pbody);
      reposition(ns.px, ns.py);

      if (exact) {
        const gain = calcPerfectShiftScore(ns.combo, ns.config.difficulty);
        const newPlayer = executeBonusShift(ns.px, ns.py);
        store.update(st => ({
          combo:    st.combo + 2,
          maxCombo: Math.max(st.maxCombo, st.combo + 2),
          score:    st.score + gain,
          player:   newPlayer,
        }));
        onPerfectKill();
        sfxShift();
        shiftMsg.classList.remove('active', 'bonus');
        void shiftMsg.offsetWidth;
        shiftMsg.classList.add('active', 'bonus');
        setTimeout(() => shiftMsg.classList.remove('active', 'bonus'), 1000);
        renderPlayer(store.get().player);
        randomiseAllEnemies();
        refreshAllValid(ns.activeRule, store.get().player);
        flashCombo();
        sfxComboMilestone(store.get().combo);
      } else {
        const gain = calcScore(ns.combo, ns.config.difficulty);
        store.update(st => ({
          score:    st.score + gain,
          combo:    st.combo + 1,
          maxCombo: Math.max(st.maxCombo, st.combo + 1),
        }));
        sfxElim();
        sfxComboMilestone(store.get().combo);
        flashCombo();
      }

      refreshMarchTimer();
      ensureValidTarget(ns.px, ns.py, ns.activeRule, store.get().player);
      refreshAllValid(ns.activeRule, store.get().player);
      hudUpdate();
      checkWaveTrigger();
    } else {
      doShift();
    }

    resetSeq();
    store.set({ inputSeq: [] });
    renderSlots([]);
    updateProjection([], store.get().px, store.get().py, store.get().player, store.get().gameActive);
  },
  onClear() {
    store.set({ inputSeq: [] });
    const s = store.get();
    updateProjection([], s.px, s.py, s.player, s.gameActive);
    renderSlots([]);
  },
});

// ─── Button event wiring ──────────────────────────────────────────────────────
document.getElementById('eb')!.addEventListener('click', confirmInput);
document.getElementById('cb')!.addEventListener('click', clearInput);
document.getElementById('win-retry-btn')!.addEventListener('click', () => startGame());
document.getElementById('win-endless-btn')!.addEventListener('click', continueEndless);
document.getElementById('lose-retry-btn')!.addEventListener('click', () => startGame());
document.getElementById('guest-cta-btn')!.addEventListener('click', () => openAuthModal('signup'));

// ─── Hotkey: Q = manual perfect shift ────────────────────────────────────────
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'q' || e.key === 'Q') {
    e.preventDefault();
    doPerfectShift();
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function triggerBreakHeart(): void {
  breakHeart.classList.remove('active');
  void breakHeart.offsetWidth;
  breakHeart.classList.add('active');
  setTimeout(() => breakHeart.classList.remove('active'), 900);
}

function reposition(px: number, py: number): void {
  const cx = vpEl.clientWidth  / 2 - 68 / 2;
  const cy = vpEl.clientHeight / 2 - 68 / 2;
  playerEl.style.left = cx + 'px';
  playerEl.style.top  = cy + 'px';
  worldEl.style.left  = cx + 'px';
  worldEl.style.top   = cy + 'px';
  repositionEnemies(px, py);
  renderCells(px, py, getJumpableCells(px, py, MAX_INPUT));
  const s = store.get();
  updateProjection(s.inputSeq, px, py, s.player, s.gameActive);
}

function renderSlots(seq: { sym: string }[]): void {
  for (let i = 0; i < 4; i++) {
    const sl = document.getElementById('k' + i)!;
    sl.textContent = seq[i]?.sym ?? '';
    sl.classList.toggle('on', !!seq[i]);
  }
}

function doComboReset(): void {
  if (store.get().combo === 0) return;
  store.set({ combo: 0 });
  showComboReset();
  sfxComboReset();
  refreshMarchTimer();
  hudUpdate();
}

// ─── SHIFT (life lost) ────────────────────────────────────────────────────────
function doShift(): void {
  const s = store.get();
  if (!s.gameActive) return;
  stopMarchTimer();

  const newPlayer = executeShift(s.px, s.py);
  store.update(() => ({ lives: s.lives - 1, combo: 0, player: newPlayer }));

  sfxShift();
  vpEl.classList.add('shake');
  setTimeout(() => vpEl.classList.remove('shake'), 350);
  shiftMsg.classList.remove('active', 'bonus');
  void shiftMsg.offsetWidth;
  shiftMsg.classList.add('active');
  setTimeout(() => shiftMsg.classList.remove('active'), 1000);
  triggerBreakHeart();

  const ns = store.get();
  renderPlayer(ns.player);
  randomiseAllEnemies();
  refreshAllValid(ns.activeRule, ns.player);
  reposition(ns.px, ns.py);
  hudUpdate();

  if (ns.lives <= 0) {
    store.set({ gameActive: false });
    setInputActive(false);
    hideMetronome();
    (document.getElementById('lose-s') as HTMLElement).textContent =
      `SCORE: ${ns.score.toLocaleString()}  |  WAVE: ${ns.wave}  |  COMBO: ×${ns.maxCombo}`;

    const guestCta = document.getElementById('guest-cta')!;
    guestCta.style.display = getCachedProfile() ? 'none' : 'flex';

    showOverlay('lose-ov');
    return;
  }

  ensureValidTarget(ns.px, ns.py, ns.activeRule, ns.player);
  startMarchTimer();
}

// ─── Perfect SHIFT (Q hotkey) ─────────────────────────────────────────────────
function doPerfectShift(): void {
  const s = store.get();
  if (!s.gameActive || perfectShiftCharges <= 0 || shiftOnCooldown) return;

  perfectShiftCharges--;
  shiftOnCooldown = true;
  hudUpdate();

  // Re-enable after cooldown
  setTimeout(() => {
    shiftOnCooldown = false;
    hudUpdate();
  }, SHIFT_COOLDOWN_MS);

  const gain = calcPerfectShiftScore(s.combo, s.config.difficulty);
  const newPlayer = executeBonusShift(s.px, s.py);
  store.update(st => ({
    combo:    st.combo + 2,
    maxCombo: Math.max(st.maxCombo, st.combo + 2),
    score:    st.score + gain,
    player:   newPlayer,
  }));

  sfxShift();
  shiftMsg.classList.remove('active', 'bonus');
  void shiftMsg.offsetWidth;
  shiftMsg.classList.add('active', 'bonus');
  setTimeout(() => shiftMsg.classList.remove('active', 'bonus'), 1000);

  const ns = store.get();
  renderPlayer(ns.player);
  randomiseAllEnemies();
  refreshAllValid(ns.activeRule, ns.player);
  reposition(ns.px, ns.py);
  flashCombo();
  sfxComboMilestone(ns.combo);
  refreshMarchTimer();
  ensureValidTarget(ns.px, ns.py, ns.activeRule, ns.player);
  hudUpdate();
  checkWaveTrigger();
}

// ─── Wave logic ───────────────────────────────────────────────────────────────
function checkWaveTrigger(): void {
  const s = store.get();
  if (!isWaveTriggerMet(s.waveTrigger, s.score, s.maxCombo)) return;
  if (s.wave === 5 && !s.config.rulePool.includes('__endless__')) {
    doWin();
  } else {
    advanceWave();
  }
}

function doWin(): void {
  stopMarchTimer();
  const s = store.get();
  store.set({ gameActive: false });
  setInputActive(false);
  hideMetronome();
  (document.getElementById('win-s') as HTMLElement).textContent =
    `SCORE: ${s.score.toLocaleString()}  |  COMBO: ×${s.maxCombo}  |  LIVES: ${s.lives}`;
  showOverlay('win-ov');
}

function advanceWave(): void {
  stopMarchTimer();
  const s = store.get();
  const nextWaveNum = s.wave + 1;

  const waveBaseScore = s.score;
  const waveBaseCombo = s.maxCombo;

  const newRule    = pickWaveRule(nextWaveNum, s.config);
  const newTrigger = generateWaveTrigger(
    nextWaveNum,
    s.config.waveTrigger,
    waveBaseScore,
    waveBaseCombo,
  );
  const mutation = isMutationWave(nextWaveNum);

  store.update(() => ({
    wave: nextWaveNum,
    activeRule: newRule,
    waveTrigger: newTrigger,
    waveBaseScore,
    waveBaseCombo,
  }));

  clearAllEnemies();
  showWaveBanner(nextWaveNum, newRule.label, mutation);

  setTimeout(() => {
    spawnInitialEnemies();
    startMarchTimer();
    hudUpdate();
    sfxWaveUp();
  }, 1800);
}

// ─── Wave banner — same animation as SHIFT message ───────────────────────────
function showWaveBanner(wave: number, ruleLabel: string, mutation: boolean): void {
  const existing = document.getElementById('wave-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'wave-banner';
  banner.innerHTML = `
    <span class="wave-banner-num">WAVE ${wave}</span>
    <small class="wave-banner-rule">${mutation ? '⚡ ' : ''}${ruleLabel}</small>
  `;
  document.body.appendChild(banner);

  // Force reflow then animate
  void banner.offsetWidth;
  banner.classList.add('active');

  setTimeout(() => {
    banner.classList.remove('active');
    setTimeout(() => banner.remove(), 400);
  }, 1400);
}

// ─── Game flow ────────────────────────────────────────────────────────────────
function spawnInitialEnemies(): void {
  const s = store.get();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const gx = s.px + Math.round(Math.cos(angle) * SPAWN_R);
    const gy = s.py + Math.round(Math.sin(angle) * SPAWN_R);
    spawnEnemy(gx, gy, s.px, s.py);
  }
  ensureValidTarget(s.px, s.py, s.activeRule, s.player);
}

function startGame(config?: LobbyConfig): void {
  stopMarchTimer();
  clearAllEnemies();
  clearCellPool();
  (trailSvg as any).innerHTML = '';

  const activeConfig: LobbyConfig = config ?? { ...DEFAULT_LOBBY_CONFIG };
  const rule    = pickWaveRule(activeConfig.startingWave, activeConfig);
  const trigger = generateWaveTrigger(
    activeConfig.startingWave,
    activeConfig.waveTrigger,
    0,
    0,
  );

  resetStore(activeConfig, rule, trigger);

  perfectShiftCharges = 1;
  perfectKillCounter  = 0;
  shiftOnCooldown     = false;

  const s = store.get();
  renderPlayer(s.player);
  updateComboRings(0);
  hideAllOverlays();
  renderSlots([]);
  reposition(s.px, s.py);
  hudUpdate();
  spawnInitialEnemies();
  store.set({ gameActive: true });
  setInputActive(true);
  metroBeat = 0;
  showMetronome();
  startMarchTimer();
}

function continueEndless(): void {
  hideAllOverlays();
  store.update(st => ({
    config: { ...st.config, rulePool: [...st.config.rulePool, '__endless__'] },
    gameActive: true,
  }));
  setInputActive(true);
  showMetronome();
  advanceWave();
}

function nextWave(): void {
  hideAllOverlays();
  advanceWave();
}

// ─── Auth bootstrap ───────────────────────────────────────────────────────────
function updateStartScreenForAuth(username: string | null): void {
  const signInBtn  = document.getElementById('btn-signin')!;
  const createBtn  = document.getElementById('btn-register')!;
  const signOutBtn = document.getElementById('btn-signout')!;
  const playBtn    = document.getElementById('start-play-btn')!;

  if (username) {
    signInBtn.style.display  = 'none';
    createBtn.style.display  = 'none';
    signOutBtn.style.display = 'inline-flex';
    playBtn.textContent = 'OPEN LOBBY';
    playBtn.onclick = () => openLobby();
  } else {
    signInBtn.style.display  = 'inline-flex';
    createBtn.style.display  = 'inline-flex';
    signOutBtn.style.display = 'none';
    playBtn.textContent = 'PLAY AS GUEST';
    playBtn.onclick = () => startGame();
  }
}

async function bootstrapAuth(): Promise<void> {
  initUsernameModal();

  initAuthModal((username) => {
    updateAuthChip(username);
    updateStartScreenForAuth(username);
  });

  initLobby((config: LobbyConfig) => {
    startGame(config);
  });

  // Wire immediately so guests can play before async resolves
  updateStartScreenForAuth(null);

  document.getElementById('ht')!.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest('#auth-chip');
    if (chip && !getCachedProfile()) openAuthModal('signin');
  });

  document.getElementById('btn-signin')!.addEventListener('click', () => openAuthModal('signin'));
  document.getElementById('btn-register')!.addEventListener('click', () => openAuthModal('signup'));
  document.getElementById('btn-signout')!.addEventListener('click', async () => {
    await signOut();
    clearProfileCache();
    updateAuthChip(null);
    updateStartScreenForAuth(null);
  });

  onAuthStateChange(async (user) => {
    if (user) {
      await handleUserResolved(user);
    } else {
      clearProfileCache();
      updateAuthChip(null);
      updateStartScreenForAuth(null);
    }
  });

  const user = await getCurrentUser();
  if (user) {
    await handleUserResolved(user);
  }
}

bootstrapAuth();

// ─── Initial layout + resize ──────────────────────────────────────────────────
window.addEventListener('resize', () => reposition(store.get().px, store.get().py));
reposition(0, 0);
