// DEBUG - debug tools for development

import { drawText } from './render';

// --- FLAGS ---

export let showFPS = false;
export let showHitboxes = false;

// --- FPS COUNTER ---

let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 0;

// update FPS counter
// call each frame with the current timestamp
export function updateFps(now: number): void {
  frameCount++;
  if (now - lastFpsUpdate >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

// display FPS in top left corner
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

// export group
export const Debug = {
  showFPS,
  showHitboxes,
  updateFps,
  drawFps,
  toggleFPS,
  toggleHitboxes
};
