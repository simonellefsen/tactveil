# Visual Direction: Modern Tactical Command Table

**Status:** Foundational design system. Established *before any code is written*.  
**Theme:** Modern tactical command table — a premium, physical-feeling digital war room table. Original aesthetic drawing from military map tables, etched overlays, and restrained command interfaces. Not derivative of any commercial Stratego implementation, artwork, or branding.

The design prioritizes clarity, immersion, and mobile excellence. The board is the hero. Everything else serves it. All elements are original vector work or CSS-native.

---

## 1. Overall Aesthetic

### Color Palette (Dark Tactical, Elegant Map Tones)

A restrained, high-contrast dark palette evoking a dimly lit command table under focused light. Minimal "neon" — only very low-opacity glows or subtle edge highlights. No saturated primaries.

**Core Colors**
- `--color-bg-void`: `#0A0D12` — Deepest background, almost black. Primary app canvas.
- `--color-bg-surface`: `#12161C` — Elevated panels, modals, menus.
- `--color-bg-board`: `#181D24` — The table surface under the grid.
- `--color-bg-cell`: `#20272F` — Default playable cell. Matte, slightly cool.
- `--color-border-subtle`: `#2F3741` — Thin grid lines and dividers.
- `--color-text-primary`: `#E8E4D9` — Warm off-white (parchment-like) for high readability.
- `--color-text-secondary`: `#9AA0A8` — Supporting text, labels.
- `--color-text-muted`: `#6C737C` — Disabled, secondary info.

**Tactical Accents (Restrained)**
- `--color-accent-command`: `#2B6E63` — Muted teal. Friendly actions, selection, legal moves. Low-saturation.
- `--color-accent-bronze`: `#8F5E3A` — Warm desaturated bronze. Opponent emphasis, threats, combat results.
- `--color-accent-success`: `#4D6B3F` — Olive green. Successful captures/defense.
- `--color-accent-danger`: `#7A3D3D` — Muted red-brown. Losses, invalid states.
- `--color-lake`: `#152126` — Base water tone.
- `--color-lake-detail`: `#0F181C` — Darker water, used for wave lines.

**Player Distinction (Secondary to Shape)**
- Friendly / Local player (always bottom in portrait): uses `--color-accent-command` as base accent.
- Opponent: uses `--color-accent-bronze`.
These tints are *very* low saturation and are always paired with explicit non-color markers (see Piece Representation).

**High Contrast Mode Variant**
Activated via settings toggle. Boosts:
- Text to near `#FFFFFF` / `#000000` where appropriate.
- Borders to 2–3px solid.
- Removes subtle textures and low-opacity glows.
- Increases piece internal contrast.

**Glows & Highlights**
Use extremely restrained glows only (opacity 0.08–0.18). Example: `box-shadow: 0 0 0 1px rgba(43, 110, 99, 0.12);`. Never bright neon.

### Typography

- **Primary stack:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Tactical / Display (headers, ranks):** Same stack with `font-weight: 600–700`, letter-spacing tightened slightly (`-0.01em` to `-0.025em`) for command feel. Avoid decorative fonts.
- **Numeric / Coordinates:** Tabular figures via `font-feature-settings: "tnum"` where supported. Monospace fallback for pure alignment.
- **Never:** All-caps for long text. Small-caps sparingly for labels only.

**Scale (mobile-first, px at 1x, scale with rem)**
- `--text-xs`: 11px / 1.3
- `--text-sm`: 13px / 1.35
- `--text-base`: 15px / 1.4 (default body)
- `--text-md`: 17px / 1.35
- `--text-lg`: 19px / 1.3
- `--text-xl`: 22px / 1.25
- `--text-2xl`: 26px / 1.2
- `--text-3xl`: 32px / 1.15 (screen titles)

Line lengths capped ~65–72 characters in panels. Generous leading on board labels.

### Elevation

Layered depth mimicking physical table + overlays:
- Level 0: Board and background.
- Level 1: Cell surfaces (subtle inner bevel via multiple box-shadows or inset).
- Level 2: Pieces (lifted 1–2px + soft shadow).
- Level 3: Selected / lifted pieces, small controls.
- Level 4: Modals, sheets, combat overlays (`0 8px 32px rgba(0,0,0,0.6)` + subtle border).
- Level 5: Toast / critical alerts.

