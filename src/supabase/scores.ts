// src/supabase/scores.ts
import { supabase } from './client';
import type { ScoreSubmission, ScoreRow, LeaderboardFilters } from '../types/index';

export async function submitScore(submission: ScoreSubmission): Promise<void> {
  const { error } = await supabase.from('scores').insert(submission);
  if (error) console.warn('[scores] submit failed:', error.message);
}

export async function fetchLeaderboard(
  filters: LeaderboardFilters = { difficulty: null, wave_trigger: null, starting_wave: null, starting_lives: null },
  limit = 50,
): Promise<ScoreRow[]> {
  let q = supabase
    .from('scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);

  if (filters.difficulty     !== null) q = q.eq('difficulty',     filters.difficulty);
  if (filters.wave_trigger   !== null) q = q.eq('wave_trigger',   filters.wave_trigger);
  if (filters.starting_wave  !== null) q = q.eq('starting_wave',  filters.starting_wave);
  if (filters.starting_lives !== null) q = q.eq('starting_lives', filters.starting_lives);

  const { data, error } = await q;
  if (error) { console.warn('[scores] fetch failed:', error.message); return []; }
  return (data ?? []) as ScoreRow[];
}
