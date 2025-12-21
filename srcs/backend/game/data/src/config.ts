// CONFIG - Constantes et types des entites (shared avec frontend)

// --- TYPES ---

export interface Ball {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- CONSTANTES ---

// Ball
export const BALL_RADIUS = 8;
export const BALL_SPEED = 660;

// Paddle
export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 80;
export const PADDLE_MARGIN = 20;
export const PADDLE_SPEED = 430;

// Clock
export const TICK_RATE = 60; // ticks par seconde
export const TICK_INTERVAL = 1000 / TICK_RATE; // ~16.666ms

// Game
export const WIN_SCORE = 11;

// Viewport (taille fixe cote serveur)
export const VIEWPORT_WIDTH = 800;
export const VIEWPORT_HEIGHT = 600;
