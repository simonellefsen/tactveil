<script lang="ts">
	import Board from '$lib/components/Board.svelte';
	import Handoff from '$lib/components/Handoff.svelte';
	import CombatModal from '$lib/components/CombatModal.svelte';
	import Victory from '$lib/components/Victory.svelte';
	import { gameView, game, dispatch, randomizeSetup, commitSetup, resetGame, makeRandomLegalMove, makeAIMove, saveGame, loadGame, setViewer, getCurrentViewer } from '$lib/stores/game';
	import { initAudio, playMoveSound, playCombatSound, playSelectSound, playInvalidSound } from '$lib/audio';
	import type { Player, Position, PieceType } from '$lib/game';

	let log: string[] = $state([]);
	let selected: Position | null = $state(null);
	let selectedPieceType: PieceType | null = $state(null);
	let showHandoff = $state(false);
	let mode: 'single' | 'passplay' | 'training' = $state('single');
	let difficulty: 'easy' | 'medium' | 'hard' = $state('easy');
	let gameStarted = $state(false);
	let currentViewPlayer: Player = $state('red');

	const pieceTypes: PieceType[] = ['flag', 'marshal', 'general', 'colonel', 'major', 'captain', 'lieutenant', 'sergeant', 'miner', 'scout', 'spy', 'bomb'];

	// Sync viewer
	$effect(() => {
		if (gameStarted) {
			setViewer(currentViewPlayer);
		}
	});

	function remainingCount(type: PieceType, player: Player) {
		let count = 0;
		for (const row of $game.board) {
			for (const cell of row) {
				if (cell && cell.player === player && cell.type === type) count++;
			}
		}
		const max = 1; // default, better from config but simple
		// rough counts from rules
		const maxes: Record<PieceType, number> = {flag:1, marshal:1, general:1, colonel:2, major:3, captain:4, lieutenant:4, sergeant:4, miner:5, scout:8, spy:1, bomb:6};
		return Math.max(0, (maxes[type] || 1) - count);
	}

	function getCaptured() {
		// Simple: pieces not on board for the opponent (from initial, but demo uses revealed + missing)
		const captured: any[] = [];
		const initialCounts: Record<PieceType, number> = {flag:1, marshal:1, general:1, colonel:2, major:3, captain:4, lieutenant:4, sergeant:4, miner:5, scout:8, spy:1, bomb:6};
		const currentCounts: Record<PieceType, number> = {} as any;
		Object.keys(initialCounts).forEach(t => currentCounts[t as PieceType] = 0);

		$game.board.forEach(row => row.forEach(cell => {
			if (cell) currentCounts[cell.type]++;
		}));

		// For opponent of current
		const opp = $game.currentPlayer === 'red' ? 'blue' : 'red';
		Object.keys(initialCounts).forEach((t: any) => {
			const missing = initialCounts[t] - currentCounts[t];
			for (let i=0; i<missing; i++) {
				captured.push({type: t, player: opp});
			}
		});
		return captured;
	}

	// Track last combat for modal
	let lastCombat = $derived($game.lastCombat);

	function addLog(msg: string) {
		log = [msg, ...log].slice(0, 6);
	}

	function startGame(selectedMode: 'single' | 'passplay' | 'training', diff?: 'easy' | 'medium' | 'hard') {
		mode = selectedMode;
		if (diff) difficulty = diff;
		gameStarted = true;
		resetGame();
		// Try to load previous game
		if (loadGame()) {
			addLog('Loaded previous game');
		}
		initAudio();
		selected = null;
		selectedPieceType = null;
		showHandoff = false;
		addLog(`Started ${selectedMode} ${mode === 'single' ? difficulty : ''} game`);
	}

	function handleCellClick(pos: Position) {
		if (showHandoff) return; // prevent during handoff
		const state = $game;
		const cell = state.board[pos.row][pos.col];
		playSelectSound();

		if (state.phase === 'setup') {
			const player = state.currentPlayer; // for simplicity in demo
			if (selectedPieceType) {
				try {
					dispatch({ type: 'PLACE_PIECE', player, position: pos, pieceType: selectedPieceType });
					addLog(`Placed ${selectedPieceType}`);
				} catch (e: any) {
					playInvalidSound();
					addLog(`Error: ${e.message}`);
				}
			} else if (cell && cell.player === player) {
				try {
					dispatch({ type: 'REMOVE_PIECE', player, position: pos });
					addLog(`Removed piece`);
				} catch (e: any) {
					playInvalidSound();
					addLog(`Error: ${e.message}`);
				}
			}
			return;
		}

		if (state.phase !== 'playing') return;

		if (selected) {
			const isAttack = !!cell && cell.player !== state.currentPlayer;
			const actionType = isAttack ? 'ATTACK' : 'MOVE';
			try {
				dispatch({ type: actionType, from: selected, to: pos } as any);
				playMoveSound();
				addLog(`${actionType.toLowerCase()}`);
				selected = null;

				// After move in single player, AI responds
				if (mode === 'single' && state.currentPlayer !== 'red') {
					setTimeout(() => {
						makeAIMove(difficulty);
						playMoveSound();
						addLog('AI moved');
					}, 600);
				}

				// In passplay, trigger handoff after successful move
				if (mode === 'passplay') {
					setTimeout(() => {
						showHandoff = true;
					}, 400);
				}
			} catch (e: any) {
				playInvalidSound();
				addLog(`Illegal: ${e.message}`);
				selected = null;
			}
		} else if (cell && cell.player === state.currentPlayer) {
			selected = pos;
			playSelectSound();
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
			addLog(`${player} committed`);
			if (mode === 'passplay' && player === 'blue') {
				// After both commit in passplay, start with handoff
				setTimeout(() => showHandoff = true, 300);
			}
		} catch (e: any) {
			addLog(`Error: ${e.message}`);
		}
	}

	function handleReset() {
		resetGame();
		log = ['Game reset'];
		selected = null;
		selectedPieceType = null;
		showHandoff = false;
		gameStarted = false;
	}

	function handleReady() {
		showHandoff = false;
		selected = null;
		// Switch viewer for passplay
		if (mode === 'passplay') {
			const nextViewer = currentViewPlayer === 'red' ? 'blue' : 'red';
			setViewer(nextViewer);
			currentViewPlayer = nextViewer;
		}
		addLog('Player ready. Your turn.');
	}

	function handleRandomMove() {
		if ($game.phase !== 'playing') return;
		makeRandomLegalMove();
		playMoveSound();
		addLog('Random move');

		if (mode === 'single' && $game.currentPlayer !== 'red') {
			setTimeout(() => {
				makeAIMove(difficulty);
				playMoveSound();
				addLog('AI moved');
			}, 500);
		}
	}

	function selectPieceType(type: PieceType) {
		selectedPieceType = selectedPieceType === type ? null : type;
		selected = null;
	}

	// Combat sound on change
	$effect(() => {
		if (lastCombat) {
			const win = lastCombat.outcome === 'attackerWins' || lastCombat.outcome === 'defenderBombDefused';
			playCombatSound(win);
		}
	});

	let legals = $derived.by(() => {
		if (!selected) return [];
		const state = $game;
		try {
			return getLegalMoves(state.board, selected, state.currentPlayer).map((m: any) => m.to);
		} catch { return []; }
	});
