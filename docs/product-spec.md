# Modern Stratego: Product Specification

**Version:** 1.0  
**Status:** Canonical product requirements document  
**Date:** 2026-07-12  
**Project:** Polished, production-ready, offline-first PWA implementation of Stratego for web and iOS Home Screen.  
**Scope:** Client-only (no backend, accounts, or external services).

This document is the single source of truth for product requirements. All other specifications (game rules, architecture, visual direction, privacy model, test plan) and implementation work must derive from and align to it.

## 1. Vision and Goals

**Vision:** Deliver a modern, high-quality digital Stratego experience that captures the core tension of hidden-information strategy, runs beautifully everywhere a browser does (especially iPhone Safari), and requires zero friction—no accounts, no downloads from an app store, no internet after initial load.

**Goals:**
- Production-ready quality (not a prototype or demo).
- Fully offline-capable after first load or PWA install.
- Installable as a first-class iOS Home Screen web app (standalone mode).
- Excellent touch-first responsive experience on mobile, with strong desktop support.
- Original visual identity, sounds, and nomenclature (no copying of protected commercial assets).
- Strict client-only architecture: all logic, state, AI, persistence, and presentation live in the browser.
- Deployable to Vercel with a single production build.
- Accessible, performant, and respectful of device constraints (battery, CPU, Safari limitations).
- Deterministic, testable, and replayable gameplay.

## 2. Required Game Modes and Key Behaviors

### 2.1 Single Player vs AI
- Opponent is a client-side AI (no external APIs or services).
- Three difficulty levels: easy, medium, hard.
- Easy level is quick and intentionally imperfect.
- Medium and hard levels are stronger while remaining responsive (target < 2–3s think time on iPhone-class hardware).
- AI must operate exclusively on the public (masked) view of the board plus its own pieces. It must never see hidden opponent information.
- All AI decisions must be reproducible via seeded randomness for testing and replays.
- AI may run in a Web Worker to avoid blocking the UI.

### 2.2 Local Pass-and-Play
- Two players share a single device.
- Full support for privacy-preserving handoff between turns.
- During handoff, the UI must blank, blur, or otherwise conceal all board information (especially unrevealed enemy pieces).
- Handoff must not leak hidden information via DOM, ARIA labels, logs, CSS, or any other channel.
- After acknowledgment, the view switches cleanly to the receiving player’s perspective.

### 2.3 Training / Solo Visible Mode
- Also referred to as “training” or “solo visible.”
- All pieces (or a configurable subset) are visible to the player.
- Intended for learning rules, practicing tactics, and exploring strategies.
- May support self-play or a deliberately weak AI.
- Can expose hints or legal-move suggestions without compromising core hidden-info rules in other modes.

All three modes share the same core rules engine and game state model. Mode is a configuration setting that affects only UI behavior, AI participation, visibility projection, and handoff logic.

## 3. Explicit Out-of-Scope Items

The following are explicitly out of scope for the initial product:

- Internet or networked multiplayer (real-time or turn-based).
- User accounts, authentication, cloud saves, leaderboards, or any server-side persistence.
- Native iOS / Android applications or App Store distribution.
- Use of any copyrighted or trademarked commercial Stratego artwork, sounds, names, or board design (original assets required).
- Analytics, advertising, trackers, or fingerprinting scripts.
- External AI services or hosted models.
- Advanced rule variants (e.g., different board sizes, piece counts, or movement rules) beyond what is needed for the core canonical ruleset (future extensibility via config is allowed in engine).
- Undo during active gameplay (undo permitted only during setup phase).
- Draw offers, time controls, or tournament features.
- Social sharing, replays export beyond local serialization, or spectator mode.
- Any feature that would require persistent server state or external calls after initial asset load.

## 4. High-Level User Flows

### 4.1 Common Entry
1. User opens app (web or installed PWA).
2. Presented with Mode Selector (Pass-and-Play, vs AI, Training).
3. Optional: adjust Settings (sound, animations, hints, difficulty).
4. Enter game → Setup phase.

