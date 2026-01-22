/* ============================================
   STATS SERVICE - Centralized Stats Fetching
   ============================================ */

import { App } from './app';

// Base stats interface matching backend StatsSchema
export interface Stats {
  user_id: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
}

// Extended stats with additional computed fields
export interface ExtendedStats extends Stats {
  points_scored?: number;
  points_allowed?: number;
  best_score?: number;
  worst_score?: number;
  win_streak?: number;
  elo?: number;
  global_rank?: number;
  tournaments_won?: number;
}

export interface MatchHistoryItem {
  id: number;
  player1_id: string;
  player2_id: string;
  score1: number;
  score2: number;
  tournament_id?: string;
  player1_name?: string;
  player2_name?: string;
  played_at?: string;
}

export const StatsService = {
  /**
   * Fetch stats for a user
   */
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
      
      // Fetch match history to calculate additional stats
      const matchHistory = await this.fetchMatchHistory(userId);
      if (matchHistory && matchHistory.length > 0) {
        const additionalStats = this.calculateAdditionalStats(matchHistory, userId || App.me?.id || '');
        Object.assign(stats, additionalStats);
      }

      return stats;
    } catch (error) {
      console.error('[STATS] Error fetching stats:', error);
      return null;
    }
  },

  /**
   * Fetch match history for a user
   */
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

  /**
   * Calculate additional stats from match history
   */
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

    // If no matches, reset worst score
    if (worstScore === Infinity) worstScore = 0;

    return {
      points_scored: pointsScored,
      points_allowed: pointsAllowed,
      best_score: bestScore,
      worst_score: worstScore,
      win_streak: maxStreak,
      // ELO and rank would typically come from backend, placeholder values
      elo: 1000 + (maxStreak * 10),
      global_rank: 0, // Would need a separate endpoint for rankings
      tournaments_won: 0 // Would need tournament data
    };
  },

  /**
   * Update the profile modal stats elements
   */
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
      // Reset to default values
      if (gamesPlayedEl) gamesPlayedEl.textContent = '0';
      if (winRateEl) winRateEl.textContent = '0%';
      if (gamesWonEl) gamesWonEl.textContent = '0';
      if (gamesLostEl) gamesLostEl.textContent = '0';
    }
  },

  /**
   * Update the home page stats cards
   * The stat cards use class-based selectors since they don't have IDs on the value elements
   */
  updateHomeStats(stats: ExtendedStats | null): void {
    // Get stat cards by their label IDs and find the sibling stat-value
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
        // Reset to default if no stats
        valueEl.textContent = '-';
      }
    });
  },

  /**
   * Get cached user by ID for displaying opponent names
   */
  getUserName(userId: string): string {
    const cachedUser = App.cachedUsers.get(userId);
    if (cachedUser?.name) return cachedUser.name;
    
    if (App.me?.id === userId && App.me?.name) return App.me.name;
    
    return 'Unknown';
  },

  /**
   * Format a match result for display
   */
  formatMatchResult(match: MatchHistoryItem, userId: string): {
    opponent: string;
    score: string;
    result: 'win' | 'loss';
    date: string;
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
      date: match.played_at ? new Date(match.played_at).toLocaleDateString() : '-'
    };
  }
};
