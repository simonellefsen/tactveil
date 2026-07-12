/**
 * Game state management and applyAction.
 * All updates are immutable.
 * This is the single source of truth for game progression.
 */

import {
  createEmptyBoard,
  getPieceAt,
  setPiece,
  getPublicBoard,
  findPiecePosition,
  isValidCell,
} from './board';
import { resolveCombat } from './combat';
import { isLegalAction, getLegalMoves } from './movement';
import { generateRandomSetup } from './setup';
import {
  BOARD_COLS,
  BOARD_ROWS,
  DEPLOYMENT,
  FIRST_PLAYER,
  PIECES_PER_PLAYER,
  PIECE_DEFINITIONS,
} from './constants';
import type {
  Action,
  Board,
  CombatResult,
  GamePhase,
  GameState,
  Piece,
  PieceType,
  Player,
  Position,
  PublicGameView,
  RNG,
  SetupValidation,
} from './types';

const STATE_VERSION = 1;

function createInitialSetupState(): GameState['setup'] {
  return {
    red: { placed: 0, committed: false },
    blue: { placed: 0, committed: false },
  };
}

export function createInitialState(mode: GameState['settings']['mode'] = 'singleplayer'): GameState {
  return {
    version: STATE_VERSION,
    phase: 'setup',
    currentPlayer: FIRST_PLAYER,
    board: createEmptyBoard(),
    setup: createInitialSetupState(),
    winner: null,
    moveHistory: [],
    rngSeed: 0,
    revealedPieces: new Set(),
    settings: { mode },
  };
}

/** Generate a stable piece id */
function generatePieceId(player: Player, type: PieceType, index: number): string {
  return `${player}-${type}-${index}`;
}

/**
 * Place a piece during setup (immutable).
 * Only allowed in setup phase and in the player's deployment zone.
 */
export function placePiece(
  state: GameState,
  player: Player,
  position: Position,
  pieceType: PieceType,
  pieceId?: string
): GameState {
  if (state.phase !== 'setup') {
    throw new Error('Can only place pieces during setup');
  }
  if (state.setup[player].committed) {
    throw new Error('Player has already committed setup');
  }

  const { startRow, endRow } = DEPLOYMENT[player];
  if (position.row < startRow || position.row > endRow || !isValidCell(position)) {
    throw new Error('Invalid placement position');
  }

  const existing = getPieceAt(state.board, position);
  if (existing && existing.player === player) {
    throw new Error('Position already occupied by own piece');
  }

  // Count existing pieces of this type for this player
  let countOfType = 0;
  for (const row of state.board) {
    for (const cell of row) {
      if (cell && cell.player === player && cell.type === pieceType) countOfType++;
    }
  }

  const max = PIECE_DEFINITIONS[pieceType].count;
  if (countOfType >= max) {
    throw new Error(`Cannot place more than ${max} ${pieceType}`);
  }

  const id = pieceId ?? generatePieceId(player, pieceType, countOfType);

  const newPiece: Piece = { id, player, type: pieceType };
  const newBoard = setPiece(state.board, position, newPiece);

  const newPlaced = state.setup[player].placed + 1;

  return {
    ...state,
    board: newBoard,
    setup: {
      ...state.setup,
      [player]: {
        ...state.setup[player],
        placed: newPlaced,
      },
    },
  };
}

export function removePiece(state: GameState, player: Player, position: Position): GameState {
  if (state.phase !== 'setup') throw new Error('Can only remove during setup');
  if (state.setup[player].committed) throw new Error('Setup already committed');

  const piece = getPieceAt(state.board, position);
  if (!piece || piece.player !== player) {
    throw new Error('No piece to remove');
  }

  const newBoard = setPiece(state.board, position, null);

  return {
    ...state,
    board: newBoard,
    setup: {
      ...state.setup,
      [player]: {
        ...state.setup[player],
        placed: Math.max(0, state.setup[player].placed - 1),
      },
    },
  };
}

/**
 * Commit a player's setup. When both have committed, move to playing phase.
 */
export function commitSetup(state: GameState, player: Player): GameState {
  if (state.phase !== 'setup') throw new Error('Not in setup phase');
  if (state.setup[player].placed !== PIECES_PER_PLAYER) {
    throw new Error(`Must place exactly ${PIECES_PER_PLAYER} pieces`);
  }

  const newSetup = {
    ...state.setup,
    [player]: { ...state.setup[player], committed: true },
  };

  const bothCommitted = newSetup.red.committed && newSetup.blue.committed;

  return {
    ...state,
    setup: newSetup,
    phase: bothCommitted ? 'playing' : 'setup',
    currentPlayer: bothCommitted ? FIRST_PLAYER : state.currentPlayer,
  };
}

