/* ============================================
   MAIN APP - ft_transcendance
   ============================================ */

import { Intro } from './intro'
import { Router } from './router'
import { AuthModal } from './auth-modal'
import { SettingsModal, setAppInstance } from './settings-modal'
import { ProfileModal } from './profile-modal'
import { Social } from './social/social'
import { socialClient } from './social/social-client'
import { User, UserPublic, LoginResponse, Channel } from '../shared/types'
import { I18n } from './i18n'
import { Accessibility } from './accessibility'
import { PongGame } from '../game'
import { Tournaments } from './tournaments'

/**
 * Application principale
 */
const App = {

  appContainer: null as HTMLElement | null,
  me: null as User | null,
  cachedUsers: new Map<string, UserPublic>(),      // Central cache of all users
  friendsMap: new Map<string, UserPublic>(),        // Key: friend ID
  blockedUsersMap: new Map<string, UserPublic>(),   // Key: blocked user ID
  onlineUsersMap: new Map<string, UserPublic>(),

  cacheUser(user: UserPublic): void {
    if (!user.id) return;
    const existing = this.cachedUsers.get(user.id);
    if (existing)
      Object.assign(existing, user);
    else
      this.cachedUsers.set(user.id, user);
  },

  async fetchAndCacheUsers(userIds: string[]): Promise<void> {
      const token = sessionStorage.getItem('authToken');
      if (!token || userIds.length === 0) return;

      console.log(`[SOCIAL] Fetching data for ${userIds.length} users ${JSON.stringify(userIds)}`);
      const userFetchPromises = userIds.map(userId =>
          fetch(`/user/find?id=${userId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(res => res.ok ? res.json() : null)
          .then(users => {
              if (users && users.length > 0) {
                  this.cacheUser(users[0]);
              }
          })
          .catch(err => console.error(`[SOCIAL] Failed to fetch user ${userId}:`, err))
      );

      await Promise.all(userFetchPromises);
  },

  cacheUsers(users: UserPublic[]): void {
    users.forEach(user => this.cacheUser(user));
  },

  async loadFriends(): Promise<void> {
    try {
      const response = await fetch('/user/getFriends', {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) {
        console.error('[App] Failed to load friends');
        return;
      }
      const friends: UserPublic[] = await response.json();
      this.cacheUsers(friends);
      this.friendsMap.clear();
      friends.forEach(friend => {
        if (friend.id) {
          const cachedFriend = this.cachedUsers.get(friend.id);
          if (cachedFriend) {
            this.friendsMap.set(friend.id, cachedFriend);
          }
          else {
            console.log('Something went wrong in App.loadFriends()');
          }
        }
      });

      console.log(`[App] Loaded ${friends.length} friends`);
    } catch (error) {
      console.error('[App] Failed to load friends:', error);
    }
  },

  async loadBlockedUsers(): Promise<void> {
    try {
      const response = await fetch('/user/blocked', {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        console.error('[App] Failed to load blocked users');
        return;
      }

      const blocked: string[] = await response.json();

      const blockedToFetch = blocked.filter(b => !App.cachedUsers.has(b));
      await this.fetchAndCacheUsers(blockedToFetch);

      this.blockedUsersMap.clear();
      blocked.forEach(enemy => {
        if (enemy) {
          const cachedBlocked = this.cachedUsers.get(enemy);
          if (cachedBlocked) {
            this.blockedUsersMap.set(enemy, cachedBlocked);
          }
          else {
            console.log('Something went wrong in App.loadBlockedUsers()');
          }
        }
      });

      console.log(`[App] Loaded ${blocked.length} blocked users, map size: ${this.blockedUsersMap.size}`, Array.from(this.blockedUsersMap.entries()).map(([id, user]) => ({ id, name: user.name })));
    } catch (error) {
      console.error('[App] Failed to load blockeds:', error);
    }

  },

  isFriend(userId: string): boolean {
    return this.friendsMap.has(userId);
  },

  isUserBlocked(userId: string): boolean {
    return this.blockedUsersMap.has(userId);
  },

  addToFriendsMap(friend: UserPublic): void {
    if (!friend.id) return;
    this.cacheUser(friend);
    const cachedFriend = this.cachedUsers.get(friend.id);
    if (cachedFriend) {
      this.friendsMap.set(friend.id, cachedFriend);
    }
  },

  removeFromFriendsMap(friendId: string): void {
    this.friendsMap.delete(friendId);
  },

  addToBlockedUsersMap(user: UserPublic): void {
    if (!user.id) return;
    this.cacheUser(user);
    const cachedUser = this.cachedUsers.get(user.id);
    if (cachedUser) {
      this.blockedUsersMap.set(user.id, cachedUser);
    }
    this.friendsMap.delete(user.id);
  },

  removeFromBlockedUsersMap(userId: string): void {
    this.blockedUsersMap.delete(userId);
  },

  addToOnlineUsersMap(user: UserPublic): void {
    if (!user.id) return;
    this.cacheUser(user);
    const cachedUser = this.cachedUsers.get(user.id);
    if (cachedUser) {
      this.onlineUsersMap.set(user.id, cachedUser);
    }
  },

  removeFromOnlineUsersMap(userId: string): void {
    this.onlineUsersMap.delete(userId);
  },


  async refreshUserData(userId: User.id): Promise<void> {
      try {
      const token = sessionStorage.getItem('authToken');
      if (!token || !userId) {
          console.warn('[APP] Cannot refresh: missing token or user ID');
          return;
      }
      console.log('[APP] Refreshing current user data for ID:', userId);
      const response = await fetch(`/user/find?id=${userId}`, {
          headers: {
          'Authorization': `Bearer ${token}`
          }
      });
      if (!response.ok) {
          console.error('[APP] Failed to refresh user data, status:', response.status);
          return;
      }
      const users = await response.json();
      console.log('[APP] Received user data:', users);

      if (users && users.length > 0) {
          const updatedUser = users[0];
          if (this.me?.id === userId)
            Object.assign(this.me, updatedUser);
          else
            this.cacheUser(updatedUser);
      } else {
          console.warn('[APP] No user data received from API');
      }
      } catch (error) {
        console.error('[APP] Error refreshing user data:', error);
      }
  },

  async init(): Promise<void> {
    console.log('🏓 ft_transcendance - App initialized');

    this.appContainer = document.getElementById('app');

    // Check if this is an OAuth callback (token in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthCallback = urlParams.has('token');

    await this.wasIAlreadyLogged();

    // Load auth modal
    await this.loadAuthModal();
    await this.loadSettingsModal();
    await this.loadProfileModal();
    I18n.init();
    Accessibility.init();
    I18n.refresh();

    // Load intro animation (skip if OAuth callback)
    await this.loadIntro();
    if (isOAuthCallback) {
      Intro.hide();
    } else {
      Intro.init();
    }

    AuthModal.init();
    AuthModal.onLoginSuccess = async (loginResponse: LoginResponse) => await this.onLogin(loginResponse);
    this.setupAuthButtons();
    I18n.refresh();

    Router.init(this);
  },

  async wasIAlreadyLogged(): Promise<void> {
    const token = sessionStorage.getItem('authToken');
    const currentUser = sessionStorage.getItem('currentUser')
    if (token && currentUser)
    {
      console.log("[APP] Found stored user : " + JSON.stringify(currentUser));
      // For returning users, we need to load friends and blocked users from API
      // since we don't have the full LoginResponse stored
      this.me = JSON.parse(currentUser);
      Social.init();
    }
    else
    {
      this.me = null;
    }
  },

  async loadAuthModal(): Promise<void> {
    const authModal = await fetch('/components/auth-modal.html').then(r => r.text());
    document.body.insertAdjacentHTML('beforeend', authModal);
  },

  async loadSettingsModal(): Promise<void> {
    const settingsModal = await fetch('/components/settings-modal.html').then(r => r.text());
    document.body.insertAdjacentHTML('beforeend', settingsModal);
    setAppInstance(() => this);
    SettingsModal.init();
  },

  async loadProfileModal(): Promise<void> {
    const profileModal = await fetch('/components/profile-modal.html').then(r => r.text());
    document.body.insertAdjacentHTML('beforeend', profileModal);
    ProfileModal.init();
  },

  async loadIntro(): Promise<void> {
    const intro = await fetch('/pages/intro.html').then(r => r.text());
    document.body.insertAdjacentHTML('afterbegin', intro);
  },

  async loadComponent(name: string): Promise<string> {
    const response = await fetch(`/components/${name}.html`);
    return response.text();
  },

  async loadPage(name: string): Promise<void> {
    if (!this.appContainer) return;

    // Cleanup du jeu si on quitte la page home
    if (this.currentPage === 'home' && name !== 'home') {
      PongGame.cleanup();
    }
    
    // Cleanup des tournois si on quitte la page tournaments
    if (this.currentPage === 'tournaments' && name !== 'tournaments') {
      Tournaments.cleanup();
    }

    const [navbar, page, footer] = await Promise.all([
      this.loadComponent('navbar'),
      fetch(`/pages/${name}.html`).then(r => r.text()),
      this.loadComponent('footer')
    ]);

    this.appContainer.innerHTML = navbar + page + footer;
    this.appContainer.classList.add('main-content', 'flex', 'flex-col', 'flex-1');

    this.setupAuthButtons();
    this.updateNavbar();

    this.runDedicatedScript(name);
    I18n.refresh();
    Accessibility.bindControls();

    // Mettre à jour la page courante
    this.currentPage = name;
  },

  runDedicatedScript(page: string) {
    console.log(`Run script for ${page}`)
    switch (page) {
      case "social_hub":
        Social.load()
        break
      case "home":
        PongGame.init();
        break
      case "tournaments":
        Tournaments.init();
        break
    }
  },

  setupAuthButtons(): void {
    const loginButtons = document.querySelectorAll('[data-auth="login"]');
    loginButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        AuthModal.open();
      });
    });

    const signupButtons = document.querySelectorAll('[data-auth="signup"]');
    signupButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        AuthModal.openSignup();
      });
    });
  },

  updateNavbar(): void {
    const authButtons = document.getElementById('auth-buttons');
    const userSection = document.getElementById('user-account-section');
    const userAvatar = document.getElementById('user-avatar') as HTMLImageElement;
    const userName = document.getElementById('user-name');

    if (this.me) {
      // User is authenticated - show user button
      authButtons?.classList.add('hidden');
      userSection?.classList.remove('hidden');

      // Update user info
      if (userAvatar && this.me.avatar) {
        userAvatar.src = this.me.avatar;
      } else if (userAvatar) {
        // Default avatar if none provided
        userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.me.name || 'User')}&background=3b82f6&color=fff`;
      }

      if (userName && this.me.name) {
        userName.textContent = this.me.name;
      }

      // Setup dropdown toggle
      this.setupUserDropdown();
    } else {
      // User is not authenticated - show login/signup buttons
      authButtons?.classList.remove('hidden');
      userSection?.classList.add('hidden');
    }
  },

  /**
   * Setup user dropdown menu
   */
  setupUserDropdown(): void {
    const accountButton = document.getElementById('user-account-button');
    const dropdown = document.getElementById('user-dropdown');
    const logoutButton = document.getElementById('user-logout');
    const settingsButton = document.getElementById('user-settings');

    // Remove old listeners by cloning (prevents duplicates)
    if (accountButton) {
      const newAccountButton = accountButton.cloneNode(true) as HTMLElement;
      accountButton.parentNode?.replaceChild(newAccountButton, accountButton);

      // Toggle dropdown
      newAccountButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown?.classList.toggle('hidden');
      });
    }

    if (logoutButton) {
      const newLogoutButton = logoutButton.cloneNode(true) as HTMLElement;
      logoutButton.parentNode?.replaceChild(newLogoutButton, logoutButton);

      // Logout functionality
      newLogoutButton.addEventListener('click', () => {
        this.logout();
      });
    }

    if (settingsButton) {
      const newSettingsButton = settingsButton.cloneNode(true) as HTMLElement;
      settingsButton.parentNode?.replaceChild(newSettingsButton, settingsButton);

      // Settings functionality
      newSettingsButton.addEventListener('click', (e) => {
        e.preventDefault();
        SettingsModal.open();
        dropdown?.classList.add('hidden');
      });
    }

    // Prevent dropdown from closing when clicking inside it
    dropdown?.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Close dropdown when clicking outside (single global listener is fine)
    const closeDropdown = () => {
      dropdown?.classList.add('hidden');
    };

    // Remove old listener if exists
    document.removeEventListener('click', closeDropdown);
    document.addEventListener('click', closeDropdown);
  },

  /**
   * Handle user login
   */
  async onLogin(loginResponse: LoginResponse): Promise<void> {
    this.me = loginResponse.user;
    sessionStorage.setItem('currentUser', JSON.stringify(loginResponse.user));

    this.buildMapsFromLoginResponse(loginResponse);

    this.updateNavbar();
    Social.init();
  },

  /**
   * Build cachedUsers, friendsMap, and blockedUsersMap from LoginResponse
   */
  buildMapsFromLoginResponse(loginResponse: LoginResponse): void {
    // Cache all users from the response
    this.cacheUsers(loginResponse.cachedUsers);

    // Build friendsMap using friendIds and references from cachedUsers
    this.friendsMap.clear();
    loginResponse.friendIds.forEach((friendId: string) => {
      const cachedFriend = this.cachedUsers.get(friendId);
      if (cachedFriend) {
        this.friendsMap.set(friendId, cachedFriend);
      }
    });

    // Build blockedUsersMap using blockedIds and references from cachedUsers
    this.blockedUsersMap.clear();
    loginResponse.blockedIds.forEach((blockedId: string) => {
      const cachedUser = this.cachedUsers.get(blockedId);
      if (cachedUser) {
        this.blockedUsersMap.set(blockedId, cachedUser);
      }
    });

    console.log(`[App] Built maps: ${this.friendsMap.size} friends, ${this.blockedUsersMap.size} blocked users`);
  },

  /**
   * Handle user logout
   */
  async logout(): Promise<void> {
    if (!this.me?.id) {
      console.warn('No user to logout');
      return;
    }
    const token = sessionStorage.getItem('authToken')
    if (token)
    {
      await fetch('/user/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.me)
      });
    }
    socialClient.disconnect();
    try {
      // Call backend to remove user from logged-in users
      const response = await fetch('/user/public/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: this.me.id })
      });

      if (!response.ok) {
        console.error('Logout failed on backend:', await response.text());
      }
    } catch (error) {
      console.error('Failed to call logout endpoint:', error);
    } finally {
      this.me = null;
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
      this.updateNavbar();
      alert('Vous avez été déconnecté');
      Router.navigate('home')
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

export { App };