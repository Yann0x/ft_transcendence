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

export interface GameState {
  viewport: Viewport;
  phase: GamePhase;
  ball: Ball;
  paddles: [Paddle, Paddle];
  net: Net;
}

// --- STATE ---

let state: GameState | null = null;

/*
 * Cree l'etat initial du jeu
 */
export function createInitialState(): GameState {
  const w = getWidth();
  const h = getHeight();

  return {
    viewport: { width: w, height: h },
    phase: 'ready',
    ball: {
      x: w / 2,
      y: h / 2,
      radius: BALL_RADIUS,
      vx: BALL_SPEED,
      vy: BALL_SPEED * 1.2
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
    }
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

// Export groupe
export const State = {
  init,
  getState,
  updateViewport,
  createInitialState
};
