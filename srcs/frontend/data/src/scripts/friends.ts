import { UserPublic, SocialEvent } from '../shared/types';
import { socialClient } from './social-client';
import { Router } from './router';
import { App } from './app';
import { Chat } from './chat';
import { ProfileModal } from './profile-modal';

export const Friends = {

  init(): void {
    const token = sessionStorage.getItem('authToken');
    if (!App.me || !token) {
      console.log('Vous devez être connecté pour accéder à cette page');
      Router.navigate('home')
      return;
    }
    // When used standalone (not via Social wrapper)
    this.setupSearchListeners();
    socialClient.connect(token);
    this.display();
  },


  display(): void {
    const token = sessionStorage.getItem('authToken');
    if (!App.me || !token) {
      alert('Vous devez être connecté pour accéder à cette page');
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
    this.displayFriends();
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

async displayFriends(): Promise<void> {
    const friendsList = document.getElementById('friends-list');
    const friendsCount = document.getElementById('friends-count');
    const emptyState = document.getElementById('friends-empty-state');

    if (!friendsList || !App.me) {
      return;
    }

    const friends = Array.from(App.friendsMap.values());
    if (friends.length === 0) {
      console.log('[FRIENDS] No friends to display');
      emptyState?.classList.remove('hidden');
      friendsList.innerHTML = '';
      if (friendsCount) {
        friendsCount.textContent = '0 amis';
      }
      return;
    }
    console.log('[FRIENDS] Rendering', friends.length, 'friends');
    emptyState?.classList.add('hidden');

    friendsList.innerHTML = friends.map((friend: UserPublic) => this.createFriendUserCard(friend)).join('');
    this.attachFriendActionListeners();
    if (friendsCount) {
      friendsCount.textContent = `${friends.length} ami${friends.length > 1 ? 's' : ''}`;
    }
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
      users = Array.from(App.onlineUsersMap.values());
    }
    this.displaySearchResults(users);
  },

  displaySearchResults(users: UserPublic[] | undefined): void {
    const resultsContainer = document.getElementById('search-results');
    const resultsList = document.getElementById('search-results-list');

    if (!resultsContainer || !resultsList || !users) return;

    const filteredUsers = users
      .filter(user => user.id !== App.me?.id)
      .filter(user => !user.id || !App.isFriend(user.id))
      .filter(user => !user.id || !App.isUserBlocked(user.id));
    if (filteredUsers.length === 0) {
      resultsList.innerHTML = '<p class="text-neutral-500 text-center py-4">Aucun utilisateur trouvé</p>';
      resultsContainer.classList.remove('hidden');
      return;
    }
    resultsList.innerHTML = filteredUsers.map(user => this.createSearchUserCard(user)).join('');
    this.attachSearchActionListeners();
    resultsContainer.classList.remove('hidden');
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

  createSearchUserCard(user: UserPublic): string {
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
    const isOnline = App.onlineUsersMap.has(user.id);
    const onlineStatus = isOnline ? 'online' : 'offline';
    const statusColor = isOnline ? 'bg-green-500' : 'bg-neutral-500';
    const card = `
      <div class="flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-750 transition" data-user-id="${user.id}">
        <div class="flex items-center gap-3">
          <div class="relative avatar-clickable cursor-pointer" data-user-id="${user.id}">
            <img src="${avatar}" alt="${user.name}" class="w-12 h-12 rounded-full object-cover hover:ring-2 hover:ring-blue-500 transition">
            <span class="status-dot absolute bottom-0 right-0 w-3 h-3 ${statusColor} border-2 border-neutral-800 rounded-full"></span>
          </div>
          <div>
            <p class="font-semibold text-white">${user.name || 'Unknown'}</p>
            <p class="status-text text-sm text-neutral-400">${onlineStatus}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="add_friend px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition" data-user-id="${user.id}">
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
    const isOnline = App.onlineUsersMap.has(user.id);
    const statusColor = isOnline ? 'bg-green-500' : 'bg-neutral-500';
    const statusText = isOnline ? 'online' : 'offline';
   const card =  `
      <div class="flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-750 transition" data-user-id="${user.id}">
        <div class="flex items-center gap-3">
          <div class="relative avatar-clickable cursor-pointer" data-user-id="${user.id}">
            <img src="${avatar}" alt="${user.name}" class="w-12 h-12 rounded-full object-cover hover:ring-2 hover:ring-blue-500 transition">
            <span class="status-dot absolute bottom-0 right-0 w-3 h-3 ${statusColor} border-2 border-neutral-800 rounded-full"></span>
          </div>
          <div>
            <p class="font-semibold text-white">${user.name || 'Unknown'}</p>
            <p class="status-text text-sm text-neutral-400">${statusText}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="remove_friend px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition" data-user-id="${user.id}">
            <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Remove
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
    this.attachAvatarClickListeners();
  },

  attachFriendActionListeners(): void {
    document.querySelectorAll('.remove_friend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (userId) {
            await this.removeFriend(userId);
        }
      });
    });
    this.attachAvatarClickListeners();
  },

  attachAvatarClickListeners(): void {
    document.querySelectorAll('.avatar-clickable').forEach(avatar => {
      avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (userId) {
          ProfileModal.open(userId);
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

      console.log('[FRIENDS] Adding friend:', targetId);
      const response = await fetch('/user/addFriend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId: targetId })
      });

      console.log('[FRIENDS] Add friend response status:', response.status);

      if (!response.ok) {
        const result = await response.json();
        console.error('[FRIENDS] Failed to add friend:', result);
        alert(result.message || 'Failed to add friend');
        return;
      }

      const result = await response.json();
      console.log('[FRIENDS] Friend added successfully:', result);

      // Update App maps if friend data is returned
      if (result && result.id) {
        App.addFriendToMaps(result as UserPublic);
        this.display();
      }
    } catch (error) {
      console.error('[FRIENDS] Error adding friend:', error);
      alert('Error adding friend');
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

      // Update App maps
      App.removeFriendFromMaps(friendId);
      this.display();
    } catch (error) {
      console.error('[FRIENDS] Error removing friend:', error);
      console.log('Error removing friend');
    }
  },

};
