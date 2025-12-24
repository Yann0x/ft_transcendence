// ROOM - Gestion des parties

import type { WebSocket } from 'ws';
import { createGameState, type GameState, type PlayerInput } from './state.js';
import { physicsTick } from './physics.js';
import { TICK_INTERVAL } from './config.js';
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
  ai: AIState | null; // IA pour mode solo
}

const rooms = new Map<string, Room>();
let roomCounter = 0;

/*
 * Cree une nouvelle room
 */
export function createRoom(): Room {
  const id = `room_${++roomCounter}`;
  const room: Room = {
    id,
    players: [],
    state: createGameState(),
    intervalId: null,
    ai: null
  };
  rooms.set(id, room);
  console.log(`[ROOM] Created room ${id}`);
  return room;
}

/*
 * Ajoute un joueur a une room
 */
export function addPlayer(room: Room, socket: WebSocket, playerId: string): Player | null {
  if (room.players.length >= 2) {
    return null;
  }

  const side = room.players.length === 0 ? 'left' : 'right';
  const player: Player = { id: playerId, socket, side };
  room.players.push(player);

  console.log(`[ROOM] Player ${playerId} joined ${room.id} as ${side}`);

  // Passer en ready des qu'un joueur rejoint (mode solo ou duo)
  if (room.players.length >= 1 && room.state.phase === 'waiting') {
    room.state.phase = 'ready';
    broadcastState(room);
  }

  return player;
}

/*
 * Retire un joueur d'une room
 */
export function removePlayer(room: Room, playerId: string): void {
  const idx = room.players.findIndex(p => p.id === playerId);
  if (idx !== -1) {
    room.players.splice(idx, 1);
    console.log(`[ROOM] Player ${playerId} left ${room.id}`);
  }

  // Pause si un joueur part
  if (room.players.length < 2 && room.state.phase === 'playing') {
    room.state.phase = 'paused';
    stopGameLoop(room);
  }

  // Supprimer la room si vide
  if (room.players.length === 0) {
    stopGameLoop(room);
    rooms.delete(room.id);
    console.log(`[ROOM] Deleted room ${room.id}`);
  }
}

/*
 * Demarre la game loop
 */
export function startGameLoop(room: Room): void {
  if (room.intervalId) return;

  // Activer l'IA si un seul joueur
  if (room.players.length === 1) {
    room.ai = createAIState();
    console.log(`[ROOM] AI enabled for ${room.id}`);
  }

  room.state.phase = 'playing';
  let lastTick = Date.now();

  room.intervalId = setInterval(() => {
    const now = Date.now();
    const dt = now - lastTick;
    lastTick = now;

    // Update IA si active
    if (room.ai) {
      updateAI(room.ai, room.state, now);
      room.state.inputs[1] = getAIInput(room.ai);
    }

    physicsTick(room.state, dt);
    broadcastState(room);

    // Arreter si partie terminee
    if (room.state.phase === 'ended') {
      stopGameLoop(room);
    }
  }, TICK_INTERVAL);

  console.log(`[ROOM] Game loop started for ${room.id}`);
}

/*
 * Arrete la game loop
 */
export function stopGameLoop(room: Room): void {
  if (room.intervalId) {
    clearInterval(room.intervalId);
    room.intervalId = null;
    console.log(`[ROOM] Game loop stopped for ${room.id}`);
  }
}

/*
 * Applique un input d'un joueur
 */
export function applyInput(room: Room, playerId: string, input: PlayerInput): void {
  const player = room.players.find(p => p.id === playerId);
  if (!player) return;

  const idx = player.side === 'left' ? 0 : 1;
  room.state.inputs[idx] = input;
}

/*
 * Broadcast l'etat a tous les joueurs
 */
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
    if (player.socket.readyState === 1) { // OPEN
      player.socket.send(message);
    }
  }
}

/*
 * Trouve une room en attente ou en cree une
 */
export function findOrCreateRoom(): Room {
  // Chercher une room avec 1 joueur
  for (const room of rooms.values()) {
    if (room.players.length === 1 && room.state.phase === 'waiting') {
      return room;
    }
  }
  // Sinon creer une nouvelle room
  return createRoom();
}

/*
 * Trouve la room d'un joueur
 */
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
