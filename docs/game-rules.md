# Modern Stratego: Game Rules

**Version:** 1.0  
**Status:** Authoritative specification for the implementation  
**Board Size:** 10×10  
**Pieces per Player:** 40  
**Players:** 2 (Red moves first, Blue second)  
**Objective:** Capture the opponent's Flag or render the opponent unable to move any pieces.

All rules are centralized in this document. Any implementation (including a pure TypeScript rules engine) must derive its behavior exactly from the definitions, tables, and resolution procedures herein. No external "traditional" assumptions may override this spec.

This ruleset is the canonical supported ruleset. The structure is designed to support future configurable variants (e.g., via a central `RulesConfig` object containing piece counts, movement parameters, special combat mappings, lake positions, and repetition rules).

## 1. Board and Coordinates

- The board is a grid of 10 rows × 10 columns.
- Use 0-based indexing for all engine logic: rows `0` to `9`, columns `0` to `9`.
- **Player orientation (default):**
  - Red (first player): deploys in rows `0`–`3`.
  - Blue (second player): deploys in rows `6`–`9`.
- The two central rows (`4` and `5`) are initially empty except for the lakes.
- **Lakes (impassable 2×2 areas):** No piece may ever occupy or pass through a lake square. Lakes block all movement and attacks.

  Lake squares (0-based):
  - Row 4, Cols 2–3
  - Row 5, Cols 2–3
  - Row 4, Cols 6–7
  - Row 5, Cols 6–7

- A square is valid if `0 ≤ row ≤ 9`, `0 ≤ col ≤ 9`, and it is **not** a lake square.
- Orthogonal directions only: deltas `[[-1,0], [1,0], [0,-1], [0,1]]`. **No diagonal movement or attacks at any time.**

## 2. Piece Types, Internal Identifiers, and Properties

Each piece has a stable **internal identifier** (string, used in code/config). Display names are for documentation only.

### Piece Properties (per type)
- **rank**: Numeric combat value (higher wins). `null` for special immovable pieces.
- **moveDistance**: `1` (standard) or `Infinity` (Scout only; any positive integer).
- **directions**: Always orthogonal only.
- **movable**: `true` or `false`.
- **specialCombat**: Optional rules that override or supplement rank comparison.

### Full Piece Definitions

| Internal ID   | Display Name | Count | Rank | Movable | Move Distance | Special Rules |
|---------------|--------------|-------|------|---------|---------------|---------------|
| `marshal`     | Marshal      | 1     | 10   | true    | 1             | None |
| `general`     | General      | 1     | 9    | true    | 1             | None |
| `colonel`     | Colonel      | 2     | 8    | true    | 1             | None |
| `major`       | Major        | 3     | 7    | true    | 1             | None |
| `captain`     | Captain      | 4     | 6    | true    | 1             | None |
| `lieutenant`  | Lieutenant   | 4     | 5    | true    | 1             | None |
| `sergeant`    | Sergeant     | 4     | 4    | true    | 1             | None |
| `miner`       | Miner        | 5     | 3    | true    | 1             | Defeats Bombs (see Combat) |
| `scout`       | Scout        | 8     | 2    | true    | any (>0)      | Moves any distance in straight orthogonal line (path must be clear). Long moves reveal identity. |
| `spy`         | Spy          | 1     | 1    | true    | 1             | Only defeats Marshal when *attacking* it. Loses to all other pieces (attacking or defending) except Flag. |
| `bomb`        | Bomb         | 6     | null | false   | —             | Immovable. Defeats all attackers except Miners. |
| `flag`        | Flag         | 1     | null | false   | —             | Immovable objective. Capturing it wins the game. |

**Total per player:** 40 pieces (33 movable + 7 immovable).

**Notes on identifiers:**
- All internal IDs are lowercase, stable strings suitable for use as enum keys, map keys, or config identifiers in TypeScript.
- Rank values are used for generic comparison **only after** all special cases are checked (see Combat Resolution below).
- `bomb` and `flag` have no numeric rank and participate in combat only as defenders.

## 3. Setup Rules

1. Each player must place **exactly** their full set of 40 pieces.
2. All pieces are placed on the player's four deployment rows:
   - Red: every square in rows `0`–`3` (exactly 40 squares).
   - Blue: every square in rows `6`–`9`.
3. Exactly one piece per square. No stacking.
4. No piece may be placed on a lake square (impossible in deployment zones).
5. Pieces are placed hidden (face-down / unknown to opponent).
6. Placement is final before the first move. No mid-game "reserves" in the canonical ruleset.
7. All pieces of a player are owned by that player for the entire game (no capture of own pieces).

**Configurability note:** Deployment row count (`4`), total pieces per side, and exact lake coordinates are parameters in the central rules configuration for future variants.

## 4. Movement Rules

On a player's turn, they **must** select exactly one of their movable pieces and perform one legal action with it:

