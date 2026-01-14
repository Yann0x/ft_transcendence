import fastify, { type FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import {
  createRoom,
  findOrCreateRoom,
  findRoomByPlayer,
  addPlayer,
  removePlayer,
  applyInput,
  applyInputBoth,
  startGameLoop,
  getPvPStats,
  pauseGame,
  resumeGame,
  restartGame
} from './room.js';

const server = fastify({ logger: true });

async function start() {
  await server.register(websocket);

  server.get('/game', async () => {
    return { status: 'ok', service: 'game' };
  });

  server.get('/game/stats', async () => {
    return getPvPStats();
  });

  server.get('/game/ws', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const url = new URL(request.url, `http://${request.headers.host}`);
    const mode = url.searchParams.get('mode') as 'solo' | 'local' | 'pvp' || 'solo';
    const difficulty = url.searchParams.get('difficulty') as 'easy' | 'normal' | 'hard' || 'hard';

    console.log(`[WS] Connected: ${playerId}, mode=${mode}, difficulty=${difficulty}`);

    let room;
    if (mode === 'pvp') {
      room = findOrCreateRoom();
    } else {
      const allowAI = mode === 'solo';
      room = createRoom(false, allowAI, difficulty);
    }

    const player = addPlayer(room, socket, playerId);
    if (!player) {
      socket.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
      socket.close();
      return;
    }

    socket.send(JSON.stringify({
      type: 'connected',
      data: { playerId, roomId: room.id, side: player.side }
    }));

    socket.on('message', (rawMessage: Buffer) => {
      try {
        const message = JSON.parse(rawMessage.toString());

        switch (message.type) {
          case 'input':
            applyInput(room, playerId, message.data);
            break;
          case 'inputBoth':
            applyInputBoth(room, message.data.p1, message.data.p2);
            break;
          case 'start':
            if (room.state.phase === 'ready') startGameLoop(room);
            else if (room.state.phase === 'ended') restartGame(room);
            break;
          case 'pause':
            pauseGame(room);
            break;
          case 'resume':
            resumeGame(room);
            break;
        }
      } catch (err) {
        console.error('[WS] Invalid message:', err);
      }
    });

    socket.on('close', () => {
      console.log(`[WS] Disconnected: ${playerId}`);
      const currentRoom = findRoomByPlayer(playerId);
      if (currentRoom) removePlayer(currentRoom, playerId);
    });

    socket.on('error', (err: Error) => {
      console.error(`[WS] Error for ${playerId}:`, err);
    });
  });

  server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`[GAME] Listening at ${address}`);
  });
}

start();
