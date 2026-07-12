# Stratego Test Plan

**Phase 1: Core Game Engine, Setup, Movement, Combat, Victory Conditions, Serialization, and Foundational Multiplayer**

**Version:** 1.0  
**Date:** 2026-07-12  
**Status:** Draft for Phase 1 Implementation  
**Owners:** Engineering + QA

This document defines the testing strategy, coverage requirements, automation, tooling, manual processes, and exit criteria for the Stratego web application (PWA). It is aligned to phased development and must be followed before any feature is marked complete.

## 1. Testing Strategy Aligned with the Phases

Development proceeds in phases. Testing is incremental, automated-first, and "shift-left":

- **Phase 1 (Current)**: Pure game engine (TypeScript), rules enforcement, state management, serialization, hidden-information projection, basic pass-and-play (local), victory conditions.  
  Focus: Unit tests (Vitest) on engine. Minimal UI scaffolding tested via component tests. Early E2E for core loop.

- **Phase 2**: React UI layer (board, pieces, drag-and-drop or tap-to-move, setup wizard).  
  Focus: React Testing Library + Vitest component/integration tests. Expand E2E.

- **Phase 3**: AI opponent (deterministic), full game modes (pass-and-play, vs AI, future online), persistence (save/restore), offline support.  
  Focus: Determinism tests, full E2E flows, integration of engine + UI + storage.

- **Phase 4+**: PWA install/offline, responsive polish, accessibility, performance budgets, animations, production hardening.  
  Focus: Playwright cross-device E2E, Lighthouse, manual device checklist, bundle analysis.

**Core Principles**:
- All game rules live in a pure, side-effect-free `engine/` package (or module) that is fully unit-testable in isolation.
- UI is a thin projection + controller layer. Never put rule logic in components.
- Hidden information is enforced at the projection layer (never leak in state sent to client views).
- Tests are the specification. New behavior requires new or updated tests first (TDD encouraged for engine).
- Fast feedback: Vitest unit tests run on every save (`vitest --watch`).
- Isolation: Every test must be hermetic (no shared mutable state, clean DOM, mocked timers/storage where needed).
- Regression safety: E2E covers the happy paths + key edge cases for every supported mode.
- "Tests must pass" is a hard gate (see Section 11).

Risk-based prioritization in Phase 1:
1. Combat resolution & special rules (Spy, Miner/Bomb, equal ranks).
2. Hidden info projection (critical for fair play in pass-and-play).
3. Setup validation & piece counts.
4. Victory conditions (including "no legal moves").
5. Serialization roundtrips (enables save/restore and future networking).
6. Movement rules (Scout distance, lakes, adjacency, no through-pieces).
7. AI determinism (reproducibility for testing and replays).

## 2. Unit Test Coverage Requirements

All critical game engine areas **must** be covered by Vitest unit tests. Target: **≥90% statement/branch coverage** on `src/engine/**/*` (enforced via `vitest --coverage` thresholds in CI). 100% coverage on rules and projection logic.

### Required Test Areas (Phase 1+)

#### Movement
- Valid/invalid moves for every piece type:
  - Standard pieces: 1-square orthogonal only.
  - Scout: any distance in straight line (horizontal/vertical) until blocked by piece or lake/edge. Cannot jump lakes or pieces.
  - Bombs and Flag: never movable.
- Lake navigation: two 2×2 impassable lake zones (standard positions: rows 4-5, columns 2-3 and 6-7, 0-indexed). Pieces may never enter or cross.
- Cannot move onto own pieces; attacks only on opponent.
- Turn order and "must move a movable piece" enforcement.
- Edge cases: blocked paths for Scout, wrapping (no), post-capture movement.

#### Combat
- Standard resolution: attacker rank > defender rank → attacker wins and moves into square (defender removed).
- Equal ranks → both removed.
- Spy vs Marshal (or highest): Spy wins **only** if Spy is the attacker.
- Miner vs Bomb: Miner wins (defuses), moves in. Any other piece attacking Bomb is destroyed.
- Bomb vs anything (except Miner): Bomb wins (attacker destroyed, Bomb stays).
- Flag: capturing Flag wins immediately (no rank comparison needed; special victory path).
- Attacker always reveals first in simulation; defender only revealed on combat.
- Edge: attacking own pieces forbidden, attacking empty square forbidden.

#### Setup
- Exactly 40 pieces per player with correct inventory:
  - 1 Marshal, 1 General, 2 Colonels, 3 Majors, 4 Captains, 4 Lieutenants, 4 Sergeants, 5 Miners, 8 Scouts, 1 Spy.
  - 6 Bombs, 1 Flag.
