/**
 * Svelte store for the Tactveil game session.
 * Wraps the pure framework-independent engine.
 * Single source of truth for game state.
 */

import { writable, derived, type Readable } from 'svelte/store';
import {
	createInitialState,
	applyAction,
	getPublicGameView,
	getLegalMoves,
	createSeededRNG,
	type GameState,
	type PublicGameView,
	type Action,
	type Player,
	type Position
} from '$lib/game';

// The single authoritative game state (Svelte 5 runes friendly, but using store for session)
const gameState = writable<GameState>(createInitialState('singleplayer'));

// Public derived view for the current player
export const gameView: Readable<PublicGameView> = derived(gameState, ($state) => {
	return getPublicGameView($state, $state.currentPlayer);
});

export const game: Readable<GameState> = gameState;

export function dispatch(action: Action) {
	gameState.update((current) => {
		const rng = createSeededRNG(current.rngSeed + Date.now() % 10000);
		return applyAction(current, action, rng);
	});
}

export function randomizeSetup(player: Player, seed?: number) {
	dispatch({ type: 'RANDOMIZE_SETUP', player, seed: seed ?? Math.floor(Math.random() * 1_000_000) });
}

export function commitSetup(player: Player) {
	dispatch({ type: 'COMMIT_SETUP', player });
}

export function resetGame() {
	gameState.set(createInitialState('singleplayer'));
}

// Simple random legal move for demo (computes using pure engine functions)
export function makeRandomLegalMove() {
	gameState.update((current) => {
		if (current.phase !== 'playing') return current;

		const player = current.currentPlayer;
		const candidates: Array<{ from: Position; to: Position; isAttack: boolean }> = [];

		for (let r = 0; r < 10; r++) {
			for (let c = 0; c < 10; c++) {
				const from: Position = { row: r, col: c };
				const piece = current.board[r][c];
				if (piece && piece.player === player) {
					const legal = getLegalMoves(current.board, from, player);
					for (const m of legal) {
						const target = current.board[m.to.row][m.to.col];
						candidates.push({
							from,
							to: m.to,
							isAttack: !!target && target.player !== player
						});
					}
				}
			}
		}

		if (candidates.length === 0) return current;

		const choice = candidates[Math.floor(Math.random() * candidates.length)];
		const action = choice.isAttack
			? ({ type: 'ATTACK', from: choice.from, to: choice.to } as Action)
			: ({ type: 'MOVE', from: choice.from, to: choice.to } as Action);

		const rng = createSeededRNG(current.rngSeed + 1);
		return applyAction(current, action, rng);
	});
}

