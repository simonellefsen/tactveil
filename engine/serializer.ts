/**
 * Serialization for game state and replays.
 * Versioned for future migrations.
 * Supports local saves (privacy-safe: full state only used internally).
 *
 * See docs/architecture.md and docs/privacy-model.md.
 */

import type { Action, Board, GameState, Piece, Player, Position } from './types';
import { createEmptyBoard, setPiece } from './board';
import { createInitialState } from './state';

const CURRENT_VERSION = 1;

export interface SerializedGameState {
  version: number;
  phase: GameState['phase'];
  currentPlayer: Player;
  board: Array<Array<{ id: string; player: Player; type: string } | null>>;
  setup: GameState['setup'];
  winner: Player | null;
  lastCombat?: GameState['lastCombat'];
  moveHistory: Action[];
  rngSeed: number;
  revealedPieces: string[]; // array for JSON
  settings: GameState['settings'];
}

/**
 * Serialize full internal state to JSON string.
 * Note: Full state (with hidden info) is only for local persistence/resumption.
 * UI always uses projection.
 */
export function serializeGameState(state: GameState): string {
  const serializableBoard = state.board.map((row) =>
    row.map((cell) =>
      cell
        ? { id: cell.id, player: cell.player, type: cell.type }
        : null
    )
  );

  const serialized: SerializedGameState = {
    version: CURRENT_VERSION,
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    board: serializableBoard,
    setup: state.setup,
    winner: state.winner,
    lastCombat: state.lastCombat,
    moveHistory: [...state.moveHistory],
    rngSeed: state.rngSeed,
    revealedPieces: Array.from(state.revealedPieces),
    settings: state.settings,
  };

  return JSON.stringify(serialized);
}

/**
 * Deserialize and reconstruct a GameState.
 * Performs basic validation.
 */
export function deserializeGameState(json: string): GameState {
  let data: SerializedGameState;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error('Invalid save data: not valid JSON');
  }

  if (data.version !== CURRENT_VERSION) {
    // Future: run migrations here
    throw new Error(`Unsupported save version: ${data.version} (current ${CURRENT_VERSION})`);
  }

  // Rebuild board
  let board = createEmptyBoard();
  for (let r = 0; r < data.board.length; r++) {
    for (let c = 0; c < data.board[r].length; c++) {
      const cell = data.board[r][c];
      if (cell) {
        const piece: Piece = {
          id: cell.id,
          player: cell.player,
          type: cell.type as any, // validated elsewhere
        };
        board = setPiece(board, { row: r, col: c }, piece);
      }
    }
  }

  const revealed = new Set<string>(data.revealedPieces);

  const state: GameState = {
    version: data.version,
    phase: data.phase,
    currentPlayer: data.currentPlayer,
    board,
    setup: data.setup,
    winner: data.winner,
    lastCombat: data.lastCombat,
    moveHistory: data.moveHistory,
    rngSeed: data.rngSeed,
    revealedPieces: revealed,
    settings: data.settings,
  };

  return state;
}

/**
 * Export a compact replay (seed + action list) for deterministic replay.
 */
export function exportReplay(state: GameState): { seed: number; actions: Action[] } {
  return {
    seed: state.rngSeed,
    actions: [...state.moveHistory],
  };
}
