# Architecture Document: Modern Stratego-Inspired Browser Game

**Project**: Client-only Stratego-inspired board game built with Next.js + TypeScript + React.  
**Date**: 2026-07-12  
**Status**: Initial architecture specification (no existing implementation at time of writing).  
**Scope**: Pure client-side, no backend, no database, no external services for core game state or logic.

## 1. Architectural Principles

- **Client-only**: All game state, logic, AI, persistence, and presentation live in the browser. No server roundtrips for gameplay.
- **Framework-independent core engine**: The domain/rules layer is pure TypeScript (plain objects + pure functions). It can be used in tests, workers, Node, or future non-React UIs.
- **Immutability preferred**: Game state updates produce new objects. Enables time-travel, easy undo, deterministic replays, and simple testing.
- **Separation of concerns**: Strict layering prevents leakage of React, DOM, or browser APIs into the engine.
- **Hidden information first-class**: Opponent pieces are modeled as unknown to the viewer; the engine never leaks private data to UI or AI unless authorized.
- **Deterministic by default**: All randomness is seeded. Replays, AI behavior, and tests are reproducible.
- **Graceful degradation**: Works (with reduced features) when localStorage, audio, or workers are unavailable.
- **Minimal dependencies**: Prioritize web platform APIs. Add third-party packages only when they provide clear, non-replicable value.
- **Testability & portability**: Pure functions + dependency injection (e.g., RNG) make unit tests trivial and enable Web Worker AI.
- **Mobile-first performance**: Optimized for iPhone-class devices (touch input, limited CPU/memory, battery).

**Key Trade-off**: Immutability and purity increase some boilerplate and object allocations vs. mutable state. Mitigated by small board size (10x10), structural sharing patterns where practical, and React's efficient reconciliation.

## 2. Recommended Directory Structure (`src/` layout)

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout, providers, PWA meta
│   ├── page.tsx                  # Main game shell (mode selection + active game)
│   ├── manifest.ts               # PWA manifest (dynamic)
│   └── globals.css
├── components/                   # Presentational + container React components
│   ├── ui/                       # Reusable low-level (Button, Modal, Icon)
│   ├── game/
│   │   ├── Board.tsx             # Visual board grid
│   │   ├── Piece.tsx             # Piece renderer (hidden vs revealed)
│   │   ├── SetupBoard.tsx        # Drag/drop or tap-to-place setup
│   │   ├── GameControls.tsx
│   │   └── CombatModal.tsx       # Reveal animation for attacks
│   └── layout/
│       └── ...
├── engine/                       # PURE, framework-independent game engine
│   ├── types.ts                  # All core interfaces (Piece, GameState, etc.)
│   ├── constants.ts              # Board size, ranks, lake positions, piece counts
│   ├── board.ts                  # Position utils, lake checks, adjacency, line-of-sight (scouts)
│   ├── rules.ts                  # Pure validators: isValidMove, isValidSetup, canAttack
│   ├── combat.ts                 # resolveCombat (pure)
│   ├── state.ts                  # createInitialState, applyAction (immutable reducer)
│   ├── setup.ts                  # Setup validation + auto-random setup
│   ├── actions.ts                # Action type definitions + creators
│   ├── rng.ts                    # Seeded PRNG (mulberry32 / xorshift)
│   ├── serializer.ts             # toJSON / fromJSON with versioning
│   └── index.ts                  # Public engine API (barrel)
├── game/                         # React state management layer (thin wrapper around engine)
│   ├── useGame.ts                # Hook exposing current state + dispatch
│   ├── gameReducer.ts            # useReducer implementation (orchestrates engine.applyAction)
│   ├── GameContext.tsx
│   └── selectors.ts              # Derived views (getPublicBoard, getLegalMoves, etc.)
├── ai/                           # AI opponent (Web Worker friendly)
│   ├── aiWorker.ts               # Worker entry (imports engine)
│   ├── strategies.ts             # Heuristics, simple minimax (depth-limited)
│   ├── evaluation.ts             # Board eval function (pure)
│   └── index.ts
├── persistence/                  # localStorage / IndexedDB layer
│   ├── storage.ts                # Safe wrappers + feature detection
│   ├── serializer.ts             # (re-exports or extends engine)
│   ├── migrations.ts             # Versioned schema upgrades
│   └── types.ts                  # SavedGame, Replay
├── audio/                        # Web Audio API
│   ├── sound.ts                  # Pure-ish sound generators (oscillators)
│   ├── useAudio.ts               # React hook + gesture initialization
│   └── constants.ts
├── input/                        # Input abstraction (touch + keyboard)
│   ├── useBoardInput.ts          # Pointer events, drag, tap-to-select
│   ├── keyboard.ts               # Arrow keys + shortcuts
│   └── types.ts
├── lib/                          # Small shared utilities (non-game)
│   └── utils.ts
├── types/                        # Cross-cutting TS types (if needed beyond engine)
├── workers/                      # Any additional workers (optional)
└── styles/                       # CSS modules / tailwind if not co-located
```

**Notes**:
- `engine/` must have **zero** React, DOM, or Next.js imports.
- `ai/aiWorker.ts` is loaded via `new Worker(new URL(...))` or `workerize`.
- Public assets (icons, sounds if any, manifest icons) live in `public/`.
- No `lib/game` or `domain` folder duplication — `engine/` is the single source of truth for rules.

## 3. Key TypeScript Interfaces and Types

All defined in `src/engine/types.ts` (and `constants.ts`).

```ts
// Players
export type Player = 'red' | 'blue';

