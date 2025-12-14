// DEBUG - Outils de debug pour le developpement

import { drawText } from './render';

// --- FLAGS ---

export let showFPS = false;
export let showHitboxes = false;

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

/*
 * Affiche les controles en bas a gauche
 */
export function drawControls(viewportHeight: number): void {
  const controls = [
    'W/S - Player 1',
    'Arrows - Player 2 (2P mode)',
    'SPACE - Start/Restart',
    'A - Toggle AI/2P',
    'R - Reset ball',
    'F - Toggle FPS',
    'H - Toggle Hitboxes'
  ];
  const lineHeight = 16;
  const startY = viewportHeight - controls.length * lineHeight - 10;
  for (let i = 0; i < controls.length; i++) {
    drawText(controls[i], 10, startY + i * lineHeight, { font: '12px system-ui', color: '#3f3f3f', align: 'left' });
  }
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

// Export groupe
export const Debug = {
  showFPS,
  showHitboxes,
  updateFps,
  drawFps,
  toggleFPS,
  toggleHitboxes
};
