<script lang="ts">
	import type { CombatResult } from '$lib/game/types';

	let { combat, onClose }: { combat: CombatResult | null; onClose: () => void } = $props();

	let visible = $state(false);

	$effect(() => {
		if (combat) {
			visible = true;
			setTimeout(() => {
				visible = false;
				onClose();
			}, 1800);
		}
	});
</script>

{#if visible && combat}
	<div class="combat-modal">
		<div class="combat-content">
			<div class="combat-header">Combat Result</div>
			<div class="combat-details">
				<div class="piece attacker">
					<span class="label">Attacker</span>
					<span class="rank">{combat.attacker.type}</span>
				</div>
				<div class="vs">VS</div>
				<div class="piece defender">
					<span class="label">Defender</span>
					<span class="rank">{combat.defender.type}</span>
				</div>
			</div>
			<div class="outcome {combat.outcome}">
				{combat.outcome === 'attackerWins' ? 'Attacker wins!' : 
				 combat.outcome === 'defenderWins' ? 'Defender wins!' : 
				 combat.outcome === 'bothDie' ? 'Both destroyed!' : 
				 'Bomb defused!'}
			</div>
		</div>
	</div>
{/if}

<style>
	.combat-modal {
		position: fixed;
		top: 0; left: 0; right: 0; bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
		background: rgba(0,0,0,0.7);
	}

	.combat-content {
		background: #1a1f2a;
		border: 2px solid #3a414f;
		padding: 1.5rem;
		border-radius: 8px;
		min-width: 260px;
		text-align: center;
	}

	.combat-header {
		font-size: 0.8rem;
		color: #9aa0a8;
		margin-bottom: 0.5rem;
	}

	.combat-details {
		display: flex;
		justify-content: space-around;
		align-items: center;
		margin: 1rem 0;
	}

	.piece {
		text-align: center;
	}

	.label {
		display: block;
		font-size: 0.7rem;
		color: #666;
	}

	.rank {
		font-size: 1.1rem;
		font-weight: bold;
		text-transform: uppercase;
	}

	.vs {
		font-size: 0.7rem;
		color: #555;
	}

	.outcome {
		font-weight: 600;
		padding: 0.25rem;
		border-radius: 3px;
	}

	.attackerWins { color: #5a8a5a; }
	.defenderWins { color: #8a5a5a; }
	.bothDie { color: #8a8a5a; }
	.defenderBombDefused { color: #5a8a5a; }
</style>
