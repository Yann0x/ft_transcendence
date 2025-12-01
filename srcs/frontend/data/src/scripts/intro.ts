/* ============================================
   INTRO ANIMATION - ft_transcendance
   ============================================ */

/**
 * Module de gestion de l'animation d'intro
 */
const Intro = {
  // Durée de l'animation en ms
  DURATION: 3500,
  
  // Élément DOM de l'intro
  introElement: null as HTMLElement | null,

  /**
   * Initialise l'intro
   */
  init(): void {
    this.introElement = document.getElementById('intro');
    
    if (this.introElement) {
      this.scheduleRemoval();
      this.setupSkip();
    }
  },

  /**
   * Programme la suppression de l'intro après l'animation
   */
  scheduleRemoval(): void {
    setTimeout(() => {
      this.hide();
    }, this.DURATION);
  },

  /**
   * Permet de skip l'intro en cliquant
   */
  setupSkip(): void {
    this.introElement?.addEventListener('click', () => {
      this.hide();
    });
  },

  /**
   * Cache l'écran d'intro
   */
  hide(): void {
    if (this.introElement) {
      this.introElement.style.display = 'none';
    }
  }
};

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  Intro.init();
});

export { Intro };
