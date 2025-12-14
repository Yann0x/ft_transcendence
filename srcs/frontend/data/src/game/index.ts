// PONG GAME

import { createCanvas, getCtx } from './canvas';
import { State, setPhase, resetBall, type GameState } from './state';
import { drawRect, drawCircle, drawNet, drawText } from './render';
import { Clock } from './clock';
import { update, addSystem, clearSystems } from './update';
import { updateFps, drawFps, drawControls, toggleFPS, toggleHitboxes, showHitboxes } from './debug';
import { updateBall, bounceWalls, updatePaddles, bouncePaddles, checkGoal } from './systems';
import { WIN_SCORE } from './config';
import { bindKeyboard, toggleAI, isAIMode } from './input';
import { updateAI, resetAI } from './ai';

let running = false;

/*
 * Initialise le jeu dans le conteneur donne
 */
export function init(container: HTMLElement): void {
  createCanvas(container);
  State.init();
  Clock.init();

  clearSystems();
  addSystem(updatePaddles);
  addSystem(updateBall);
  addSystem(bounceWalls);
  addSystem(bouncePaddles);
  addSystem(checkGoal);

  if (!running) {
    bindKeyboard();
    bindKeys();
    running = true;
    requestAnimationFrame(gameLoop);
  }
}

function bindKeys(): void {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f') toggleFPS();
    if (e.key === 'h') toggleHitboxes();
    if (e.key === 'r') resetBall();
    if (e.key === ' ') startGame();
    if (e.key === 'a') toggleAI();
  });
}

function startGame(): void {
  const state = State.getState();
  if (!state) return;
  if (state.phase === 'ready') {
    setPhase('playing');
  } else if (state.phase === 'ended') {
    State.init();
    resetAI();
    setPhase('playing');
  }
}

/*
 * Boucle principale du jeu
 */
function gameLoop(): void {
  if (!running) return;

  const state = State.getState();
  if (!state) return;

  const now = performance.now();
  const dt = Clock.tick();
  updateFps(now);

  if (isAIMode()) {
    updateAI(state, now);
  }

  update(state, dt);
  render(state);
  drawFps();

  requestAnimationFrame(gameLoop);
}

/*
 * Affiche le jeu - lit state
 */
export function render(state: GameState): void {
  const ctx = getCtx();
  if (!ctx) return;

  const { width: w, height: h } = state.viewport;

  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  // Net
  drawNet(state.net.x, h, state.net.dashHeight, state.net.dashGap);

  // Score
  drawText(String(state.score.left), w / 4, 50, { font: 'bold 48px system-ui', color: '#333' });
  drawText(String(state.score.right), (w * 3) / 4, 50, { font: 'bold 48px system-ui', color: '#333' });

  // Paddles
  for (const p of state.paddles) {
    drawRect(p.x, p.y, p.width, p.height, '#fff');
  }

  // Ball
  drawCircle(state.ball.x, state.ball.y, state.ball.radius, '#fff');

  // Hitboxes debug
  if (showHitboxes) {
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.stroke();
    for (const p of state.paddles) {
      ctx.strokeRect(p.x, p.y, p.width, p.height);
    }
  }

  // Mode indicator
  const modeText = isAIMode() ? 'vs AI' : '2P';
  drawText(modeText, w / 2, 30, { font: '16px system-ui', color: '#525252' });

  // Phase text
  if (state.phase === 'ready') {
    drawText('Press SPACE to start', w / 2, h / 2, { color: '#525252', font: 'bold 24px system-ui' });
    drawText('[A] toggle AI', w / 2, h / 2 + 40, { color: '#3f3f3f', font: '14px system-ui' });
  } else if (state.phase === 'ended') {
    const winner = state.score.left >= WIN_SCORE ? 'Left' : 'Right';
    drawText(`${winner} wins!`, w / 2, h / 2 - 20, { color: '#fff', font: 'bold 32px system-ui' });
    drawText('Press SPACE to restart', w / 2, h / 2 + 20, { color: '#525252', font: '20px system-ui' });
  }

  // Controls help
  drawControls(h);
}

// Export group pour import dans app.ts
export const PongGame = {
  init,
  render
};
