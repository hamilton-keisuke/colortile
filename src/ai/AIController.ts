import { BoardSnapshot, Position } from '../core/types';
import { AIPlayer } from './AIPlayer';

/**
 * AI を一定間隔で動かす。
 * 盤面の取得とクリックはコールバック経由なので、Game や UI の実装を知らない。
 */
export class AIController {
  private timer: number | null = null;

  constructor(
    private readonly ai: AIPlayer,
    private readonly intervalMs: number,
    private readonly getBoard: () => BoardSnapshot,
    private readonly click: (pos: Position) => void,
    private readonly isOver: () => boolean,
  ) {}

  get running(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      if (this.isOver()) return this.stop();
      const pos = this.ai.decide(this.getBoard());
      if (pos) this.click(pos);
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}
