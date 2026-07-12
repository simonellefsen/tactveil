<script lang="ts">
	import { gameView, game, dispatch, randomizeSetup, commitSetup, resetGame, makeRandomLegalMove } from '$lib/stores/game';
	import type { Player } from '$lib/game';

	let log: string[] = $state([]);

	function addLog(msg: string) {
		log = [...log.slice(-7), msg];
	}

	function handleRandomize(player: Player) {
		try {
			randomizeSetup(player);
			addLog(`Randomized setup for ${player}`);
		} catch (e: any) {
			addLog(`Error: ${e.message}`);
		}
	}

	function handleCommit(player: Player) {
		try {
			commitSetup(player);
			addLog(`${player} committed`);
		} catch (e: any) {
			addLog(`Error: ${e.message}`);
		}
	}

	function handleRandomMove() {
		try {
			makeRandomLegalMove();
			addLog('Played random legal move');
		} catch (e: any) {
			addLog(`Move error: ${e.message}`);
		}
	}

	function handleReset() {
		resetGame();
		log = ['Game reset.'];
	}

	function handleSerialize() {
		// For future persistence demo
		const { serializeGameState } = require('$lib/game'); // temp
		// In real: import properly
		addLog('Serialization available via engine (demo)');
	}

	// Reactive board rendering (simple text grid for verification)
	$effect(() => {
		// Could react to view changes
	});
</script>

<div class="tactveil">
	<header>
		<h1>Tactveil</h1>
		<p class="tagline">Modern hidden-information tactics. Client-only. Offline-ready.</p>
	</header>

	<div class="controls">
		<div class="section">
			<h3>Setup</h3>
			<button onclick={() => handleRandomize('red')}>Randomize Red</button>
			<button onclick={() => handleRandomize('blue')}>Randomize Blue</button>
			<button onclick={() => handleCommit('red')} disabled={$game.setup.red.committed}>Commit Red</button>
			<button onclick={() => handleCommit('blue')} disabled={$game.setup.blue.committed}>Commit Blue</button>
			<button onclick={handleReset}>Reset</button>
		</div>

		<div class="section">
			<h3>Play</h3>
			<button onclick={handleRandomMove} disabled={$game.phase !== 'playing'}>
				Play random legal move
			</button>
			<button onclick={handleSerialize}>Serialize state (stub)</button>
		</div>
	</div>

	<div class="status">
		<p>Phase: <strong>{$game.phase}</strong> | Turn: <strong>{$game.currentPlayer}</strong></p>
		<p>
			Red: {$game.setup.red.placed}/40 committed: {$game.setup.red.committed ? '✓' : '—'}<br />
			Blue: {$game.setup.blue.placed}/40 committed: {$game.setup.blue.committed ? '✓' : '—'}
		</p>
		{#if $game.winner}
			<p class="winner">Winner: {$game.winner}</p>
		{/if}
	</div>

	<div class="board">
		<h3>Public view ({$game.currentPlayer}'s perspective — enemy pieces hidden)</h3>
		<div class="grid">
			{#each $gameView.board as row, ri}
				<div class="row">
					{#each row as cell, ci}
						<span class="cell" class:hidden={!cell?.type} class:friendly={cell?.player === $game.currentPlayer}>
							{cell?.type ? cell.type.slice(0, 3) : (cell ? '???' : '·')}
						</span>
					{/each}
				</div>
			{/each}
		</div>
		<p class="hint">Legal moves count (from engine): {$gameView.legalMoves.length}</p>
	</div>

	<div class="log">
		<h3>Event Log</h3>
		<pre>{log.join('\n')}</pre>
	</div>

	<footer>
		<p>
			Pure engine in <code>src/lib/game/</code>. All rules enforced in framework-independent TypeScript.
			No hidden enemy information leaks into the DOM.
		</p>
	</footer>
</div>

<style>
	.tactveil {
		max-width: 720px;
		margin: 2rem auto;
		padding: 1rem;
		font-family: system-ui, sans-serif;
	}

	header h1 {
		margin: 0;
		font-size: 2.5rem;
	}

	.tagline {
		color: #666;
		margin-top: 0.25rem;
	}

	.controls {
		display: flex;
		gap: 2rem;
		margin: 1.5rem 0;
		flex-wrap: wrap;
	}

	button {
		padding: 0.5rem 0.75rem;
		margin: 0.25rem;
		border: 1px solid #ccc;
		background: white;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.status, .board, .log {
		margin-bottom: 1.5rem;
	}

	.grid {
		font-family: monospace;
		line-height: 1;
		background: #f8f8f8;
		padding: 0.5rem;
		border: 1px solid #ddd;
		display: inline-block;
	}

	.row {
		display: flex;
	}

	.cell {
		width: 22px;
		height: 22px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		border: 1px solid #ccc;
		background: white;
	}

	.cell.hidden {
		background: #222;
		color: #aaa;
	}

	.cell.friendly {
		background: #e0f0ff;
	}

	.winner {
		color: green;
		font-weight: bold;
	}

	.hint {
		font-size: 0.8rem;
		color: #666;
	}

	pre {
		background: #f4f4f4;
		padding: 0.5rem;
		font-size: 0.75rem;
		white-space: pre-wrap;
		max-height: 120px;
		overflow: auto;
	}
</style>
