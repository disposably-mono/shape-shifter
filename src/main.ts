// src/main.ts
import './style.css';
import { CSS_VARS, loadSavedPalette } from './config/colors';
import { getDifficulty, getScoreMultiplier } from './config/difficulty';
import { pickWaveRule, generateWaveTrigger, isWaveTriggerMet, isMutationWave } from './engine/waves';
import { store, resetStore, DEFAULT_LOBBY_CONFIG } from './engine/state';
import { initGrid, renderCells, getJumpableCells, clearCellPool } from './engine/grid';
import { initPlayer, renderPlayer, updateComboRings, animateJump } from './engine/player';
import {
  initEnemies, enemyAt, spawnEnemy, removeEnemy, clearAllEnemies,
  marchAll, refreshAllValid, repositionEnemies, ensureValidTarget,
  randomiseAllEnemies, refreshAllEnemyColors, setActiveWave,
  getAvailableShapes, getAvailableColors, countVisibleEnemies,
} from './engine/enemies';
import {
  initInput, setInputActive, setOverlayCallbacks,
  confirm as confirmInput, clear as clearInput, resetSeq,
} from './engine/input';
import { initProjection, updateProjection, drawTrail } from './engine/projection';
import { displaceNearby, executeShift } from './engine/combat';
import { isExactMatch } from './config/rules';
import { calcScore, calcPerfectShiftScore } from './engine/scoring';
import { initHUD, updateHUD, flashCombo, showComboReset, updateAuthChip } from './ui/hud';
import { showOverlay, hideAllOverlays } from './ui/overlays';
import { initMetronome, tickMetronome, showMetronome, hideMetronome } from './ui/metronome';
import { initDpad } from './ui/dpad';
import { initLobby, openLobby, closeLobby } from './ui/lobby';
import { initAuthModal, openAuthModal, handleUserResolved, closeAuthModal } from './ui/auth-modal';
import { initUsernameModal, closeUsernameModal } from './ui/username-modal';
import { onAuthStateChange, signOut } from './supabase/auth';
import { getCachedProfile, clearProfileCache } from './supabase/profiles';
import { submitScore } from './supabase/scores';
import { initLeaderboard, openLeaderboard, closeLeaderboard } from './ui/leaderboard';
import { initOptions, openOptions, closeOptions } from './ui/options';
import {
  sfxElim, sfxComboReset, sfxShift,
  sfxComboMilestone, sfxWaveUp,
  sfxMetronomeDown, sfxMetronomeUp,
} from './engine/audio';
import {
  C, SPAWN_R, MAX_INPUT, MAX_SHIFT_CHARGES, PERFECT_KILLS_PER_CHARGE,
  INITIAL_ENEMY_COUNT, SHIFT_COOLDOWN_MS, WAVE_BANNER_DELAY_MS, WAVE_BANNER_SHOW_MS,
} from './engine/constants';
import { initHitstop, triggerHitstop, cancelHitstop } from './engine/hitstop';
import {
  initStartCanvas, stopStartCanvas,
  pulseStartCanvas, refreshStartCanvasPalette,
} from './ui/start-canvas';
import type { LobbyConfig, GameState, ScoreSubmission } from './types/index';

// ─── Inject CSS tokens then apply any saved palette override ─────────────────
const styleEl = document.createElement('style');
styleEl.textContent = `:root { ${CSS_VARS} }`;
document.head.appendChild(styleEl);
loadSavedPalette();

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
let perfectShiftCharges = 1;
let perfectKillCounter  = 0;
let shiftOnCooldown     = false;
let shiftCooldownTimer: ReturnType<typeof setTimeout> | null = null;

function onPerfectKill(): void {
  perfectKillCounter++;
  if (perfectKillCounter >= PERFECT_KILLS_PER_CHARGE) {
    perfectKillCounter  = 0;
    perfectShiftCharges = Math.min(perfectShiftCharges + 1, MAX_SHIFT_CHARGES);
  }
  hudUpdate();
}

