/* ============================================
   AUTH MODAL - Authentication Modal Management
   ============================================ */

import { User, LoginResponse } from '../shared/types';

export const AuthModal = {
  modal: null as HTMLElement | null,
  loginTab: null as HTMLElement | null,
  signupTab: null as HTMLElement | null,
  loginForm: null as HTMLElement | null,
  signupForm: null as HTMLElement | null,
  onLoginSuccess: null as ((loginResponse: LoginResponse) => void) | null,

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
    // Copy login email to signup email if present
    setTimeout(() => {
      const loginEmailInput = this.loginForm?.querySelector('input[name="email"]') as HTMLInputElement;
      const signupEmailInput = this.signupForm?.querySelector('input[name="email"]') as HTMLInputElement;
      if (loginEmailInput && signupEmailInput && loginEmailInput.value) {
        signupEmailInput.value = loginEmailInput.value;
      }
      signupEmailInput?.focus();
    }, 100);
  },

  /**
   * Open the modal
   */
  open(): void {
    this.modal?.classList.remove('hidden');
    this.showLogin(); // Always show login by default
  },

  /**
   * Open the modal on signup form
   */
  openSignup(): void {
    this.modal?.classList.remove('hidden');
    this.showSignup(); // Show signup form
  },

  /**
   * Close the modal
   */
  close(): void {
    this.modal?.classList.add('hidden');
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

        const loginResponse: LoginResponse = await response.json();
        if (loginResponse.token) {
          sessionStorage.setItem('authToken', loginResponse.token);
        }

        // Pass LoginResponse to app for handling
        if (this.onLoginSuccess) {
          this.onLoginSuccess(loginResponse);
        }

        alert('Login successful!');
        // Clear login form fields
        loginFormElement.reset();
        this.close();
      } catch (error) {
        alert('An error occurred during login.');
      }
    })
   signupFormElement?.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Check if conditions of use are accepted
      const termsCheckbox = signupFormElement.querySelector('input[name="terms"], input[id="terms"], input[type="checkbox"]') as HTMLInputElement | null;
      if (termsCheckbox && !termsCheckbox.checked) {
        alert('You must accept the conditions of use to sign up.');
        return;
      }
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

        const loginResponse: LoginResponse = await response.json();

        // Auto-login after successful registration
        if (loginResponse.token) {
          sessionStorage.setItem('authToken', loginResponse.token);
        }

        // Pass LoginResponse to app for handling
        if (this.onLoginSuccess) {
          this.onLoginSuccess(loginResponse);
        }

        alert('Account created successfully!');
        // Clear signup form fields
        signupFormElement.reset();
        this.close();
      } catch (error) {
        alert('An error occurred during signup.');
      }
   });
  },
};
