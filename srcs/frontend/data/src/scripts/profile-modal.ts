/* PROFILE MODAL */

import { User } from '../shared/types';
import { App } from './app';
import { Router } from './router';
import * as SocialCommands from './social/social-commands';
import { StatsService } from './stats-service';

/* MODAL */

export const ProfileModal = {
  modal: null as HTMLElement | null,
  currentUserId: null as string | null,

  /* Initialise le modal de profil */
  init(): void {
    this.modal = document.getElementById('profile-modal');

    if (!this.modal) return;

    this.setupCloseListeners();
  },

  /* Configure les boutons de fermeture */
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

  /* Ouvre le modal pour un utilisateur */
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

      await this.populateProfile(user);
      this.setupActionButtons(user);
      this.modal.classList.remove('hidden');

    } catch (error) {
      console.error('[PROFILE] Error opening profile:', error);
    }
  },

  /* Remplit le modal avec les données utilisateur */
  async populateProfile(user: User): Promise<void> {
    const avatarEl = document.getElementById('profile-avatar') as HTMLImageElement;
    const nameEl = document.getElementById('profile-name');
    const statusEl = document.getElementById('profile-status');
    const statusDot = document.getElementById('profile-status-dot');

    if (avatarEl) {
      avatarEl.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
    }

    if (nameEl) {
      nameEl.textContent = user.name || 'Unknown';
    }

    const isOnline = user.id ? App.onlineUsersMap.has(user.id) : false;
    if (statusEl) {
      statusEl.textContent = isOnline ? 'Online' : 'Offline';
      statusEl.className = isOnline ? 'text-sm text-green-400 mt-1' : 'text-sm text-neutral-400 mt-1';
    }
    if (statusDot) {
      statusDot.className = isOnline
        ? 'absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-neutral-900 bg-green-500'
        : 'absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-neutral-900 bg-neutral-500';
    }

    const stats = await StatsService.fetchStats(user.id);
    StatsService.updateProfileStats(stats);
  },

  /* ACTIONS */

  /* Configure les boutons d'action selon la relation */
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

    const blockBtn = document.getElementById('profile-block');
    if (blockBtn) {
      blockBtn.textContent = isBlocked ? 'Unblock' : 'Block';
    }

    this.attachActionListeners(user);
  },

  /* Attache les listeners aux boutons */
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

  /* HANDLERS */

  /* Ajoute un ami */
  async handleAddFriend(user: User): Promise<void> {
    if (!user.id) return;

    try {
      await SocialCommands.addFriend(user.id);
      console.log('[PROFILE] Friend added successfully');

      await this.open(user.id);
    } catch (error) {
      console.error('[PROFILE] Error adding friend:', error);
      alert('Failed to add friend');
    }
  },

  /* Supprime un ami */
  async handleRemoveFriend(user: User): Promise<void> {
    if (!user.id) return;

    try {
      await SocialCommands.removeFriend(user.id);
      console.log('[PROFILE] Friend removed successfully');

      await this.open(user.id);
    } catch (error) {
      console.error('[PROFILE] Error removing friend:', error);
      alert('Failed to remove friend');
    }
  },

  /* Envoie un message */
  async handleMessage(user: User): Promise<void> {
    if (!user.id) return;

    try {
      const token = sessionStorage.getItem('authToken');

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

        sessionStorage.setItem('pendingChannelId', channel.id);

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

  /* Bloque ou débloque un utilisateur */
  async handleBlock(user: User): Promise<void> {
    if (!user.id) return;

    const isBlocked = App.isUserBlocked(user.id);
    console.log('HandleBlock() isBlocked: ' + JSON.stringify(isBlocked) + "Attempt to block "  + JSON.stringify(user) + " App.Blockeds : " +  JSON.stringify(App.blockedUsersMap));

    const confirmed = confirm(
      isBlocked
        ? `Do you really want to unblock ${user.name || 'this user'}?`
        : `Do you really want to block ${user.name || 'this user'}?`
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

      // Update the block button text immediately
      const blockBtn = document.getElementById('profile-block');
      if (blockBtn) {
        const nowBlocked = App.isUserBlocked(user.id);
        blockBtn.textContent = nowBlocked ? 'Unblock' : 'Block';
      }

      // Also refresh friend buttons since blocking removes friend
      const addFriendBtn = document.getElementById('profile-add-friend');
      const removeFriendBtn = document.getElementById('profile-remove-friend');
      const isFriend = user.id ? App.isFriend(user.id) : false;
      
      if (addFriendBtn && removeFriendBtn) {
        if (isFriend) {
          addFriendBtn.classList.add('hidden');
          removeFriendBtn.classList.remove('hidden');
        } else {
          addFriendBtn.classList.remove('hidden');
          removeFriendBtn.classList.add('hidden');
        }
      }
    } catch (error) {
      console.error('[PROFILE] Error blocking/unblocking user:', error);
      alert(`Failed to ${isBlocked ? 'unblock' : 'block'} user`);
    }
  },

  /* HELPERS */

  /* Rafraîchit les données de l'utilisateur courant */
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

  /* Ferme le modal */
  close(): void {
    this.modal?.classList.add('hidden');
    this.currentUserId = null;
  }
};
