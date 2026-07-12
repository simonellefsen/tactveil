# Decision Log

**Project:** Modern Stratego-Inspired Browser Game  
**Started:** 2026-07-12

This log records important decisions, trade-offs, and rationale. All agents must update this file when making material choices.

## Phase 1 Decisions (Specification)

### 2026-07-12 — Game Rules Baseline
- **Decision:** Adopt canonical classic 10×10 Stratego with 40 pieces per player.
- **Rationale:** Matches the large majority of digital and physical play; provides rich hidden-information gameplay without unnecessary complexity.
- **Details:** See `game-rules.md`. Internal piece IDs are stable lowercase strings (`marshal`, `scout`, `spy`, `miner`, `bomb`, `flag`, etc.). Ranks use modern numbering (Spy=1 lowest, Marshal=10 highest). Scout can attack on long move (modern rule). Repetition/chase rules are mandatory to keep games finite in a digital engine.
- **Deviations from some traditional sources:** Explicit repetition enforcement, Scout strike same turn, symbolic internal identifiers, enumerated combat priority algorithm. All documented in game-rules.md.
- **Owner:** Game Rules Agent + Product Lead.

### 2026-07-12 — Architecture
- **Decision:** Next.js (App Router) + TypeScript strict + React. Pure framework-independent `engine/` package as the heart of the system.
- **Rationale:** Vercel-native, excellent PWA + deployment story, TypeScript first-class, allows zero-backend static export + service worker patterns. Engine purity enables excellent testability, Web Workers, and future portability.
- **Key structures:**
  - `engine/` contains only pure data + functions (types, board, rules, combat, state, rng, serializer).
  - `game/` thin React orchestration (useReducer + selectors).
  - AI in dedicated worker.
  - Projection functions (`getPublicBoard(viewer)`) as the sole boundary for hidden info.
- **Determinism:** In-house seeded RNG (mulberry32-style) carried in state. Full replay = seed + action sequence.
- **Persistence:** Versioned JSON. Primary IndexedDB with localStorage graceful fallback. Never persist raw full state to UI without projection.
- **Trade-off accepted:** Slightly more boilerplate for immutable updates vs mutable. Acceptable because board is tiny (10×10).
- **Owner:** Technical Architect.

### 2026-07-12 — Hidden Information & Privacy Model
- **Decision:** Maintain single authoritative `FullGameState` inside the engine. All external consumers (UI components, AI, logs, saves, exports, ARIA, test IDs) receive only a `PlayerView` / `PublicGameView` projection.
- **Rationale:** Prevents accidental leakage through any surface. Projection is a pure function.
- **Enforcement:** 
  - Strict contracts in components.
  - No `data-rank`, no owner-specific hidden classes on opponent pieces.
  - Handoff flow blanks the view and requires explicit "Ready" gesture.
  - Prod builds strip dev-only inspection hooks.
- **Persistence note:** Saves contain full state for correct resumption, but loading immediately projects; full state is never attached to React tree for the wrong viewer.
- **Owner:** Security and Privacy Reviewer.

### 2026-07-12 — Visual Direction
- **Decision:** "Modern tactical command table" aesthetic — original, restrained, premium, touch-first.
- **Rationale:** Avoids any risk of copying protected commercial artwork, typography, or iconography. Provides a distinctive, timeless digital identity suited to strategy.
- **Key choices:**
  - Dark matte surfaces with subtle etched textures (SVG patterns).
  - Original geometric glyphs for every rank (vector, high contrast at small sizes).
  - Multiple redundant channels for ownership and state (shape, border, scale, glow, position context) — never color alone.
  - Board is sovereign: maximize real estate on iPhone.
  - All motion short, purposeful, and gated by `prefers-reduced-motion`.
  - Tokens defined in `visual-direction.md` are source of truth for implementation.
- **Owner:** UX and Visual Design Agent.

### 2026-07-12 — Technology Choices
- **Decision:** Vitest + React Testing Library + Playwright. Tailwind or structured CSS Modules (lightweight). No heavy state libs, no game engines, no canvas-only board (DOM grid preferred for accessibility + inspectability).
- **Rationale:** Matches the test-plan and technology preferences in the prompt. Keeps bundle small and code maintainable. Semantic HTML + CSS Grid for the 10×10 board.
- **Owner:** Technical Architect + Product Lead.

### 2026-07-12 — AI Approach
- **Decision:** Pure client-side opponent using legal-move filtering, threat/risk evaluation, and limited-depth search (minimax or Monte-Carlo style) with strict time budgets. Three tiers (easy/medium/hard). Web Worker mandatory for non-trivial levels.
- **Rationale:** Satisfies "no external AI APIs", "iPhone friendly", and "deterministic via seed" requirements. Easy level intentionally fast and fallible.
- **Owner:** AI Opponent Agent (to be assigned in Phase 4).

### 2026-07-12 — Audio
- **Decision:** Web Audio API with lightweight procedural / short generated tones or original short assets. Strict user-gesture initialization (no autoplay). Separate toggles for SFX, ambient, haptics/visual feedback. Mute always prominent.
- **Rationale:** Meets iOS restrictions, keeps dependencies near zero, graceful degradation.
- **Owner:** Audio and Motion Agent.

### 2026-07-12 — Pass-and-Play Privacy
- **Decision:** Mandatory full-screen handoff overlay on every turn switch in pass-and-play mode. Device is "blanked" before the new player is revealed. Explicit "I'm ready" tap required. No history or animation that survives the handoff.
- **Rationale:** Primary risk area for hidden-information leakage on a shared physical device. Multiple defense layers required.
- **Owner:** Gameplay Engineer + Accessibility + Privacy.

### 2026-07-12 — Undo Policy
- **Decision:** Undo allowed only during setup phase. Disabled (or not offered) during normal play.
- **Rationale:** Undoing a move after hidden information has been revealed (via combat or long scout) would violate the spirit and information model of the game.
- **Owner:** Product Lead.

### 2026-07-12 — No Online Multiplayer
- **Decision:** Explicitly omitted for the initial release (and preferred under current constraints).
- **Rationale:** Any online play would require external state, accounts, or servers — forbidden by the project constraints. Local pass-and-play + strong single-player AI is the supported experience.
- **Owner:** Product Lead.

## Future Decision Areas (to be filled during implementation)

- Exact lake coordinate representation in code vs rules doc (confirm 0-based vs 1-based labeling).
- Final choice of styling approach (Tailwind vs CSS Modules vs hybrid).
- Depth/time budgets and evaluation heuristics for each AI difficulty.
- Exact service worker strategy (Workbox vs custom) and offline shell content.
- Whether to include a lightweight "replay viewer" mode.
- Icon and splash asset generation method for manifest (procedural or hand-crafted).

Update this log with date, decision, rationale, and affected files whenever a significant choice is made.
