import type { GameState, LobbyConfig, Rule, PlayerState, Direction, WaveTrigger } from '../types/index';
import { RULES } from '../config/rules';
import { SHAPES, COLORS, MAX_LIVES, MAX_INPUT } from './constants';

export const DEFAULT_LOBBY_CONFIG: LobbyConfig = {
  startingWave: 1,
  startingLives: MAX_LIVES,
  difficulty: 'normal',
  rulePool: Object.keys(RULES),
  waveTrigger: 'random',
};

function randomPlayer(): PlayerState {
  return {
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

export function createInitialState(
  config: LobbyConfig = DEFAULT_LOBBY_CONFIG,
  activeRule: Rule = RULES['SHAPE_OR_COLOR'],
  waveTrigger: WaveTrigger = { type: 'combo', threshold: 20 }
): GameState {
  return {
    px: 0,
    py: 0,
    player: randomPlayer(),
    activeRule,
    score: 0,
    combo: 0,
    maxCombo: 0,
    wave: config.startingWave,
    lives: config.startingLives,
    gameActive: false,
    inputSeq: [] as Direction[],
    config,
    waveTrigger,
    waveBaseScore: 0,
    waveBaseCombo: 0,
  };
}

// ─── Simple listener-based reactive store ───────────────────────────────────

type Listener = (state: GameState) => void;

class StateStore {
  private state: GameState;
  private listeners: Set<Listener> = new Set();

  constructor(initial: GameState) {
    this.state = initial;
  }

  get(): GameState {
    return this.state;
  }

  set(partial: Partial<GameState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  update(updater: (s: GameState) => Partial<GameState>): void {
    const patch = updater(this.state);
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l(this.state));
  }
}

export let store: StateStore = new StateStore(
  createInitialState()
);

/** Call this to reset the store at game start */
export function resetStore(config: LobbyConfig, activeRule: Rule, waveTrigger: WaveTrigger): void {
  store = new StateStore(createInitialState(config, activeRule, waveTrigger));
}
