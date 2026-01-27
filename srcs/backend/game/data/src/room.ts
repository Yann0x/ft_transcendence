/* ROOM */

import type { WebSocket } from 'ws';
import { createGameState, type GameState, type PlayerInput } from './state.js';
import { physicsTick } from './physics.js';
import { TICK_INTERVAL, WIN_SCORE, type AIDifficulty } from './config.js';
import { createAIState, updateAI, getAIInput, type AIState } from './ai.js';

/* TYPES */

export interface Player {
  id: string;
  socket: WebSocket;
  side: 'left' | 'right';
  tournamentPlayerId?: string;
}

export interface TournamentInfo {
  tournamentId: string;
  matchId: string;
  player1Id: string;
  player2Id?: string;
  matchStarted: boolean;
  lastScore: { left: number; right: number };
}

export interface InvitationInfo {
  invitationId: string;
  inviterId: string;
  invitedId: string;
  disconnectedPlayer?: string;
}

export interface Room {
  id: string;
  players: Player[];
  state: GameState;
  intervalId: NodeJS.Timeout | null;
  ai: AIState | null;
  isPvP: boolean;
  allowAI: boolean;
  aiDifficulty: AIDifficulty;
  tournamentInfo?: TournamentInfo;
  invitationInfo?: InvitationInfo;
}

export interface TournamentCallbacks {
  onMatchStart: (tournamentId: string, matchId: string, gameRoomId: string) => Promise<void>;
  onScoreUpdate: (tournamentId: string, matchId: string, score1: number, score2: number) => Promise<void>;
  onMatchEnd: (tournamentId: string, matchId: string, score1: number, score2: number) => Promise<void>;
}

export interface ActiveGameInfo {
  roomId: string;
  invitationId?: string;
  opponentId?: string;
  phase: string;
  score: { left: number; right: number };
  side: 'left' | 'right';
}

/* STATE */

let tournamentCallbacks: TournamentCallbacks | null = null;

const rooms = new Map<string, Room>();
const tournamentRooms = new Map<string, Room>();
const invitationRooms = new Map<string, Room>();
let roomCounter = 0;

/* CALLBACKS */

export function setTournamentCallbacks(callbacks: TournamentCallbacks): void {
  tournamentCallbacks = callbacks;
}

/* CREATE ROOM */

export function createRoom(isPvP: boolean = false, allowAI: boolean = true, aiDifficulty: AIDifficulty = 'hard'): Room {
  const id = `room_${++roomCounter}`;
  const room: Room = {
    id,
    players: [],
    state: createGameState(),
    intervalId: null,
    ai: null,
    isPvP,
    allowAI,
    aiDifficulty
  };
  rooms.set(id, room);
  const modeLabel = isPvP ? 'PvP' : (allowAI ? `Solo (${aiDifficulty})` : 'Local');
  console.log(`[ROOM] Created ${id} (${modeLabel})`);
  return room;
}

/* TOURNAMENT ROOM */

export function createTournamentRoom(
  tournamentId: string,
  matchId: string,
  tournamentPlayerId: string,
  isPlayer1: boolean
): Room {
  let room = tournamentRooms.get(matchId);

  if (room) {
    if (room.tournamentInfo) {
      if (isPlayer1 && !room.tournamentInfo.player1Id) {
        room.tournamentInfo.player1Id = tournamentPlayerId;
      } else if (!isPlayer1 && !room.tournamentInfo.player2Id) {
        room.tournamentInfo.player2Id = tournamentPlayerId;
      }
    }
    console.log(`[TOURNAMENT] Player ${tournamentPlayerId} (isPlayer1: ${isPlayer1}) joining existing room for match ${matchId}`);
    return room;
  }

  const id = `tournament_${matchId}`;
  room = {
    id,
    players: [],
    state: createGameState(),
    intervalId: null,
    ai: null,
    isPvP: true,
    allowAI: false,
    aiDifficulty: 'hard',
    tournamentInfo: {
      tournamentId,
      matchId,
      player1Id: isPlayer1 ? tournamentPlayerId : '',
      player2Id: isPlayer1 ? '' : tournamentPlayerId,
      matchStarted: false,
      lastScore: { left: 0, right: 0 }
    }
  };

  rooms.set(id, room);
  tournamentRooms.set(matchId, room);
  console.log(`[TOURNAMENT] Created room for match ${matchId}, ${isPlayer1 ? 'player1' : 'player2'}: ${tournamentPlayerId}`);
  return room;
}

/* INVITATION ROOM */