/**
 * Apply any action to the state (immutable).
 * This is the central reducer.
 */
export function applyAction(
  state: GameState,
  action: Action,
  rng: RNG = createDefaultRNG(state.rngSeed)
): GameState {
  switch (action.type) {
    case 'PLACE_PIECE':
      return placePiece(state, action.player, action.position, action.pieceType, action.pieceId);

    case 'REMOVE_PIECE':
      return removePiece(state, action.player, action.position);

    case 'COMMIT_SETUP':
      return commitSetup(state, action.player);

    case 'RANDOMIZE_SETUP': {
      if (state.phase !== 'setup') throw new Error('Can only randomize during setup');
      if (state.setup[action.player].committed) {
        throw new Error('Cannot randomize after commit');
      }

      const rng = createSeededRNG(action.seed ?? state.rngSeed + 1);
      const randomBoardForPlayer = generateRandomSetup(action.player, rng);

      // Merge the player's pieces into the full board
      let newBoard = state.board;
      // Clear existing pieces of this player
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          const p = newBoard[r][c];
          if (p && p.player === action.player) {
            newBoard = setPiece(newBoard, { row: r, col: c }, null);
          }
        }
      }

      // Place the randomized pieces
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          const p = randomBoardForPlayer[r][c];
          if (p) {
            newBoard = setPiece(newBoard, { row: r, col: c }, p);
          }
        }
      }

      return {
        ...state,
        board: newBoard,
        setup: {
          ...state.setup,
          [action.player]: {
            placed: PIECES_PER_PLAYER,
            committed: state.setup[action.player].committed,
          },
        },
        rngSeed: rng.nextInt(1_000_000_000), // advance seed
      };
    }

    case 'MOVE':
    case 'ATTACK': {
      if (state.phase !== 'playing') throw new Error('Not in playing phase');

      const piece = getPieceAt(state.board, action.from);
      if (!piece || piece.player !== state.currentPlayer) {
        throw new Error('Illegal: not your piece or not your turn');
      }

      const check = isLegalAction(state.board, action.from, action.to, state.currentPlayer);
      if (!check.legal) {
        throw new Error(`Illegal move: ${check.reason}`);
      }

      const target = getPieceAt(state.board, action.to);
      const isAttack = !!target && target.player !== state.currentPlayer;

      if (action.type === 'ATTACK' && !isAttack) {
        throw new Error('ATTACK action used on empty square');
      }

      let newBoard = setPiece(state.board, action.from, null);

      if (isAttack && target) {
        // Perform combat
        const combat = resolveCombat(piece.type, target.type, action.from, action.to);

        const newRevealed = new Set(state.revealedPieces);
        newRevealed.add(piece.id);
        newRevealed.add(target.id);

        let attackerPiece = combat.attackerSurvives ? piece : null;
        let defenderPiece = combat.defenderSurvives ? target : null;

        if (combat.flagCaptured) {
          // Attacker moves onto flag square
          attackerPiece = piece;
          defenderPiece = null;
        }

        newBoard = setPiece(newBoard, action.to, attackerPiece);

        // If defender survived somehow (rare), leave it — but per rules it usually doesn't
        if (defenderPiece && !combat.attackerSurvives) {
          // Already handled
        }

        const nextPlayer = combat.flagCaptured ? state.currentPlayer : (state.currentPlayer === 'red' ? 'blue' : 'red');
        const nextPhase = combat.flagCaptured ? 'gameOver' : 'playing';

        const newState: GameState = {
          ...state,
          board: newBoard,
          lastCombat: combat,
          revealedPieces: newRevealed,
          moveHistory: [...state.moveHistory, action],
          phase: nextPhase,
          winner: combat.flagCaptured ? state.currentPlayer : null,
          currentPlayer: nextPlayer,
        };

        return newState;
      } else {
        // Simple move to empty square
        newBoard = setPiece(newBoard, action.to, piece);

        // Scout long move reveals itself
        const newRevealed = new Set(state.revealedPieces);
        const distance = Math.abs(action.from.row - action.to.row) + Math.abs(action.from.col - action.to.col);
        if (piece.type === 'scout' && distance > 1) {
          newRevealed.add(piece.id);
        }

        const nextPlayer = state.currentPlayer === 'red' ? 'blue' : 'red';

        const newState: GameState = {
          ...state,
          board: newBoard,
          revealedPieces: newRevealed,
          moveHistory: [...state.moveHistory, action],
          currentPlayer: nextPlayer,
        };

        return newState;
      }
    }

    case 'RESOLVE_COMBAT':
      // Usually handled inside MOVE/ATTACK above. Kept for explicit replay support.
      return state;

    case 'END_TURN':
      if (state.phase !== 'playing') throw new Error('Cannot end turn now');
      return {
        ...state,
        currentPlayer: state.currentPlayer === 'red' ? 'blue' : 'red',
      };

    case 'SURRENDER':
      return {
        ...state,
        phase: 'gameOver',
        winner: action.player === 'red' ? 'blue' : 'red',
      };

    case 'RESET':
      return createInitialState(state.settings.mode);

    default:
      // Exhaustive check in TS
      const _exhaustive: never = action;
      throw new Error(`Unknown action type`);
  }
}

