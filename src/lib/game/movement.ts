/**
 * Movement and legal action rules.
 * Pure functions. Enforces all rules from game-rules.md.
 */

import {
  getOrthogonalNeighbors,
  getLinePositions,
  isEmptyAndValid,
  isPathClear,
  isValidCell,
  positionsEqual,
  getPieceAt,
} from './board';
import { PIECE_DEFINITIONS } from './configuration';
import type { Board, Piece, Player, Position } from './types';

export type MoveType = 'move' | 'attack';

export interface LegalMove {
  to: Position;
  type: MoveType;
}

/**
 * Get the piece type definition.
 */
function getPieceDef(type: Piece['type']) {
  return PIECE_DEFINITIONS[type];
}

/**
 * Returns whether a piece can move at all.
 */
export function isMovablePiece(piece: Piece | null): piece is Piece {
  if (!piece) return false;
  return getPieceDef(piece.type).movable;
}

/**
 * Core legal moves generator for a piece at a given position.
 * Does NOT consider repetition rules here (those are enforced at state level).
 */
export function getLegalMoves(board: Board, from: Position, player: Player): LegalMove[] {
  const piece = getPieceAt(board, from);
  if (!piece || piece.player !== player || !isMovablePiece(piece)) {
    return [];
  }

  const def = getPieceDef(piece.type);
  const moves: LegalMove[] = [];

  if (def.moveDistance === 1) {
    // Standard 1-square orthogonal
    for (const to of getOrthogonalNeighbors(from)) {
      if (!isValidCell(to)) continue;

      const target = getPieceAt(board, to);

      if (!target) {
        // Empty square
        moves.push({ to, type: 'move' });
      } else if (target.player !== player) {
        // Enemy piece — attack
        moves.push({ to, type: 'attack' });
      }
    }
  } else if (def.moveDistance === 'any') {
    // Scout — any distance in straight line, path must be clear
    // Check all four directions to the edge
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const dir of directions) {
      let r = from.row + dir.dr;
      let c = from.col + dir.dc;

      while (r >= 0 && r < 10 && c >= 0 && c < 10) {
        const to: Position = { row: r, col: c };

        if (!isValidCell(to)) break;

        const target = getPieceAt(board, to);

        if (target) {
          if (target.player !== player) {
            // Can attack the first enemy in line
            moves.push({ to, type: 'attack' });
          }
          break; // Blocked after this
        } else {
          // Empty — valid move
          moves.push({ to, type: 'move' });
        }

        r += dir.dr;
        c += dir.dc;
      }
    }
  }

  return moves;
}

/**
 * Check if a specific move/attack is legal (basic check, no repetition).
 */
export function isLegalAction(
  board: Board,
  from: Position,
  to: Position,
  player: Player
): { legal: boolean; isAttack: boolean; reason?: string } {
  const piece = getPieceAt(board, from);
  if (!piece || piece.player !== player) {
    return { legal: false, isAttack: false, reason: 'No piece or wrong owner' };
  }
  if (!isMovablePiece(piece)) {
    return { legal: false, isAttack: false, reason: 'Piece cannot move' };
  }
  if (!isValidCell(to)) {
    return { legal: false, isAttack: false, reason: 'Invalid destination (lake or out of bounds)' };
  }

  const target = getPieceAt(board, to);
  const isAttack = !!target && target.player !== player;

  if (target && target.player === player) {
    return { legal: false, isAttack: false, reason: 'Cannot move onto own piece' };
  }

  const def = getPieceDef(piece.type);

  if (def.moveDistance === 1) {
    const neighbors = getOrthogonalNeighbors(from);
    const isAdjacent = neighbors.some((n) => positionsEqual(n, to));
    if (!isAdjacent) {
      return { legal: false, isAttack, reason: 'Not adjacent' };
    }
    return { legal: true, isAttack };
  }

  if (def.moveDistance === 'any') {
    // Scout
    const line = getLinePositions(from, to);
    if (line.length === 0) {
      return { legal: false, isAttack, reason: 'Not in straight line' };
    }
    if (!isPathClear(board, from, to)) {
      return { legal: false, isAttack, reason: 'Path is blocked' };
    }
    // Destination can be empty or enemy
    return { legal: true, isAttack };
  }

  return { legal: false, isAttack: false, reason: 'Unknown movement type' };
}
