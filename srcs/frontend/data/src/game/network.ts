// NETWORK - Client WebSocket pour le mode réseau

type MessageHandler = (data: unknown) => void;

interface NetworkState {
  socket: WebSocket | null;
  connected: boolean;
  side: 'left' | 'right' | null;
  onStateUpdate: MessageHandler | null;
  onDisconnected: (() => void) | null;
}

const state: NetworkState = {
  socket: null,
  connected: false,
  side: null,
  onStateUpdate: null,
  onDisconnected: null
};

export type AIDifficulty = 'easy' | 'normal' | 'hard';

export interface TournamentMatchInfo {
  tournamentId: string;
  matchId: string;
  playerId: string;
  isPlayer1: boolean;
}

/*
 * Connecte au serveur de jeu
 * @param mode - 'solo' pour jouer contre l'IA, 'local' pour PvP local, 'pvp' pour le matchmaking, 'tournament' pour les tournois
 * @param difficulty - difficulte de l'IA (beginner, normal, hard)
 * @param tournamentInfo - info du match de tournoi (requis pour mode='tournament')
 */
export function connect(
  mode: 'solo' | 'local' | 'pvp' | 'tournament' = 'solo', 
  difficulty: AIDifficulty = 'hard',
  tournamentInfo?: TournamentMatchInfo
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Deconnecter d'abord si deja connecte
    if (state.socket) {
      // Detacher les handlers AVANT de fermer pour eviter les interferences
      state.socket.onopen = null;
      state.socket.onclose = null;
      state.socket.onerror = null;
      state.socket.onmessage = null;
      state.socket.close();
    }

    // Reset state
    state.socket = null;
    state.connected = false;
    state.side = null;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let url = `${protocol}//${window.location.host}/api/game/ws?mode=${mode}&difficulty=${difficulty}`;
    
    // Add tournament parameters if in tournament mode
    if (mode === 'tournament' && tournamentInfo) {
      url += `&tournamentId=${encodeURIComponent(tournamentInfo.tournamentId)}`;
      url += `&matchId=${encodeURIComponent(tournamentInfo.matchId)}`;
      url += `&playerId=${encodeURIComponent(tournamentInfo.playerId)}`;
      url += `&isPlayer1=${tournamentInfo.isPlayer1}`;
    }

    console.log('[NETWORK] Connecting to', url, 'mode:', mode);
    const newSocket = new WebSocket(url);

    newSocket.onopen = () => {
      console.log('[NETWORK] Connected');
      state.socket = newSocket;
      state.connected = true;
      resolve();
    };

    newSocket.onclose = () => {
      // Seulement reagir si c'est le socket actif
      if (state.socket === newSocket) {
        console.log('[NETWORK] Disconnected');
        state.connected = false;
        state.side = null;
        state.socket = null;
        if (state.onDisconnected) state.onDisconnected();
      }
    };

    newSocket.onerror = (err) => {
      console.error('[NETWORK] Error:', err);
      reject(err);
    };

    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (err) {
        console.error('[NETWORK] Invalid message:', err);
      }
    };
  });
}

/*
 * Deconnecte du serveur
 */
export function disconnect(): void {
  if (state.socket) {
    state.socket.close();
    state.socket = null;
  }
}

interface ConnectedData {
  side: 'left' | 'right';
}

function isConnectedData(data: unknown): data is ConnectedData {
  return (
    typeof data === 'object' && data !== null &&
    'side' in data && ((data as ConnectedData).side === 'left' || (data as ConnectedData).side === 'right')
  );
}

function handleMessage(message: { type: string; data?: unknown; message?: string }): void {
  switch (message.type) {
    case 'connected':
      if (!isConnectedData(message.data)) {
        console.error('[NETWORK] Invalid connected data');
        return;
      }
      state.side = message.data.side;
      console.log(`[NETWORK] Joined as ${message.data.side}`);
      break;

    case 'state':
      if (state.onStateUpdate) state.onStateUpdate(message.data);
      break;

    case 'error':
      console.error('[NETWORK] Server error:', message.message);
      break;

    default:
      console.log('[NETWORK] Unknown message:', message.type);
  }
}

