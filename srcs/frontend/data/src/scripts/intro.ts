/* INTRO */

const Intro = {
  DURATION: 3500,
  introElement: null as HTMLElement | null,

  init(): void {
    this.introElement = document.getElementById('intro');

    if (this.introElement) {
      this.scheduleRemoval();
      this.setupSkip();
    }
  },

  scheduleRemoval(): void {
    setTimeout(() => {
      this.hide();
    }, this.DURATION);
  },

  setupSkip(): void {
    this.introElement?.addEventListener('click', () => {
      this.hide();
    });
  },

  hide(): void {
    if (this.introElement) {
      this.introElement.style.display = 'none';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Intro.init();
});

export { Intro };
