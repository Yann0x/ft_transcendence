// PONG GAME - Network only

import { createCanvas, getCtx } from './canvas';
import { State, setPhase, type GameState } from './state';
import { drawRect, drawCircle, drawNet, drawText } from './render';
import { updateFps, drawFps, toggleFPS, toggleHitboxes, showHitboxes } from './debug';
import { WIN_SCORE, SERVER_WIDTH, SERVER_HEIGHT } from './config';
import { bindKeyboard, unbindKeyboard, getInput, getInputP1, getInputP2 } from './input';
import { Network, type AIDifficulty } from './network';

let running = false;
let lastInputSent = { up: false, down: false };
let lastInputSentP2 = { up: false, down: false };
let gameMode: 'solo' | 'pvp' | null = null;
let localMode = false; // true = PvP local (2 joueurs meme clavier), false = vs AI
let currentDifficulty: AIDifficulty = 'normal';
let pollInterval: number | null = null;

export function init(): void {
  const container = document.getElementById("game-container")
  if (!container)
  {
    console.log('No game-container element onthis page, exit')
    return;
  }

  // Si deja running, cleanup d'abord
  if (running) {
    cleanup();
  }

  createCanvas(container);
  State.init();

  bindKeyboard();
  bindKeys();
  bindModeButtons();

  // Default: auto-connect in solo mode (normal)
  gameMode = 'solo';
  localMode = false;
  currentDifficulty = 'normal';
  connectToServer('solo', 'normal');

  // Start polling PvP stats
  pollPvPStats();
  pollInterval = window.setInterval(pollPvPStats, 3000);

  running = true;
  requestAnimationFrame(gameLoop);
}

export function cleanup(): void {
  console.log('[GAME] Cleanup');
  running = false;

  // Arrêter le polling
  if (pollInterval !== null) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  // Retirer les listeners clavier
  unbindKeyboard();

  // Déconnecter du serveur
  Network.disconnect();

  // Réinitialiser l'état
  gameMode = null;
  localMode = false;
}

export function pauseGame(): void {
  const state = State.getState();
  if (state && state.phase === 'playing') {
    Network.sendPause();
  }
}

export function resumeGame(): void {
  const state = State.getState();
  if (state && state.phase === 'paused') {
    Network.sendResume();
  }
}

async function pollPvPStats(): Promise<void> {
  try {
    const res = await fetch('/api/game/stats');
    if (res.ok) {
      const stats = await res.json() as { waitingPlayers: number; activeGames: number };
      updatePvPStatsDisplay(stats);
    }
  } catch {
    // Ignore errors
  }
}

function updatePvPStatsDisplay(stats: { waitingPlayers: number; activeGames: number }): void {
  const el = document.getElementById('pvp-queue-count');
  if (el) {
    if (stats.waitingPlayers > 0) {
      el.textContent = `${stats.waitingPlayers} en attente`;
      el.classList.remove('text-neutral-400');
      el.classList.add('text-emerald-400');
    } else {
      el.textContent = '0 en attente';
      el.classList.remove('text-emerald-400');
      el.classList.add('text-neutral-400');
    }
  }
}

function setOnlineStatus(isOnline: boolean): void {
  const onlineEl = document.getElementById('online-status');
  const offlineEl = document.getElementById('offline-status');

  if (onlineEl && offlineEl) {
    if (isOnline) {
      onlineEl.classList.remove('hidden');
      offlineEl.classList.add('hidden');
    } else {
      onlineEl.classList.add('hidden');
      offlineEl.classList.remove('hidden');
    }
  }
}

function bindModeButtons(): void {
  const btnSolo = document.getElementById('btn-solo');
  const btnLocal = document.getElementById('btn-local');
  const btnPvp = document.getElementById('btn-pvp');
  const difficultyMenu = document.getElementById('solo-difficulty-menu');
  const btnDiffBeginner = document.getElementById('btn-diff-beginner');
  const btnDiffNormal = document.getElementById('btn-diff-normal');
  const btnDiffHard = document.getElementById('btn-diff-hard');

  const setActiveButton = (activeBtn: HTMLElement | null) => {
    [btnSolo, btnLocal, btnPvp].forEach(btn => {
      if (btn) {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
      }
    });
    if (activeBtn) {
      activeBtn.classList.remove('btn-outline');
      activeBtn.classList.add('btn-primary');
    }
  };

  const hideDifficultyMenu = () => {
    difficultyMenu?.classList.add('hidden');
  };

  const showDifficultyMenu = () => {
    difficultyMenu?.classList.remove('hidden');
  };

  const selectDifficulty = (difficulty: AIDifficulty) => {
    currentDifficulty = difficulty;
    gameMode = 'solo';
    localMode = false;
    setActiveButton(btnSolo);
    setOnlineStatus(false);
    hideDifficultyMenu();
    connectToServer('solo', difficulty);
  };

  // Solo button shows difficulty menu
  if (btnSolo) {
    btnSolo.addEventListener('click', () => {
      if (difficultyMenu?.classList.contains('hidden')) {
        showDifficultyMenu();
      } else {
        hideDifficultyMenu();
      }
    });
  }

  // Difficulty buttons
  btnDiffBeginner?.addEventListener('click', () => selectDifficulty('easy'));
  btnDiffNormal?.addEventListener('click', () => selectDifficulty('normal'));
  btnDiffHard?.addEventListener('click', () => selectDifficulty('hard'));

  // Hide menu when clicking elsewhere
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!btnSolo?.contains(target) && !difficultyMenu?.contains(target)) {
      hideDifficultyMenu();
    }
  });

  if (btnLocal) {
    btnLocal.addEventListener('click', () => {
      hideDifficultyMenu();
      gameMode = 'solo';
      localMode = true;
      setActiveButton(btnLocal);
      setOnlineStatus(false);
      connectToServer('local');
    });
  }

  if (btnPvp) {
    btnPvp.addEventListener('click', () => {
      hideDifficultyMenu();
      gameMode = 'pvp';
      localMode = false;
      setActiveButton(btnPvp);
      setOnlineStatus(true);
      connectToServer('pvp');
    });
  }

  // Set Solo as default active
  setActiveButton(btnSolo);
}

