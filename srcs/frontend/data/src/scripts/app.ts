/* ============================================
   MAIN APP - ft_transcendance
   ============================================ */

import { Intro } from './intro'
import { Router } from './router'
import { AuthModal } from './auth-modal'
import { Friends } from './friends'
import { socialClient } from './social-client'
import { User } from '../shared/types'

/**
 * Application principale
 */
const App = {
  appContainer: null as HTMLElement | null,
  me: null as User | null,

  /**
   * Initialise l'application
   */
  async init(): Promise<void> {
    console.log('🏓 ft_transcendance - App initialized');

    this.appContainer = document.getElementById('app');

    // Check for existing user in sessionStorage
    const savedUser = sessionStorage.getItem('currentUser');
    const savedToken = sessionStorage.getItem('authToken');
    if (savedUser && savedToken) {
      try {
        this.me = JSON.parse(savedUser);
        // Setup social event listeners BEFORE connecting to ensure we catch all events
        console.log('[APP] Setting up social event listeners...');
        Friends.setupSocialEventListeners();
        // Reconnect to social WebSocket if user was already logged in
        console.log('[APP] User already logged in, connecting to social WebSocket...');
        socialClient.connect(savedToken);
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('authToken');
      }
    }

    // Load auth modal
    await this.loadAuthModal();

    // Load intro animation
    await this.loadIntro();
    Intro.init();

    // Initialize auth modal
    setTimeout(() => {
      AuthModal.init();
      // Set callback for login success
      AuthModal.onLoginSuccess = (user: User) => this.onLogin(user);
      this.setupAuthButtons();
    }, 100);

    // Initialize router
    Router.init(this);
  },

  /**
   * Charge la modal d'authentification
   */
  async loadAuthModal(): Promise<void> {
    const authModal = await fetch('/components/auth-modal.html').then(r => r.text());
    document.body.insertAdjacentHTML('beforeend', authModal);
  },

  /**
   * Charge l'animation d'intro
   */
  async loadIntro(): Promise<void> {
    const intro = await fetch('/pages/intro.html').then(r => r.text());
    document.body.insertAdjacentHTML('afterbegin', intro);
  },

  /**
   * Charge un composant HTML
   */
  async loadComponent(name: string): Promise<string> {
    const response = await fetch(`/components/${name}.html`);
    return response.text();
  },

  /**
   * Charge une page
   */
  async loadPage(name: string): Promise<void> {
    if (!this.appContainer) return;

    const [navbar, page, footer] = await Promise.all([
      this.loadComponent('navbar'),
      fetch(`/pages/${name}.html`).then(r => r.text()),
      this.loadComponent('footer')
    ]);

    this.appContainer.innerHTML = navbar + page + footer;
    this.appContainer.classList.add('main-content', 'flex', 'flex-col', 'flex-1');

    // Re-attach auth buttons after page loads
    this.setupAuthButtons();

    // Update navbar to reflect authentication state
    this.updateNavbar();

    // Initialize page-specific scripts
    this.initPageScripts(name);
  },

  /**
   * Initialize page-specific scripts
   */
  initPageScripts(pageName: string): void {
    switch (pageName) {
      case 'friends':
        Friends.init();
        break;
      // Add other page initializations here as needed
      default:
        break;
    }
  },

  /**
   * Setup auth modal buttons
   */
  setupAuthButtons(): void {
    const authButtons = document.querySelectorAll('.btn-outline, .btn-secondary');
    authButtons.forEach(btn => {
      const text = btn.textContent?.trim();
      if (text === 'Connexion') {
        btn.addEventListener('click', () => {
          AuthModal.open();
        });
      } else if (text === 'Inscription') {
        btn.addEventListener('click', () => {
          AuthModal.openSignup();
        });
      }
    });
  },

  /**
   * Update navbar UI based on authentication state
   */
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

    // Connect to social service WebSocket
    const token = sessionStorage.getItem('authToken');
    if (token) {
      // Setup social event listeners BEFORE connecting to ensure we catch all events
      console.log('[APP] Setting up social event listeners...');
      Friends.setupSocialEventListeners();
      console.log('[APP] Connecting to social WebSocket...');
      socialClient.connect(token);
    } else {
      console.error('[APP] No auth token found, cannot connect to social WebSocket');
    }
  },

  /**
   * Handle user logout
   */
  async logout(): Promise<void> {
    if (!this.me?.id) {
      console.warn('No user to logout');
      return;
    }

    // Disconnect from social WebSocket
    console.log('[APP] Disconnecting from social WebSocket...');
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
      // Always clear local state regardless of backend response
      this.me = null;
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
      this.updateNavbar();
      alert('Vous avez été déconnecté');
    }
  }
};

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();

});

export { App };
