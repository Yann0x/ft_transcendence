// RENDER - Helpers de dessin

import { getCtx } from './canvas';

/*
 * Dessine un rectangle
 */
export function drawRect(
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  const ctx = getCtx();
  if (!ctx) return;

  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/*
 * Dessine un cercle
 */
export function drawCircle(
  x: number,
  y: number,
  radius: number,
  color: string
): void {
  const ctx = getCtx();
  if (!ctx) return;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/*
 * Dessine le filet central (ligne pointillee verticale)
 */
export function drawNet(
  x: number,
  viewportHeight: number,
  dashHeight: number,
  dashGap: number,
  color: string = '#333'
): void {
  const ctx = getCtx();
  if (!ctx) return;

  ctx.fillStyle = color;
  for (let y = 0; y < viewportHeight; y += dashHeight + dashGap) {
    ctx.fillRect(x - 1, y, 2, dashHeight);
  }
}

// Options pour drawText
export interface TextOptions {
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

/*
 * Dessine du texte
 */
export function drawText(
  text: string,
  x: number,
  y: number,
  options: TextOptions = {}
): void {
  const ctx = getCtx();
  if (!ctx) return;

  const {
    font = '32px system-ui, sans-serif',
    color = '#fff',
    align = 'center',
    baseline = 'middle'
  } = options;

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
}

// Export groupe
export const Render = {
  drawRect,
  drawCircle,
  drawNet,
  drawText
};