- All pieces placed in the player's back 4 rows (10 columns).
- No pieces on lakes or opponent's half.
- Duplicate placement prevention, full 40-piece validation.
- Random/setup import validation.
- Initial "revealed" state: all pieces hidden from opponent.

#### Victory Conditions
- Capture opponent's Flag → immediate win.
- Opponent has zero movable pieces remaining (all remaining pieces are Bombs + Flag, or trapped) → win.
- Stalemate / no legal moves on your turn → loss (after checking Flag not captured).
- Both flags captured in same sequence (impossible under rules, but test defensive).
- Game state correctly marks `winner`, `reason`, `finalBoard`.

#### Serialization
- Full game state (board, piece positions + known ranks + ownership, turn, move history, setup phase flag) serializable to JSON.
- Roundtrip fidelity: `serialize(state) === original` after `deserialize`.
- Versioning / migration for future schema changes.
- Partial state (e.g. mid-combat) handling.
- Size and performance considerations (no bloat for localStorage).
- Safe deserialization (reject malformed, unknown ranks, invalid positions).

#### Hidden Info Projection
- `projectForPlayer(state, playerId)` returns a view where:
  - Own pieces: full rank and identity visible.
  - Opponent pieces: unknown pieces show as "unknown" (no rank). Only pieces previously involved in combat or explicitly revealed show rank.
  - Lakes and empty squares identical.
  - Bombs/Flag always unknown until attacked (except if previously revealed).
- No leakage across players: calling projection for player A never exposes B's unknowns.
- Projection is pure and idempotent.
- Used for all UI rendering and AI input.

#### AI Determinism
- AI move selection (minimax / heuristic / Monte-Carlo lite) must be fully deterministic given:
  - Same board state (after projection for AI side).
  - Same random seed.
  - Same difficulty parameters.
- Property: `ai.chooseMove(state, seed1) === ai.chooseMove(state, seed1)` always.
- Different seeds produce reproducible but different choices.
- AI never sees hidden info it shouldn't (uses only projected state).
- AI must respect all rules (never proposes illegal moves).
- Snapshot + seed-based regression tests. Time-bounded (no infinite search).

**Additional Engine Requirements**:
- Pure functions only for core logic. No DOM, no timers, no storage inside engine.
- Exhaustive enumeration of piece types and special cases in tests.
- Use table-driven tests for combat matrix.
- Property-based testing (fast-check or vitest built-ins) encouraged for movement paths and setup permutations.

## 3. Tools

- **Vitest**: Primary test runner for unit, integration, and component tests. Fast, Vite-native, excellent TypeScript + ESM support. Used for engine + many React component tests.
- **React Testing Library (RTL)**: For component tests. Query by role, label, text. Simulate user events via `@testing-library/user-event`. Avoid implementation-detail queries (e.g., class names, internal state).
- **Playwright** (`@playwright/test`): End-to-end and cross-browser/device testing. Real browser automation. Used for full game flows, responsiveness, offline simulation, PWA install flows. Supports mobile emulation (iPhone Safari profile).

**Supporting**:
- Vitest coverage (v8 provider or istanbul).
- Playwright trace viewer + screenshots on failure.
- Lighthouse + Lighthouse CI for PWA/perf/a11y.
- Bundle analyzers (e.g., `vite-bundle-visualizer`, `rollup-plugin-visualizer`).
- Optional: MSW for future API mocking; axe-core / jest-axe for a11y in unit/component tests.

**Scripts** (in `package.json`):
- `test`: `vitest run`
- `test:watch`: `vitest`
- `test:coverage`: `vitest run --coverage`
- `test:ui`: component browser UI if using Vitest browser mode.
- `test:e2e`: `playwright test`
- `test:e2e:ui`: `playwright test --ui`

## 4. Component Test Matrix

Component tests (Vitest + RTL) target presentational + interactive behavior. Every exported component requires tests. Matrix below lists key components expected in Phase 1–2 and minimum test coverage.

