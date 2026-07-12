# Stratego Privacy and Hidden Information Protection Model

**Version:** 1.0  
**Status:** Authoritative specification for implementation (early phase)  
**Scope:** Client-only web application (browser, static assets after initial load). Pass-and-play on shared device. No servers, no accounts, no external services during play.

This document defines the contracts and invariants that the rules engine, UI layer, persistence layer, build configuration, and tests MUST uphold to protect hidden piece identities and overall user privacy.

**Primary reference:** [game-rules.md](./game-rules.md), especially Section 9 "Hidden Information Model".

All implementation must derive behavior from the ruleset. This privacy model extends the hidden information rules into concrete data structures, UI contracts, storage, and hardening measures.

## 1. Hidden Information Boundaries

### 1.1 Authoritative Internal State (`FullGameState`)

The core engine maintains one source of truth that **always** knows every piece identity. This lives only inside the engine module(s) and is **never** passed to or rendered by UI components.

```ts
// Conceptual (exact types decided in engine implementation)
type PieceType = 'marshal' | 'general' | 'colonel' | 'major' | 'captain' |
                 'lieutenant' | 'sergeant' | 'miner' | 'scout' | 'spy' |
                 'bomb' | 'flag';

interface Piece {
  id: string;                    // Stable unique id for the piece instance
  owner: 'red' | 'blue';
  type: PieceType;               // ALWAYS the true type. Never "unknown" here.
  position: [number, number];    // [row, col] 0-based
  isRevealed: boolean;           // True if the *opponent* knows this piece's type
}

interface FullGameState {
  schemaVersion: number;         // For persistence + migrations
  rulesVersion: string;          // e.g. "1.0"
  board: Map<string, Piece>;     // Keyed by "r-c" or use 2D array / flat list
  currentPlayer: 'red' | 'blue';
  turnNumber: number;
  // Repetition trackers, move history (full for engine), setup complete flags, etc.
  // History entries record *events* (move + resulting reveals) but full types live in board.
}
```

- `type` is the internal identifier from game-rules.md (stable, lowercase).
- `isRevealed` is per-piece and permanent. It is set to `true` for affected pieces on:
  - Any combat (both attacker and defender become revealed to everyone).
  - Scout relocation > 1 square (the scout itself).
- Bombs and Flags start unrevealed; they become revealed only on interaction.
- The authoritative state is mutated only by the pure engine function(s) (e.g. `applyAction(state, action, player): FullGameState`).

### 1.2 Projected Player Views (`PlayerView`)

The **only** data the UI layer is allowed to receive or render is a projected view:

```ts
function getPlayerView(state: FullGameState, viewer: 'red' | 'blue'): PlayerView;

interface PublicPiece {
  id?: string;                   // Present only for own pieces if needed for selection
  position: [number, number];
  owner: 'red' | 'blue';
  type: PieceType | 'unknown';   // 'unknown' ONLY for unrevealed opponent pieces
  // No numeric rank, no extra metadata that distinguishes unknown pieces
}

interface PlayerView {
  viewer: 'red' | 'blue';
  currentPlayer: 'red' | 'blue';
  board: PublicPiece[];          // Or map. All 100 squares represented or sparse + lakes
  legalMoves?: Array<{from: [number,number], to: [number,number]}>; // Computed for viewer only
  // Public metadata only: turn count, winner (if ended), etc.
  // NO full move history containing concealed setup details.
}
```

**Projection rules (must be implemented exactly):**

- If `piece.owner === viewer`: `type = piece.type` (always).
- Else: `type = piece.isRevealed ? piece.type : 'unknown'`.
- Lakes and empty squares are public and identical for both viewers.
- The view object must be a fresh, plain data structure (ideally frozen in prod).

**Engine contract:**
- All move validation, combat resolution, repetition checks, and win conditions are performed against `FullGameState`.
- `getPlayerView` is a pure, side-effect-free projector.
- No other export from the engine may leak concealed types to callers outside the engine boundary.
- UI never imports or receives `FullGameState`.

During setup, each player sees only their own placement choices; the opponent board shows generic backs.

## 2. How the UI Will NEVER Leak

