import { UserPublic, SocialEvent } from '../shared/types';
import { socialClient } from './social-client';
import { Router } from './router';
import { App } from './app';

export const Friends = {
  onlineUsers: new Map<string, UserPublic>(),  // userId -> UserPublic

  init(): void {
    if (!App.me) {
      alert('Vous devez être connecté pour accéder à cette page');
      Router.navigate('home')
      return;
    }

    this.setupSearchListeners();
    this.setupSocialEventListeners();

    this.loadUsers();
    // Don't call searchUsers() here - wait for users_online event to populate onlineUsers map
  },

  setupSocialEventListeners(): void {
    // Recupere tous les utilisateurs connectés au serveur
    socialClient.on('users_online', (event: SocialEvent) => {
      console.log('[FRIENDS] Received online users list:', event.data);
      if (event.data && event.data.users && Array.isArray(event.data.users)) {
        event.data.users.forEach((user: UserPublic) => {
          this.onlineUsers.set(user.id, user);
          this.updateUserOnlineStatus(user.id, 'online');
        });
        // Refresh search results to show online users
        this.searchUsers();
      }
    });

    // Handle single user coming online
    socialClient.on('user_online', (event: SocialEvent) => {
      console.log('[FRIENDS] User came online:', event.data);
      if (event.data && event.data.user) {
        this.onlineUsers.set(event.data.user.id, event.data.user);
        this.updateUserOnlineStatus(event.data.user.id, 'online');
        // Refresh search to include new online user
        this.searchUsers();
      }
    });

    // Handle user going offline
    socialClient.on('user_offline', (event: SocialEvent) => {
      console.log('[FRIENDS] User went offline:', event.data);
      if (event.data && event.data.id) {
        this.onlineUsers.delete(event.data.id);
        this.updateUserOnlineStatus(event.data.id, 'offline');
        // Refresh search to remove offline user
        this.searchUsers();
      }
    });

    // Handle user data updates (friend list, avatar, name changes, etc.)
    socialClient.on('user_update', async (event: SocialEvent) => {
      console.log('[FRIENDS] User update event:', event.data);

      if (!event.data || !event.data.userId) return;

      const updatedUserId = event.data.userId;

      // If the update is for the current user, refresh their data
      if (App.me && updatedUserId === App.me.id) {
        await this.refreshCurrentUserData();
        return;
      }

      // If the update is for a different user, check if they're a friend or online user
      await this.handleOtherUserUpdate(updatedUserId);
    });
  },

  /**
   * Refresh current user data from backend and update UI
   */
  async refreshCurrentUserData(): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token || !App.me?.id) return;

      console.log('[FRIENDS] Refreshing current user data...');

      const response = await fetch(`/user/find?id=${App.me.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('[FRIENDS] Failed to refresh user data');
        return;
      }

      const users = await response.json();
      if (users && users.length > 0) {
        const updatedUser = users[0];

        // Update App.me with fresh data
        App.me = updatedUser;

        // Update sessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

        // Update navbar UI
        App.updateNavbar();

        // Refresh the entire display
        this.refreshDisplay();

        console.log('[FRIENDS] Current user data refreshed successfully');
      }
    } catch (error) {
      console.error('[FRIENDS] Error refreshing user data:', error);
    }
  },

  /**
   * Refresh both search results and friends list display
   * Call this after user data changes (add/remove friend)
   */
  refreshDisplay(): void {
    console.log('[FRIENDS] Refreshing display...');

    // Check if we're on the friends page
    const friendsList = document.getElementById('friends-list');
    const searchResults = document.getElementById('search-results');

    if (!friendsList && !searchResults) {
      console.log('[FRIENDS] Not on friends page, skipping display refresh');
      return;
    }

    // Reload friends list
    this.loadUsers();

    // Refresh search results if they're visible
    if (searchResults && !searchResults.classList.contains('hidden')) {
      this.searchUsers();
    }
  },

  /**
   * Handle updates for other users (not the current user)
   * Updates their data if they're in our friends list or online users
   */
  async handleOtherUserUpdate(userId: string): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) return;

      console.log(`[FRIENDS] Handling update for user ${userId}`);

      // Fetch updated user data
      const response = await fetch(`/user/find?id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error(`[FRIENDS] Failed to fetch updated data for user ${userId}`);
        return;
      }

      const users = await response.json();
      if (!users || users.length === 0) return;

      const updatedUser = users[0] as UserPublic;

      // Check if this user is in our friends list
      if (App.me?.friends) {
        const friendIndex = App.me.friends.findIndex((f: UserPublic) => f.id === userId);
        if (friendIndex !== -1) {
          console.log(`[FRIENDS] Updating friend data for ${updatedUser.name}`);
          // Update the friend in App.me.friends
          App.me.friends[friendIndex] = {
            id: updatedUser.id,
            name: updatedUser.name,
            avatar: updatedUser.avatar,
            status: updatedUser.status
          };
          // Update sessionStorage
          sessionStorage.setItem('currentUser', JSON.stringify(App.me));
        }
      }

      // Check if this user is in our online users map
      if (this.onlineUsers.has(userId)) {
        console.log(`[FRIENDS] Updating online user data for ${updatedUser.name}`);
        this.onlineUsers.set(userId, updatedUser);
      }

      // Refresh display if we're on the friends page
      this.refreshDisplay();

    } catch (error) {
      console.error(`[FRIENDS] Error handling user update for ${userId}:`, error);
    }
  },

  updateUserOnlineStatus(userId: string, status: 'online' | 'offline'): void {
    // Only update UI card - don't try to update currentUser.friend which may not exist
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

    if (query) {
      // Search ALL users via REST API (includes offline users)
      try {
        const token = sessionStorage.getItem('authToken');
        if (!token) {
          alert('Not authenticated');
          return;
        }

        const url = `/user/find?name=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const users = await response.json() as UserPublic[];
        this.displaySearchResults(users);
      } catch (error) {
        console.error('[FRIENDS] Search error:', error);
        alert('Error searching users');
      }
    } else {
      // No query - display online users from in-memory map
      const users = Array.from(this.onlineUsers.values());
      this.displaySearchResults(users);
    }
  },

  displaySearchResults(users: UserPublic[]): void {
    const resultsContainer = document.getElementById('search-results');
    const resultsList = document.getElementById('search-results-list');

    if (!resultsContainer || !resultsList) return;

    // Remove current user
    const filteredUsers = users.filter(user => user.id !== App.me?.id);

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

  async addFriend(targetId: string): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch('/user/addFriend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId: targetId })
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.message || 'Failed to add friend');
        return;
      }

      const result = await response.json();
      console.log('[FRIENDS] Friend added successfully:', result);
      // The user_update WebSocket event will trigger refreshUserData
    } catch (error) {
      console.error('[FRIENDS] Error adding friend:', error);
      alert('Error adding friend');
    }
  },

async loadUsers(): Promise<void> {
    const friendsList = document.getElementById('friends-list');
    const friendsCount = document.getElementById('friends-count');
    const emptyState = document.getElementById('friends-empty-state');

    if (!friendsList || !App.me) return;

    // Get friends from App.me
    const friends = App.me.friends || [];

    if (friends.length === 0) {
      emptyState?.classList.remove('hidden');
      friendsList.innerHTML = '';
      if (friendsCount) {
        friendsCount.textContent = '0 amis';
      }
      return;
    }

    emptyState?.classList.add('hidden');

    // Create friend cards
    friendsList.innerHTML = friends.map((friend: UserPublic) => this.createFriendCard(friend)).join('');

    if (friendsCount) {
      friendsCount.textContent = `${friends.length} ami${friends.length > 1 ? 's' : ''}`;
    }

    // Attach action listeners for friend cards
    this.attachFriendActionListeners();
  },

  createFriendCard(friend: UserPublic): string {
    const avatar = friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name || 'User')}&background=3b82f6&color=fff`;

    // Check if friend is online
    const isOnline = this.onlineUsers.has(friend.id);
    const statusColor = isOnline ? 'bg-green-500' : 'bg-neutral-500';
    const statusText = isOnline ? 'online' : 'offline';

    return `
      <div class="flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-750 transition" data-user-id="${friend.id}">
        <div class="flex items-center gap-3">
          <div class="relative">
            <img src="${avatar}" alt="${friend.name}" class="w-12 h-12 rounded-full object-cover">
            <span class="status-dot absolute bottom-0 right-0 w-3 h-3 ${statusColor} border-2 border-neutral-800 rounded-full"></span>
          </div>
          <div>
            <p class="font-semibold text-white">${friend.name || 'Unknown'}</p>
            <p class="status-text text-sm text-neutral-400">${statusText}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="view_profile px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition" data-user-id="${friend.id}">
            <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            Profil
          </button>
          <button class="remove_friend px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition" data-user-id="${friend.id}">
            <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Retirer
          </button>
        </div>
      </div>
    `;
  },

  attachFriendActionListeners(): void {
    document.querySelectorAll('.view_profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (userId) {
          console.log('[FRIENDS] View profile for user:', userId);
          // TODO: Navigate to profile page or show modal
          alert(`Voir le profil de l'utilisateur ${userId}`);
        }
      });
    });

    document.querySelectorAll('.remove_friend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (userId) {
          if (confirm('Êtes-vous sûr de vouloir retirer cet ami ?')) {
            await this.removeFriend(userId);
          }
        }
      });
    });
  },

  async removeFriend(friendId: string): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch('/user/rmFriend', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId })
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.message || 'Failed to remove friend');
        return;
      }

      const result = await response.json();
      console.log('[FRIENDS] Friend removed successfully:', result);
      // The user_update WebSocket event will trigger refreshCurrentUserData
    } catch (error) {
      console.error('[FRIENDS] Error removing friend:', error);
      alert('Error removing friend');
    }
  },
};
