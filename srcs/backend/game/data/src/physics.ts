// PHYSICS - Systemes de physique du jeu

import type { GameState } from './state.js';
import { resetBall } from './state.js';
import type { Ball, Paddle } from './config.js';
import { PADDLE_SPEED, BALL_SPEED, WIN_SCORE } from './config.js';

/*
 * Met a jour la position de la balle
 */
export function updateBall(state: GameState, dt: number): void {
  if (state.phase !== 'playing') return;

  const { ball } = state;
  const dtSec = dt / 1000;

  ball.x += ball.vx * dtSec;
  ball.y += ball.vy * dtSec;
}

/*
 * Rebond sur les murs haut/bas
 */
export function bounceWalls(state: GameState): void {
  if (state.phase !== 'playing') return;

  const { ball, viewport } = state;

  if (ball.y - ball.radius <= 0 && ball.vy < 0) {
    ball.y = ball.radius;
    ball.vy = -ball.vy;
  }
  if (ball.y + ball.radius >= viewport.height && ball.vy > 0) {
    ball.y = viewport.height - ball.radius;
    ball.vy = -ball.vy;
  }
}

/*
 * Met a jour la position des paddles selon les inputs
 */
export function updatePaddles(state: GameState, dt: number): void {
  if (state.phase !== 'playing') return;

  const { paddles, viewport, inputs } = state;
  const dtSec = dt / 1000;
  const move = PADDLE_SPEED * dtSec;

  // Player 1 (left)
  if (inputs[0].up) paddles[0].y -= move;
  if (inputs[0].down) paddles[0].y += move;

  // Player 2 (right)
  if (inputs[1].up) paddles[1].y -= move;
  if (inputs[1].down) paddles[1].y += move;

  // Clamp aux limites
  for (const p of paddles) {
    if (p.y < 0) p.y = 0;
    if (p.y + p.height > viewport.height) p.y = viewport.height - p.height;
  }
}

/*
 * Collision cercle vs rectangle (AABB)
 */
function circleRectCollision(ball: Ball, rect: Paddle): boolean {
  const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.height));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return (dx * dx + dy * dy) < (ball.radius * ball.radius);
}

/*
 * Rebond sur les paddles
 */
export function bouncePaddles(state: GameState): void {
  if (state.phase !== 'playing') return;

  const { ball, paddles } = state;

  for (let i = 0; i < 2; i++) {
    const paddle = paddles[i];
    const isLeft = i === 0;

    // Check direction (balle doit aller vers le paddle)
    if (isLeft && ball.vx > 0) continue;
    if (!isLeft && ball.vx < 0) continue;

    if (!circleRectCollision(ball, paddle)) continue;

    // Push-out : replacer la balle hors du paddle
    if (isLeft) {
      ball.x = paddle.x + paddle.width + ball.radius;
    } else {
      ball.x = paddle.x - ball.radius;
    }

    // Angle selon point d'impact (-1 = haut, 0 = centre, 1 = bas)
    const paddleCenter = paddle.y + paddle.height / 2;
    const hitOffset = (ball.y - paddleCenter) / (paddle.height / 2);
    const maxAngle = Math.PI / 4; // 45 degres max
    const angle = hitOffset * maxAngle;

    // Nouvelle direction
    const direction = isLeft ? 1 : -1;
    ball.vx = direction * Math.cos(angle) * BALL_SPEED;
    ball.vy = Math.sin(angle) * BALL_SPEED;
  }
}

/*
 * Detecte les goals et met a jour le score
 */
export function checkGoal(state: GameState): void {
  if (state.phase !== 'playing') return;

  const { ball, viewport, score } = state;

  // Sortie a gauche = point pour right
  if (ball.x + ball.radius < 0) {
    score.right++;
    state.lastScorer = 'right';
    if (score.right >= WIN_SCORE) {
      state.phase = 'ended';
    } else {
      resetBall(state, false); // serve vers la gauche (perdant)
    }
    return;
  }

  // Sortie a droite = point pour left
  if (ball.x - ball.radius > viewport.width) {
    score.left++;
    state.lastScorer = 'left';
    if (score.left >= WIN_SCORE) {
      state.phase = 'ended';
    } else {
      resetBall(state, true); // serve vers la droite (perdant)
    }
  }
}

/*
 * Tick physique complet
 */
export function physicsTick(state: GameState, dt: number): void {
  updateBall(state, dt);
  bounceWalls(state);
  updatePaddles(state, dt);
  bouncePaddles(state);
  checkGoal(state);
}