The rendered output (DOM, React fiber/props/context, ARIA, CSS, console, storage keys, URLs) for any viewer at any moment must contain **zero** data representing concealed enemy piece identities.

### 2.1 Absolute Prohibitions (applies to real mode and pass-and-play)

- **No text content**: No DOM text, `textContent`, `innerText`, or React children containing piece names, ranks ("10", "marshal", "spy", "bomb"), or numbers that map to concealed pieces.
- **No ARIA leakage**: No `aria-label`, `aria-labelledby`, `aria-description`, `title`, `alt` on unknown pieces that reveals type. Use generic labels such as:
  - `"Unknown enemy piece"`
  - `"Your marshal (known only to you)"` (for own pieces)
- **No data attributes**: Forbid `data-type`, `data-rank`, `data-piece-id` (when it would identify concealed), `data-revealed` that differentiates unknown pieces, or similar. Allowed: `data-position="4-2"`, `data-owner="red"`, `data-role="piece"`.
- **No CSS class leakage**: Generic only:
  - `piece`, `piece--own`, `piece--enemy`, `piece--unknown`, `piece--revealed`, `piece--scout-revealed`
  - Never: `piece--marshal`, `rank-10`, `type-bomb`, `hidden-general`.
  Visual distinction for known pieces uses inline SVG icons, background images (data: or bundled), or `style` (not class names that leak).
- **No console leakage (prod)**: Production builds must emit zero `console.log` / `table` / `dir` of state containing types. Use a no-op logger:
  ```ts
  const log = import.meta.env.PROD ? () => {} : console.log;
  ```
- **No URL / history leakage**: State never serialized into `location.hash`, query params, or `history.pushState` payloads. Opaque game ids only if deep-linking public replays.
- **No localStorage / IndexedDB key leakage**: Keys are opaque and generic:
  - `stratego:v1:settings`
  - `stratego:v1:game-index`
  - `stratego:v1:game:abc123`
  Never keys like `currentEnemyRanks` or values that embed raw concealed maps.
- **No React / component tree leakage**: Never pass `FullGameState` or raw piece lists with hidden types down as props or via context. Only `PlayerView` (or a minimal subset) reaches components. Use `Object.freeze` + defensive copying on views in production.
- **No visual differentiation of unknowns**: All unrevealed opponent pieces must render identically (same back graphic per owner). No subtle CSS, size, or animation differences that could encode identity.

### 2.2 Enforcement

- Central rendering component: `<Piece publicPiece={p} viewer={v} />` — type is either concrete or `'unknown'`.
- Dev-only asserts (stripped in prod): scan props and DOM nodes for forbidden strings when `!isTraining`.
- Accessibility live regions announce only public events: "Red moved a piece", "Combat occurred", "Your turn".
- Tests must include "leakage tests": given a view with unknowns, assert no forbidden identifiers appear in rendered output or serialized view.

## 3. Persistence Model

### 3.1 What Gets Saved

- **Full authoritative game state** (required for correct resumption): the complete `FullGameState` including all `type` values and `isRevealed` flags. This is necessary so the engine can correctly project views for whichever player is active on resume.
- **Lightweight index / metadata**: list of saved games (id, lastTurn, currentPlayer, timestamp, optional player labels). No piece data in index.
- **Settings**: global (volume level, theme, preferred rules variant, training vs real default). Never per-game or per-player hidden assumptions.
- **Optional move log**: sequence of public actions + the types that were revealed at each reveal event. Useful for replays and training. Does not duplicate concealed initial setup.
- **Not saved**: transient UI (current selection, animations in flight), temporary handoff state.

Primary storage: **IndexedDB** (structured, supports larger blobs, better quota handling). Use localStorage only for tiny metadata or as fallback.

### 3.2 Concealed Information in Saves

- Saves contain truth because the device owner (or pass-and-play pair) needs it to continue.
- On load, immediately project via `getPlayerView(loaded, currentPlayer)`. The loaded full state must never be attached to UI state or window.
- Saves are never transmitted automatically.

### 3.3 Versioning and Migration

