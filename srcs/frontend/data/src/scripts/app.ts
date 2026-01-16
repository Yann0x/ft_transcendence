/* ============================================
   MAIN APP - ft_transcendance
   ============================================ */

import { Intro } from './intro'
import { Router } from './router'
import { AuthModal } from './auth-modal'
import { Social } from './social'
import { socialClient } from './social-client'
import { User, UserPublic } from '../shared/types'
import { I18n } from './i18n'
import { Contrast } from './contrast'
import { PongGame } from '../game'

/**
 * Application principale
 */
const App = {

  appContainer: null as HTMLElement | null,
  me: null as User | null,
  onlineUsers: new Map<string, UserPublic>(),  // userId -> UserPublic
  currentPage: '' as string,

  async init(): Promise<void> {
    console.log('🏓 ft_transcendance - App initialized');

    this.appContainer = document.getElementById('app');

    this.wasIAlreadyLogged();

    // Load auth modal
    await this.loadAuthModal();
    I18n.init();
    Contrast.init();
    I18n.refresh();

    // Load intro animation
    await this.loadIntro();
    Intro.init();

    AuthModal.init();
    AuthModal.onLoginSuccess = (user: User) => this.onLogin(user);
    this.setupAuthButtons();
    I18n.refresh();

    Router.init(this);
  },

  wasIAlreadyLogged(){
    const token = sessionStorage.getItem('authToken');
    const currentUser = sessionStorage.getItem('currentUser')
    if (token && currentUser)
    {
      console.log("[APP] Found stored user : " + JSON.stringify(currentUser));
      this.onLogin(JSON.parse(currentUser));
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
    Contrast.bindControls();

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

      // Settings functionality (placeholder)
      newSettingsButton.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Paramètres utilisateur - À implémenter');
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
  onLogin(user: User): void {
    this.me = user;
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    this.updateNavbar();
    Social.init();
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
