// PONG GAME

import { createCanvas, getCtx } from './canvas';
import { State, type GameState } from './state';

/*
 * Initialise le jeu dans le conteneur donne
 */
export function init(container: HTMLElement): void {
  createCanvas(container);
  State.init();

  const state = State.getState();
  if (state) {
    render(state);
    console.log(`Pong initialise: ${state.viewport.width}x${state.viewport.height} (DPR: ${window.devicePixelRatio})`);
  }
}

/*
 * Affiche le jeu - lit state
 */
export function render(state: GameState): void {
  const ctx = getCtx();
  if (!ctx) return;

  const { width: w, height: h } = state.viewport;

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  if (state.phase === 'ready') {
    ctx.fillStyle = '#525252';
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ready', w / 2, h / 2);
  }
}

// Export group pour import dans app.ts
export const PongGame = {
  init,
  render
};
