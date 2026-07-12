# Project Status Checklist

**Project:** Modern Stratego-Inspired Browser Game  
**Current Phase:** Phase 1 — Specification (complete)  
**Date:** 2026-07-12  
**Overall Status:** On track. Awaiting user review of specifications before Phase 2.

Use this checklist to track progress against the Definition of Done and Phase gates. Update status as work proceeds. Mark items **Done**, **In Progress**, **Blocked**, or **Not Started**.

---

## Phase 1: Specification — COMPLETE

- [x] `docs/product-spec.md` created and reviewed internally
- [x] `docs/game-rules.md` created (authoritative, pure rules)
- [x] `docs/architecture.md` created (client-only, engine separation)
- [x] `docs/privacy-model.md` created
- [x] `docs/visual-direction.md` created
- [x] `docs/test-plan.md` created
- [x] `docs/decisions.md` initialized
- [x] `docs/project-status.md` (this file)
- [x] External / user confirmation that specs are sufficient to begin implementation (pending)

---



## Phase 2: Engine — In Progress

**Started:** 2026-07-12 after user confirmation of Phase 1 specs.

- [x] Next.js 16 project initialized (App Router, TS strict, Tailwind, ESLint)
- [x] Vitest configured for pure engine tests
- [x] Domain types (`Piece`, `Position`, `GameState`, `Action`, `CombatResult`, etc.) defined in `engine/types.ts`
- [x] Board model + lake/position utilities (engine/board.ts)
- [x] Legal move generator for standard pieces + Scout (engine/movement.ts)
- [x] Exact combat resolution algorithm (engine/combat.ts)
- [x] Setup placement, commit, applyAction reducer, public view projection (engine/state.ts)
- [x] Seeded RNG (mulberry32 style) for determinism
- [x] RANDOMIZE_SETUP implemented with seeded generator
- [x] Versioned serialization (serialize/deserialize + replay export)
- [x] Unit tests passing (engine logic)
- [x] Interactive Svelte UI: CSS Grid board with selection/legal highlights, setup palette, full move/attack, modes (single/passplay/training), handoff overlay, combat modal, victory screen
- [x] Components: Board.svelte, Handoff.svelte, CombatModal.svelte, Victory.svelte
- [x] Basic audio (Web Audio beeps for actions/combat)
- [x] Simple AI for single player (random legal after human move)
- [x] Service worker for offline assets
- [x] Basic localStorage save/load via serializer + UI buttons
- [x] Difficulty levels for AI with heuristic scoring (easy random, med/hard prefer good attacks + position)
- [x] Game modes with proper flows, PWA manifest, improved audio, remaining counts, captured summary, training shows all
- [x] Board with improved glyphs (stars, arrows, etc.)
- [x] Build succeeds with @sveltejs/adapter-vercel
- [x] Pushed to https://github.com/simonellefsen/tactveil
- Next: deeper AI (e.g. basic search), full E2E tests, original piece glyphs/SVGs, Vercel deploy + iPhone test, more audio
- [ ] Immutable state updates + `applyAction(state, action, rng)`
- [ ] Seeded RNG utility
- [ ] Serialization (versioned, round-trip safe, migration path)
- [ ] Full unit test suite passes (≥90% engine coverage, 100% on rules/projection)
- [ ] Engine runs in Node (Vitest) with zero browser dependencies
- [ ] Development-only scenario builder (excluded from prod)

**Current focus:** Build and test the pure rules engine **before** any board UI.

- [ ] Domain types (`Piece`, `Position`, `GameState`, `Action`, `CombatResult`, etc.) defined in `src/engine/types.ts`
- [ ] Board model + lake/position utilities implemented and unit-tested
- [ ] Legal move generator for every piece type (including Scout pathing)
- [ ] Combat resolution (exact priority algorithm from rules) implemented + exhaustive tests
- [ ] Setup validation + auto-setup (random legal placement)
- [ ] Victory / no-legal-move detection
- [ ] Hidden-information projection (`getPublicBoard(viewer)`) with tests proving no leakage
- [ ] Immutable state updates + `applyAction(state, action, rng)`
- [ ] Seeded RNG utility
- [ ] Serialization (versioned, round-trip safe, migration path)
- [ ] Full unit test suite passes (≥90% engine coverage, 100% on rules/projection)
- [ ] Engine runs in Node (Vitest) with zero browser dependencies
- [ ] Development-only scenario builder (excluded from prod)

**Gate:** Do not proceed to polished UI until engine + tests are solid.

---



## Phase 3: Interaction Prototype — Not Started

- [ ] Responsive 10×10 board (CSS Grid preferred) with touch + keyboard
- [ ] Piece selection, legal move/attack highlighting
- [ ] Setup flow (manual placement + validation + auto option)
- [ ] Pass-and-play privacy handoff screen + flow
- [ ] Basic single-player loop (human vs placeholder AI)
- [ ] Combat result presentation (temporary)
- [ ] Turn indicator, captured summary (public only)
- [ ] Basic pause / exit

