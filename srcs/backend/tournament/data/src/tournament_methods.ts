import type { Tournament, TournamentPlayer, TournamentMatch, TournamentStatus } from './shared/with_front/types.js'
import type { WebSocket } from 'ws'

// Re-export types for convenience
export type { Tournament, TournamentPlayer, TournamentMatch, TournamentStatus }

// In-memory tournament storage
const tournaments: Map<string, Tournament> = new Map()

// WebSocket connections per tournament for live updates
const tournamentConnections: Map<string, Set<WebSocket>> = new Map()

// Counter for unique IDs
let tournamentCounter = 0
let playerCounter = 0

/**
 * Generate a unique tournament ID
 */
function generateTournamentId(): string {
  return `tournament_${++tournamentCounter}_${Date.now()}`
}

/**
 * Generate a unique player ID for this tournament
 */
function generatePlayerId(): string {
  return `player_${++playerCounter}_${Date.now()}`
}

/**
 * Generate a unique match ID
 */
function generateMatchId(tournamentId: string, round: number, matchIndex: number): string {
  return `${tournamentId}_r${round}_m${matchIndex}`
}

/**
 * Create the bracket structure for a tournament
 * For 2 players: 1 round (final only) - for testing
 * For 4 players: 2 rounds (semi-finals, final)
 * For 8 players: 3 rounds (quarter-finals, semi-finals, final)
 */
function createBracket(maxPlayers: 2 | 4 | 8, tournamentId: string): TournamentMatch[] {
  const matches: TournamentMatch[] = []
  const totalRounds = maxPlayers === 2 ? 1 : (maxPlayers === 4 ? 2 : 3)
  
  for (let round = 0; round < totalRounds; round++) {
    const matchesInRound = maxPlayers / Math.pow(2, round + 1)
    
    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
      matches.push({
        odId: generateMatchId(tournamentId, round, matchIndex),
        odRound: round,
        odMatchIndex: matchIndex,
        odPlayer1: undefined,
        odPlayer2: undefined,
        odScore1: 0,
        odScore2: 0,
        odStatus: 'pending',
        odWinner: undefined,
        odGameRoomId: undefined,
      })
    }
  }
  
  return matches
}

/**
 * Assign players to first round matches based on their index
 */
function assignPlayersToFirstRound(tournament: Tournament): void {
  const firstRoundMatches = tournament.odMatches.filter((m: TournamentMatch) => m.odRound === 0)
  
  for (let i = 0; i < firstRoundMatches.length; i++) {
    const match = firstRoundMatches[i]!
    const player1Index = i * 2
    const player2Index = i * 2 + 1
    
    match.odPlayer1 = tournament.odPlayers[player1Index]
    match.odPlayer2 = tournament.odPlayers[player2Index]
    
    if (match.odPlayer1 && match.odPlayer2) {
      match.odStatus = 'ready'
    }
  }
}

/**
 * Create a new tournament
 */
export function createTournament(
  maxPlayers: 2 | 4 | 8,
  creatorAlias: string,
  creatorUserId?: string,
  tournamentName?: string
): Tournament {
  const tournamentId = generateTournamentId()
  
  // Create the creator as first player
  const creator: TournamentPlayer = {
    odIndex: 0,
    odId: generatePlayerId(),
    odAlias: creatorAlias,
    odUserId: creatorUserId,
    odIsCreator: true,
  }
  
  const tournament: Tournament = {
    odId: tournamentId,
    odName: tournamentName,
    odMaxPlayers: maxPlayers,
    odStatus: 'waiting',
    odPlayers: [creator],
    odMatches: createBracket(maxPlayers, tournamentId),
    odCurrentMatch: undefined,
    odWinner: undefined,
    odCreatedAt: new Date().toISOString(),
    odCreatedBy: creator,
  }
  
  tournaments.set(tournamentId, tournament)
  tournamentConnections.set(tournamentId, new Set())
  
  // Broadcast to all clients that a new tournament is available
  broadcastTournamentList()
  
  return tournament
}

