import { BoardSnapshot, Position, TileColor } from './types';

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], // 上
  [1, 0], // 下
  [0, -1], // 左
  [0, 1], // 右
];

/**
 * クリック位置から上下左右それぞれで最初に見つかるタイルの位置を返す。
 * 空白マスは通過する。タイルが見つからない方向は含まれない。
 */
export function findNearestTiles(board: BoardSnapshot, pos: Position): Position[] {
  const found: Position[] = [];
  for (const [dr, dc] of DIRECTIONS) {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (r >= 0 && r < board.rows && c >= 0 && c < board.cols) {
      if (board.cells[r][c] !== null) {
        found.push({ row: r, col: c });
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return found;
}

/**
 * 指定位置をクリックしたときに削除されるタイルの位置を返す（最大 4 個）。
 * - タイルがあるマス／盤外の場合は空配列
 * - 4 方向の最寄りタイルのうち、同色が 2 個以上ある色のタイルをすべて対象にする
 *
 * 盤面を変更しない純粋関数なので、Game と AI の両方から利用できる。
 */
export function findRemovableTiles(board: BoardSnapshot, pos: Position): Position[] {
  if (!isInside(board, pos) || board.cells[pos.row][pos.col] !== null) return [];

  const nearest = findNearestTiles(board, pos);
  const byColor = new Map<TileColor, Position[]>();
  for (const p of nearest) {
    const color = board.cells[p.row][p.col] as TileColor;
    const list = byColor.get(color) ?? [];
    list.push(p);
    byColor.set(color, list);
  }

  const removable: Position[] = [];
  for (const list of byColor.values()) {
    if (list.length >= 2) removable.push(...list);
  }
  return removable;
}

/** タイルを 1 個以上削除できる空白マスが盤面上に存在するか */
export function hasAnyMove(board: BoardSnapshot): boolean {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (board.cells[r][c] === null && findRemovableTiles(board, { row: r, col: c }).length > 0) {
        return true;
      }
    }
  }
  return false;
}

export function isInside(board: BoardSnapshot, pos: Position): boolean {
  return pos.row >= 0 && pos.row < board.rows && pos.col >= 0 && pos.col < board.cols;
}
