// RENDER - drawing helpers

import { getCtx } from './canvas';

// draw a rectangle
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

// draw a circle
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

// draw the center net (vertical dashed line)
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

// options for drawText
export interface TextOptions {
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

// draw text
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

// export group
export const Render = {
  drawRect,
  drawCircle,
  drawNet,
  drawText
};
