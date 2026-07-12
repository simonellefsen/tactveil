# Modern Stratego — Browser Game

A polished, production-ready, client-only implementation of Stratego as an installable web app / PWA. Designed to run beautifully in modern desktop browsers and especially on iPhone Safari as a Home Screen web app. No accounts, no backend, no external services.

**Current Status:** Phase 2 — Core Engine in progress. (Phase 1 specifications approved.)

## Key Principles

- **Fully client-only** — Everything (game logic, AI, persistence, rendering) lives in the browser.
- **Offline-first PWA** — Playable after initial load or Home Screen install, even without network.
- **Strict hidden information** — Opponent pieces are never exposed except through legal game mechanics.
- **Original assets & design** — Modern tactical command table aesthetic. No copied commercial artwork or sounds.
- **Tested & deterministic** — Pure engine with seeded randomness for reproducible tests and replays.
- **iPhone excellence** — Touch-first, safe areas, installable, works great in portrait/landscape.

## Documentation (Phase 1 — Complete & Approved)

All specifications live in `docs/`:

- `product-spec.md` — Vision, required modes, out-of-scope, definition of done.
- `game-rules.md` — **Authoritative rules** (piece counts, movement, exact combat priority, victory, hidden info).
- `architecture.md` — Client-only layering, TypeScript contracts, pure engine, data flow.
- `privacy-model.md` — How hidden information is protected across every surface.
- `visual-direction.md` — Design tokens, piece representation, iOS handling, states.
- `test-plan.md` — Unit, component, E2E, PWA, and manual device testing strategy.
- `decisions.md` — Important architectural and rule decisions + trade-offs.
- `project-status.md` — Living checklist against the 8 phases and Definition of Done.

## Development

```bash
npm install
npm run dev          # Start dev server
npm run test         # Run Vitest (engine first)
npm run test:run     # CI-friendly single run
npm run build        # Production build
npm run lint
```

### Current Focus (Phase 2)

The pure game engine lives in `engine/` (framework-independent TypeScript).

- All rules are implemented as pure functions.
- Full internal state knows every piece.
- Public views are produced by projection functions only.
- Deterministic via seeded RNG.
- Comprehensive unit tests required before any UI work on the board.

UI work (the board, setup screens, etc.) will come **after** the engine + tests are solid.

## Project Structure (Current)

```
/Users/lindau/T3/stratego
├── README.md
├── docs/                     # All Phase 1 specifications
├── engine/                   # ← Pure game engine (in progress)
│   └── *.ts + *.test.ts
├── app/                      # Next.js App Router (UI shell later)
├── public/
└── ... (package.json, vitest.config.ts, etc.)
```

## Game Modes (All supported)

1. Single-player vs Computer (Easy / Medium / Hard)
2. Local Pass-and-Play (with privacy handoff screen)
3. Training / Solo Visible (all pieces shown for learning)

## Definition of Done

See `docs/project-status.md`. The project is only complete when:

- Full playable game from setup to victory in all modes
- Engine enforces every rule exactly
- AI is fully local and offline
- Safe pass-and-play with no leakage
- Installable PWA on iPhone that works offline
- All tests green + independent review passed
- Successful Vercel production deploy

## Next Steps

Engine implementation + tests → Interaction prototype → AI opponents → Polish, PWA, accessibility → Independent review → Vercel deploy.

---

**All work follows the multi-agent workflow and strict client-only + hidden-information constraints defined in the Phase 1 documents.**