/*
 * Envoie un input au serveur
 */
export function sendInput(up: boolean, down: boolean): void {
  if (!state.socket || !state.connected) return;

  state.socket.send(JSON.stringify({
    type: 'input',
    data: { up, down }
  }));
}

/*
 * Envoie les inputs des deux joueurs (mode local)
 */
export function sendInputBoth(p1: { up: boolean; down: boolean }, p2: { up: boolean; down: boolean }): void {
  if (!state.socket || !state.connected) return;

  state.socket.send(JSON.stringify({
    type: 'inputBoth',
    data: { p1, p2 }
  }));
}

/*
 * Demande au serveur de demarrer la partie
 */
export function sendStart(): void {
  if (!state.socket || !state.connected) return;

  state.socket.send(JSON.stringify({ type: 'start' }));
}

/*
 * Met la partie en pause
 */
export function sendPause(): void {
  if (!state.socket || !state.connected) return;

  state.socket.send(JSON.stringify({ type: 'pause' }));
}

/*
 * Reprend la partie
 */
export function sendResume(): void {
  if (!state.socket || !state.connected) return;

  state.socket.send(JSON.stringify({ type: 'resume' }));
}

/*
 * Enregistre un callback pour les mises a jour d'etat
 */
export function onStateUpdate(handler: MessageHandler): void {
  state.onStateUpdate = handler;
}

/*
 * Enregistre un callback pour la deconnexion
 */
export function onDisconnected(handler: () => void): void {
  state.onDisconnected = handler;
}

export function isConnected(): boolean {
  return state.connected;
}

export function getSide(): 'left' | 'right' | null {
  return state.side;
}

/**
 * Connect to an invitation game room
 * @param invitationId - Invitation ID
 * @param gameRoomId - Game room ID
 */
export function connectInvitation(invitationId: string, gameRoomId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Disconnect if already connected
    if (state.socket) {
      state.socket.onopen = null;
      state.socket.onclose = null;
      state.socket.onerror = null;
      state.socket.onmessage = null;
      state.socket.close();
    }

    // Reset state
    state.socket = null;
    state.connected = false;
    state.side = null;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let url = `${protocol}//${window.location.host}/api/game/ws?mode=invitation&invitationId=${encodeURIComponent(invitationId)}&roomId=${encodeURIComponent(gameRoomId)}`;

    // Add JWT token as query param for authentication
    const token = sessionStorage.getItem('authToken');
    if (token) {
      url += `&token=${encodeURIComponent(token)}`;
    }

    console.log('[NETWORK] Connecting to invitation game');
    const newSocket = new WebSocket(url);

    newSocket.onopen = () => {
      console.log('[NETWORK] Connected to invitation game');
      state.socket = newSocket;
      state.connected = true;
      resolve();
    };

    newSocket.onclose = () => {
      if (state.socket === newSocket) {
        console.log('[NETWORK] Disconnected from invitation game');
        state.connected = false;
        state.side = null;
        if (state.onDisconnected) {
          state.onDisconnected();
        }
      }
    };

    newSocket.onerror = (err) => {
      console.error('[NETWORK] WebSocket error:', err);
      reject(new Error('Invitation game connection failed'));
    };

    newSocket.onmessage = (event) => {
      if (state.socket !== newSocket) return;

      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'connected') {
          console.log('[NETWORK] Invitation game connected:', msg.data);
          state.side = msg.data.side;
        } else if (msg.type === 'state' && state.onStateUpdate) {
          state.onStateUpdate(msg.data);
        } else if (msg.type === 'error') {
          console.error('[NETWORK] Server error:', msg.message);
        }
      } catch (err) {
        console.error('[NETWORK] Parse error:', err);
      }
    };
  });
}

export const Network = {
  connect,
  connectInvitation,
  disconnect,
  sendInput,
  sendInputBoth,
  sendStart,
  sendPause,
  sendResume,
  onStateUpdate,
  onDisconnected,
  isConnected,
  getSide
};
