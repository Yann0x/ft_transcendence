/* ============================================
   STATS - Stats Page Handler
   ============================================ */

import { App } from './app';
import { I18n } from './i18n';
import { StatsService, ExtendedStats, MatchHistoryItem } from './stats-service';

interface StatsState {
  stats: ExtendedStats | null;
  matchHistory: MatchHistoryItem[];
  isLoading: boolean;
}

const state: StatsState = {
  stats: null,
  matchHistory: [],
  isLoading: false
};

export const Stats = {
  /**
   * Initialize the stats page
   */
  async init(): Promise<void> {
    console.log('📊 Stats module initialized');

    // Check if user is logged in
    if (!App.me?.id) {
      console.warn('[STATS] User not logged in, showing empty stats');
      this.showEmptyState();
      return;
    }

    await this.loadStats();
  },

  /**
   * Load all stats data
   */
  async loadStats(): Promise<void> {
    state.isLoading = true;
    this.showLoadingState();

    try {
      // Fetch stats and match history in parallel
      const [stats, matchHistory] = await Promise.all([
        StatsService.fetchStats(),
        StatsService.fetchMatchHistory(undefined, 10)
      ]);

      state.stats = stats;
      state.matchHistory = matchHistory || [];

      // Fetch user data for opponents we don't have cached
      await this.fetchMissingUserData();

      this.render();
    } catch (error) {
      console.error('[STATS] Error loading stats:', error);
      this.showErrorState();
    } finally {
      state.isLoading = false;
    }
  },

  /**
   * Fetch user data for opponents not in cache
   */
  async fetchMissingUserData(): Promise<void> {
    if (!App.me?.id) return;

    const missingUserIds = new Set<string>();

    for (const match of state.matchHistory) {
      const opponentId = match.player1_id === App.me.id ? match.player2_id : match.player1_id;
      
      // Skip if we already have the name from the match data or cache
      if (match.player1_name && match.player2_name) continue;
      if (App.cachedUsers.has(opponentId)) continue;
      
      missingUserIds.add(opponentId);
    }

    if (missingUserIds.size > 0) {
      await App.fetchAndCacheUsers(Array.from(missingUserIds));
    }
  },

  /**
   * Render the stats page
   */
  render(): void {
    this.updateGlobalStats();
    this.updateGameStats();
    this.updatePerformanceStats();
    this.updateMatchHistory();
    I18n.refresh();
  },

  /**
   * Update the global stats cards at the top
   */
  updateGlobalStats(): void {
    const gamesPlayedEl = document.getElementById('stat-games-played');
    const winRateEl = document.getElementById('stat-win-rate');
    const globalRankEl = document.getElementById('stat-global-rank');
    const tournamentsWonEl = document.getElementById('stat-tournaments-won');

    if (state.stats) {
      if (gamesPlayedEl) gamesPlayedEl.textContent = state.stats.games_played.toString();
      if (winRateEl) winRateEl.textContent = `${state.stats.win_rate}%`;
      if (globalRankEl) globalRankEl.textContent = state.stats.global_rank ? `#${state.stats.global_rank}` : '-';
      if (tournamentsWonEl) tournamentsWonEl.textContent = (state.stats.tournaments_won || 0).toString();
    }
  },

  /**
   * Update the game stats card
   */
  updateGameStats(): void {
    const winsEl = document.getElementById('stat-wins');
    const lossesEl = document.getElementById('stat-losses');
    const pointsScoredEl = document.getElementById('stat-points-scored');
    const pointsAllowedEl = document.getElementById('stat-points-allowed');

    if (state.stats) {
      if (winsEl) winsEl.textContent = state.stats.games_won.toString();
      if (lossesEl) lossesEl.textContent = state.stats.games_lost.toString();
      if (pointsScoredEl) pointsScoredEl.textContent = (state.stats.points_scored || 0).toString();
      if (pointsAllowedEl) pointsAllowedEl.textContent = (state.stats.points_allowed || 0).toString();
    }
  },

  /**
   * Update the performance stats card
   */
  updatePerformanceStats(): void {
    const bestScoreEl = document.getElementById('stat-best-score');
    const worstScoreEl = document.getElementById('stat-worst-score');
    const winStreakEl = document.getElementById('stat-win-streak');
    const eloEl = document.getElementById('stat-elo');

    if (state.stats) {
      if (bestScoreEl) bestScoreEl.textContent = (state.stats.best_score || 0).toString();
      if (worstScoreEl) worstScoreEl.textContent = (state.stats.worst_score || 0).toString();
      if (winStreakEl) winStreakEl.textContent = (state.stats.win_streak || 0).toString();
      if (eloEl) eloEl.textContent = (state.stats.elo || 1000).toString();
    }
  },

  /**
   * Update the match history table
   */
  updateMatchHistory(): void {
    const tbody = document.querySelector('#app table tbody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    if (state.matchHistory.length === 0) {
      tbody.innerHTML = `
        <tr class="hover:bg-neutral-800/50 transition">
          <td class="py-3 px-4 text-neutral-500" colspan="4" data-i18n="stats.no_data">Aucune donnée pour le moment</td>
        </tr>
      `;
      return;
    }

    const userId = App.me?.id || '';

    for (const match of state.matchHistory) {
      const formatted = StatsService.formatMatchResult(match, userId);
      const row = document.createElement('tr');
      row.className = 'hover:bg-neutral-800/50 transition border-b border-neutral-800';

      const resultClass = formatted.result === 'win' ? 'text-emerald-400' : 'text-red-400';
      const resultText = formatted.result === 'win' ? 'Victoire' : 'Défaite';
      const resultI18n = formatted.result === 'win' ? 'stats.result_win' : 'stats.result_loss';

      row.innerHTML = `
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img src="${this.getAvatarUrl(match, userId)}" 
                 alt="" 
                 class="w-8 h-8 rounded-full object-cover">
            <span class="font-medium">${this.escapeHtml(formatted.opponent)}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-center font-mono">${formatted.score}</td>
        <td class="py-3 px-4 text-center">
          <span class="${resultClass} font-semibold" data-i18n="${resultI18n}">${resultText}</span>
        </td>
        <td class="py-3 px-4 text-right text-neutral-400">${formatted.date}</td>
      `;

      // Add click handler to open opponent profile
      row.style.cursor = 'pointer';
      const opponentId = match.player1_id === userId ? match.player2_id : match.player1_id;
      row.addEventListener('click', () => this.openOpponentProfile(opponentId));

      tbody.appendChild(row);
    }
  },

  /**
   * Get avatar URL for opponent in match
   */
  getAvatarUrl(match: MatchHistoryItem, userId: string): string {
    const opponentId = match.player1_id === userId ? match.player2_id : match.player1_id;
    const opponentName = match.player1_id === userId ? match.player2_name : match.player1_name;
    
    const cachedUser = App.cachedUsers.get(opponentId);
    if (cachedUser?.avatar) return cachedUser.avatar;
    
    const name = opponentName || cachedUser?.name || 'Unknown';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`;
  },

  /**
   * Open opponent's profile modal
   */
  openOpponentProfile(userId: string): void {
    // Import ProfileModal dynamically to avoid circular dependency
    import('./profile-modal').then(module => {
      module.ProfileModal.open(userId);
    });
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Show loading state
   */
  showLoadingState(): void {
    const elements = [
      'stat-games-played', 'stat-win-rate', 'stat-global-rank', 'stat-tournaments-won',
      'stat-wins', 'stat-losses', 'stat-points-scored', 'stat-points-allowed',
      'stat-best-score', 'stat-worst-score', 'stat-win-streak', 'stat-elo'
    ];

    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '...';
    });
  },

  /**
   * Show empty state when not logged in
   */
  showEmptyState(): void {
    const elements = [
      'stat-games-played', 'stat-win-rate', 'stat-global-rank', 'stat-tournaments-won',
      'stat-wins', 'stat-losses', 'stat-points-scored', 'stat-points-allowed',
      'stat-best-score', 'stat-worst-score', 'stat-win-streak', 'stat-elo'
    ];

    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '-';
    });

    const tbody = document.querySelector('#app table tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr class="hover:bg-neutral-800/50 transition">
          <td class="py-3 px-4 text-neutral-500" colspan="4" data-i18n="stats.login_required">Connectez-vous pour voir vos statistiques</td>
        </tr>
      `;
    }
  },

  /**
   * Show error state
   */
  showErrorState(): void {
    const elements = [
      'stat-games-played', 'stat-win-rate', 'stat-global-rank', 'stat-tournaments-won',
      'stat-wins', 'stat-losses', 'stat-points-scored', 'stat-points-allowed',
      'stat-best-score', 'stat-worst-score', 'stat-win-streak', 'stat-elo'
    ];

    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '!';
    });

    const tbody = document.querySelector('#app table tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr class="hover:bg-neutral-800/50 transition">
          <td class="py-3 px-4 text-red-400" colspan="4" data-i18n="stats.error">Erreur lors du chargement des statistiques</td>
        </tr>
      `;
    }
  },

  /**
   * Refresh stats (can be called externally)
   */
  async refresh(): Promise<void> {
    if (App.me?.id) {
      await this.loadStats();
    }
  },

  /**
   * Load stats for a specific user (used by match page)
   */
  async loadUserStats(userId: string): Promise<ExtendedStats | null> {
    return await StatsService.fetchStats(userId);
  },

  /**
   * Load match history for a specific user
   */
  async loadUserMatchHistory(userId: string, limit: number = 10): Promise<MatchHistoryItem[]> {
    const history = await StatsService.fetchMatchHistory(userId, limit);
    return history || [];
  }
};

export { StatsService };