export function createInvitationRoom(
  invitationId: string,
  inviterId: string,
  invitedId: string
): Room {
  const id = `invitation_${invitationId}`;
  const room: Room = {
    id,
    players: [],
    state: createGameState(),
    intervalId: null,
    ai: null,
    isPvP: true,
    allowAI: false,
    aiDifficulty: 'hard',
    invitationInfo: {
      invitationId,
      inviterId,
      invitedId
    }
  };

  rooms.set(id, room);
  invitationRooms.set(invitationId, room);
  console.log(`[INVITATION] Created room ${id} for invitation ${invitationId}: ${inviterId} vs ${invitedId}`);
  return room;
}

export function getInvitationRoom(invitationId: string): Room | undefined {
  return invitationRooms.get(invitationId);
}

/* ADD PLAYER */

export function addPlayer(room: Room, socket: WebSocket, playerId: string, tournamentPlayerId?: string): Player | null {
  if (room.tournamentInfo && tournamentPlayerId) {
    const existingPlayer = room.players.find(p => p.tournamentPlayerId === tournamentPlayerId);
    if (existingPlayer) {
      console.log(`[ROOM] Player ${tournamentPlayerId} already in room ${room.id}, updating socket`);
      existingPlayer.socket = socket;
      return existingPlayer;
    }
  }

  if (room.invitationInfo) {
    const { inviterId, invitedId } = room.invitationInfo;
    console.log(`[ROOM] Invitation room check: playerId=${playerId}, inviterId=${inviterId}, invitedId=${invitedId}, currentPlayers=${room.players.length}`);
    if (playerId !== inviterId && playerId !== invitedId) {
      console.log(`[ROOM] Rejected ${playerId} - not authorized for this invitation match (expected: ${inviterId} or ${invitedId})`);
      return null;
    }

    if (room.players.some(p => p.id === playerId)) {
      console.log(`[ROOM] Player ${playerId} already in room ${room.id}, updating socket`);
      room.players.find(p => p.id === playerId)!.socket = socket;
      return room.players.find(p => p.id === playerId)!;
    }

    let side: 'left' | 'right';
    if (playerId === inviterId) side = 'left';
    else side = 'right';

    if (room.players.some(p => p.side === side)) {
      console.log(`[ROOM] Side ${side} already taken in room ${room.id}`);
      return null;
    }

    const player: Player = { id: playerId, socket, side };
    room.players.push(player);
    console.log(`[ROOM] ${playerId} joined ${room.id} as ${side}`);

    if (room.invitationInfo?.disconnectedPlayer === playerId) {
      delete room.invitationInfo.disconnectedPlayer;
      console.log(`[ROOM] Player ${playerId} reconnected`);
    }

    if (room.players.length === 2) {
      if (room.state.phase === 'waiting') {
        room.state.phase = 'ready';
        broadcastState(room);
        console.log(`[ROOM] ${room.id} ready - both players joined`);
      } else if (room.state.phase === 'paused') {
        room.state.phase = 'playing';
        broadcastState(room);
        console.log(`[ROOM] ${room.id} resumed - player reconnected`);
      }
    }

    return player;
  }

  if (room.players.length >= 2) return null;

  if (room.tournamentInfo) {
    if (!tournamentPlayerId) {
      console.log(`[ROOM] Rejected ${playerId} - tournament room requires tournamentPlayerId`);
      return null;
    }
    const { player1Id, player2Id } = room.tournamentInfo;
    const isPlayer1 = tournamentPlayerId === player1Id || (player1Id === '' && player2Id !== tournamentPlayerId);
    const isPlayer2 = tournamentPlayerId === player2Id || (player2Id === '' && player1Id !== tournamentPlayerId);

    if (!isPlayer1 && !isPlayer2) {
      console.log(`[ROOM] Rejected ${playerId} - not authorized for this tournament match (expected: ${player1Id} or ${player2Id}, got: ${tournamentPlayerId})`);
      return null;
    }

    if (isPlayer1 && player1Id === '') {
      room.tournamentInfo.player1Id = tournamentPlayerId;
      console.log(`[ROOM] Set player1Id to ${tournamentPlayerId}`);
    }
    if (isPlayer2 && player2Id === '') {
      room.tournamentInfo.player2Id = tournamentPlayerId;
      console.log(`[ROOM] Set player2Id to ${tournamentPlayerId}`);
    }
  }

  const side = room.players.length === 0 ? 'left' : 'right';
  const player: Player = { id: playerId, socket, side, tournamentPlayerId };
  room.players.push(player);

  console.log(`[ROOM] ${playerId} joined ${room.id} as ${side}${tournamentPlayerId ? ` (tournament: ${tournamentPlayerId})` : ''}`);

  if (room.state.phase === 'waiting') {
    if (room.isPvP || room.tournamentInfo) {
      if (room.players.length === 2) {
        room.state.phase = 'ready';
        broadcastState(room);
      }
    } else {
      room.state.phase = 'ready';
      broadcastState(room);
    }
  } else if (room.state.phase === 'paused' && room.isPvP && room.players.length === 2) {
    resumeGame(room);
    console.log(`[ROOM] ${room.id} resumed - opponent rejoined`);
  }

  return player;
}