// ─── HUD helper ───────────────────────────────────────────────────────────────
function hudUpdate(): void {
  const s = store.get();
  updateComboRings(s.combo);
  updateHUD(s, perfectShiftCharges, perfectKillCounter, shiftOnCooldown);
}

// ─── March timer ──────────────────────────────────────────────────────────────
let marchTimer: ReturnType<typeof setInterval> | null = null;

function stopMarchTimer(): void {
  if (marchTimer !== null) { clearInterval(marchTimer); marchTimer = null; }
  cancelHitstop(true);                          // ← cancel any pending freeze, skip auto-resume
  document.getElementById('vp')?.classList.remove('time-freeze');
}

function startMarchTimer(): void {
  stopMarchTimer();
  const s    = store.get();
  const diff = getDifficulty(s.config.difficulty, s.wave, s.combo, s.activeRule.id);
  document.documentElement.style.setProperty('--metro-duration', diff.marchTick + 'ms');
  marchTimer = setInterval(marchTick, diff.marchTick);
}

// After both functions are declared, wire hitstop:
initHitstop(
  () => { if (marchTimer !== null) { clearInterval(marchTimer); marchTimer = null; } },
  () => startMarchTimer(),
);

function refreshMarchTimer(): void {
  if (!store.get().gameActive) return;
  startMarchTimer();
}

function marchTick(): void {
  const s = store.get();
  if (!s.gameActive) return;
  setActiveWave(s.wave);

  metroBeat = (metroBeat + 1) % 2;
  tickMetronome();
  metroBeat === 0 ? sfxMetronomeDown() : sfxMetronomeUp();

  pulseStartCanvas();

  const visCount = countVisibleEnemies(s.px, s.py);
  const diff = getDifficulty(s.config.difficulty, s.wave, s.combo, s.activeRule.id, visCount);
  const hit  = marchAll(s.px, s.py, diff.spawnCount, s.activeRule, s.player);
  if (hit) { doShift(); return; }
  refreshAllValid(s.activeRule, s.player, s.px, s.py);
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

    const tx     = s.px + dx, ty = s.py + dy;
    const target = enemyAt(tx, ty);

    if (!target) {
      doComboReset();
      clearQueuedInput();
      return;
    }

    if (s.activeRule.check(target.def, s.player)) {
      const fromGX    = s.px, fromGY = s.py;
      const exact     = isExactMatch(target.def, s.player);
      const elimShape = target.def.shape;

      const chainKills = displaceNearby(tx, ty, tx, ty, s.activeRule, s.player, worldEl, elimShape, s.combo, exact, fromGX, fromGY);
      removeEnemy(target.id);
      store.update(st => ({ px: tx, py: ty }));
      const ns = store.get();

      drawTrail(fromGX, fromGY, tx, ty, ns.px, ns.py);
      animateJump(pbody);
      reposition(ns.px, ns.py);

      if (exact) {
        const gain      = calcPerfectShiftScore(ns.combo, ns.config.difficulty);
        const newPlayer = executeShift(ns.px, ns.py);
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
        const ns2 = store.get();
        randomiseAllEnemies(ns2.activeRule, ns2.player, ns2.px, ns2.py);
        refreshAllValid(ns2.activeRule, ns2.player, ns2.px, ns2.py);
        flashCombo();
        sfxComboMilestone(ns2.combo);
        triggerHitstop(store.get().config.difficulty, true);          // ❄️ bonus/exact-match kill
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
        triggerHitstop(store.get().config.difficulty);          // ❄️ normal kill
      }

      // Handle chain kills from knockback collisions
      for (const _def of chainKills) {
        const cs = store.get();
        const gain = calcScore(cs.combo, cs.config.difficulty);
        store.update(st => ({
          score:    st.score + gain,
          combo:    st.combo + 1,
          maxCombo: Math.max(st.maxCombo, st.combo + 1),
        }));
        sfxElim();
      }
      if (chainKills.length > 0) {
        flashCombo();
        sfxComboMilestone(store.get().combo);
        hudUpdate();
      }

      const fs = store.get();
      ensureValidTarget(fs.px, fs.py, fs.activeRule, fs.player);
      refreshAllValid(fs.activeRule, fs.player, fs.px, fs.py);
      hudUpdate();
      checkWaveTrigger();
    } else {
      doShift();
    }

    clearQueuedInput();
  },
  onClear() {
    clearQueuedInput();
  },
});