Shadows are soft, large radius, low opacity. No hard black drops.

### Textures (Original Procedural / SVG)

- **Table surface:** Very subtle radial gradient + CSS `background-image` with tiny repeating SVG noise/grain (data URI or inline `<pattern>`). Matte, not glossy.
- **Grid lines:** Primary thin SVG strokes + secondary hairline at 50% opacity for premium etched look.
- **Cell micro-texture:** Optional ultra-low-contrast crosshatch or paper fiber pattern (SVG pattern) only on playable cells. Disabled in high-contrast.
- **Lake:** Custom SVG water — multiple layered `<path>` for soft ripples + cross-hatch or contour lines in `--color-lake-detail`. No photographic water.
- **Piece surfaces:** Vector only. Subtle inner gradients or multiple strokes for "metal/plastic token" or "wood inlay" feel. No external images.
- **All textures:** Lightweight, scalable, generated in code or as tiny embedded SVGs. 100% original.

---

## 2. Design Tokens

All values expressed as CSS custom properties. Mobile-first. Use `rem` for typography/spacing where possible; `px` for precision on grid and borders.

### Spacing Scale (4px base)
- `--space-0`: 0
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-7`: 32px
- `--space-8`: 40px
- `--space-9`: 48px
- `--space-10`: 64px

Usage: Generous around board. Tight (8–12px) inside panels. Minimum 8px gutters between interactive elements outside board.

### Typography Scale
See section 1. Apply `font-size: var(--text-base);` etc. Use `clamp()` for fluid scaling between portrait breakpoints only when needed.

### Border Radius
- `--radius-xs`: 2px (cell corners, subtle)
- `--radius-sm`: 4px (small buttons, tags)
- `--radius-md`: 8px (cards, modals, piece containers)
- `--radius-lg`: 12px (larger sheets)
- Board cells: 1–2px or 0px for crisp grid feel. Prefer `--radius-xs`.

### Shadows / Elevation
```css
--shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.35);
--shadow-lifted: 0 4px 16px rgba(0, 0, 0, 0.45);
--shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.6);
--shadow-glow-command: 0 0 0 1px rgba(43, 110, 99, 0.15);
```
Pieces receive `--shadow-lifted` on select. Modals use `--shadow-modal`.

### Motion Timings
- `--motion-instant`: 0ms (reduced motion)
- `--motion-fast`: 120ms cubic-bezier(0.2, 0, 0.2, 1) — micro feedback, press, hover-equivalent
- `--motion-med`: 200ms cubic-bezier(0.2, 0, 0.1, 1) — standard move, select
- `--motion-slow`: 280ms cubic-bezier(0.25, 0.1, 0.25, 1) — combat reveal, capture
- Easing always purposeful and short. No bouncy or long easing.

### Breakpoints (Mobile-First iPhone Focus)
- Base / iPhone portrait: 0–479px (primary)
- iPhone landscape / small tablet: 480–767px
- Tablet+: 768px+
- Large: 1024px+

Design all flows first at 390px width (typical modern iPhone portrait). Board must remain large and crisp.

---

## 3. Board Design

**10×10 grid** rendered as CSS Grid (`grid-template-columns: repeat(10, 1fr)`) inside a square container.

- **Maximum board size** on screen: Constrained only by viewport minus safe areas and minimal chrome (target 70–85% of vertical real estate in portrait).
- On base iPhone portrait (~390px usable width after safe areas): target cell size ~34–38px. Square overall board.
- In landscape: board can grow significantly (cells 48–60px+). Chrome collapses aggressively.
- **Premium small-screen treatment**:
  - Thin (1px) etched borders.
  - Very subtle cell bevel using layered `inset` shadows and borders.
  - Light coordinate labels (A–J / 1–10) outside the grid in `--text-xs`, muted. Toggleable in settings.
  - Outer frame treatment: thin raised border + slight drop to simulate table edge.

**Lake Representation (Impassable)**
- Two distinct 2×2 blocks:
  - Rows 4–5, Columns 3–4 (1-indexed)
  - Rows 4–5, Columns 7–8 (1-indexed)
- Each lake cell is non-interactive, no piece can enter or be placed.
- Visual: Unified water styling across the 2×2 block. Use a single spanning background treatment or four cells with continuous SVG water pattern (soft horizontal/vertical ripple paths + fine contour lines). Darker than board (`--color-lake`).
- No grid lines inside lakes or very faint. Add a thin "bank" border around the whole 2×2 for clarity.
- Visually communicates "terrain obstacle" without looking like empty void.

**How Pieces Sit on Cells**
- Piece container centered within cell.
- Occupies 72–82% of cell width/height for breathing room.
- Slight drop shadow to lift off table.
- When placed during setup: soft "settle" animation + check indicator (temporary).
- No pieces ever overlap or sit on lake cells.

**Overall Board Feel**
Like a high-end physical command map table: precise, quiet, expensive. Matte. No cartoonishness.

---

## 4. Piece Representation

Strong, consistent silhouettes. All pieces share a single base token shape for unity and recognizability at small sizes. Differentiation happens inside via original glyphs + state layers.

### Base Token Shape (Original)
- Rounded rectangle (border-radius `--radius-sm` or slightly more).
- Slightly trapezoidal or with a subtle base bevel for "standing token" physicality (achieved via SVG `<path>` or layered borders + gradient).
- Size: 72–82% of cell.
- All vector. Scalable perfectly. One master SVG symbol per state.

### Rank Glyphs / Symbols (Original — Not Copied)
Inside the token, large, high-contrast, centered glyph. Use simple geometric constructions (paths, polygons, lines). Bold weight. Distinct at 12–18px rendered size.

Defined original glyphs (vector descriptions):

- **Flag (F)**: Vertical pole line + triangular pennant flag on right. Clean and iconic.
- **Bomb (B)**: Octagon or thick-bordered square containing a bold internal "X" or stylized short fuse arc + dot. Heavy.
- **Marshal (10)**: Four-point star formed by two offset diamonds or crossed thick bars with terminal dots.
- **General (9)**: Stacked double chevron (^^) with horizontal base bar.
- **Colonel (8)**: Single large chevron (^) with two short verticals below.
- **Major (7)**: Double chevron.
- **Captain (6)**: Single bold chevron.
- **Lieutenant (5)**: Three short horizontal bars (|||) stacked.
- **Sergeant (4)**: Two short horizontal bars (||).
- **Miner (3)**: Stylized pick: angled triangle blade + short vertical handle.
- **Scout (2)**: Three dots in a horizontal line (• • •) or short forward arrow lines.
- **Spy (1)**: Thin vertical dagger or slanted line with small crossbar near top.

All glyphs are unique in structure (bars vs curves vs points vs dots). Test at tiny sizes.

Rank number (modern 1–10 or F/B) may appear small in corner for quick scan, but glyph is primary.

### Owner Shown (Multiple Channels, Never Color Alone)
- **Primary**: Consistent "owner tab" or base marker built into the SVG:
  - Friendly (your pieces): Solid horizontal command stripe or filled base bar at bottom inside token.
  - Opponent: Open / outlined version of the stripe or a vertical side accent bar. Or inverted geometry (pointed top vs flat).
- **Secondary**: Subtle low-sat tint of accent (teal vs bronze) only as supporting cue.
- **Tertiary**: Board position context (your pieces begin and typically operate from bottom in portrait).
- **Revealed state always shows owner marker clearly.** Hidden state shows *zero* owner differentiation.

This ensures color-blind users can distinguish ownership via shape/geometry of the marker.

### Hidden vs Revealed State
- **Hidden (default until combat)**: Uniform back for *all* pieces regardless of owner. Dark matte field with a single original repeating micro-pattern (small crosses, grid, or abstract command insignia — same for both sides). Central generic "unit" silhouette or simple shield icon. No rank, no owner stripe. Looks identical everywhere.
- **Revealed**: Full token face with rank glyph + owner marker + optional rank number. Once revealed, piece remains face-up for the rest of the game (memory aid) with clear visual.
- **No information leakage**: Hidden backs must be pixel-identical across owners and ranks. Slight rendering differences forbidden.

### Piece on Small Screens
High visual weight. Thick strokes in glyphs. Generous internal padding inside token. When cell is ~34px, piece renders crisply thanks to vector.

---

## 5. Interaction States

Every state uses **at least two independent visual channels** (border + animation + icon/shape + fill + glow). Never color alone.

### States

- **Idle (unselected, friendly or opponent)**: Normal piece appearance. Subtle cell border.
- **Selected (your piece)**: 
  - Scale transform 1.04–1.06 + translateY(-1px).
  - Thick `--color-accent-command` border (2–3px).
  - Inner subtle glow.
  - Cell receives matching highlight ring.
- **Legal Move Target (empty cell)**: 
  - Soft inner circle or four corner dots in `--color-accent-command`.
  - Slightly brighter cell fill.
  - On tap/drag-over: quick scale pulse.
- **Legal Attack Target (opponent piece)**: 
  - Dashed or double border in `--color-accent-bronze`.
  - Subtle bronze corner chevrons or "X" indicator.
  - Opponent piece receives faint threat outline.
- **Invalid Target**: 
  - Brief shake (transform) on attempt + gray desaturate.
  - Or static muted cell with diagonal hatch (SVG).
- **Threatened**: 
  - Very subtle pulsing outer ring (low opacity bronze, 1.5s cycle) or small warning glyph (exclamation constructed from lines) in corner.
  - Optional: only shown on explicit "show threats" toggle.
- **In-Combat**: 
  - Both pieces in modal (see Combat). On board: both pieces scale up + strong dual-colored border flash.
- **Defeated / Captured**: 
  - Fade + scale down to 0.6 + rotate 8–12deg (or subtle tumble).
  - Removal with short dissolve. Leave "ghost" empty cell briefly if helpful.
- **Setup-Placed**: 
  - Soft green check or small "placed" bar at bottom.
  - Slight settle animation.
  - Can be re-selected and moved during setup phase.
- **Hidden (during play)**: See above. No state reveals rank accidentally.
- **Focus (keyboard / accessibility)**: 2px offset ring in `--color-accent-command`, high contrast. Visible at all times when focused.

**Multi-channel enforcement**: Example legal move = shape (dot) + color + animation (pulse) + cell label change.

---

## 6. Touch-First Design

- **Minimum target size**: 44×44 pt everywhere for controls, buttons, and piece interaction.
- Board cells may render smaller (~34px), but the *interactive hit area* for a piece or cell is expanded:
  - Entire cell is tappable.
  - Invisible extended hit radius (additional 6–10px around piece).
  - Drag gesture has forgiving start threshold.
- **No hover-only affordances**. All feedback is tap, press, or drag.
- **Primary gestures**:
  - **Tap**: Select piece → tap destination (or same cell to deselect).
  - **Drag**: Lift and drop piece directly onto legal cell (preferred for speed in setup and play). Provide live preview of legal landing.
  - **Long-press (300–400ms)**: Inspect revealed piece details (modal or popover) without committing action. Does not trigger move.
- **Press feedback**: Immediate scale down (0.96) + shadow lift + (if available) native haptic. Release restores with `--motion-fast`.
- **Accidental prevention**: 8px minimum between non-board controls. Debounce rapid taps.
- **Undo**: Always available for last move (prominent but not intrusive).
- Drag vs tap decision: System detects intent — short drag distance treated as tap if no movement threshold crossed.

---

## 7. iOS Specifics

- **Viewport**: Use `viewport-fit=cover` in meta. Root layout uses `100dvh` (dynamic viewport height) and `100dvw`.
- **Safe areas**: All fixed or absolute chrome respects:
  ```css
  padding-top: max(12px, env(safe-area-inset-top));
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  padding-left: max(0px, env(safe-area-inset-left));
  padding-right: max(0px, env(safe-area-inset-right));
  ```
  Board container and critical controls never overlap home indicator or notch.
- **Dynamic viewport handling**: `dvh` / `svh` / `lvh` for full-height elements. Listen for visual viewport resize on keyboard or Safari chrome changes.
- **Portrait / Landscape adaptations**:
  - **Portrait**: Board square, maximized. Minimal top status bar (turn + scores/captured counts). Bottom bar collapses to thin strip or floating action cluster. Large piece targets prioritized.
  - **Landscape**: Board grows dramatically. Controls migrate to narrow left/right or top floating compact bar (icons + short labels). Status info tucks into thin header. Modal overlays remain centered and usable.
- **Controls collapse**: 
  - In tight portrait: "More" menu or swipe-up sheet for settings/pause.
  - Action buttons use icon + minimal text or icon-only with tooltip on long press.
  - Bottom safe area padding ensures thumb reach.
- **Other**: System font scaling respected. No forced zoom. PWA add-to-home styling if applicable (monochrome mask icon, theme color matching `--color-bg-void`).

---

## 8. Animations and Motion

Purposeful, short, table-like. Physical metaphors (lift, slide, settle, clash).

- **Move**: Piece lifts (translate + shadow), translates along path (straight or slight arc), settles into new cell. Duration `--motion-med`.
- **Capture / Combat result**: Winner piece moves into cell; loser performs quick scale + opacity fade + small rotation. Total `--motion-slow`.
- **Combat reveal (modal)**: Side-by-side tokens flip or expand from back to face (rotateY or scale + content swap). Brief clash indicator (converging lines or flash in center). Result text + color treatment. Total under 600ms sequence.
- **Select / Legal highlights**: Scale + border appear with `--motion-fast`.
- **Setup place**: Gentle drop + bounce dampened to 1px.
- **General**: All transitions use the defined timing tokens. Transform + opacity preferred over layout properties.

**prefers-reduced-motion**:
- Disable all non-essential transitions/animations.
- Instant state changes.
- Provide "instant mode" toggle if desired.
- Combat still communicates result clearly via static reveals + text.

---

## 9. Screens / Flows (Key Views & Layout Priorities)

**1. Launch / Menu**
- Full-bleed tactical table background (subtle map lines + grain).
- Centered original wordmark or simple title treatment ("COMMAND TABLE").
- Large 44px+ primary buttons stacked vertically: New Game, Continue, Settings, How to Play.
- Minimal footer links.
- Priority: Immersive hero, large tappable actions.

**2. Game Setup (Manual vs Auto)**
- Top: Mode selector (Manual placement / Auto-deploy / Random).
- Dominant area: Live 10×10 preview board (smaller than play but usable).
- Bottom or side panel (collapsible): Scrollable list of remaining pieces with count and glyph previews.
- Drag pieces from palette directly onto board cells (or tap-to-place).
- "Ready" / "Auto" buttons at bottom, respecting safe area.
- Privacy screen prompt if local multiplayer.
- Priority: Board large enough to see placement clearly; piece palette secondary but clear.

**3. Privacy Handoff (Local 1-Device 2P)**
- Full screen or large centered card: "Pass device to opponent for setup" or "Cover screen".
- Simple large button "Opponent Ready — Return Device".
- Optional timer or "Hide opponent's pieces" visual blanking.
- During handoff, board may be dimmed or pieces shown only as hidden backs.
- Priority: Clear instruction, one giant action, no accidental reveals.

**4. Main Play (Board Dominant)**
- **Layout priority #1**: Board takes maximum real estate (square, centered or top-weighted).
- Thin top chrome: Current turn indicator (large, clear "YOUR TURN" or "OPPONENT"), captured counts (small icons + numbers), menu (three dots).
- Opponent pieces at top, yours at bottom.
- No side panels in portrait. In landscape, minimal side info tucks.
- Floating or bottom-docked action cluster only when needed (e.g. "End Turn" rarely, since automatic).
- Live captured / revealed log accessible via small persistent button or swipe.
- Priority: Board is 70%+. All else chrome that can disappear.

**5. Combat Modal / Result**
- Centered modal or full overlay (dimmed board behind).
- Two pieces displayed large, side-by-side.
- Clear "VS" or clash graphic in middle.
- Animation sequence: reveal → compare → outcome.
- Large result text ("CAPTURED", "BOMB DEFUSED", "MUTUAL DESTRUCTION") + color treatment.
- "Continue" button (44px+).
- Priority: Drama and clarity of outcome. Large glyphs. Quick to dismiss.

**6. Victory**
- Centered large announcement ("FLAG CAPTURED" or "OPPONENT IMMOBILIZED").
- Subtle celebration: board pieces fade or small original particle-free flourish (line bursts in SVG).
- Stats summary (moves, captures) in clean card.
- Primary actions: "Play Again", "Main Menu", "Review Board".
- Restrained, not flashy. Tactical satisfaction.
- Priority: Clear winner declaration + quick next actions.

**7. Settings / Pause**
- Sheet or modal from top or bottom.
- Sections: Sound (if any), High Contrast, Reduced Motion, Coordinate Labels, Reset Game, etc.
- Large rows, 44px min height.
- "Resume" prominent.
- Priority: Fast access, non-disruptive to board state.

---

## 10. Accessibility Visual Requirements

- **High contrast option**: Global toggle (persisted). Increases all contrast ratios to exceed WCAG 7:1 where feasible. Removes textures, thickens all lines/borders, solidifies fills.
- **Focus indicators**: Always visible 2px+ ring, offset, using accent color. Never removed.
- **Not color alone**: Every state, owner, rank, and outcome uses shape, pattern, position, text, or border style redundantly.
- **Patterns & shapes**: Hidden backs use texture. Owner markers use geometry. Ranks use distinct constructed glyphs.
- **Text contrast**: Minimum 4.5:1 (aim 7:1+). Test with tools.
- **Target sizes**: 44×44 minimum for all controls. Board cells compensated with full-cell hit areas.
- **Reduced motion**: Respected at system + in-app level.
- **Board semantics**: Proper ARIA grid roles, `aria-label` per cell ("Row 3 Column B, hidden piece" / "Revealed Marshal, friendly"). Live regions for turn changes, captures, results.
- **Scalable UI**: Text respects Dynamic Type / user font scaling. Layout reflows gracefully.
- **Testing notes**: Simulate color blindness (protanopia, deuteranopia, tritanopia). Verify no information lost. Keyboard-only traversal of board if applicable.

---

## 11. Original Assets Approach

**100% original. No protected commercial assets at any time.**

- **Pieces & glyphs**: Hand-authored SVG `<symbol>` or component. Single source of truth. Each rank + back + owner variant is a set of `<path>`, `<polygon>`, `<rect>`, `<line>`, and `<text>` elements. No external icon libraries.
- **Board & lakes**: CSS Grid + multiple layered backgrounds. Lake water is custom SVG with 3–5 `<path>` elements for ripples + a `<pattern>` for fine detail.
- **Textures**: Small repeating SVG patterns defined inline or as data URIs (grain, crosshatch, contour). Generated once in design and embedded.
- **Animations**: Pure CSS `@keyframes` + transitions on transform/opacity/filter. Combat may use a tiny sequenced JS-controlled class for reveal timing.
- **No raster** unless a future minimal generated map texture (canvas at runtime with seeded procedural lines) — still original algorithm.
- **Sounds (if added later)**: Not in scope here, but any would be original synthesized or recorded dry signals.
- **Export / implementation**: SVGs inlined or as React/Vue/Svelte components. Tokens in CSS. Design tokens documented here are the source of truth.

Maintain a living "assets" folder or Storybook of isolated SVGs for review.

---

## Visual Principles

- **Board is sovereign.** Every other element exists to support or get out of the way of the 10×10 grid.
- **Physical command table fidelity.** Matte surfaces, precise lines, tokens that feel liftable. Digital but never flat or toy-like.
- **Clarity through redundancy.** Multiple visual channels for every distinction. Information survives color blindness, low light, or motion.
- **Restraint and purpose.** Very few accent colors. Animations short and physical. No decoration for its own sake.
- **Touch-native first.** 44px targets, drag+tap support, generous forgiveness. No desktop hover assumptions.
- **Mobile viewport mastery.** Safe areas, dvh, portrait/landscape collapse. The experience feels native on iPhone.
- **Original and ownable.** Every glyph, texture, and pattern invented here for this game.
- **Timeless premium.** Avoids trends. Feels like a well-crafted physical object translated to glass.

---

## Do Not

- Do not copy any commercial Stratego piece art, board graphics, colors, or UI patterns.
- Do not use hover states or mouse-only affordances as primary interaction.
- Do not rely on color alone for owner, rank, state, or outcome.
- Do not make cells so small that 44px targets are impossible without generous hit areas and gestures.
- Do not use long or bouncy animations; keep purposeful and under 300ms except combat sequence.
- Do not introduce bright neon, saturated primaries, or high-gloss effects.
- Do not leak hidden piece information through visual differences, animation timing, or layout.
- Do not use stock photos, heavy images, or non-original vectors.
- Do not crowd the board with persistent UI chrome in portrait.
- Do not ignore safe areas or dynamic viewport units on iOS.
- Do not create complex particle systems or heavy visual noise.
- Do not treat the design system as final — iterate from prototypes against this spec.

---

**This document is the single source of truth for visual and interaction design.** All future implementation, prototypes, and assets must conform before code is committed. Changes require explicit update to this file.

*End of Visual Direction.*
