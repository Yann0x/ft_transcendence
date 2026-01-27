/* AI */

import type { GameState } from './state.js';
import { BALL_RADIUS, VIEWPORT_HEIGHT, AI_SETTINGS, type AIDifficulty } from './config.js';

/* TYPES */

export interface AIState {
  lastPerceptionTime: number;
  targetY: number | null;
  input: { up: boolean; down: boolean };
  difficulty: AIDifficulty;
}

/* CREATE */

export function createAIState(difficulty: AIDifficulty = 'hard'): AIState {
  return {
    lastPerceptionTime: 0,
    targetY: null,
    input: { up: false, down: false },
    difficulty
  };
}

/* PREDICTION */

/* Prédit la position Y de la balle à l'arrivée sur la raquette */
function predictBallY(state: GameState): number {
  const { ball, paddles } = state;
  const paddleX = paddles[1].x;

  if (ball.vx < 0) {
    return VIEWPORT_HEIGHT / 2;
  }

  let y = ball.y;
  let vy = ball.vy;
  const vx = ball.vx;
  const timeToReach = (paddleX - ball.x) / vx;

  if (timeToReach < 0) return VIEWPORT_HEIGHT / 2;

  y += vy * timeToReach;

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

/* UPDATE */

/* Met à jour l'IA avec marge d'erreur selon la difficulté */
export function updateAI(ai: AIState, state: GameState, now: number): void {
  if (state.phase !== 'playing') {
    ai.input.up = false;
    ai.input.down = false;
    ai.targetY = null;
    return;
  }

  const settings = AI_SETTINGS[ai.difficulty];

  if (now - ai.lastPerceptionTime >= settings.perceptionInterval) {
    ai.lastPerceptionTime = now;
    const predictedY = predictBallY(state);
    const error = (Math.random() * 2 - 1) * settings.errorRange;
    ai.targetY = predictedY + error;
  }

  ai.input.up = false;
  ai.input.down = false;

  if (ai.targetY === null) return;

  const paddle = state.paddles[1];
  const paddleCenter = paddle.y + paddle.height / 2;

  if (paddleCenter < ai.targetY - settings.deadzone) {
    ai.input.down = true;
  } else if (paddleCenter > ai.targetY + settings.deadzone) {
    ai.input.up = true;
  }
}

/* INPUT */

export function getAIInput(ai: AIState): { up: boolean; down: boolean } {
  return ai.input;
}
