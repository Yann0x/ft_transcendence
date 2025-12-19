/* ============================================
   MAIN APP - ft_transcendance
   ============================================ */

import { Intro } from './intro'
import { Router } from './router'
import { AuthModal } from './auth-modal'
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
    
    // Load auth modal
    await this.loadAuthModal();
    
    // Load intro animation
    await this.loadIntro();
    Intro.init();
    
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
  }
};

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();

});

export { App };
