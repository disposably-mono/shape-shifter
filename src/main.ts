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
import { calcScore } from './engine/scoring';
import { initHUD, updateHUD, flashCombo, showComboReset } from './ui/hud';
import { showOverlay, hideAllOverlays } from './ui/overlays';
import { initMetronome, tickMetronome, showMetronome, hideMetronome } from './ui/metronome';
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
const vpEl      = document.getElementById('vp')!;
const worldEl   = document.getElementById('world')!;
const playerEl  = document.getElementById('player')!;
const pbody     = document.getElementById('p-body')!;
const pRings    = document.getElementById('p-rings') as unknown as SVGElement;
const projEl    = document.getElementById('projection')!;
const projBody  = document.getElementById('proj-body')!;
const trailSvg  = document.getElementById('trail-svg') as unknown as SVGElement;
const shiftMsg  = document.getElementById('shift-msg')!;
const breakHeart = document.getElementById('break-heart')!;

// ─── Module init ──────────────────────────────────────────────────────────────
initGrid(vpEl, worldEl);
initPlayer(pbody, pRings);
initEnemies(worldEl);
initProjection(projEl, projBody, trailSvg);
initHUD();
initMetronome();

// ─── Metro beat tracker ───────────────────────────────────────────────────────
let metroBeat = 0;

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
  updateHUD(store.get());
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

      displaceNearby(tx, ty, s.px, s.py, s.activeRule, s.player, worldEl);
      removeEnemy(target.id);
      store.update(() => ({ px: tx, py: ty }));
      const ns = store.get();

      drawTrail(fromGX, fromGY, tx, ty, ns.px, ns.py);
      animateJump(pbody);
      reposition(ns.px, ns.py);

      if (exact) {
        // Bonus SHIFT — no life lost, no screen shake, white notification
        const newPlayer = executeBonusShift(ns.px, ns.py);
        store.update(() => ({ combo: 0, player: newPlayer }));
        sfxShift();
        shiftMsg.classList.remove('active', 'bonus');
        void shiftMsg.offsetWidth;
        shiftMsg.classList.add('active', 'bonus');
        setTimeout(() => shiftMsg.classList.remove('active', 'bonus'), 1000);
        renderPlayer(store.get().player);
        randomiseAllEnemies();
        refreshAllValid(ns.activeRule, store.get().player);
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
      updateHUD(store.get());
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
  updateHUD(store.get());
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
  updateHUD(ns);

  if (ns.lives <= 0) {
    store.set({ gameActive: false });
    setInputActive(false);
    hideMetronome();
    (document.getElementById('lose-s') as HTMLElement).textContent =
      `SCORE: ${ns.score.toLocaleString()}  |  WAVE: ${ns.wave}  |  COMBO: ×${ns.maxCombo}`;
    showOverlay('lose-ov');
    return;
  }

  ensureValidTarget(ns.px, ns.py, ns.activeRule, ns.player);
  startMarchTimer();
}

// ─── Wave logic ───────────────────────────────────────────────────────────────
function checkWaveTrigger(): void {
  const s = store.get();
  if (isWaveTriggerMet(s.waveTrigger, s.score, s.combo)) advanceWave();
}

function advanceWave(): void {
  stopMarchTimer();
  const s = store.get();
  const nextWaveNum = s.wave + 1;
  const newRule     = pickWaveRule(nextWaveNum, s.config);
  const newTrigger  = generateWaveTrigger(nextWaveNum - 1, s.config.waveTrigger);
  const mutation    = isMutationWave(nextWaveNum);

  store.update(() => ({ wave: nextWaveNum, activeRule: newRule, waveTrigger: newTrigger, combo: 0 }));
  clearAllEnemies();
  showWaveBanner(nextWaveNum, newRule.label, mutation);

  setTimeout(() => {
    spawnInitialEnemies();
    startMarchTimer();
    updateHUD(store.get());
    sfxWaveUp();
  }, 1800);
}

function showWaveBanner(wave: number, ruleLabel: string, mutation: boolean): void {
  const existing = document.getElementById('wave-banner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'wave-banner';
  banner.innerHTML = `<span>WAVE ${wave}</span><small style="display:block;font-size:9px;opacity:.6;margin-top:4px;">${mutation ? '⚡ RULE MUTATION — ' : ''}${ruleLabel}</small>`;
  banner.style.cssText = [
    'position:fixed;top:0;left:50%;transform:translateX(-50%) translateY(-100%)',
    'background:var(--hud-bg);border:1px solid var(--hud-border)',
    'padding:12px 28px;border-radius:0 0 8px 8px',
    'font-family:Orbitron,sans-serif;font-size:12px;letter-spacing:2px',
    'color:var(--white);z-index:200;text-align:center',
    'transition:transform .4s cubic-bezier(.23,1.2,.32,1)',
  ].join(';');
  document.body.appendChild(banner);
  void banner.offsetWidth;
  banner.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    banner.style.transition += ',opacity .5s';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 600);
  }, 1200);
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

export function startGame(): void {
  stopMarchTimer();
  clearAllEnemies();
  clearCellPool();
  (trailSvg as any).innerHTML = '';

  const config: LobbyConfig = { ...DEFAULT_LOBBY_CONFIG };
  const rule    = pickWaveRule(config.startingWave, config);
  const trigger = generateWaveTrigger(config.startingWave - 1, config.waveTrigger);

  resetStore(config, rule, trigger);

  const s = store.get();
  renderPlayer(s.player);
  updateComboRings(0);
  hideAllOverlays();
  renderSlots([]);
  reposition(s.px, s.py);
  updateHUD(s);
  spawnInitialEnemies();
  store.set({ gameActive: true });
  setInputActive(true);
  metroBeat = 0;
  showMetronome();
  startMarchTimer();
}

export function nextWave(): void {
  hideAllOverlays();
  advanceWave();
}

// ─── Expose to HTML onclick attrs ────────────────────────────────────────────
(window as any).startGame    = startGame;
(window as any).nextWave     = nextWave;
(window as any).confirmInput = confirmInput;
(window as any).clearInput   = clearInput;

// ─── Initial layout + resize ──────────────────────────────────────────────────
window.addEventListener('resize', () => reposition(store.get().px, store.get().py));
reposition(0, 0);
