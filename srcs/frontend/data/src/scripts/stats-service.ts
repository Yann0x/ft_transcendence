import { App } from './app';

// base stats interface matching backend StatsSchema
export interface Stats {
  user_id: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
}

// extended stats w/ additional computed fields
export interface ExtendedStats extends Stats {
  points_scored?: number;
  points_allowed?: number;
  best_score?: number;
  worst_score?: number;
  win_streak?: number;
  global_rank?: number;
  tournaments_won?: number;
}

// match types: ai, pvp, duel, tournament
export type MatchType = 'ai' | 'pvp' | 'duel' | 'tournament';

export interface MatchHistoryItem {
  id: number;
  player1_id: string;
  player2_id: string;
  score1: number;
  score2: number;
  tournament_id?: string;
  match_type?: MatchType;
  player1_name?: string;
  player2_name?: string;
  played_at?: string;
}

export const StatsService = {
  // fetch stats for a user
  async fetchStats(userId?: string): Promise<ExtendedStats | null> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        console.error('[STATS] No auth token');
        return null;
      }

      const endpoint = userId ? `/user/${userId}/stats` : '/user/stats';
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.error('[STATS] Failed to fetch stats:', response.status);
        return null;
      }

      const stats = await response.json() as ExtendedStats;
      console.log('[STATS] Received stats from API:', stats);
      
      // Fetch match history to calculate additional stats
      const matchHistory = await this.fetchMatchHistory(userId);
      if (matchHistory && matchHistory.length > 0) {
        const additionalStats = this.calculateAdditionalStats(matchHistory, userId || App.me?.id || '');
        Object.assign(stats, additionalStats);
      }

      // tournaments_won is already included in the database response
      // The database calculates it from persisted match data with tournament_id

      console.log('[STATS] Final stats object:', stats);
      return stats;
    } catch (error) {
      console.error('[STATS] Error fetching stats:', error);
      return null;
    }
  },

  // fetch tournament stats for a user
  async fetchTournamentStats(userId: string): Promise<{ tournaments_won: number; tournaments_played: number } | null> {
    try {
      const response = await fetch(`/api/tournament/user-stats?user_id=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        console.error('[STATS] Failed to fetch tournament stats:', response.status);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('[STATS] Error fetching tournament stats:', error);
      return null;
    }
  },

  // fetch match history for a user
  async fetchMatchHistory(userId?: string, limit: number = 20): Promise<MatchHistoryItem[] | null> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        console.error('[STATS] No auth token');
        return null;
      }

      const endpoint = userId 
        ? `/user/${userId}/match-history?limit=${limit}` 
        : `/user/match-history?limit=${limit}`;
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.error('[STATS] Failed to fetch match history:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[STATS] Error fetching match history:', error);
      return null;
    }
  },

  // calculate additional stats from match history
  calculateAdditionalStats(matches: MatchHistoryItem[], userId: string): Partial<ExtendedStats> {
    let pointsScored = 0;
    let pointsAllowed = 0;
    let bestScore = 0;
    let worstScore = Infinity;
    let currentStreak = 0;
    let maxStreak = 0;

    for (const match of matches) {
      const isPlayer1 = match.player1_id === userId;
      const myScore = isPlayer1 ? match.score1 : match.score2;
      const opponentScore = isPlayer1 ? match.score2 : match.score1;
      const didWin = myScore > opponentScore;

      pointsScored += myScore;
      pointsAllowed += opponentScore;

      if (myScore > bestScore) bestScore = myScore;
      if (myScore < worstScore) worstScore = myScore;

      if (didWin) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    // no matches? reset worst score
    if (worstScore === Infinity) worstScore = 0;

    return {
      points_scored: pointsScored,
      points_allowed: pointsAllowed,
      best_score: bestScore,
      worst_score: worstScore,
      win_streak: maxStreak
    };
  },

  // calc winrate evolution from match history (oldest to newest)
  // returns array of winrate % after each match
  calculateWinrateEvolution(matches: MatchHistoryItem[], userId: string): number[] {
    if (!matches || matches.length === 0) return [];

    // reverse to get chronological order (oldest first)
    const chronological = [...matches].reverse();
    const winrates: number[] = [];
    let wins = 0;
    let total = 0;

    for (const match of chronological) {
      const isPlayer1 = match.player1_id === userId;
      const myScore = isPlayer1 ? match.score1 : match.score2;
      const opponentScore = isPlayer1 ? match.score2 : match.score1;
      const didWin = myScore > opponentScore;

      total++;
      if (didWin) wins++;
      
      winrates.push(Math.round((wins / total) * 100));
    }

    return winrates;
  },

  // update the profile modal stats elements
  updateProfileStats(stats: ExtendedStats | null): void {
    const gamesPlayedEl = document.getElementById('profile-games-played');
    const winRateEl = document.getElementById('profile-win-rate');
    const gamesWonEl = document.getElementById('profile-games-won');
    const gamesLostEl = document.getElementById('profile-games-lost');

    if (stats) {
      if (gamesPlayedEl) gamesPlayedEl.textContent = stats.games_played.toString();
      if (winRateEl) winRateEl.textContent = `${stats.win_rate}%`;
      if (gamesWonEl) gamesWonEl.textContent = stats.games_won.toString();
      if (gamesLostEl) gamesLostEl.textContent = stats.games_lost.toString();
    } else {
      // reset to default values
      if (gamesPlayedEl) gamesPlayedEl.textContent = '0';
      if (winRateEl) winRateEl.textContent = '0%';
      if (gamesWonEl) gamesWonEl.textContent = '0';
      if (gamesLostEl) gamesLostEl.textContent = '0';
    }
  },

  // update the home page stats cards
  // stat cards use class-based selectors since they don't have IDs on value elements
  updateHomeStats(stats: ExtendedStats | null): void {
    // get stat cards by label IDs and find sibling stat-value
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach(card => {
      const valueEl = card.querySelector('.stat-value');
      const labelEl = card.querySelector('.stat-label');
      
      if (!valueEl || !labelEl) return;
      
      const labelId = labelEl.id;
      
      if (stats) {
        switch (labelId) {
          case 'stat-games-label':
            valueEl.textContent = stats.games_played.toString();
            break;
          case 'stat-wins-label':
            valueEl.textContent = stats.games_won.toString();
            break;
          case 'stat-rank-label':
            valueEl.textContent = stats.global_rank ? `#${stats.global_rank}` : '-';
            break;
          case 'stat-tournaments-label':
            valueEl.textContent = (stats.tournaments_won || 0).toString();
            break;
        }
      } else {
        // reset to default if no stats
        valueEl.textContent = '-';
      }
    });
  },

  // get cached user by ID for displaying opponent names
  getUserName(userId: string): string {
    const cachedUser = App.cachedUsers.get(userId);
    if (cachedUser?.name) return cachedUser.name;
    
    if (App.me?.id === userId && App.me?.name) return App.me.name;
    
    return 'Unknown';
  },

  // format a match result for display
  formatMatchResult(match: MatchHistoryItem, userId: string): {
    opponent: string;
    score: string;
    result: 'win' | 'loss';
    date: string;
    matchType: MatchType;
  } {
    const isPlayer1 = match.player1_id === userId;
    const myScore = isPlayer1 ? match.score1 : match.score2;
    const opponentScore = isPlayer1 ? match.score2 : match.score1;
    const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
    const opponentName = isPlayer1 ? match.player2_name : match.player1_name;
    
    return {
      opponent: opponentName || this.getUserName(opponentId) || 'Unknown',
      score: `${myScore} - ${opponentScore}`,
      result: myScore > opponentScore ? 'win' : 'loss',
      date: match.played_at ? new Date(match.played_at).toLocaleDateString() : '-',
      matchType: match.match_type || 'pvp'
    };
  },

  // get match type badge info (emoji + text)
  getMatchTypeBadge(matchType: MatchType): { emoji: string; text: string; color: string } {
    switch (matchType) {
      case 'ai':
        return { emoji: '🤖', text: 'AI', color: 'text-cyan-400 bg-cyan-400/10' };
      case 'pvp':
        return { emoji: '🌐', text: 'Online', color: 'text-blue-400 bg-blue-400/10' };
      case 'duel':
        return { emoji: '⚔️', text: 'Duel', color: 'text-orange-400 bg-orange-400/10' };
      case 'tournament':
        return { emoji: '🏆', text: 'Tournament', color: 'text-yellow-400 bg-yellow-400/10' };
      default:
        return { emoji: '🎮', text: 'Match', color: 'text-neutral-400 bg-neutral-400/10' };
    }
  }
};
