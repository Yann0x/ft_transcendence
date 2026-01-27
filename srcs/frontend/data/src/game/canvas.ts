/* CANVAS */

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let width = 0;
let height = 0;

/* RESIZE */

function resize(container: HTMLElement): void {
  if (!canvas || !ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* CREATE */

export function createCanvas(container: HTMLElement): void {
  canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to create 2D context');
    return;
  }

  container.innerHTML = '';
  container.appendChild(canvas);
  resize(container);
  window.addEventListener('resize', () => resize(container));
}

/* GETTERS */

export function getCtx(): CanvasRenderingContext2D | null {
  return ctx;
}

export function getWidth(): number {
  return width;
}

export function getHeight(): number {
  return height;
}
