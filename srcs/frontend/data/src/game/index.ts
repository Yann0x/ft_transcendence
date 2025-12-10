// PONG GAME

import { createCanvas, getCtx } from './canvas';
import { State, type GameState } from './state';
import { drawRect, drawCircle, drawNet, drawText } from './render';
import { Clock } from './clock';
import { update, addSystem, clearSystems } from './update';
import { updateFps, drawFps, toggleFPS } from './debug';
import { updateBall, bounceWalls } from './systems';

let running = false;

/*
 * Initialise le jeu dans le conteneur donne
 */
export function init(container: HTMLElement): void {
  createCanvas(container);
  State.init();
  Clock.init();

  clearSystems();
  addSystem(updateBall);
  addSystem(bounceWalls);

  if (!running) {
    bindDebugKeys();
    running = true;
    requestAnimationFrame(gameLoop);
  }
}

function bindDebugKeys(): void {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f') toggleFPS();
  });
}

/*
 * Boucle principale du jeu
 */
function gameLoop(): void {
  if (!running) return;

  const state = State.getState();
  if (!state) return;

  const dt = Clock.tick();
  updateFps(performance.now());

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

  // Paddles
  for (const p of state.paddles) {
    drawRect(p.x, p.y, p.width, p.height, '#fff');
  }

  // Ball
  drawCircle(state.ball.x, state.ball.y, state.ball.radius, '#fff');

  // Ready text
  if (state.phase === 'ready') {
    drawText('Ready', w / 2, h / 2, { color: '#525252', font: 'bold 32px system-ui' });
  }
}

// Export group pour import dans app.ts
export const PongGame = {
  init,
  render
};
