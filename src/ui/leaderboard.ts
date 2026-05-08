// src/ui/leaderboard.ts
import { fetchLeaderboard } from '../supabase/scores';
import { getCachedProfile } from '../supabase/profiles';
import type { LeaderboardFilters, ScoreRow, DifficultyTier, WaveTriggerType } from '../types/index';

let overlayEl: HTMLElement | null = null;
let currentFilters: LeaderboardFilters = {
  difficulty:     null,
  wave_trigger:   null,
  starting_wave:  null,
  starting_lives: null,
};
let isLoading = false;

// ── Init ─────────────────────────────────────────────────────────────────────
export function initLeaderboard(): void {
  overlayEl = document.createElement('div');
  overlayEl.id = 'lb-overlay';
  overlayEl.style.display = 'none';
  overlayEl.innerHTML = buildHTML();
  document.body.appendChild(overlayEl);
  bindEvents();
}

// ── Open / Close ──────────────────────────────────────────────────────────────
export function openLeaderboard(): void {
  if (!overlayEl) return;
  overlayEl.style.display = 'flex';
  refresh();
}

export function closeLeaderboard(): void {
  if (!overlayEl) return;
  overlayEl.style.display = 'none';
}

// ── HTML ──────────────────────────────────────────────────────────────────────
function buildHTML(): string {
  const wavePills = ['ANY', ...Array.from({ length: 10 }, (_, i) => String(i + 1))]
    .map((v, i) => {
      const val    = i === 0 ? '' : v;
      const active = i === 0 ? ' active' : '';
      return `<button class="lb-pill${active}" data-filter="starting_wave" data-value="${val}">${v}</button>`;
    }).join('');

  const livesPills = ['ANY', '1', '2', '3', '4', '5']
    .map((v, i) => {
      const val    = i === 0 ? '' : v;
      const active = i === 0 ? ' active' : '';
      return `<button class="lb-pill${active}" data-filter="starting_lives" data-value="${val}">${v}</button>`;
    }).join('');

  return `
    <div id="lb-inner">
      <div id="lb-header">
        <h2>LEADERBOARD</h2>
        <button id="lb-close" aria-label="Close">✕</button>
      </div>

      <div id="lb-filters">

        <div class="lb-filter-group">
          <span class="lb-filter-label">DIFFICULTY</span>
          <div class="lb-pill-row">
            <button class="lb-pill active" data-filter="difficulty" data-value="">ANY</button>
            <button class="lb-pill" data-filter="difficulty" data-value="easy">EASY<span>×0.5</span></button>
            <button class="lb-pill" data-filter="difficulty" data-value="normal">NORMAL<span>×1.0</span></button>
            <button class="lb-pill" data-filter="difficulty" data-value="hard">HARD<span>×1.5</span></button>
            <button class="lb-pill" data-filter="difficulty" data-value="brutal">BRUTAL<span>×2.5</span></button>
          </div>
        </div>

        <div class="lb-filter-group">
          <span class="lb-filter-label">WAVE TRIGGER</span>
          <div class="lb-pill-row">
            <button class="lb-pill active" data-filter="wave_trigger" data-value="">ANY</button>
            <button class="lb-pill" data-filter="wave_trigger" data-value="score">SCORE</button>
            <button class="lb-pill" data-filter="wave_trigger" data-value="combo">COMBO</button>
            <button class="lb-pill" data-filter="wave_trigger" data-value="random">RANDOM</button>
          </div>
        </div>

        <div class="lb-filter-group lb-filter-group-row">
          <div class="lb-filter-sub">
            <span class="lb-filter-label">STARTING WAVE</span>
            <div class="lb-pill-row lb-pill-row-wrap">${wavePills}</div>
          </div>
          <div class="lb-filter-sub">
            <span class="lb-filter-label">STARTING LIVES</span>
            <div class="lb-pill-row">${livesPills}</div>
          </div>
        </div>

      </div>

      <div id="lb-table-wrap">
        <div id="lb-status"></div>
        <table id="lb-table">
          <thead>
            <tr>
              <th class="lb-col-rank">#</th>
              <th class="lb-col-user">PLAYER</th>
              <th class="lb-col-score">SCORE</th>
              <th class="lb-col-wave">WAVE</th>
              <th class="lb-col-combo">COMBO</th>
              <th class="lb-col-diff">DIFF</th>
            </tr>
          </thead>
          <tbody id="lb-tbody"></tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Events ────────────────────────────────────────────────────────────────────
function bindEvents(): void {
  overlayEl!.querySelector('#lb-close')!.addEventListener('click', closeLeaderboard);

  overlayEl!.addEventListener('click', (e) => {
    if (e.target === overlayEl) { closeLeaderboard(); return; }

    const btn = (e.target as HTMLElement).closest<HTMLElement>('.lb-pill');
    if (!btn) return;

    const filterKey = btn.dataset.filter as keyof LeaderboardFilters;
    const rawValue  = btn.dataset.value ?? '';

    btn.closest('.lb-pill-row')!
      .querySelectorAll('.lb-pill')
      .forEach(p => p.classList.remove('active'));
    btn.classList.add('active');

    if (filterKey === 'difficulty') {
      currentFilters.difficulty = rawValue === '' ? null : rawValue as DifficultyTier;
    } else if (filterKey === 'wave_trigger') {
      currentFilters.wave_trigger = rawValue === '' ? null : rawValue as WaveTriggerType;
    } else if (filterKey === 'starting_wave') {
      currentFilters.starting_wave = rawValue === '' ? null : parseInt(rawValue, 10);
    } else if (filterKey === 'starting_lives') {
      currentFilters.starting_lives = rawValue === '' ? null : parseInt(rawValue, 10);
    }

    refresh();
  });
}

// ── Data & render ─────────────────────────────────────────────────────────────
async function refresh(): Promise<void> {
  if (isLoading) return;
  isLoading = true;
  setStatus('LOADING...');
  clearTable();

  const rows = await fetchLeaderboard(currentFilters, 50);
  isLoading = false;

  if (rows.length === 0) {
    setStatus('NO SCORES YET.');
    return;
  }

  setStatus('');
  renderTable(rows);
}

function renderTable(rows: ScoreRow[]): void {
  const currentId = getCachedProfile()?.id ?? null;
  const tbody = overlayEl!.querySelector('#lb-tbody')!;

  tbody.innerHTML = rows.map((row, i) => {
    const mine     = currentId !== null && row.user_id === currentId;
    const rankCell = i < 3
      ? `<td class="lb-col-rank lb-rank-medal lb-medal-${i + 1}">${i + 1}</td>`
      : `<td class="lb-col-rank">${i + 1}</td>`;

    return `
      <tr class="${mine ? 'lb-own-row' : ''}">
        ${rankCell}
        <td class="lb-col-user">${esc(row.username)}${mine ? ' <span class="lb-you">YOU</span>' : ''}</td>
        <td class="lb-col-score">${row.score.toLocaleString()}</td>
        <td class="lb-col-wave">${row.wave}</td>
        <td class="lb-col-combo">×${row.max_combo}</td>
        <td class="lb-col-diff lb-diff-${row.difficulty}">${row.difficulty.toUpperCase()}</td>
      </tr>
    `;
  }).join('');
}

function setStatus(msg: string): void {
  const el = overlayEl!.querySelector('#lb-status') as HTMLElement;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function clearTable(): void {
  const tbody = overlayEl!.querySelector('#lb-tbody');
  if (tbody) tbody.innerHTML = '';
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
