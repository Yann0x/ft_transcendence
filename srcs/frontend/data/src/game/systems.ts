// SYSTEMS - Fonctions de mise a jour du jeu

import type { GameState } from './state';

/*
 * Met a jour la position de la balle
 */
export function updateBall(state: GameState, dt: number): void {
  const { ball } = state;
  const dtSec = dt / 1000;

  ball.x += ball.vx * dtSec;
  ball.y += ball.vy * dtSec;
}

/*
 * Rebond sur les murs haut/bas
 */
export function bounceWalls(state: GameState, _dt: number): void {
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