- **Relocate** to a valid empty square, **or**
- **Attack** an opponent's piece (by moving onto its square).

### General Movement Constraints (apply to all pieces)
- Movement is strictly orthogonal (N/S/E/W). No diagonals.
- A piece may never land on or pass through a lake.
- A piece may never land on or pass through a square occupied by a friendly piece.
- A piece may not jump over any piece (friendly or enemy).
- Immovable pieces (`bomb`, `flag`) have no movement capability and cannot be selected for a move.
- The path for any multi-square move must consist entirely of valid empty squares.

### Standard Piece Movement (all except `scout`)
- Exactly distance 1 in any orthogonal direction.
- Target must be:
  - Empty and valid, **or**
  - Occupied by an enemy piece (this constitutes an attack; see Combat).

### Scout (`scout`) Movement
- May move any positive integer distance `d ≥ 1` in a single straight orthogonal line (same row or same column).
- For a proposed destination:
  - Compute the line segment.
  - Every square strictly between origin and destination must be empty and non-lake.
  - Destination must be empty (relocate) or occupied by an enemy (attack).
- The Scout **may move and attack in the same turn** (modern rule).
- Moving a Scout more than 1 square (even without attacking) **reveals** its identity to the opponent.

### Repetition Prevention Rules (Mandatory)
These rules exist to keep games finite and prevent stalling in a digital rules engine:

1. **Two-Square Rule**: No piece may move back and forth across the same pair of adjacent squares more than three consecutive turns by the same player. (For Scouts: crossing the same square-boundary more than three consecutive times along the same line is forbidden.)
2. **Chase Rule**: It is illegal to repeatedly threaten (move adjacent to) an enemy piece that then moves away, in a cycle that repeats board positions or has no prospect of capture. If a move would recreate a prior board state in a chasing context, it is disallowed.

If a player has no legal move that complies with these rules and all other constraints, they lose (see Victory).

**Configurability note:** Repetition limits and chase detection parameters can be tuned in a central config for variants (e.g., disable for casual play).

## 5. Combat Resolution

Combat occurs when a movable piece's move action targets an enemy-occupied square (within the mover's movement rules).

Combat is **resolved immediately and deterministically**. Both pieces' types are revealed upon engagement.

### Combat Resolution Algorithm (exact order — must be implemented verbatim)

Let `A` = attacking piece (type + owner), `D` = defending piece (type + owner).

1. **If `D.type === "flag"`**:
   - `A` captures the Flag.
   - Attacker moves into the square.
   - Game ends: attacker wins.

2. **Else if `D.type === "bomb"`**:
   - If `A.type === "miner"`:
     - Bomb is captured and removed.
     - Miner occupies the square.
   - Else:
     - Attacker is captured and removed.
     - Bomb remains in place.

3. **Else if `A.type === "spy"` and `D.type === "marshal"`**:
   - Spy captures the Marshal.
   - Spy occupies the square.

4. **Else (standard rank comparison)**:
   - If either piece has `rank === null`, this case should not be reached for `bomb`/`flag` (handled above). Spy and others use their numeric ranks.
   - Let `rA = A.rank`, `rD = D.rank`.
   - If `rA > rD`: Defender captured and removed. Attacker occupies the square.
   - If `rA < rD`: Attacker captured and removed. Defender remains.
   - If `rA === rD`: Both captured and removed. Square becomes empty.

