import { describe, it, expect } from 'vitest';
import { createEmptyBoard, setPiece } from './board';
import { getLegalMoves, isLegalAction } from './movement';
import type { Piece } from './types';

describe('Movement Rules', () => {
  const makePiece = (player: 'red' | 'blue', type: Piece['type']): Piece => ({
    id: `${player}-${type}-1`,
    player,
    type,
  });

  it('Standard piece moves only 1 square orthogonally', () => {
    const board = createEmptyBoard();
    const piece = makePiece('red', 'marshal');
    const from = { row: 2, col: 2 };
    const boardWithPiece = setPiece(board, from, piece);

    const moves = getLegalMoves(boardWithPiece, from, 'red');
    expect(moves.length).toBe(4); // up down left right (within bounds)
  });

  it('Scout can move multiple squares in straight line when clear', () => {
    const board = createEmptyBoard();
    const scout = makePiece('red', 'scout');
    const from = { row: 1, col: 1 };
    const boardWith = setPiece(board, from, scout);

    const moves = getLegalMoves(boardWith, from, 'red');
    // Should have many moves in 4 directions
    expect(moves.length).toBeGreaterThan(10);
  });

  it('Cannot move through lakes or own pieces', () => {
    const board = createEmptyBoard();
    const piece = makePiece('red', 'general');
    const from = { row: 3, col: 3 };
    const b = setPiece(board, from, piece);

    // row 4 col 3 is a lake — should be illegal
    const lakeMove = isLegalAction(b, from, { row: 4, col: 3 }, 'red');
    expect(lakeMove.legal).toBe(false);

    // Valid adjacent empty cell
    const validMove = isLegalAction(b, from, { row: 3, col: 4 }, 'red');
    expect(validMove.legal).toBe(true);
  });
});