| Component              | Key Tests (RTL)                                      | Interactions Tested                          | Edge / Accessibility Cases                     | Priority |
|------------------------|------------------------------------------------------|----------------------------------------------|------------------------------------------------|----------|
| `Board`                | Renders 10x10 grid + lakes; pieces in correct positions (projected view); highlights valid moves | Click/tap square or piece to select; drag (if implemented) or keyboard nav | Lake squares never occupied; hidden pieces show generic back; selected state; responsive grid | P0 |
| `Piece` / `PieceToken` | Renders rank only when `known` or own piece; color by owner | Click to select/attack; hover tooltip (if any) | Unknown enemy = "?" or silhouette; bomb/flag special icons; ARIA labels | P0 |
| `SetupGrid` / `SetupPanel` | 4x10 player area; piece palette with counts; drag from palette to board | Place, move, remove pieces; auto-validate counts | Overfull rows, lake placement blocked, duplicate prevention, "Ready" disabled until 40 pieces | P0 |
| `GameControls`         | Turn indicator, move history list (limited), undo (if allowed), resign | End turn, offer draw (future) | Disabled states during opponent turn or setup | P1 |
| `CombatModal` / `CombatResult` | Shows attacker/defender (reveals both on resolution); winner animation | Confirm / auto-resolve | Spy special text, Miner vs Bomb special text; equal-rank both lost | P0 |
| `VictoryScreen`        | Displays winner, reason (flag / no moves), final board snapshot | Rematch, main menu | Correct reason strings; serialized state replay link | P1 |
| `PassAndPlayHandoff`   | "Pass to opponent" prompt + blur/lock UI | Simulate handoff button | No ranks shown during handoff transition | P0 |
| `SaveLoadControls`     | Save current game; list/load previous | Roundtrip with engine serialization | Corrupt data handling, version mismatch | P1 |
| `ModeSelector`         | Pass-and-play / vs AI / (future online) | Selection updates game config | | P1 |

**Guidelines**:
- Prefer `getByRole`, `getByLabelText`, `findByText`.
- Test accessibility attributes (`aria-*`, `role`) in components.
- Snapshot only stable markup (avoid brittle snapshots of full board).
- Mock engine calls at component boundary; test integration via higher-level tests or E2E.

## 5. End-to-End Flows That Must Be Automated

Playwright E2E tests live in `tests/e2e/`. All must pass on Chromium + WebKit (Safari). Mobile emulation required for key flows.

### Required Automated Flows (Phase 1+)

1. **Full Pass-and-Play Game (Start to Finish)**
   - Launch → choose pass-and-play → both players complete setup (place 40 pieces each, including Flag and Bombs).
   - Reveal board → alternate moves.
   - Perform legal moves, invalid move attempts rejected.
   - Trigger combat (standard + Spy + Miner/Bomb).
   - Reach victory via Flag capture or immobilization.
   - Verify victory screen + correct winner/reason.
   - Rematch or new game.

2. **Pass-and-Play Handoff Without Information Leak**
   - Player A completes setup or makes moves.
   - Trigger "pass device" (UI prompt or test action that flips perspective).
   - Assert: Player B view shows no unknown enemy ranks (only revealed via prior combat).
   - Continue play; verify state is consistent.
   - Multiple handoffs in one game.

3. **Vs AI Full Game**
   - Select vs AI (easy/medium).
   - Player completes setup.
   - AI responds (deterministic path verifiable via seeded test).
   - Play to completion (or timeout short games).
   - Verify AI never cheats (uses only projected state).

4. **Offline Play**
   - Start game (any mode).
   - Simulate offline (Playwright route abort or `navigator.onLine = false` + service worker test).
   - Continue full game loop (moves, combat).
   - Verify no network calls attempted after initial load.
   - Reconnect gracefully (future).

5. **Save / Restore**
   - Mid-game (after setup + several moves): Save (to localStorage or exported JSON).
   - Reload page / hard refresh.
   - Restore game → assert exact board state, turn, known pieces, history.
   - Continue from restored state to victory.
   - Test corrupted save rejection.

6. **Responsive Layouts & Touch**
   - Desktop (1280px+), tablet, mobile (iPhone 14/15 portrait + landscape).
   - Verify board fits, pieces touch-target ≥ 44×44px recommended.
   - Orientation change mid-game does not corrupt state.
   - No horizontal scroll on mobile; usable single-handed.

7. **Setup Validation End-to-End**
   - Attempt invalid setups (wrong count, lakes, opponent territory) → blocked.
   - Valid setup → proceeds.

Additional:
- History / replay of moves.
- Resign / concede flow.
- Error boundaries / recovery (rare invalid states).

All E2E must be fast (< 30s per full game flow in CI) by using deterministic AI seeds, short games, and `test.slow()` sparingly.

## 6. Performance and PWA Testing Approach

### Lighthouse (via Lighthouse CI)
- Run on every PR + main via GitHub Action (`treosh/lighthouse-ci-action` or official `lhci`).
- Assert minimum scores (Phase 1 baseline, tighten later):
  - Performance: ≥ 85 (mobile)
  - Accessibility: ≥ 95
  - Best Practices: ≥ 95
  - SEO: ≥ 90
  - PWA: 100 (manifest, service worker, installable, offline)
