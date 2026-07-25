// src/supabase/profiles.ts
import { supabase } from './client';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

let cachedProfile: { userId: string; profile: Profile } | null = null;

export function getCachedProfile(): Profile | null {
  return cachedProfile?.profile ?? null;
}

export function clearProfileCache(): void {
  cachedProfile = null;
}

/**
 * Fetch the profile for the given user.
 *
 * Returns `null` only when the profile genuinely does not exist (a
 * successful query with no matching row) — callers rely on that to decide
 * whether to prompt for a new username. On a network/query failure this
 * throws instead, so a transient error can never be mistaken for "no
 * profile yet" and misroute a returning user into the username-creation
 * flow.
 */
export async function fetchProfile(user: User): Promise<Profile | null> {
  if (cachedProfile && cachedProfile.userId === user.id) return cachedProfile.profile;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[profiles] fetchProfile failed:', error.message);
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  if (!data) return null;

  cachedProfile = { userId: user.id, profile: data as Profile };
  return cachedProfile.profile;
}

/** Set the cache directly (used after username modal confirms) */
export function setCachedProfile(profile: Profile): void {
  cachedProfile = { userId: profile.id, profile };
}
