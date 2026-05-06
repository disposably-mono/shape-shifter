// src/supabase/auth.ts
import { supabase } from './client';
import type { User, AuthError } from '@supabase/supabase-js';

export type AuthResult =
  | { user: User; error: null }
  | { user: null; error: AuthError | Error };

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return { user: null, error: error ?? new Error('No user returned') };
  return { user: data.user, error: null };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { user: null, error: error ?? new Error('Sign in failed') };
  return { user: data.user, error: null };
}

export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  return { error };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
