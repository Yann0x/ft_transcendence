// AI - Intelligence artificielle pour le paddle droit

import type { GameState } from './state.js';
import {
  BALL_RADIUS,
  VIEWPORT_HEIGHT,
  AI_PERCEPTION_INTERVAL,
  AI_ERROR_RANGE,
  AI_DEADZONE
} from './config.js';

export interface AIState {
  lastPerceptionTime: number;
  targetY: number | null;
  input: { up: boolean; down: boolean };
}

/*
 * Cree un nouvel etat AI
 */
export function createAIState(): AIState {
  return {
    lastPerceptionTime: 0,
    targetY: null,
    input: { up: false, down: false }
  };
}

/*
 * Predit ou la balle arrivera au niveau du paddle droit
 */
function predictBallY(state: GameState): number {
  const { ball, paddles } = state;
  const paddleX = paddles[1].x;

  // Si la balle va vers la gauche, retourne au centre
  if (ball.vx < 0) {
    return VIEWPORT_HEIGHT / 2;
  }

  // Simulation de la trajectoire
  let y = ball.y;
  let vy = ball.vy;
  const vx = ball.vx;
  const timeToReach = (paddleX - ball.x) / vx;

  if (timeToReach < 0) return VIEWPORT_HEIGHT / 2;

  y += vy * timeToReach;

  // Rebonds sur les murs
  while (y < BALL_RADIUS || y > VIEWPORT_HEIGHT - BALL_RADIUS) {
    if (y < BALL_RADIUS) {
      y = BALL_RADIUS + (BALL_RADIUS - y);
      vy = -vy;
    }
    if (y > VIEWPORT_HEIGHT - BALL_RADIUS) {
      y = (VIEWPORT_HEIGHT - BALL_RADIUS) - (y - (VIEWPORT_HEIGHT - BALL_RADIUS));
      vy = -vy;
    }
  }
  return y;
}

/*
 * Update l'IA - appele a chaque tick
 */
export function updateAI(ai: AIState, state: GameState, now: number): void {
  if (state.phase !== 'playing') {
    ai.input.up = false;
    ai.input.down = false;
    ai.targetY = null;
    return;
  }

  // Perception (throttled)
  if (now - ai.lastPerceptionTime >= AI_PERCEPTION_INTERVAL) {
    ai.lastPerceptionTime = now;
    const predictedY = predictBallY(state);
    const error = (Math.random() * 2 - 1) * AI_ERROR_RANGE;
    ai.targetY = predictedY + error;
  }

  // Action
  ai.input.up = false;
  ai.input.down = false;

  if (ai.targetY === null) return;

  const paddle = state.paddles[1];
  const paddleCenter = paddle.y + paddle.height / 2;

  if (paddleCenter < ai.targetY - AI_DEADZONE) {
    ai.input.down = true;
  } else if (paddleCenter > ai.targetY + AI_DEADZONE) {
    ai.input.up = true;
  }
}

/*
 * Retourne les inputs de l'IA
 */
export function getAIInput(ai: AIState): { up: boolean; down: boolean } {
  return ai.input;
}
