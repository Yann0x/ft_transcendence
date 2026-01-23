/* ============================================
   ACCESSIBILITY MODULE - ft_transcendence
   Provides accessibility features for visually impaired users
   ============================================ */

import { I18n } from './i18n';

// Storage keys
const STORAGE_KEYS = {
  highContrast: 'a11y_highContrast',
  fontSize: 'a11y_fontSize',
  reducedMotion: 'a11y_reducedMotion',
  focusHighlight: 'a11y_focusHighlight',
} as const;

// Font size levels
type FontSizeLevel = 'normal' | 'large' | 'larger' | 'largest';
const FONT_SIZE_VALUES: Record<FontSizeLevel, string> = {
  normal: '100%',
  large: '112%',
  larger: '125%',
  largest: '150%',
};

// State
interface AccessibilityState {
  highContrast: boolean;
  fontSize: FontSizeLevel;
  reducedMotion: boolean;
  focusHighlight: boolean;
  panelOpen: boolean;
}

const state: AccessibilityState = {
  highContrast: false,
  fontSize: 'normal',
  reducedMotion: false,
  focusHighlight: true,
  panelOpen: false,
};

// ============================================
// Core Functions
// ============================================

function applyHighContrast(): void {
  document.body.classList.toggle('hc', state.highContrast);
  updateButtonState('a11y-contrast-btn', state.highContrast);
}

function applyFontSize(): void {
  document.documentElement.style.fontSize = FONT_SIZE_VALUES[state.fontSize];
  // Update radio buttons
  const radios = document.querySelectorAll<HTMLInputElement>('input[name="a11y-font-size"]');
  radios.forEach(radio => {
    radio.checked = radio.value === state.fontSize;
  });
}

function applyReducedMotion(): void {
  document.body.classList.toggle('reduced-motion', state.reducedMotion);
  updateButtonState('a11y-motion-btn', state.reducedMotion);
}

function applyFocusHighlight(): void {
  document.body.classList.toggle('focus-highlight', state.focusHighlight);
  updateButtonState('a11y-focus-btn', state.focusHighlight);
}

function updateButtonState(buttonId: string, isActive: boolean): void {
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.setAttribute('aria-pressed', String(isActive));
    btn.classList.toggle('active', isActive);
  }
}

function applyAll(): void {
  applyHighContrast();
  applyFontSize();
  applyReducedMotion();
  applyFocusHighlight();
}

// ============================================
// Toggle Functions
// ============================================

function toggleHighContrast(): void {
  state.highContrast = !state.highContrast;
  localStorage.setItem(STORAGE_KEYS.highContrast, String(state.highContrast));
  applyHighContrast();
  announceChange(state.highContrast ? 'accessibility.contrast_enabled' : 'accessibility.contrast_disabled');
}

function setFontSize(level: FontSizeLevel): void {
  state.fontSize = level;
  localStorage.setItem(STORAGE_KEYS.fontSize, level);
  applyFontSize();
  announceChange('accessibility.font_size_changed');
}

function toggleReducedMotion(): void {
  state.reducedMotion = !state.reducedMotion;
  localStorage.setItem(STORAGE_KEYS.reducedMotion, String(state.reducedMotion));
  applyReducedMotion();
  announceChange(state.reducedMotion ? 'accessibility.motion_reduced' : 'accessibility.motion_enabled');
}

function toggleFocusHighlight(): void {
  state.focusHighlight = !state.focusHighlight;
  localStorage.setItem(STORAGE_KEYS.focusHighlight, String(state.focusHighlight));
  applyFocusHighlight();
  announceChange(state.focusHighlight ? 'accessibility.focus_enabled' : 'accessibility.focus_disabled');
}

// ============================================
// Screen Reader Announcements
// ============================================

let announcer: HTMLElement | null = null;

function createAnnouncer(): void {
  if (announcer) return;

  announcer = document.createElement('div');
  announcer.id = 'a11y-announcer';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  document.body.appendChild(announcer);
}

function announceChange(messageKey: string): void {
  if (!announcer) createAnnouncer();
  if (announcer) {
    announcer.textContent = '';
    // Small delay to ensure screen readers catch the change
    setTimeout(() => {
      if (announcer) {
        announcer.textContent = I18n.translate(messageKey);
      }
    }, 100);
  }
}

// Public function for announcing any message
function announce(message: string): void {
  if (!announcer) createAnnouncer();
  if (announcer) {
    announcer.textContent = '';
    setTimeout(() => {
      if (announcer) {
        announcer.textContent = message;
      }
    }, 100);
  }
}

// ============================================
// Panel Management
// ============================================

