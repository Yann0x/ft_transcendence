// INPUT - Gestion des entrees clavier

const keysDown = new Set<string>();

export function bindKeyboard(): void {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    keysDown.add(e.key);
  });
  window.addEventListener('keyup', (e) => keysDown.delete(e.key));
}

export function isKeyDown(key: string): boolean {
  return keysDown.has(key);
}

export function getInput(): { up: boolean; down: boolean } {
  return {
    up: keysDown.has('w') || keysDown.has('W') || keysDown.has('ArrowUp'),
    down: keysDown.has('s') || keysDown.has('S') || keysDown.has('ArrowDown')
  };
}
