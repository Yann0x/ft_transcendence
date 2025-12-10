// CONFIG - Constantes et types des entites

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

export interface Net {
  x: number;
  dashHeight: number;
  dashGap: number;
}

// --- CONSTANTES ---

// Ball
export const BALL_RADIUS = 8;
export const BALL_SPEED = 550;

// Paddle
export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 80;
export const PADDLE_MARGIN = 20;
export const PADDLE_SPEED = 400;

// Net
export const NET_DASH_HEIGHT = 10;
export const NET_DASH_GAP = 8;
