/* ============================================
   LOCAL TOURNAMENT SYSTEM - ft_transcendance
   ============================================
   Gère les tournois locaux entièrement côté client
   (non persistant, même clavier pour tous les joueurs)
*/

export interface LocalTournamentPlayer {
  odIndex: number;
  odId: string;
  odAlias: string;
  odIsCreator: boolean;
}

export interface LocalTournamentMatch {
  odId: string;
  odRound: number;
  odMatchIndex: number;
  odPlayer1?: LocalTournamentPlayer;
  odPlayer2?: LocalTournamentPlayer;
  odScore1: number;
  odScore2: number;
  odStatus: 'pending' | 'ready' | 'playing' | 'finished';
  odWinner?: LocalTournamentPlayer;
}

export type LocalTournamentStatus = 'waiting' | 'in_progress' | 'finished';

export interface LocalTournament {
  odId: string;
  odName?: string;
  odMaxPlayers: 2 | 4 | 8;
  odStatus: LocalTournamentStatus;
  odPlayers: LocalTournamentPlayer[];
  odMatches: LocalTournamentMatch[];
  odCurrentMatch?: string;
  odWinner?: LocalTournamentPlayer;
  odCreatedAt: string;
  odCreatedBy: LocalTournamentPlayer;
  odIsLocal: true;
}

// Stats locales pour la session (non persistantes mais comptabilisées globalement)
export interface LocalTournamentStats {
  matchesWon: number;
  matchesLost: number;
  pointsScored: number;
  pointsConceded: number;
}

let tournamentCounter = 0;
let playerCounter = 0;

/**
 * Génère un ID unique pour le tournoi local
 */
function generateTournamentId(): string {
  return `local_tournament_${++tournamentCounter}_${Date.now()}`;
}

/**
 * Génère un ID unique pour un joueur local
 */
function generatePlayerId(): string {
  return `local_player_${++playerCounter}_${Date.now()}`;
}

/**
 * Génère un ID unique pour un match
 */
function generateMatchId(tournamentId: string, round: number, matchIndex: number): string {
  return `${tournamentId}_r${round}_m${matchIndex}`;
}

/**
 * Crée la structure du bracket pour un tournoi
 */
function createBracket(maxPlayers: 2 | 4 | 8, tournamentId: string): LocalTournamentMatch[] {
  const matches: LocalTournamentMatch[] = [];
  const totalRounds = maxPlayers === 2 ? 1 : (maxPlayers === 4 ? 2 : 3);
  
  for (let round = 0; round < totalRounds; round++) {
    const matchesInRound = maxPlayers / Math.pow(2, round + 1);
    
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
      });
    }
  }
  
  return matches;
}

/**
 * Assigne les joueurs aux matchs du premier round
 */
function assignPlayersToFirstRound(tournament: LocalTournament): void {
  const firstRoundMatches = tournament.odMatches.filter(m => m.odRound === 0);
  
  for (let i = 0; i < firstRoundMatches.length; i++) {
    const match = firstRoundMatches[i]!;
    const player1Index = i * 2;
    const player2Index = i * 2 + 1;
    
    match.odPlayer1 = tournament.odPlayers[player1Index];
    match.odPlayer2 = tournament.odPlayers[player2Index];
    
    if (match.odPlayer1 && match.odPlayer2) {
      match.odStatus = 'ready';
    }
  }
}

/**
 * Crée un nouveau tournoi local
 */
export function createLocalTournament(
  maxPlayers: 2 | 4 | 8,
  aliases: string[],
  tournamentName?: string,
  creatorAlias?: string
): LocalTournament {
  const tournamentId = generateTournamentId();
  
  // Créer tous les joueurs
  const players: LocalTournamentPlayer[] = aliases.map((alias, index) => ({
    odIndex: index,
    odId: generatePlayerId(),
    odAlias: alias,
    odIsCreator: creatorAlias ? alias === creatorAlias : index === 0,
  }));
  
  const tournament: LocalTournament = {
    odId: tournamentId,
    odName: tournamentName,
    odMaxPlayers: maxPlayers,
    odStatus: 'in_progress', // Le tournoi local démarre immédiatement
    odPlayers: players,
    odMatches: createBracket(maxPlayers, tournamentId),
    odCurrentMatch: undefined,
    odWinner: undefined,
    odCreatedAt: new Date().toISOString(),
    odCreatedBy: players[0]!,
    odIsLocal: true,
  };
  
  // Assigner les joueurs au premier round
  assignPlayersToFirstRound(tournament);
  
  // Définir le premier match comme courant
  const firstMatch = tournament.odMatches.find(m => m.odRound === 0 && m.odMatchIndex === 0);
  if (firstMatch) {
    tournament.odCurrentMatch = firstMatch.odId;
  }
  
  return tournament;
}

