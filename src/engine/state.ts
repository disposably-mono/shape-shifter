import type { GameState, LobbyConfig, Rule, PlayerState, Direction, WaveTrigger, Shape, Color } from '../types/index';
import { RULES } from '../config/rules';
import { SHAPES, COLORS, MAX_LIVES, MAX_INPUT } from './constants';

export const DEFAULT_LOBBY_CONFIG: LobbyConfig = {
  startingWave: 1,
  startingLives: MAX_LIVES,
  difficulty: 'normal',
  rulePool: Object.keys(RULES),
  waveTrigger: 'random',
};

function randomPlayer(shapes?: string[], colors?: string[]): PlayerState {
  const s = shapes?.length ? shapes : SHAPES as readonly string[];
  const c = colors?.length ? colors : COLORS as readonly string[];
  return {
    shape: s[Math.floor(Math.random() * s.length)] as Shape,
    color: c[Math.floor(Math.random() * c.length)] as Color,
  };
}

export function createInitialState(
  config: LobbyConfig = DEFAULT_LOBBY_CONFIG,
  activeRule: Rule = RULES['SHAPE_OR_COLOR'],
  waveTrigger: WaveTrigger = { type: 'combo', threshold: 20 },
  availableShapes?: string[],
  availableColors?: string[],
): GameState {
  return {
    px: 0,
    py: 0,
    player: randomPlayer(availableShapes, availableColors),
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

  reset(initial: GameState): void {
    this.state = initial;
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

export const store: StateStore = new StateStore(
  createInitialState()
);

export function resetStore(
  config: LobbyConfig,
  activeRule: Rule,
  waveTrigger: WaveTrigger,
  availableShapes?: string[],
  availableColors?: string[],
): void {
  store.reset(createInitialState(config, activeRule, waveTrigger, availableShapes, availableColors));
}
