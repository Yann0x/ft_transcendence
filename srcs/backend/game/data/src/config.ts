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

export const BALL_RADIUS = 8;
export const BALL_SPEED = 660;
export const BALL_INITIAL_SPEED = BALL_SPEED * 0.8;  // 528 px/s
export const BALL_MAX_SPEED = BALL_SPEED * 3;        // 1980 px/s
export const BALL_ACCELERATION = 1.05;               // +5% per paddle bounce

export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 80;
export const PADDLE_MARGIN = 20;
export const PADDLE_SPEED = 430;

export const TICK_RATE = 60;
export const TICK_INTERVAL = 1000 / TICK_RATE;

export const WIN_SCORE = 11;

export const VIEWPORT_WIDTH = 800;
export const VIEWPORT_HEIGHT = 600;

export type AIDifficulty = 'easy' | 'normal' | 'hard';

// Contrainte sujet: max 1 update/seconde (perceptionInterval >= 1000ms)
export const AI_SETTINGS: Record<AIDifficulty, { perceptionInterval: number; errorRange: number; deadzone: number }> = {
  easy: { perceptionInterval: 2000, errorRange: 120, deadzone: 30 },    // 0.5 update/sec
  normal: { perceptionInterval: 1500, errorRange: 60, deadzone: 15 },   // 0.66 update/sec
  hard: { perceptionInterval: 1000, errorRange: 20, deadzone: 5 }       // 1 update/sec
};