/**
 * Obtient le prochain match à jouer
 */
export function getNextMatch(tournament: LocalTournament): LocalTournamentMatch | null {
  if (tournament.odStatus !== 'in_progress') return null;
  return tournament.odMatches.find(m => m.odStatus === 'ready') ?? null;
}

/**
 * Démarre un match local
 */
export function startMatch(tournament: LocalTournament, matchId: string): boolean {
  const match = tournament.odMatches.find(m => m.odId === matchId);
  if (!match || match.odStatus !== 'ready') return false;
  
  match.odStatus = 'playing';
  tournament.odCurrentMatch = matchId;
  
  return true;
}

/**
 * Termine un match et fait progresser le tournoi
 */
export function endMatch(
  tournament: LocalTournament,
  matchId: string,
  score1: number,
  score2: number
): { success: boolean; winner?: LocalTournamentPlayer; tournamentEnded: boolean } {
  const match = tournament.odMatches.find(m => m.odId === matchId);
  if (!match) {
    return { success: false, tournamentEnded: false };
  }
  
  match.odScore1 = score1;
  match.odScore2 = score2;
  match.odStatus = 'finished';
  
  // Déterminer le gagnant
  const winner = score1 > score2 ? match.odPlayer1 : match.odPlayer2;
  match.odWinner = winner;
  
  if (!winner) {
    return { success: false, tournamentEnded: false };
  }
  
  // Faire progresser le gagnant au round suivant
  const nextRound = match.odRound + 1;
  const nextMatchIndex = Math.floor(match.odMatchIndex / 2);
  const nextMatch = tournament.odMatches.find(
    m => m.odRound === nextRound && m.odMatchIndex === nextMatchIndex
  );
  
  if (nextMatch) {
    // Placer le gagnant dans le match suivant
    const isFirstOfPair = match.odMatchIndex % 2 === 0;
    if (isFirstOfPair) {
      nextMatch.odPlayer1 = winner;
    } else {
      nextMatch.odPlayer2 = winner;
    }
    
    // Vérifier si le match suivant est prêt
    if (nextMatch.odPlayer1 && nextMatch.odPlayer2) {
      nextMatch.odStatus = 'ready';
    }
    
    // Trouver le prochain match à jouer
    const nextReadyMatch = tournament.odMatches.find(m => m.odStatus === 'ready');
    tournament.odCurrentMatch = nextReadyMatch?.odId;
    
    return { success: true, winner, tournamentEnded: false };
  } else {
    // Pas de round suivant - c'était la finale
    tournament.odStatus = 'finished';
    tournament.odWinner = winner;
    tournament.odCurrentMatch = undefined;
    
    return { success: true, winner, tournamentEnded: true };
  }
}

/**
 * Obtient les informations du match courant
 */
export function getCurrentMatch(tournament: LocalTournament): LocalTournamentMatch | null {
  if (!tournament.odCurrentMatch) return null;
  return tournament.odMatches.find(m => m.odId === tournament.odCurrentMatch) ?? null;
}

/**
 * Vérifie si un alias est unique dans la liste
 */
export function validateAliases(aliases: string[]): { valid: boolean; error?: string } {
  // Vérifier les alias vides
  for (let i = 0; i < aliases.length; i++) {
    if (!aliases[i] || aliases[i].trim() === '') {
      return { valid: false, error: `Le joueur ${i + 1} doit avoir un pseudo` };
    }
  }
  
  // Vérifier les doublons (insensible à la casse)
  const normalizedAliases = aliases.map(a => a.trim().toLowerCase());
  const uniqueAliases = new Set(normalizedAliases);
  
  if (uniqueAliases.size !== aliases.length) {
    return { valid: false, error: 'Chaque joueur doit avoir un pseudo unique' };
  }
  
  return { valid: true };
}

export const LocalTournamentSystem = {
  createLocalTournament,
  getNextMatch,
  startMatch,
  endMatch,
  getCurrentMatch,
  validateAliases,
};
