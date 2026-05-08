# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Type-check (tsc) then bundle to /dist
npm run preview   # Preview production build locally
```

No test runner or linter is configured. Type checking runs via `tsc` as part of `build`.

## Architecture

Shape Shifter is a single-page arcade puzzle game in TypeScript + Vite with Supabase auth/leaderboard. There is no framework — all rendering is direct DOM manipulation.

### State & Loop

`src/engine/state.ts` holds the single `GameState` store with a simple listener pattern. `src/main.ts` owns the main loop: a `setInterval` tick (driven by march BPM) that advances enemies, resolves collisions, and calls render functions. All game state flows through the store; render functions read from it and update the DOM.

### Engine modules (`src/engine/`)

| File | Responsibility |
|------|---------------|
| `state.ts` | Reactive store for `GameState` |
| `grid.ts` | Grid rendering, cell pool keyed by `"gx,gy"` strings |
| `player.ts` | Player DOM element + animation |
| `enemies.ts` | Spawning, movement, validity checks |
| `input.ts` | WASD/arrow sequence tracking; ENTER confirms jump, Q triggers perfect shift |
| `combat.ts` | Hit detection, knockback, ripple effects on kill |
| `projection.ts` | Jump ghost preview |
| `waves.ts` | Wave progression and rule mutations |
| `scoring.ts` | Score calculation |
| `hitstop.ts` | Freeze-frame effect (desaturation + brief pause) on kills |
| `audio.ts` | Sound effects |
| `constants.ts` | Grid size, spawn radius, timing constants |

### Config (`src/config/`)

All tunable game parameters live here — colors, difficulty curves, enemy types, and match rules (Shape-OR-Color / Shape-only / Color-only). Prefer editing config files over hardcoding values in engine modules.

`colors.ts` injects the palette as CSS `--var` properties on `:root` at runtime.

### UI (`src/ui/`)

Each overlay and modal owns its own `init()` + `show()`/`hide()` logic. Modals: `auth-modal.ts`, `username-modal.ts`, `lobby.ts`, `leaderboard.ts`. HUD elements: `hud.ts`, `metronome.ts`, `dpad.ts`.

### Supabase (`src/supabase/`)

`client.ts` creates the Supabase client from `.env.local`. `auth.ts` handles sign-in/up/out. `profiles.ts` caches user profiles. `scores.ts` submits scores to the leaderboard.

## Key Mechanics

- **Grid**: World is a 2D grid; positions are `(gx, gy)` integers. Cells are pooled by string key `"gx,gy"`.
- **Match rules**: Active rule per wave determines which enemies can be killed (shape match, color match, or both). Waves 1–5 use fixed rules; wave 6+ enters endless with rule progression.
- **Combat flow**: Player jumps to adjacent cell → if enemy matches active rule → eliminate + knockback nearby + ripple; otherwise lose 1 life (SHIFT).
- **Shift charges**: `Q` grants bonus kills; recharged by perfect kills (exact shape+color match regardless of active rule).
- **Combo meter**: Visual bar; milestone SFX every N eliminations; affects difficulty scaling.

## Types

All shared TypeScript types (GameState, Rule, PlayerState, enemy/direction types) are in `src/types/index.ts`.
