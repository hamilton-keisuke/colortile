import { findRemovableTiles } from '../core/rules';
import { BoardSnapshot, Position } from '../core/types';

/**
 * AI のインターフェース。
 * 盤面スナップショットを受け取り、次にクリックする位置を返す。
 * 打つ手がなければ null。
 */
export interface AIPlayer {
  readonly name: string;
  decide(board: BoardSnapshot): Position | null;
}

/** 盤面上の「タイルを消せる手」をすべて列挙する（AI 実装用のヘルパー） */
export function listMoves(board: BoardSnapshot): Array<{ pos: Position; gain: number }> {
  const moves: Array<{ pos: Position; gain: number }> = [];
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (board.cells[row][col] !== null) continue;
      const gain = findRemovableTiles(board, { row, col }).length;
      if (gain > 0) moves.push({ pos: { row, col }, gain });
    }
  }
  return moves;
}

/** 消せる手からランダムに選ぶ AI */
export class RandomAI implements AIPlayer {
  readonly name = 'ランダムAI';
  constructor(private readonly random: () => number = Math.random) {}

  decide(board: BoardSnapshot): Position | null {
    const moves = listMoves(board);
    if (moves.length === 0) return null;
    return moves[Math.floor(this.random() * moves.length)].pos;
  }
}

/** 一度に最も多く消せる手を選ぶ AI（同点はランダム） */
export class GreedyAI implements AIPlayer {
  readonly name = '貪欲AI';
  constructor(private readonly random: () => number = Math.random) {}

  decide(board: BoardSnapshot): Position | null {
    const moves = listMoves(board);
    if (moves.length === 0) return null;
    const best = Math.max(...moves.map((m) => m.gain));
    const candidates = moves.filter((m) => m.gain === best);
    return candidates[Math.floor(this.random() * candidates.length)].pos;
  }
}
