// INPUT - Gestion des entrees clavier

import { getAIInput } from './ai';

const keysDown = new Set<string>();
let aiMode = true; // P2 controle par l'IA par defaut

export function bindKeyboard(): void {
  window.addEventListener('keydown', (e) => keysDown.add(e.key));
  window.addEventListener('keyup', (e) => keysDown.delete(e.key));
}

export function toggleAI(): void {
  aiMode = !aiMode;
}

export function isAIMode(): boolean {
  return aiMode;
}

export function sample(): { p1: { up: boolean; down: boolean }; p2: { up: boolean; down: boolean } } {
  const p2Input = aiMode
    ? getAIInput()
    : { up: keysDown.has('ArrowUp'), down: keysDown.has('ArrowDown') };

  return {
    p1: {
      up: keysDown.has('w') || keysDown.has('W'),
      down: keysDown.has('s') || keysDown.has('S')
    },
    p2: p2Input
  };
}
