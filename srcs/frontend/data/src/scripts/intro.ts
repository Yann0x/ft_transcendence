// module for intro animation management
const Intro = {
  // animation duration in ms
  DURATION: 3500,
  
  // DOM element for intro
  introElement: null as HTMLElement | null,

  // init the intro
  init(): void {
    this.introElement = document.getElementById('intro');
    
    if (this.introElement) {
      this.scheduleRemoval();
      this.setupSkip();
    }
  },

  //
  // schedule intro removal after animation

  scheduleRemoval(): void {
    setTimeout(() => {
      this.hide();
    }, this.DURATION);
  },

  //
  // Allows skipping the intro by clicking

  setupSkip(): void {
    this.introElement?.addEventListener('click', () => {
      this.hide();
    });
  },

  //
  // Hides the intro screen

  hide(): void {
    if (this.introElement) {
      this.introElement.style.display = 'none';
    }
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  Intro.init();
});

export { Intro };
