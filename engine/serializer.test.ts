import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  placePiece,
  commitSetup,
  applyAction,
} from './state';
import {
  serializeGameState,
  deserializeGameState,
} from './serializer';
import { PIECES_PER_PLAYER } from './constants';
import type { PieceType } from './types';

describe('Serialization', () => {
  it('roundtrips a game state', () => {
    let state = createInitialState();

    // Place a minimal setup for test (we'll force counts)
    // In real use full placement happens
    state = {
      ...state,
      setup: {
        red: { placed: PIECES_PER_PLAYER, committed: true },
        blue: { placed: PIECES_PER_PLAYER, committed: true },
      },
      phase: 'playing',
    };

    const json = serializeGameState(state);
    const restored = deserializeGameState(json);

    expect(restored.phase).toBe('playing');
    expect(restored.currentPlayer).toBe('red');
    expect(restored.version).toBe(1);
    expect(restored.revealedPieces.size).toBe(0);
  });

  it('rejects unknown versions', () => {
    const bad = JSON.stringify({ version: 99, phase: 'setup' });
    expect(() => deserializeGameState(bad)).toThrow(/Unsupported save version/);
  });
});
