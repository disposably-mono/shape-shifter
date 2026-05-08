// ─────────────────────────────────────────────
// Shared type definitions for Shape Shifter
// ─────────────────────────────────────────────

export type Shape = 'circle' | 'square' | 'triangle';
export type Color = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'cyan' | 'lime';
export type DifficultyTier = 'easy' | 'normal' | 'hard' | 'brutal';
export type WaveTriggerType = 'score' | 'combo' | 'random';
export type Direction = { dx: number; dy: number; sym: string };

export interface EnemyDef {
  id: string;
  shape: Shape;
  color: Color;
  weight: number;
  speed?: number;
  special?: string;
}

export interface Rule {
  id: string;
  label: string;          // HTML string for HUD
  description: string;    // plain text for lobby
  difficulty: 1 | 2 | 3;
  check: (enemy: EnemyDef, player: PlayerState) => boolean;
}

export interface PlayerState {
  shape: Shape;
  color: Color;
}

export interface DifficultyConfig {
  tier: DifficultyTier;
  marchSpeedMultiplier: number;
  spawnRateMultiplier: number;
  scoreMultiplier: number;
}

export interface LobbyConfig {
  startingWave: number;       // 1–10
  startingLives: number;      // 1–5
  difficulty: DifficultyTier;
  rulePool: string[];          // Rule IDs
  waveTrigger: WaveTriggerType;
}

export interface WaveTrigger {
  type: 'score' | 'combo';
  threshold: number;
}

export interface GameState {
  px: number;
  py: number;
  player: PlayerState;
  activeRule: Rule;
  score: number;
  combo: number;
  maxCombo: number;
  wave: number;
  lives: number;
  gameActive: boolean;
  inputSeq: Direction[];
  config: LobbyConfig;
  waveTrigger: WaveTrigger;
  waveBaseScore: number;
  waveBaseCombo: number;
}

export interface ScoreSubmission {
  user_id:        string;
  username:       string;
  score:          number;
  raw_score:      number;
  wave:           number;
  max_combo:      number;
  difficulty:     DifficultyTier;
  wave_trigger:   WaveTriggerType;
  starting_wave:  number;
  starting_lives: number;
}

export interface LeaderboardFilters {
  difficulty:     DifficultyTier | null;
  wave_trigger:   WaveTriggerType | null;
  starting_wave:  number | null;
  starting_lives: number | null;
}

export interface ScoreRow extends ScoreSubmission {
  id:           string;
  submitted_at: string;
}

export interface Enemy {
  id: string;
  def: EnemyDef;
  gx: number;
  gy: number;
  el: HTMLElement;
  shapeEl: HTMLElement;
}

export interface DifficultyCalc {
  marchTick: number;
  spawnCount: number;
}