</script>

<div class="app">
	<header>
		<h1>Tactveil</h1>
		<p class="subtitle">Modern hidden-information strategy • Client-only PWA</p>
	</header>

	{#if !gameStarted}
		<div class="start-screen">
			<h2>Choose Game Mode</h2>
			<div class="modes">
				<div class="mode-group">
					<button on:click={() => startGame('single', 'easy')}>Single Player - Easy AI</button>
					<button on:click={() => startGame('single', 'medium')}>Single Player - Medium AI</button>
					<button on:click={() => startGame('single', 'hard')}>Single Player - Hard AI</button>
				</div>
				<button on:click={() => startGame('passplay')}>Local Pass-and-Play (2 players)</button>
				<button on:click={() => startGame('training')}>Training Mode (All Visible)</button>
			</div>
			<p class="hint">Rules enforced by pure engine. No hidden info leaks. Original design.</p>
		</div>
	{:else}
		<div class="status-bar">
			<div>Mode: <strong>{mode}</strong></div>
			<div>Phase: <strong>{$game.phase}</strong></div>
			<div>Turn: <strong>{$game.currentPlayer}</strong></div>
			{#if $game.winner}
				<div class="winner">Winner: {$game.winner}</div>
			{/if}
		</div>

		{#if $game.phase === 'playing'}
			<div class="captured">
				<strong>Captured pieces:</strong> 
				<span class="cap-red">Red lost: </span>
				{#each getCaptured().filter(c => c.player === 'red') as cap}
					<span class="cap-item red">{cap.type}</span>
				{/each}
				<span class="cap-blue"> | Blue lost: </span>
				{#each getCaptured().filter(c => c.player === 'blue') as cap}
					<span class="cap-item blue">{cap.type}</span>
				{/each}
				<span class="hint">(from board state)</span>
			</div>
		{/if}

		{#if $game.phase === 'setup'}
			<div class="setup-ui">
				<h3>Setup Phase — Select type then click your side of the board</h3>
				<div class="palette">
					{#each pieceTypes as type}
						<button class:selected={selectedPieceType === type} on:click={() => selectPieceType(type)}>
							{type} ({remainingCount(type, currentViewPlayer)})
						</button>
					{/each}
				</div>
				<div class="actions">
					<button on:click={() => handleRandomize('red')}>Random Red</button>
					<button on:click={() => handleRandomize('blue')}>Random Blue</button>
					<button on:click={() => handleCommit('red')} disabled={$game.setup.red.committed}>Commit Red</button>
					<button on:click={() => handleCommit('blue')} disabled={$game.setup.blue.committed}>Commit Blue</button>
				</div>
				<p class="remaining">Red to place: {40 - $game.setup.red.placed} | Blue: {40 - $game.setup.blue.placed}</p>
			</div>
		{:else if $game.phase === 'playing'}
			<div class="play-actions">
				<button on:click={handleRandomMove}>Random Move</button>
				<button on:click={() => { saveGame(); addLog('Game saved locally'); }}>Save</button>
				<button on:click={() => { if (loadGame()) addLog('Game loaded'); else addLog('No save'); }}>Load</button>
				<button on:click={handleReset}>Reset</button>
			</div>
		{/if}

		<div class="board-container">
			<Board 
				board={$gameView.board} 
				legalMoves={legals}
				{selected}
				onCellClick={handleCellClick}
				isSetup={$game.phase === 'setup'}
				currentPlayer={$game.currentPlayer}
				showAll={mode === 'training'}
			/>
		</div>

		{#if mode === 'training' || $game.phase === 'playing'}
			<div class="legend">
				<strong>Legend:</strong> 
				★M Marshal (10) | ◆G General (9) | C Colonel (8) | M Major (7) | C Captain (6) | L Lt (5) | S Sgt (4) | ⛏ Miner | → Scout | 🗡️ Spy | 💣 Bomb | ⚑ Flag
				<br>
				<span class="red">Red</span> / <span class="blue">Blue</span> — ? = hidden enemy
			</div>
		{/if}

		<div class="log">
			{#each log as entry}
				<div>{entry}</div>
			{/each}
		</div>
	{/if}

	<CombatModal combat={lastCombat} onClose={() => { /* auto closes */ }} />
	<Victory winner={$game.winner} onReset={handleReset} />

	{#if showHandoff}
		<Handoff currentPlayer={$game.currentPlayer} onReady={handleReady} />
	{/if}

	<footer>
		<small>Pure engine in lib/game • No leaks • SvelteKit</small>
	</footer>
</div>

<style>
	.app {
		max-width: 820px;
		margin: 0 auto;
		padding: 1rem;
		background: #0a0d12;
		color: #e8e4d9;
		min-height: 100vh;
		font-family: system-ui, sans-serif;
	}

	header {
		border-bottom: 1px solid #2a2f3a;
		padding-bottom: 0.5rem;
		margin-bottom: 1rem;
	}

	header h1 { 
		font-size: 2rem; 
		margin: 0; 
		letter-spacing: 1px;
		text-transform: uppercase;
	}
	.subtitle { 
		margin-top: 0.25rem; 
		color: #888; 
		font-size: 0.85rem;
	}

	.start-screen {
		text-align: center;
		margin-top: 3rem;
	}

	.modes {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mode-group {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.modes button {
		display: inline-block;
		padding: 0.6rem 1rem;
		background: #2a2f3a;
		border: 1px solid #3a414f;
		color: #e8e4d9;
		cursor: pointer;
		border-radius: 3px;
		font-size: 0.85rem;
	}

	.modes button:hover {
		background: #3a414f;
		border-color: #4a515f;
	}

	.status-bar {
		display: flex;
		gap: 1rem;
		background: #1a1f2a;
		padding: 0.4rem 0.6rem;
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
		flex-wrap: wrap;
		border: 1px solid #2a2f3a;
		border-radius: 3px;
	}

	.setup-ui, .play-actions {
		margin-bottom: 1rem;
	}

	.palette {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		margin-bottom: 0.5rem;
	}

	.palette button {
		padding: 3px 6px;
		font-size: 10px;
		background: #222;
		border: 1px solid #444;
		color: #ddd;
	}

	.palette button.selected {
		background: #3a5a3a;
		border-color: #5a8a5a;
	}

	.actions button {
		margin-right: 4px;
		padding: 4px 8px;
	}

	.board-container {
		margin: 1rem 0;
	}

	.log {
		background: #1a1f2a;
		padding: 0.4rem;
		font-size: 0.75rem;
		line-height: 1.2;
		max-height: 80px;
		overflow: auto;
	}

	.captured {
		margin: 0.5rem 0;
		font-size: 0.8rem;
		padding: 0.3rem 0.5rem;
		background: #1a1f2a;
		border-radius: 3px;
		border: 1px solid #2a2f3a;
	}

	.cap-item {
		display: inline-block;
		margin: 0 2px;
		padding: 1px 4px;
		border-radius: 2px;
		font-size: 0.7rem;
		border: 1px solid #444;
	}

	.cap-item.red { background: #3a2a20; }
	.cap-item.blue { background: #202a3a; }

	.hint { font-size: 0.7rem; color: #666; margin-left: 4px; }

	.legend {
		margin-top: 0.5rem;
		font-size: 0.7rem;
		color: #aaa;
		background: #1a1f2a;
		padding: 0.3rem 0.5rem;
		border-radius: 3px;
		line-height: 1.3;
	}

	.legend .red { color: #f0c0a0; font-weight: bold; }
	.legend .blue { color: #a0c0f0; font-weight: bold; }

	.winner { color: #5a8a5a; font-weight: bold; }

	footer {
		margin-top: 2rem;
		text-align: center;
		opacity: 0.5;
		font-size: 0.7rem;
	}
</style>
