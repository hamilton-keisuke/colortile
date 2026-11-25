import { Board } from '../core/Board';
import { ClickOutcome, END_REASON_TEXT, Game, GameResult } from '../core/Game';
import { Cell, Position } from '../core/types';
import { BoardView } from './BoardView';

export interface PlayerPanelOptions {
  title: string;
  cells: Cell[][];
  /** 人がクリックで操作できるか（AI 用パネルは false） */
  interactive: boolean;
  onEnd?: (result: GameResult) => void;
}

/**
 * 1 プレイヤー分の表示（名前・スコア・タイマー・盤面・結果）と Game を束ねる。
 * 人の操作も AI の操作も click() を通る。
 */
export class PlayerPanel {
  readonly game: Game;
  readonly el: HTMLElement;
  private readonly view: BoardView;
  private readonly scoreEl: HTMLElement;
  private readonly timeEl: HTMLElement;
  private readonly timeBarEl: HTMLElement;
  private readonly messageEl: HTMLElement;
  private readonly resultEl: HTMLElement;
  private ended = false;

  constructor(
    container: HTMLElement,
    private readonly options: PlayerPanelOptions,
  ) {
    this.game = new Game(new Board(options.cells));

    this.el = document.createElement('section');
    this.el.className = 'panel';
    this.el.innerHTML = `
      <header>
        <h2 class="player-name"></h2>
        <div class="hud">
          <div>SCORE <span class="score">0</span></div>
          <div>TIME <span class="time">120.0</span></div>
        </div>
      </header>
      <div class="time-track"><div class="time-bar"></div></div>
      <div class="board-wrap">
        <div class="board"></div>
        <div class="result" hidden></div>
      </div>
      <div class="message"></div>`;
    container.appendChild(this.el);

    const q = (sel: string) => this.el.querySelector(sel) as HTMLElement;
    q('.player-name').textContent = options.title;
    this.scoreEl = q('.score');
    this.timeEl = q('.time');
    this.timeBarEl = q('.time-bar');
    this.messageEl = q('.message');
    this.resultEl = q('.result');

    const snap = this.game.snapshot();
    this.view = new BoardView(q('.board'), snap.rows, snap.cols, (pos) => {
      if (options.interactive) this.click(pos);
    });
    this.view.setDisabled(!options.interactive);
    this.view.render(snap);
  }

  start(): void {
    this.game.start();
    this.tick();
  }

  click(pos: Position): ClickOutcome {
    if (this.game.isOver) return { kind: 'ignored' };
    const before = this.game.snapshot();
    const outcome = this.game.click(pos);

    if (!this.options.interactive) this.view.flashCell(pos, 'ai-click');

    switch (outcome.kind) {
      case 'removed':
        this.view.render(this.game.snapshot());
        this.view.flashRemoved(
          outcome.removed,
          outcome.removed.map((p) => before.cells[p.row][p.col]),
        );
        this.showMessage(`+${outcome.scoreGained}`);
        break;
      case 'penalty':
        this.view.flashCell(pos, 'miss');
        this.showMessage(`ミス！ -${outcome.penaltySec}秒`, true);
        break;
    }
    this.tick();
    return outcome;
  }

  /** 毎フレーム呼ぶ。時間切れ判定と HUD 更新 */
  tick(): void {
    this.game.update();
    this.scoreEl.textContent = String(this.game.score);
    const remain = this.game.remainingMs / 1000;
    this.timeEl.textContent = remain.toFixed(1);
    this.timeBarEl.style.width = `${(remain / this.game.timeLimitSec) * 100}%`;
    this.timeBarEl.classList.toggle('low', remain <= 20);

    if (this.game.isOver && !this.ended) {
      this.ended = true;
      this.view.setDisabled(true);
      this.showResult(this.game.result!);
      this.options.onEnd?.(this.game.result!);
    }
  }

  setHighlight(kind: 'win' | 'lose' | 'draw' | null): void {
    this.el.classList.remove('win', 'lose', 'draw');
    if (kind) this.el.classList.add(kind);
  }

  destroy(): void {
    this.el.remove();
  }

  private showMessage(text: string, isError = false): void {
    this.messageEl.textContent = text;
    this.messageEl.classList.toggle('error', isError);
  }

  private showResult(result: GameResult): void {
    let html = `
      <h3>ゲーム終了</h3>
      <p class="reason">${END_REASON_TEXT[result.reason]}</p>
      <p>最終スコア: <strong>${result.score}</strong></p>`;
    if (result.clearTimeSec !== undefined) {
      html += `<p>クリアタイム: <strong>${result.clearTimeSec.toFixed(1)}</strong> 秒</p>`;
    }
    this.resultEl.innerHTML = html;
    this.resultEl.hidden = false;
  }
}
