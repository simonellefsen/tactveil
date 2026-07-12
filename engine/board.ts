/**
 * Board utilities, position helpers, lake checks, and validation.
 * Pure functions only.
 */

import { BOARD_COLS, BOARD_ROWS, LAKE_POSITIONS } from './constants';
import type { Board, Cell, Piece, PieceType, Player, Position, PublicBoard, PublicPiece } from './types';

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => null)
  );
}

export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_ROWS && pos.col >= 0 && pos.col < BOARD_COLS;
}

export function isLake(pos: Position): boolean {
  return LAKE_POSITIONS.some(([r, c]) => r === pos.row && c === pos.col);
}

export function isValidCell(pos: Position): boolean {
  return isValidPosition(pos) && !isLake(pos);
}

export function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

/** Get piece at position (or null) */
export function getPieceAt(board: Board, pos: Position): Cell {
  if (!isValidPosition(pos)) return null;
  return board[pos.row][pos.col];
}

/** Returns a new board with the piece placed (immutable) */
export function setPiece(board: Board, pos: Position, piece: Piece | null): Board {
  if (!isValidPosition(pos)) {
    throw new Error(`Invalid position: ${pos.row},${pos.col}`);
  }
  return board.map((row, r) =>
    r === pos.row
      ? row.map((cell, c) => (c === pos.col ? piece : cell))
      : row
  );
}

/** Clone board (shallow is fine since pieces are immutable) */
export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

/** Check if a square is empty and valid (not lake) */
export function isEmptyAndValid(board: Board, pos: Position): boolean {
  return isValidCell(pos) && getPieceAt(board, pos) === null;
}

/** Get all orthogonal neighbors (for standard 1-square moves) */
export function getOrthogonalNeighbors(pos: Position): Position[] {
  const deltas = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];
  return deltas
    .map((d) => ({ row: pos.row + d.row, col: pos.col + d.col }))
    .filter(isValidPosition);
}

/**
 * Get all positions along a straight orthogonal line from 'from' to 'to'.
 * Does NOT include the starting position.
 * Returns empty array if not a straight orthogonal line.
 */
export function getLinePositions(from: Position, to: Position): Position[] {
  const sameRow = from.row === to.row;
  const sameCol = from.col === to.col;

  if (!sameRow && !sameCol) return [];
  if (sameRow && sameCol) return [];

  const positions: Position[] = [];

  if (sameRow) {
    const step = to.col > from.col ? 1 : -1;
    for (let c = from.col + step; ; c += step) {
      const p = { row: from.row, col: c };
      positions.push(p);
      if (c === to.col) break;
    }
  } else {
    const step = to.row > from.row ? 1 : -1;
    for (let r = from.row + step; ; r += step) {
      const p = { row: r, col: from.col };
      positions.push(p);
      if (r === to.row) break;
    }
  }

  return positions;
}

/** Check if the path between from and to is completely clear (for scouts) */
export function isPathClear(board: Board, from: Position, to: Position): boolean {
  const line = getLinePositions(from, to);
  return line.every((p) => isEmptyAndValid(board, p) || positionsEqual(p, to)); // destination checked separately
}

/**
 * Project full board to a public view for a specific viewer.
 * Own pieces always show type. Opponent pieces only show type if revealed.
 */
export function getPublicBoard(
  board: Board,
  viewer: Player,
  revealedPieceIds: ReadonlySet<string>
): PublicBoard {
  return board.map((row) =>
    row.map((cell): PublicPiece | null => {
      if (!cell) return null;
      const isOwn = cell.player === viewer;
      const isKnown = revealedPieceIds.has(cell.id);
      return {
        id: cell.id,
        player: cell.player,
        type: isOwn || isKnown ? cell.type : undefined,
      };
    })
  );
}

/** Find position of a piece by id */
export function findPiecePosition(board: Board, pieceId: string): Position | null {
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (p && p.id === pieceId) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/** Count pieces of a given type for a player */
export function countPieces(board: Board, player: Player, type?: PieceType): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.player === player && (!type || cell.type === type)) {
        count++;
      }
    }
  }
  return count;
}
