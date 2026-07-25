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
