// NETWORK - Client WebSocket pour le mode réseau

type MessageHandler = (data: unknown) => void;

interface NetworkState {
  socket: WebSocket | null;
  connected: boolean;
  playerId: string | null;
  roomId: string | null;
  side: 'left' | 'right' | null;
  onStateUpdate: MessageHandler | null;
  onConnected: MessageHandler | null;
  onDisconnected: (() => void) | null;
}

const state: NetworkState = {
  socket: null,
  connected: false,
  playerId: null,
  roomId: null,
  side: null,
  onStateUpdate: null,
  onConnected: null,
  onDisconnected: null
};

/*
 * Connecte au serveur de jeu
 */
export function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (state.socket) {
      resolve();
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/game/ws`;

    console.log('[NETWORK] Connecting to', url);
    state.socket = new WebSocket(url);

    state.socket.onopen = () => {
      console.log('[NETWORK] Connected');
      state.connected = true;
      resolve();
    };

    state.socket.onclose = () => {
      console.log('[NETWORK] Disconnected');
      state.connected = false;
      state.playerId = null;
      state.roomId = null;
      state.side = null;
      state.socket = null;
      if (state.onDisconnected) state.onDisconnected();
    };

    state.socket.onerror = (err) => {
      console.error('[NETWORK] Error:', err);
      reject(err);
    };

    state.socket.onmessage = (event) => {
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
  playerId: string;
  roomId: string;
  side: 'left' | 'right';
}

function isConnectedData(data: unknown): data is ConnectedData {
  return (
    typeof data === 'object' && data !== null &&
    'playerId' in data && typeof (data as ConnectedData).playerId === 'string' &&
    'roomId' in data && typeof (data as ConnectedData).roomId === 'string' &&
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
      state.playerId = message.data.playerId;
      state.roomId = message.data.roomId;
      state.side = message.data.side;
      console.log(`[NETWORK] Joined ${message.data.roomId} as ${message.data.side}`);
      if (state.onConnected) state.onConnected(message.data);
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
 * Demande au serveur de demarrer la partie
 */
export function sendStart(): void {
  if (!state.socket || !state.connected) return;

  state.socket.send(JSON.stringify({ type: 'start' }));
}

/*
 * Enregistre un callback pour les mises a jour d'etat
 */
export function onStateUpdate(handler: MessageHandler): void {
  state.onStateUpdate = handler;
}

/*
 * Enregistre un callback pour la connexion
 */
export function onConnected(handler: MessageHandler): void {
  state.onConnected = handler;
}

/*
 * Enregistre un callback pour la deconnexion
 */
export function onDisconnected(handler: () => void): void {
  state.onDisconnected = handler;
}

/*
 * Getters
 */
export function isConnected(): boolean {
  return state.connected;
}

export function getPlayerId(): string | null {
  return state.playerId;
}

export function getRoomId(): string | null {
  return state.roomId;
}

export function getSide(): 'left' | 'right' | null {
  return state.side;
}

export const Network = {
  connect,
  disconnect,
  sendInput,
  sendStart,
  onStateUpdate,
  onConnected,
  onDisconnected,
  isConnected,
  getPlayerId,
  getRoomId,
  getSide
};
