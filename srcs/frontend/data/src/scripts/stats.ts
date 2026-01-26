import { App } from './app';
import { I18n } from './i18n';
import { StatsService, ExtendedStats, MatchHistoryItem } from './stats-service';

interface StatsState {
  stats: ExtendedStats | null;
  matchHistory: MatchHistoryItem[];
  allMatchHistory: MatchHistoryItem[]; // All matches for winrate graph
  isLoading: boolean;
}

const state: StatsState = {
  stats: null,
  matchHistory: [],
  allMatchHistory: [],
  isLoading: false
};

export const Stats = {
  //
  // Initialize the stats page

  async init(): Promise<void> {
    console.log('📊 Stats module initialized');

    // Check if user is logged in
    if (!App.me?.id) {
      console.warn('[STATS] User not logged in, showing login required');
      this.showLoginRequired();
      return;
    }

    await this.loadStats();
  },

  //
  // Load all stats data

  async loadStats(): Promise<void> {
    state.isLoading = true;
    this.showLoadingState();

    try {
      // Fetch stats, recent matches (10) and all matches for graph
      const [stats, matchHistory, allMatchHistory] = await Promise.all([
        StatsService.fetchStats(),
        StatsService.fetchMatchHistory(undefined, 10),
        StatsService.fetchMatchHistory(undefined, 1000) // Get all for graph
      ]);

      state.stats = stats;
      state.matchHistory = matchHistory || [];
      state.allMatchHistory = allMatchHistory || [];

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

  //
  // Fetch user data for opponents not in cache

  async fetchMissingUserData(): Promise<void> {
    if (!App.me?.id) return;

    const missingUserIds = new Set<string>();

    for (const match of state.matchHistory) {
      const opponentId = match.player1_id === App.me.id ? match.player2_id : match.player1_id;
      
      // Skip AI opponents
      if (opponentId.startsWith('AI_')) continue;
      
      // Skip if we already have the name from the match data or cache
      if (match.player1_name && match.player2_name) continue;
      if (App.cachedUsers.has(opponentId)) continue;
      
      missingUserIds.add(opponentId);
    }

    if (missingUserIds.size > 0) {
      await App.fetchAndCacheUsers(Array.from(missingUserIds));
    }
  },

  //
  // Render the stats page

  render(): void {
    // Ensure stats content is visible and login required is hidden
    const loginRequiredEl = document.getElementById('stats-login-required');
    const statsContentEl = document.getElementById('stats-content');
    if (loginRequiredEl) loginRequiredEl.classList.add('hidden');
    if (statsContentEl) statsContentEl.classList.remove('hidden');

    this.updateGlobalStats();
    this.updateGameStats();
    this.updatePerformanceStats();
    this.renderWinrateGraph();
    this.updateMatchHistory();
    I18n.refresh();
  },

  //
  // Update the global stats cards at the top

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

  //
  // Update the game stats card

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

  //
  // Update the performance stats card (without ELO)

  updatePerformanceStats(): void {
    const bestScoreEl = document.getElementById('stat-best-score');
    const worstScoreEl = document.getElementById('stat-worst-score');
    const winStreakEl = document.getElementById('stat-win-streak');

    if (state.stats) {
      if (bestScoreEl) bestScoreEl.textContent = (state.stats.best_score || 0).toString();
      if (worstScoreEl) worstScoreEl.textContent = (state.stats.worst_score || 0).toString();
      if (winStreakEl) winStreakEl.textContent = (state.stats.win_streak || 0).toString();
    }
  },

  //
  // Render the winrate evolution graph using canvas

  renderWinrateGraph(): void {
    const canvas = document.getElementById('winrate-graph') as HTMLCanvasElement;
    const noDataEl = document.getElementById('winrate-no-data');
    
    if (!canvas) return;

    const userId = App.me?.id || '';
    const winrates = StatsService.calculateWinrateEvolution(state.allMatchHistory, userId);

    // Show no data message if no matches
    if (winrates.length === 0) {
      canvas.style.display = 'none';
      if (noDataEl) noDataEl.classList.remove('hidden');
      return;
    }

    canvas.style.display = 'block';
    if (noDataEl) noDataEl.classList.add('hidden');

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 200 * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid lines and labels
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#888';
    ctx.font = '12px sans-serif';

    // Y-axis labels (0%, 25%, 50%, 75%, 100%)
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight * (4 - i)) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${i * 25}%`, 5, y + 4);
    }

    // Calculate point positions
    const pointSpacing = graphWidth / (winrates.length + 1);
    const points: { x: number; y: number; winrate: number }[] = [];

    for (let i = 0; i < winrates.length; i++) {
      const winrate = winrates[i];
      const x = padding.left + pointSpacing * (i + 1);
      const y = padding.top + graphHeight - (winrate / 100) * graphHeight;
      points.push({ x, y, winrate });
    }

    // Draw 50% reference line (more visible)
    ctx.beginPath();
    ctx.strokeStyle = '#525252';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const y50 = padding.top + graphHeight / 2;
    ctx.moveTo(padding.left, y50);
    ctx.lineTo(width - padding.right, y50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Colors
    const brightGreen = '#22c55e';
    const brightRed = '#ef4444';

    // Draw connecting straight line segments between points (color based on winrate)
    if (points.length > 1) {
      ctx.lineWidth = 3;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        // Use the average winrate of the two points to determine color
        const avgWinrate = (p1.winrate + p2.winrate) / 2;
        ctx.beginPath();
        ctx.strokeStyle = avgWinrate >= 50 ? brightGreen : brightRed;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // Draw points on top of the line (white with colored border based on winrate)
    for (const point of points) {
      const pointColor = point.winrate >= 50 ? brightGreen : brightRed;
      
      // Outer circle (colored border)
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = pointColor;
      ctx.fill();

      // Inner circle (white fill)
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    // X-axis label
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Matchs', width / 2, height - 5);
  },

  //
  // Update the match history table with type badges

  updateMatchHistory(): void {
    const tbody = document.querySelector('#app table tbody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    if (state.matchHistory.length === 0) {
      tbody.innerHTML = `
        <tr class="hover:bg-neutral-800/50 transition">
          <td class="py-3 px-4 text-neutral-500" colspan="5" data-i18n="stats.no_data">Aucune donnée pour le moment</td>
        </tr>
      `;
      return;
    }

    const userId = App.me?.id || '';

    for (const match of state.matchHistory) {
      const formatted = StatsService.formatMatchResult(match, userId);
      const badge = StatsService.getMatchTypeBadge(formatted.matchType);
      const row = document.createElement('tr');
      row.className = 'hover:bg-neutral-800/50 transition border-b border-neutral-800';

      const resultClass = formatted.result === 'win' ? 'text-emerald-400' : 'text-red-400';
      const resultText = formatted.result === 'win' ? 'Victoire' : 'Défaite';
      const resultI18n = formatted.result === 'win' ? 'stats.result_win' : 'stats.result_loss';

      // Get opponent display name (handle AI opponents)
      const opponentId = match.player1_id === userId ? match.player2_id : match.player1_id;
      let opponentDisplay = formatted.opponent;
      let avatarUrl = this.getAvatarUrl(match, userId);
      
      if (opponentId.startsWith('AI_')) {
        const difficulty = opponentId.replace('AI_', '');
        opponentDisplay = `IA (${difficulty})`;
        avatarUrl = 'https://ui-avatars.com/api/?name=AI&background=06b6d4&color=fff';
      }

      row.innerHTML = `
        <td class="py-3 px-4">
          <span class="px-2 py-1 rounded text-xs font-medium ${badge.color}">
            ${badge.emoji} ${badge.text}
          </span>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img src="${avatarUrl}" 
                 alt="" 
                 class="w-8 h-8 rounded-full object-cover">
            <span class="font-medium">${this.escapeHtml(opponentDisplay)}</span>
          </div>
        </td>
        <td class="py-3 px-4 text-center font-mono">${formatted.score}</td>
        <td class="py-3 px-4 text-center">
          <span class="${resultClass} font-semibold" data-i18n="${resultI18n}">${resultText}</span>
        </td>
        <td class="py-3 px-4 text-right text-neutral-400">${formatted.date}</td>
      `;

      // Add click handler to open opponent profile (not for AI)
      if (!opponentId.startsWith('AI_')) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => this.openOpponentProfile(opponentId));
      }

      tbody.appendChild(row);
    }
  },

  //
  // Get avatar URL for opponent in match

  getAvatarUrl(match: MatchHistoryItem, userId: string): string {
    const opponentId = match.player1_id === userId ? match.player2_id : match.player1_id;
    const opponentName = match.player1_id === userId ? match.player2_name : match.player1_name;
    
    // Handle AI opponents
    if (opponentId.startsWith('AI_')) {
      return 'https://ui-avatars.com/api/?name=AI&background=06b6d4&color=fff';
    }
    
    const cachedUser = App.cachedUsers.get(opponentId);
    if (cachedUser?.avatar) return cachedUser.avatar;
    
    const name = opponentName || cachedUser?.name || 'Unknown';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`;
  },

  //
  // Open opponent's profile modal

  openOpponentProfile(userId: string): void {
    import('./profile-modal').then(module => {
      module.ProfileModal.open(userId);
    });
  },

  //
  // Escape HTML to prevent XSS

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  //
  // Show loading state

  showLoadingState(): void {
    // Ensure stats content is visible during loading
    const loginRequiredEl = document.getElementById('stats-login-required');
    const statsContentEl = document.getElementById('stats-content');
    if (loginRequiredEl) loginRequiredEl.classList.add('hidden');
    if (statsContentEl) statsContentEl.classList.remove('hidden');

    const elements = [
      'stat-games-played', 'stat-win-rate', 'stat-global-rank', 'stat-tournaments-won',
      'stat-wins', 'stat-losses', 'stat-points-scored', 'stat-points-allowed',
      'stat-best-score', 'stat-worst-score', 'stat-win-streak'
    ];

    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '...';
    });
  },

  //
  // Show login required state

  showLoginRequired(): void {
    const loginRequiredEl = document.getElementById('stats-login-required');
    const statsContentEl = document.getElementById('stats-content');

    if (loginRequiredEl) {
      loginRequiredEl.classList.remove('hidden');
    }
    if (statsContentEl) {
      statsContentEl.classList.add('hidden');
    }

    // Bind auth modal trigger
    const loginBtn = loginRequiredEl?.querySelector('[data-auth="login"]');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.remove('hidden');
      });
    }
  },

  //
  // Show empty state (when logged in but no data)

  showEmptyState(): void {
    const elements = [
      'stat-games-played', 'stat-win-rate', 'stat-global-rank', 'stat-tournaments-won',
      'stat-wins', 'stat-losses', 'stat-points-scored', 'stat-points-allowed',
      'stat-best-score', 'stat-worst-score', 'stat-win-streak'
    ];

    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '-';
    });

    const tbody = document.querySelector('#app table tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr class="hover:bg-neutral-800/50 transition">
          <td class="py-3 px-4 text-neutral-500" colspan="5" data-i18n="stats.login_required">Connectez-vous pour voir vos statistiques</td>
        </tr>
      `;
    }

    // Hide graph when not logged in
    const canvas = document.getElementById('winrate-graph') as HTMLCanvasElement;
    const noDataEl = document.getElementById('winrate-no-data');
    if (canvas) canvas.style.display = 'none';
    if (noDataEl) noDataEl.classList.remove('hidden');
  },

  //
  // Show error state

  showErrorState(): void {
    const elements = [
      'stat-games-played', 'stat-win-rate', 'stat-global-rank', 'stat-tournaments-won',
      'stat-wins', 'stat-losses', 'stat-points-scored', 'stat-points-allowed',
      'stat-best-score', 'stat-worst-score', 'stat-win-streak'
    ];

    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '!';
    });

    const tbody = document.querySelector('#app table tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr class="hover:bg-neutral-800/50 transition">
          <td class="py-3 px-4 text-red-400" colspan="5" data-i18n="stats.error">Erreur lors du chargement des statistiques</td>
        </tr>
      `;
    }
  },

  //
  // Refresh stats (can be called externally)

  async refresh(): Promise<void> {
    if (App.me?.id) {
      await this.loadStats();
    }
  },

  //
  // Load stats for a specific user (used by match page)

  async loadUserStats(userId: string): Promise<ExtendedStats | null> {
    return await StatsService.fetchStats(userId);
  },

  //
  // Load match history for a specific user

  async loadUserMatchHistory(userId: string, limit: number = 10): Promise<MatchHistoryItem[]> {
    const history = await StatsService.fetchMatchHistory(userId, limit);
    return history || [];
  }
};

export { StatsService };
