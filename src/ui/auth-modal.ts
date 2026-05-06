// src/ui/auth-modal.ts

import { signIn, signUp, signInWithGoogle } from '../supabase/auth';
import { fetchProfile, setCachedProfile } from '../supabase/profiles';
import { openUsernameModal } from './username-modal';
import type { User } from '@supabase/supabase-js';

type ModalTab = 'signin' | 'signup';

let modalEl: HTMLElement | null = null;
let currentTab: ModalTab = 'signin';
let onAuthComplete: ((username: string) => void) | null = null;

export function initAuthModal(onComplete: (username: string) => void): void {
  onAuthComplete = onComplete;
  modalEl = document.createElement('div');
  modalEl.id = 'auth-modal';
  modalEl.style.display = 'none';
  modalEl.innerHTML = buildModalHTML();
  document.body.appendChild(modalEl);
  bindEvents();
}

export function openAuthModal(tab: ModalTab = 'signin'): void {
  if (!modalEl) return;
  setTab(tab);
  modalEl.style.display = 'flex';
}

export function closeAuthModal(): void {
  if (!modalEl) return;
  modalEl.style.display = 'none';
  clearError();
  clearFields();
}

function buildModalHTML(): string {
  return `
    <div id="auth-modal-inner">
      <button id="auth-close" aria-label="Close">✕</button>
      <h2 id="auth-title">SIGN IN</h2>
      <div id="auth-tabs">
        <button class="auth-tab active" data-tab="signin">Sign In</button>
        <button class="auth-tab" data-tab="signup">Create Account</button>
      </div>
      <div id="auth-error" style="display:none"></div>
      <div id="auth-success" style="display:none"></div>
      <div id="auth-fields">
        <input type="email" id="auth-email" placeholder="Email" autocomplete="email" />
        <input type="password" id="auth-password" placeholder="Password" autocomplete="current-password" />
        <button id="auth-submit" class="auth-btn-primary">SIGN IN</button>
      </div>
      <div class="auth-divider"><span>or</span></div>
      <button id="auth-google" class="auth-btn-google">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
      <p class="auth-note" id="auth-tab-note">
        Don't have an account? <a href="#" id="auth-switch-link">Create one</a>
      </p>
    </div>
  `;
}

function bindEvents(): void {
  if (!modalEl) return;
  modalEl.querySelector('#auth-close')!.addEventListener('click', closeAuthModal);
  modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeAuthModal(); });
  modalEl.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => setTab((btn as HTMLElement).dataset.tab as ModalTab));
  });
  modalEl.querySelector('#auth-switch-link')!.addEventListener('click', (e) => {
    e.preventDefault();
    setTab(currentTab === 'signin' ? 'signup' : 'signin');
  });
  modalEl.querySelector('#auth-submit')!.addEventListener('click', handleSubmit);
  modalEl.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') handleSubmit(); });
  });
  modalEl.querySelector('#auth-google')!.addEventListener('click', handleGoogle);
}

function setTab(tab: ModalTab): void {
  currentTab = tab;
  const isSignIn = tab === 'signin';
  modalEl!.querySelector('#auth-title')!.textContent = isSignIn ? 'SIGN IN' : 'CREATE ACCOUNT';
  (modalEl!.querySelector('#auth-submit') as HTMLButtonElement).textContent = isSignIn ? 'SIGN IN' : 'CREATE ACCOUNT';
  (modalEl!.querySelector('#auth-password') as HTMLInputElement).autocomplete = isSignIn ? 'current-password' : 'new-password';
  const switchLink = modalEl!.querySelector('#auth-switch-link')!;
  const note = modalEl!.querySelector('#auth-tab-note')!;
  if (isSignIn) {
    note.childNodes[0].textContent = "Don't have an account? ";
    switchLink.textContent = 'Create one';
  } else {
    note.childNodes[0].textContent = 'Already have an account? ';
    switchLink.textContent = 'Sign in';
  }
  modalEl!.querySelectorAll('.auth-tab').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab);
  });
  clearError();
}

async function handleSubmit(): Promise<void> {
  const email    = (modalEl!.querySelector('#auth-email')    as HTMLInputElement).value.trim();
  const password = (modalEl!.querySelector('#auth-password') as HTMLInputElement).value;
  if (!email || !password) { showError('Please enter your email and password.'); return; }

  setLoading(true);
  clearError();

  if (currentTab === 'signup') {
    const { user, error } = await signUp(email, password);
    setLoading(false);
    if (error) { showError(error.message); return; }
    // Supabase requires email confirmation by default — show message, don't proceed
    showSuccess('Account created! Check your email to confirm, then sign in.');
    return;
  }

  // Sign in
  const { user, error } = await signIn(email, password);
  setLoading(false);
  if (error || !user) { showError(error?.message ?? 'Sign in failed.'); return; }
  closeAuthModal();
  await handleUserResolved(user);
}

async function handleGoogle(): Promise<void> {
  const { error } = await signInWithGoogle();
  if (error) showError(error.message);
  // Redirect flow — handled in bootstrapAuth via onAuthStateChange
}

export async function handleUserResolved(user: User): Promise<void> {
  const profile = await fetchProfile(user);

  if (!profile) {
    // New user — prompt for username
    openUsernameModal(user.id, (username) => {
      setCachedProfile({ id: user.id, username, avatar_url: null, created_at: new Date().toISOString() });
      onAuthComplete?.(username);
    });
  } else {
    onAuthComplete?.(profile.username);
  }
}

function showError(msg: string): void {
  const el = modalEl!.querySelector('#auth-error') as HTMLElement;
  el.textContent = msg;
  el.style.display = 'block';
}

function showSuccess(msg: string): void {
  const el = modalEl!.querySelector('#auth-success') as HTMLElement;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError(): void {
  (modalEl!.querySelector('#auth-error') as HTMLElement).style.display = 'none';
  (modalEl!.querySelector('#auth-success') as HTMLElement).style.display = 'none';
}

function clearFields(): void {
  (modalEl!.querySelector('#auth-email')    as HTMLInputElement).value = '';
  (modalEl!.querySelector('#auth-password') as HTMLInputElement).value = '';
}

function setLoading(loading: boolean): void {
  const btn = modalEl!.querySelector('#auth-submit') as HTMLButtonElement;
  btn.disabled = loading;
  btn.textContent = loading ? 'LOADING...' : (currentTab === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT');
}