// Ranks (modern numbering: higher = stronger)
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; // 1=Spy, 10=Marshal
export type SpecialRank = 'B' | 'F'; // Bomb, Flag

export type PieceRank = Rank | SpecialRank;

export interface Piece {
  readonly id: string;           // Stable id for serialization, history, React keys
  readonly player: Player;
  readonly rank: PieceRank;
}

// Public / masked view for UI and AI (opponent pieces hide rank)
export interface PublicPiece {
  readonly id: string;
  readonly player: Player;
  readonly rank?: PieceRank;     // undefined = hidden/unknown to viewer
}

export interface Position {
  readonly x: number; // 0-9
  readonly y: number; // 0-9
}

export type Cell = Piece | null;
export type Board = readonly (readonly Cell[])[]; // 10x10 immutable view

// Action system (discriminated union)
export type Action =
  | { type: 'PLACE_PIECE'; player: Player; position: Position; rank: PieceRank; pieceId?: string }
  | { type: 'REMOVE_PIECE'; player: Player; position: Position }
  | { type: 'RANDOMIZE_SETUP'; player: Player; seed?: number }
  | { type: 'COMMIT_SETUP'; player: Player }
  | { type: 'MOVE'; from: Position; to: Position }
  | { type: 'ATTACK'; from: Position; to: Position }
  | { type: 'RESOLVE_COMBAT'; result: CombatResult } // internal after reveal
  | { type: 'END_TURN' }
  | { type: 'SURRENDER'; player: Player }
  | { type: 'RESET_GAME' };

// Combat
export interface CombatResult {
  readonly attacker: { position: Position; rank: PieceRank };
  readonly defender: { position: Position; rank: PieceRank };
  readonly outcome: 'attackerWins' | 'defenderWins' | 'bothDie' | 'defenderBombDefused';
  readonly captured: boolean;
}

// Game phases (state machine)
export type GamePhase =
  | 'setup'          // Placing pieces
  | 'setupReady'     // Both players committed setup (or AI auto)
  | 'playing'
  | 'handoff'        // Pass-and-play turn switch (screen blanking / prompt)
  | 'combatReveal'   // Brief reveal animation window
  | 'gameOver';

// Full internal state (engine truth)
export interface GameState {
  readonly version: number;           // For serialization
  readonly phase: GamePhase;
  readonly currentPlayer: Player;
  readonly board: Board;              // Full authoritative board (both sides visible internally)
  readonly setup: {
    readonly [P in Player]: {
      readonly placed: number;
      readonly committed: boolean;
    };
  };
  readonly winner: Player | null;
  readonly lastAction?: Action;
  readonly moveHistory: ReadonlyArray<Action>; // For replays (filtered)
  readonly rngSeed: number;           // Current seed for determinism
  readonly settings: GameSettings;
}

// Public view (what a specific player or UI sees)
export interface PublicGameView {
  readonly phase: GamePhase;
  readonly currentPlayer: Player;
  readonly board: readonly (readonly PublicPiece[])[]; // masked
  readonly legalMoves: ReadonlyArray<Position>; // from selected, or all
  readonly isMyTurn: boolean;
  readonly winner: Player | null;
  readonly canUndo: boolean;
}

