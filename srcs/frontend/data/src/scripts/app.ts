/* ============================================
   MAIN APP - ft_transcendance
   ============================================ */

import { Intro } from './intro'

/**
 * Application principale
 */
const App = {
  appContainer: null as HTMLElement | null,

  /**
   * Initialise l'application
   */
  async init(): Promise<void> {
    console.log('🏓 ft_transcendance - App initialized');
    
    this.appContainer = document.getElementById('app');
    
    // Load intro animation
    await this.loadIntro();
    Intro.init();
    
    await this.loadPage('home');
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
  }
};

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();

});

export { App };
