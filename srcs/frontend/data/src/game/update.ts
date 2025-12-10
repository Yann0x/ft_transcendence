// UPDATE - Logique de mise a jour du jeu

import type { GameState } from './state';

export type System = (state: GameState, dt: number) => void;

const systems: System[] = [];

/*
 * Met a jour avec state et dt
 */
export function update(state: GameState, dt: number): void {
  for (const system of systems) {
    system(state, dt);
  }
}

/*
 * Ajoute un system a la liste
 */
export function addSystem(system: System): void {
  systems.push(system);
}

/*
 * Retire un system de la liste
 */
export function removeSystem(system: System): void {
  const index = systems.indexOf(system);
  if (index !== -1) {
    systems.splice(index, 1);
  }
}

export function clearSystems(): void {
  systems.length = 0;
}

// Export groupe
export const Update = {
  update,
  addSystem,
  removeSystem,
  clearSystems
};