// Settings
export interface GameSettings {
  readonly mode: 'singleplayer' | 'passAndPlay' | 'training' | 'aiVsAi';
  readonly aiDifficulty: 'easy' | 'medium' | 'hard';
  readonly soundEnabled: boolean;
  readonly showMoveHints: boolean;
  readonly animationSpeed: number; // 0.5 - 2.0
}

// Persistence
export interface SavedGame {
  readonly version: number;
  readonly id: string;
  readonly timestamp: number;
  readonly mode: GameSettings['mode'];
  readonly state: GameState;           // Serialized form
  readonly metadata?: {
    readonly playerName?: string;
    readonly aiLevel?: string;
  };
}

export interface Replay {
  readonly version: number;
  readonly initialSeed: number;
  readonly initialSetup?: Record<Player, Piece[]>; // optional compact
  readonly actions: ReadonlyArray<Action>;
  readonly finalState?: GameState; // for quick resume
}

// Setup configuration
export interface Setup {
  readonly placements: Array<{ position: Position; rank: PieceRank; pieceId: string }>;
}
```

**Piece counts (per player, standard classic)**: 1 Marshal(10), 1 General(9), 2 Colonel(8), 3 Major(7), 4 Captain(6), 4 Lieutenant(5), 4 Sergeant(4), 5 Miner(3), 8 Scout(2), 1 Spy(1), 6 Bomb(B), 1 Flag(F). Total 40.

Lakes: Two 2×2 impassable regions (typically at columns 2-3 and 6-7, rows 4-5 in 0-based indexing).

## 4. How Hidden Information Is Modeled

- **Internal `GameState.board`**: Always contains full `Piece` objects with `rank` for *both* players. This is the engine's source of truth.
- **Public view derivation**: `getPublicBoard(state, viewer: Player)` returns a board where `opponentPiece.rank` is stripped to `undefined`.
- **UI never receives raw opponent ranks** except during `combatReveal` phase (temporary full reveal for animation + resolution).
- **AI receives only authorized views**: In single-player, AI is given `PublicGameView` for the human player + full knowledge of its own pieces. AI never peeks at hidden human pieces.
- **Pass-and-play**: Full state in memory; UI layer applies masking per current player. No data leakage on screen during handoff.
- **Replay / debug**: Full state is available, but production UI always masks unless in "review" mode after game over.

**Decision**: Full internal state simplifies engine logic (no "fog of war" inside rules). Masking is a pure projection function. Trade-off: memory slightly higher (negligible). Avoids complex partial-knowledge data structures in core rules.

## 5. State Machine for Game Phases

Implemented as a strict enum in `GameState.phase`. Transitions only occur via `applyAction` (pure function).

```
setup (per-player placement)
  → (both committed) setupReady
    → playing (first player to move)
      → (move/attack) playing | combatReveal
        → (after resolve) playing | handoff (if passAndPlay) | gameOver
  handoff → playing (after acknowledgment)
  combatReveal (timed or user-dismissed) → playing | gameOver
  gameOver (terminal)
```

Pure transition function example (simplified):

```ts
function applyAction(state: GameState, action: Action, rng: RNG): GameState { ... }
```

- `setup` → `COMMIT_SETUP` validates full 40 pieces + legal positions.
- `playing` enforces `currentPlayer`, valid piece ownership, movement rules.
- `handoff` only entered in `passAndPlay` mode.
- `gameOver` when flag captured or a player has no legal moves.
- Illegal actions return the original state (or throw typed error for dev).

**Trade-off**: Explicit phases add cases but prevent invalid states (e.g., moving during setup).

## 6. Data Flow for Game Modes

**Single-player (vs AI)**:
1. Player chooses side + difficulty.
2. Setup phase: player places; AI auto-places via seeded `RANDOMIZE_SETUP`.
3. `COMMIT_SETUP` → `playing`.
4. Human move → `applyAction` → if attack, enter `combatReveal` → resolve → AI turn (via worker).
5. AI computes in worker using public view + own pieces → returns best `Action` → apply on main thread.

**Pass-and-play**:
- Same as above but after human move, if not game over → enter `handoff`.
- UI shows "Pass device to Red/Blue" + blanking overlay.
- On acknowledgment → switch `currentPlayer`, apply masking, resume `playing`.

**Training mode**:
- AI plays at lower depth or with hints enabled.
- Selectors expose "suggested moves".
- Can rewind moves (via history + re-apply from seed).

**AI vs AI (demo / training)**:
- Both sides driven by worker calls in a loop (with yield for UI).

All modes share the same `GameState` + `applyAction`. Mode lives only in `settings.mode` and UI orchestration.

**Data flow diagram (conceptual)**:
```
User Input / AI decision
    → Action
    → gameReducer (calls engine.applyAction(state, action, rng))
    → new immutable GameState
    → selectors → PublicGameView
    → React components re-render (masked)
    → (persist on key transitions)