### 4.2 Setup Flow (All Modes)
1. Player (or both in pass-and-play) places exactly 40 pieces on their four deployment rows.
2. Pieces include the full standard set (1 Marshal, 1 General, ..., 1 Spy, 6 Bombs, 1 Flag).
3. Validation enforces exact counts, no lakes, no stacking, correct territory.
4. Support for manual placement, drag-and-drop or tap-to-place, and “Randomize” (seeded).
5. Both sides must commit (AI auto-commits in single-player).
6. Transition to playing phase.

### 4.3 Single-Player vs AI Flow
1. Player completes setup.
2. AI auto-places (seeded).
3. Player moves first (Red).
4. On player turn: select movable piece → highlight legal moves → move or attack.
5. On attack: enter combat reveal → resolve (with special rules for Spy, Miner/Bomb) → show outcome.
6. AI responds (using worker + public view only).
7. Repeat until victory condition met.
8. Victory screen (reason: flag captured or opponent immobilized) + options to rematch or return to menu.

### 4.4 Pass-and-Play Flow
1. Both players complete setup (alternating or sequential with privacy).
2. Red moves first.
3. After a move or combat:
   - If game not over, enter handoff state.
   - UI prompts “Pass device to [Blue/Red]” and blanks sensitive information.
4. Receiving player acknowledges → perspective switches (masked view for the new viewer).
5. Continue alternating with handoff after every turn.
6. Same victory and end-game flow.

### 4.5 Training / Solo Visible Flow
1. Player chooses training mode.
2. Setup may be manual or randomized.
3. Board shows all (or most) piece identities.
4. Player can play against self, a weak AI, or just move pieces to explore.
5. Additional affordances (suggested moves, full history) may be shown.
6. Same victory conditions apply.

All flows support:
- Save / resume via local persistence.
- Graceful handling when storage or audio is unavailable.
- Exit to main menu at any safe point.

## 5. Key Non-Functional Requirements

- **Performance:** Smooth 60 fps interactions where possible. Board interactions and animations must feel instant. AI must not freeze the UI. Target Lighthouse performance score ≥ 90 on mobile.
- **iOS / PWA:** Full support for “Add to Home Screen.” Must launch in standalone mode without Safari chrome. Handle safe-area insets, orientation changes, and background/foreground correctly. Offline launch must work immediately.
- **Accessibility:** Target WCAG 2.2 AA. Keyboard navigation on desktop. Screen-reader friendly announcements for turns, moves, combat, and results without ever exposing hidden enemy ranks. Visible focus, sufficient touch targets (≈44×44 px), high-contrast mode, respect `prefers-reduced-motion` and `prefers-contrast`.
- **Offline:** After initial load, every supported mode must be fully playable without any network. Service worker must cache the app shell and critical assets.
- **No Accounts / Zero Friction:** Game must be instantly playable. All state lives in browser (localStorage / IndexedDB). No sign-up, login, or external service required.
- **Hidden Information Integrity:** The single most important invariant. No path (DOM, ARIA, console, network, storage, debug tools, animation data) may leak unrevealed opponent piece ranks except during authorized combat reveal.
- **Determinism & Reproducibility:** Every game must be exactly reproducible from seed + action list.
- **Resilience:** Must degrade gracefully (no audio, no storage, no workers).

## 6. Interface Structure (Required Screens / States)

The application is organized around a small number of primary screens and transient states. All derive from the `GamePhase` state machine and current `mode`.

**Primary Screens / Views:**
- **Mode Selector / Home** — Entry point. Choose game mode, view saved games, access settings/help.
- **Setup** — Interactive board for placing pieces + piece palette + counts + randomize / ready controls. Separate or split view for two players in pass-and-play.
- **Game Board** — 10×10 grid with lakes, pieces (face-down for hidden enemies), selection, legal-move highlights, turn indicator, and controls.
- **Game Over / Victory** — Display winner, victory reason (flag capture or no moves left), snapshot of final board, rematch / main menu / replay options.

**Transient States / Overlays (not full screens):**
- **Handoff** (pass-and-play only) — Neutral prompt + device-pass instruction. Board must be visually and informationally obscured.
- **Combat Reveal** — Brief animated reveal of both pieces involved in an attack, outcome text (including special-case explanations), then resolution.
- **Modals / Menus** — Settings, pause/resign, save/load list, rules reference, confirmations.

