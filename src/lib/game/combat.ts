/**
 * Combat resolution — exact algorithm from docs/game-rules.md
 *
 * Priority order (MUST be followed verbatim):
 * 1. Flag capture
 * 2. Bomb handling (only Miner defeats Bomb)
 * 3. Spy attacking Marshal
 * 4. Standard rank comparison
 */

import type { CombatOutcome, CombatResult, PieceType, Position } from './types';
import { PIECE_DEFINITIONS } from './constants';

export function getRank(type: PieceType): number | null {
  return PIECE_DEFINITIONS[type].rank;
}

export function isMiner(type: PieceType): boolean {
  return type === 'miner';
}

export function isSpy(type: PieceType): boolean {
  return type === 'spy';
}

export function isMarshal(type: PieceType): boolean {
  return type === 'marshal';
}

export function isBomb(type: PieceType): boolean {
  return type === 'bomb';
}

export function isFlag(type: PieceType): boolean {
  return type === 'flag';
}

/**
 * Resolve combat between attacker and defender.
 * Returns full CombatResult.
 */
export function resolveCombat(
  attackerType: PieceType,
  defenderType: PieceType,
  attackerPos: Position,
  defenderPos: Position
): CombatResult {
  let outcome: CombatOutcome;
  let attackerSurvives = false;
  let defenderSurvives = false;
  let flagCaptured = false;

  // 1. Flag capture (instant win)
  if (isFlag(defenderType)) {
    outcome = 'attackerWins';
    attackerSurvives = true;
    defenderSurvives = false;
    flagCaptured = true;
  }
  // 2. Bomb handling
  else if (isBomb(defenderType)) {
    if (isMiner(attackerType)) {
      outcome = 'defenderBombDefused';
      attackerSurvives = true;
      defenderSurvives = false;
    } else {
      outcome = 'defenderWins';
      attackerSurvives = false;
      defenderSurvives = true;
    }
  }
  // 3. Spy vs Marshal (only when spy is attacking)
  else if (isSpy(attackerType) && isMarshal(defenderType)) {
    outcome = 'attackerWins';
    attackerSurvives = true;
    defenderSurvives = false;
  }
  // 4. Standard rank comparison
  else {
    const rA = getRank(attackerType);
    const rD = getRank(defenderType);

    if (rA !== null && rD !== null) {
      if (rA > rD) {
        outcome = 'attackerWins';
        attackerSurvives = true;
        defenderSurvives = false;
      } else if (rA < rD) {
        outcome = 'defenderWins';
        attackerSurvives = false;
        defenderSurvives = true;
      } else {
        outcome = 'bothDie';
        attackerSurvives = false;
        defenderSurvives = false;
      }
    } else {
      // Should not happen for valid pieces, but fall back to defender wins
      outcome = 'defenderWins';
      attackerSurvives = false;
      defenderSurvives = true;
    }
  }

  return {
    attacker: { position: attackerPos, type: attackerType },
    defender: { position: defenderPos, type: defenderType },
    outcome,
    attackerSurvives,
    defenderSurvives,
    flagCaptured,
  };
}

/** Convenience: does the attacker win the combat? */
export function doesAttackerWinCombat(attackerType: PieceType, defenderType: PieceType): boolean {
  const result = resolveCombat(attackerType, defenderType, { row: 0, col: 0 }, { row: 0, col: 1 });
  return result.attackerSurvives && !result.defenderSurvives;
}
