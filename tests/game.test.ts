import { describe, expect, it } from 'vitest';
import { GreedyAI } from '../src/ai/AIPlayer';
import { Board } from '../src/core/Board';
import { BoardGenerator, seededRandom } from '../src/core/BoardGenerator';
import { Game } from '../src/core/Game';
import { findRemovableTiles } from '../src/core/rules';
import { Cell, TILE_COLORS } from '../src/core/types';

const _ = null;

/** 手動で時間を進められる時計 */
function fakeClock() {
  let t = 0;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('BoardGenerator', () => {
  it('15x23 に各色 20 個ずつ、計 200 個配置する', () => {
    const cells = new BoardGenerator(undefined, seededRandom(1)).generate();
    expect(cells.length).toBe(15);
    expect(cells.every((r) => r.length === 23)).toBe(true);
    const flat = cells.flat();
    expect(flat.filter((c) => c !== null).length).toBe(200);
    for (const color of TILE_COLORS) {
      expect(flat.filter((c) => c === color).length).toBe(20);
    }
  });
});

describe('rules', () => {
  const cells: Cell[][] = [
    [_, 'red', _, _],
    ['red', _, _, 'blue'],
    [_, _, _, _],
    [_, 'blue', _, _],
  ];
  const snap = new Board(cells).snapshot();

  it('空白を通過して 4 方向の最寄りタイルを判定する', () => {
    // (1,1): 上=red(0,1) 左=red(1,0) 右=blue(1,3) 下=blue(3,1) → 4 個
    expect(findRemovableTiles(snap, { row: 1, col: 1 })).toHaveLength(4);
  });

  it('同色が 1 個ずつなら消えない', () => {
    // (2,0): 上=red(1,0) 下なし 右なし → 0
    expect(findRemovableTiles(snap, { row: 2, col: 0 })).toHaveLength(0);
  });

  it('タイルのあるマスは対象外', () => {
    expect(findRemovableTiles(snap, { row: 0, col: 1 })).toHaveLength(0);
  });
});

describe('Game', () => {
  it('削除でスコア加算、全消しで cleared と経過時間', () => {
    const clock = fakeClock();
    const game = new Game(
      new Board([
        [_, 'red', _],
        ['red', _, _],
      ]),
      { now: clock.now },
    );
    game.start();
    clock.advance(5000);
    const out = game.click({ row: 1, col: 1 });
    expect(out.kind).toBe('removed');
    expect(game.score).toBe(2);
    expect(game.result).toEqual({ score: 2, reason: 'cleared', clearTimeSec: 5 });
  });

  it('消せないマスのクリックで 10 秒ペナルティ、タイルのマスは無視', () => {
    const clock = fakeClock();
    const game = new Game(
      new Board([
        ['red', _, 'red', _, 'blue'],
        [_, _, _, _, _],
      ]),
      { now: clock.now },
    );
    game.start();
    expect(game.click({ row: 0, col: 0 }).kind).toBe('ignored');
    expect(game.remainingMs).toBe(120000);
    expect(game.click({ row: 1, col: 4 }).kind).toBe('penalty');
    expect(game.remainingMs).toBe(110000);
  });

  it('ペナルティで 0 秒以下になれば timeUp', () => {
    const clock = fakeClock();
    const game = new Game(
      new Board([
        ['red', _, 'red', _, 'blue'],
        [_, _, _, _, _],
      ]),
      { now: clock.now },
    );
    game.start();
    clock.advance(115000);
    game.click({ row: 1, col: 4 });
    expect(game.result?.reason).toBe('timeUp');
    expect(game.click({ row: 0, col: 1 }).kind).toBe('ignored');
  });

  it('手がなくなれば noMoves', () => {
    const clock = fakeClock();
    const game = new Game(
      new Board([
        ['red', _, 'red', _, 'blue', 'gray'],
      ]),
      { now: clock.now },
    );
    game.start();
    game.click({ row: 0, col: 1 });
    expect(game.result?.reason).toBe('noMoves');
    expect(game.score).toBe(2);
  });

  it('AI が盤面スナップショットだけでプレイできる', () => {
    const clock = fakeClock();
    const game = new Game(new Board(new BoardGenerator(undefined, seededRandom(42)).generate()), {
      now: clock.now,
    });
    const ai = new GreedyAI(seededRandom(7));
    game.start();
    while (!game.isOver) {
      const pos = ai.decide(game.snapshot());
      if (!pos) break;
      expect(game.click(pos).kind).toBe('removed');
      clock.advance(100);
    }
    expect(game.isOver).toBe(true);
    expect(game.score).toBeGreaterThan(0);
  });
});
