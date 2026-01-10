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

/*
 * Connecte au serveur de jeu
 * @param mode - 'solo' pour jouer contre l'IA, 'local' pour PvP local, 'pvp' pour le matchmaking
 * @param difficulty - difficulte de l'IA (beginner, normal, hard)
 */
export function connect(mode: 'solo' | 'local' | 'pvp' = 'solo', difficulty: AIDifficulty = 'hard'): Promise<void> {
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
    const url = `${protocol}//${window.location.host}/api/game/ws?mode=${mode}&difficulty=${difficulty}`;

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

export const Network = {
  connect,
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
