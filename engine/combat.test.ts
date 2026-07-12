import { describe, it, expect } from 'vitest';
import { resolveCombat, doesAttackerWinCombat } from './combat';
import type { PieceType } from './types';

describe('Combat Resolution (exact rules)', () => {
  const posA = { row: 0, col: 0 };
  const posD = { row: 0, col: 1 };

  it('Flag capture wins immediately', () => {
    const res = resolveCombat('marshal', 'flag', posA, posD);
    expect(res.flagCaptured).toBe(true);
    expect(res.attackerSurvives).toBe(true);
    expect(res.outcome).toBe('attackerWins');
  });

  it('Miner defeats bomb', () => {
    const res = resolveCombat('miner', 'bomb', posA, posD);
    expect(res.outcome).toBe('defenderBombDefused');
    expect(res.attackerSurvives).toBe(true);
    expect(res.defenderSurvives).toBe(false);
  });

  it('Non-miner attacking bomb dies', () => {
    const res = resolveCombat('marshal', 'bomb', posA, posD);
    expect(res.outcome).toBe('defenderWins');
    expect(res.attackerSurvives).toBe(false);
  });

  it('Spy attacking Marshal wins', () => {
    const res = resolveCombat('spy', 'marshal', posA, posD);
    expect(res.outcome).toBe('attackerWins');
    expect(res.attackerSurvives).toBe(true);
  });

  it('Marshal attacking Spy wins', () => {
    const res = resolveCombat('marshal', 'spy', posA, posD);
    expect(res.outcome).toBe('attackerWins');
  });

  it('Higher rank wins', () => {
    expect(doesAttackerWinCombat('colonel', 'captain')).toBe(true);
    expect(doesAttackerWinCombat('sergeant', 'lieutenant')).toBe(false);
  });

  it('Equal ranks result in both dying', () => {
    const res = resolveCombat('captain', 'captain', posA, posD);
    expect(res.outcome).toBe('bothDie');
    expect(res.attackerSurvives).toBe(false);
    expect(res.defenderSurvives).toBe(false);
  });

  it('Spy loses to everything except Marshal when attacking', () => {
    expect(doesAttackerWinCombat('spy', 'general')).toBe(false);
    expect(doesAttackerWinCombat('spy', 'scout')).toBe(false);
  });
});
