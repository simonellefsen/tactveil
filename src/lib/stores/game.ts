/**
 * Svelte store for the Tactveil game session.
 * Wraps the pure framework-independent engine.
 * Single source of truth for game state.
 */

import { writable, derived, get, type Readable } from 'svelte/store';
import {
	createInitialState,
	applyAction,
	getPublicGameView,
	getLegalMoves,
	createSeededRNG,
	serializeGameState,
	deserializeGameState,
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

// AI move with difficulty levels
export function makeAIMove(difficulty: 'easy' | 'medium' | 'hard' = 'easy') {
	const current = get(gameState);
	if (current.phase !== 'playing') return;

	const player = current.currentPlayer;
	const candidates: Array<{ from: Position; to: Position; isAttack: boolean; score: number }> = [];

	for (let r = 0; r < 10; r++) {
		for (let c = 0; c < 10; c++) {
			const from: Position = { row: r, col: c };
			const piece = current.board[r][c];
			if (piece && piece.player === player) {
				const legal = getLegalMoves(current.board, from, player);
				for (const m of legal) {
					const target = current.board[m.to.row][m.to.col];
					const isAttack = !!target && target.player !== player;

					let score = 0;
					if (difficulty !== 'easy') {
						// Basic scoring
						if (isAttack && target) {
							const attackerRank = getPieceRank(piece.type);
							const defenderRank = getPieceRank(target.type);
							if (attackerRank > defenderRank || (piece.type === 'miner' && target.type === 'bomb') || (piece.type === 'spy' && target.type === 'marshal')) {
								score += 10 + (defenderRank || 0); // prefer high value targets
							} else {
								score -= 5; // risky
							}
						}
						// Prefer forward movement roughly
						score += (player === 'red' ? m.to.row - from.row : from.row - m.to.row) * 0.5;
					}

					candidates.push({ from, to: m.to, isAttack, score });
				}
			}
		}
	}

	if (candidates.length === 0) return;

	let choice;
	if (difficulty === 'easy' || candidates.length === 1) {
		choice = candidates[Math.floor(Math.random() * candidates.length)];
	} else {
		// Pick best score, with some randomness for medium
		candidates.sort((a, b) => b.score - a.score);
		const top = difficulty === 'hard' ? 1 : 3;
		choice = candidates[Math.floor(Math.random() * Math.min(top, candidates.length))];
	}

	const action = choice.isAttack
		? ({ type: 'ATTACK', from: choice.from, to: choice.to } as Action)
		: ({ type: 'MOVE', from: choice.from, to: choice.to } as Action);

	const rng = createSeededRNG(current.rngSeed + 1);
	gameState.update(() => applyAction(current, action, rng));
}

function getPieceRank(type: any): number {
	const ranks: any = { marshal:10, general:9, colonel:8, major:7, captain:6, lieutenant:5, sergeant:4, miner:3, scout:2, spy:1, bomb:0, flag:0 };
	return ranks[type] || 0;
}

// For pass-and-play: after move, game is ready for handoff
// The UI will show handoff overlay before next player acts.

const STORAGE_KEY = 'tactveil:game';

export function saveGame() {
	const current = get(gameState);
	try {
		localStorage.setItem(STORAGE_KEY, serializeGameState(current));
	} catch {}
}

export function loadGame() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const loaded = deserializeGameState(saved);
			gameState.set(loaded);
			return true;
		}
	} catch {}
	return false;
}

