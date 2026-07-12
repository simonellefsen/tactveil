<script lang="ts">
	import type { PublicBoard, Position, GameState } from '$lib/game';

	let { 
		board, 
		legalMoves = [], 
		selected = null, 
		onCellClick, 
		isSetup = false, 
		currentPlayer,
		showAll = false
	}: { 
		board: PublicBoard; 
		legalMoves?: Position[]; 
		selected?: Position | null; 
		onCellClick: (pos: Position) => void; 
		isSetup?: boolean; 
		currentPlayer: string;
		showAll?: boolean;
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
			if (cell.type || showAll) {
				cls += ` ${cell.type || 'unknown'}`;
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
		if (cell.type || showAll) {
			const type = cell.type || 'unknown';
			// Original-inspired glyphs (text for now, can be SVG later)
			const glyphs: Record<string, string> = {
				marshal: '★M', // star for high rank
				general: '◆G',
				colonel: 'C',
				major: 'M',
				captain: 'C',
				lieutenant: 'L',
				sergeant: 'S',
				miner: '⛏', // pickaxe
				scout: '→', // arrow
				spy: '🗡️',
				bomb: '💣',
				flag: '⚑',
				unknown: '?'
			};
			return glyphs[type] || type[0].toUpperCase();
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
		font-size: 14px;
		font-weight: 700;
		border: 2px solid #3a414f;
		background: #1f242e;
		color: #e8e4d9;
		cursor: pointer;
		transition: all 0.1s ease;
		user-select: none;
		padding: 0;
		box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 2px rgba(0,0,0,0.3);
		position: relative;
	}

	button.cell.red {
		border-color: #5a3a2a;
		background: #2a2520;
	}

	button.cell.blue {
		border-color: #2a3a5a;
		background: #20252f;
	}

	/* Owner indicator without relying only on color (per accessibility) */
	button.cell.red::after {
		content: '';
		position: absolute;
		bottom: 2px;
		left: 50%;
		transform: translateX(-50%);
		width: 12px;
		height: 2px;
		background: #a07050;
	}

	button.cell.blue::after {
		content: '';
		position: absolute;
		bottom: 2px;
		left: 50%;
		transform: translateX(-50%);
		width: 12px;
		height: 2px;
		background: #5070a0;
	}

	button.cell.hidden {
		background: #2a2f3a;
		color: #888;
		font-style: italic;
		border-style: dashed;
	}

	button.cell.hidden::after {
		display: none;
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
