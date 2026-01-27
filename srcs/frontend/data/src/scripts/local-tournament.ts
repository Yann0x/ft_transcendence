/* LOCAL TOURNAMENT */

/* TYPES */

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

export interface LocalTournamentStats {
  matchesWon: number;
  matchesLost: number;
  pointsScored: number;
  pointsConceded: number;
}

/* STATE */

let tournamentCounter = 0;
let playerCounter = 0;

/* ID GENERATORS */

function generateTournamentId(): string {
  return `local_tournament_${++tournamentCounter}_${Date.now()}`;
}

function generatePlayerId(): string {
  return `local_player_${++playerCounter}_${Date.now()}`;
}

function generateMatchId(tournamentId: string, round: number, matchIndex: number): string {
  return `${tournamentId}_r${round}_m${matchIndex}`;
}

/* BRACKET */

/* Crée la structure de bracket pour le tournoi */
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

/* Assigne les joueurs aux matchs du premier tour */
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

/* TOURNAMENT MANAGEMENT */

/* Crée un nouveau tournoi local */
export function createLocalTournament(
  maxPlayers: 2 | 4 | 8,
  aliases: string[],
  tournamentName?: string,
  creatorAlias?: string
): LocalTournament {
  const tournamentId = generateTournamentId();

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
    odStatus: 'in_progress',
    odPlayers: players,
    odMatches: createBracket(maxPlayers, tournamentId),
    odCurrentMatch: undefined,
    odWinner: undefined,
    odCreatedAt: new Date().toISOString(),
    odCreatedBy: players[0]!,
    odIsLocal: true,
  };

  assignPlayersToFirstRound(tournament);

  const firstMatch = tournament.odMatches.find(m => m.odRound === 0 && m.odMatchIndex === 0);
  if (firstMatch) {
    tournament.odCurrentMatch = firstMatch.odId;
  }

  return tournament;
}

/* Récupère le prochain match à jouer */
export function getNextMatch(tournament: LocalTournament): LocalTournamentMatch | null {
  if (tournament.odStatus !== 'in_progress') return null;
  return tournament.odMatches.find(m => m.odStatus === 'ready') ?? null;
}

/* MATCH MANAGEMENT */

/* Démarre un match local */
export function startMatch(tournament: LocalTournament, matchId: string): boolean {
  const match = tournament.odMatches.find(m => m.odId === matchId);
  if (!match || match.odStatus !== 'ready') return false;

  match.odStatus = 'playing';
  tournament.odCurrentMatch = matchId;

  return true;
}

/* Termine un match et fait avancer le tournoi */
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

  const winner = score1 > score2 ? match.odPlayer1 : match.odPlayer2;
  match.odWinner = winner;

  if (!winner) {
    return { success: false, tournamentEnded: false };
  }

  const nextRound = match.odRound + 1;
  const nextMatchIndex = Math.floor(match.odMatchIndex / 2);
  const nextMatch = tournament.odMatches.find(
    m => m.odRound === nextRound && m.odMatchIndex === nextMatchIndex
  );

  if (nextMatch) {
    const isFirstOfPair = match.odMatchIndex % 2 === 0;
    if (isFirstOfPair) {
      nextMatch.odPlayer1 = winner;
    } else {
      nextMatch.odPlayer2 = winner;
    }

    if (nextMatch.odPlayer1 && nextMatch.odPlayer2) {
      nextMatch.odStatus = 'ready';
    }

    const nextReadyMatch = tournament.odMatches.find(m => m.odStatus === 'ready');
    tournament.odCurrentMatch = nextReadyMatch?.odId;

    return { success: true, winner, tournamentEnded: false };
  } else {
    tournament.odStatus = 'finished';
    tournament.odWinner = winner;
    tournament.odCurrentMatch = undefined;

    return { success: true, winner, tournamentEnded: true };
  }
}

/* Récupère les infos du match en cours */
export function getCurrentMatch(tournament: LocalTournament): LocalTournamentMatch | null {
  if (!tournament.odCurrentMatch) return null;
  return tournament.odMatches.find(m => m.odId === tournament.odCurrentMatch) ?? null;
}

/* VALIDATION */

/* Valide que les alias sont uniques */
export function validateAliases(aliases: string[]): { valid: boolean; error?: string } {
  for (let i = 0; i < aliases.length; i++) {
    if (!aliases[i] || aliases[i].trim() === '') {
      return { valid: false, error: `Player ${i + 1} must have a name` };
    }
  }

  const normalizedAliases = aliases.map(a => a.trim().toLowerCase());
  const uniqueAliases = new Set(normalizedAliases);

  if (uniqueAliases.size !== aliases.length) {
    return { valid: false, error: 'Each player must have a unique name' };
  }

  return { valid: true };
}

/* EXPORT */

export const LocalTournamentSystem = {
  createLocalTournament,
  getNextMatch,
  startMatch,
  endMatch,
  getCurrentMatch,
  validateAliases,
};