/* REMOVE PLAYER */

export function removePlayer(room: Room, playerId: string): void {
  const idx = room.players.findIndex(p => p.id === playerId);
  if (idx !== -1) {
    room.players.splice(idx, 1);
    console.log(`[ROOM] ${playerId} left ${room.id}`);
  }

  if (room.players.length === 0) {
    if (room.invitationInfo && room.state.phase !== 'ended') {
      room.invitationInfo.disconnectedPlayer = playerId;
      console.log(`[ROOM] ${room.id} - all players disconnected, waiting for reconnection`);

      if (room.state.phase === 'playing') {
        room.state.phase = 'paused';
      }
      return;
    }

    stopGameLoop(room);
    rooms.delete(room.id);
    if (room.tournamentInfo) {
      tournamentRooms.delete(room.tournamentInfo.matchId);
    }
    if (room.invitationInfo) {
      invitationRooms.delete(room.invitationInfo.invitationId);
    }
    console.log(`[ROOM] Deleted ${room.id}`);
    return;
  }

  if (room.invitationInfo && room.players.length === 1) {
    if (room.state.phase === 'playing' || room.state.phase === 'paused') {
      room.invitationInfo.disconnectedPlayer = playerId;
      room.state.phase = 'paused';
      broadcastState(room);
      console.log(`[ROOM] ${room.id} paused - waiting for ${playerId} to reconnect`);
      return;
    } else if (room.state.phase === 'ready') {
      room.state.phase = 'waiting';
      broadcastState(room);
      console.log(`[ROOM] ${room.id} back to waiting - opponent left`);
    }
    return;
  }

  if ((room.isPvP || room.tournamentInfo) && room.players.length === 1) {
    if (room.state.phase === 'playing' || room.state.phase === 'paused') {
      const remainingPlayer = room.players[0];
      if (!remainingPlayer) return;

      const winningSide = remainingPlayer.side;
      stopGameLoop(room);

      if (winningSide === 'left') {
        room.state.score.left = WIN_SCORE;
      } else {
        room.state.score.right = WIN_SCORE;
      }

      room.state.phase = 'ended';
      room.state.endReason = 'forfeit';
      broadcastState(room);
      console.log(`[ROOM] ${room.id} ended - ${winningSide} wins by forfeit`);

      if (room.tournamentInfo && tournamentCallbacks) {
        tournamentCallbacks.onMatchEnd(
          room.tournamentInfo.tournamentId,
          room.tournamentInfo.matchId,
          room.state.score.left,
          room.state.score.right
        );
      }
    } else if (room.state.phase === 'ready') {
      room.state.phase = 'waiting';
      broadcastState(room);
      console.log(`[ROOM] ${room.id} back to waiting - opponent left`);
    }
  }
}

/* GAME LOOP */

export function startGameLoop(room: Room): void {
  if (room.intervalId) return;

  if (room.players.length === 1 && room.allowAI) {
    room.ai = createAIState(room.aiDifficulty);
    console.log(`[ROOM] AI enabled for ${room.id} (${room.aiDifficulty})`);
  } else {
    room.ai = null;
  }

  room.state.phase = 'playing';
  let lastTick = Date.now();

  if (room.tournamentInfo && !room.tournamentInfo.matchStarted && tournamentCallbacks) {
    room.tournamentInfo.matchStarted = true;
    tournamentCallbacks.onMatchStart(
      room.tournamentInfo.tournamentId,
      room.tournamentInfo.matchId,
      room.id
    );
  }

  room.intervalId = setInterval(() => {
    const now = Date.now();
    const dt = now - lastTick;
    lastTick = now;

    if (room.ai) {
      updateAI(room.ai, room.state, now);
      room.state.inputs[1] = getAIInput(room.ai);
    }

    physicsTick(room.state, dt);
    broadcastState(room);

    if (room.tournamentInfo && tournamentCallbacks) {
      const currentScore = room.state.score;
      const lastScore = room.tournamentInfo.lastScore;

      if (currentScore.left !== lastScore.left || currentScore.right !== lastScore.right) {
        room.tournamentInfo.lastScore = { ...currentScore };
        tournamentCallbacks.onScoreUpdate(
          room.tournamentInfo.tournamentId,
          room.tournamentInfo.matchId,
          currentScore.left,
          currentScore.right
        );
      }
    }

    if (room.state.phase === 'ended') {
      stopGameLoop(room);

      console.log(`[ROOM] Match ended in ${room.id}: isPvP=${room.isPvP}, hasAI=${!!room.ai}, allowAI=${room.allowAI}, players=${room.players.length}, hasInvitation=${!!room.invitationInfo}, hasTournament=${!!room.tournamentInfo}`);

      if (room.tournamentInfo && tournamentCallbacks) {
        tournamentCallbacks.onMatchEnd(
          room.tournamentInfo.tournamentId,
          room.tournamentInfo.matchId,
          room.state.score.left,
          room.state.score.right
        );
      }

      if (room.invitationInfo) {
        saveInvitationMatch(room);
      } else if (room.tournamentInfo) {
        saveTournamentMatch(room);
      } else if (room.isPvP && room.players.length === 2) {
        savePvPMatch(room);
      } else if (room.allowAI && room.players.length === 1) {
        saveAIMatch(room);
      }
    }
  }, TICK_INTERVAL);

  console.log(`[ROOM] Game started for ${room.id}`);
}

