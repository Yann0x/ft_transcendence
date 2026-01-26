// INPUT - keyboard input handling

const keysDown = new Set<string>();
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let keyupHandler: ((e: KeyboardEvent) => void) | null = null;

export function bindKeyboard(): void {
  // remove old listeners first
  unbindKeyboard();

  keydownHandler = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    keysDown.add(e.key);
  };

  keyupHandler = (e: KeyboardEvent) => {
    keysDown.delete(e.key);
  };

  window.addEventListener('keydown', keydownHandler);
  window.addEventListener('keyup', keyupHandler);
}

export function unbindKeyboard(): void {
  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
  if (keyupHandler) {
    window.removeEventListener('keyup', keyupHandler);
    keyupHandler = null;
  }
  keysDown.clear();
}

export function getInput(): { up: boolean; down: boolean } {
  return {
    up: keysDown.has('w') || keysDown.has('W') || keysDown.has('ArrowUp'),
    down: keysDown.has('s') || keysDown.has('S') || keysDown.has('ArrowDown')
  };
}

// Player 2 inputs for local PvP (Arrow keys)
export function getInputP2(): { up: boolean; down: boolean } {
  return {
    up: keysDown.has('ArrowUp'),
    down: keysDown.has('ArrowDown')
  };
}

// Player 1 inputs for local PvP (W/S keys only)
export function getInputP1(): { up: boolean; down: boolean } {
  return {
    up: keysDown.has('w') || keysDown.has('W'),
    down: keysDown.has('s') || keysDown.has('S')
  };
}
