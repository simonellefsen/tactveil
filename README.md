# Tactveil

Modern hidden-information strategy game. Pure client-side. Works offline. Installable PWA.

Inspired by classic 10x10 tactics games with hidden ranks, but fully original in design, visuals, and implementation.

**Repository:** https://github.com/simonellefsen/tactveil  
**Live demo:** https://tactveil.vercel.app (or the latest deployment from the repo)

## Tech

- Svelte 5 + SvelteKit 2
- Pure framework-independent TypeScript game engine in `src/lib/game/`
- Vitest + Playwright
- `@sveltejs/adapter-vercel`
- No server game state
- Service worker for offline assets
- Web Worker ready for AI

## Development

```bash
npm install
npm run dev
npm run build
npm run test
npm run test:ui   # if configured
```

## Architecture

The game engine is completely decoupled:

- All rules, movement, combat, victory, and state transitions live in pure TS functions.
- Svelte only consumes projections (`getPublicGameView`) and dispatches validated actions.
- Hidden information is never present in the rendered DOM, ARIA, classes, or serialized public state.

See `src/lib/game/` for the engine and `src/lib/stores/game.ts` for the Svelte integration.

## Status

- Pure engine complete (movement, combat, setup, serialization, projections)
- SvelteKit UI: interactive CSS Grid board, manual/random setup, click-to-move, legal highlights, public view masking, handoff overlay, combat modal, victory screen, game modes (single w/ AI, passplay, training)
- Basic audio feedback + local persistence
- Service worker for offline
- Build + deploy ready with adapter-vercel
- Next: full AI (deeper), more accessibility, PWA manifest, comprehensive tests

All per original multi-agent spec.

All previous requirements (client-only, no backend state, iPhone friendly, original assets) remain in force.