// ─── Overlay keyboard shortcuts (Enter = retry, Backspace = configure) ────────
setOverlayCallbacks({
  onRetry:     () => startGame(),
  onConfigure: () => {
    hideAllOverlays();
    openLobby();
  },
});

// ─── Button event wiring ──────────────────────────────────────────────────────
document.getElementById('eb')!.addEventListener('click', confirmInput);
document.getElementById('cb')!.addEventListener('click', clearInput);
document.getElementById('win-retry-btn')!.addEventListener('click', () => startGame());
document.getElementById('win-endless-btn')!.addEventListener('click', continueEndless);
document.getElementById('win-lb-btn')!.addEventListener('click', () => openLeaderboard());
document.getElementById('lose-retry-btn')!.addEventListener('click', () => startGame());
document.getElementById('lose-configure-btn')!.addEventListener('click', () => {
  hideAllOverlays();
  openLobby();
});
document.getElementById('lose-lb-btn')!.addEventListener('click', () => openLeaderboard());
document.getElementById('guest-cta-btn')!.addEventListener('click', () => openAuthModal('signup'));

// ─── Hotkey: Q = manual perfect shift ────────────────────────────────────────
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key !== 'q' && e.key !== 'Q') return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  e.preventDefault();
  doPerfectShift();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function triggerBreakHeart(): void {
  breakHeart.classList.remove('active');
  void breakHeart.offsetWidth;
  breakHeart.classList.add('active');
  setTimeout(() => breakHeart.classList.remove('active'), 900);
}

function reposition(px: number, py: number): void {
  const cx = vpEl.clientWidth  / 2 - C / 2;
  const cy = vpEl.clientHeight / 2 - C / 2;
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

function clearQueuedInput(): void {
  resetSeq();
  store.set({ inputSeq: [] });
  renderSlots([]);
  const s = store.get();
  updateProjection([], s.px, s.py, s.player, s.gameActive);
}

function doComboReset(): void {
  if (store.get().combo === 0) return;
  store.set({ combo: 0 });
  showComboReset();
  sfxComboReset();
  refreshMarchTimer();
  hudUpdate();
}

// ─── Toast notification ──────────────────────────────────────────────────────
function showToast(msg: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 3000);
}

async function submitAndNotify(submission: ScoreSubmission): Promise<void> {
  const ok = await submitScore(submission);
  if (!ok) showToast('Score upload failed — check your connection');
}

// ─── Score submission ─────────────────────────────────────────────────────────
function buildSubmission(s: GameState, profile: { id: string; username: string }): ScoreSubmission {
  return {
    user_id:        profile.id,
    username:       profile.username,
    score:          s.score,
    raw_score:      Math.round(s.score / getScoreMultiplier(s.config.difficulty)),
    wave:           s.wave,
    max_combo:      s.maxCombo,
    difficulty:     s.config.difficulty,
    wave_trigger:   s.config.waveTrigger,
    starting_wave:  s.config.startingWave,
    starting_lives: s.config.startingLives,
  };
}