/**
 * Join an existing tournament
 */
export function joinTournament(
  tournamentId: string,
  alias: string,
  userId?: string
): { success: boolean; tournament?: Tournament; player?: TournamentPlayer; error?: string } {
  const tournament = tournaments.get(tournamentId)
  
  if (!tournament) {
    return { success: false, error: 'Tournament not found' }
  }
  
  if (tournament.odStatus !== 'waiting') {
    return { success: false, error: 'Tournament has already started' }
  }
  
  if (tournament.odPlayers.length >= tournament.odMaxPlayers) {
    return { success: false, error: 'Tournament is full' }
  }
  
  // Check if user is already in the tournament
  if (userId) {
    const existingPlayer = tournament.odPlayers.find((p: TournamentPlayer) => p.odUserId === userId)
    if (existingPlayer) {
      return { success: false, error: 'You are already in this tournament' }
    }
  }
  
  // Check for duplicate alias (case-sensitive)
  const aliasExists = tournament.odPlayers.find((p: TournamentPlayer) => p.odAlias === alias)
  if (aliasExists) {
    return { success: false, error: 'This alias is already taken in this tournament' }
  }
  
  const player: TournamentPlayer = {
    odIndex: tournament.odPlayers.length,
    odId: generatePlayerId(),
    odAlias: alias,
    odUserId: userId,
    odIsCreator: false,
  }
  
  tournament.odPlayers.push(player)
  
  // If tournament is now full, start it
  if (tournament.odPlayers.length === tournament.odMaxPlayers) {
    startTournament(tournamentId)
  }
  
  // Broadcast update to all connected clients
  broadcastTournamentUpdate(tournament)
  
  return { success: true, tournament, player }
}

/**
 * Leave a tournament (only when waiting)
 */
export function leaveTournament(
  tournamentId: string,
  playerId: string
): { success: boolean; error?: string } {
  const tournament = tournaments.get(tournamentId)
  
  if (!tournament) {
    return { success: false, error: 'Tournament not found' }
  }
  
  if (tournament.odStatus !== 'waiting') {
    return { success: false, error: 'Cannot leave a tournament that has started' }
  }
  
  const playerIndex = tournament.odPlayers.findIndex((p: TournamentPlayer) => p.odId === playerId)
  if (playerIndex === -1) {
    return { success: false, error: 'Player not found in tournament' }
  }
  
  const player = tournament.odPlayers[playerIndex]!
  
  // If creator leaves, delete the tournament
  if (player.odIsCreator) {
    tournaments.delete(tournamentId)
    broadcastTournamentDeleted(tournamentId)
    return { success: true }
  }
  
  // Remove player and reindex
  tournament.odPlayers.splice(playerIndex, 1)
  tournament.odPlayers.forEach((p: TournamentPlayer, i: number) => { p.odIndex = i })
  
  broadcastTournamentUpdate(tournament)
  
  return { success: true }
}

/**
 * Start a tournament (called when full)
 */
function startTournament(tournamentId: string): void {
  const tournament = tournaments.get(tournamentId)
  if (!tournament) return
  
  tournament.odStatus = 'in_progress'
  
  // Assign players to first round matches
  assignPlayersToFirstRound(tournament)
  
  // Set the first match as current
  const firstMatch = tournament.odMatches.find((m: TournamentMatch) => m.odRound === 0 && m.odMatchIndex === 0)
  if (firstMatch) {
    tournament.odCurrentMatch = firstMatch.odId
  }
  
  broadcastTournamentUpdate(tournament)
}

/**
 * Get the next match that should be played
 */
export function getNextMatch(tournamentId: string): TournamentMatch | null {
  const tournament = tournaments.get(tournamentId)
  if (!tournament || tournament.odStatus !== 'in_progress') return null
  
  // Find first match that is 'ready' status
  return tournament.odMatches.find((m: TournamentMatch) => m.odStatus === 'ready') ?? null
}