**Additional Spy rules (enforced by above ordering):**
- A Spy attacking any piece other than Marshal loses (falls to step 4: rank 1 is lowest).
- Any piece (including Marshal) attacking a Spy wins (step 4: attacker's rank ≥ 2 > 1).
- Only the explicit Spy-attacking-Marshal case (step 3) allows the Spy to win.

**Bomb vs. non-Miner:** Handled in step 2. Bombs never move or initiate attacks.

**Equal ranks:** Always mutual destruction (except special cases above, which do not produce ties).

After resolution:
- Removed pieces are permanently out of the game.
- The surviving piece (if any) occupies the target square.
- The attack counts as the player's full turn.

## 6. Turn Structure

1. Red takes the first turn.
2. On each turn a player **must** perform exactly one legal move or attack with one of their movable pieces.
3. Passing is forbidden.
4. After the action (and any combat) completes, it is the opponent's turn.
5. The game state advances only on successful legal actions.

## 7. Victory Conditions

A player wins immediately upon:

- Capturing the opponent's Flag (via any attacking piece landing on its square).
- The opponent, on the start of their turn, having **zero legal moves** available.

"Zero legal moves" includes:
- No movable pieces remaining.
- All remaining movable pieces have no valid empty destination squares and no valid attack targets (due to blocking by own pieces, lakes, or repetition rules).
- All remaining pieces are immovable (`bomb`/`flag`).

## 8. Stalemate and Draw Conditions

A draw occurs in these explicit cases:

- After a combat action, the next player to move has no legal moves **and** the previous player also would have had none if it were their turn again (e.g., mutual destruction of the last movable pieces leaves only protected Flags/Bombs with no Miners available).
- Both players simultaneously have no legal moves at a decision point.
- A position is reached where the only remaining pieces are Flags protected by Bombs and neither side possesses a Miner (or the Miners have been eliminated).

Repetition-prevention rules make pure repetition draws impossible under legal play. If an engine detects a forced draw by the above criteria, declare draw.

No other draws (e.g., no 50-move rule) exist in the canonical ruleset.

## 9. Hidden Information Model

This is a game of imperfect information.

- **Own pieces:** A player always knows the exact type (`internal ID`), position, and status (revealed or not) of every one of their own pieces.
- **Opponent pieces:** Initially completely hidden. The player knows only:
  - The piece exists at a given position.
  - The owning player (color/side).
  - No rank or type information.
- **Revelation rules (permanent once known):**
  - Any combat (attack or defense) reveals **both** participants' types to **both** players.
  - A Scout moving more than one square reveals its type (even on a non-combat relocation).
  - Revealed information persists for the remainder of the game. Subsequent movement of a revealed piece does not re-hide it.
- Bombs and Flags are identifiable as such only upon interaction (or by deduction). Before interaction they are unknown like other pieces.
- An engine must track per-piece "known to opponent" state (or global revealed set) to support perfect information reconstruction for replays/AI.

No other information (e.g., setup order) is revealed.

## 10. Piece Count Table (Canonical)

| Internal ID   | Count (Red) | Count (Blue) | Total |
|---------------|-------------|--------------|-------|
| `marshal`     | 1           | 1            | 2     |
| `general`     | 1           | 1            | 2     |
| `colonel`     | 2           | 2            | 4     |
| `major`       | 3           | 3            | 6     |
| `captain`     | 4           | 4            | 8     |
| `lieutenant`  | 4           | 4            | 8     |
| `sergeant`    | 4           | 4            | 8     |
| `miner`       | 5           | 5            | 10    |
| `scout`       | 8           | 8            | 16    |
| `spy`         | 1           | 1            | 2     |
| `bomb`        | 6           | 6            | 12    |
| `flag`        | 1           | 1            | 2     |
| **Total**     | **40**      | **40**       | **80**|

## 11. Configurability and Extensibility

The canonical ruleset is defined by the tables and procedures above. A future central configuration should expose at minimum:

- `pieceCounts: Record<InternalID, number>`
- `ranks: Record<InternalID, number | null>`
- `moveDistances: Record<InternalID, 1 | "any">`
- `specials: { minerDefeatsBomb: true, spyDefeatsMarshalOnAttack: true, ... }`
- `lakes: Array<[number, number]>`
- `deploymentRows: { red: [0,3], blue: [6,9] }`
- `repetitionLimits: { twoSquare: 3, ... }`
- `scoutCanAttackSameTurn: true`

All engine code must read from such a config rather than hard-coding the above values, enabling variants while keeping this document as the single source of truth for the default.

## 12. Intentional Deviations from Traditional/Classical Stratego

- **Numbering convention**: Marshal = 10 (highest), Spy = 1 (lowest). This matches the predominant modern/European convention used in current official play and most digital implementations. (Older US editions reversed the numbers.)
- **Scout move + attack**: Explicitly permitted in the same turn. This is the rule used in all modern sanctioned and commercial play (older original rules sometimes forbade it).
- **Explicit repetition and chase rules**: Included at the level of core legality (two-square and chase) to guarantee termination and fair digital enforcement. Traditional physical play sometimes treated these as etiquette or tournament addenda.
- **Precise revelation for long Scout moves**: Documented explicitly so engines can implement knowledge correctly.
- **Internal symbolic identifiers**: Chosen for code clarity and configurability instead of display names or ambiguous numbers.
- **Fully enumerated combat algorithm**: Written in strict priority order with no ambiguity for direct implementation.
- **Draw conditions**: Made explicit rather than left to interpretation.
- No other changes: movement is fully orthogonal (no forward-only restriction), lakes are 2×2, piece counts are classic 40/40, etc.

This ruleset is otherwise faithful to the classic 10×10, 40-piece Stratego.

## 13. Summary of Key Interactions (for quick reference)

- Any piece moving onto `flag` → captures and wins.
- Non-`miner` onto `bomb` → attacker dies, bomb survives.
- `miner` onto `bomb` → bomb dies, miner survives.
- `spy` attacks `marshal` → spy wins.
- `marshal` attacks `spy` (or anything attacks spy) → spy dies.
- Higher rank attacks lower → defender dies.
- Equal ranks → both die.
- `scout` long path must be 100% clear.

---

*This document is the complete, standalone definition of the supported ruleset. It contains everything required to implement a correct, unambiguous rules engine in TypeScript or any other language.*
