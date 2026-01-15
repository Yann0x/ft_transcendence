import type { GameState } from './state.js';
import { resetBall } from './state.js';
import type { Ball, Paddle } from './config.js';
import { PADDLE_SPEED, WIN_SCORE, BALL_ACCELERATION, BALL_MAX_SPEED } from './config.js';

export function updateBall(state: GameState, dt: number): void {
  if (state.phase !== 'playing') return;

  // Delai apres un but avant de relancer la balle
  if (state.ballFrozenUntil > 0 && Date.now() < state.ballFrozenUntil) {
    return;
  }
  state.ballFrozenUntil = 0;

  const { ball } = state;
  const dtSec = dt / 1000;

  ball.x += ball.vx * dtSec;
  ball.y += ball.vy * dtSec;
}

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

export function updatePaddles(state: GameState, dt: number): void {
  if (state.phase !== 'playing') return;

  const { paddles, viewport, inputs } = state;
  const dtSec = dt / 1000;
  const move = PADDLE_SPEED * dtSec;

  if (inputs[0].up) paddles[0].y -= move;
  if (inputs[0].down) paddles[0].y += move;

  if (inputs[1].up) paddles[1].y -= move;
  if (inputs[1].down) paddles[1].y += move;

  for (const p of paddles) {
    if (p.y < 0) p.y = 0;
    if (p.y + p.height > viewport.height) p.y = viewport.height - p.height;
  }
}

// Collision cercle-rectangle: trouve le point le plus proche du rectangle au cercle
function circleRectCollision(ball: Ball, rect: Paddle): boolean {
  const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.height));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return (dx * dx + dy * dy) < (ball.radius * ball.radius);
}

export function bouncePaddles(state: GameState): void {
  if (state.phase !== 'playing') return;

  const { ball, paddles } = state;

  for (let i = 0; i < 2; i++) {
    const paddle = paddles[i];
    if (!paddle) continue;
    const isLeft = i === 0;

    if (isLeft && ball.vx > 0) continue;
    if (!isLeft && ball.vx < 0) continue;

    if (!circleRectCollision(ball, paddle)) continue;

    if (isLeft) {
      ball.x = paddle.x + paddle.width + ball.radius;
    } else {
      ball.x = paddle.x - ball.radius;
    }

    // L'angle de rebond depend de ou la balle touche le paddle
    const paddleCenter = paddle.y + paddle.height / 2;
    const hitOffset = (ball.y - paddleCenter) / (paddle.height / 2); // -1 a 1
    const maxAngle = Math.PI / 4; // 45 degres max
    const angle = hitOffset * maxAngle;

    // Calculer la vitesse actuelle pour l'acceleration
    const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const newSpeed = Math.min(currentSpeed * BALL_ACCELERATION, BALL_MAX_SPEED);

    const direction = isLeft ? 1 : -1;
    ball.vx = direction * Math.cos(angle) * newSpeed;
    ball.vy = Math.sin(angle) * newSpeed;
  }
}

export function checkGoal(state: GameState): void {
  if (state.phase !== 'playing') return;

  const { ball, viewport, score } = state;

  if (ball.x + ball.radius < 0) {
    score.right++;
    state.lastScorer = 'right';
    if (score.right >= WIN_SCORE) {
      state.phase = 'ended';
      state.endReason = 'score';
    } else {
      resetBall(state, false);
    }
    return;
  }

  if (ball.x - ball.radius > viewport.width) {
    score.left++;
    state.lastScorer = 'left';
    if (score.left >= WIN_SCORE) {
      state.phase = 'ended';
      state.endReason = 'score';
    } else {
      resetBall(state, true);
    }
  }
}

export function physicsTick(state: GameState, dt: number): void {
  updateBall(state, dt);
  bounceWalls(state);
  updatePaddles(state, dt);
  bouncePaddles(state);
  checkGoal(state);
}