- Categories checked: offline support, fast load, splash screen, icons, etc.
- Reports uploaded + diffed in CI summary.

### Bundle Analysis
- `vite build --mode analyze` or dedicated script producing `stats.html`.
- Budgets (enforced in CI or pre-commit):
  - Initial JS < 250 kB gzipped (engine + UI core).
  - Total assets < 600 kB.
  - No unexpected large deps.
- Track over time; flag regressions > +10%.
- Tree-shaking validation: engine must not pull React.

### Other Perf
- Vitest + Playwright timing assertions for critical paths (e.g., board render after 100 moves < 100ms).
- Memory: long games (50+ moves) no leaks (manual + devtools in CI where possible).
- Service worker: precache + runtime cache strategies tested in E2E (offline launch after first visit).

## 7. Manual Test Checklist (iPhone Safari + PWA)

Automated tests cover most, but real-device manual testing is required before Phase 1 sign-off and every pre-release.

**Device Matrix (minimum)**: iPhone 14/15/16 Safari (latest iOS). Also test one Android Chrome.

### Checklist

**Install & PWA**
- [ ] Add to Home Screen from Safari share sheet. App icon appears.
- [ ] Launch from home screen icon → no Safari chrome (standalone mode).
- [ ] Splash / launch screen acceptable.
- [ ] App name, icons correct in manifest.

**Offline**
- [ ] First visit online → subsequent launch fully offline (no network indicator errors).
- [ ] Play complete game offline.
- [ ] Save/restore works offline.
- [ ] Background sync or update prompts (future) do not break.

**Rotation & Layout**
- [ ] Portrait → landscape → portrait mid-setup and mid-game.
- [ ] Board remains square, usable, no clipping.
- [ ] Touch targets remain large enough; no accidental touches on lakes/pieces.
- [ ] Keyboard (if any) or on-screen controls adapt.

**Suspension / Resume**
- [ ] Start game, make moves.
- [ ] Background app (switch to another app or lock screen) for 30s+.
- [ ] Resume → state intact, timer/turn not corrupted, animations resume cleanly.
- [ ] Suspend during combat reveal, during handoff prompt.
- [ ] iOS low-power mode / memory pressure (if reproducible).

**Touch & Gameplay**
- [ ] Setup: tap + drag pieces reliably (or tap-to-place).
- [ ] Long press for info (if implemented) vs accidental move.
- [ ] Combat tap sequence natural.
- [ ] Handoff: clear "pass to other player" UI; screen blanks or shows neutral until handed over.
- [ ] No information leakage on handoff (visually inspect all enemy pieces).
- [ ] Scrolling / zooming: prevented or handled gracefully on board.
- [ ] Performance: smooth 60fps drag/animations on device.

**Edge**
- [ ] Very long game (many scouts, attrition).
- [ ] Page reload mid-game (already covered in E2E but verify on real Safari).
- [ ] Multiple tabs (storage sync or warning).
- [ ] Background music / sounds (if any) respect mute/suspend.

Document results + screenshots in release notes or test run sheet. Any failure blocks "Phase complete".

## 8. Accessibility Testing Approach

**Automated**:
- Integrate `axe-core` (via `@axe-core/react` or vitest + playwright-axe) in component tests and E2E.
- Run on key screens: Board, Setup, Victory, Controls.
- Lighthouse a11y gate (≥95–100).

**Manual + Assistive Tech**:
- VoiceOver on iOS (iPhone Safari + installed PWA):
  - Navigate entire setup and a full move/combat cycle.
  - All interactive elements announced with proper labels/roles.
  - Combat results and victory clearly described.
  - Board as grid or list? (appropriate live regions for changes).
- Keyboard-only (desktop): tab through controls, arrow keys for board movement (future enhancement).
- Color contrast: verify via Lighthouse + manual (pieces distinguishable without color alone).
- Reduced motion: respect `prefers-reduced-motion`.
- High-contrast / dark mode (if supported).

**Ongoing**:
- ARIA in all components (see component matrix).
- Semantic HTML.
- Focus management (modal combat, handoff).
- Alt text / labels for all visual game elements.

## 9. Development-Only Test Harnesses and Scenario Builders

Never ship test/dev utilities in production builds.

**Implementation**:
- Guard everything with `import.meta.env.DEV` (Vite) or `process.env.NODE_ENV !== 'production'`.
- Example exposure (only in dev):
  ```ts
  if (import.meta.env.DEV) {
    (window as any).__STRATEGO_DEV__ = {
      loadScenario(name: string),   // e.g. 'flag-capture-win', 'spy-kills-marshal'
      dumpState(),
      forceCombat(attackerId, defenderId),
      setSeed(seed: number),
      projectView(player: 'red' | 'blue'),
    };
  }
  ```
