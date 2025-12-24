// PONG GAME - Network only

import { createCanvas, getCtx } from './canvas';
import { State, setPhase, type GameState } from './state';
import { drawRect, drawCircle, drawNet, drawText } from './render';
import { updateFps, drawFps, drawControls, toggleFPS, toggleHitboxes, showHitboxes } from './debug';
import { WIN_SCORE, SERVER_WIDTH, SERVER_HEIGHT, RECONNECT_DELAY } from './config';
import { bindKeyboard, getInput } from './input';
import { Network } from './network';

let running = false;
let lastInputSent = { up: false, down: false };

export function init(container: HTMLElement): void {
  createCanvas(container);
  State.init();

  if (!running) {
    bindKeyboard();
    bindKeys();
    running = true;
    connectToServer();
    requestAnimationFrame(gameLoop);
  }
}

function bindKeys(): void {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f') toggleFPS();
    if (e.key === 'h') toggleHitboxes();
    if (e.key === ' ') Network.sendStart();
  });
}

async function connectToServer(): Promise<void> {
  try {
    await Network.connect();
    setPhase('waiting');

    Network.onStateUpdate((data) => {
      applyServerState(data as ServerState);
    });

    Network.onDisconnected(() => {
      setPhase('waiting');
      setTimeout(connectToServer, RECONNECT_DELAY);
    });
  } catch (err) {
    console.error('[GAME] Connection failed:', err);
    setTimeout(connectToServer, RECONNECT_DELAY);
  }
}

interface ServerState {
  phase: string;
  ball: { x: number; y: number; radius: number; vx: number; vy: number };
  paddles: [
    { x: number; y: number; width: number; height: number },
    { x: number; y: number; width: number; height: number }
  ];
  score: { left: number; right: number };
}

function applyServerState(serverState: ServerState): void {
  const state = State.getState();
  if (!state) return;

  const scaleX = state.viewport.width / SERVER_WIDTH;
  const scaleY = state.viewport.height / SERVER_HEIGHT;

  state.ball.x = serverState.ball.x * scaleX;
  state.ball.y = serverState.ball.y * scaleY;
  state.ball.radius = serverState.ball.radius * Math.min(scaleX, scaleY);
  state.ball.vx = serverState.ball.vx * scaleX;
  state.ball.vy = serverState.ball.vy * scaleY;

  for (let i = 0; i < 2; i++) {
    state.paddles[i].x = serverState.paddles[i].x * scaleX;
    state.paddles[i].y = serverState.paddles[i].y * scaleY;
    state.paddles[i].width = serverState.paddles[i].width * scaleX;
    state.paddles[i].height = serverState.paddles[i].height * scaleY;
  }

  state.score.left = serverState.score.left;
  state.score.right = serverState.score.right;

  const phase = serverState.phase as GameState['phase'];
  if (state.phase !== phase) {
    setPhase(phase);
  }
}

function gameLoop(): void {
  if (!running) return;

  const state = State.getState();
  if (!state) return;

  updateFps(performance.now());
  sendInputsToServer();
  render(state);
  drawFps();

  requestAnimationFrame(gameLoop);
}

function sendInputsToServer(): void {
  const input = getInput();

  if (input.up !== lastInputSent.up || input.down !== lastInputSent.down) {
    Network.sendInput(input.up, input.down);
    lastInputSent = { ...input };
  }
}

export function render(state: GameState): void {
  const ctx = getCtx();
  if (!ctx) return;

  const { width: w, height: h } = state.viewport;

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  drawNet(state.net.x, h, state.net.dashHeight, state.net.dashGap);

  drawText(String(state.score.left), w / 4, 50, { font: 'bold 48px system-ui', color: '#333' });
  drawText(String(state.score.right), (w * 3) / 4, 50, { font: 'bold 48px system-ui', color: '#333' });

  for (const p of state.paddles) {
    drawRect(p.x, p.y, p.width, p.height, '#fff');
  }

  drawCircle(state.ball.x, state.ball.y, state.ball.radius, '#fff');

  if (showHitboxes) {
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.stroke();
    for (const p of state.paddles) {
      ctx.strokeRect(p.x, p.y, p.width, p.height);
    }
  }

  const side = Network.getSide();
  const modeText = side ? `Online (${side})` : 'Connecting...';
  drawText(modeText, w / 2, 30, { font: '16px system-ui', color: '#525252' });

  if (state.phase === 'waiting') {
    drawText('Waiting for opponent...', w / 2, h / 2, { color: '#525252', font: 'bold 24px system-ui' });
  } else if (state.phase === 'ready') {
    drawText('Press SPACE to start', w / 2, h / 2, { color: '#525252', font: 'bold 24px system-ui' });
  } else if (state.phase === 'ended') {
    const winner = state.score.left >= WIN_SCORE ? 'Left' : 'Right';
    drawText(`${winner} wins!`, w / 2, h / 2 - 20, { color: '#fff', font: 'bold 32px system-ui' });
    drawText('Press SPACE to restart', w / 2, h / 2 + 20, { color: '#525252', font: '20px system-ui' });
  }

  drawControls(h);
}

export const PongGame = {
  init,
  render
};
