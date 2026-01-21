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
  setTournamentCallbacks,
  type TournamentCallbacks
} from './room.js';

const server = fastify({ logger: true });

// Tournament integration callbacks
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

async function start() {
  await server.register(websocket);

  server.get('/game', async () => {
    return { status: 'ok', service: 'game' };
  });

  server.get('/game/stats', async () => {
    return getPvPStats();
  });

  // Endpoint to create an invitation room (called by social service)
  server.post('/game/invitation-room', async (request, reply) => {
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
  });

  server.get('/game/ws', { websocket: true }, async (socket: WebSocket, request: FastifyRequest) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const mode = url.searchParams.get('mode') as 'solo' | 'local' | 'pvp' | 'tournament' | 'invitation' || 'solo';
    const difficulty = url.searchParams.get('difficulty') as 'easy' | 'normal' | 'hard' || 'hard';

    // Get user ID from headers (set by proxy auth middleware)
    let userId = request.headers['x-sender-id'] as string | undefined;

    // Fallback: try to extract and validate JWT from query param
    if (!userId) {
      const token = url.searchParams.get('token');

      if (token) {
        try {
          const response = await fetch('http://authenticate:3000/check_jwt', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const sender = await response.json() as { id?: string; name?: string; email?: string } | undefined;
            if (sender && sender.id) {
              userId = sender.id;
              console.log(`[WS] JWT validated from query param, user: ${userId}`);
            }
          } else {
            console.log('[WS] JWT validation failed');
          }
        } catch (error) {
          console.error('[WS] JWT validation error:', error);
        }
      }
    }

    // Invitation mode requires authenticated user
    if (mode === 'invitation' && !userId) {
      console.error('[WS] Invitation mode requires authenticated user');
      socket.send(JSON.stringify({ type: 'error', message: 'Authentication required for invitation games' }));
      socket.close();
      return;
    }
    const playerId = userId || `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Tournament mode parameters
    const tournamentId = url.searchParams.get('tournamentId');
    const matchId = url.searchParams.get('matchId');
    const tournamentPlayerId = url.searchParams.get('playerId'); // Tournament player ID
    const isPlayer1 = url.searchParams.get('isPlayer1') === 'true';

    // Invitation mode parameters
    const invitationId = url.searchParams.get('invitationId');
    const roomId = url.searchParams.get('roomId');

    console.log(`[WS] Connected: ${playerId}, mode=${mode}, difficulty=${difficulty}`);

    let room;
    if (mode === 'invitation' && invitationId && roomId) {
      // Invitation mode - find existing invitation room
      room = getInvitationRoom(invitationId);
      if (!room || room.id !== roomId) {
        console.error(`[WS] Invalid invitation room: ${invitationId}, ${roomId}`);
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid invitation room' }));
        socket.close();
        return;
      }
      console.log(`[WS] Invitation match: ${invitationId}, room: ${roomId}`);
    } else if (mode === 'tournament' && tournamentId && matchId && tournamentPlayerId) {
      // Tournament mode - create or join tournament match room
      room = createTournamentRoom(tournamentId, matchId, tournamentPlayerId, isPlayer1);
      console.log(`[WS] Tournament match: ${tournamentId}/${matchId}, player: ${tournamentPlayerId}, isPlayer1: ${isPlayer1}`);
    } else if (mode === 'pvp') {
      room = findOrCreateRoom();
    } else {
      const allowAI = mode === 'solo';
      room = createRoom(false, allowAI, difficulty);
    }

    const player = addPlayer(room, socket, playerId, tournamentPlayerId);
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
            if (!room.tournamentInfo) { // Don't allow pause in tournament
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