export function stopGameLoop(room: Room): void {
  if (room.intervalId) {
    clearInterval(room.intervalId);
    room.intervalId = null;
  }
}

/* GAME CONTROLS */

export function pauseGame(room: Room): void {
  if (room.state.phase === 'playing') {
    room.state.phase = 'paused';
    stopGameLoop(room);
    broadcastState(room);
    console.log(`[ROOM] Paused ${room.id}`);
  }
}

export function resumeGame(room: Room): void {
  if (room.state.phase === 'paused') {
    startGameLoop(room);
    console.log(`[ROOM] Resumed ${room.id}`);
  }
}

export function restartGame(room: Room): void {
  if (room.state.phase !== 'ended') return;

  const newState = createGameState();
  room.state.ball = newState.ball;
  room.state.paddles = newState.paddles;
  room.state.score = { left: 0, right: 0 };
  room.state.inputs = [{ up: false, down: false }, { up: false, down: false }];
  room.state.lastScorer = null;
  room.state.ballFrozenUntil = 0;
  room.state.endReason = undefined;

  startGameLoop(room);
  console.log(`[ROOM] Restarted ${room.id}`);
}

/* INPUT */

export function applyInput(room: Room, playerId: string, input: PlayerInput): void {
  const player = room.players.find(p => p.id === playerId);
  if (!player) return;

  const idx = player.side === 'left' ? 0 : 1;
  room.state.inputs[idx] = input;
}

export function applyInputBoth(room: Room, p1: PlayerInput, p2: PlayerInput): void {
  if (room.players.length !== 1) return;
  room.state.inputs[0] = p1;
  room.state.inputs[1] = p2;
}

/* BROADCAST */

function broadcastState(room: Room): void {
  const message = JSON.stringify({
    type: 'state',
    data: {
      phase: room.state.phase,
      endReason: room.state.endReason,
      ball: room.state.ball,
      paddles: room.state.paddles,
      score: room.state.score
    }
  });

  for (const player of room.players) {
    if (player.socket.readyState === 1) {
      player.socket.send(message);
    }
  }
}

/* SAVE MATCH */

function saveInvitationMatch(room: Room): void {
  if (!room.invitationInfo) return;

  const { invitationId, inviterId, invitedId } = room.invitationInfo;
  const { score } = room.state;

  const winnerId = score.left > score.right ? inviterId : invitedId;
  const loserId = winnerId === inviterId ? invitedId : inviterId;

  fetch('http://social:3000/social/game-invitation/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invitationId,
      winnerId,
      loserId,
      score1: score.left,
      score2: score.right
    })
  }).catch(err => {
    console.error('[ROOM] Failed to notify invitation completion:', err);
  });

  fetch('http://database:3000/database/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player1_id: inviterId,
      player2_id: invitedId,
      score1: score.left,
      score2: score.right,
      match_type: 'duel'
    })
  }).then(res => {
    if (res.ok) {
      console.log(`[ROOM] Duel match saved: ${inviterId} vs ${invitedId}`);
    } else {
      console.error('[ROOM] Failed to save duel match:', res.status);
    }
  }).catch(err => {
    console.error('[ROOM] Failed to save duel match:', err);
  });
}

