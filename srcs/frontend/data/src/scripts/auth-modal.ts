/* AUTH MODAL */

import { PongGame } from '../game';
import { LoginResponse } from '../shared/types';

/* MODAL */

export const AuthModal = {
  modal: null as HTMLElement | null,
  loginTab: null as HTMLElement | null,
  signupTab: null as HTMLElement | null,
  loginForm: null as HTMLElement | null,
  signupForm: null as HTMLElement | null,
  twoFAForm: null as HTMLElement | null,
  pending2FAUserId: null as string | null,
  onLoginSuccess: null as ((loginResponse: LoginResponse) => void) | null,

  /* Initialise le modal d'authentification */
  init(): void {
    this.modal = document.getElementById('auth-modal');
    this.loginTab = document.getElementById('auth-login-tab');
    this.signupTab = document.getElementById('auth-signup-tab');
    this.loginForm = document.getElementById('auth-login-form');
    this.signupForm = document.getElementById('auth-signup-form');
    this.twoFAForm = document.getElementById('auth-2fa-form');

    this.handleOAuthCallback();

    if (!this.modal) return;

    this.setupTabListeners();
    this.setupCloseListeners();
    this.setupSwitchLinks();
    this.setupFormSubmissions();
    this.setupOAuth42Button();
    this.setup2FAListeners();
  },

  /* TABS */

  /* Configure le changement d'onglets */
  setupTabListeners(): void {
    this.loginTab?.addEventListener('click', () => {
      this.showLogin();
    });

    this.signupTab?.addEventListener('click', () => {
      this.showSignup();
    });
  },

  /* Configure les boutons de fermeture */
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

  /* Configure les liens de basculement */
  setupSwitchLinks(): void {
    document.getElementById('auth-switch-signup')?.addEventListener('click', () => {
      this.showSignup();
    });

    document.getElementById('auth-switch-login')?.addEventListener('click', () => {
      this.showLogin();
    });
  },

  /* FORMS */

  /* Affiche le formulaire de connexion */
  showLogin(): void {
    this.loginTab?.classList.add('border-blue-500', 'text-white');
    this.loginTab?.classList.remove('border-transparent', 'text-neutral-400');
    this.signupTab?.classList.remove('border-blue-500', 'text-white');
    this.signupTab?.classList.add('border-transparent', 'text-neutral-400');
    this.loginForm?.classList.remove('hidden');
    this.signupForm?.classList.add('hidden');
    this.twoFAForm?.classList.add('hidden');
    this.pending2FAUserId = null;
    this.loginTab?.parentElement?.classList.remove('hidden');
    document.getElementById('auth-oauth-divider')?.classList.remove('hidden');
    document.getElementById('auth-oauth-42')?.classList.remove('hidden');
    setTimeout(() => {
      const emailInput = this.loginForm?.querySelector('input[name="email"]') as HTMLInputElement;
      emailInput?.focus();
    }, 100);
  },

  /* Affiche le formulaire d'inscription */
  showSignup(): void {
    this.signupTab?.classList.add('border-blue-500', 'text-white');
    this.signupTab?.classList.remove('border-transparent', 'text-neutral-400');
    this.loginTab?.classList.remove('border-blue-500', 'text-white');
    this.loginTab?.classList.add('border-transparent', 'text-neutral-400');
    this.signupForm?.classList.remove('hidden');
    this.loginForm?.classList.add('hidden');
    this.twoFAForm?.classList.add('hidden');
    this.pending2FAUserId = null;
    this.loginTab?.parentElement?.classList.remove('hidden');
    document.getElementById('auth-oauth-divider')?.classList.remove('hidden');
    document.getElementById('auth-oauth-42')?.classList.remove('hidden');
    setTimeout(() => {
      const loginEmailInput = this.loginForm?.querySelector('input[name="email"]') as HTMLInputElement;
      const signupEmailInput = this.signupForm?.querySelector('input[name="email"]') as HTMLInputElement;
      if (loginEmailInput && signupEmailInput && loginEmailInput.value) {
        signupEmailInput.value = loginEmailInput.value;
      }
      signupEmailInput?.focus();
    }, 100);
  },

  /* Affiche le formulaire 2FA */
  show2FA(userId: string): void {
    this.pending2FAUserId = userId;
    this.loginForm?.classList.add('hidden');
    this.signupForm?.classList.add('hidden');
    this.twoFAForm?.classList.remove('hidden');
    this.loginTab?.parentElement?.classList.add('hidden');
    document.getElementById('auth-oauth-divider')?.classList.add('hidden');
    document.getElementById('auth-oauth-42')?.classList.add('hidden');
    setTimeout(() => {
      const codeInput = this.twoFAForm?.querySelector('input[name="code"]') as HTMLInputElement;
      if (codeInput) {
        codeInput.value = '';
        codeInput.focus();
      }
    }, 100);
  },

  /* MODAL CONTROLS */

  /* Ouvre le modal */
  open(): void {
    this.modal?.classList.remove('hidden');
    this.showLogin();
    PongGame.pauseGame();
  },

  /* Ouvre le modal sur le formulaire d'inscription */
  openSignup(): void {
    this.modal?.classList.remove('hidden');
    this.showSignup();
    PongGame.pauseGame();
  },

  /* Ferme le modal */
  close(): void {
    this.modal?.classList.add('hidden');
    PongGame.resumeGame();
  },

  /* FORM SUBMISSIONS */

  /* Configure les soumissions de formulaires */
  setupFormSubmissions(): void {
    const loginFormElement = this.loginForm as HTMLFormElement | null;
    const signupFormElement = this.signupForm as HTMLFormElement | null;
    loginFormElement?.addEventListener('submit', async (e) => {
      e.preventDefault();
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

        if (data.requires2FA && data.userId) {
          console.log('[AUTH] 2FA verification required');
          this.show2FA(data.userId);
          return;
        }

        const loginResponse: LoginResponse = data;
        if (loginResponse.token) {
          sessionStorage.setItem('authToken', loginResponse.token);
        }

        if (this.onLoginSuccess) {
          this.onLoginSuccess(loginResponse);
        }

        alert('Login successful!');
        loginFormElement.reset();
        this.close();
      } catch (error) {
        alert('An error occurred during login.');
      }
    })
   signupFormElement?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const termsCheckbox = signupFormElement.querySelector('input[name="terms"], input[id="terms"], input[type="checkbox"]') as HTMLInputElement | null;
      if (termsCheckbox && !termsCheckbox.checked) {
        alert('You must accept the conditions of use to sign up.');
        return;
      }
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

        if (loginResponse.token) {
          sessionStorage.setItem('authToken', loginResponse.token);
        }

        if (this.onLoginSuccess) {
          this.onLoginSuccess(loginResponse);
        }

        alert('Account created successfully!');
        signupFormElement.reset();
        this.close();
      } catch (error) {
        alert('An error occurred during signup.');
      }
   });
  },

  /* OAUTH */

  /* Configure le bouton OAuth 42 */
  setupOAuth42Button(): void {
    const oauth42Btn = document.getElementById('auth-oauth-42');
    oauth42Btn?.addEventListener('click', async () => {
      try {
        const response = await fetch('/authenticate/oauth/42');
        if (!response.ok) {
          const error = await response.json();
          alert(`OAuth error: ${error.error || 'Failed to initiate login'}`);
          return;
        }
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch (error) {
        console.error('[AUTH] OAuth 42 error:', error);
        alert('Failed to connect with 42. Please try again.');
      }
    });
  },

  /* 2FA */

  /* Configure les listeners 2FA */
  setup2FAListeners(): void {
    const twoFAFormElement = this.twoFAForm as HTMLFormElement | null;
    const backButton = document.getElementById('auth-2fa-back');

    twoFAFormElement?.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!this.pending2FAUserId) {
        alert('Session expired. Please log in again.');
        this.showLogin();
        return;
      }

      const formData = new FormData(twoFAFormElement);
      const code = formData.get('code') as string;

      if (!code || code.length !== 6) {
        alert('Please enter a valid 6-digit code.');
        return;
      }

      try {
        const response = await fetch('/user/public/login/2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: this.pending2FAUserId,
            code: code
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(`Verification failed: ${errorData.message || 'Invalid code'}`);
          const codeInput = twoFAFormElement.querySelector('input[name="code"]') as HTMLInputElement;
          if (codeInput) {
            codeInput.value = '';
            codeInput.focus();
          }
          return;
        }

        const loginResponse: LoginResponse = await response.json();
        if (loginResponse.token) {
          sessionStorage.setItem('authToken', loginResponse.token);
        }

        if (this.onLoginSuccess) {
          this.onLoginSuccess(loginResponse);
        }

        alert('Login successful!');
        twoFAFormElement.reset();
        this.pending2FAUserId = null;
        this.close();
      } catch (error) {
        console.error('[AUTH] 2FA verification error:', error);
        alert('An error occurred during verification.');
      }
    });

    backButton?.addEventListener('click', () => {
      this.pending2FAUserId = null;
      this.showLogin();
    });

    const codeInput = twoFAFormElement?.querySelector('input[name="code"]') as HTMLInputElement;
    codeInput?.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      input.value = input.value.replace(/\D/g, '');
      if (input.value.length === 6) {
        twoFAFormElement?.requestSubmit();
      }
    });
  },

  /* OAUTH CALLBACK */

  /* Gère le callback OAuth */
  handleOAuthCallback(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const oauthError = urlParams.get('oauth_error');
    const oauthRequires2FA = urlParams.get('oauth_requires_2fa');
    const oauthUserId = urlParams.get('userId');

    if (oauthError) {
      console.error('[AUTH] OAuth error:', oauthError);
      const errorMessages: Record<string, string> = {
        'access_denied': 'You cancelled the login.',
        'invalid_state': 'Security check failed. Please try again.',
        'token_exchange_failed': 'Failed to authenticate with 42.',
        'user_fetch_failed': 'Failed to get your 42 profile.',
        'config_error': 'OAuth is not properly configured.',
        'internal_error': 'An internal error occurred.',
        'missing_params': 'Invalid callback parameters.',
      };
      alert(errorMessages[oauthError] || `Login failed: ${oauthError}`);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (oauthRequires2FA === 'true' && oauthUserId) {
      console.log('[AUTH] OAuth 2FA required for user:', oauthUserId);
      window.history.replaceState({}, '', window.location.pathname);
      this.modal?.classList.remove('hidden');
      this.show2FA(oauthUserId);
      return;
    }

    if (token) {
      console.log('[AUTH] OAuth token received');
      sessionStorage.setItem('authToken', token);
      window.history.replaceState({}, '', window.location.pathname);

      this.fetchUserDataWithToken(token);
    }
  },

  /* Récupère les données utilisateur après OAuth */
  async fetchUserDataWithToken(token: string): Promise<void> {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id;

      if (!userId) {
        console.error('[AUTH] No user ID in JWT token');
        sessionStorage.removeItem('authToken');
        alert('Invalid token. Please try again.');
        return;
      }

      const response = await fetch(`/user/find?id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const users = await response.json();
        if (users && users.length > 0) {
          const user = users[0];
          const loginResponse: LoginResponse = {
            user,
            cachedUsers: [],
            friendIds: [],
            blockedIds: [],
            token
          };

          if (this.onLoginSuccess) {
            this.onLoginSuccess(loginResponse);
          }
        } else {
          console.error('[AUTH] User not found after OAuth');
          sessionStorage.removeItem('authToken');
          alert('User not found. Please try again.');
        }
      } else {
        console.error('[AUTH] Failed to fetch user data after OAuth');
        sessionStorage.removeItem('authToken');
        alert('Failed to complete login. Please try again.');
      }
    } catch (error) {
      console.error('[AUTH] Error fetching user data:', error);
      sessionStorage.removeItem('authToken');
      alert('Failed to complete login. Please try again.');
    }
  },
};
