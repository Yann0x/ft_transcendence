// CANVAS with DPR support

let canvas: HTMLCanvasElement | null = null; // HTML canvas element
let ctx: CanvasRenderingContext2D | null = null; // 2D context for drawing
let width = 0; // pixel width
let height = 0; // pixel height

// resize canvas taking DPR into account
// DPR = devicePixelRatio
function resize(container: HTMLElement): void {
  if (!canvas || !ctx) return;

  const dpr = window.devicePixelRatio || 1; // physical/logical pixel ratio
  const rect = container.getBoundingClientRect(); // container dimensions

  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// create canvas and insert into container
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

export function getCtx(): CanvasRenderingContext2D | null {
  return ctx;
}

export function getWidth(): number {
  return width;
}

export function getHeight(): number {
  return height;
}
