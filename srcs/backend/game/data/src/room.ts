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

export interface InvitationInfo {
  invitationId: string;
  inviterId: string;    // User ID of inviter (left player)
  invitedId: string;    // User ID of invited player (right player)
  disconnectedPlayer?: string;  // Player ID who disconnected (for reconnection)
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
  invitationInfo?: InvitationInfo; // Set if this is an invitation match
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
const invitationRooms = new Map<string, Room>(); // invitationId -> Room for invitation matches
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

/**
 * Create a room for a game invitation
 */
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

/**
 * Get invitation room by invitation ID
 */
export function getInvitationRoom(invitationId: string): Room | undefined {
  return invitationRooms.get(invitationId);
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


  // Verify invitation player authorization
  if (room.invitationInfo) {
    const { inviterId, invitedId } = room.invitationInfo;
    if (playerId !== inviterId && playerId !== invitedId) {
      console.log(`[ROOM] Rejected ${playerId} - not authorized for this invitation match (expected: ${inviterId} or ${invitedId})`);
      return null;
    }

    // Prevent duplicate join - update socket for reconnection
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
    
    // Clear disconnected player flag if this player was disconnected
    if (room.invitationInfo?.disconnectedPlayer === playerId) {
      delete room.invitationInfo.disconnectedPlayer;
      console.log(`[ROOM] Player ${playerId} reconnected`);
    }

    // Check if both players have joined - transition to ready or resume
    if (room.players.length === 2) {
      if (room.state.phase === 'waiting') {
        room.state.phase = 'ready';
        broadcastState(room);
        console.log(`[ROOM] ${room.id} ready - both players joined`);
      } else if (room.state.phase === 'paused') {
        // Resume game after reconnection
        room.state.phase = 'playing';
        broadcastState(room);
        console.log(`[ROOM] ${room.id} resumed - player reconnected`);
      }
    }

    return player;
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
    // For invitation games, don't delete - allow reconnection
    if (room.invitationInfo && room.state.phase !== 'ended') {
      room.invitationInfo.disconnectedPlayer = playerId;
      console.log(`[ROOM] ${room.id} - all players disconnected, waiting for reconnection`);
      
      // Pause the game if playing
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

  // For invitation games with 1 player remaining, pause and wait for reconnection
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

      // Notify social service of invitation match end
      if (room.invitationInfo) {
        const { invitationId, inviterId, invitedId } = room.invitationInfo;
        const { score } = room.state;

        const winnerId = score.left > score.right ? inviterId : invitedId;
        const loserId = winnerId === inviterId ? invitedId : inviterId;

        // Call social service to update the invitation
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

        // Save match to database for stats tracking
        fetch('http://database:3000/database/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player1_id: inviterId,
            player2_id: invitedId,
            score1: score.left,
            score2: score.right
          })
        }).then(res => {
          if (res.ok) {
            console.log(`[ROOM] Match saved to database: ${inviterId} vs ${invitedId}`);
          } else {
            console.error('[ROOM] Failed to save match to database:', res.status);
          }
        }).catch(err => {
          console.error('[ROOM] Failed to save match to database:', err);
        });
      }

      // Save PvP matches (non-invitation, non-tournament) to database
      if (room.isPvP && !room.invitationInfo && !room.tournamentInfo && room.players.length === 2) {
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
              score2: score.right
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

      // Save AI (solo) matches to database
      if (room.ai && room.players.length === 1) {
        const player = room.players[0];
        const { score } = room.state;
        const aiPlayerId = `AI_${room.aiDifficulty}`; // e.g., "AI_easy", "AI_normal", "AI_hard"
        
        fetch('http://database:3000/database/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player1_id: player.id,
            player2_id: aiPlayerId,
            score1: score.left,
            score2: score.right
          })
        }).then(res => {
          if (res.ok) {
            console.log(`[ROOM] AI match saved: ${player.id} vs ${aiPlayerId}, score: ${score.left}-${score.right}`);
          } else {
            console.error('[ROOM] Failed to save AI match:', res.status);
          }
        }).catch(err => {
          console.error('[ROOM] Failed to save AI match:', err);
        });
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
  // First check players array
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === playerId)) {
      return room;
    }
  }
  
  // For invitation games, also check invitationInfo (player may have disconnected but game still active)
  for (const room of rooms.values()) {
    if (room.invitationInfo && 
        (room.invitationInfo.inviterId === playerId || room.invitationInfo.invitedId === playerId) &&
        room.state.phase !== 'ended') {
      return room;
    }
  }
  
  return undefined;
}

export interface ActiveGameInfo {
  roomId: string;
  invitationId?: string;
  opponentId?: string;
  phase: string;
  score: { left: number; right: number };
  side: 'left' | 'right';
}

export function getActiveGameForPlayer(playerId: string): ActiveGameInfo | null {
  const room = findRoomByPlayer(playerId);
  if (!room) return null;
  
  // Only return active games (not ended)
  if (room.state.phase === 'ended') return null;
  
  // Try to find player in the room, or determine side from invitationInfo
  let side: 'left' | 'right';
  const player = room.players.find(p => p.id === playerId);
  
  if (player) {
    side = player.side;
  } else if (room.invitationInfo) {
    // Player disconnected but we can determine their side from invitation info
    side = playerId === room.invitationInfo.inviterId ? 'left' : 'right';
  } else {
    return null;
  }
  
  // Get opponent ID
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
