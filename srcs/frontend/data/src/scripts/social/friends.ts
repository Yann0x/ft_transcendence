import { UserPublic } from '../shared/types';
import { App } from '../app';
import { ProfileModal } from '../profile-modal';
import * as SocialCommands from './social-commands';

export const Friends = {

  async display(): Promise <void> {
    await this.displaySearchResults();
    await this.displayFriends();
    this.attachDocumentListeners();
  },

async displayFriends(): Promise<void>
{
    const friendsList = document.getElementById('friends-list');
    const friendsCount = document.getElementById('friends-count');
    const emptyState = document.getElementById('friends-empty-state');

    if (!friendsList || !App.me) {
      return;
    }

    const friends = Array.from(App.friendsMap.values());
    if (friends.length === 0) {
      emptyState?.classList.remove('hidden');
      friendsList.innerHTML = '';
      if (friendsCount) {
        friendsCount.textContent = '0 amis';
      }
      return;
    }
    emptyState?.classList.add('hidden');

    friendsList.innerHTML = friends.map((friend: UserPublic) => this.createFriendUserCard(friend)).join('');
    if (friendsCount) {
      friendsCount.textContent = `${friends.length} ami${friends.length > 1 ? 's' : ''}`;
    }
  },
  
  async displaySearchResults(): Promise<void>
  {
    const resultsContainer = document.getElementById('search-results');
    const resultsList = document.getElementById('search-results-list');

    const users = await this.loadSearch();

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
    resultsContainer.classList.remove('hidden');
  },

  async loadSearch(): Promise<UserPublic[] | undefined>
  {
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    const query = searchInput?.value.trim() || '';
    let   users: UserPublic[] | undefined;
    if (query) {
      try {
        const token = sessionStorage.getItem('authToken');
        if (!token) {
          return [];
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
      }
    } else {
      users = Array.from(App.onlineUsersMap.values());
    }
    return users;
  },

  createSearchUserCard(user: UserPublic): string
  {
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
    const isOnline = App.onlineUsersMap.has(user.id);
    const onlineStatus = isOnline ? 'online' : 'offline';
    const statusColor = isOnline ? 'bg-green-500' : 'bg-neutral-500';
    const card = `
      <div class="list-item flex items-center justify-between" data-user-id="${user.id}">
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
          <button class="add_friend btn btn-sm btn-outline" data-user-id="${user.id}">
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

  createFriendUserCard(user: UserPublic): string
  {
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
    const isOnline = App.onlineUsersMap.has(user.id);
    const statusColor = isOnline ? 'bg-green-500' : 'bg-neutral-500';
    const statusText = isOnline ? 'online' : 'offline';
   const card =  `
      <div class="list-item flex items-center justify-between" data-user-id="${user.id}">
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
          <button class="remove_friend btn btn-sm btn-outline" data-user-id="${user.id}">
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

  attachDocumentListeners(): void
  {
    document.querySelectorAll('.add_friend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target_id = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (target_id) await this.addFriend(target_id);
        await this.display();
      });
    });
    document.querySelectorAll('.remove_friend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (userId) {
            await this.removeFriend(userId);
        this.display();
        }
      });
    });
    document.querySelectorAll('.avatar-clickable').forEach(avatar => {
      avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (userId) {
          ProfileModal.open(userId);
        }
      });
    });
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    const searchBtn = document.getElementById('user-search-btn');
    searchBtn?.addEventListener('click', () => {
      this.display();
    });
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.display();
      }
    });
  },

  async addFriend(targetId: string): Promise<void> {
    try {
      await SocialCommands.addFriend(targetId);
    } catch (error) {
      console.error('[FRIENDS] Error adding friend:', error);
      alert('Error adding friend');
    }
  },

  async removeFriend(friendId: string): Promise<void> {
    try {
      await SocialCommands.removeFriend(friendId);
    } catch (error) {
      console.error('[FRIENDS] Error removing friend:', error);
    }
  },

};
