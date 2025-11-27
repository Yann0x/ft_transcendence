// PONG GAME

import { createCanvas, getCtx, getWidth, getHeight } from './canvas';

/*
 * Initialise le jeu dans le conteneur donne
 */
export function init(container: HTMLElement): void {
  createCanvas(container);
  render();

  const w = getWidth(); // largeur log
  const h = getHeight(); // hauteur log
  console.log(`🎮 Pong initialise: ${w}x${h} (DPR: ${window.devicePixelRatio})`);
}

/*
 * Affiche le jeu
 */
export function render(): void {
  const ctx = getCtx(); // contexte 2D
  if (!ctx) return;

  const w = getWidth(); // largeur canva
  const h = getHeight(); // hauteur canva

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#525252';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ready', w / 2, h / 2);
}

// Export group pour import dans app.ts
export const PongGame = {
  init,
  render
};
