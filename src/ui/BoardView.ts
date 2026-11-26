import { BoardSnapshot, Position, TileColor } from '../core/types';

export const COLOR_HEX: Record<TileColor, string> = {
  red: '#e53935',
  pink: '#f48fb1',
  orange: '#fb8c00',
  blue: '#1e56c8',
  lightblue: '#4fc3f7',
  purple: '#8e44ad',
  lightgreen: '#8bc34a',
  beige: '#e8d5a9',
  brown: '#8d5524',
  gray: '#9e9e9e',
};

/**
 * 盤面を DOM に描画し、クリックを座標に変換して通知する。
 * ゲームロジックは持たない。
 */
export class BoardView {
  private readonly cellEls: HTMLDivElement[][] = [];

  constructor(
    private readonly root: HTMLElement,
    rows: number,
    cols: number,
    private readonly onCellClick: (pos: Position) => void,
  ) {
    root.innerHTML = '';
    root.style.setProperty('--cols', String(cols));
    root.style.setProperty('--rows', String(rows));
    for (let row = 0; row < rows; row++) {
      const line: HTMLDivElement[] = [];
      for (let col = 0; col < cols; col++) {
        const el = document.createElement('div');
        el.className = 'cell';
        el.addEventListener('click', () => this.onCellClick({ row, col }));
        root.appendChild(el);
        line.push(el);
      }
      this.cellEls.push(line);
    }
  }

  render(board: BoardSnapshot): void {
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const color = board.cells[r][c];
        const el = this.cellEls[r][c];
        el.classList.toggle('tile', color !== null);
        // 色だけを CSS 変数で渡し、グラデーションは style.css 側で描く
        if (color) el.style.setProperty('--tile-color', COLOR_HEX[color]);
        else el.style.removeProperty('--tile-color');
      }
    }
  }

  /** 消えたタイルを一瞬表示するエフェクト */
  flashRemoved(positions: readonly Position[], colors: readonly (TileColor | null)[]): void {
    positions.forEach((p, i) => {
      const el = this.cellEls[p.row][p.col];
      const ghost = document.createElement('div');
      ghost.className = 'ghost';
      const color = colors[i];
      if (color) ghost.style.setProperty('--tile-color', COLOR_HEX[color]);
      el.appendChild(ghost);
      ghost.addEventListener('animationend', () => ghost.remove());
    });
  }

  flashCell(pos: Position, className: string): void {
    const el = this.cellEls[pos.row][pos.col];
    el.classList.remove(className);
    void el.offsetWidth; // アニメーションを再始動
    el.classList.add(className);
  }

  setDisabled(disabled: boolean): void {
    this.root.classList.toggle('disabled', disabled);
  }
}
