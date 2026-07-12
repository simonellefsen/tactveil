<script lang="ts">
	let { winner, onReset }: { winner: 'red' | 'blue' | null; onReset: () => void } = $props();
</script>

{#if winner}
	<div class="victory-overlay">
		<div class="victory-content">
			<h2>Game Over</h2>
			<div class="winner-text">
				{winner.toUpperCase()} wins!
			</div>
			<p>The objective has been captured or the opponent has no moves left.</p>
			<button on:click={onReset}>Play Again</button>
		</div>
	</div>
{/if}

<style>
	.victory-overlay {
		position: fixed;
		inset: 0;
		background: rgba(10,13,18,0.92);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 300;
	}

	.victory-content {
		text-align: center;
		background: #1a1f2a;
		padding: 2rem 3rem;
		border: 3px solid #3a414f;
		border-radius: 8px;
	}

	h2 {
		margin: 0 0 0.5rem;
		color: #e8e4d9;
	}

	.winner-text {
		font-size: 2rem;
		font-weight: bold;
		color: #5a8a5a;
		margin: 1rem 0;
	}

	button {
		margin-top: 1rem;
		padding: 0.6rem 1.5rem;
		background: #2b6e63;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
