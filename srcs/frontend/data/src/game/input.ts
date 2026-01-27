/* INPUT */

const keysDown = new Set<string>();
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let keyupHandler: ((e: KeyboardEvent) => void) | null = null;

/* KEYBOARD BINDING */

export function bindKeyboard(): void {
  unbindKeyboard();

  keydownHandler = (e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    const isInputField = activeEl instanceof HTMLInputElement ||
                         activeEl instanceof HTMLTextAreaElement ||
                         activeEl?.getAttribute('contenteditable') === 'true';

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) && !isInputField) {
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

/* INPUT GETTERS */

export function getInput(): { up: boolean; down: boolean } {
  return {
    up: keysDown.has('w') || keysDown.has('W') || keysDown.has('ArrowUp'),
    down: keysDown.has('s') || keysDown.has('S') || keysDown.has('ArrowDown')
  };
}

/* Joueur 1 en local (W/S) */
export function getInputP1(): { up: boolean; down: boolean } {
  return {
    up: keysDown.has('w') || keysDown.has('W'),
    down: keysDown.has('s') || keysDown.has('S')
  };
}

/* Joueur 2 en local (fleches) */
export function getInputP2(): { up: boolean; down: boolean } {
  return {
    up: keysDown.has('ArrowUp'),
    down: keysDown.has('ArrowDown')
  };
}
