import type { WebSocket } from 'ws';
import { createGameState, type GameState, type PlayerInput } from './state.js';
import { physicsTick } from './physics.js';
import { TICK_INTERVAL, type AIDifficulty } from './config.js';
import { createAIState, updateAI, getAIInput, type AIState } from './ai.js';

export interface Player {
  id: string;
  socket: WebSocket;
  side: 'left' | 'right';
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
}

const rooms = new Map<string, Room>();
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

export function addPlayer(room: Room, socket: WebSocket, playerId: string): Player | null {
  if (room.players.length >= 2) return null;

  const side = room.players.length === 0 ? 'left' : 'right';
  const player: Player = { id: playerId, socket, side };
  room.players.push(player);

  console.log(`[ROOM] ${playerId} joined ${room.id} as ${side}`);

  if (room.state.phase === 'waiting') {
    if (room.isPvP) {
      if (room.players.length === 2) {
        room.state.phase = 'ready';
        broadcastState(room);
      }
    } else {
      room.state.phase = 'ready';
      broadcastState(room);
    }
  }

  return player;
}

export function removePlayer(room: Room, playerId: string): void {
  const idx = room.players.findIndex(p => p.id === playerId);
  if (idx !== -1) {
    room.players.splice(idx, 1);
    console.log(`[ROOM] ${playerId} left ${room.id}`);
  }

  if (room.players.length < 2 && room.state.phase === 'playing') {
    room.state.phase = 'paused';
    stopGameLoop(room);
  }

  if (room.players.length === 0) {
    stopGameLoop(room);
    rooms.delete(room.id);
    console.log(`[ROOM] Deleted ${room.id}`);
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

    if (room.state.phase === 'ended') {
      stopGameLoop(room);
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

  room.state.score = { left: 0, right: 0 };
  room.state.ball = { x: 400, y: 300, radius: 8, vx: 330, vy: 330 };
  room.state.paddles[0].y = 260;
  room.state.paddles[1].y = 260;
  room.state.inputs = [{ up: false, down: false }, { up: false, down: false }];
  room.state.lastScorer = null;
  room.state.ballFrozenUntil = 0;

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

export function toggleAI(room: Room): void {
  if (room.players.length !== 1) return;

  if (room.ai) {
    room.ai = null;
    room.state.inputs[1] = { up: false, down: false };
    console.log(`[ROOM] AI disabled for ${room.id}`);
  } else {
    room.ai = createAIState();
    console.log(`[ROOM] AI enabled for ${room.id}`);
  }
}

function broadcastState(room: Room): void {
  const message = JSON.stringify({
    type: 'state',
    data: {
      phase: room.state.phase,
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

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
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