- Scenario builders: JSON fixtures or builder functions in `src/engine/test-utils/` (tree-shaken in prod via `if (import.meta.env.DEV)` or separate entry).
- UI surface:
  - Dev-only floating "Test Harness" button or bottom bar (styled with red border, clearly labeled "DEV ONLY").
  - Or dedicated route `/dev/scenarios` (protected by `if (!import.meta.env.DEV) { navigate('/') }` or 404 in prod).
  - Never render in production bundle (dead-code elimination + build-time stripping).
- Console-only for power users.
- Storybook (if adopted) runs only in dev.

**Rules**:
- No test buttons, debug panels, or "load scenario" in production UI or manifest.
- Production build must pass `grep -r "STRATEGO_DEV\|__test\|scenarioBuilder" dist/` (or equivalent lint rule) = 0 matches.
- E2E can use the harness via `window.__STRATEGO_DEV__` (injected only in test mode) but never rely on it for prod behavior.

This keeps prod clean while enabling rapid iteration on complex engine cases (e.g., specific combat setups, long scout paths, edge victory).

## 10. CI and Pre-Release Verification Steps

### CI Pipeline (GitHub Actions recommended)
`.github/workflows/ci.yml` triggers on `push` / `pull_request`:

1. Install + typecheck + lint.
2. `vitest run --coverage` (fail if thresholds missed).
3. `playwright test` (install browsers in CI; shard if slow; upload traces/artifacts on failure).
4. Build production bundle + bundle size check.
5. Lighthouse CI against built `dist/` (or preview URL).
6. (Optional) Visual regression (Percy / Chromatic) for board screenshots.

Matrix: Node LTS, multiple OS if needed. Fail fast on unit tests.

Playwright project config: projects for `chromium`, `webkit` (mobile emulation for iPhone).

Artifacts: coverage reports, Playwright HTML report, Lighthouse JSON.

### Pre-Release Verification (before tagging release or marking Phase complete)
1. All CI jobs green on the release branch.
2. Full E2E suite locally on representative devices.
3. Manual checklist (Section 7) executed on physical iPhone Safari + at least one other device. Record pass/fail.
4. Lighthouse scores meet or exceed thresholds (local run + CI).
5. Bundle analysis reviewed; no surprises.
6. Accessibility manual pass (VoiceOver tour).
7. Performance smoke: open long game, rotate, suspend/resume.
8. Sign-off: at least one engineer + one non-author reviewer.
9. Update this test plan + changelog if coverage or flows changed.

**Branch protection**: Require status checks + review before merge to main.

## 11. Criteria for "Tests Must Pass" Before Marking Features Complete

A feature (or sub-feature) is **not complete** until:

- All relevant unit tests (engine + components) exist and pass at 100% for the changed modules.
- New or affected E2E flows are added/updated and green.
- Coverage thresholds not regressed.
- Manual checklist items for the feature executed (if UI or device-sensitive).
- Dev harness (if used) does not leak to prod.
- Documentation updated (including this plan if scope changed).
- Reviewed: PR description includes "Tests: ..." section; reviewer verifies test intent matches requirements.
- "Definition of Done" checklist in tickets includes the above.

**Hard Gates (block merge / release)**:
- Any failing test (unit, component, E2E).
- Coverage drop below threshold.
- Lighthouse PWA or a11y regression below minimum.
- Bundle size budget exceeded without approval.
- Known information leak in hidden-projection or pass-and-play (zero tolerance).

**Continuous Improvement**:
- After each phase, review flakiness, add missing edge cases, raise thresholds.
- Add property-based or fuzz tests for engine as complexity grows.
- Track test execution time; keep suite < 5 min in CI.

---

**Appendix A: Key Rules Reference (for testers)**
- Board: 10×10. Lakes: two 2×2 impassable (center).
- Ranks (higher wins; modern numbering often higher number = stronger; confirm implementation): Marshal (top), General, Colonels (2), Majors (3), Captains (4), Lieutenants (4), Sergeants (4), Miners (5), Scouts (8), Spy (1).
- Specials: Spy beats top only on attack; Miner defuses Bomb.
- Setup: own 4 rows only.
- Win: Flag captured **or** opponent has no movable pieces.

**Appendix B: Updating This Plan**
Update when new modes, rules variants, or platforms are added. All changes require review.

This plan ensures high-quality, fair, reliable Stratego gameplay across devices and modes.
