<script lang="ts">
	import Board from '$lib/components/Board.svelte';
	import { gameView, game, dispatch, randomizeSetup, commitSetup, resetGame } from '$lib/stores/game';
	import { getLegalMoves } from '$lib/game';
	import type { Player, Position, PieceType } from '$lib/game';

	let log: string[] = $state([]);
	let selected: Position | null = $state(null);
	let selectedPieceType: PieceType | null = $state(null);
	let currentViewPlayer: Player = $state('red'); // for demo, can switch for handoff simulation

	const pieceTypes: PieceType[] = ['flag', 'marshal', 'general', 'colonel', 'major', 'captain', 'lieutenant', 'sergeant', 'miner', 'scout', 'spy', 'bomb'];

	function addLog(msg: string) {
		log = [msg, ...log].slice(0, 8);
	}

	function handleCellClick(pos: Position) {
		const state = $game;
		const cell = state.board[pos.row][pos.col];

		if (state.phase === 'setup') {
			if (selectedPieceType) {
				try {
					dispatch({
						type: 'PLACE_PIECE',
						player: currentViewPlayer,
						position: pos,
						pieceType: selectedPieceType
					});
					addLog(`Placed ${selectedPieceType} for ${currentViewPlayer}`);
					// Auto deselect after place? or keep for multiple
				} catch (e: any) {
					addLog(`Error: ${e.message}`);
				}
			} else if (cell && cell.player === currentViewPlayer) {
				// Remove piece
				try {
					dispatch({ type: 'REMOVE_PIECE', player: currentViewPlayer, position: pos });
					addLog(`Removed piece at ${pos.row},${pos.col}`);
				} catch (e: any) {
					addLog(`Error: ${e.message}`);
				}
			}
			return;
		}

		// Playing phase
		if (selected) {
			// Try to move/attack
			const isAttack = !!cell && cell.player !== state.currentPlayer;
			const actionType = isAttack ? 'ATTACK' : 'MOVE';
			try {
				dispatch({
					type: actionType,
					from: selected,
					to: pos
				} as any);
				addLog(`${actionType.toLowerCase()} from ${selected.row},${selected.col} to ${pos.row},${pos.col}`);
				selected = null;
			} catch (e: any) {
				addLog(`Illegal: ${e.message}`);
				selected = null;
			}
		} else if (cell && cell.player === state.currentPlayer) {
			// Select own piece
			selected = pos;
			addLog(`Selected piece at ${pos.row},${pos.col}`);
		} else {
			selected = null;
		}
	}

	function handleRandomize(player: Player) {
		randomizeSetup(player);
		addLog(`Randomized ${player}`);
		selected = null;
	}

	function handleCommit(player: Player) {
		try {
			commitSetup(player);
			addLog(`${player} committed setup`);
		} catch (e: any) {
			addLog(`Error: ${e.message}`);
		}
	}

	function handleReset() {
		resetGame();
		log = ['Game reset'];
		selected = null;
		selectedPieceType = null;
	}

	function handleRandomMove() {
		const state = $game;
		if (state.phase !== 'playing') return;

		for (let r = 0; r < 10; r++) {
			for (let c = 0; c < 10; c++) {
				const from = { row: r, col: c };
				const p = state.board[r][c];
				if (p && p.player === state.currentPlayer) {
					const legals = getLegalForDemo(state, from);
					if (legals.length) {
						const to = legals[0];
						const isAttack = !!state.board[to.row][to.col];
						try {
							dispatch({ type: isAttack ? 'ATTACK' : 'MOVE', from, to } as any);
							addLog(`Random ${isAttack ? 'attack' : 'move'}`);
							return;
						} catch {}
					}
				}
			}
		}
		addLog('No legal moves found');
	}

	function simulateHandoff() {
		if ($game.phase !== 'playing') {
			addLog('Handoff only during play');
			return;
		}
		// Simulate privacy handoff: switch view player
		currentViewPlayer = currentViewPlayer === 'red' ? 'blue' : 'red';
		selected = null;
		addLog(`Device handed to ${currentViewPlayer}. View switched (privacy preserved).`);
	}

	function selectPieceType(type: PieceType) {
		selectedPieceType = selectedPieceType === type ? null : type;
		selected = null;
		addLog(selectedPieceType ? `Selected ${type} for placement` : 'Placement mode off');
	}

	// Computed legals for display (runes mode)
	let legals = $derived.by(() => {
		if (!selected) return [];
		const state = $game;
		try {
			return getLegalMoves(state.board, selected, state.currentPlayer).map((m: any) => m.to);
		} catch { 
			return []; 
		}
	});

	// For random move in demo (uses imported getLegalMoves)
	function getLegalForDemo(state: any, from: any) {
		try {
			return getLegalMoves(state.board, from, state.currentPlayer).map((m: any) => m.to);
		} catch { return []; }
	}
