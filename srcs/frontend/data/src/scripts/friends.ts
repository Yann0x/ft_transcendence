import { User, UserPublic, SocialEvent } from '../shared/types';
import { socialClient } from './social-client';
import {Router} from './router'

export const Friends = {
  currentUser: null as User | null,

  init(currentUser: User | null): void {
    this.currentUser = currentUser;

    if (!this.currentUser) {
      alert('Vous devez être connecté pour accéder à cette page');
      Router.navigate('home')
      return;
    }

    this.setupSearchListeners();
    this.setupSocialEventListeners();

    this.loadUsers();
    this.searchUsers();
  },

  setupSocialEventListeners(): void {
    socialClient.on('user_online', (event: SocialEvent) => {
      console.log('[FRIENDS] User came online:', event.data);
      this.updateUserOnlineStatus(event.data.userId, 'online');
    });

    socialClient.on('user_offline', (event: SocialEvent) => {
      console.log('[FRIENDS] User went offline:', event.data);
      this.updateUserOnlineStatus(event.data.userId, 'offline');
    });
  },

  updateUserOnlineStatus(userId: string, status: 'online' | 'offline'): void {
    const userUpdate : UserPublic | undefined = this.currentUser.friend.find((obj: UserPublic) => obj.id === userId)
    if (userUpdate)
      userUpdate.status = status
    this.updateUserOnlineStatusCard(userId, status);
  },

  updateUserOnlineStatusCard(userId: string, status: 'online' | 'offline'): void {
    const statusDots = document.querySelectorAll(`[data-user-id="${userId}"] .status-dot`);
    statusDots.forEach(dot => {
      if (status === 'online') {
        dot.classList.remove('bg-neutral-500');
        dot.classList.add('bg-green-500');
      } else {
        dot.classList.remove('bg-green-500');
        dot.classList.add('bg-neutral-500');
      }
    });

    const statusTexts = document.querySelectorAll(`[data-user-id="${userId}"] .status-text`);
    statusTexts.forEach(text => {
      text.textContent = status;
    });
  },

  setupSearchListeners(): void {
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    const searchBtn = document.getElementById('user-search-btn');

    searchBtn?.addEventListener('click', () => {
      this.searchUsers();
    });

    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchUsers();
      }
    });
  },

  async searchUsers(): Promise<void> {
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    const query = searchInput?.value.trim() || '';

    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        alert('No JWT token to make request with');
        return;
      }
      // Search by name
      const url = query
        ? `/user/find?name=${encodeURIComponent(query)}`
        : `/user/find?name=`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }

      const users = await response.json() as UserPublic[];
      this.displaySearchResults(users);

    } catch (error) {
      console.error('Search error:', error);
      alert('Erreur lors de la recherche des utilisateurs');
    }
  },

  displaySearchResults(users: UserPublic[]): void {
    const resultsContainer = document.getElementById('search-results');
    const resultsList = document.getElementById('search-results-list');

    if (!resultsContainer || !resultsList) return;

    // Remove current user
    const filteredUsers = users.filter(user => user.id !== this.currentUser?.id);

    if (filteredUsers.length === 0) {
      resultsList.innerHTML = '<p class="text-neutral-500 text-center py-4">Aucun utilisateur trouvé</p>';
      resultsContainer.classList.remove('hidden');
      return;
    }
    resultsList.innerHTML = filteredUsers.map(user => this.createUserCard(user)).join('');
    resultsContainer.classList.remove('hidden');
    this.attachActionListeners();
  },

  createUserCard(user: any): string {
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
    const onlineStatus = user.onlineStatus || 'offline';
    const statusColor = onlineStatus === 'online' ? 'bg-green-500' : 'bg-neutral-500';

    let actionButton = `
        <button class="add_friend px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition" data-user-id="${user.id}">
          <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add
        </button>
      `;
    return `
      <div class="flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-750 transition" data-user-id="${user.id}">
        <div class="flex items-center gap-3">
          <div class="relative">
            <img src="${avatar}" alt="${user.name}" class="w-12 h-12 rounded-full object-cover">
            <span class="status-dot absolute bottom-0 right-0 w-3 h-3 ${statusColor} border-2 border-neutral-800 rounded-full"></span>
          </div>
          <div>
            <p class="font-semibold text-white">${user.name || 'Unknown'}</p>
            <p class="status-text text-sm text-neutral-400">${onlineStatus}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${actionButton}
        </div>
      </div>
    `;
  },

  attachActionListeners(): void {
    document.querySelectorAll('.add_friend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target_id = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (target_id) await this.addFriend(target_id);
      });
    });
  },
async loadUsers(): Promise<void> {
    const usersList = document.getElementById('users-list');
    const usersCount = document.getElementById('users-count');
    const emptyState = document.getElementById('users-empty-state');

    if (!usersList || !this.currentUser) return;

    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) return;

      // Récupère tous les users du serveur
      const response = await fetch(`/social/users?user_id=${this.currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const allusers = await response.json() as Array<any>;

      const users = allusers

      if (users.length === 0) {
        emptyState?.classList.remove('hidden');
        if (usersCount) {
          usersCount.textContent = '0 Users logged';
        }
        return;
      }

      emptyState?.classList.add('hidden');
      usersList.innerHTML = users.map(user => this.createUserCard(user)).join('');

      if (usersCount) {
        usersCount.textContent = `${users.length} ami${users.length > 1 ? 's' : ''}`;
      }

      // Attach action listeners
      this.attachActionListeners();

    } catch (error) {
      console.error('Error loading users:', error);
    }
  },
};
