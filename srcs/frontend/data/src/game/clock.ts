// CLOCK - Gestion du temps de jeu

import { MAX_DT, FIXED_DT, MAX_STEPS } from './config';

let lastTime = 0; // timestamp de la derniere frame
let dt = 0; // delta time depuis derniere frame en ms
let accumulator = 0; // temps accumule non consomme entre frames

/*
 * Initialise l'horloge avec le timestamp actuel
 */
export function init(): void {
  lastTime = performance.now();
  dt = 0;
}

/*
 * Calcule le dt depuis la derniere frame
 * Clamp a MAX_DT pour eviter les sauts temporels
 * Retourne le dt en ms
 */
export function tick(): number {
  const now = performance.now();
  dt = now - lastTime;
  lastTime = now;

  // Pour eviter teleportation (changement d'onglet, lag)
  if (dt > MAX_DT) {
    dt = MAX_DT;
  }

  return dt;
}

/*
 * Retourne le dernier dt calcule
 */
export function getDt(): number {
  return dt;
}

/*
 * Ajoute du temps a l'accumulator
 */
export function accumulate(delta: number): void {
  accumulator += delta;
}

/*
 * Consomme un tick fixe de l'accumulator
 */
export function consumeTick(): boolean {
  if (accumulator >= FIXED_DT) {
    accumulator -= FIXED_DT;
    return true;
  }
  return false;
}

/*
 * Retourne l'accumulator actuel
 */
export function getAccumulator(): number {
  return accumulator;
}

// Export groupe
export const Clock = {
  init,
  tick,
  getDt,
  accumulate,
  consumeTick,
  getAccumulator,
  FIXED_DT,
  MAX_STEPS
};