/**
 * Check victory conditions.
 * Call after moves/combat.
 */
export function checkVictory(state: GameState): Player | null {
  if (state.phase === 'gameOver' && state.winner) return state.winner;

  // Flag already captured handled in combat
  // Check if current player has any legal moves
  const current = state.currentPlayer;

  let hasLegalMove = false;

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const pos = { row: r, col: c };
      const piece = getPieceAt(state.board, pos);
      if (piece && piece.player === current && isMovablePiece(piece)) {
        const legal = getLegalMoves(state.board, pos, current);
        if (legal.length > 0) {
          hasLegalMove = true;
          break;
        }
      }
    }
    if (hasLegalMove) break;
  }

  if (!hasLegalMove) {
    // Opponent wins because current player cannot move
    return current === 'red' ? 'blue' : 'red';
  }

  return null;
}

function isMovablePiece(piece: Piece | null): piece is Piece {
  return !!piece && PIECE_DEFINITIONS[piece.type].movable;
}

/** Create a simple seeded RNG (mulberry32 style) */
export function createSeededRNG(seed: number): RNG {
  let s = seed >>> 0;
  return {
    next(): number {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    nextInt(max: number): number {
      return Math.floor(this.next() * max);
    },
  };
}

function createDefaultRNG(seed: number): RNG {
  return createSeededRNG(seed || 123456789);
}

/**
 * Produce a public view for a specific player.
 * This is the ONLY way UI or AI should see the board.
 */
export function getPublicGameView(state: GameState, viewer: Player): PublicGameView {
  const legalMoves: Position[] = [];

  if (state.phase === 'playing' && state.currentPlayer === viewer) {
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const pos = { row: r, col: c };
        const piece = getPieceAt(state.board, pos);
        if (piece && piece.player === viewer) {
          const moves = getLegalMoves(state.board, pos, viewer);
          for (const m of moves) {
            legalMoves.push(m.to);
          }
        }
      }
    }
  }

  return {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    board: getPublicBoard(state.board, viewer, state.revealedPieces),
    legalMoves,
    yourPlayer: viewer,
    winner: state.winner,
    lastCombat: state.lastCombat
      ? {
          attackerType: state.lastCombat.attacker.type,
          defenderType: state.lastCombat.defender.type,
          outcome: state.lastCombat.outcome,
        }
      : undefined,
  };
}

/**
 * Validate that a setup is complete and legal.
 */
export function validateSetup(board: Board, player: Player): SetupValidation {
  const errors: string[] = [];
  const counts: Partial<Record<PieceType, number>> = {};

  for (const t of Object.keys(PIECE_DEFINITIONS) as PieceType[]) {
    counts[t] = 0;
  }

  const { startRow, endRow } = DEPLOYMENT[player];

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const piece = board[r][c];
      if (!piece || piece.player !== player) continue;

      if (r < startRow || r > endRow) {
        errors.push(`Piece outside deployment zone at ${r},${c}`);
      }
      if (!isValidCell({ row: r, col: c })) {
        errors.push(`Piece on invalid cell (lake) at ${r},${c}`);
      }
      counts[piece.type] = (counts[piece.type] || 0) + 1;
    }
  }

  let total = 0;
  for (const t of Object.keys(PIECE_DEFINITIONS) as PieceType[]) {
    const expected = PIECE_DEFINITIONS[t].count;
    const actual = counts[t] ?? 0;
    if (actual !== expected) {
      errors.push(`Incorrect count for ${t}: ${actual} (expected ${expected})`);
    }
    total += actual;
  }

  if (total !== PIECES_PER_PLAYER) {
    errors.push(`Total pieces placed: ${total} (expected ${PIECES_PER_PLAYER})`);
  }

  const finalCounts: Record<PieceType, number> = {} as Record<PieceType, number>;
  for (const t of Object.keys(PIECE_DEFINITIONS) as PieceType[]) {
    finalCounts[t] = counts[t] ?? 0;
  }

  return {
    valid: errors.length === 0,
    errors,
    pieceCounts: finalCounts,
  };
}
