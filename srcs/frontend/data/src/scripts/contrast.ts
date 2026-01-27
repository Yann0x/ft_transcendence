/* CONTRAST */

const STORAGE_KEY = 'highContrast';

let enabled = false;

/* APPLY */

function apply(): void {
  document.body.classList.toggle('hc', enabled);
  const button = document.getElementById('contrast-toggle') as HTMLButtonElement | null;
  if (button) {
    button.setAttribute('aria-pressed', String(enabled));
  }
}

/* SETTERS */

function setEnabled(next: boolean, persist = true): void {
  enabled = next;
  if (persist) {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }
  apply();
}

function toggle(): void {
  setEnabled(!enabled);
}

/* BINDINGS */

function bindControls(): void {
  const button = document.getElementById('contrast-toggle') as HTMLButtonElement | null;
  if (button) {
    button.onclick = () => toggle();
  }
}

/* INIT */

function init(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    const prefersHighContrast = window.matchMedia?.('(prefers-contrast: more)').matches ?? false;
    setEnabled(prefersHighContrast, false);
  } else {
    setEnabled(stored === 'true', false);
  }
  bindControls();
}

/* EXPORT */

export const Contrast = {
  init,
  bindControls,
  toggle,
  setEnabled,
};
