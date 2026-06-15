# PRD Review Notes — Shape Shifter Web → Roblox Port

> Expert review of the porting PRD. Section refs (§) point at the PRD being
> reviewed. **Note:** no `PRD.md` exists on disk; this review is based on the
> PRD content provided for review.

## 1. High-Level Summary
- **Genre/scale:** small, framework-free arcade **grid-survival puzzle**.
  TypeScript + Vite, direct DOM rendering, Web Audio, single `GameState` store,
  loop in `src/main.ts`.
- **Multiplayer:** **single-player**; only auth/profiles/leaderboard are
  networked (Supabase).
- **Top 3 hardest porting areas:**
  1. Client-only sim → **server-authoritative model + networking** (§4.5, §8, §9.4).
  2. **Rendering rewrite** DOM/CSS → Roblox scene + ScreenGui (§9.1, §11).
  3. **Persistence/leaderboard** Supabase SQL → DataStore/OrderedDataStore (§10).
- **Effort estimate:** **not stated** in the PRD (no hours/weeks/points) — a gap.
  Only a 7-phase roadmap (Phase 0–6, §14) is given. Breadth of §9 implies a full
  multi-milestone rewrite, not a light port.
- **Caveat:** PRD is derived from reading code, not a gameplay spec (§2.4.3,
  §13.3). Several "bugs" are **undocumented intent**, not defects.

## 2. Audit Findings
**Critical (§5.1)**
- **C-1** leaderboard client-trusted/spoofable → **solved for free if you follow
  server authority (§8.2)**; the trap is reflexively porting the client-trust shortcut.
- **C-2** Supabase env unvalidated → mostly moot (Supabase replaced), but the
  graceful-degradation pattern carries to DataStore failure handling (§10.5).

**Major (§5.2) — survives the rewrite (logic/design):**
- **M-1** combo trigger uses `maxCombo`, HUD shows `combo` → decide before Phase 1.
- **M-2** exact-match Shift = one fixed bonus, not per-enemy → scoring decision.
- **M-3** manual `Q` Shift doesn't pause march timer → becomes a **server
  scheduler correctness** requirement (§9.3).
- **M-7** mobile D-pad lacks confirm/clear → hard UX requirement on Roblox.

**Major — evaporates (web-architecture-specific):** M-4 store-swap, M-5 username
races (use DisplayName), M-6 intro click handler.

**Minor that matter for the port:** m-4 unused `displaceNearby` params (chain-kill
rule undecided), m-3 `MAX_LIVES=3` vs lobby 5 (lives semantics), m-1/m-2 stale
docs that mislead range, m-5/m-6/m-7 dead code (`speed`/`special`, `nextWave`,
`calcRawScore`) — triage so phantom features aren't ported.

**Tech debt blocking a clean port:** (1) no gameplay spec — *the* blocker; (2)
logic↔DOM coupling (§16.8 extraction needed); (3) no tests/baseline; (4) no
Supabase schema/RLS docs; (5) brittle DOM-ID assertions.

**Design decisions — easy:** config-driven gameplay (1:1 to ModuleScripts),
integer grid, discrete beat loop, single authoritative state.
**Hard:** DOM-as-renderer (full rebuild), client-only trust (invert to server),
direct event→engine coupling, Web Audio synthesis (must bake assets),
`resetStore` instance-swap.

**Takeaway:** the bugs that threaten the port are the **design ambiguities**
(M-1, M-2, M-3-logic, m-4, m-3), all mapping to §13.3 — resolve at Phase-0 freeze.

## 3. Phase-by-Phase Notes (Phase 0–6, §14)
*(PRD has 7 phases, not 0–8.)* For each: goal / key risk / verify-first.
- **P0 Spec Freeze + prototype:** port config ModuleScripts, top-down camera.
  Risk: config-parity drift (phantom fields). Verify: extract exact values from
  `config/*` + `constants.ts`; confirm reachable range = 4 queued steps (m-1).
- **P1 Server sim:** RunService, spawn/march/occupancy, confirm-jump validation.
  Risk: deterministic overlap + `ensureValidTarget` parity; beat accumulator (M-3).
  Verify: trace `marchAll`, `ensureValidTarget`, `onConfirm`; decide M-1.
