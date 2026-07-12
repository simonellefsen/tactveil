<script lang="ts">
	import type { PublicBoard, Position, GameState } from '$lib/game';

	let { 
		board, 
		legalMoves = [], 
		selected = null, 
		onCellClick, 
		isSetup = false, 
		currentPlayer 
	}: { 
		board: PublicBoard; 
		legalMoves?: Position[]; 
		selected?: Position | null; 
		onCellClick: (pos: Position) => void; 
		isSetup?: boolean; 
		currentPlayer: string; 
	} = $props();

	// Check if position is legal
	function isLegal(pos: Position): boolean {
		return legalMoves.some((m) => m.row === pos.row && m.col === pos.col);
	}

	function isSelected(pos: Position): boolean {
		return selected?.row === pos.row && selected?.col === pos.col;
	}

	function getCellClass(cell: any, pos: Position) {
		let cls = 'cell';
		if (cell) {
			cls += ` ${cell.player}`;
			if (cell.type) {
				cls += ` ${cell.type}`;
			} else {
				cls += ' hidden';
			}
		} else {
			cls += ' empty';
		}
		if (isLegal(pos)) cls += ' legal';
		if (isSelected(pos)) cls += ' selected';
		return cls;
	}

	function getLabel(cell: any) {
		if (!cell) return '';
		if (cell.type) {
			// Short labels
			const labels: Record<string, string> = {
				marshal: 'M',
				general: 'G',
				colonel: 'C',
				major: 'Maj',
				captain: 'Cap',
				lieutenant: 'Lt',
				sergeant: 'Sgt',
				miner: 'Min',
				scout: 'Sc',
				spy: 'Sp',
				bomb: 'B',
				flag: 'F'
			};
			return labels[cell.type] || cell.type[0].toUpperCase();
		}
		return '?';
	}
</script>

<div class="board">
	{#each board as row, rowIndex}
		<div class="row">
			{#each row as cell, colIndex}
				{@const pos = { row: rowIndex, col: colIndex }}
				<button
					class={getCellClass(cell, pos)}
					on:click={() => onCellClick(pos)}
					disabled={!isLegal(pos) && !isSetup && !cell}
					aria-label={cell ? `${cell.player} ${cell.type || 'unknown'} at ${rowIndex},${colIndex}` : `empty at ${rowIndex},${colIndex}`}
				>
					{getLabel(cell)}
				</button>
			{/each}
		</div>
	{/each}
</div>

<style>
	.board {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 1px;
		background: #2a2f3a;
		padding: 2px;
		border: 3px solid #1a1f2a;
		border-radius: 4px;
		width: fit-content;
		margin: 0 auto;
		box-shadow: 0 4px 12px rgba(0,0,0,0.4);
	}

	.row {
		display: contents;
	}

	button.cell {
		width: 42px;
		height: 42px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
		border: 1px solid #3a414f;
		background: #1f242e;
		color: #e8e4d9;
		cursor: pointer;
		transition: all 0.1s ease;
		user-select: none;
		padding: 0;
	}

	button.cell:hover:not(:disabled) {
		transform: scale(1.05);
		z-index: 1;
	}

	button.cell:disabled {
		cursor: default;
		opacity: 0.7;
	}

	.cell.red { background: #3a2f2a; color: #f0d9c0; }
	.cell.blue { background: #2a2f3a; color: #c0d0f0; }

	.cell.hidden {
		background: #2a2f3a !important;
		color: #666 !important;
		font-style: italic;
	}

	.cell.legal {
		background: #3a5a3a !important;
		box-shadow: inset 0 0 0 2px #5a8a5a;
	}

	.cell.selected {
		box-shadow: inset 0 0 0 3px #e8e4d9;
		background: #4a5a6a !important;
	}

	.cell.empty {
		background: #1f242e;
	}

	.cell.empty.legal {
		background: #2a4a2a !important;
	}

	@media (max-width: 480px) {
		button.cell {
			width: 32px;
			height: 32px;
			font-size: 9px;
		}
	}
</style>