- Every persisted root object includes `schemaVersion` and `rulesVersion`.
- On load mismatch:
  1. Attempt non-destructive migration (add default fields, recompute `isRevealed` from log if available).
  2. On failure: surface clear message, offer "Export public log", "Delete game", or "Start fresh".
- Bump versions on any shape change. Keep migration code for at least two prior versions.

### 3.4 Corruption Recovery

- Write strategy: atomic writes (write new blob then delete old) or keep last N snapshots per game.
- Include a simple integrity field (e.g. `checksum: hash(JSON.stringify(dataWithoutChecksum))`).
- On read failure or checksum mismatch:
  - Try previous snapshot(s).
  - If none: treat as corrupt, allow user to delete or export whatever is parsable.
- Never throw uncaught; always recover to a playable state or clean "new game" prompt.
- Auto-save after every legal action + on visibility change / beforeunload where possible.

## 4. No Trackers, Analytics, Ads, External Scripts, Fingerprinting

- The application is strictly client-only after initial static asset load.
- **Zero external network calls** during active play. No `fetch`, `XMLHttpRequest`, beacons, WebSockets, or third-party `<img>`/`<script>` after the page is interactive.
- All code, styles, fonts (if any), icons (inline SVG or data URLs), and audio (Web Audio buffers or short embedded) are bundled.
- **Content-Security-Policy** (enforced via meta tag and/or server headers when hosted):
  ```
  default-src 'self';
  script-src 'self' 'unsafe-inline'; /* only if needed; prefer no eval */
  connect-src 'none';
  img-src 'self' data: blob:;
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  ```
- No analytics, error reporting services, ad networks, or telemetry.
- No fingerprinting techniques (canvas, AudioContext, font enumeration, WebGL, battery, etc.).
- **Enforcement in implementation**:
  - Dev: monitor Network tab; add a runtime guard that throws if any non-local network call is attempted after init.
  - CI / tests: start a static server on the built output and assert no outgoing requests after load (except perhaps one for manifest if PWA).
  - Bundle scanners must flag any external URL literals.

Initial load may involve the host serving the HTML/JS bundle. After that: pure local execution.

## 5. Audio

- All audio cues are generic and non-identifying: move sound, attack sound, capture variants (generic win/lose for attacker/defender), bomb effect, flag capture, invalid move, turn start.
- No per-piece or per-rank sounds (no "marshal fanfare", no voice announcing ranks).
- Audio settings (muted, master volume) are stored only as global scalar values in settings. They carry no game state, player identity, or history.
- Use Web Audio API or tiny pre-decoded buffers. No dynamic loading of audio files.
- During handoff, suppress or use only neutral cues.

## 6. Pass-and-Play Handoff

Physical device handoff must not allow the receiving player to observe the previous player's private view or any concealed information.

**Mandatory handoff flow:**

1. After a successful move + resolution + animation, disable further input on the board.
2. Display a full-screen, non-dismissible "Pass the device" overlay:
   - Clearly labels the next player ("Blue's turn — pass to Blue").
   - Covers every game element (board, status, pieces).
3. On explicit "Ready" / "I'm Blue, start my turn" action by the new player:
   - Clear **all** transient state (selection, highlights, any piece detail popovers).
   - Update engine current player.
   - Compute the fresh `PlayerView` for the new viewer.
   - Remove overlay and render the new (safe) view.
4. The overlay must be present until the receiving player explicitly acknowledges.
5. Handle edge cases: page visibility change, resize, or back/forward must re-assert the obscuring overlay if handoff is in progress.

**Additional protections:**
- No piece detail remains visible (even for own pieces) during the handoff moment.
- Keyboard and pointer events are swallowed by the overlay.
- On very small screens, the overlay is especially prominent.

This protocol ensures that when the device changes hands, the new player sees only their legitimate view.

## 7. Training Mode vs Real Mode Difference in Visibility

**Real mode (default for normal play):**
- Strict `getPlayerView` enforcement at all times.
- No UI control, keyboard shortcut, or debug flag exposes concealed opponent types.
- Full state is never surfaced outside engine.
- Exports default to public-only.

