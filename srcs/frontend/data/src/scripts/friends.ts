/* ============================================
   FRIENDS - Friends Page Management with Real-Time Updates
   ============================================ */

import { User, UserPublic, SocialEvent } from '../shared/types';
import { socialClient } from './social-client';

export const Friends = {
  currentUser: null as User | null,

  /**
   * Initialize the friends page
   */
  init(currentUser: User | null): void {
    this.currentUser = currentUser;

    if (!this.currentUser) {
      alert('Vous devez être connecté pour accéder à cette page');
      return;
    }

    // WebSocket connection is managed globally by App
    // Just setup event listeners for this page
    this.setupSearchListeners();
    this.setupSocialEventListeners();

    // Load initial data
    this.loadFriends();
    this.loadPendingRequests();
    this.searchUsers(); // Load all users initially
  },

  /**
   * Setup WebSocket event listeners
   */
  setupSocialEventListeners(): void {
    // Friend request REQUESTd
    socialClient.on('friend_request_REQUESTd', (event: SocialEvent) => {
      console.log('[FRIENDS] Friend request REQUESTd:', event.data);
      // Reload pending requests to show new request
      this.loadFriends();
      this.loadPendingRequests();
    });

    // Friend request accepted
    socialClient.on('friend_request_accepted', (event: SocialEvent) => {
      console.log('[FRIENDS] Friend request accepted:', event.data);
      // Reload friends and pending requests
      this.loadFriends();
      this.loadPendingRequests();
    });

    // Friend request rejected
    socialClient.on('friend_request_rejected', (event: SocialEvent) => {
      console.log('[FRIENDS] Friend request rejected:', event.data);
      this.loadPendingRequests();
    });

    // Friend removed
    socialClient.on('friend_removed', (event: SocialEvent) => {
      console.log('[FRIENDS] Friend removed:', event.data);
      this.loadFriends();
      this.loadPendingRequests();
    });

    // User online
    socialClient.on('user_online', (event: SocialEvent) => {
      console.log('[FRIENDS] User came online:', event.data);
      this.updateUserOnlineStatus(event.data.userId, 'online');
    });

    // User offline
    socialClient.on('user_offline', (event: SocialEvent) => {
      console.log('[FRIENDS] User went offline:', event.data);
      this.updateUserOnlineStatus(event.data.userId, 'offline');
    });
  },

  /**
   * Update a user's online status in the UI
   */
  updateUserOnlineStatus(userId: string, status: 'online' | 'offline'): void {
    // Update all instances of this user in the UI
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

  /**
   * Setup search functionality
   */
  setupSearchListeners(): void {
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    const searchBtn = document.getElementById('user-search-btn');

    // Search on button click
    searchBtn?.addEventListener('click', () => {
      this.searchUsers();
    });

    // Search on Enter key
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchUsers();
      }
    });
  },

  /**
   * Search for users
   */
  async searchUsers(): Promise<void> {
    const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
    const query = searchInput?.value.trim() || '';

    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        alert('Non authentifié');
        return;
      }

      // Search by name
      const url = query
        ? `/user/find?name=${encodeURIComponent(query)}`
        : `/user/find?name=`; // Empty name returns all users

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

  /**
   * Display search results
   */
  displaySearchResults(users: UserPublic[]): void {
    const resultsContainer = document.getElementById('search-results');
    const resultsList = document.getElementById('search-results-list');

    if (!resultsContainer || !resultsList) return;

    // Filter out current user
    const filteredUsers = users.filter(user => user.id !== this.currentUser?.id);

    if (filteredUsers.length === 0) {
      resultsList.innerHTML = '<p class="text-neutral-500 text-center py-4">Aucun utilisateur trouvé</p>';
      resultsContainer.classList.remove('hidden');
      return;
    }

    resultsList.innerHTML = filteredUsers.map(user => this.createUserCard(user, 'search')).join('');
    resultsContainer.classList.remove('hidden');

    // Attach action listeners
    this.attachActionListeners();
  },

  /**
   * Load pending friend requests
   */
  async loadPendingRequests(): Promise<void> {
    const pendingSection = document.getElementById('pending-requests-section');
    const pendingList = document.getElementById('pending-requests-list');
    const pendingCount = document.getElementById('pending-count');

    if (!pendingList || !this.currentUser) return;

    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) return;

      // Get friends from social service
      const response = await fetch(`/social/friends?user_id=${this.currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load friends');
      }

      const allFriends = await response.json() as Array<any>;

      // Filter pending requests
      const pendingRequests = allFriends.filter((f: any) => f.status === 'pending');

      if (pendingRequests.length === 0) {
        pendingSection?.classList.add('hidden');
        return;
      }

      pendingSection?.classList.remove('hidden');

      // Separate sent and REQUESTd requests
      const sentRequests = pendingRequests.filter((f: any) => f.initiated_by === this.currentUser?.id);
      const REQUESTdRequests = pendingRequests.filter((f: any) => f.initiated_by !== this.currentUser?.id);

      let html = '';

      if (REQUESTdRequests.length > 0) {
        html += '<h4 class="text-sm font-semibold text-blue-400 mb-2">Invitations reçues</h4>';
        html += REQUESTdRequests.map(friend => this.createUserCard(friend, 'pending-REQUESTd')).join('');
      }

      if (sentRequests.length > 0) {
        if (REQUESTdRequests.length > 0) html += '<div class="h-4"></div>';
        html += '<h4 class="text-sm font-semibold text-neutral-400 mb-2">Invitations envoyées</h4>';
        html += sentRequests.map(friend => this.createUserCard(friend, 'pending-sent')).join('');
      }

      pendingList.innerHTML = html;

      if (pendingCount) {
        pendingCount.textContent = `${pendingRequests.length} invitation${pendingRequests.length > 1 ? 's' : ''}`;
      }

      // Attach action listeners
      this.attachActionListeners();

    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  },

  /**
   * Load user's friends
   */
  async loadFriends(): Promise<void> {
    const friendsList = document.getElementById('friends-list');
    const friendsCount = document.getElementById('friends-count');
    const emptyState = document.getElementById('friends-empty-state');

    if (!friendsList || !this.currentUser) return;

    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) return;

      // Get friends from social service
      const response = await fetch(`/social/friends?user_id=${this.currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load friends');
      }

      const allFriends = await response.json() as Array<any>;

      // Only show accepted friends
      const friends = allFriends.filter((f: any) => f.status === 'accepted');

      if (friends.length === 0) {
        emptyState?.classList.remove('hidden');
        if (friendsCount) {
          friendsCount.textContent = '0 amis';
        }
        return;
      }

      emptyState?.classList.add('hidden');
      friendsList.innerHTML = friends.map(friend => this.createUserCard(friend, 'friend')).join('');

      if (friendsCount) {
        friendsCount.textContent = `${friends.length} ami${friends.length > 1 ? 's' : ''}`;
      }

      // Attach action listeners
      this.attachActionListeners();

    } catch (error) {
      console.error('Error loading friends:', error);
    }
  },

  /**
   * Create a user card HTML
   */
  createUserCard(user: any, type: 'search' | 'friend' | 'pending-REQUESTd' | 'pending-sent'): string {
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
    const onlineStatus = user.onlineStatus || 'offline';
    const statusColor = onlineStatus === 'online' ? 'bg-green-500' : 'bg-neutral-500';

    let actionButton = '';

    if (type === 'search') {
      actionButton = `
        <button class="add-friend-btn px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition" data-user-id="${user.id}">
          <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Ajouter
        </button>
      `;
    } else if (type === 'friend') {
      actionButton = `
        <button class="remove-friend-btn px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition" data-user-id="${user.id}">
          <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          Retirer
        </button>
      `;
    } else if (type === 'pending-REQUESTd') {
      actionButton = `
        <button class="accept-friend-btn px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition mr-2" data-user-id="${user.id}">
          <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Accepter
        </button>
        <button class="reject-friend-btn px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition" data-user-id="${user.id}">
          <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          Rejeter
        </button>
      `;
    } else if (type === 'pending-sent') {
      actionButton = `
        <button class="cancel-friend-btn px-4 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition" data-user-id="${user.id}">
          <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          Annuler
        </button>
      `;
    }

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

  /**
   * Attach action listeners to buttons
   */
  attachActionListeners(): void {
    // Add friend
    document.querySelectorAll('.add-friend-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const friendId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (friendId) await this.sendFriendRequest(friendId);
      });
    });

    // Accept friend
    document.querySelectorAll('.accept-friend-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const friendId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (friendId) await this.acceptFriendRequest(friendId);
      });
    });

    // Reject/Cancel/Remove friend
    document.querySelectorAll('.reject-friend-btn, .cancel-friend-btn, .remove-friend-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const friendId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
        if (friendId && confirm('Êtes-vous sûr ?')) {
          await this.removeFriend(friendId);
        }
      });
    });
  },

  /**
   * Send friend request
   */
  async sendFriendRequest(friendId: string): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token || !this.currentUser) {
        alert('Non authentifié');
        return;
      }

      const response = await fetch('/social/friend/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: this.currentUser.id,
          friend_id: friendId
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de la demande');
      }

      alert('Demande d\'ami envoyée !');
      this.loadPendingRequests();

    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Erreur lors de l\'envoi de la demande d\'ami');
    }
  },

  /**
   * Accept friend request
   */
  async acceptFriendRequest(friendId: string): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token || !this.currentUser) {
        alert('Non authentifié');
        return;
      }

      const response = await fetch('/social/friend/accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: this.currentUser.id,
          friend_id: friendId
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'acceptation');
      }

      alert('Invitation acceptée !');
      // Real-time updates will handle UI refresh via WebSocket events

    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Erreur lors de l\'acceptation de l\'invitation');
    }
  },

  /**
   * Remove friend
   */
  async removeFriend(friendId: string): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token || !this.currentUser) {
        alert('Non authentifié');
        return;
      }

      const response = await fetch('/social/friend/remove', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: this.currentUser.id,
          friend_id: friendId
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      alert('Ami retiré avec succès !');
      // Real-time updates will handle UI refresh via WebSocket events

    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Erreur lors de la suppression de l\'ami');
    }
  }
};
