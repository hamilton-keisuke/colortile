import { BoardConfig, Cell, DEFAULT_BOARD_CONFIG } from './types';

/** 0 以上 1 未満の乱数を返す関数（テストや対戦用にシード付き乱数を差し込める） */
export type RandomFn = () => number;

/**
 * ランダムな初期盤面を生成する。
 * 生成するのは純粋なデータ（Cell の 2 次元配列）だけで、ゲーム進行には関与しない。
 */
export class BoardGenerator {
  constructor(
    private readonly config: BoardConfig = DEFAULT_BOARD_CONFIG,
    private readonly random: RandomFn = Math.random,
  ) {
    const total = config.colors.length * config.tilesPerColor;
    if (total > config.rows * config.cols) {
      throw new Error(`タイル数 ${total} が盤面のマス数 ${config.rows * config.cols} を超えています`);
    }
  }

  generate(): Cell[][] {
    const { rows, cols, colors, tilesPerColor } = this.config;

    // 全マス分の配列を用意し、先頭にタイル、残りを空白にしてシャッフルする
    const flat: Cell[] = [];
    for (const color of colors) {
      for (let i = 0; i < tilesPerColor; i++) flat.push(color);
    }
    while (flat.length < rows * cols) flat.push(null);

    // Fisher–Yates シャッフル
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }

    const cells: Cell[][] = [];
    for (let r = 0; r < rows; r++) {
      cells.push(flat.slice(r * cols, (r + 1) * cols));
    }
    return cells;
  }
}

/** 再現可能な盤面を作るためのシード付き乱数（mulberry32） */
export function seededRandom(seed: number): RandomFn {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
