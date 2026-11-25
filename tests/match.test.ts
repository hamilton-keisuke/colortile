import { describe, expect, it } from 'vitest';
import { judgeMatch } from '../src/core/match';

describe('judgeMatch', () => {
  it('スコアが高い方の勝ち', () => {
    expect(judgeMatch({ score: 150, reason: 'timeUp' }, { score: 120, reason: 'noMoves' })).toBe('player1');
    expect(judgeMatch({ score: 100, reason: 'timeUp' }, { score: 120, reason: 'noMoves' })).toBe('player2');
  });
  it('同点で両者全消しならクリアタイムが速い方', () => {
    expect(
      judgeMatch(
        { score: 200, reason: 'cleared', clearTimeSec: 80 },
        { score: 200, reason: 'cleared', clearTimeSec: 70 },
      ),
    ).toBe('player2');
  });
  it('同点でそれ以外は引き分け', () => {
    expect(judgeMatch({ score: 150, reason: 'timeUp' }, { score: 150, reason: 'noMoves' })).toBe('draw');
  });
});
