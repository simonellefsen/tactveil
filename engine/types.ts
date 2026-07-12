/**
 * Core TypeScript types for the Stratego game engine.
 * These types are framework-independent and form the contract for the entire game.
 *
 * See docs/game-rules.md and docs/architecture.md.
 */

export type Player = 'red' | 'blue';

// Stable internal identifiers (never change these)
export type PieceType =
  | 'marshal'
  | 'general'
  | 'colonel'
  | 'major'
  | 'captain'
  | 'lieutenant'
  | 'sergeant'
  | 'miner'
  | 'scout'
  | 'spy'
  | 'bomb'
  | 'flag';

export type Position = {
  readonly row: number;
  readonly col: number;
};

export type Piece = {
  readonly id: string;           // Stable unique identifier for this piece instance
  readonly player: Player;
  readonly type: PieceType;
  // isRevealed is tracked at the board/state level for projection
};

export type Cell = Piece | null;

// Immutable 10x10 board representation
export type Board = readonly (readonly Cell[])[];

// Public view for UI and AI — opponent pieces have no type until revealed
export type PublicPiece = {
  readonly id: string;
  readonly player: Player;
  readonly type?: PieceType; // undefined = hidden/unknown to this viewer
};

export type PublicBoard = readonly (readonly (PublicPiece | null)[])[];

// Game phases (state machine)
export type GamePhase =
  | 'setup'
  | 'setupReady'
  | 'playing'
  | 'handoff'       // Pass-and-play privacy screen
  | 'combatReveal'
  | 'gameOver';

// Action types (discriminated union)
export type Action =
  | { type: 'PLACE_PIECE'; player: Player; position: Position; pieceType: PieceType; pieceId?: string }
  | { type: 'REMOVE_PIECE'; player: Player; position: Position }
  | { type: 'RANDOMIZE_SETUP'; player: Player; seed?: number }
  | { type: 'COMMIT_SETUP'; player: Player }
  | { type: 'MOVE'; from: Position; to: Position }
  | { type: 'ATTACK'; from: Position; to: Position }
  | { type: 'RESOLVE_COMBAT'; attackerPos: Position; defenderPos: Position; outcome: CombatOutcome }
  | { type: 'END_TURN' }
  | { type: 'SURRENDER'; player: Player }
  | { type: 'RESET' };

// Combat outcome
export type CombatOutcome =
  | 'attackerWins'
  | 'defenderWins'
  | 'bothDie'
  | 'defenderBombDefused';

// Result of a combat resolution
export interface CombatResult {
  readonly attacker: { position: Position; type: PieceType };
  readonly defender: { position: Position; type: PieceType };
  readonly outcome: CombatOutcome;
  readonly attackerSurvives: boolean;
  readonly defenderSurvives: boolean;
  readonly flagCaptured: boolean;
}

// Full internal game state (engine truth — always knows every piece)
export interface GameState {
  readonly version: number;
  readonly phase: GamePhase;
  readonly currentPlayer: Player;
  readonly board: Board;
  readonly setup: {
    readonly [P in Player]: {
      readonly placed: number;
      readonly committed: boolean;
    };
  };
  readonly winner: Player | null;
  readonly lastCombat?: CombatResult;
  readonly moveHistory: ReadonlyArray<Action>; // For replays (actions only)
  readonly rngSeed: number;
  readonly revealedPieces: ReadonlySet<string>; // piece ids known to opponent
  readonly settings: {
    readonly mode: 'singleplayer' | 'passAndPlay' | 'training';
    readonly difficulty?: 'easy' | 'medium' | 'hard';
  };
}

// Public view for a specific viewer (never leaks hidden info)
export interface PublicGameView {
  readonly phase: GamePhase;
  readonly currentPlayer: Player;
  readonly board: PublicBoard;
  readonly legalMoves: readonly Position[];
  readonly yourPlayer: Player;
  readonly winner: Player | null;
  readonly lastCombat?: {
    readonly attackerType: PieceType;
    readonly defenderType: PieceType;
    readonly outcome: CombatOutcome;
  };
}

// Seeded RNG interface for determinism
export interface RNG {
  next(): number; // [0, 1)
  nextInt(max: number): number;
}

// Setup validation result
export interface SetupValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly pieceCounts: Record<PieceType, number>;
}
