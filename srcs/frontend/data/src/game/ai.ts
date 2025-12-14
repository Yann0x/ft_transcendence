// AI - Intelligence artificielle pour le paddle droit

import type { GameState } from './state';
import { BALL_RADIUS, AI_PERCEPTION_INTERVAL, AI_ERROR_RANGE } from './config';

let lastPerceptionTime = 0;
let targetY: number | null = null;
let aiInput = { up: false, down: false };

/*
 * Predit ou la balle arrivera au niveau du paddle droit
 * Simule les rebonds sur les murs
 */
function predictBallY(state: GameState): number {
  const { ball, viewport, paddles } = state;
  const paddleX = paddles[1].x;

  // Si la balle va vers la gauche, retourne au centre : peut etre faudrait retirer ca, c'est une logique trop intelligente pour une ia sans niveaux de difficultes
  if (ball.vx < 0) {
    return viewport.height / 2;
  }

  // Simulation de la trajectoire
  let x = ball.x;
  let y = ball.y;
  let vy = ball.vy;
  const vx = ball.vx;
  const timeToReach = (paddleX - x) / vx;
  if (timeToReach < 0) return viewport.height / 2;
  y += vy * timeToReach;
  while (y < BALL_RADIUS || y > viewport.height - BALL_RADIUS) {
    if (y < BALL_RADIUS) {
      y = BALL_RADIUS + (BALL_RADIUS - y);
      vy = -vy;
    }
    if (y > viewport.height - BALL_RADIUS) {
      y = (viewport.height - BALL_RADIUS) - (y - (viewport.height - BALL_RADIUS));
      vy = -vy;
    }
  }
  return y;
}

/*
 * Perception - appelee a chaque frame mais ne met a jour que toutes les PERCEPTION_INTERVAL millisecondes 
 */
function perceive(state: GameState, now: number): void {
  if (now - lastPerceptionTime < AI_PERCEPTION_INTERVAL) return;
  lastPerceptionTime = now;
  const predictedY = predictBallY(state);

  // Tentative pour rendre IA plus faible, ajouter une erreur aleatoire
  const error = (Math.random() * 2 - 1) * AI_ERROR_RANGE;
  targetY = predictedY + error;
}

/*
 * Action - genere les inputs up/down pour atteindre la cible
 */
function act(state: GameState): void {
  const paddle = state.paddles[1];
  const paddleCenter = paddle.y + paddle.height / 2;

  aiInput.up = false;
  aiInput.down = false;

  if (targetY === null) return;

  const deadzone = 5; // evite le jitter
  if (paddleCenter < targetY - deadzone) {
    aiInput.down = true;
  } else if (paddleCenter > targetY + deadzone) {
    aiInput.up = true;
  }
}

/*
 * Update principal de l'IA - appele a chaque frame
 */
export function updateAI(state: GameState, now: number): void {
  if (state.phase !== 'playing') {
    aiInput.up = false;
    aiInput.down = false;
    targetY = null;
    return;
  }

  perceive(state, now);
  act(state);
}

/*
 * Retourne les inputs de l'IA (pour remplacer p2)
 */
export function getAIInput(): { up: boolean; down: boolean } {
  return aiInput;
}

/*
 * Reset l'etat de l'IA
 */
export function resetAI(): void {
  lastPerceptionTime = 0;
  targetY = null;
  aiInput = { up: false, down: false };
}