function togglePanel(): void {
  state.panelOpen = !state.panelOpen;
  const panel = document.getElementById('a11y-panel');
  const button = document.getElementById('a11y-toggle');

  if (panel && button) {
    panel.classList.toggle('hidden', !state.panelOpen);
    button.setAttribute('aria-expanded', String(state.panelOpen));

    if (state.panelOpen) {
      // Focus first interactive element in panel
      const firstFocusable = panel.querySelector<HTMLElement>('button, input');
      firstFocusable?.focus();
    }
  }
}

function closePanel(): void {
  state.panelOpen = false;
  const panel = document.getElementById('a11y-panel');
  const button = document.getElementById('a11y-toggle');

  if (panel) panel.classList.add('hidden');
  if (button) {
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  }
}

function createPanel(): void {
  // Remove existing panel if any
  document.getElementById('a11y-panel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'a11y-panel';
  panel.className = 'a11y-panel hidden';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'a11y-panel-title');
  panel.setAttribute('aria-modal', 'true');

  panel.innerHTML = `
    <div class="a11y-panel-header">
      <h2 id="a11y-panel-title" class="a11y-panel-title">
        <span aria-hidden="true">👁️</span>
        <span data-i18n="accessibility.title">Accessibilité</span>
      </h2>
      <button id="a11y-panel-close" class="a11y-panel-close" type="button" aria-label="${I18n.translate('accessibility.close')}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="a11y-panel-content">
      <!-- High Contrast -->
      <div class="a11y-option">
        <div class="a11y-option-info">
          <span class="a11y-option-icon" aria-hidden="true">🔲</span>
          <div>
            <div class="a11y-option-label" data-i18n="accessibility.high_contrast">Contraste élevé</div>
            <div class="a11y-option-desc" data-i18n="accessibility.high_contrast_desc">Améliore la lisibilité avec des couleurs contrastées</div>
          </div>
        </div>
        <button id="a11y-contrast-btn" class="a11y-toggle-btn ${state.highContrast ? 'active' : ''}"
                type="button" role="switch" aria-checked="${state.highContrast}" aria-pressed="${state.highContrast}">
          <span class="a11y-toggle-slider"></span>
        </button>
      </div>

      <!-- Font Size -->
      <div class="a11y-option a11y-option-vertical">
        <div class="a11y-option-info">
          <span class="a11y-option-icon" aria-hidden="true">🔤</span>
          <div>
            <div class="a11y-option-label" data-i18n="accessibility.font_size">Taille du texte</div>
            <div class="a11y-option-desc" data-i18n="accessibility.font_size_desc">Ajuster la taille des caractères</div>
          </div>
        </div>
        <div class="a11y-font-sizes" role="radiogroup" aria-label="${I18n.translate('accessibility.font_size')}">
          <label class="a11y-font-option">
            <input type="radio" name="a11y-font-size" value="normal" ${state.fontSize === 'normal' ? 'checked' : ''}>
            <span class="a11y-font-sample" style="font-size: 14px;">A</span>
            <span class="a11y-font-label">100%</span>
          </label>
          <label class="a11y-font-option">
            <input type="radio" name="a11y-font-size" value="large" ${state.fontSize === 'large' ? 'checked' : ''}>
            <span class="a11y-font-sample" style="font-size: 16px;">A</span>
            <span class="a11y-font-label">112%</span>
          </label>
          <label class="a11y-font-option">
            <input type="radio" name="a11y-font-size" value="larger" ${state.fontSize === 'larger' ? 'checked' : ''}>
            <span class="a11y-font-sample" style="font-size: 18px;">A</span>
            <span class="a11y-font-label">125%</span>
          </label>
          <label class="a11y-font-option">
            <input type="radio" name="a11y-font-size" value="largest" ${state.fontSize === 'largest' ? 'checked' : ''}>
            <span class="a11y-font-sample" style="font-size: 20px;">A</span>
            <span class="a11y-font-label">150%</span>
          </label>
        </div>
      </div>

      <!-- Reduced Motion -->
      <div class="a11y-option">
        <div class="a11y-option-info">
          <span class="a11y-option-icon" aria-hidden="true">⏸️</span>
          <div>
            <div class="a11y-option-label" data-i18n="accessibility.reduced_motion">Réduire les animations</div>
            <div class="a11y-option-desc" data-i18n="accessibility.reduced_motion_desc">Désactive les animations et transitions</div>
          </div>
        </div>
        <button id="a11y-motion-btn" class="a11y-toggle-btn ${state.reducedMotion ? 'active' : ''}"
                type="button" role="switch" aria-checked="${state.reducedMotion}" aria-pressed="${state.reducedMotion}">
          <span class="a11y-toggle-slider"></span>
        </button>
      </div>

      <!-- Focus Highlight -->
      <div class="a11y-option">
        <div class="a11y-option-info">
          <span class="a11y-option-icon" aria-hidden="true">🎯</span>
          <div>
            <div class="a11y-option-label" data-i18n="accessibility.focus_highlight">Surbrillance du focus</div>
            <div class="a11y-option-desc" data-i18n="accessibility.focus_highlight_desc">Met en évidence l'élément actif au clavier</div>
          </div>
        </div>
        <button id="a11y-focus-btn" class="a11y-toggle-btn ${state.focusHighlight ? 'active' : ''}"
                type="button" role="switch" aria-checked="${state.focusHighlight}" aria-pressed="${state.focusHighlight}">
          <span class="a11y-toggle-slider"></span>
        </button>
      </div>

      <!-- Keyboard Shortcuts Info -->
      <div class="a11y-shortcuts">
        <div class="a11y-shortcuts-title" data-i18n="accessibility.keyboard_shortcuts">Raccourcis clavier</div>
        <ul class="a11y-shortcuts-list">
          <li><kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> - <span data-i18n="accessibility.shortcut_navigate">Naviguer</span></li>
          <li><kbd>Enter</kbd> / <kbd>Space</kbd> - <span data-i18n="accessibility.shortcut_activate">Activer</span></li>
          <li><kbd>Esc</kbd> - <span data-i18n="accessibility.shortcut_close">Fermer</span></li>
        </ul>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  bindPanelEvents();
  I18n.applyTranslations();
}

function bindPanelEvents(): void {
  // Close button
  document.getElementById('a11y-panel-close')?.addEventListener('click', closePanel);

  // Contrast toggle
  document.getElementById('a11y-contrast-btn')?.addEventListener('click', toggleHighContrast);

  // Font size radios
  const fontRadios = document.querySelectorAll<HTMLInputElement>('input[name="a11y-font-size"]');
  fontRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      setFontSize(radio.value as FontSizeLevel);
    });
  });

  // Reduced motion toggle
  document.getElementById('a11y-motion-btn')?.addEventListener('click', toggleReducedMotion);

  // Focus highlight toggle
  document.getElementById('a11y-focus-btn')?.addEventListener('click', toggleFocusHighlight);

  // Close on Escape
  document.getElementById('a11y-panel')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanel();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('a11y-panel');
    const toggle = document.getElementById('a11y-toggle');
    if (state.panelOpen && panel && toggle) {
      if (!panel.contains(e.target as Node) && !toggle.contains(e.target as Node)) {
        closePanel();
      }
    }
  });
}

// ============================================
// Initialization
// ============================================

function loadSettings(): void {
  // High contrast
  const storedContrast = localStorage.getItem(STORAGE_KEYS.highContrast);
  if (storedContrast === null) {
    state.highContrast = window.matchMedia?.('(prefers-contrast: more)').matches ?? false;
  } else {
    state.highContrast = storedContrast === 'true';
  }

  // Font size
  const storedFontSize = localStorage.getItem(STORAGE_KEYS.fontSize) as FontSizeLevel | null;
  if (storedFontSize && storedFontSize in FONT_SIZE_VALUES) {
    state.fontSize = storedFontSize;
  }

  // Reduced motion
  const storedMotion = localStorage.getItem(STORAGE_KEYS.reducedMotion);
  if (storedMotion === null) {
    state.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } else {
    state.reducedMotion = storedMotion === 'true';
  }

  // Focus highlight
  const storedFocus = localStorage.getItem(STORAGE_KEYS.focusHighlight);
  state.focusHighlight = storedFocus === null ? true : storedFocus === 'true';
}

function bindMainToggle(): void {
  const toggle = document.getElementById('a11y-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (!document.getElementById('a11y-panel')) {
        createPanel();
      }
      togglePanel();
    });
  }
}

function addSkipLink(): void {
  // Add skip to main content link for keyboard users
  if (document.getElementById('skip-link')) return;

  const skipLink = document.createElement('a');
  skipLink.id = 'skip-link';
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.textContent = I18n.translate('accessibility.skip_to_content');
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const main = document.getElementById('main-content') || document.querySelector('main') || document.getElementById('app');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus();
    }
  });

  document.body.insertBefore(skipLink, document.body.firstChild);
}

function init(): void {
  loadSettings();
  applyAll();
  createAnnouncer();
  addSkipLink();
  bindMainToggle();
}

function bindControls(): void {
  bindMainToggle();
  // Recreate panel if it was in DOM (after navigation)
  if (state.panelOpen) {
    createPanel();
    const panel = document.getElementById('a11y-panel');
    if (panel) panel.classList.remove('hidden');
  }
}

// ============================================
// Export
// ============================================

export const Accessibility = {
  init,
  bindControls,
  toggleHighContrast,
  setFontSize,
  toggleReducedMotion,
  toggleFocusHighlight,
  announce,
  togglePanel,
  closePanel,
};