**Training / tutorial / analysis mode:**
- May expose "Reveal all" (or god-mode board) using a separate projector or direct full state access, but only when `mode === 'training'`.
- Allows peeking at setup, step-by-step combat simulation with identities shown, AI explanations.
- Games are tagged `mode: 'training'`.
- Storage uses isolated namespace or flag (`stratego:v1:training-games:...`).
- Full-state exports are permitted (with explicit warning banners).
- Switching modes requires starting a new game; existing real games cannot be converted to training mid-play.

The engine accepts an `options: { training: boolean }` that influences only projection and available debug actions. Real-mode invariants are never relaxed.

## 8. Export / Import of Games

Prevent accidental or easy cheating via shared artifacts.

### 8.1 Export Variants (UI must make the safe one the obvious default)

- **Public / Replay Export** (primary, labeled "Export public game log (safe to share)"):
  - Move/action history (from/to + outcome type: relocate, attack-win, attack-loss, mutual, etc.).
  - The types revealed at the exact step they became known.
  - Current public board snapshot (with `'unknown'` for still-hidden pieces).
  - Does **not** contain initial hidden piece placements for pieces that remain unrevealed.
  - Safe for analysis, sharing, or importing into training for review.

- **Full authoritative export** (secondary, advanced, labeled with strong warning):
  - Complete `FullGameState`.
  - Only surfaced in training mode or behind "I understand this lets the recipient see all hidden information" multi-step confirmation.
  - Filename or metadata clearly marks it as containing concealed data.

### 8.2 Import Rules

- Validate schemaVersion / rulesVersion.
- On import of a full-state blob into a non-training context: either reject ("This file contains hidden information and may only be loaded in Training mode") or force-load into a fresh training game.
- Public logs can be imported into either mode.
- After import, re-apply projection immediately.
- Warn user that imported games from untrusted sources may have been tampered with (engine must still validate all actions on replay).

Never allow clipboard or drag-drop of internal state objects without going through the export sanitizer.

## 9. Local Data Deletion

Provide clear, discoverable controls (Settings > Privacy & Storage):

- Delete current game only.
- Delete selected saved games.
- "Clear all saved games".
- "Factory reset" (all data + settings + caches).

On any delete action:
- Remove corresponding IndexedDB records and localStorage entries.
- Clear relevant Cache API entries if used.
- Reset any in-memory caches.
- Provide success feedback and (optionally) a "reload" to ensure clean state.
- Deletion is immediate and irreversible.

Also expose storage usage estimate to encourage proactive cleanup.

## 10. Browser Storage Limitations on iOS and Graceful Handling

iOS Safari / WebKit has well-known constraints.

**Known characteristics (verify against current devices):**
- localStorage: capped near 5 MiB per origin.
- IndexedDB + other script-writable storage: variable, historically ~50 MiB per origin in some reports; more recent behavior tied to device storage (tens to hundreds of MiB). Can be more generous for installed PWAs.
- 7-day eviction window for data written by scripts on non-PWA sites in some Safari versions.
- QuotaExceededError (or equivalent) is thrown on writes past limit.
- Private / Incognito mode: storage is temporary and wiped on tab close.

**Required implementation behavior:**

- Always call `await navigator.storage.estimate()` before writes when possible; display "X / Y MB used" in storage management UI.
- Primary persistence in IndexedDB.
- On `QuotaExceededError` (catch DOMException and specific names):
  - Do not lose the in-memory current game.
  - Show actionable UI: "Storage limit reached on this device. Delete older games to save, or export the current game first."
  - Provide one-click "Delete oldest games" or auto-prune if user has a preference enabled.
- Recommend (in UI text and README): "Add to Home Screen for better storage quota and persistence on iOS."
- Detect private browsing (best-effort: write a test value and see if it sticks) and warn: "Games may not be saved in private browsing."
- Graceful degradation: if persistence fails entirely, the game remains playable in the current tab until close. Offer export at any time.
- Use reasonably compact serialization. Consider optional compression for very long histories.
- Test thoroughly on physical iOS Safari + iPadOS. Do not rely solely on desktop emulation.

Implement a `StorageManager` abstraction that hides the details and always surfaces quota-aware errors.