/**
 * Start a match (called when both players are ready to play)
 */
export function startMatch(
  tournamentId: string,
  matchId: string,
  gameRoomId: string
): { success: boolean; error?: string } {
  const tournament = tournaments.get(tournamentId)
  if (!tournament) {
    return { success: false, error: 'Tournament not found' }
  }
  
  const match = tournament.odMatches.find((m: TournamentMatch) => m.odId === matchId)
  if (!match) {
    return { success: false, error: 'Match not found' }
  }
  
  if (match.odStatus !== 'ready') {
    return { success: false, error: 'Match is not ready to start' }
  }
  
  match.odStatus = 'playing'
  match.odGameRoomId = gameRoomId
  tournament.odCurrentMatch = matchId
  
  broadcastTournamentUpdate(tournament)
  
  return { success: true }
}

/**
 * Update match score (live update during match)
 */
export function updateMatchScore(
  tournamentId: string,
  matchId: string,
  score1: number,
  score2: number
): void {
  const tournament = tournaments.get(tournamentId)
  if (!tournament) return
  
  const match = tournament.odMatches.find((m: TournamentMatch) => m.odId === matchId)
  if (!match || match.odStatus !== 'playing') return
  
  match.odScore1 = score1
  match.odScore2 = score2
  
  broadcastTournamentUpdate(tournament)
}

/**
 * End a match and progress the tournament
 */
export function endMatch(
  tournamentId: string,
  matchId: string,
  score1: number,
  score2: number
): { success: boolean; error?: string; winner?: TournamentPlayer } {
  const tournament = tournaments.get(tournamentId)
  if (!tournament) {
    return { success: false, error: 'Tournament not found' }
  }
  
  const match = tournament.odMatches.find((m: TournamentMatch) => m.odId === matchId)
  if (!match) {
    return { success: false, error: 'Match not found' }
  }
  
  match.odScore1 = score1
  match.odScore2 = score2
  match.odStatus = 'finished'
  
  // Determine winner
  const winner = score1 > score2 ? match.odPlayer1 : match.odPlayer2
  match.odWinner = winner
  
  if (!winner) {
    return { success: false, error: 'Could not determine winner' }
  }
  
  // Progress winner to next round
  const nextRound = match.odRound + 1
  const nextMatchIndex = Math.floor(match.odMatchIndex / 2)
  const nextMatch = tournament.odMatches.find(
    (m: TournamentMatch) => m.odRound === nextRound && m.odMatchIndex === nextMatchIndex
  )
  
  if (nextMatch) {
    // Place winner in next match
    const isFirstOfPair = match.odMatchIndex % 2 === 0
    if (isFirstOfPair) {
      nextMatch.odPlayer1 = winner
    } else {
      nextMatch.odPlayer2 = winner
    }
    
    // Check if next match is ready
    if (nextMatch.odPlayer1 && nextMatch.odPlayer2) {
      nextMatch.odStatus = 'ready'
    }
    
    // Find next match to play
    const nextReadyMatch = tournament.odMatches.find((m: TournamentMatch) => m.odStatus === 'ready')
    tournament.odCurrentMatch = nextReadyMatch?.odId
  } else {
    // No next round - this was the final
    tournament.odStatus = 'finished'
    tournament.odWinner = winner
    tournament.odCurrentMatch = undefined
  }
  
  broadcastTournamentUpdate(tournament)
  
  return { success: true, winner }
}

/**
 * Handle player disconnect during tournament
 */