// ─── SHIFT (life lost) ────────────────────────────────────────────────────────
function doShift(): void {
  const s = store.get();
  if (!s.gameActive) return;
  stopMarchTimer();

  const newPlayer = executeShift(s.px, s.py);
  store.update(st => ({ lives: st.lives - 1, combo: 0, player: newPlayer }));

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
  randomiseAllEnemies(ns.activeRule, ns.player, ns.px, ns.py);
  refreshAllValid(ns.activeRule, ns.player, ns.px, ns.py);
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

    const profile = getCachedProfile();
    if (profile) void submitAndNotify(buildSubmission(ns, profile));

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

  shiftCooldownTimer = setTimeout(() => {
    shiftOnCooldown    = false;
    shiftCooldownTimer = null;
    hudUpdate();
  }, SHIFT_COOLDOWN_MS);

  const gain      = calcPerfectShiftScore(s.combo, s.config.difficulty);
  const newPlayer = executeShift(s.px, s.py);
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
  randomiseAllEnemies(ns.activeRule, ns.player, ns.px, ns.py);
  refreshAllValid(ns.activeRule, ns.player, ns.px, ns.py);
  reposition(ns.px, ns.py);
  flashCombo();
  sfxComboMilestone(ns.combo);
  triggerHitstop(store.get().config.difficulty, true);          // ❄️ perfect shift
  ensureValidTarget(ns.px, ns.py, ns.activeRule, ns.player);
  hudUpdate();
  checkWaveTrigger();
}

// ─── Wave logic ───────────────────────────────────────────────────────────────
function checkWaveTrigger(): void {
  const s = store.get();
  if (!isWaveTriggerMet(s.waveTrigger, s.score, s.maxCombo)) return;
  if (s.wave >= 5 && !s.config.rulePool.includes('__endless__')) {
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

  const winProfile = getCachedProfile();
  if (winProfile) void submitAndNotify(buildSubmission(s, winProfile));

  showOverlay('win-ov');
}

function advanceWave(): void {
  stopMarchTimer();
  setInputActive(false);                        // ← block input during the wave banner
  const s = store.get();
  const nextWaveNum   = s.wave + 1;
  const waveBaseScore = s.score;
  const waveBaseCombo = s.maxCombo;

  setActiveWave(nextWaveNum);                   // ← keep enemy pool in sync with the new wave

  const newRule    = pickWaveRule(nextWaveNum, s.config);
  const newTrigger = generateWaveTrigger(
    nextWaveNum,
    s.config.waveTrigger,
    waveBaseScore,
    waveBaseCombo,
    s.config.difficulty,
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
    setInputActive(true);                       // ← re-enable input now that the new wave has spawned
    hudUpdate();
    sfxWaveUp();
  }, WAVE_BANNER_DELAY_MS);
}

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
  void banner.offsetWidth;
  banner.classList.add('active');

  setTimeout(() => {
    banner.classList.remove('active');
    setTimeout(() => banner.remove(), 400);
  }, WAVE_BANNER_SHOW_MS);
}

// ─── Game flow ────────────────────────────────────────────────────────────────
function spawnInitialEnemies(): void {
  const s = store.get();
  for (let i = 0; i < INITIAL_ENEMY_COUNT; i++) {
    const angle = (i / INITIAL_ENEMY_COUNT) * Math.PI * 2;
    const gx    = s.px + Math.round(Math.cos(angle) * SPAWN_R);
    const gy    = s.py + Math.round(Math.sin(angle) * SPAWN_R);
    spawnEnemy(gx, gy, s.px, s.py);
  }
  ensureValidTarget(s.px, s.py, s.activeRule, s.player);
}

function startGame(config?: LobbyConfig): void {
  stopStartCanvas();
  stopMarchTimer();
  clearAllEnemies();
  clearCellPool();
  trailSvg.textContent = '';

  const rawConfig = config ?? store.get().config;
  // Strip the internal '__endless__' sentinel (appended by continueEndless())
  // so a fresh RETRY doesn't inherit it from the stored config and skip the
  // win screen on the new run.
  const activeConfig: LobbyConfig = {
    ...rawConfig,
    rulePool: rawConfig.rulePool.filter(r => r !== '__endless__'),
  };
  const rule    = pickWaveRule(activeConfig.startingWave, activeConfig);
  const trigger = generateWaveTrigger(
    activeConfig.startingWave,
    activeConfig.waveTrigger,
    0, 0,
    activeConfig.difficulty,
  );

  setActiveWave(activeConfig.startingWave);
  resetStore(activeConfig, rule, trigger, getAvailableShapes(), getAvailableColors());

  perfectShiftCharges = 1;
  perfectKillCounter  = 0;
  shiftOnCooldown     = false;
  if (shiftCooldownTimer !== null) { clearTimeout(shiftCooldownTimer); shiftCooldownTimer = null; }

  // Clear any leftover input from previous run
  resetSeq();

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
    playBtn.textContent = 'START RUN';
    playBtn.onclick     = () => startGame();
  } else {
    signInBtn.style.display  = 'inline-flex';
    createBtn.style.display  = 'inline-flex';
    signOutBtn.style.display = 'none';
    playBtn.textContent = 'START RUN';
    playBtn.onclick     = () => startGame();
  }
}

