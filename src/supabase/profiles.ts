// src/supabase/profiles.ts
import { supabase } from './client';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

let cachedProfile: Profile | null = null;

export function getCachedProfile(): Profile | null {
  return cachedProfile;
}

export function clearProfileCache(): void {
  cachedProfile = null;
}

export async function fetchOrCreateProfile(user: User): Promise<Profile | null> {
  // Try fetch first
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (existing && !fetchError) {
    cachedProfile = existing as Profile;
    return cachedProfile;
  }

  // Create on first login
  const username = generateUsername();
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id, username })
    .select()
    .single();

  if (insertError || !created) {
    console.error('Profile creation failed:', insertError);
    return null;
  }

  cachedProfile = created as Profile;
  return cachedProfile;
}

function generateUsername(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Player${digits}`;
}

/** Alias used by auth-modal — fetches without auto-creating */
export async function fetchProfile(user: User): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  cachedProfile = data as Profile;
  return cachedProfile;
}

/** Set the cache directly (used after username modal confirms) */
export function setCachedProfile(profile: Profile): void {
  cachedProfile = profile;
}
