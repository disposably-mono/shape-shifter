// src/ui/username-modal.ts

import { supabase } from '../supabase/client';

let modalEl: HTMLElement | null = null;
let onComplete: ((username: string) => void) | null = null;
let currentUserId: string | null = null;

export function initUsernameModal(): void {
  modalEl = document.createElement('div');
  modalEl.id = 'username-modal';
  modalEl.style.display = 'none';
  modalEl.innerHTML = `
    <div id="username-modal-inner">
      <h2>CHOOSE YOUR NAME</h2>
      <p class="username-modal-sub">This is how you'll appear on the leaderboard.</p>
      <input
        type="text"
        id="username-input"
        placeholder="Enter username"
        maxlength="20"
        autocomplete="off"
        spellcheck="false"
      />
      <p id="username-error" style="display:none"></p>
      <button id="username-confirm" class="auth-btn-primary">CONFIRM</button>
    </div>
  `;
  document.body.appendChild(modalEl);
  bindEvents();
}

export function openUsernameModal(userId: string, callback: (username: string) => void): void {
  if (!modalEl) return;
  currentUserId = userId;
  onComplete = callback;
  const input = modalEl.querySelector('#username-input') as HTMLInputElement;
  input.value = '';
  hideError();
  modalEl.style.display = 'flex';
  setTimeout(() => input.focus(), 60);
}

export function closeUsernameModal(): void {
  if (!modalEl) return;
  modalEl.style.display = 'none';
  currentUserId = null;
  onComplete = null;
}

function bindEvents(): void {
  modalEl!.querySelector('#username-confirm')!.addEventListener('click', handleConfirm);
  (modalEl!.querySelector('#username-input') as HTMLInputElement)
    .addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') handleConfirm();
    });
}

async function handleConfirm(): Promise<void> {
  const input = modalEl!.querySelector('#username-input') as HTMLInputElement;
  const raw = input.value.trim();

  const validationError = validate(raw);
  if (validationError) { showError(validationError); return; }

  setLoading(true);

  // Check uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', raw)
    .maybeSingle();

  if (existing) {
    setLoading(false);
    showError('That username is already taken.');
    return;
  }

  // Upsert profile
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: currentUserId, username: raw }, { onConflict: 'id' });

  setLoading(false);

  if (error) {
    showError('Something went wrong. Please try again.');
    return;
  }

  const complete = onComplete;
  closeUsernameModal();
  complete?.(raw);
}

function validate(value: string): string | null {
  if (!value) return 'Username cannot be empty.';
  if (value.length < 3) return 'At least 3 characters required.';
  if (value.length > 20) return 'Maximum 20 characters.';
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Letters, numbers, and underscores only.';
  return null;
}

function showError(msg: string): void {
  const el = modalEl!.querySelector('#username-error') as HTMLElement;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError(): void {
  const el = modalEl!.querySelector('#username-error') as HTMLElement;
  el.style.display = 'none';
}

function setLoading(loading: boolean): void {
  const btn = modalEl!.querySelector('#username-confirm') as HTMLButtonElement;
  const input = modalEl!.querySelector('#username-input') as HTMLInputElement;
  btn.disabled = loading;
  btn.textContent = loading ? 'SAVING...' : 'CONFIRM';
  input.disabled = loading;
}
