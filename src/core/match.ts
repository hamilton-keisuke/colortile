import { GameResult } from './Game';

export type MatchWinner = 'player1' | 'player2' | 'draw';

/**
 * 対戦の勝敗判定。
 * 1. スコアが高い方の勝ち
 * 2. 同点で両者全消しなら、クリアタイムが速い方の勝ち
 * 3. それ以外は引き分け
 */
export function judgeMatch(p1: GameResult, p2: GameResult): MatchWinner {
  if (p1.score !== p2.score) return p1.score > p2.score ? 'player1' : 'player2';
  if (p1.clearTimeSec !== undefined && p2.clearTimeSec !== undefined) {
    if (p1.clearTimeSec !== p2.clearTimeSec) {
      return p1.clearTimeSec < p2.clearTimeSec ? 'player1' : 'player2';
    }
  }
  return 'draw';
}