export function handlePlayerDisconnect(
  tournamentId: string,
  playerId: string
): { success: boolean; forfeitedMatch?: string } {
  const tournament = tournaments.get(tournamentId)
  if (!tournament) {
    return { success: false }
  }
  
  const player = tournament.odPlayers.find((p: TournamentPlayer) => p.odId === playerId)
  if (!player) {
    return { success: false }
  }
  
  // If tournament hasn't started, just remove the player
  if (tournament.odStatus === 'waiting') {
    leaveTournament(tournamentId, playerId)
    return { success: true }
  }
  
  // If tournament is in progress, find current match with this player
  const currentMatch = tournament.odMatches.find(
    (m: TournamentMatch) => m.odStatus === 'playing' && 
    (m.odPlayer1?.odId === playerId || m.odPlayer2?.odId === playerId)
  )
  
  if (currentMatch) {
    // Forfeit the match - opponent wins
    const isPlayer1 = currentMatch.odPlayer1?.odId === playerId
    const winScore = 11 // WIN_SCORE from game config
    
    endMatch(
      tournamentId,
      currentMatch.odId,
      isPlayer1 ? 0 : winScore,
      isPlayer1 ? winScore : 0
    )
    
    return { success: true, forfeitedMatch: currentMatch.odId }
  }
  
  return { success: true }
}

/**
 * Get all tournaments
 */
export function getAllTournaments(): Tournament[] {
  return Array.from(tournaments.values())
}

/**
 * Get tournaments by status
 */
export function getTournamentsByStatus(status: TournamentStatus): Tournament[] {
  return Array.from(tournaments.values()).filter(t => t.odStatus === status)
}

/**
 * Get a specific tournament
 */
export function getTournament(tournamentId: string): Tournament | undefined {
  return tournaments.get(tournamentId)
}

/**
 * Register a WebSocket connection for live updates
 */
export function registerConnection(tournamentId: string, socket: WebSocket): void {
  const connections = tournamentConnections.get(tournamentId)
  if (connections) {
    connections.add(socket)
  }
}

/**
 * Unregister a WebSocket connection
 */
export function unregisterConnection(tournamentId: string, socket: WebSocket): void {
  const connections = tournamentConnections.get(tournamentId)
  if (connections) {
    connections.delete(socket)
  }
}

/**
 * Broadcast tournament update to all connected clients
 */
function broadcastTournamentUpdate(tournament: Tournament): void {
  const connections = tournamentConnections.get(tournament.odId)
  const connCount = connections?.size ?? 0
  console.log(`[BROADCAST] Tournament ${tournament.odId}: ${connCount} connections, ${tournament.odPlayers.length} players, score: ${tournament.odCurrentMatch ? 'match in progress' : 'no match'}`)
  
  if (!connections || connections.size === 0) {
    // Still broadcast to global list even if no specific subscriptions
    broadcastTournamentList()
  } else {
    const message = JSON.stringify({
      type: 'tournament_update',
      tournament,
    })
    
    connections.forEach(socket => {
      if (socket.readyState === 1) { // WebSocket.OPEN
        socket.send(message)
      }
    })
    
    // Also broadcast to the global tournament list
    broadcastTournamentList()
  }
  
  // Notify social service for chat card updates
  notifySocialService(tournament)
  
  // Save to database when tournament finishes
  if (tournament.odStatus === 'finished') {
    saveTournamentToDatabase(tournament)
  }
}

/**
 * Save a tournament to the database for persistence
 */
