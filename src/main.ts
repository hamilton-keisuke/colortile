import './style.css';
import { AIController } from './ai/AIController';
import { AIPlayer, GreedyAI, RandomAI } from './ai/AIPlayer';
import { BoardGenerator, seededRandom } from './core/BoardGenerator';
import { judgeMatch } from './core/match';
import { ClickOutcome } from './core/Game';
import { TILE_COLORS } from './core/types';
import { COLOR_HEX } from './ui/BoardView';
import { PlayerPanel } from './ui/PlayerPanel';
import { SoundPlayer } from './ui/SoundPlayer';

type Mode = 'solo' | 'versus';

interface Difficulty {
  label: string;
  createAI: () => AIPlayer;
  intervalMs: number;
}

const DIFFICULTIES: Record<string, Difficulty> = {
  easy: { label: 'かんたん', createAI: () => new RandomAI(), intervalMs: 1500 },
  normal: { label: 'ふつう', createAI: () => new GreedyAI(), intervalMs: 900 },
  hard: { label: 'つよい', createAI: () => new GreedyAI(), intervalMs: 450 },
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const titleScreenEl = $('title-screen');
const gameScreenEl = $('game-screen');
const panelsEl = $('panels');
const bannerEl = $('banner');
const playBtn = $<HTMLButtonElement>('play');
const backBtn = $<HTMLButtonElement>('back-to-title');
const difficultyEl = $<HTMLSelectElement>('difficulty');
const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');

let mode: Mode = 'versus';
let panels: PlayerPanel[] = [];
let aiController: AIController | null = null;
let countdownTimer: number | null = null;
const countdownEl = $('countdown');
const sound = new SoundPlayer();

/** 自分のクリック結果に応じた効果音（持ち時間が減るミスだけ failure） */
function playClickSound(outcome: ClickOutcome): void {
  if (outcome.kind === 'penalty') sound.play('failure');
  else if (outcome.kind === 'removed') sound.play('success');
  // 'ignored'（タイルのあるマス・開始前・終了後）は何も起こらないので鳴らさない
}

function clearMatch(): void {
  stopCountdown();
  aiController?.stop();
  aiController = null;
  panels.forEach((p) => p.destroy());
  panels = [];
  bannerEl.hidden = true;
}

function startSolo(): void {
  clearMatch();
  const cells = new BoardGenerator().generate();
  panels = [
    new PlayerPanel(panelsEl, {
      title: 'あなた',
      cells,
      interactive: true,
      onHumanClick: playClickSound,
    }),
  ];
  const solo = panels[0];
  runCountdown(3, () => solo.start());
}

function startVersus(): void {
  clearMatch();
  // 同じシードから同じ盤面を 2 つ作る
  const seed = Math.floor(Math.random() * 2 ** 32);
  const makeCells = () => new BoardGenerator(undefined, seededRandom(seed)).generate();
  const difficulty = DIFFICULTIES[difficultyEl.value];
  const ai = difficulty.createAI();

  const onEnd = () => {
    if (panels.every((p) => p.game.isOver)) showMatchResult();
  };
  const human = new PlayerPanel(panelsEl, {
    title: 'あなた',
    cells: makeCells(),
    interactive: true,
    onEnd,
    onHumanClick: playClickSound,
  });
  const cpu = new PlayerPanel(panelsEl, {
    title: `${ai.name}（${difficulty.label}）`,
    cells: makeCells(),
    interactive: false,
    onEnd,
  });
  panels = [human, cpu];

  aiController = new AIController(
    ai,
    difficulty.intervalMs,
    () => cpu.game.snapshot(),
    (pos) => cpu.click(pos),
    () => cpu.game.isOver,
  );

  // 3・2・1 のカウントダウン後に両者同時スタート
  runCountdown(3, () => {
    human.start();
    cpu.start();
    aiController?.start();
  });
}

function runCountdown(from: number, onDone: () => void): void {
  let n = from;
  countdownEl.textContent = String(n);
  countdownEl.hidden = false;
  countdownTimer = window.setInterval(() => {
    n--;
    if (n > 0) {
      countdownEl.textContent = String(n);
      return;
    }
    stopCountdown();
    onDone();
  }, 1000);
}

function stopCountdown(): void {
  if (countdownTimer !== null) clearInterval(countdownTimer);
  countdownTimer = null;
  countdownEl.hidden = true;
}

function showMatchResult(): void {
  const [human, cpu] = panels;
  const winner = judgeMatch(human.game.result!, cpu.game.result!);
  const text = { player1: 'あなたの勝ち！', player2: 'AIの勝ち…', draw: '引き分け' }[winner];
  human.setHighlight(winner === 'player1' ? 'win' : winner === 'draw' ? 'draw' : 'lose');
  cpu.setHighlight(winner === 'player2' ? 'win' : winner === 'draw' ? 'draw' : 'lose');
  bannerEl.textContent = `${text}　${human.game.score} - ${cpu.game.score}`;
  bannerEl.className = `banner ${winner}`;
  bannerEl.hidden = false;
}

/* ---------- 画面遷移 ---------- */

function showTitle(): void {
  clearMatch();
  document.body.classList.remove('versus');
  gameScreenEl.hidden = true;
  titleScreenEl.hidden = false;
}

function play(): void {
  titleScreenEl.hidden = true;
  gameScreenEl.hidden = false;
  document.body.classList.toggle('versus', mode === 'versus');
  if (mode === 'solo') startSolo();
  else startVersus();
}

/** タイトル画面のモード切替。ひとりでのときは AI の強さを選べない */
function setMode(next: Mode): void {
  mode = next;
  modeButtons.forEach((b) => {
    const active = b.dataset.mode === mode;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
  difficultyEl.disabled = mode === 'solo';
}

function loop(): void {
  panels.forEach((p) => p.tick());
  requestAnimationFrame(loop);
}

/* ---------- 初期化 ---------- */

for (const [key, d] of Object.entries(DIFFICULTIES)) {
  difficultyEl.add(new Option(d.label, key, false, key === 'normal'));
}

// タイトル画面の飾りタイル（全10色）
const titleTilesEl = $('title-tiles');
for (const color of TILE_COLORS) {
  const tile = document.createElement('span');
  tile.className = 'title-tile';
  tile.style.setProperty('--tile-color', COLOR_HEX[color]);
  titleTilesEl.appendChild(tile);
}

modeButtons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as Mode)));
playBtn.addEventListener('click', play);
backBtn.addEventListener('click', showTitle);
// ボタン（モード切替・Play・タイトルに戻る）のクリック音
document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('button')) sound.play('success');
});

setMode('versus');
showTitle();
loop();
