/** タイルの色（10色） */
export const TILE_COLORS = [
  'red',
  'pink',
  'orange',
  'blue',
  'lightblue',
  'purple',
  'lightgreen',
  'beige',
  'brown',
  'gray',
] as const;

export type TileColor = (typeof TILE_COLORS)[number];

/** マスの中身。null は空白マス */
export type Cell = TileColor | null;

/** 盤面上の座標 */
export interface Position {
  readonly row: number;
  readonly col: number;
}

/**
 * 盤面の読み取り専用スナップショット。
 * AI にはこれを渡す（Board インスタンスそのものは渡さない）。
 * cells[row][col]
 */
export interface BoardSnapshot {
  readonly rows: number;
  readonly cols: number;
  readonly cells: ReadonlyArray<ReadonlyArray<Cell>>;
}

/** 盤面生成の設定 */
export interface BoardConfig {
  readonly rows: number;
  readonly cols: number;
  readonly colors: readonly TileColor[];
  readonly tilesPerColor: number;
}

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  rows: 15,
  cols: 23,
  colors: TILE_COLORS,
  tilesPerColor: 20,
};
