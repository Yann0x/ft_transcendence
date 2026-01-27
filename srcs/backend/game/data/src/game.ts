/* GAME */

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
  restartGame,
  createTournamentRoom,
  createInvitationRoom,
  getInvitationRoom,
  getActiveGameForPlayer,
  setTournamentCallbacks,
  type TournamentCallbacks
} from './room.js';

/* SERVER */

const server = fastify({ logger: true });

/* TOURNAMENT CALLBACKS */

const tournamentCallbacks: TournamentCallbacks = {
  onMatchStart: async (tournamentId: string, matchId: string, gameRoomId: string) => {
    try {
      await fetch(`http://tournament:3000/tournament/${tournamentId}/match/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, gameRoomId })
      });
    } catch (e) {
      console.error('[TOURNAMENT] Failed to notify match start:', e);
    }
  },
  onScoreUpdate: async (tournamentId: string, matchId: string, score1: number, score2: number) => {
    try {
      await fetch(`http://tournament:3000/tournament/${tournamentId}/match/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, score1, score2 })
      });
    } catch (e) {
      console.error('[TOURNAMENT] Failed to update score:', e);
    }
  },
  onMatchEnd: async (tournamentId: string, matchId: string, score1: number, score2: number) => {
    try {
      await fetch(`http://tournament:3000/tournament/${tournamentId}/match/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, score1, score2 })
      });
    } catch (e) {
      console.error('[TOURNAMENT] Failed to notify match end:', e);
    }
  }
};

setTournamentCallbacks(tournamentCallbacks);

/* JWT VALIDATION */

async function validateJWT(token: string): Promise<string | null> {
  try {
    const response = await fetch('http://authenticate:3000/check_jwt', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const sender = await response.json();
      if (sender?.id) {
        return sender.id.toString();
      }
    }
  } catch (error) {
    console.error('[GAME] Failed to validate JWT:', error);
  }
  return null;
}

/* ROUTES */

/* Route de health check */
async function healthRoute() {
  return { status: 'ok', service: 'game' };
}

/* Route de stats PvP */
async function statsRoute() {
  return getPvPStats();
}

/* Route pour récupérer une partie active */
async function activeGameRoute(request: FastifyRequest, reply: any) {
  let userId = request.headers['x-sender-id'] as string | undefined;

  if (!userId) {
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      userId = await validateJWT(token) || undefined;
    }
  }

  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const activeGame = getActiveGameForPlayer(userId);
  if (!activeGame) {
    return reply.status(404).send({ error: 'No active game' });
  }

  console.log(`[GAME] Active game for ${userId}:`, activeGame);
  return activeGame;
}

/* Route pour créer une room d'invitation */
async function invitationRoomRoute(request: FastifyRequest, reply: any) {
  const { invitationId, inviterId, invitedId } = request.body as {
    invitationId: string;
    inviterId: string;
    invitedId: string;
  };

  if (!invitationId || !inviterId || !invitedId) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  try {
    const room = createInvitationRoom(invitationId, inviterId, invitedId);
    return reply.status(200).send({ gameRoomId: room.id });
  } catch (error) {
    console.error('[GAME] Error creating invitation room:', error);
    return reply.status(500).send({ error: 'Failed to create invitation room' });
  }
}

/* WEBSOCKET */

/* Handler WebSocket principal */
async function websocketHandler(socket: WebSocket, request: FastifyRequest) {
  let userId = request.headers['x-sender-id'] as string | undefined;

  const url = new URL(request.url, `http://${request.headers.host}`);

  console.log('[WS] Headers x-sender-id:', userId);

  if (!userId) {
    const token = url.searchParams.get('token');
    console.log('[WS] Token from query param:', token ? `${token.substring(0, 20)}...` : 'null');
    if (token) {
      console.log('[WS] Validating JWT with authenticate service...');
      const validatedId = await validateJWT(token);
      if (validatedId) {
        userId = validatedId;
        console.log('[WS] JWT validated from query param, user:', userId);
      }
    }
  }

  const playerId = userId || `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const mode = url.searchParams.get('mode') as 'solo' | 'local' | 'pvp' | 'tournament' | 'invitation' || 'solo';
  const difficulty = url.searchParams.get('difficulty') as 'easy' | 'normal' | 'hard' || 'hard';

  const tournamentId = url.searchParams.get('tournamentId');
  const matchId = url.searchParams.get('matchId');
  const tournamentPlayerId = url.searchParams.get('playerId');
  const isPlayer1 = url.searchParams.get('isPlayer1') === 'true';

  const invitationId = url.searchParams.get('invitationId');
  const roomId = url.searchParams.get('roomId');

  console.log(`[WS] Connected: ${playerId}, mode=${mode}, difficulty=${difficulty}, invitationId=${invitationId}, roomId=${roomId}`);

  let room;
  if (mode === 'invitation' && invitationId && roomId) {
    room = getInvitationRoom(invitationId);
    if (!room || room.id !== roomId) {
      console.error(`[WS] Invalid invitation room: ${invitationId}, ${roomId}`);
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid invitation room' }));
      socket.close();
      return;
    }
    console.log(`[WS] Invitation match: ${invitationId}, room: ${roomId}, players in room: ${room.players.length}, invitationInfo:`, room.invitationInfo);
  } else if (mode === 'tournament' && tournamentId && matchId && tournamentPlayerId) {
    room = createTournamentRoom(tournamentId, matchId, tournamentPlayerId, isPlayer1);
    console.log(`[WS] Tournament match: ${tournamentId}/${matchId}, player: ${tournamentPlayerId}, isPlayer1: ${isPlayer1}`);
  } else if (mode === 'pvp') {
    room = findOrCreateRoom();
  } else {
    const allowAI = mode === 'solo';
    room = createRoom(false, allowAI, difficulty);
  }

  console.log(`[WS] Attempting to add player ${playerId} to room ${room.id}`);
  const player = addPlayer(room, socket, playerId, tournamentPlayerId);
  if (!player) {
    console.error(`[WS] Failed to add player ${playerId} to room ${room.id} - room full or not authorized`);
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
          if (!room.tournamentInfo) {
            pauseGame(room);
          }
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
}

/* START */

async function start() {
  await server.register(websocket);

  server.get('/game', healthRoute);
  server.get('/game/stats', statsRoute);
  server.get('/game/active', activeGameRoute);
  server.post('/game/invitation-room', invitationRoomRoute);
  server.get('/game/ws', { websocket: true }, websocketHandler);

  server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`[GAME] Listening at ${address}`);
  });
}

start();