</script>

<div class="app">
	<header>
		<h1>Tactveil</h1>
		<p class="subtitle">Hidden tactics • Client-only • Offline PWA</p>
	</header>

	<div class="status-bar">
		<div class="phase">Phase: <strong>{$game.phase}</strong></div>
		<div class="turn">Turn: <strong>{$game.currentPlayer}</strong> (viewing as <strong>{currentViewPlayer}</strong>)</div>
		<div class="setup-count">
			Red: {$game.setup.red.placed}/40 { $game.setup.red.committed ? '✓' : '' } |
			Blue: {$game.setup.blue.placed}/40 { $game.setup.blue.committed ? '✓' : '' }
		</div>
		{#if $game.winner}
			<div class="winner">🏆 Winner: {$game.winner}</div>
		{/if}
		{#if $game.lastCombat}
			<div class="combat">Last combat: {$game.lastCombat.attacker.type} vs {$game.lastCombat.defender.type} → {$game.lastCombat.outcome}</div>
		{/if}
	</div>

	{#if $game.phase === 'setup'}
		<div class="setup-controls">
			<h3>Setup — Click palette then board square</h3>
			<div class="palette">
				{#each pieceTypes as type}
					<button 
						class="piece-btn" 
						class:selected={selectedPieceType === type}
						on:click={() => selectPieceType(type)}
					>
						{type}
					</button>
				{/each}
			</div>
			<div class="quick">
				<button on:click={() => handleRandomize('red')}>Random Red</button>
				<button on:click={() => handleRandomize('blue')}>Random Blue</button>
				<button on:click={() => handleCommit('red')} disabled={$game.setup.red.committed}>Commit Red</button>
				<button on:click={() => handleCommit('blue')} disabled={$game.setup.blue.committed}>Commit Blue</button>
			</div>
		</div>
	{:else if $game.phase === 'playing'}
		<div class="play-controls">
			<button on:click={handleRandomMove}>Random Legal Move</button>
			<button on:click={simulateHandoff}>Simulate Handoff (Pass Device)</button>
		</div>
	{/if}

	<div class="main">
		<Board 
			board={$gameView.board} 
			legalMoves={legals}
			{selected}
			onCellClick={handleCellClick}
			isSetup={$game.phase === 'setup'}
			currentPlayer={currentViewPlayer}
		/>
	</div>

	<div class="sidebar">
		<div class="log">
			<h4>Log</h4>
			{#each log as entry}
				<div>{entry}</div>
			{/each}
		</div>

		<button on:click={handleReset} class="reset">Reset Game</button>
	</div>

	<footer>
		<small>Pure engine • No hidden info leaks • SvelteKit</small>
	</footer>
</div>

<style>
	.app {
		max-width: 860px;
		margin: 0 auto;
		padding: 1rem;
		font-family: system-ui, -apple-system, sans-serif;
		background: #0f1218;
		color: #e8e4d9;
		min-height: 100vh;
	}

	header h1 { margin: 0; font-size: 2.2rem; letter-spacing: 1px; }
	.subtitle { margin: 0.25rem 0 1rem; color: #888; font-size: 0.95rem; }

	.status-bar {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		background: #1a1f2a;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.setup-controls, .play-controls {
		margin-bottom: 1rem;
	}

	.palette {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-bottom: 0.5rem;
	}

	.piece-btn {
		padding: 4px 8px;
		font-size: 11px;
		border: 1px solid #444;
		background: #222;
		color: #ddd;
		cursor: pointer;
	}

	.piece-btn.selected {
		background: #3a5a3a;
		border-color: #5a8a5a;
	}

	.quick button { margin-right: 4px; }

	button {
		padding: 6px 10px;
		border: 1px solid #555;
		background: #2a2f3a;
		color: #e8e4d9;
		cursor: pointer;
		font-size: 0.85rem;
	}

	button:disabled { opacity: 0.5; cursor: not-allowed; }

	.main { margin: 1rem 0; }

	.sidebar {
		margin-top: 1rem;
	}

	.log {
		background: #1a1f2a;
		padding: 0.5rem;
		border-radius: 3px;
		font-size: 0.8rem;
		line-height: 1.3;
		max-height: 140px;
		overflow: auto;
		margin-bottom: 0.5rem;
	}

	.reset {
		background: #4a2f2a;
		border-color: #6a4f4a;
	}

	footer {
		margin-top: 2rem;
		opacity: 0.6;
		font-size: 0.75rem;
		text-align: center;
	}
</style>
