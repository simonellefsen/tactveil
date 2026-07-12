'use client';

import React, { useState } from 'react';
import {
  createInitialState,
  applyAction,
  getPublicGameView,
  serializeGameState,
  getLegalMoves,
} from '@/engine';
import type { GameState, PublicGameView, Position, Piece } from '@/engine';

export default function StrategoEngineDemo() {
  const [game, setGame] = useState<GameState>(() => createInitialState('singleplayer'));
  const [view, setView] = useState<PublicGameView>(() => getPublicGameView(game, 'red'));
  const [log, setLog] = useState<string[]>(['Engine initialized. Use buttons to simulate.']);

  function refreshView(next: GameState) {
    setGame(next);
    const newView = getPublicGameView(next, 'red');
    setView(newView);
  }

  function handleRandomize(player: 'red' | 'blue') {
    try {
      const next = applyAction(game, {
        type: 'RANDOMIZE_SETUP',
        player,
        seed: Date.now() % 1_000_000,
      });
      refreshView(next);
      setLog((l) => [...l, `Randomized setup for ${player}`]);
    } catch (e: any) {
      setLog((l) => [...l, `Error: ${e.message}`]);
    }
  }

  function handleCommit(player: 'red' | 'blue') {
    try {
      const next = applyAction(game, { type: 'COMMIT_SETUP', player });
      refreshView(next);
      setLog((l) => [...l, `${player} committed setup`]);
    } catch (e: any) {
      setLog((l) => [...l, `Error: ${e.message}`]);
    }
  }

  function handleReset() {
    const fresh = createInitialState('singleplayer');
    setGame(fresh);
    setView(getPublicGameView(fresh, 'red'));
    setLog(['Game reset.']);
  }

  function handleRandomMove() {
    if (game.phase !== 'playing') {
      setLog((l) => [...l, 'Can only move during playing phase']);
      return;
    }

    const current = game.currentPlayer;
    const viewerForView = current; // use current player's perspective for legal moves

    // Find pieces belonging to current player that have legal moves
    const candidates: { pos: Position; moves: ReturnType<typeof getLegalMoves> }[] = [];

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const pos: Position = { row: r, col: c };
        const piece = game.board[r][c];
        if (piece && piece.player === current) {
          const legal = getLegalMoves(game.board, pos, current);
          if (legal.length > 0) {
            candidates.push({ pos, moves: legal });
          }
        }
      }
    }

    if (candidates.length === 0) {
      setLog((l) => [...l, `No legal moves for ${current}. Game may be over.`]);
      return;
    }

    // Pick random candidate and random destination
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    const chosenMove = candidate.moves[Math.floor(Math.random() * candidate.moves.length)];

    const isAttack = !!game.board[chosenMove.to.row][chosenMove.to.col];

    try {
      const action = isAttack
        ? ({ type: 'ATTACK', from: candidate.pos, to: chosenMove.to } as const)
        : ({ type: 'MOVE', from: candidate.pos, to: chosenMove.to } as const);

      const next = applyAction(game, action);
      refreshView(next);

      const pieceType = game.board[candidate.pos.row][candidate.pos.col]?.type;
      setLog((l) => [...l, `${current} ${isAttack ? 'attacks' : 'moves'} with ${pieceType} (${candidate.pos.row},${candidate.pos.col} → ${chosenMove.to.row},${chosenMove.to.col})`]);
    } catch (e: any) {
      setLog((l) => [...l, `Move error: ${e.message}`]);
    }
  }

  const redReady = game.setup.red.committed;
  const blueReady = game.setup.blue.committed;

  return (
    <div className="min-h-screen p-8 font-sans bg-[#0A0D12] text-[#E8E4D9]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">Stratego — Engine Demo</h1>
        <p className="text-sm text-[#9AA0A8] mb-6">
          Phase 2: Pure engine running in the browser. All logic in <code>engine/</code>. No hidden info leaks in public views.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleRandomize('red')}
                className="px-4 py-2 bg-[#2B6E63] rounded text-sm hover:bg-[#1f524a]"
              >
                Randomize Red
              </button>
              <button
                onClick={() => handleRandomize('blue')}
                className="px-4 py-2 bg-[#8F5E3A] rounded text-sm hover:bg-[#6f4630]"
              >
                Randomize Blue
              </button>
              <button
                onClick={() => handleCommit('red')}
                disabled={redReady}
                className="px-4 py-2 border border-[#2F3741] rounded text-sm disabled:opacity-50"
              >
                Commit Red
              </button>
              <button
                onClick={() => handleCommit('blue')}
                disabled={blueReady}
                className="px-4 py-2 border border-[#2F3741] rounded text-sm disabled:opacity-50"
              >
                Commit Blue
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-[#2F3741] rounded text-sm"
              >
                Reset
              </button>
              <button
                onClick={handleRandomMove}
                disabled={game.phase !== 'playing'}
                className="px-4 py-2 bg-[#5319E7] text-white rounded text-sm disabled:opacity-50"
              >
                Play random move (current turn)
              </button>
            </div>

            <div className="text-sm">
              <div>Phase: <strong>{game.phase}</strong></div>
              <div>Turn: <strong>{game.currentPlayer}</strong></div>
              <div>Red placed: {game.setup.red.placed} / 40 (committed: {redReady ? 'yes' : 'no'})</div>
              <div>Blue placed: {game.setup.blue.placed} / 40 (committed: {blueReady ? 'yes' : 'no'})</div>
              {game.winner && <div className="text-[#4D6B3F] mt-1">Winner: {game.winner}</div>}
            </div>

            <button
              onClick={() => {
                const json = serializeGameState(game);
                navigator.clipboard?.writeText(json);
                setLog((l) => [...l, 'State serialized to clipboard (local only)']);
              }}
              className="text-xs px-3 py-1 border border-[#2F3741] rounded"
            >
              Copy serialized state (demo)
            </button>
          </div>

          {/* Simple text board (public view for Red) */}
          <div>
            <div className="text-sm mb-2 text-[#9AA0A8]">Public view for Red (enemy pieces hidden)</div>
            <div className="font-mono text-[10px] leading-[10px] bg-[#12161C] p-3 rounded border border-[#2F3741] overflow-auto">
              {view.board.map((row, ri) => (
                <div key={ri} className="flex">
                  {row.map((cell, ci) => {
                    const label = cell
                      ? cell.type
                        ? `${cell.player[0]}${cell.type.slice(0,2)}`
                        : `${cell.player[0]}??`
                      : '..';
                    return (
                      <span key={ci} className="inline-block w-[22px] text-center text-[#E8E4D9]/80">
                        {label}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="text-[10px] mt-1 text-[#6C737C]">
              Legal moves shown in engine (count: {view.legalMoves.length})
            </div>
          </div>
        </div>

        {/* Log */}
        <div className="mt-8">
          <div className="text-sm mb-1 text-[#9AA0A8]">Event log</div>
          <div className="bg-[#12161C] border border-[#2F3741] rounded p-3 text-xs font-mono h-32 overflow-auto">
            {log.slice(-8).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-[10px] text-[#6C737C]">
          This is a minimal engine demo. Full touch UI, visuals, AI, and PWA come in later phases.
          All rules enforced by <code>engine/</code>. Hidden information protected via projection.
        </p>
      </div>
    </div>
  );
}