## 11. Potential Attack Vectors and Mitigations

Client-only means the full truth resides in the browser process memory. A user with full control of the device can always extract it via debugger, memory inspection, or patching. The objectives are:

- Eliminate *casual* leaks (shoulder-surfing, devtools glance, accidental export, pass-and-play mistakes).
- Raise the effort required for deliberate cheating during normal play.
- Make production behavior different from dev.

**Major vectors and required mitigations:**

- **React DevTools / browser Elements / Console / Application tabs**: Mitigate via production builds (no devtools extensions easy wins), never exposing full state on `window`, only passing frozen `PlayerView` objects, generic DOM, and no-op console. Document that determined attackers can still breakpoint inside `getPlayerView`.
- **Source maps**: Disable or do not ship in production bundles.
- **localStorage inspection**: Opaque keys + values. Optional trivial obfuscation (xor + base64) as a speed bump — do not rely on it for security.
- **Timing / side channels**: Unlikely to be useful; keep all logic deterministic and non-leaking in projection.
- **Clipboard / drag-and-drop / print**: Sanitize anything exported.
- **PWA / installed app inspection**: Same rules apply.
- **Shoulder-surfing + quick handoff**: The explicit ready overlay + blanking is the defense.
- **Cheating via shared full export**: Strict default to public exports + mode gating.
- **Build-time mistakes**: Separate dev vs prod entry points. Any debug "show all" must be tree-shaken or gated by `import.meta.env.DEV && training`.

**Realistic stance for prod:** "We make it hard to leak by accident and require active effort (and usually devtools) to cheat. Perfect information hiding is impossible in a client-side game on a device you control."

Include a production checklist in the repo (e.g. `docs/build-checklist.md` or section here) covering minification, CSP, env flags, and absence of debug exports.

## 12. Dependency Audit Approach

Minimize third-party code. Every dependency increases surface area.

**Ongoing process (must be followed by all contributors):**

1. **Before adding a dependency**:
   - Review the package on npm, its GitHub, last publish date, issue count, and transitive deps.
   - Run `npm audit` and review output.
   - Run license checkers.
   - Inspect the package for any network calls, analytics, or phone-home in its code.
   - Prefer zero-dependency or single-file solutions for game logic.

2. **CI enforcement**:
   - `npm ci`
   - `npm audit --production --audit-level=moderate` (fail build on failures).
   - Bundle size / analyzer step that fails on unexpected growth or external asset references.
   - Post-build static scan of `dist/` for `http://` / `https://` strings outside of known safe (e.g. none).

3. **Runtime guards** (dev + test):
   - Monkey-patch `fetch`, `XMLHttpRequest`, etc. after bootstrap and throw on any call.
   - Tests that load the built bundle in a controlled environment.

4. **Allowed vs. disallowed** (examples; keep an up-to-date table in this doc or `package.json` comments):
   - Allowed (audited): React (core), tiny state primitives if needed, pure TypeScript utilities.
   - Disallowed: anything analytics, Sentry, LogRocket, ad-related, large charting libs, external font CDNs at runtime, service that requires keys.

5. **Regular maintenance**:
   - Quarterly lockfile + dep review.
   - Only update with clean audit and after spot-checking the diff for new network behavior.
   - Document every runtime dependency and its justification in an appendix or `DEPENDENCIES.md`.

At the time of writing, the expectation is a very small set: primarily the framework for UI (e.g. React) + build tooling. The rules engine itself must remain dependency-free.

## Actionable Implementation Guidance

- Place engine + projectors in `src/engine/` (pure, easily testable, no DOM).
- UI consumption only through a hook or context that calls `getPlayerView` and never leaks further.
- Storage service isolated in `src/storage/`.
- Add leakage tests early (snapshot tests of views + rendered DOM strings).
- Feature flag or env var to toggle strict real-mode behavior for testing.
- Update this document whenever the state shape, export formats, or hardening measures change.

Deviations from this model require an update to this file and review.

---

*This is the complete early-phase privacy model. It is actionable: every section maps to specific code structures, contracts, tests, and build steps that implementers must deliver.*
