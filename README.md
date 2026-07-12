# Tactveil

Modern hidden-information strategy game. Pure client-side. Works offline. Installable PWA.

Inspired by classic 10x10 tactics games with hidden ranks, but fully original in design, visuals, and implementation.

**Repository:** https://github.com/simonellefsen/stratego  
**Demo domain:** stratego-ochre.vercel.app (will be updated to tactveil-*.vercel.app)

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

Phase 2 (Engine) + early interaction demo complete. Full UI, AI difficulties, sounds, and PWA polish in progress.

All previous requirements (client-only, no backend state, iPhone friendly, original assets) remain in force.
