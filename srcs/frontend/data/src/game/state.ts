// STATE - Etat central du jeu

import { getWidth, getHeight } from './canvas';

// --- TYPES ---

export type GamePhase = 'ready' | 'playing' | 'paused' | 'ended';

export interface Viewport {
  width: number;  // largeur en world units (pixels logiques)
  height: number; // hauteur en world units (pixels logiques)
}

export interface GameState {
  viewport: Viewport;
  phase: GamePhase;
}

// --- STATE ---

let state: GameState | null = null;

/*
 * Cree l'etat initial du jeu
 * Utilise les dimensions actuelles du canvas comme viewport
 */
export function createInitialState(): GameState {
  return {
    viewport: {
      width: getWidth(),
      height: getHeight()
    },
    phase: 'ready'
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
  state.viewport.width = getWidth();
  state.viewport.height = getHeight();
}

// Export groupe
export const State = {
  init,
  getState,
  updateViewport,
  createInitialState
};
