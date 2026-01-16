/* ============================================
   AUTH MODAL - Authentication Modal Management
   ============================================ */

import { User } from '../shared/types';
import { PongGame } from '../game';

export const AuthModal = {
  modal: null as HTMLElement | null,
  loginTab: null as HTMLElement | null,
  signupTab: null as HTMLElement | null,
  loginForm: null as HTMLElement | null,
  signupForm: null as HTMLElement | null,
  onLoginSuccess: null as ((user: User) => void) | null,

  /**
   * Initialize the auth modal
   */
  init(): void {
    this.modal = document.getElementById('auth-modal');
    this.loginTab = document.getElementById('auth-login-tab');
    this.signupTab = document.getElementById('auth-signup-tab');
    this.loginForm = document.getElementById('auth-login-form');
    this.signupForm = document.getElementById('auth-signup-form');

    if (!this.modal) return;

    this.setupTabListeners();
    this.setupCloseListeners();
    this.setupSwitchLinks();
    this.setupFormSubmissions();
  },

  
  /**
   * Setup tab switching
   */
  setupTabListeners(): void {
    this.loginTab?.addEventListener('click', () => {
      this.showLogin();
    });

    this.signupTab?.addEventListener('click', () => {
      this.showSignup();
    });
  },

  /**
   * Setup close button and background click
   */
  setupCloseListeners(): void {
    const closeBtn = document.getElementById('auth-modal-close');
    closeBtn?.addEventListener('click', () => {
      this.close();
    });

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  },

  /**
   * Setup switch between login and signup
   */
  setupSwitchLinks(): void {
    document.getElementById('auth-switch-signup')?.addEventListener('click', () => {
      this.showSignup();
    });

    document.getElementById('auth-switch-login')?.addEventListener('click', () => {
      this.showLogin();
    });
  },

  /**
   * Show login form
   */
  showLogin(): void {
    this.loginTab?.classList.add('border-blue-500', 'text-white');
    this.loginTab?.classList.remove('border-transparent', 'text-neutral-400');
    this.signupTab?.classList.remove('border-blue-500', 'text-white');
    this.signupTab?.classList.add('border-transparent', 'text-neutral-400');
    this.loginForm?.classList.remove('hidden');
    this.signupForm?.classList.add('hidden');
    // Focus on email input
    setTimeout(() => {
      const emailInput = this.loginForm?.querySelector('input[name="email"]') as HTMLInputElement;
      emailInput?.focus();
    }, 100);
  },

  /**
   * Show signup form
   */
  showSignup(): void {
    this.signupTab?.classList.add('border-blue-500', 'text-white');
    this.signupTab?.classList.remove('border-transparent', 'text-neutral-400');
    this.loginTab?.classList.remove('border-blue-500', 'text-white');
    this.loginTab?.classList.add('border-transparent', 'text-neutral-400');
    this.signupForm?.classList.remove('hidden');
    this.loginForm?.classList.add('hidden');
    // Focus on email input
    setTimeout(() => {
      const emailInput = this.signupForm?.querySelector('input[name="email"]') as HTMLInputElement;
      emailInput?.focus();
    }, 100);
  },

  /**
   * Open the modal
   */
  open(): void {
    this.modal?.classList.remove('hidden');
    this.showLogin(); // Always show login by default
    PongGame.pauseGame(); // Mettre le jeu en pause
  },

  /**
   * Open the modal on signup form
   */
  openSignup(): void {
    this.modal?.classList.remove('hidden');
    this.showSignup(); // Show signup form
    PongGame.pauseGame(); // Mettre le jeu en pause
  },

  /**
   * Close the modal
   */
  close(): void {
    this.modal?.classList.add('hidden');
    PongGame.resumeGame(); // Reprendre le jeu
  },

  setupFormSubmissions(): void {
    const loginFormElement = this.loginForm as HTMLFormElement | null;
    const signupFormElement = this.signupForm as HTMLFormElement | null;
    loginFormElement?.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Handle login form submission
      const formData = new FormData(loginFormElement);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      try {
        const response = await fetch('/user/public/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(`Login failed: ${errorData.message}`);
          return;
        }

        const data = await response.json();
        if (data.token) {
          sessionStorage.setItem('authToken', data.token);
        }

        // Store user data and notify app
        if (this.onLoginSuccess && data.user) {
          this.onLoginSuccess(data.user as User);
        }

        alert('Login successful!');
        this.close();
      } catch (error) {
        alert('An error occurred during login.');
      }
    })
   signupFormElement?.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Handle signup form submission
      const formData = new FormData(signupFormElement);
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      try {
        const response = await fetch('/user/public/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(`Signup failed: ${errorData.message}`);
          return;
        }

        const data = await response.json();

        // Auto-login after successful registration
        if (data.token) {
          sessionStorage.setItem('authToken', data.token);
        }

        // Store user data and notify app
        if (this.onLoginSuccess && data.user) {
          this.onLoginSuccess(data.user as User);
        }

        alert('Account created successfully!');
        this.close();
      } catch (error) {
        alert('An error occurred during signup.');
      }
   });
  },
};
