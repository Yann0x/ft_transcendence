/* ============================================
   MAIN APP - ft_transcendance
   ============================================ */

import { Intro } from './intro'
import { Router } from './router'
import { AuthModal } from './auth-modal'
import { I18n } from './i18n'
import { Contrast } from './contrast'
import { PongGame } from '../game'

/**
 * Application principale
 */
const App = {
  appContainer: null as HTMLElement | null,
  me: null as { id: string; username: string } | null,

  /**
   * Initialise l'application
   */
  async init(): Promise<void> {
    console.log('🏓 ft_transcendance - App initialized');

    this.appContainer = document.getElementById('app');

    I18n.init();
    Contrast.init();

    // Load auth modal
    await this.loadAuthModal();
    I18n.refresh();

    // Load intro animation
    await this.loadIntro();
    Intro.init();
    I18n.refresh();

    // Initialize auth modal
    setTimeout(() => {
      AuthModal.init();
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
    I18n.refresh();
    Contrast.bindControls();

    // Initialise le jeu Pong si on est sur la page home
    if (name === 'home') {
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        PongGame.init(gameContainer);
      }
    }
  },

  /**
   * Setup auth modal buttons
   */
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
  }
};

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();

});

export { App };
