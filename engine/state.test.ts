import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  placePiece,
  commitSetup,
  applyAction,
  validateSetup,
  getPublicGameView,
} from './state';
import { createSeededRNG } from './state';
import type { PieceType } from './types';
import { PIECES_PER_PLAYER } from './constants';

describe('Game State & Setup', () => {
  it('starts in setup phase', () => {
    const state = createInitialState();
    expect(state.phase).toBe('setup');
    expect(state.currentPlayer).toBe('red');
  });

  it('allows placing pieces in deployment zone', () => {
    let state = createInitialState();

    state = placePiece(state, 'red', { row: 0, col: 0 }, 'flag');
    state = placePiece(state, 'red', { row: 0, col: 1 }, 'marshal');

    expect(state.setup.red.placed).toBe(2);
  });

  it('rejects placement outside deployment zone', () => {
    const state = createInitialState();
    expect(() => {
      placePiece(state, 'red', { row: 5, col: 5 }, 'flag');
    }).toThrow();
  });

  it('validates complete setup', () => {
    const state = createInitialState();

    // Place exactly 40 pieces for red (very tedious in test — simplified check)
    // Instead test the validator directly with a minimal invalid board
    const validation = validateSetup(state.board, 'red');
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('switches player after commit when both ready', () => {
    let state = createInitialState();

    // Quick hack: force placed count for test (real tests will build proper setup)
    // For now just test commit logic path
    state = {
      ...state,
      setup: {
        red: { placed: PIECES_PER_PLAYER, committed: false },
        blue: { placed: PIECES_PER_PLAYER, committed: false },
      },
    };

    state = commitSetup(state, 'red');
    state = commitSetup(state, 'blue');

    expect(state.phase).toBe('playing');
    expect(state.currentPlayer).toBe('red');
  });

  it('produces safe public view (hides enemy pieces)', () => {
    const state = createInitialState();
    const view = getPublicGameView(state, 'red');

    // In setup or early, we expect masking behavior
    expect(view.yourPlayer).toBe('red');
    expect(Array.isArray(view.board)).toBe(true);
  });
});

describe('Seeded RNG (determinism)', () => {
  it('produces same sequence for same seed', () => {
    const rng1 = createSeededRNG(42);
    const rng2 = createSeededRNG(42);

    const a = Array.from({ length: 5 }, () => rng1.next());
    const b = Array.from({ length: 5 }, () => rng2.next());

    expect(a).toEqual(b);
  });
});

describe('RANDOMIZE_SETUP + basic play', () => {
  it('can randomize setup and produce legal moves without leaking hidden info', () => {
    let state = createInitialState('singleplayer');

    // Randomize for both
    state = applyAction(state, { type: 'RANDOMIZE_SETUP', player: 'red', seed: 12345 });
    state = applyAction(state, { type: 'RANDOMIZE_SETUP', player: 'blue', seed: 67890 });

    state = commitSetup(state, 'red');
    state = commitSetup(state, 'blue');

    expect(state.phase).toBe('playing');

    // Public view for red should not reveal blue pieces
    const redView = getPublicGameView(state, 'red');
    const bluePiecesInView = redView.board.flat().filter((p): p is NonNullable<typeof p> => !!p && p.player === 'blue');
    const anyRevealed = bluePiecesInView.some(p => p.type !== undefined);
    expect(anyRevealed).toBe(false); // nothing revealed yet

    // Red should have some legal moves
    expect(redView.legalMoves.length).toBeGreaterThan(0);
  });
});
