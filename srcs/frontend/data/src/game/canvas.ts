// CANVAS avec support DPR

let canvas: HTMLCanvasElement | null = null; // element canvas HTML
let ctx: CanvasRenderingContext2D | null = null; // contexte 2D pour dessiner
let width = 0; // largeur pixels
let height = 0; // hauteur pixels

/*
 * Redimensionne le canvas en tenant compte du DPR
 * DPR = devicePixelRatio
 */
function resize(container: HTMLElement): void {
  if (!canvas || !ctx) return;

  const dpr = window.devicePixelRatio || 1; // ratio pixels physiques / logiques
  const rect = container.getBoundingClientRect(); // dimensions du conteneur

  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/*
 * Cree le canvas et l'insere dans le conteneur
 */
export function createCanvas(container: HTMLElement): void {
  canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Impossible de creer le contexte 2D');
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
