/**
 * Centralized constants for the canonical Stratego rules.
 * All engine code should reference these instead of magic numbers.
 *
 * See docs/game-rules.md for the authoritative specification.
 */

import type { PieceType, Player } from './types';

// Board dimensions
export const BOARD_ROWS = 10;
export const BOARD_COLS = 10;

// Lake positions (0-based). Two 2x2 impassable areas.
export const LAKE_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  // Left lake
  [4, 2], [4, 3],
  [5, 2], [5, 3],
  // Right lake
  [4, 6], [4, 7],
  [5, 6], [5, 7],
] as const;

// Player deployment zones (inclusive)
export const DEPLOYMENT: Record<Player, { startRow: number; endRow: number }> = {
  red: { startRow: 0, endRow: 3 },
  blue: { startRow: 6, endRow: 9 },
};

// Canonical piece counts and properties (from game-rules.md)
export const PIECE_DEFINITIONS: Record<
  PieceType,
  {
    count: number;
    rank: number | null; // null for bomb/flag
    movable: boolean;
    moveDistance: 1 | 'any';
    special?: string;
  }
> = {
  marshal:   { count: 1, rank: 10, movable: true,  moveDistance: 1 },
  general:   { count: 1, rank: 9,  movable: true,  moveDistance: 1 },
  colonel:   { count: 2, rank: 8,  movable: true,  moveDistance: 1 },
  major:     { count: 3, rank: 7,  movable: true,  moveDistance: 1 },
  captain:   { count: 4, rank: 6,  movable: true,  moveDistance: 1 },
  lieutenant:{ count: 4, rank: 5,  movable: true,  moveDistance: 1 },
  sergeant:  { count: 4, rank: 4,  movable: true,  moveDistance: 1 },
  miner:     { count: 5, rank: 3,  movable: true,  moveDistance: 1, special: 'defeats_bomb' },
  scout:     { count: 8, rank: 2,  movable: true,  moveDistance: 'any', special: 'long_move_reveals' },
  spy:       { count: 1, rank: 1,  movable: true,  moveDistance: 1, special: 'beats_marshal_on_attack' },
  bomb:      { count: 6, rank: null, movable: false, moveDistance: 1 },
  flag:      { count: 1, rank: null, movable: false, moveDistance: 1 },
};

// Total pieces per player
export const PIECES_PER_PLAYER = 40;

// Helper to get all piece types
export const ALL_PIECE_TYPES = Object.keys(PIECE_DEFINITIONS) as PieceType[];

// Red moves first
export const FIRST_PLAYER: Player = 'red';