function bindKeys(): void {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f') toggleFPS();
    if (e.key === 'h') toggleHitboxes();
    if (e.key === ' ') {
      const state = State.getState();
      if (state?.phase === 'ended' && state.endReason === 'forfeit') {
        connectToServer('pvp');
      } else {
        Network.sendStart();
      }
    }
    if (e.key === 'Escape') {
      const state = State.getState();
      if (state?.phase === 'playing') {
        Network.sendPause();
      } else if (state?.phase === 'paused') {
        Network.sendResume();
      }
    }
  });
}

let isChangingMode = false;

async function connectToServer(mode: 'solo' | 'local' | 'pvp', difficulty: AIDifficulty = 'hard'): Promise<void> {
  try {
    isChangingMode = true;

    // Register callbacks BEFORE connecting to catch early state updates
    Network.onStateUpdate((data) => {
      applyServerState(data as ServerState);
    });

    Network.onDisconnected(() => {
      // Ne pas reset si on change juste de mode
      if (!isChangingMode) {
        gameMode = null;
        setPhase('waiting');
      }
    });

    // Chaque mode est distinct sur le serveur
    await Network.connect(mode, difficulty);
    isChangingMode = false;
    setPhase('waiting');
  } catch (err) {
    console.error('[GAME] Connection failed:', err);
    isChangingMode = false;
    gameMode = null;
  }
}

interface ServerState {
  phase: string;
  endReason?: 'forfeit' | 'score';
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
  state.endReason = serverState.endReason;

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
  if (gameMode === 'solo' && localMode) {
    // Mode local: envoyer les inputs des deux joueurs
    const p1 = getInputP1();
    const p2 = getInputP2();

    if (p1.up !== lastInputSent.up || p1.down !== lastInputSent.down ||
        p2.up !== lastInputSentP2.up || p2.down !== lastInputSentP2.down) {
      Network.sendInputBoth(p1, p2);
      lastInputSent = { ...p1 };
      lastInputSentP2 = { ...p2 };
    }
  } else {
    // Mode normal: envoyer uniquement ses propres inputs
    const input = getInput();

    if (input.up !== lastInputSent.up || input.down !== lastInputSent.down) {
      Network.sendInput(input.up, input.down);
      lastInputSent = { ...input };
    }
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
  const connected = Network.isConnected();

  // Mode indicator
  if (!gameMode) {
    drawText('Select mode below', w / 2, 30, { font: '16px system-ui', color: '#525252' });
  } else if (side) {
    let modeLabel: string;
    if (gameMode === 'pvp') {
      modeLabel = `PvP Online (${side})`;
    } else if (localMode) {
      modeLabel = 'PvP Local (W/S vs ↑/↓)';
    } else {
      const diffLabel = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
      modeLabel = `Solo vs AI (${diffLabel})`;
    }
    drawText(modeLabel, w / 2, 30, { font: '16px system-ui', color: '#525252' });
  } else {
    drawText('Connecting...', w / 2, 30, { font: '16px system-ui', color: '#525252' });
  }

  // Phase messages
  if (!connected && !gameMode) {
    drawText('Choose Solo or PvP to play', w / 2, h / 2, { color: '#525252', font: 'bold 24px system-ui' });
  } else if (state.phase === 'waiting') {
    const msg = gameMode === 'pvp' ? 'Waiting for opponent...' : 'Connecting...';
    drawText(msg, w / 2, h / 2, { color: '#525252', font: 'bold 24px system-ui' });
  } else if (state.phase === 'ready') {
    drawText('Press SPACE to start', w / 2, h / 2, { color: '#525252', font: 'bold 24px system-ui' });
  } else if (state.phase === 'paused') {
    drawText('PAUSED', w / 2, h / 2 - 20, { color: '#fff', font: 'bold 32px system-ui' });
    drawText('Press ESC to resume', w / 2, h / 2 + 20, { color: '#525252', font: '20px system-ui' });
  } else if (state.phase === 'ended') {
    const winner = state.score.left >= WIN_SCORE ? 'Left' : 'Right';
    if (state.endReason === 'forfeit') {
      drawText('Opponent disconnected', w / 2, h / 2 - 20, { color: '#fff', font: 'bold 32px system-ui' });
      drawText('You win! Press SPACE to find a new game', w / 2, h / 2 + 20, { color: '#525252', font: '20px system-ui' });
    } else {
      drawText(`${winner} wins!`, w / 2, h / 2 - 20, { color: '#fff', font: 'bold 32px system-ui' });
      drawText('Press SPACE to restart', w / 2, h / 2 + 20, { color: '#525252', font: '20px system-ui' });
    }
  }
}

export const PongGame = {
  init,
  cleanup,
  pauseGame,
  resumeGame,
  render
};
