import './style.css';
import { AIController } from './ai/AIController';
import { AIPlayer, GreedyAI, RandomAI } from './ai/AIPlayer';
import { BoardGenerator, seededRandom } from './core/BoardGenerator';
import { judgeMatch } from './core/match';
import { PlayerPanel } from './ui/PlayerPanel';

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
const panelsEl = $('panels');
const bannerEl = $('banner');
const startBtn = $<HTMLButtonElement>('start');
const difficultyEl = $<HTMLSelectElement>('difficulty');
const difficultyWrap = $('difficulty-wrap');
const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');

let mode: Mode = 'versus';
let panels: PlayerPanel[] = [];
let aiController: AIController | null = null;
let countdownTimer: number | null = null;
const countdownEl = $('countdown');

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
  panels = [new PlayerPanel(panelsEl, { title: 'あなた', cells, interactive: true })];
  panels[0].start();
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

function start(): void {
  if (mode === 'solo') startSolo();
  else startVersus();
}

function setMode(next: Mode): void {
  mode = next;
  modeButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  difficultyWrap.hidden = mode !== 'versus';
  document.body.classList.toggle('versus', mode === 'versus');
  start();
}

function loop(): void {
  panels.forEach((p) => p.tick());
  requestAnimationFrame(loop);
}

for (const [key, d] of Object.entries(DIFFICULTIES)) {
  difficultyEl.add(new Option(d.label, key, false, key === 'normal'));
}
modeButtons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as Mode)));
startBtn.addEventListener('click', start);
difficultyEl.addEventListener('change', start);

setMode('versus');
loop();
