/**
 * Setup utilities including auto-setup for testing and single-player.
 */

import { createEmptyBoard, setPiece, isValidCell } from './board';
import { DEPLOYMENT, PIECE_DEFINITIONS, PIECES_PER_PLAYER } from './configuration';
import type { Board, Piece, PieceType, Player, RNG } from './types';

export function createEmptySetupBoard(): Board {
  return createEmptyBoard();
}

/**
 * Very basic random valid setup (for tests / training mode / easy AI).
 * Not cryptographically strong — just for development and deterministic tests when seeded.
 */
export function generateRandomSetup(player: Player, rng: RNG): Board {
  const board = createEmptyBoard();
  const { startRow, endRow } = DEPLOYMENT[player];

  const piecesToPlace: PieceType[] = [];

  for (const [type, def] of Object.entries(PIECE_DEFINITIONS) as [PieceType, { count: number }][]) {
    for (let i = 0; i < def.count; i++) {
      piecesToPlace.push(type);
    }
  }

  // Shuffle using the provided RNG
  for (let i = piecesToPlace.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [piecesToPlace[i], piecesToPlace[j]] = [piecesToPlace[j], piecesToPlace[i]];
  }

  let idx = 0;
  let placed = 0;
  let currentBoard = board;

  // Fill the deployment area left-to-right, top-to-bottom
  const rows: number[] = [];
  for (let r = startRow; r <= endRow; r++) rows.push(r);

  for (const row of rows) {
    for (let col = 0; col < 10 && placed < PIECES_PER_PLAYER; col++) {
      const pos = { row, col };
      if (!isValidCell(pos)) continue;

      const type = piecesToPlace[idx++];
      const piece: Piece = {
        id: `${player}-${type}-${placed}`,
        player,
        type,
      };
      currentBoard = setPiece(currentBoard, pos, piece);
      placed++;
    }
  }

  return currentBoard;
}
