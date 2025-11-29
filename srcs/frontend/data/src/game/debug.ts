// DEBUG - Outils de debug pour le developpement

import { drawText } from './render';

// --- FLAGS ---

export let showFPS = false;
export let showHitboxes = false;
export let slowMo = false;
export const SLOW_MO_FACTOR = 0.25; // 25% de la vitesse normale

// --- FPS COUNTER ---

let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 0;

/*
 * Met a jour le compteur FPS
 * Appeler a chaque frame avec le timestamp actuel
 */
export function updateFps(now: number): void {
  frameCount++;
  if (now - lastFpsUpdate >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

/*
 * Affiche le FPS en haut a gauche
 */
export function drawFps(): void {
  if (!showFPS) return;
  drawText(`${currentFps} FPS`, 10, 20, {
    font: '14px monospace',
    color: '#0f0',
    align: 'left',
    baseline: 'top'
  });
}

// --- TOGGLES ---

export function toggleFPS(): void {
  showFPS = !showFPS;
  console.log(`Debug: showFPS = ${showFPS}`);
}

export function toggleHitboxes(): void {
  showHitboxes = !showHitboxes;
  console.log(`Debug: showHitboxes = ${showHitboxes}`);
}

export function toggleSlowMo(): void {
  slowMo = !slowMo;
  console.log(`Debug: slowMo = ${slowMo}`);
}

/*
 * Applique le facteur slowMo au dt si actif
 */
export function applySlowMo(dt: number): number {
  return slowMo ? dt * SLOW_MO_FACTOR : dt;
}

// Export groupe
export const Debug = {
  showFPS,
  showHitboxes,
  slowMo,
  SLOW_MO_FACTOR,
  updateFps,
  drawFps,
  toggleFPS,
  toggleHitboxes,
  toggleSlowMo,
  applySlowMo
};
