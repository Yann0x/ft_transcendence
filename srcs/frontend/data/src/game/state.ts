// STATE - Etat central du jeu

import { getWidth, getHeight } from './canvas';
import {
  type Ball, type Paddle, type Net,
  BALL_RADIUS, BALL_SPEED,
  PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_MARGIN,
  NET_DASH_HEIGHT, NET_DASH_GAP
} from './config';

// --- TYPES ---

export type GamePhase = 'ready' | 'playing' | 'paused' | 'ended';

export interface Viewport {
  width: number;
  height: number;
}

export interface Score {
  left: number;
  right: number;
}

export interface GameState {
  viewport: Viewport;
  phase: GamePhase;
  ball: Ball;
  paddles: [Paddle, Paddle];
  net: Net;
  score: Score;
  lastScorer: 'left' | 'right' | null;
}

// --- STATE ---

let state: GameState | null = null;

/*
 * Calcule vx/vy a partir d'un angle en radians
 * 0 = droite, PI = gauche, PI/2 = bas, -PI/2 = haut
 */
function velocityFromAngle(speed: number, angle: number): { vx: number; vy: number } {
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  };
}

/*
 * Retourne un angle de depart aleatoire
 * Evite les angles trop verticaux (entre -45° et 45° vers droite ou gauche)
 */
function randomStartAngle(): number {
  const maxAngle = Math.PI / 6; // 30 degres max
  const angle = (Math.random() * 2 - 1) * maxAngle;
  const goRight = Math.random() > 0.5;
  return goRight ? angle : Math.PI + angle;
}

/*
 * Cree l'etat initial du jeu
 */
export function createInitialState(): GameState {
  const w = getWidth();
  const h = getHeight();
  const { vx, vy } = velocityFromAngle(BALL_SPEED, randomStartAngle());

  return {
    viewport: { width: w, height: h },
    phase: 'ready',
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
    net: {
      x: w / 2,
      dashHeight: NET_DASH_HEIGHT,
      dashGap: NET_DASH_GAP
    },
    score: { left: 0, right: 0 },
    lastScorer: null
  };
}

/*
 * Initialise le state global
 */
export function init(): void {
  state = createInitialState();
}

/*
 * Retourne le state actuel
 */
export function getState(): GameState | null {
  return state;
}

/*
 * Met a jour le viewport (appele au resize)
 */
export function updateViewport(): void {
  if (!state) return;
  const w = getWidth();
  const h = getHeight();

  state.viewport.width = w;
  state.viewport.height = h;
  state.net.x = w / 2;
  state.paddles[1].x = w - PADDLE_MARGIN - PADDLE_WIDTH;
}

/*
 * Change la phase du jeu
 */
export function setPhase(phase: GamePhase): void {
  if (!state) return;
  state.phase = phase;
}

export function resetBall(serveToRight?: boolean): void {
  if (!state) return;
  const maxAngle = Math.PI / 6;
  const angle = (Math.random() * 2 - 1) * maxAngle;
  const direction = serveToRight ?? Math.random() > 0.5;
  const finalAngle = direction ? angle : Math.PI + angle;
  const { vx, vy } = velocityFromAngle(BALL_SPEED, finalAngle);

  state.ball.x = getWidth() / 2;
  state.ball.y = getHeight() / 2;
  state.ball.vx = vx;
  state.ball.vy = vy;
}

export function addScore(side: 'left' | 'right'): void {
  if (!state) return;
  state.score[side]++;
  state.lastScorer = side;
}

export const State = { init, getState, updateViewport, setPhase, resetBall, addScore, createInitialState };
