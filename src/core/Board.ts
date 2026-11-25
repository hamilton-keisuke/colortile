import { BoardSnapshot, Cell, Position } from './types';

/**
 * 盤面の状態を管理する。
 * ゲームルール（何が消えるか）は rules.ts に置き、Board は状態の保持と変更だけを担う。
 */
export class Board {
  readonly rows: number;
  readonly cols: number;
  private readonly cells: Cell[][];

  constructor(initialCells: Cell[][]) {
    this.rows = initialCells.length;
    this.cols = initialCells[0]?.length ?? 0;
    this.cells = initialCells.map((row) => [...row]);
  }

  get(pos: Position): Cell {
    return this.cells[pos.row][pos.col];
  }

  isEmpty(pos: Position): boolean {
    return this.get(pos) === null;
  }

  /** 指定位置のタイルを削除する */
  removeTiles(positions: readonly Position[]): void {
    for (const p of positions) this.cells[p.row][p.col] = null;
  }

  countTiles(): number {
    let n = 0;
    for (const row of this.cells) for (const cell of row) if (cell !== null) n++;
    return n;
  }

  /** 外部（AI や UI）に渡すための読み取り専用コピー */
  snapshot(): BoardSnapshot {
    return {
      rows: this.rows,
      cols: this.cols,
      cells: this.cells.map((row) => Object.freeze([...row])),
    };
  }
}
