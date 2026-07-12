<script lang="ts">
	let { onReady, currentPlayer }: { onReady: () => void; currentPlayer: string } = $props();
</script>

<div class="handoff-overlay">
	<div class="handoff-content">
		<h2>Pass the device</h2>
		<p>It's now <strong>{currentPlayer}</strong>'s turn.</p>
		<p class="privacy-note">
			All information is hidden until you're ready. 
			The other player cannot see your pieces.
		</p>
		<button on:click={onReady} class="ready-btn">
			I'm Ready
		</button>
	</div>
</div>

<style>
	.handoff-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(10, 13, 18, 0.95);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		backdrop-filter: blur(4px);
	}

	.handoff-content {
		background: #1a1f2a;
		border: 2px solid #2a2f3a;
		padding: 2rem;
		border-radius: 8px;
		text-align: center;
		max-width: 320px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
		color: #e8e4d9;
	}

	.privacy-note {
		font-size: 0.85rem;
		color: #9aa0a8;
		margin: 1rem 0;
		line-height: 1.4;
	}

	.ready-btn {
		background: #2b6e63;
		color: white;
		border: none;
		padding: 0.75rem 2rem;
		font-size: 1rem;
		border-radius: 4px;
		cursor: pointer;
		margin-top: 1rem;
	}

	.ready-btn:hover {
		background: #3a8a7a;
	}
</style>
