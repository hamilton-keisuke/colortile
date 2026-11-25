import { Board } from './Board';
import { findRemovableTiles, hasAnyMove, isInside } from './rules';
import { BoardSnapshot, Position } from './types';

export type EndReason = 'cleared' | 'noMoves' | 'timeUp';

export const END_REASON_TEXT: Record<EndReason, string> = {
  cleared: 'すべてのタイルを消しました！',
  noMoves: 'これ以上消せるタイルがありません',
  timeUp: '時間切れ',
};

export type ClickOutcome =
  | { kind: 'removed'; removed: Position[]; scoreGained: number }
  | { kind: 'penalty'; penaltySec: number }
  | { kind: 'ignored' }; // タイルのあるマス・盤外・ゲーム終了後

export interface GameResult {
  score: number;
  reason: EndReason;
  /** 全消し時のみ。120秒 - 残り時間 */
  clearTimeSec?: number;
}

export interface GameOptions {
  timeLimitSec?: number;
  penaltySec?: number;
  /** 現在時刻(ms)を返す関数。テストや AI 対戦の同期用に差し替え可能 */
  now?: () => number;
}

/**
 * ゲーム進行（クリック処理・スコア・タイマー・終了判定）を管理する。
 * DOM には一切依存しない。
 */
export class Game {
  readonly timeLimitSec: number;
  readonly penaltySec: number;
  private readonly now: () => number;

  private readonly board: Board;
  private _score = 0;
  private startedAt: number | null = null;
  private penaltyTotalMs = 0;
  private _result: GameResult | null = null;
  /** 終了時刻（終了後に残り時間を固定するため） */
  private _frozenAt: number | null = null;

  constructor(board: Board, options: GameOptions = {}) {
    this.board = board;
    this.timeLimitSec = options.timeLimitSec ?? 120;
    this.penaltySec = options.penaltySec ?? 10;
    this.now = options.now ?? (() => performance.now());
  }

  /** カウントダウン開始 */
  start(): void {
    if (this.startedAt !== null) return;
    this.startedAt = this.now();
    // 初期配置で手がない極端なケースに備える
    this.checkBoardEnd();
  }

  get score(): number {
    return this._score;
  }

  get isStarted(): boolean {
    return this.startedAt !== null;
  }

  get isOver(): boolean {
    return this._result !== null;
  }

  get result(): GameResult | null {
    return this._result;
  }

  /** 残り時間（ms）。0 未満にはならない */
  get remainingMs(): number {
    if (this._result?.reason === 'timeUp') return 0;
    if (this.startedAt === null) return this.timeLimitSec * 1000;
    const elapsed = (this._frozenAt ?? this.now()) - this.startedAt;
    return Math.max(0, this.timeLimitSec * 1000 - elapsed - this.penaltyTotalMs);
  }

  snapshot(): BoardSnapshot {
    return this.board.snapshot();
  }

  /**
   * 毎フレーム呼び出して時間切れを判定する。
   * @returns ゲームが終了していれば true
   */
  update(): boolean {
    if (this.isOver || !this.isStarted) return this.isOver;
    if (this.remainingMs <= 0) this.finish('timeUp');
    return this.isOver;
  }

  click(pos: Position): ClickOutcome {
    if (!this.isStarted || this.update()) return { kind: 'ignored' };
    if (!isInside(this.board.snapshot(), pos) || !this.board.isEmpty(pos)) return { kind: 'ignored' };

    const removable = findRemovableTiles(this.board.snapshot(), pos);

    if (removable.length === 0) {
      this.penaltyTotalMs += this.penaltySec * 1000;
      this.update();
      return { kind: 'penalty', penaltySec: this.penaltySec };
    }

    this.board.removeTiles(removable);
    this._score += removable.length;
    this.checkBoardEnd();
    return { kind: 'removed', removed: removable, scoreGained: removable.length };
  }

  private checkBoardEnd(): void {
    if (this.board.countTiles() === 0) {
      this.finish('cleared');
    } else if (!hasAnyMove(this.board.snapshot())) {
      this.finish('noMoves');
    }
  }

  private finish(reason: EndReason): void {
    if (this._result) return;
    this._frozenAt = this.now();
    const result: GameResult = { score: this._score, reason };
    if (reason === 'cleared') {
      result.clearTimeSec = this.timeLimitSec - this.remainingMs / 1000;
    }
    this._result = result;
  }
}
