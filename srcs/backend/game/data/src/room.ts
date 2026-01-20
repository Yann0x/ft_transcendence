import type { WebSocket } from 'ws';
import { createGameState, type GameState, type PlayerInput } from './state.js';
import { physicsTick } from './physics.js';
import { TICK_INTERVAL, WIN_SCORE, type AIDifficulty } from './config.js';
import { createAIState, updateAI, getAIInput, type AIState } from './ai.js';

export interface Player {
  id: string;
  socket: WebSocket;
  side: 'left' | 'right';
  tournamentPlayerId?: string; // Tournament player ID if in tournament mode
}

export interface TournamentInfo {
  tournamentId: string;
  matchId: string;
  player1Id: string;  // Tournament player ID for left player
  player2Id?: string; // Tournament player ID for right player (set when they join)
  matchStarted: boolean;
  lastScore: { left: number; right: number };
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
  tournamentInfo?: TournamentInfo; // Set if this is a tournament match
}

export interface TournamentCallbacks {
  onMatchStart: (tournamentId: string, matchId: string, gameRoomId: string) => Promise<void>;
  onScoreUpdate: (tournamentId: string, matchId: string, score1: number, score2: number) => Promise<void>;
  onMatchEnd: (tournamentId: string, matchId: string, score1: number, score2: number) => Promise<void>;
}

let tournamentCallbacks: TournamentCallbacks | null = null;

export function setTournamentCallbacks(callbacks: TournamentCallbacks): void {
  tournamentCallbacks = callbacks;
}

const rooms = new Map<string, Room>();
const tournamentRooms = new Map<string, Room>(); // matchId -> Room for tournament matches
let roomCounter = 0;

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

/**
 * Create or find a room for a tournament match
 */
export function createTournamentRoom(
  tournamentId: string, 
  matchId: string, 
  tournamentPlayerId: string,
  isPlayer1: boolean
): Room {
  // Check if room already exists for this match
  let room = tournamentRooms.get(matchId);
  
  if (room) {
    // Room exists, update the appropriate player ID
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
  
  // Create new tournament room
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

export function addPlayer(room: Room, socket: WebSocket, playerId: string, tournamentPlayerId?: string): Player | null {
  // Check if this player is already in the room (prevent duplicate joins)
  if (room.tournamentInfo && tournamentPlayerId) {
    const existingPlayer = room.players.find(p => p.tournamentPlayerId === tournamentPlayerId);
    if (existingPlayer) {
      console.log(`[ROOM] Player ${tournamentPlayerId} already in room ${room.id}, updating socket`);
      // Update socket for reconnection
      existingPlayer.socket = socket;
      return existingPlayer;
    }
  }

  if (room.players.length >= 2) return null;

  // Verify tournament player authorization
  if (room.tournamentInfo) {
    if (!tournamentPlayerId) {
      console.log(`[ROOM] Rejected ${playerId} - tournament room requires tournamentPlayerId`);
      return null;
    }
    const { player1Id, player2Id } = room.tournamentInfo;
    // Allow if this player ID matches either slot, or if the slot is empty (will be filled)
    const isPlayer1 = tournamentPlayerId === player1Id || (player1Id === '' && player2Id !== tournamentPlayerId);
    const isPlayer2 = tournamentPlayerId === player2Id || (player2Id === '' && player1Id !== tournamentPlayerId);
    
    if (!isPlayer1 && !isPlayer2) {
      console.log(`[ROOM] Rejected ${playerId} - not authorized for this tournament match (expected: ${player1Id} or ${player2Id}, got: ${tournamentPlayerId})`);
      return null;
    }
    
    // Fill in empty slot if needed
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

export function removePlayer(room: Room, playerId: string): void {
  const idx = room.players.findIndex(p => p.id === playerId);
  if (idx !== -1) {
    room.players.splice(idx, 1);
    console.log(`[ROOM] ${playerId} left ${room.id}`);
  }

  // Gestion selon le mode et la phase
  if (room.players.length === 0) {
    stopGameLoop(room);
    rooms.delete(room.id);
    if (room.tournamentInfo) {
      tournamentRooms.delete(room.tournamentInfo.matchId);
    }
    console.log(`[ROOM] Deleted ${room.id}`);
    return;
  }

  // Si mode PvP ou Tournament et qu'il reste 1 joueur
  if ((room.isPvP || room.tournamentInfo) && room.players.length === 1) {
    if (room.state.phase === 'playing' || room.state.phase === 'paused') {
      // Donner la victoire au joueur restant
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
      
      // Notify tournament service if this is a tournament match
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

export function startGameLoop(room: Room): void {
  if (room.intervalId) return;

  // Activer l'IA si un seul joueur et mode solo
  if (room.players.length === 1 && room.allowAI) {
    room.ai = createAIState(room.aiDifficulty);
    console.log(`[ROOM] AI enabled for ${room.id} (${room.aiDifficulty})`);
  } else {
    room.ai = null;
  }

  room.state.phase = 'playing';
  let lastTick = Date.now();
  
  // Notify tournament service if this is a tournament match
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
    
    // Send score updates to tournament service
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
      
      // Notify tournament service of match end
      if (room.tournamentInfo && tournamentCallbacks) {
        tournamentCallbacks.onMatchEnd(
          room.tournamentInfo.tournamentId,
          room.tournamentInfo.matchId,
          room.state.score.left,
          room.state.score.right
        );
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

// Matchmaking PvP: rejoindre une room en attente ou en creer une nouvelle
export function findOrCreateRoom(): Room {
  for (const room of rooms.values()) {
    // Skip tournament rooms - they should only be joined through tournament flow
    if (room.tournamentInfo) continue;
    
    if (room.isPvP && room.players.length === 1 && room.state.phase === 'waiting') {
      console.log(`[ROOM] Found existing PvP room ${room.id}`);
      return room;
    }
  }
  return createRoom(true, false);
}

export function findRoomByPlayer(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === playerId)) {
      return room;
    }
  }
  return undefined;
}

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