---



## Phase 4: AI — Not Started

- [ ] Easy opponent (quick, intentionally imperfect, legal moves only or near-random with bias)
- [ ] Medium opponent (threat evaluation + basic risk estimation)
- [ ] Hard opponent (deeper search, objective defense, probability tracking where safe)
- [ ] All AI operates exclusively on `PublicGameView`
- [ ] Web Worker integration (no main-thread freeze)
- [ ] Time-bounded thinking with graceful fallback
- [ ] Deterministic via seed (reproducible in tests)
- [ ] Clear "AI is thinking" feedback
- [ ] AI tests (seeded matches produce identical decisions)

---



## Phase 5: Presentation — Not Started

- [ ] Final visual system implemented per `visual-direction.md` (tokens, board, pieces, states)
- [ ] Original piece glyphs (inline SVG, strong silhouettes)
- [ ] Animation system (short, reduced-motion aware)
- [ ] Combat feedback (reveal sequence)
- [ ] Sound system (Web Audio, gesture-initialized, multiple channels, mute always visible)
- [ ] Settings panel (sound, motion, hints, difficulty, high-contrast)
- [ ] In-game rules / tutorial reference
- [ ] Accessibility audit pass (WCAG 2.2 AA where practical; keyboard, focus, labels, contrast, screen reader safe)

---



## Phase 6: PWA and Offline Support — Not Started

- [ ] `manifest.webmanifest` (or Next.js manifest) with original icons
- [ ] Service worker (caches shell + assets for offline launch)
- [ ] Offline fallback page / graceful behavior
- [ ] Viewport, safe-area, `100dvh`, orientation handling for iPhone
- [ ] No hover-only interactions; large touch targets
- [ ] Install prompt / "Add to Home Screen" guidance
- [ ] Local save / load (versioned + validated)
- [ ] "Delete all local data" with confirmation
- [ ] Correct behavior after app suspension / resume
- [ ] Theme color, background color, standalone display
- [ ] Tested offline launch on simulated and real iPhone Safari

---



## Phase 7: Independent Review — Not Started

- [ ] QA and Code Review Agent full review (architecture, correctness, tests, perf)
- [ ] Security and Privacy Reviewer sign-off (no leaks, no trackers, local-only)
- [ ] Accessibility Agent sign-off
- [ ] Visual / UX consistency review against `visual-direction.md`
- [ ] All critical and high-severity defects fixed
- [ ] `docs/final-review.md` published

**Gate:** No unresolved critical or high-severity findings.

---



## Phase 8: Vercel Release — Not Started

- [ ] Lint clean
- [ ] Type check clean (strict)
- [ ] All unit + component tests pass
- [ ] Playwright E2E suite passes (including iPhone viewports)
- [ ] Production build succeeds (`next build`)
- [ ] Bundle size within budget (document actual)
- [ ] Lighthouse scores meet targets (PWA 100, performance, a11y)
- [ ] No runtime secrets or network calls in prod build
- [ ] Direct navigation + refresh behavior correct
- [ ] Deployed to Vercel
- [ ] Deployed PWA tested on real iPhone Safari (install, offline, rotation, suspension)
- [ ] `README.md` contains build, test, deploy, and verification instructions
- [ ] All acceptance criteria in Definition of Done satisfied

---



## Definition of Done (High-Level Gates)

- [ ] Full game playable end-to-end (setup → victory) in all three modes
- [ ] Engine enforces every rule from `game-rules.md`
- [ ] AI works completely offline
- [ ] Pass-and-play handoff demonstrates no obvious leakage (multiple reviewers)
- [ ] Excellent on iPhone portrait + landscape (installed PWA)
- [ ] Installs to Home Screen and launches offline
- [ ] No backend, accounts, database, or external state
- [ ] Local saves versioned + validated; game playable with storage disabled
- [ ] Audio only after explicit user gesture; mute always available
- [ ] Original visuals and sounds (no copied assets)
- [ ] Automated tests all green
- [ ] Production build + Vercel deploy clean
- [ ] Independent review complete with no open critical/high issues
- [ ] Documentation (this file + decisions + specs) matches reality

---



## Current Risks / Blockers

- **None active.** All Phase 1 deliverables are complete.
- Pending: User / stakeholder approval to proceed to code (Phase 2 engine).



## Notes

- This checklist is the authoritative progress tracker.
- Every agent must update relevant items after substantial work and run relevant tests.
- Do not mark a phase complete until its gate criteria are met and reviewed.
- Add new rows for discovered work as needed.

**Last updated:** 2026-07-12 by Product Lead (orchestrator) after Phase 1 document generation.