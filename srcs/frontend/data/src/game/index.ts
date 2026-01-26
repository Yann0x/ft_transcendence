// PONG GAME - Network only

import { createCanvas, getCtx } from './canvas';
import { State, setPhase, type GameState } from './state';
import { drawRect, drawCircle, drawNet, drawText, drawPaddle, drawBall, drawScoreGauge, drawEndMessage, drawModeIndicator, drawInfoMessage } from './render';
import { updateFps, drawFps, toggleFPS, toggleHitboxes, showHitboxes } from './debug';
import { WIN_SCORE, SERVER_WIDTH, SERVER_HEIGHT } from './config';
import { bindKeyboard, unbindKeyboard, getInput, getInputP1, getInputP2 } from './input';
import { Network, type AIDifficulty, type TournamentMatchInfo } from './network';
import Router from '../scripts/router';
import { I18n } from '../scripts/i18n';
import { StatsService } from '../scripts/stats-service';

let running = false;
let lastInputSent = { up: false, down: false };
let lastInputSentP2 = { up: false, down: false };
let gameMode: 'solo' | 'pvp' | 'tournament' | 'invitation' | 'local_tournament' | null = null;
let localMode = false; // true = local PvP (2 players same keyboard), false = vs AI
let currentDifficulty: AIDifficulty = 'normal';
let pollInterval: number | null = null;
let tournamentMatchInfo: TournamentMatchInfo | null = null;
let invitationOpponentName: string | null = null;

interface ActiveGameInfo {
  roomId: string;
  invitationId?: string;
  opponentId?: string;
  phase: string;
  score: { left: number; right: number };
  side: 'left' | 'right';
}