- **P2 Client render + input:** cell pool, pieces, ghost, HUD, mobile.
  Risk: camera framing; no gameplay in client state; mobile ergonomics (M-7).
  Verify: `reposition`/`renderCells` jumpable calc; `projection.ts`; real `VIS_R=6`.
- **P3 Combat polish:** ripple, trail, hitstop, Shift VFX, banners, audio.
  Risk: hitstop pauses only that run; perf; audio asset pipeline.
  Verify: `hitstop.ts`, `combat.ts` chain-kill (m-4), §11.5 sound list.
- **P4 Menus/lobby/options/a11y:** validation server-side; colorblind required.
  Verify: `lobby.ts` clamps + `ss_lobby_config`; `colors.ts` `palettechange`.
- **P5 Persistence/leaderboards:** server-only save; OrderedDataStore + metadata.
  Risk: numeric-only → filter explosion (§10.3); filter count undecided (Q6).
  Verify: `scores.ts` queries + which filters `leaderboard.ts` exposes.
- **P6 Balance/QA/launch:** balance pass, Luau tests, exploit tests, profiling.
  Verify: capture current browser tuned values as the balance baseline.

**Through-line:** Phase 0 is load-bearing; Phases 1 & 5 carry the hardest risks.

## 4. Gaps & Open Questions (§13)
**Blockers (gate a phase):** Q1 combo trigger (P1), Q2 exact-match scoring (P1),
Q3 chain-kill rule (P1), Q6 leaderboard filter count (P5), Q4 piece-vs-avatar (P0/2).
**Semi-blocker:** Q5 endless selectability. **Nice-to-resolve:** Q7 prefs scope
(session-only MVP), DisplayName staleness, physics/latency/camera (already mitigated).

**Missing artifacts to start implementing + how to obtain:**
1. Exact constants/formula table → extract from `config/*` + `constants.ts` (P0 deliverable).
2. Deterministic march/overlap algo → read `enemies.ts`; log web positions/tick & replay-diff.
3. `ensureValidTarget` logic → read `enemies.ts`; make a test fixture.
4. Compound-color match table → tabulate from `rules.ts`.
5. Wire protocol/payload schemas → derive from `RunState`; log per-beat mutations to size.
6. Supabase schema/RLS → pull via Supabase MCP (`list_tables` + policies).
7. Data-migration decision → product call (likely no, identity changes).
8. Asset specs → `colors.ts` hex→Color3, `audio.ts` freq/duration per SFX.
9. Dead-code reachability → trace call graph for `nextWave`/`calcRawScore`/`speed`/`special`.
10. Effort/sizing/dates → derive after P0 spec.

## 5. Decision Log (recommendations)
- **D1 Fix bugs web-first vs during port →** split: freeze the *spec* (M-1, M-2,
  m-4, m-3) in the web build where iteration is cheap; do §16.8 pure-logic
  extraction; **don't** fix DOM-only bugs (M-4/5/6, C-2).
- **D2 Rewrite vs WebView →** **full Luau rewrite. Roblox has no WebView / no JS /
  no DOM — the wrapper option does not exist.** Mitigate via 1:1 config port + logic extraction.
- **D3 Simplify for launch →** leaderboard = global + difficulty only; drop custom
  usernames (use DisplayName); session-only prefs; fewer palettes but keep
  colorblind; keep endless (default off) + compound colors / exact-match Shift.
- **D4 Server authority →** authoritative day one (non-negotiable); **no** client
  prediction initially (confirm→server→render); add prediction only if feel demands.
- **D5 §13.3 calls →** Q1 current combo; Q2 fixed bonus (MVP); Q3 no rule on chain
  kills (document it); Q4 game piece only; Q6 global+difficulty.
- **D6 Asset pipeline →** front-load placeholder audio/mesh uploads (moderation lead time).

**Bottom line:** highest-leverage decisions are **D2** (plan for a real rewrite),
**D3** (cut leaderboard filters + custom usernames), **D1** (decide feel in the web build).
