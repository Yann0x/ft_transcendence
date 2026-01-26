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
  color: string = '#555'
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

/*
 * Dessine un paddle avec coins arrondis et glow
 */
export function drawPaddle(
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  glowColor: string
): void {
  const ctx = getCtx();
  if (!ctx) return;

  const radius = 2;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // Réinitialiser le shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/*
 * Dessine la balle avec un glow
 */
export function drawBall(x: number, y: number, radius: number): void {
  const ctx = getCtx();
  if (!ctx) return;

  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Réinitialiser le shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/*
 * Dessine une jauge de score (slots)
 */
export function drawScoreGauge(
  x: number,
  y: number,
  currentScore: number,
  maxScore: number,
  color: string,
  glowColor: string
): void {
  const ctx = getCtx();
  if (!ctx) return;

  const slotWidth = 12;
  const slotHeight = 6;
  const gap = 3;
  const totalWidth = maxScore * (slotWidth + gap) - gap;
  const startX = x - totalWidth / 2;

  for (let i = 0; i < maxScore; i++) {
    const slotX = startX + i * (slotWidth + gap);
    const isFilled = i < currentScore;

    if (isFilled) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 4;
      ctx.fillStyle = color;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    }

    ctx.fillRect(slotX, y, slotWidth, slotHeight);
  }

  // Réinitialiser le shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/*
 * Dessine un message de fin de partie stylisé
 */
export function drawEndMessage(
  x: number,
  y: number,
  mainText: string,
  subText: string,
  isVictory: boolean
): void {
  const ctx = getCtx();
  if (!ctx) return;

  const boxColor = isVictory ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';
  const borderColor = isVictory ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  const glowColor = isVictory ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
  const textColor = isVictory ? '#10b981' : '#ef4444';

  // Fond avec bordure
  const padding = 40;
  const boxWidth = 400;
  const boxHeight = 120;
  const boxX = x - boxWidth / 2;
  const boxY = y - boxHeight / 2;

  ctx.fillStyle = boxColor;
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 20;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  // Reset shadow pour le texte
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Texte principal
  ctx.fillStyle = textColor;
  ctx.font = 'bold 32px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mainText, x, y - 15);

  // Sous-texte
  ctx.fillStyle = '#999';
  ctx.font = '18px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.fillText(subText, x, y + 20);
}

/*
 * Dessine l'indicateur de mode de jeu stylisé
 */
export function drawModeIndicator(
  x: number,
  y: number,
  text: string,
  color: string = '#fff'
): void {
  const ctx = getCtx();
  if (!ctx) return;

  // Texte avec ombre prononcée (pas de cadre)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.font = 'bold 20px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);

  // Réinitialiser le shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/*
 * Dessine un message d'information stylisé (pause, ready, etc.)
 */
export function drawInfoMessage(
  x: number,
  y: number,
  mainText: string,
  subText?: string,
  color: string = '#fff'
): void {
  const ctx = getCtx();
  if (!ctx) return;

  // Texte principal avec ombre/glow prononcé (pas de cadre)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = color;
  ctx.font = 'bold 36px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const mainY = subText ? y - 15 : y;
  ctx.fillText(mainText, x, mainY);

  // Sous-texte si fourni avec ombre
  if (subText) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#fff';
    ctx.font = '17px "Inter", "Segoe UI", system-ui, sans-serif';
    ctx.fillText(subText, x, y + 20);
  }

  // Réinitialiser le shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

// export group
export const Render = {
  drawRect,
  drawCircle,
  drawNet,
  drawText,
  drawPaddle,
  drawBall,
  drawScoreGauge,
  drawEndMessage,
  drawModeIndicator,
  drawInfoMessage
};
