import { UserPublic, SocialEvent } from '../shared/types';
import { socialClient } from './social-client';
import { Router } from './router';
import { App } from './app';

export const Friends = {

  init(): void {
    const token = sessionStorage.getItem('authToken');
    if (!App.me || !token) {
      console.log('Vous devez être connecté pour accéder à cette page');
      Router.navigate('home')
      return;
    }
    this.setupSearchListeners();
    this.setupSocialEventListeners();
    socialClient.connect(token);
  },

  setupSocialEventListeners(): void {
    socialClient.on('users_online', (event: SocialEvent) => {
      console.log('[FRIENDS] Received online users list:', event.data);
      if (event.data && event.data.users && Array.isArray(event.data.users)) {
        event.data.users.forEach((user: UserPublic) => {
          App.onlineUsers.set(user.id, user);
          this.updateUserOnlineStatusCard(user.id, 'online');
        });
        this.display();
      }
    });
    socialClient.on('user_online', (event: SocialEvent) => {
      console.log('[FRIENDS] User came online:', event.data);
      if (event.data && event.data.user) {
        App.onlineUsers.set(event.data.user.id, event.data.user);
        this.updateUserOnlineStatusCard(event.data.user.id, 'online');
        this.display();
      }
    });
    socialClient.on('user_offline', (event: SocialEvent) => {
      console.log('[FRIENDS] User went offline:', event.data);
      if (event.data && event.data.id) {
        App.onlineUsers.delete(event.data.id);
        this.updateUserOnlineStatusCard(event.data.id, 'offline');
        // Refresh search to remove offline user
        this.display();
      }
    });
    socialClient.on('user_update', async (event: SocialEvent) => {
      console.log('[FRIENDS] User update event:', event.data);
      if (!event.data || !event.data.userId) 
        return;
      const updatedUserId = event.data.userId;
      if (App.me && updatedUserId === App.me.id)
        await this.refreshCurrentUserData();
      else
        await this.handleOtherUserUpdate(updatedUserId);
      this.display();
      return;
    });
  },

  display(): void {
    const token = sessionStorage.getItem('authToken');
    if (!App.me || !token) {
      console.log('Vous devez être connecté pour accéder à cette page');
      Router.navigate('home')
      return;
    }
    const friendsList = document.getElementById('friends-list');
    const searchResults = document.getElementById('search-results');
    if (!friendsList && !searchResults) {
      console.log('[FRIENDS] Not on friends page, skipping display refresh');
      return;
    }
    this.loadSearch();
    this.loadFriends();
  },

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
        App.me = updatedUser;
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        App.updateNavbar();
        this.display();
      }
    } catch (error) {
      console.error('[FRIENDS] Error refreshing user data:', error);
    }
  },

  async handleOtherUserUpdate(userId: string): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) return;
      console.log(`[FRIENDS] Handling update for user ${userId}`);
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
      if (App.me?.friends) {
        const friendIndex = App.me.friends.findIndex((f: UserPublic) => f.id === userId);
        if (friendIndex !== -1) {
          App.me.friends[friendIndex] = updatedUser;
          sessionStorage.setItem('currentUser', JSON.stringify(App.me));
        }
      }
      if (App.onlineUsers.has(userId)) {
        App.onlineUsers.set(userId, updatedUser);
      }
      this.display();
    } catch (error) {
      console.error(`[FRIENDS] Error handling user update for ${userId}:`, error);
    }
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
      this.loadSearch();
    });
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.loadSearch();
      }
    });
  },

  async loadSearch(): Promise<void> {
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    const query = searchInput?.value.trim() || '';
    let   users: UserPublic[] | undefined;
    if (query) {
      try {
        const token = sessionStorage.getItem('authToken');
        if (!token) {
          console.log('[FRIENDS] Fail to  get token');
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
        users = await response.json() as UserPublic[];
      } catch (error) {
        console.error('[FRIENDS] Search error:', error);
        console.log('Error searching users');
      }
    } else {
      users = Array.from(App.onlineUsers.values());
    }
    this.displaySearchResults(users);
  },

  displaySearchResults(users: UserPublic[] | undefined): void {
    const resultsContainer = document.getElementById('search-results');
    const resultsList = document.getElementById('search-results-list');

    if (!resultsContainer || !resultsList || !users) return;

    const filteredUsers = users
      .filter(user => user.id !== App.me?.id)
      .filter(user => !App.me?.friends?.some(friend => friend.id === user.id));
    if (filteredUsers.length === 0) {
      resultsList.innerHTML = '<p class="text-neutral-500 text-center py-4">Aucun utilisateur trouvé</p>';
      resultsContainer.classList.remove('hidden');
      return;
    }
    resultsList.innerHTML = filteredUsers.map(user => this.createSearchUserCard(user)).join('');
    this.attachSearchActionListeners();
    resultsContainer.classList.remove('hidden');
  },

  createSearchUserCard(user: UserPublic): string {
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
    const isOnline = App.onlineUsers.has(user.id);
    const onlineStatus = isOnline ? 'online' : 'offline';
    const statusColor = isOnline ? 'bg-green-500' : 'bg-neutral-500';
    const card = `
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
          <button class="add_friend px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition" data-user-id="${user.id}">
            <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add
          </button>
        </div>
      </div>
    `;
    return card;
  },

  createFriendUserCard(user: UserPublic): string {
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
    const isOnline = App.onlineUsers.has(user.id);
    const statusColor = isOnline ? 'bg-green-500' : 'bg-neutral-500';
    const statusText = isOnline ? 'online' : 'offline';
   const card =  `
      <div class="flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-750 transition" data-user-id="${user.id}">
        <div class="flex items-center gap-3">
          <div class="relative">
            <img src="${avatar}" alt="${user.name}" class="w-12 h-12 rounded-full object-cover">
            <span class="status-dot absolute bottom-0 right-0 w-3 h-3 ${statusColor} border-2 border-neutral-800 rounded-full"></span>
          </div>
          <div>
            <p class="font-semibold text-white">${user.name || 'Unknown'}</p>
            <p class="status-text text-sm text-neutral-400">${statusText}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="chat_friend px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition" data-user-id="${user.id}">
            <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 21l1.8-4A7.97 7.97 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            chat
          </button>
          <button class="remove_friend px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition" data-user-id="${user.id}">
            <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            </button>
        </div>
      </div>
    `;
    return card;
  },

  attachSearchActionListeners(): void {
    document.querySelectorAll('.add_friend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target_id = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (target_id) await this.addFriend(target_id);
      });
    });
  },

  attachFriendActionListeners(): void {
    document.querySelectorAll('.chat_friend').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (userId) {
          console.log('[FRIENDS] View profile for user:', userId);
        }
      });
    });

    document.querySelectorAll('.remove_friend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (userId) {
            await this.removeFriend(userId);
        }
      });
    });
  },


  async addFriend(targetId: string): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        console.log('Not authenticated');
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
        console.log(result.message || 'Failed to add friend');
        return;
      }

      const result = await response.json();
      console.log('[FRIENDS] Friend added successfully:', result);
      // The user_update WebSocket event will trigger refreshUserData
    } catch (error) {
      console.error('[FRIENDS] Error adding friend:', error);
      console.log('Error adding friend');
    }
  },

async loadFriends(): Promise<void> {
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
    friendsList.innerHTML = friends.map((friend: UserPublic) => this.createFriendUserCard(friend)).join('');
    this.attachFriendActionListeners();
    
    if (friendsCount) {
      friendsCount.textContent = `${friends.length} ami${friends.length > 1 ? 's' : ''}`;
    }
  },

  async removeFriend(friendId: string): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        console.log('Not authenticated');
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
        console.log(result.message || 'Failed to remove friend');
        return;
      }

      const result = await response.json();
      console.log('[FRIENDS] Friend removed successfully:', result);
      // The user_update WebSocket event will trigger refreshCurrentUserData
    } catch (error) {
      console.error('[FRIENDS] Error removing friend:', error);
      console.log('Error removing friend');
    }
  },
};