```

## 7. How Determinism Is Achieved (Seeded RNG)

- Single `rngSeed: number` lives in `GameState`.
- `src/engine/rng.ts` exports a pure factory:

```ts
export type RNG = () => number;

export function createSeededRNG(seed: number): RNG {
  // mulberry32 or similar 32-bit xorshift variant (pure, no Math.random)
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- Every random decision (AI tie-breaks, initial setup shuffle, any future random events) consumes the RNG and the new seed is carried forward in the resulting state.
- `applyAction` receives the current RNG and returns updated state with advanced seed.
- Replays: Start from initial seed + list of actions. Re-apply sequentially. Result must be bit-identical.
- Tests: Pass fixed seed.

**Trade-off**: Seeded PRNG is "good enough" for games (not crypto). Avoids external `seedrandom` package.

## 8. Serialization Strategy for Saves and Replays

- `engine/serializer.ts`:
  - `serializeGameState(state): any` — strips functions, ensures plain JSON.
  - `deserializeGameState(json, currentVersion): GameState` — validates shape, applies migrations.
- Versioning: `state.version` + top-level `SavedGame.version`.
- Migrations live in `persistence/migrations.ts` (array of `(data) => data` fns).
- Replay format: minimal — initial seed + sequence of actions (very compact). Can reconstruct any intermediate state.
- Storage keying: `stratego:saved:<id>`, `stratego:replays:<id>`.
- Validation on load: shape checks + engine invariants (e.g. exactly 40 pieces per side at setup end). On failure → start fresh game + warn user.
- Compression: Optional (lz-string or native) for large replays, but keep simple first.

**Decision**: JSON + manual validation instead of heavy schema lib (see Dependencies). Trade-off: slightly more manual code vs. bundle size + learning curve of Zod.

## 9. State Management

- **Engine**: `applyAction(state, action, rng) => GameState` is the single reducer.
- **React**: `useReducer` (in `game/gameReducer.ts`) + `GameContext`.
- Thin selectors derive `PublicGameView` and memoize expensive projections.
- No heavy global store initially. Zustand or Jotai can be added later if component tree grows.
- For undo: keep limited history of states (or just action list + replay from checkpoint).

Immutable updates are done with spreads / `structuredClone` where needed, or helper `updateBoard` pure functions.

## 10. AI Opponent

- Location: `ai/` + dedicated Web Worker.
- Interface: Worker receives `{ type: 'THINK', view: PublicGameView, ownPieces, difficulty, seed }`.
- Returns `{ bestAction: Action, debug?: ... }`.
- Implementation tiers:
  - Easy: random legal move + basic capture preference.
  - Medium: 1-2 ply search + simple material + position eval.
  - Hard: deeper search (iterative deepening) with alpha-beta, limited by time budget (~150-300ms).
- Pure evaluation and move generation live in `engine/` (AI imports from engine).
- Never blocks main thread.

**Trade-off**: Full perfect-information search is impossible (and would be cheating). AI works from public view. Simple heuristics keep bundle and CPU reasonable for iPhone.

## 11. Persistence Layer

- `persistence/storage.ts`:
  - Feature-detect `localStorage` and `indexedDB`.
  - `saveGame(game: SavedGame): Promise<void>`
  - `loadGame(id?: string): Promise<SavedGame | null>`
  - `listGames(): Promise<SavedGame[]>`
  - Auto-save on every major transition (after commit, after turn).
- Fallback: in-memory only if storage blocked (private mode, quota).
- Version migration on read.
- Replays stored separately; allow export/import as JSON file.

## 12. Audio System

- `Web Audio API` only (no `<audio>` elements or external files for core sounds).
- `audio/sound.ts`: functions like `playMove()`, `playCapture(attackerRank, defenderRank)`, `playWin()`, `playInvalid()`.
- Implemented via `OscillatorNode`, `GainNode`, short envelopes (square/saw for retro feel).
- `useAudio()` hook:
  - Lazy-creates `AudioContext` on first user gesture (button press, first move).
  - Respects `settings.soundEnabled`.
  - Suspends context when tab hidden.
- Graceful: if `AudioContext` fails or user denies, all calls are no-ops.

## 13. Input Handling (Touch + Keyboard)

- `input/useBoardInput.ts`:
  - Pointer events (unified mouse/touch/pen).
  - Tap-to-select then tap destination (good for mobile).
  - Optional drag-and-drop for setup and moves (with visual snap).
  - Long-press for piece info / rank peek in training mode.
- Keyboard:
  - Arrow keys move selection cursor.
  - Enter/Space = confirm move or attack.
  - Number keys or letters for quick rank selection in setup.
  - Escape = cancel / deselect.
- Accessibility: `aria` labels, `role="grid"`, focus management, live regions for combat results.
- All input produces `Action` objects passed to reducer. No direct mutation.

## 14. Visual Presentation / Components

- Board rendered as CSS Grid or Flex (10×10) with absolutely positioned pieces for simplicity and perf.
- Or lightweight `<canvas>` if heavy animation needed later (current preference: DOM for accessibility + dev speed).
- Piece component: shows silhouette + rank only when revealed or own piece.
- Combat: overlay or modal that briefly shows both ranks, plays sound, then animates removal.
- Setup: drag from palette or tap-place; live validation.
- Theming: CSS variables for red/blue, responsive sizing (fit iPhone SE to large screens).
- Animations: CSS transitions + small JS-driven for combat (framer-motion optional later).

## 15. PWA / Offline

- `app/manifest.ts` (or static `manifest.json`): name, icons, display `standalone`, theme color.
- Service worker:
  - Preferred: `next-pwa` (if added) or custom `public/sw.js` registered in layout.
  - Cache shell (app JS/CSS, fonts, icons) + offline fallback page.
  - Game state itself is in localStorage; SW does not store game data.
- Offline indicators: banner when `navigator.onLine === false` (mostly cosmetic since no network features required).
- Install prompt handling.

## 16. Error Handling and Graceful Degradation

- Storage unavailable → play in-memory only; warn "Progress will not be saved".
- Audio init failure → silent.
- Worker creation failure (rare) → fallback to main-thread AI (with note or lower difficulty).
- Corrupt save → discard + start new game, log to console + user toast.
- Invalid action from UI → ignore + optional dev assert.
- All top-level errors caught in ErrorBoundary (Next.js friendly) with "Reset Game" recovery.
- No uncaught promises in workers; post error messages back.

## 17. Testing Strategy Alignment

- **Engine (90%+ coverage target)**: Pure unit tests with Vitest/Jest. Pass fixed seeds. Test every rule, combat outcome, setup validation, serialization roundtrip.
- **Selectors & reducers**: Test derived views and state transitions.
- **AI**: Deterministic tests via seed; mock worker for integration.
- **Components**: React Testing Library (render + fire events → assert on public view).
- **Integration**: Playwright for full flows (setup → play → save/load) in headed browser.
- **Property tests** (optional): fast-check for move generators and invariants.
- Because engine is framework-independent, tests run in Node without jsdom for speed.

## 18. Dependencies Policy

**Expected core (minimal)**:
- `next`, `react`, `react-dom`
- `typescript`
- `tailwindcss` (or plain CSS; Tailwind is low-cost)
- `@types/node` (dev)
- Dev: `vitest`, `@testing-library/react`, `playwright`, `eslint`, `prettier`

**Allowed with justification**:
- Small animation lib (framer-motion) if CSS insufficient.
- `immer` for complex immutable updates inside reducer (still keeps engine pure).
- Icon set (lucide-react or heroicons — tree-shakeable).

**Strictly avoid**:
- Any backend / auth / DB SDKs (Firebase, Supabase, Prisma, etc.).
- Heavy UI kits (MUI, AntD, Chakra) — use Tailwind + primitives.
- Full state managers (Redux Toolkit) unless proven necessary.
- External random libs (implement seeded RNG).
- Network-dependent features for gameplay.
- Large bundles (monitor with `@next/bundle-analyzer`).

**Rationale**: Small install size, fast cold starts on mobile, easier maintenance, long-term portability.

## 19. Performance Considerations for iPhone

- **Web Worker for AI**: Mandatory for anything beyond trivial difficulty.
- **Avoid main-thread blocks**: No synchronous long loops; yield with `setTimeout(0)` or `requestIdleCallback` if needed outside worker.
- **Board size**: 10×10 = 100 cells. DOM updates are cheap. Use `React.memo`, key stability, and avoid re-creating large arrays.
- **Rerenders**: Selectors + `useMemo` for `PublicGameView`. Only re-render changed pieces.
- **Touch**: Passive listeners where possible; avoid expensive hit testing on every move.
- **Memory**: Keep history bounded (last N states or action log only). Release old replay data.
- **Battery/thermal**: Throttle AI depth on low battery or via `navigator.hardwareConcurrency`.
- **Animations**: Prefer CSS `transform` / `opacity`. Limit simultaneous transitions.
- **Initial load**: Code-split AI worker, lazy-load non-critical modals.
- **Measure**: Use React DevTools Profiler + Safari Web Inspector on real device.

## 20. Keeping the Engine Testable and UI-Agnostic

- `engine/` exports only data + pure functions.
- No side effects except the explicit RNG passed in.
- All browser APIs injected at the edges (`game/`, `persistence/`, `audio/`, `input/`).
- Type-only imports of engine in React code where possible.
- Engine tests import directly: `import { applyAction, resolveCombat } from '@/engine'`.
- Future ports (Svelte, vanilla, terminal) only need to implement thin adapters around the same engine.

## 21. Documented Decisions and Trade-offs

1. **Full internal state + projection masking** vs. fully private state objects per player: Chose full state for simplicity of rules/combat. Masking is cheap.
2. **Seeded PRNG implemented in-house** vs. `seedrandom`: Bundle size + zero deps win. Sufficient entropy for game use.
3. **useReducer + Context** vs. external store: Lowest friction. Can evolve.
4. **Web Audio oscillators** vs. preloaded audio files: No asset bloat, instant, fully procedural.
5. **DOM Grid** vs. Canvas for board: Accessibility and rapid iteration win for v1. Canvas can be swapped later.
6. **JSON + manual validation** vs. Zod/Valibot: Avoids adding validation lib for a small schema.
7. **Worker AI** even for easy mode: Consistent architecture; easy difficulty just uses shallower search.
8. **No undo stack of full states** (use action replay instead): Dramatically lower memory for long games.
9. **Handoff phase explicit** in state machine: Makes pass-and-play UX reliable and testable.
10. **localStorage primary + IDB fallback** (or vice-versa): localStorage simpler for small JSON blobs; IDB for larger replays if needed.

**Overall philosophy**: Make the hard parts (rules, hidden info, determinism) pure and boring. Make the UI delightful but thin.

---

## Summary of Key Architectural Decisions

- **Pure, framework-independent engine** in `src/engine/` as the single source of truth for all rules, state transitions, combat, and serialization.
- **Client-only constraint honored**: Everything (including AI and persistence) runs in-browser using platform APIs.
- **Immutability + pure functions** for state, enabling determinism, replays, easy testing, and graceful error recovery.
- **Hidden information via projection functions** (`getPublicBoard`) — internal state is complete; viewers and AI receive masked data.
- **Explicit phase state machine** covering Setup → Playing → Handoff → CombatReveal → GameOver.
- **Seeded RNG** (in-house) for reproducible setups, AI, and replays.
- **Action-based history** for compact replays and undo via re-execution.
- **Web Workers** for AI to protect main-thread responsiveness on iPhone.
- **Minimal dependency set** focused on Next.js/React/TS core + platform APIs.
- **Layered persistence, audio, and input** that degrade cleanly.
- **Testing aligned to purity**: engine units run fast in Node; integration uses real browser.

This architecture provides a solid, maintainable foundation for a high-quality, offline-first, mobile-friendly Stratego experience while keeping the core portable and rigorously testable.

(End of document)
