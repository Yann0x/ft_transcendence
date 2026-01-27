/* STATS */

import { App } from './app';
import { I18n } from './i18n';
import { StatsService, ExtendedStats, MatchHistoryItem } from './stats-service';

/* TYPES */

interface StatsState {
  stats: ExtendedStats | null;
  matchHistory: MatchHistoryItem[];
  allMatchHistory: MatchHistoryItem[];
  isLoading: boolean;
}

/* STATE */

const state: StatsState = {
  stats: null,
  matchHistory: [],
  allMatchHistory: [],
  isLoading: false
};

/* STATS MODULE */

export const Stats = {

  async init(): Promise<void> {
    console.log('📊 Stats module initialized');

    if (!App.me?.id) {
      console.warn('[STATS] User not logged in, showing login required');
      this.showLoginRequired();
      return;
    }

    await this.loadStats();
  },

  /* DATA LOADING */

  async loadStats(): Promise<void> {
    state.isLoading = true;
    this.showLoadingState();

    try {
      const [stats, matchHistory, allMatchHistory] = await Promise.all([
        StatsService.fetchStats(),
        StatsService.fetchMatchHistory(undefined, 10),
        StatsService.fetchMatchHistory(undefined, 1000)
      ]);

      state.stats = stats;
      state.matchHistory = matchHistory || [];
      state.allMatchHistory = allMatchHistory || [];

      await this.fetchMissingUserData();

      this.render();
    } catch (error) {
      console.error('[STATS] Error loading stats:', error);
      this.showErrorState();
    } finally {
      state.isLoading = false;
    }
  },

  async fetchMissingUserData(): Promise<void> {
    if (!App.me?.id) return;

    const missingUserIds = new Set<string>();

    for (const match of state.matchHistory) {
      const opponentId = match.player1_id === App.me.id ? match.player2_id : match.player1_id;

      if (opponentId.startsWith('AI_')) continue;

      if (match.player1_name && match.player2_name) continue;
      if (App.cachedUsers.has(opponentId)) continue;

      missingUserIds.add(opponentId);
    }

    if (missingUserIds.size > 0) {
      await App.fetchAndCacheUsers(Array.from(missingUserIds));
    }
  },

  /* RENDER */

  render(): void {
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

  /* WINRATE GRAPH */

  renderWinrateGraph(): void {
    const canvas = document.getElementById('winrate-graph') as HTMLCanvasElement;
    const noDataEl = document.getElementById('winrate-no-data');

    if (!canvas) return;

    const userId = App.me?.id || '';
    const winrates = StatsService.calculateWinrateEvolution(state.allMatchHistory, userId);

    if (winrates.length === 0) {
      canvas.style.display = 'none';
      if (noDataEl) noDataEl.classList.remove('hidden');
      return;
    }

    canvas.style.display = 'block';
    if (noDataEl) noDataEl.classList.add('hidden');

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 200 * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#888';
    ctx.font = '12px sans-serif';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight * (4 - i)) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${i * 25}%`, 5, y + 4);
    }

    const pointSpacing = graphWidth / (winrates.length + 1);
    const points: { x: number; y: number; winrate: number }[] = [];

    for (let i = 0; i < winrates.length; i++) {
      const winrate = winrates[i];
      const x = padding.left + pointSpacing * (i + 1);
      const y = padding.top + graphHeight - (winrate / 100) * graphHeight;
      points.push({ x, y, winrate });
    }

    ctx.beginPath();
    ctx.strokeStyle = '#525252';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const y50 = padding.top + graphHeight / 2;
    ctx.moveTo(padding.left, y50);
    ctx.lineTo(width - padding.right, y50);
    ctx.stroke();
    ctx.setLineDash([]);

    const brightGreen = '#22c55e';
    const brightRed = '#ef4444';

    if (points.length > 1) {
      ctx.lineWidth = 3;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const avgWinrate = (p1.winrate + p2.winrate) / 2;
        ctx.beginPath();
        ctx.strokeStyle = avgWinrate >= 50 ? brightGreen : brightRed;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    for (const point of points) {
      const pointColor = point.winrate >= 50 ? brightGreen : brightRed;

      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = pointColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Matchs', width / 2, height - 5);
  },

  /* MATCH HISTORY */

  updateMatchHistory(): void {
    const tbody = document.querySelector('#app table tbody');
    if (!tbody) return;

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

      if (!opponentId.startsWith('AI_')) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => this.openOpponentProfile(opponentId));
      }

      tbody.appendChild(row);
    }
  },

  /* HELPERS */

  getAvatarUrl(match: MatchHistoryItem, userId: string): string {
    const opponentId = match.player1_id === userId ? match.player2_id : match.player1_id;
    const opponentName = match.player1_id === userId ? match.player2_name : match.player1_name;

    if (opponentId.startsWith('AI_')) {
      return 'https://ui-avatars.com/api/?name=AI&background=06b6d4&color=fff';
    }

    const cachedUser = App.cachedUsers.get(opponentId);
    if (cachedUser?.avatar) return cachedUser.avatar;

    const name = opponentName || cachedUser?.name || 'Unknown';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`;
  },

  openOpponentProfile(userId: string): void {
    import('./profile-modal').then(module => {
      module.ProfileModal.open(userId);
    });
  },

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /* UI STATES */

  showLoadingState(): void {
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

  showLoginRequired(): void {
    const loginRequiredEl = document.getElementById('stats-login-required');
    const statsContentEl = document.getElementById('stats-content');

    if (loginRequiredEl) {
      loginRequiredEl.classList.remove('hidden');
    }
    if (statsContentEl) {
      statsContentEl.classList.add('hidden');
    }

    const loginBtn = loginRequiredEl?.querySelector('[data-auth="login"]');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.remove('hidden');
      });
    }
  },

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

    const canvas = document.getElementById('winrate-graph') as HTMLCanvasElement;
    const noDataEl = document.getElementById('winrate-no-data');
    if (canvas) canvas.style.display = 'none';
    if (noDataEl) noDataEl.classList.remove('hidden');
  },

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

  /* PUBLIC API */

  async refresh(): Promise<void> {
    if (App.me?.id) {
      await this.loadStats();
    }
  },

  async loadUserStats(userId: string): Promise<ExtendedStats | null> {
    return await StatsService.fetchStats(userId);
  },

  async loadUserMatchHistory(userId: string, limit: number = 10): Promise<MatchHistoryItem[]> {
    const history = await StatsService.fetchMatchHistory(userId, limit);
    return history || [];
  }
};

export { StatsService };