async function checkActiveGame(): Promise<ActiveGameInfo | null> {
  try {
    const token = sessionStorage.getItem('authToken');
    if (!token) return null;
    
    const response = await fetch('/api/game/active', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (e) {
    console.error('[GAME] Error checking active game:', e);
    return null;
  }
}

async function fetchUserName(userId: string): Promise<string | null> {
  try {
    const token = sessionStorage.getItem('authToken');
    const response = await fetch(`/api/user/public/${userId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (response.ok) {
      const user = await response.json();
      return user.name || null;
    }
    return null;
  } catch (e) {
    console.error('[GAME] Error fetching user:', e);
    return null;
  }
}

// Local tournament match info
interface LocalTournamentMatchInfo {
  tournamentId: string;
  matchId: string;
  player1Alias: string;
  player2Alias: string;
}
let localTournamentMatchInfo: LocalTournamentMatchInfo | null = null;

export async function init(): Promise<void> {
  const container = document.getElementById("game-container")
  if (!container)
  {
    console.log('No game-container element onthis page, exit')
    return;
  }

  // if already running, cleanup first
  if (running) {
    cleanup();
  }

  createCanvas(container);
  State.init();

  bindKeyboard();
  bindKeys();
  bindModeButtons();

  // Check for game invitation mode
  const invitationData = sessionStorage.getItem('game_invitation');
  if (invitationData) {
    try {
      const { invitationId, gameRoomId, opponentName } = JSON.parse(invitationData);
      gameMode = 'invitation';
      localMode = false;
      invitationOpponentName = opponentName || null;

      clearModeSelection();
      setOnlineStatus(true);

      connectToInvitationGame(invitationId, gameRoomId);
      sessionStorage.removeItem('game_invitation');

      pollPvPStats();
      pollInterval = window.setInterval(pollPvPStats, 3000);

      running = true;
      requestAnimationFrame(gameLoop);
      return;
    } catch (e) {
      console.error('[GAME] Invalid invitation data:', e);
      sessionStorage.removeItem('game_invitation');
    }
  }

  // Check for active game (reconnection after page refresh)
  const activeGame = await checkActiveGame();
  if (activeGame && activeGame.invitationId) {
    console.log('[GAME] Found active invitation game, reconnecting...', activeGame);
    gameMode = 'invitation';
    localMode = false;
    
    // Fetch opponent name if we have their ID
    if (activeGame.opponentId) {
      invitationOpponentName = await fetchUserName(activeGame.opponentId);
    }

    clearModeSelection();
    setOnlineStatus(true);

    connectToInvitationGame(activeGame.invitationId, activeGame.roomId);

    pollPvPStats();
    pollInterval = window.setInterval(pollPvPStats, 3000);

    running = true;
    requestAnimationFrame(gameLoop);
    return;
  }

  // Check for tournament mode in URL
  const urlParams = new URLSearchParams(window.location.search);
  const tournamentId = urlParams.get('tournament');
  const matchId = urlParams.get('match');

  if (tournamentId && matchId) {
    // Tournament mode - get match info from session storage
    const savedMatchInfo = sessionStorage.getItem('tournament_match');
    if (savedMatchInfo) {
      try {
        tournamentMatchInfo = JSON.parse(savedMatchInfo);
        if (tournamentMatchInfo) {
          gameMode = 'tournament';
          localMode = false;

          // Clear mode button selection for tournament mode
          clearModeSelection();

          // Set online status for tournament mode (like PvP)
          setOnlineStatus(true);

          connectToServerTournament(tournamentMatchInfo);

          // Start polling PvP stats
          pollPvPStats();
          pollInterval = window.setInterval(pollPvPStats, 3000);

          running = true;
          requestAnimationFrame(gameLoop);
          return;
        }
      } catch (e) {
        console.error('[GAME] Invalid tournament match info:', e);
      }
    }
  }
  
  // Check for LOCAL tournament mode in URL
  const localTournamentId = urlParams.get('local_tournament');
  const localMatchId = urlParams.get('match');
  
  if (localTournamentId && localMatchId) {
    // Local tournament mode - get match info from session storage
    const savedLocalMatchInfo = sessionStorage.getItem('local_tournament_match');
    if (savedLocalMatchInfo) {
      try {
        localTournamentMatchInfo = JSON.parse(savedLocalMatchInfo);
        if (localTournamentMatchInfo) {
          gameMode = 'local_tournament';
          localMode = true; // Use local controls (W/S vs arrows)
          
          // Clear mode button selection
          clearModeSelection();
          
          // Set offline status for local tournament
          setOnlineStatus(false);
          
          // Connect to server in local mode (same as PvP local)
          connectToServerLocalTournament();
          
          // Start polling PvP stats
          pollPvPStats();
          pollInterval = window.setInterval(pollPvPStats, 3000);
          
          running = true;
          requestAnimationFrame(gameLoop);
          return;
        }
      } catch (e) {
        console.error('[GAME] Invalid local tournament match info:', e);
        sessionStorage.removeItem('local_tournament_match');
      }
    }
  }

  // Load user stats for the home page
  loadHomeStats();

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

// load and display user stats on the home page
async function loadHomeStats(): Promise<void> {
  const stats = await StatsService.fetchStats();
  StatsService.updateHomeStats(stats);
}

export function cleanup(): void {
  console.log('[GAME] Cleanup');
  running = false;

  // stop polling
  if (pollInterval !== null) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  // remove keyboard listeners
  unbindKeyboard();

  // disconnect from server
  Network.disconnect();

  // reset state
  gameMode = null;
  localMode = false;
  tournamentMatchInfo = null;
  localTournamentMatchInfo = null;
  
  // Clear tournament match info from session
  sessionStorage.removeItem('tournament_match');
  sessionStorage.removeItem('local_tournament_match');
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

// Export setActiveButton so it can be called from outside
let setActiveButtonFn: ((btn: HTMLElement | null) => void) | null = null;

export function clearModeSelection(): void {
  if (setActiveButtonFn) {
    setActiveButtonFn(null); // Deselect all buttons
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
  
  // Store reference for external use
  setActiveButtonFn = setActiveButton;

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
      // Don't reset if we're just changing mode
      if (!isChangingMode) {
        gameMode = null;
        setPhase('waiting');
      }
    });

    // Each mode is distinct on the server
    await Network.connect(mode, difficulty);
    isChangingMode = false;
    setPhase('waiting');
  } catch (err) {
    console.error('[GAME] Connection failed:', err);
    isChangingMode = false;
    gameMode = null;
    setPhase('waiting'); // Reset to waiting state to show menu instead of stuck "Connecting..."
  }
}

async function connectToServerTournament(matchInfo: TournamentMatchInfo): Promise<void> {
  try {
    isChangingMode = true;

    // Store tournament ID for redirect after match
    const currentTournamentId = matchInfo.tournamentId;

    // Register callbacks BEFORE connecting to catch early state updates
    Network.onStateUpdate((data) => {
      applyServerState(data as ServerState);
      
      // Check if game ended - redirect back to tournament
      const serverState = data as ServerState;
      if (serverState.phase === 'ended' && tournamentMatchInfo) {
        setTimeout(() => {
          // Clear match info and redirect to tournament page using SPA router
          sessionStorage.removeItem('tournament_match');
          // Store tournament ID to view after redirect
          sessionStorage.setItem('view_tournament_after_match', currentTournamentId);
          Router.navigate('/tournaments');
        }, 3000);
      }
    });

    Network.onDisconnected(() => {
      if (!isChangingMode) {
        gameMode = null;
        setPhase('waiting');
        // Redirect back to tournament page using SPA router
        if (tournamentMatchInfo) {
          sessionStorage.setItem('view_tournament_after_match', currentTournamentId);
          Router.navigate('/tournaments');
        }
      }
    });

    await Network.connect('tournament', 'hard', matchInfo);
    isChangingMode = false;
    setPhase('waiting');
  } catch (err) {
    console.error('[GAME] Tournament connection failed:', err);
    isChangingMode = false;
    gameMode = null;
    // Redirect back to tournament page on error using SPA router
    if (tournamentMatchInfo) {
      sessionStorage.setItem('view_tournament_after_match', tournamentMatchInfo.tournamentId);
    }
    Router.navigate('/tournaments');
  }
}

async function connectToInvitationGame(invitationId: string, gameRoomId: string): Promise<void> {
  try {
    isChangingMode = true;

    // Register callbacks BEFORE connecting
    Network.onStateUpdate((data) => {
      applyServerState(data as ServerState);

      // Check if game ended - redirect to social hub
      const serverState = data as ServerState;
      if (serverState.phase === 'ended') {
        setTimeout(() => {
          Router.navigate('/social_hub');
        }, 3000);
      }
    });

    Network.onDisconnected(() => {
      if (!isChangingMode) {
        gameMode = null;
        setPhase('waiting');
        Router.navigate('/social_hub');
      }
    });

    // Connect with invitation parameters
    await Network.connectInvitation(invitationId, gameRoomId);
    isChangingMode = false;
    setPhase('waiting');
  } catch (err) {
    console.error('[GAME] Invitation connection failed:', err);
    isChangingMode = false;
    gameMode = null;
    Router.navigate('/social_hub');
  }
}

// connect to server for local tournament match (uses local PvP mode)
async function connectToServerLocalTournament(): Promise<void> {
  if (!localTournamentMatchInfo) {
    console.error('[GAME] No local tournament match info');
    Router.navigate('/tournaments');
    return;
  }
  
  try {
    isChangingMode = true;
    
    const currentMatchInfo = { ...localTournamentMatchInfo };
    
    // Register callbacks BEFORE connecting
    Network.onStateUpdate((data) => {
      applyServerState(data as ServerState);
      
      // Check if game ended - report score back to tournament and redirect
      const serverState = data as ServerState;
      if (serverState.phase === 'ended' && localTournamentMatchInfo) {
        const score1 = serverState.score.left;
        const score2 = serverState.score.right;
        
        console.log(`[GAME] Local tournament match ended: ${score1} - ${score2}`);
        
        // Save match result for restoration (tournament state was saved before navigating here)
        sessionStorage.setItem('local_tournament_result', JSON.stringify({
          matchId: localTournamentMatchInfo.matchId,
          score1,
          score2
        }));
        
        setTimeout(() => {
          // Clear match info
          sessionStorage.removeItem('local_tournament_match');
          // Redirect back to tournaments page
          Router.navigate('/tournaments');
        }, 3000);
      }
    });
    
    Network.onDisconnected(() => {
      if (!isChangingMode) {
        gameMode = null;
        setPhase('waiting');
        Router.navigate('/tournaments');
      }
    });
    
    // Connect in local mode (same as PvP local - 2 players same keyboard)
    await Network.connect('local');
    isChangingMode = false;
    setPhase('waiting');
  } catch (err) {
    console.error('[GAME] Local tournament connection failed:', err);
    isChangingMode = false;
    gameMode = null;
    sessionStorage.removeItem('local_tournament_match');
    Router.navigate('/tournaments');
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
  if (localMode) {
    // Local mode (local PvP or local tournament): send both players' inputs
    const p1 = getInputP1();
    const p2 = getInputP2();

    if (p1.up !== lastInputSent.up || p1.down !== lastInputSent.down ||
        p2.up !== lastInputSentP2.up || p2.down !== lastInputSentP2.down) {
      Network.sendInputBoth(p1, p2);
      lastInputSent = { ...p1 };
      lastInputSentP2 = { ...p2 };
    }
  } else {
    // Normal mode: send only own inputs
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

  // Fond noir uni
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  // Filet central plus brillant
  drawNet(state.net.x, h, state.net.dashHeight, state.net.dashGap, '#555');

  // Jauges de score
  drawScoreGauge(w / 4, 15, state.score.left, WIN_SCORE, '#3b82f6', 'rgba(59, 130, 246, 0.6)');
  drawScoreGauge((w * 3) / 4, 15, state.score.right, WIN_SCORE, '#ef4444', 'rgba(239, 68, 68, 0.6)');

  // Scores colorés avec police moderne
  drawText(String(state.score.left), w / 4, 60, { font: 'bold 56px "Inter", "Segoe UI", system-ui, sans-serif', color: '#3b82f6' });
  drawText(String(state.score.right), (w * 3) / 4, 60, { font: 'bold 56px "Inter", "Segoe UI", system-ui, sans-serif', color: '#ef4444' });

  // Paddle gauche (bleu)
  drawPaddle(
    state.paddles[0].x,
    state.paddles[0].y,
    state.paddles[0].width,
    state.paddles[0].height,
    '#3b82f6',
    'rgba(59, 130, 246, 0.5)'
  );

  // Paddle droit (rouge)
  drawPaddle(
    state.paddles[1].x,
    state.paddles[1].y,
    state.paddles[1].width,
    state.paddles[1].height,
    '#ef4444',
    'rgba(239, 68, 68, 0.5)'
  );

  // Balle avec glow blanc brillant
  drawBall(state.ball.x, state.ball.y, state.ball.radius);

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

  // Vérifier si on doit afficher le mode indicator (uniquement avec les messages overlay)
  const hasOverlayMessage = !connected || state.phase === 'waiting' || state.phase === 'ready' || state.phase === 'paused' || state.phase === 'ended';

  // Mode indicator (plus proche du centre, apparaît avec les messages)
  if (hasOverlayMessage) {
    if (!gameMode) {
      drawModeIndicator(w / 2, 80, I18n.translate('game.select_mode_below'));
    } else if (gameMode === 'tournament' && tournamentMatchInfo) {
      drawModeIndicator(w / 2, 80, '🏆 ' + I18n.translate('game.tournament_match'));
    } else if (gameMode === 'local_tournament' && localTournamentMatchInfo) {
      // Local tournament - show player names
      const p1 = localTournamentMatchInfo.player1Alias || 'Player 1';
      const p2 = localTournamentMatchInfo.player2Alias || 'Player 2';
      drawModeIndicator(w / 2, 80, `🏠 ${p1} vs ${p2}`);
    } else if (side) {
      let modeLabel: string;
      if (gameMode === 'invitation') {
        modeLabel = invitationOpponentName ? `⚔️ Duel vs ${invitationOpponentName}` : `⚔️ Duel (${side})`;
      } else if (gameMode === 'pvp') {
        modeLabel = `PvP Online (${side})`;
      } else if (localMode) {
        modeLabel = 'PvP Local (W/S vs ↑/↓)';
      } else {
        const diffLabel = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
        modeLabel = `Solo vs AI (${diffLabel})`;
      }
      drawModeIndicator(w / 2, 80, modeLabel);
    } else {
      drawModeIndicator(w / 2, 80, I18n.translate('game.connecting'));
    }
  }

  // Phase messages
  if (!connected && !gameMode) {
    drawInfoMessage(w / 2, h / 2, I18n.translate('game.choose_mode'));
  } else if (state.phase === 'waiting') {
    const msg = gameMode === 'tournament' ? I18n.translate('game.waiting_opponent') : (gameMode === 'pvp' ? I18n.translate('game.waiting_opponent') : I18n.translate('game.connecting'));
    drawInfoMessage(w / 2, h / 2, msg);
  } else if (state.phase === 'ready') {
    drawInfoMessage(w / 2, h / 2, I18n.translate('game.press_space_start'));
  } else if (state.phase === 'paused') {
    if (gameMode === 'tournament') {
      drawInfoMessage(
        w / 2,
        h / 2,
        I18n.translate('game.opponent_disconnected'),
        I18n.translate('game.waiting_opponent')
      );
    } else {
      drawInfoMessage(
        w / 2,
        h / 2,
        I18n.translate('game.paused'),
        I18n.translate('game.press_esc_resume')
      );
    }
  } else if (state.phase === 'ended') {
    const winner = state.score.left >= WIN_SCORE ? 'Left' : 'Right';
    const myWin = (side === 'left' && state.score.left >= WIN_SCORE) || (side === 'right' && state.score.right >= WIN_SCORE);

    if (gameMode === 'local_tournament' && localTournamentMatchInfo) {
      // Local tournament end - show winner name
      const winnerName = winner === 'Left' ? localTournamentMatchInfo.player1Alias : localTournamentMatchInfo.player2Alias;
      drawEndMessage(
        w / 2,
        h / 2,
        `🏆 ${winnerName} ${I18n.translate('game.wins')}!`,
        I18n.translate('tournaments.returning'),
        true
      );
    } else if (gameMode === 'tournament') {
      if (state.endReason === 'forfeit') {
        drawEndMessage(
          w / 2,
          h / 2,
          I18n.translate('game.opponent_disconnected'),
          myWin ? I18n.translate('game.you_advance_tournament') : I18n.translate('game.returning_tournament'),
          myWin
        );
      } else {
        drawEndMessage(
          w / 2,
          h / 2,
          myWin ? I18n.translate('game.victory') : I18n.translate('game.defeat'),
          I18n.translate('game.returning_tournament'),
          myWin
        );
      }
    } else if (state.endReason === 'forfeit') {
      drawEndMessage(
        w / 2,
        h / 2,
        I18n.translate('game.opponent_disconnected'),
        I18n.translate('game.you_win_space'),
        true
      );
    } else {
      drawEndMessage(
        w / 2,
        h / 2,
        winner === 'Left' ? I18n.translate('game.left_wins') : I18n.translate('game.right_wins'),
        I18n.translate('game.press_space_restart'),
        false
      );
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
