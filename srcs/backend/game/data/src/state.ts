/* STATE */

import {
  type Ball, type Paddle,
  BALL_RADIUS, BALL_INITIAL_SPEED,
  PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_MARGIN,
  VIEWPORT_WIDTH, VIEWPORT_HEIGHT
} from './config.js';

/* TYPES */

export type GamePhase = 'waiting' | 'ready' | 'playing' | 'paused' | 'ended';

export interface Viewport {
  width: number;
  height: number;
}

export interface Score {
  left: number;
  right: number;
}

export interface PlayerInput {
  up: boolean;
  down: boolean;
}

export interface GameState {
  viewport: Viewport;
  phase: GamePhase;
  endReason?: 'forfeit' | 'score';
  ball: Ball;
  paddles: [Paddle, Paddle];
  score: Score;
  lastScorer: 'left' | 'right' | null;
  inputs: [PlayerInput, PlayerInput];
  ballFrozenUntil: number;
}

/* HELPERS */

function velocityFromAngle(speed: number, angle: number): { vx: number; vy: number } {
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  };
}

function randomStartAngle(): number {
  const maxAngle = Math.PI / 9;
  const angle = (Math.random() * 2 - 1) * maxAngle;
  const goRight = Math.random() > 0.5;
  return goRight ? angle : Math.PI + angle;
}

/* CREATE */

export function createGameState(): GameState {
  const w = VIEWPORT_WIDTH;
  const h = VIEWPORT_HEIGHT;
  const { vx, vy } = velocityFromAngle(BALL_INITIAL_SPEED, randomStartAngle());

  return {
    viewport: { width: w, height: h },
    phase: 'waiting',
    endReason: undefined,
    ball: {
      x: w / 2,
      y: h / 2,
      radius: BALL_RADIUS,
      vx,
      vy
    },
    paddles: [
      {
        x: PADDLE_MARGIN,
        y: h / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT
      },
      {
        x: w - PADDLE_MARGIN - PADDLE_WIDTH,
        y: h / 2 - PADDLE_HEIGHT / 2,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT
      }
    ],
    score: { left: 0, right: 0 },
    lastScorer: null,
    inputs: [
      { up: false, down: false },
      { up: false, down: false }
    ],
    ballFrozenUntil: 0
  };
}

/* RESET BALL */

const BALL_RESPAWN_DELAY = 1000;

export function resetBall(state: GameState, serveToRight?: boolean): void {
  const w = state.viewport.width;
  const h = state.viewport.height;
  const maxAngle = Math.PI / 9;
  const angle = (Math.random() * 2 - 1) * maxAngle;
  const direction = serveToRight ?? Math.random() > 0.5;
  const finalAngle = direction ? angle : Math.PI + angle;
  const { vx, vy } = velocityFromAngle(BALL_INITIAL_SPEED, finalAngle);

  state.ball.x = w / 2;
  state.ball.y = h / 2;
  state.ball.vx = vx;
  state.ball.vy = vy;
  state.ballFrozenUntil = Date.now() + BALL_RESPAWN_DELAY;
}