function saveTournamentMatch(room: Room): void {
  const player1 = room.players.find(p => p.side === 'left');
  const player2 = room.players.find(p => p.side === 'right');

  if (player1 && player2 && room.tournamentInfo) {
    const { score } = room.state;
    fetch('http://database:3000/database/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player1_id: player1.id,
        player2_id: player2.id,
        score1: score.left,
        score2: score.right,
        tournament_id: room.tournamentInfo.tournamentId,
        match_type: 'tournament'
      })
    }).then(res => {
      if (res.ok) {
        console.log(`[ROOM] Tournament match saved: ${player1.id} vs ${player2.id}`);
      } else {
        console.error('[ROOM] Failed to save tournament match:', res.status);
      }
    }).catch(err => {
      console.error('[ROOM] Failed to save tournament match:', err);
    });
  }
}

function savePvPMatch(room: Room): void {
  const player1 = room.players.find(p => p.side === 'left');
  const player2 = room.players.find(p => p.side === 'right');

  if (player1 && player2) {
    const { score } = room.state;
    fetch('http://database:3000/database/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player1_id: player1.id,
        player2_id: player2.id,
        score1: score.left,
        score2: score.right,
        match_type: 'pvp'
      })
    }).then(res => {
      if (res.ok) {
        console.log(`[ROOM] PvP match saved: ${player1.id} vs ${player2.id}`);
      } else {
        console.error('[ROOM] Failed to save PvP match:', res.status);
      }
    }).catch(err => {
      console.error('[ROOM] Failed to save PvP match:', err);
    });
  }
}

function saveAIMatch(room: Room): void {
  const player = room.players[0];
  console.log(`[ROOM] AI match checking player: id=${player.id}, isAnonymous=${player.id.startsWith('player_')}`);

  if (player.id && !player.id.startsWith('player_')) {
    const { score } = room.state;
    const aiPlayerId = `AI_${room.aiDifficulty}`;

    fetch('http://database:3000/database/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player1_id: player.id,
        player2_id: aiPlayerId,
        score1: score.left,
        score2: score.right,
        match_type: 'ai'
      })
    }).then(res => {
      if (res.ok) {
        console.log(`[ROOM] AI match saved: ${player.id} vs ${aiPlayerId}`);
      } else {
        console.error('[ROOM] Failed to save AI match:', res.status);
      }
    }).catch(err => {
      console.error('[ROOM] Failed to save AI match:', err);
    });
  } else {
    console.log(`[ROOM] AI match not saved: player ${player.id} is anonymous (no account)`);
  }
}

/* MATCHMAKING */

export function findOrCreateRoom(): Room {
  for (const room of rooms.values()) {
    if (room.tournamentInfo) continue;

    if (room.isPvP && room.players.length === 1 && room.state.phase === 'waiting') {
      console.log(`[ROOM] Found existing PvP room ${room.id}`);
      return room;
    }
  }
  return createRoom(true, false);
}

/* FIND ROOM */

export function findRoomByPlayer(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === playerId)) {
      return room;
    }
  }

  for (const room of rooms.values()) {
    if (room.invitationInfo &&
        (room.invitationInfo.inviterId === playerId || room.invitationInfo.invitedId === playerId) &&
        room.state.phase !== 'ended') {
      return room;
    }
  }

  return undefined;
}

/* ACTIVE GAME */

export function getActiveGameForPlayer(playerId: string): ActiveGameInfo | null {
  const room = findRoomByPlayer(playerId);
  if (!room) return null;

  if (room.state.phase === 'ended') return null;

  let side: 'left' | 'right';
  const player = room.players.find(p => p.id === playerId);

  if (player) {
    side = player.side;
  } else if (room.invitationInfo) {
    side = playerId === room.invitationInfo.inviterId ? 'left' : 'right';
  } else {
    return null;
  }

  let opponentId: string | undefined;
  if (room.invitationInfo) {
    opponentId = playerId === room.invitationInfo.inviterId
      ? room.invitationInfo.invitedId
      : room.invitationInfo.inviterId;
  }

  const result: ActiveGameInfo = {
    roomId: room.id,
    phase: room.state.phase,
    score: room.state.score,
    side
  };

  if (room.invitationInfo?.invitationId) {
    result.invitationId = room.invitationInfo.invitationId;
  }
  if (opponentId) {
    result.opponentId = opponentId;
  }

  return result;
}

/* STATS */

export function getPvPStats(): { waitingPlayers: number; activeGames: number } {
  let waitingPlayers = 0;
  let activeGames = 0;

  for (const room of rooms.values()) {
    if (room.isPvP) {
      if (room.players.length === 1 && room.state.phase === 'waiting') waitingPlayers++;
      if (room.state.phase === 'playing') activeGames++;
    }
  }

  return { waitingPlayers, activeGames };
}