async function bootstrapAuth(): Promise<void> {
  initUsernameModal();
  initLeaderboard();
  initOptions();

  initAuthModal((username) => {
    updateAuthChip(username);
    updateStartScreenForAuth(username);
  });

  initLobby((config: LobbyConfig) => {
    startGame(config);
  });

  // Wire immediately — guests can play before async resolves
  updateStartScreenForAuth(null);

  // Configure run button on start screen opens lobby
  document.getElementById('start-configure-btn')!.addEventListener('click', () => openLobby());
  document.getElementById('start-leaderboard-btn')!.addEventListener('click', () => openLeaderboard());
  document.getElementById('start-options-btn')!.addEventListener('click', () => openOptions());

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

  // onAuthStateChange fires immediately with the current session (INITIAL_SESSION)
  // as well as on every subsequent change, so this alone covers both the
  // "already signed in on load" and "signs in later" cases — no need for a
  // separate getCurrentUser() + handleUserResolved() call, which would
  // otherwise run fetchProfile() twice for an already-authenticated user.
  onAuthStateChange(async (user) => {
    if (user) {
      await handleUserResolved(user);
    } else {
      clearProfileCache();
      updateAuthChip(null);
      updateStartScreenForAuth(null);
    }
  });
}

bootstrapAuth();
initStartCanvas();

// ─── Palette live refresh ─────────────────────────────────────────────────────
document.addEventListener('palettechange', () => {
  const s = store.get();
  refreshStartCanvasPalette();
  refreshAllEnemyColors();
  renderPlayer(s.player);
});

// ─── Global Escape navigation ─────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const modals: Array<[string, () => void]> = [
    ['username-modal',  closeUsernameModal],
    ['auth-modal',      closeAuthModal],
    ['options-overlay', closeOptions],
    ['lb-overlay',      closeLeaderboard],
    ['lobby-overlay',   closeLobby],
  ];
  for (const [id, close] of modals) {
    const el = document.getElementById(id);
    if (el && el.style.display !== 'none') {
      close();
      e.preventDefault();
      return;
    }
  }
});

// ─── Intro animation ──────────────────────────────────────────────────────────
const startOverlayEl  = document.getElementById('start-ov')!;
const startCanvasEl   = document.getElementById('start-canvas')!;

startOverlayEl.classList.add('intro');

function revealStartScreen(): void {
  if (!startOverlayEl.classList.contains('intro')) return;
  startOverlayEl.classList.remove('intro');
  // Brief canvas scale-down to signal "entering" the game
  startCanvasEl.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
  startCanvasEl.style.transform  = 'scale(0.88)';
  setTimeout(() => {
    startCanvasEl.style.transform = '';
    // Remove inline transition after so resize doesn't inherit it
    setTimeout(() => { startCanvasEl.style.transition = ''; }, 650);
  }, 600);
}

startCanvasEl.addEventListener('click', revealStartScreen);
startOverlayEl.addEventListener('click', (e) => {
  // Also clicking the hint area (which is inside start-right) should reveal
  if (startOverlayEl.classList.contains('intro')) revealStartScreen();
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (startOverlayEl.classList.contains('intro') && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    revealStartScreen();
  }
});

// ─── Initial layout + resize ──────────────────────────────────────────────────
let resizeTimer: ReturnType<typeof setTimeout>;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => reposition(store.get().px, store.get().py), 100);
});
reposition(0, 0);
