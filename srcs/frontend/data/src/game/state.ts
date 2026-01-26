// STATE - rendering state (data received from server)

import { getWidth, getHeight } from './canvas';

export type GamePhase = 'waiting' | 'ready' | 'playing' | 'paused' | 'ended';

export interface GameState {
  viewport: { width: number; height: number };
  phase: GamePhase;
  endReason?: 'forfeit' | 'score';
  ball: { x: number; y: number; radius: number; vx: number; vy: number };
  paddles: [
    { x: number; y: number; width: number; height: number },
    { x: number; y: number; width: number; height: number }
  ];
  net: { x: number; dashHeight: number; dashGap: number };
  score: { left: number; right: number };
}

let state: GameState | null = null;

export function init(): void {
  const w = getWidth();
  const h = getHeight();

  state = {
    viewport: { width: w, height: h },
    phase: 'waiting',
    endReason: undefined,
    ball: { x: w / 2, y: h / 2, radius: 8, vx: 0, vy: 0 },
    paddles: [
      { x: 20, y: h / 2 - 40, width: 10, height: 80 },
      { x: w - 30, y: h / 2 - 40, width: 10, height: 80 }
    ],
    net: { x: w / 2, dashHeight: 10, dashGap: 8 },
    score: { left: 0, right: 0 }
  };
}

export function getState(): GameState | null {
  return state;
}

export function setPhase(phase: GamePhase): void {
  if (!state) return;
  state.phase = phase;
}

export const State = { init, getState, setPhase };
