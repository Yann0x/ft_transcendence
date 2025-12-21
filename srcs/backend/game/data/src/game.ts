// GAME SERVER - Point d'entree du service game

import fastify from 'fastify';
import websocket from '@fastify/websocket';
import {
  findOrCreateRoom,
  findRoomByPlayer,
  addPlayer,
  removePlayer,
  applyInput,
  startGameLoop
} from './room.js';

const server = fastify({ logger: true });

// Register WebSocket plugin
server.register(websocket);

// Log incoming requests
server.addHook('onRequest', async (request) => {
  console.log(`[GAME] ${request.method} ${request.url}`);
});

// HTTP health check
server.get('/game', async () => {
  return { status: 'ok', service: 'game' };
});

// WebSocket endpoint
server.get('/game/ws', { websocket: true }, (socket, req) => {
  // Generer un ID unique pour ce joueur
  const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[WS] Player connected: ${playerId}`);

  // Trouver ou creer une room
  const room = findOrCreateRoom();
  const player = addPlayer(room, socket, playerId);

  if (!player) {
    socket.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
    socket.close();
    return;
  }

  // Envoyer l'info de connexion
  socket.send(JSON.stringify({
    type: 'connected',
    data: {
      playerId,
      roomId: room.id,
      side: player.side
    }
  }));

  // Gestion des messages
  socket.on('message', (rawMessage: Buffer) => {
    try {
      const message = JSON.parse(rawMessage.toString());

      switch (message.type) {
        case 'input':
          // { type: 'input', data: { up: bool, down: bool } }
          applyInput(room, playerId, message.data);
          break;

        case 'start':
          // Demarrer la partie
          if (room.players.length === 2 && room.state.phase === 'ready') {
            startGameLoop(room);
          }
          break;

        default:
          console.log(`[WS] Unknown message type: ${message.type}`);
      }
    } catch (err: unknown) {
      console.error('[WS] Invalid message:', err);
    }
  });

  // Deconnexion
  socket.on('close', () => {
    console.log(`[WS] Player disconnected: ${playerId}`);
    const currentRoom = findRoomByPlayer(playerId);
    if (currentRoom) {
      removePlayer(currentRoom, playerId);
    }
  });

  socket.on('error', (err) => {
    console.error(`[WS] Socket error for ${playerId}:`, err);
  });
});

// Demarrer le serveur
server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`[GAME] Server listening at ${address}`);
});
