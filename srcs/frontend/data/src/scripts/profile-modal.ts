/* ============================================
   PROFILE MODAL - User Profile Display
   ============================================ */

import { User } from '../shared/types';
import { App } from './app';
import { Router } from './router';
import * as SocialCommands from './social/social-commands';

export const ProfileModal = {
  modal: null as HTMLElement | null,
  currentUserId: null as string | null,

  /**
   * Initialize the profile modal
   */
  init(): void {
    this.modal = document.getElementById('profile-modal');

    if (!this.modal) return;

    this.setupCloseListeners();
  },

  /**
   * Setup close button and background click
   */
  setupCloseListeners(): void {
    const closeBtn = document.getElementById('profile-modal-close');
    closeBtn?.addEventListener('click', () => {
      this.close();
    });

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  },

  /**
   * Open the modal and display user profile
   */
  async open(userId: string): Promise<void> {
    if (!this.modal) {
      console.error('[PROFILE] Modal element not found');
      return;
    }

    this.currentUserId = userId;

    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        console.error('[PROFILE] No auth token');
        return;
      }

      // Fetch user data
      const response = await fetch(`/user/find?id=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.error('[PROFILE] Failed to fetch user data');
        return;
      }

      const users = await response.json();
      if (!users || users.length === 0) {
        console.error('[PROFILE] User not found');
        return;
      }

      const user = users[0] as User;

      // Populate and show modal
      this.populateProfile(user);
      this.setupActionButtons(user);
      this.modal.classList.remove('hidden');

    } catch (error) {
      console.error('[PROFILE] Error opening profile:', error);
    }
  },

  /**
   * Populate modal with user data
   */
  populateProfile(user: User): void {
    const avatarEl = document.getElementById('profile-avatar') as HTMLImageElement;
    const nameEl = document.getElementById('profile-name');
    const statusEl = document.getElementById('profile-status');
    const statusDot = document.getElementById('profile-status-dot');

    const gamesPlayedEl = document.getElementById('profile-games-played');
    const winRateEl = document.getElementById('profile-win-rate');
    const gamesWonEl = document.getElementById('profile-games-won');
    const gamesLostEl = document.getElementById('profile-games-lost');

    // Set avatar
    if (avatarEl) {
      avatarEl.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
    }

    // Set name
    if (nameEl) {
      nameEl.textContent = user.name || 'Unknown';
    }

    // Set online status
    const isOnline = user.id ? App.onlineUsersMap.has(user.id) : false;
    if (statusEl) {
      statusEl.textContent = isOnline ? 'En ligne' : 'Hors ligne';
      statusEl.className = isOnline ? 'text-sm text-green-400 mt-1' : 'text-sm text-neutral-400 mt-1';
    }
    if (statusDot) {
      statusDot.className = isOnline
        ? 'absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-neutral-900 bg-green-500'
        : 'absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-neutral-900 bg-neutral-500';
    }

    // Set stats
    const stats = user.stats;
    if (gamesPlayedEl) {
      gamesPlayedEl.textContent = String(stats?.games_played ?? 0);
    }
    if (winRateEl) {
      winRateEl.textContent = `${Math.round(stats?.win_rate ?? 0)}%`;
    }
    if (gamesWonEl) {
      gamesWonEl.textContent = String(stats?.games_won ?? 0);
    }
    if (gamesLostEl) {
      gamesLostEl.textContent = String(stats?.games_lost ?? 0);
    }
  },

  /**
   * Setup action buttons based on relationship with user
   */
  setupActionButtons(user: User): void {
    const actionsContainer = document.getElementById('profile-actions');
    const addFriendBtn = document.getElementById('profile-add-friend');
    const removeFriendBtn = document.getElementById('profile-remove-friend');

    if (!actionsContainer) return;

    const isOwnProfile = user.id === App.me?.id;
    if (isOwnProfile) {
      actionsContainer.classList.add('hidden');
      return;
    }

    actionsContainer.classList.remove('hidden');

    const isFriend = user.id ? App.isFriend(user.id) : false;
    const isBlocked = user.id ? App.isUserBlocked(user.id) : false;

    if (addFriendBtn && removeFriendBtn) {
      if (isFriend) {
        addFriendBtn.classList.add('hidden');
        removeFriendBtn.classList.remove('hidden');
      } else {
        addFriendBtn.classList.remove('hidden');
        removeFriendBtn.classList.add('hidden');
      }
    }

    // Update block button text
    const blockBtn = document.getElementById('profile-block');
    if (blockBtn) {
      blockBtn.textContent = isBlocked ? 'Débloquer' : 'Bloquer';
    }

    this.attachActionListeners(user);
  },

  attachActionListeners(user: User): void {
    const addFriendBtn = document.getElementById('profile-add-friend');
    const removeFriendBtn = document.getElementById('profile-remove-friend');
    const messageBtn = document.getElementById('profile-message');
    const blockBtn = document.getElementById('profile-block');

    if (addFriendBtn) {
      const newAddBtn = addFriendBtn.cloneNode(true) as HTMLElement;
      addFriendBtn.parentNode?.replaceChild(newAddBtn, addFriendBtn);
      newAddBtn.addEventListener('click', () => this.handleAddFriend(user));
    }

    if (removeFriendBtn) {
      const newRemoveBtn = removeFriendBtn.cloneNode(true) as HTMLElement;
      removeFriendBtn.parentNode?.replaceChild(newRemoveBtn, removeFriendBtn);
      newRemoveBtn.addEventListener('click', () => this.handleRemoveFriend(user));
    }

    if (messageBtn) {
      const newMsgBtn = messageBtn.cloneNode(true) as HTMLElement;
      messageBtn.parentNode?.replaceChild(newMsgBtn, messageBtn);
      newMsgBtn.addEventListener('click', () => this.handleMessage(user));
    }

    if (blockBtn) {
      const newBlockBtn = blockBtn.cloneNode(true) as HTMLElement;
      blockBtn.parentNode?.replaceChild(newBlockBtn, blockBtn);
      newBlockBtn.addEventListener('click', () => this.handleBlock(user));
    }
  },

  async handleAddFriend(user: User): Promise<void> {
    if (!user.id) return;

    try {
      await SocialCommands.addFriend(user.id);
      console.log('[PROFILE] Friend added successfully');

      // Refresh the modal to update button state
      await this.open(user.id);
    } catch (error) {
      console.error('[PROFILE] Error adding friend:', error);
      alert('Failed to add friend');
    }
  },

  /**
   * Handle remove friend action
   */
  async handleRemoveFriend(user: User): Promise<void> {
    if (!user.id) return;

    try {
      await SocialCommands.removeFriend(user.id);
      console.log('[PROFILE] Friend removed successfully');

      // Refresh the modal to update button state
      await this.open(user.id);
    } catch (error) {
      console.error('[PROFILE] Error removing friend:', error);
      alert('Failed to remove friend');
    }
  },

  /**
   * Handle send message action
   */
  async handleMessage(user: User): Promise<void> {
    if (!user.id) return;

    try {
      const token = sessionStorage.getItem('authToken');

      // Create or get DM channel
      const response = await fetch('/user/channel/create-dm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        const channel = await response.json();
        this.close();

        // Store channel ID for loading after navigation
        sessionStorage.setItem('pendingChannelId', channel.id);

        // Navigate to social hub
        if (window.location.pathname !== '/social_hub' && window.location.pathname !== '/social_hub/') {
          Router.navigate('social_hub');
        } else {
          sessionStorage.removeItem('pendingChannelId');
        }
      } else {
        console.error('[PROFILE] Failed to create DM channel');
      }
    } catch (error) {
      console.error('[PROFILE] Error sending message:', error);
    }
  },

  async handleBlock(user: User): Promise<void> {
    if (!user.id) return;

    const isBlocked = App.isUserBlocked(user.id);
    console.log('HandleBlock() isBlocked: ' + JSON.stringify(isBlocked) + "Attempt to block "  + JSON.stringify(user) + " App.Blockeds : " +  JSON.stringify(App.blockedUsersMap));

    const confirmed = confirm(
      isBlocked
        ? `Voulez-vous vraiment débloquer ${user.name || 'cet utilisateur'} ?`
        : `Voulez-vous vraiment bloquer ${user.name || 'cet utilisateur'} ?`
    );
    if (!confirmed) return;

    try {
      if (isBlocked) {
        await SocialCommands.unblockUser(user.id);
        App.removeFromBlockedUsersMap(user.id);
        console.log('[PROFILE] User unblocked successfully');
      } else {
        await SocialCommands.blockUser(user.id);
        App.addToBlockedUsersMap(user);
        console.log('[PROFILE] User blocked successfully');
      }

      await this.open(user.id);
    } catch (error) {
      console.error('[PROFILE] Error blocking/unblocking user:', error);
      alert(`Failed to ${isBlocked ? 'unblock' : 'block'} user`);
    }
  },

  /**
   * Refresh current user data from API
   */
  async refreshCurrentUserData(): Promise<void> {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token || !App.me?.id) return;

      const response = await fetch(`/user/find?id=${App.me.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const users = await response.json();
        if (users && users.length > 0) {
          App.me = users[0];
          sessionStorage.setItem('currentUser', JSON.stringify(App.me));
        }
      }
    } catch (error) {
      console.error('[PROFILE] Error refreshing user data:', error);
    }
  },

  close(): void {
    this.modal?.classList.add('hidden');
    this.currentUserId = null;
  }
};