async function saveTournamentToDatabase(tournament: Tournament): Promise<void> {
  try {
    const payload = {
      id: tournament.odId,
      name: tournament.odName || `Tournament #${tournament.odId.slice(-6)}`,
      status: tournament.odStatus,
      max_players: tournament.odMaxPlayers,
      created_by: tournament.odCreatedBy?.odUserId || null,
      winner_id: tournament.odWinner?.odUserId || null,
      winner_name: tournament.odWinner?.odAlias || null,
      data: JSON.stringify(tournament)
    }

    await fetch('http://database:3000/database/tournament', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    console.log(`[TOURNAMENT] Saved finished tournament ${tournament.odId} to database`)
  } catch (error) {
    console.error('[TOURNAMENT] Failed to save tournament to database:', error)
  }
}

/**
 * Load finished tournaments from database on startup
 */
export async function loadFinishedTournamentsFromDatabase(): Promise<void> {
  try {
    const response = await fetch('http://database:3000/database/tournament?status=finished')
    if (!response.ok) {
      console.error('[TOURNAMENT] Failed to load tournaments from database:', response.status)
      return
    }

    const records = await response.json() as Array<{ id: string; data: string }>
    
    for (const record of records) {
      try {
        const tournament = JSON.parse(record.data) as Tournament
        if (!tournaments.has(tournament.odId)) {
          tournaments.set(tournament.odId, tournament)
          tournamentConnections.set(tournament.odId, new Set())
        }
      } catch (e) {
        console.error(`[TOURNAMENT] Failed to parse tournament ${record.id}:`, e)
      }
    }

    console.log(`[TOURNAMENT] Loaded ${records.length} finished tournaments from database`)
  } catch (error) {
    console.error('[TOURNAMENT] Failed to load tournaments from database:', error)
  }
}

/**
 * Notify social service about tournament updates for chat card updates
 */
async function notifySocialService(tournament: Tournament): Promise<void> {
  try {
    // Get current match info if any
    let currentMatch: any = undefined
    if (tournament.odCurrentMatch) {
      const match = tournament.odMatches.find(m => m.odId === tournament.odCurrentMatch)
      if (match && match.odStatus === 'ready') {
        currentMatch = {
          matchId: match.odId,
          player1Id: match.odPlayer1?.odId,
          player1Name: match.odPlayer1?.odAlias,
          player2Id: match.odPlayer2?.odId,
          player2Name: match.odPlayer2?.odAlias,
          status: match.odStatus
        }
      }
    }

    const payload = {
      tournamentId: tournament.odId,
      status: tournament.odStatus,
      currentMatch,
      winner: tournament.odWinner ? {
        odId: tournament.odWinner.odId,
        odAlias: tournament.odWinner.odAlias,
        odUserId: tournament.odWinner.odUserId
      } : undefined,
      players: tournament.odPlayers.map(p => ({
        odId: p.odId,
        odAlias: p.odAlias,
        odUserId: p.odUserId
      }))
    }

    await fetch('http://social:3000/social/tournament/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (error) {
    // Don't fail tournament operations if social notification fails
    console.error('[TOURNAMENT] Failed to notify social service:', error)
  }
}

/**
 * Broadcast that a tournament was deleted
 */
function broadcastTournamentDeleted(tournamentId: string): void {
  const connections = tournamentConnections.get(tournamentId)
  if (connections) {
    const message = JSON.stringify({
      type: 'tournament_deleted',
      tournamentId,
    })
    
    connections.forEach(socket => {
      if (socket.readyState === 1) {
        socket.send(message)
      }
    })
    
    tournamentConnections.delete(tournamentId)
  }
  
  broadcastTournamentList()
}

// Global connections for tournament list updates
const globalConnections: Set<WebSocket> = new Set()

export function registerGlobalConnection(socket: WebSocket): void {
  globalConnections.add(socket)
}

export function unregisterGlobalConnection(socket: WebSocket): void {
  globalConnections.delete(socket)
}

function broadcastTournamentList(): void {
  const waiting = getTournamentsByStatus('waiting')
  const in_progress = getTournamentsByStatus('in_progress')
  const finished = getTournamentsByStatus('finished')
  
  const message = JSON.stringify({
    type: 'tournaments_list',
    tournaments: { waiting, in_progress, finished },
  })
  
  globalConnections.forEach(socket => {
    if (socket.readyState === 1) {
      socket.send(message)
    }
  })
}

/**
 * Find player by user ID across all tournaments
 */
export function findPlayerByUserId(userId: string): { tournament: Tournament; player: TournamentPlayer } | null {
  for (const tournament of tournaments.values()) {
    const player = tournament.odPlayers.find((p: TournamentPlayer) => p.odUserId === userId)
    if (player) {
      return { tournament, player }
    }
  }
  return null
}