**Shared Elements:**
- Top-level navigation / back-to-menu (safe contexts only).
- Sound toggle (always discoverable).
- Status / turn / move history (limited).
- Responsive layout that adapts between portrait (iPhone primary) and landscape, desktop, and tablet.

The UI layer consumes a `PublicGameView` projection; it never receives raw hidden data except in the narrow combat reveal window.

## 7. Success Metrics / Definition of Done Summary

The product is complete when:

- All eight delivery phases have been executed and signed off.
- Full end-to-end flows for all three game modes pass automated E2E tests (including handoff privacy, AI determinism, offline, save/restore, responsive touch).
- ≥90% unit test coverage on the pure engine; 100% on rules, combat, hidden-info projection, and serialization.
- No critical or high-severity defects remain after independent QA, security/privacy, accessibility, and design review.
- Lighthouse PWA + performance scores meet targets on mobile emulation.
- Manual verification on real iPhone Safari (install, offline launch, rotation, suspension/resume, handoff, touch targets).
- Production build deploys cleanly to Vercel.
- No hidden-information leaks are possible (verified by privacy audit + tests).
- Original visual and audio assets are in place.
- README contains accurate deployment and run instructions.
- All Phase 1 specification documents are present and consistent.

## 8. Risks and Constraints

**Primary Constraints:**
- **Client-only:** All computation, storage, and AI must fit in browser memory/CPU. No server fallback.
- **Hidden Information:** The entire value of the game depends on perfect enforcement. Any leak (even in dev tools or accessibility) invalidates the product.
- **Safari / iOS Limitations:** Audio requires user gesture to start. PWA install and standalone behavior have quirks. Viewport, safe areas, and background throttling must be handled. Service workers and offline have Safari-specific edge cases.
- **Performance Headroom:** Mobile devices are slower; AI and animations must be budgeted carefully.
- **Asset Originality:** Must create (or procedurally generate) all visuals and sounds.
- **No External Dependencies for Core Play:** After first load, nothing may be fetched.

**Key Risks:**
- Accidental hidden-info leakage through UI implementation details.
- AI either too weak (boring) or too slow/strong for the target hardware.
- PWA install flow or offline behavior failing on real iOS devices.
- Subtle rules or combat edge cases that break determinism or fairness.
- Over-engineering (heavy frameworks, unnecessary state libs) that hurts mobile perf or bundle size.
- Safari audio / gesture and service-worker gotchas discovered late.
- Scope creep from attractive but out-of-scope features.

Mitigations are documented in architecture, privacy-model, and test-plan documents.

## 9. Delivery Phases Summary

Work follows the strict ordered sequence defined in the project charter (8 phases). Implementation may not begin until Phase 1 specification documents are complete.

1. **Phase 1: Specification** — Produce the six canonical docs: `product-spec.md`, `game-rules.md`, `architecture.md`, `privacy-model.md`, `visual-direction.md`, `test-plan.md`. Present for review before code.
2. **Phase 2: Engine** — Pure TypeScript domain types, board, legal moves, combat, victory, hidden projections, serialization, unit tests. No polished UI.
3. **Phase 3: Interaction Prototype** — Responsive board, selection, highlighting, setup flow, pass-and-play handoff, basic single-player loop.
4. **Phase 4: AI** — Easy / medium / hard opponents, Web Worker integration where needed, deterministic test harness.
5. **Phase 5: Presentation** — Final visuals, original piece artwork, animations, combat feedback, sounds, settings, tutorial, accessibility polish.
6. **Phase 6: PWA and Offline Support** — Manifest, service worker, offline shell, local saves, iOS install & viewport handling, resume after suspension.
7. **Phase 7: Independent Review** — QA, security/privacy, accessibility, and design agents perform full independent inspection. Fix all critical/high findings.
8. **Phase 8: Vercel Release** — Full lint/type/test/build, production deploy, iPhone Safari verification, documentation of deployment in README.

No phase may be considered complete until its exit criteria (including relevant tests and reviews) are satisfied.

---

This specification is authoritative. Any deviation requires explicit update here and communication to all agents. All future work (architecture details, implementation, tests, reviews) must trace back to the requirements captured above.
