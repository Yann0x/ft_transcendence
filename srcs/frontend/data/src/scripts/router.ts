/* ============================================
   ROUTER - SPA Navigation System
   ============================================ */

export interface Route {
  path: string;
  page: string;
}

/**
 * Gestionnaire de navigation SPA
 */
const Router = {
  routes: [
    { path: '/play', page: 'home' },
    { path: '/stats', page: 'stats' },
    { path: '/social_hub', page: 'social_hub' },
    { path: '/tournaments', page: 'tournaments' },
  ] as Route[],

  currentPath: '/',
  app: null as any,

  /**
   * Initialise le routeur
   */
  init(app: any): void {
    this.app = app;
    this.setupPopStateListener();
    this.setupLinkListeners();
    this.routeToCurrentPath();
  },

  /**
   * Configure l'écouteur pour les changements d'URL
   */
  setupPopStateListener(): void {
    window.addEventListener('popstate', () => {
      this.routeToCurrentPath();
    });
  },

  /**
   * Configure les clics sur les liens de navigation
   */
  setupLinkListeners(): void {
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/"]') as HTMLAnchorElement;
      
      if (link && !link.getAttribute('href')?.startsWith('http')) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          this.navigate(href);
        }
      }
    });
  },

  /**
   * Navigue vers une route
   */
  navigate(path: string): void {
    this.currentPath = path;
    window.history.pushState({ path }, '', path);
    this.routeToCurrentPath();
  },

  /**
   * Route vers le chemin actuel
   */
  async routeToCurrentPath(): Promise<void> {
    const path = window.location.pathname;
    
    // Redirection vers /play si on est à la racine
    if (path === '/') {
      window.history.replaceState({ path: '/play' }, '', '/play');
      return this.routeToCurrentPath();
    }
    
    const route = this.routes.find(r => r.path === path);
    
    if (route) {
      await this.app.loadPage(route.page);
      this.updateActiveNavLink();
    } else {
      // Route par défaut -> rediriger vers /play
      window.history.replaceState({ path: '/play' }, '', '/play');
      await this.app.loadPage('home');
      this.updateActiveNavLink();
    }
  },

  /**
   * Met à jour le lien actif dans la navbar
   */
  updateActiveNavLink(): void {
    const allLinks = document.querySelectorAll('.nav-link');
    allLinks.forEach(link => {
      const href = (link as HTMLAnchorElement).getAttribute('href');
      const currentPath = window.location.pathname;
      
      if (href === currentPath || (currentPath === '/' && href === '/')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  },

  getPage(): string {
    this.currentPath = window.location.pathname;
    const route = this.routes.find(r => r.path === this.currentPath);
    return route ? route.page : 'home'; // or any default page
  }

};

export { Router };
