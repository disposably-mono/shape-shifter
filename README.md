# Shape Shifter

A browser-based arcade puzzle game built with TypeScript and Vite. Navigate a grid, match enemies by shape and color, and survive as long as possible.

## Gameplay

You control a piece on an infinite grid. Every tick, enemies march toward you. Jump to an adjacent cell to eliminate an enemy — but only if it matches the **active rule** for the current wave.

### Match rules

| Rule | Kill condition |
|------|---------------|
| **Shape or Color** | Enemy shares your shape *or* your color |
| **Shape only** | Enemy matches your exact shape |
| **Color only** | Enemy matches your exact color |

Rules rotate as waves progress. Waves 1–5 use fixed rules; wave 6+ enters endless mode with escalating rule mutations.

### Shapes & colors

**Shapes** (5): circle · square · triangle · diamond · pentagon  
**Colors** (8): red · blue · green · yellow · purple · orange · cyan · lime

The four compound colors absorb their components — a purple player kills red and blue enemies under color rules:

| Compound | Components |
|----------|-----------|
| purple | red + blue |
| orange | red + yellow |
| cyan | blue + green |
| lime | green + yellow |

New shapes (diamond, pentagon) and compound colors unlock progressively starting at wave 3–5.

### Controls

| Key | Action |
|-----|--------|
| WASD / Arrow keys | Queue a direction (up to 4 steps) |
| Enter / Space | Confirm jump |
| Q | Use a Shift charge (area clear) |
| Esc / Backspace / R | Clear queued input |
| Enter *(lose screen)* | Retry |
| Backspace *(lose screen)* | Back to lobby |

**Shift charges** let you clear enemies in a 5×5 area regardless of the active rule. Earn charges by landing 5 perfect kills (exact shape *and* color match). Maximum 3 charges.

### Scoring & combos

- Eliminations build a combo meter
- Combo milestones play sound cues and push higher difficulty scaling
- Final score is multiplied by difficulty tier and starting conditions

## Setup

```bash
npm install
```

Create a `.env.local` file with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Development

```bash
npm run dev       # Start Vite dev server
npm run build     # Type-check then bundle to /dist
npm run preview   # Preview production build
```

No test runner or linter is configured. Type checking runs via `tsc` as part of `build`.

## Lobby options

Before each game you can configure:

| Option | Range |
|--------|-------|
| Starting wave | 1–10 |
| Starting lives | 1–5 |
| Difficulty | easy · normal · hard · brutal |
| Wave trigger | score · combo · random |

Difficulty multiplies march speed, spawn rate, and final score. Wave trigger controls what advances the wave counter between runs.

## Architecture

Plain TypeScript + Vite — no UI framework. All rendering is direct DOM manipulation.

```
src/
├── engine/       # Game loop, grid, player, enemies, combat, waves, scoring
├── config/       # Tunable parameters — colors, difficulty, enemy defs, rules
├── ui/           # Overlays, HUD, modals (each owns init/show/hide)
├── supabase/     # Auth, profiles, leaderboard score submission
└── types/        # Shared TypeScript types (GameState, Rule, Enemy, …)
```

State lives in a single reactive store (`engine/state.ts`). The main loop in `main.ts` drives a `setInterval` tick keyed to the wave's march BPM.

## License

MIT
