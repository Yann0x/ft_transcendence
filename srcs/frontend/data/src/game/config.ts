// CONFIG - Constantes et types des entites

// --- TYPES ---

export interface Ball {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Net {
  x: number;
  dashHeight: number;
  dashGap: number;
}

// --- CONSTANTES ---

// Ball
export const BALL_RADIUS = 8;
export const BALL_SPEED = 660;

// Paddle
export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 80;
export const PADDLE_MARGIN = 20;
export const PADDLE_SPEED = 430;

// Net
export const NET_DASH_HEIGHT = 10;
export const NET_DASH_GAP = 8;

// Clock
export const MAX_DT = 50; // dt max en ms, evite teleportation apres changement d'onglet
export const FIXED_DT = 16.666; // pas de temps fixe pour la physique (~60Hz)
export const MAX_STEPS = 5; // limite de ticks physiques par frame (evite spirale de la mort)

// Game
export const WIN_SCORE = 11;

// AI
export const AI_PERCEPTION_INTERVAL = 1000; // 1Hz - l'IA ne voit qu'une fois par seconde
export const AI_ERROR_RANGE = 50; // erreur aleatoire pour rendre l'IA battable
