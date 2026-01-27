import { User, UserPublic } from '../shared/types';

// forward declaration - will be set by App
let getAppInstance: () => {
  me: User | null;
  logout: () => Promise<void>;
  updateNavbar: () => void;
  onLogin: (user: User) => void;
  blockedUsersMap: Map<string, UserPublic>;
  removeFromBlockedUsersMap: (userId: string) => void;
} | null;

export function setAppInstance(getter: typeof getAppInstance) {
  getAppInstance = getter;
}

export const SettingsModal = {
  modal: null as HTMLElement | null,
  form: null as HTMLFormElement | null,
  avatarPreview: null as HTMLImageElement | null,
  avatarInput: null as HTMLInputElement | null,
  avatarBase64: null as string | null,
  pending2FASecret: null as string | null,

  // init the settings modal
  init(): void {
    this.modal = document.getElementById('settings-modal');
    this.form = document.getElementById('settings-form') as HTMLFormElement;
    this.avatarPreview = document.getElementById('settings-avatar-preview') as HTMLImageElement;
    this.avatarInput = document.getElementById('settings-avatar-input') as HTMLInputElement;

    if (!this.modal) return;

    this.setupCloseListeners();
    this.setupAvatarUpload();
    this.setupFormSubmission();
    this.setupDeleteAccount();
    this.setup2FA();
  },

  // setup close btn and background click
  setupCloseListeners(): void {
    const closeBtn = document.getElementById('settings-modal-close');
    closeBtn?.addEventListener('click', () => {
      this.close();
    });

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  },

  // setup avatar upload
  setupAvatarUpload(): void {
    const avatarBtn = document.getElementById('settings-avatar-btn');

    avatarBtn?.addEventListener('click', () => {
      this.avatarInput?.click();
    });

    this.avatarInput?.addEventListener('change', () => {
      this.handleAvatarChange();
    });
  },

  // handle avatar file selection
  handleAvatarChange(): void {
    const file = this.avatarInput?.files?.[0];
    if (!file) return;

    // validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image');
      return;
    }

    // validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5 MB');
      return;
    }

    // Compress and convert to Base64
    this.compressImage(file, 200, 0.8).then((compressedBase64) => {
      this.avatarBase64 = compressedBase64;

      // Update preview
      if (this.avatarPreview) {
        this.avatarPreview.src = compressedBase64;
      }
    }).catch((error) => {
      console.error('Error compressing image:', error);
      alert('Error processing image');
    });
  },

  // compress image to max size and quality
  compressImage(file: File, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions (maintain aspect ratio)
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compressed JPEG Base64
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  // setup form submission
  setupFormSubmission(): void {
    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  },

  // handle form submission
  async handleSubmit(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me) {
      alert('You must be logged in');
      return;
    }

    const nameInput = document.getElementById('settings-name') as HTMLInputElement;
    const emailInput = document.getElementById('settings-email') as HTMLInputElement;
    const passwordInput = document.getElementById('settings-password') as HTMLInputElement;
    const passwordConfirmInput = document.getElementById('settings-password-confirm') as HTMLInputElement;

    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;
    const passwordConfirm = passwordConfirmInput?.value;

    // Validation
    if (!name || name.length === 0) {
      alert('Name is required');
      return;
    }

    if (name.length > 50) {
      alert('Name cannot exceed 50 characters');
      return;
    }

    if (!email || !email.includes('@')) {
      alert('Invalid email');
      return;
    }

    // Password validation (only if provided)
    if (password || passwordConfirm) {
      if (password !== passwordConfirm) {
        alert('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
    }

    // Build update payload
    const updateData: Partial<User> & { id: string } = {
      id: app.me.id!,
    };

    // Only include changed fields
    if (name !== app.me.name) {
      updateData.name = name;
    }
    if (email !== app.me.email) {
      updateData.email = email;
    }
    if (password) {
      updateData.password = password;
    }
    if (this.avatarBase64) {
      updateData.avatar = this.avatarBase64;
    }

    // check if anything changed
    if (Object.keys(updateData).length === 1) {
      // only id present, nothing to update
      alert('No changes detected');
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Update failed'}`);
        return;
      }

      // Update local user data
      if (updateData.name) app.me.name = updateData.name;
      if (updateData.email) app.me.email = updateData.email;
      if (updateData.avatar) app.me.avatar = updateData.avatar;

      // Update session storage
      sessionStorage.setItem('currentUser', JSON.stringify(app.me));

      // Update navbar to reflect changes
      app.updateNavbar();

      // Clear password fields
      if (passwordInput) passwordInput.value = '';
      if (passwordConfirmInput) passwordConfirmInput.value = '';

      // reset avatar pending state
      this.avatarBase64 = null;

      alert('Changes saved successfully');
      this.close();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred while updating');
    }
  },

  // setup delete account btn
  setupDeleteAccount(): void {
    const deleteBtn = document.getElementById('settings-delete-btn');
    deleteBtn?.addEventListener('click', () => {
      this.handleDelete();
    });
  },

  // handle account deletion
  async handleDelete(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me) {
      alert('You must be logged in');
      return;
    }

    // confirmation dialog
    const confirmed = confirm(
      'Are you sure you want to delete your account?\n\n' +
      'This action is irreversible. All your data will be permanently deleted.'
    );

    if (!confirmed) return;

    // double confirmation for safety
    const doubleConfirm = confirm(
      'Final confirmation:\n\n' +
      'Do you really want to permanently delete your account?'
    );

    if (!doubleConfirm) return;

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: app.me.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Deletion failed'}`);
        return;
      }

      alert('Your account has been deleted');
      this.close();

      // logout and redirect
      await app.logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('An error occurred while deleting');
    }
  },

  // open modal and populate w/ current user data
  open(): void {
    const app = getAppInstance?.();
    if (!app?.me) {
      alert('You must be logged in to access settings');
      return;
    }

    this.populateForm(app.me);
    this.loadBlockedUsers();
    this.load2FAStatus();
    this.modal?.classList.remove('hidden');
  },

  // populate form w/ user data
  populateForm(user: User): void {
    const nameInput = document.getElementById('settings-name') as HTMLInputElement;
    const emailInput = document.getElementById('settings-email') as HTMLInputElement;

    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';

    // set avatar preview
    if (this.avatarPreview) {
      if (user.avatar) {
        this.avatarPreview.src = user.avatar;
      } else {
        this.avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
      }
    }

    // reset pending avatar
    this.avatarBase64 = null;

    // clear password fields
    const passwordInput = document.getElementById('settings-password') as HTMLInputElement;
    const passwordConfirmInput = document.getElementById('settings-password-confirm') as HTMLInputElement;
    if (passwordInput) passwordInput.value = '';
    if (passwordConfirmInput) passwordConfirmInput.value = '';
  },

  // load and display blocked users
  async loadBlockedUsers(): Promise<void> {
    const app = getAppInstance?.();
    const blockedList = document.getElementById('settings-blocked-list');
    const blockedCount = document.getElementById('settings-blocked-count');
    const emptyState = document.getElementById('settings-blocked-empty');

    if (!blockedList || !app?.me) return;

    // get blocked users from blockedUsersMap
    const blockedUsers = Array.from(app.blockedUsersMap.values());

    if (blockedUsers.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (blockedCount) blockedCount.textContent = '0';
      blockedList.querySelectorAll('[data-user-id]').forEach(el => el.remove());
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (blockedCount) blockedCount.textContent = String(blockedUsers.length);

    // Clear existing cards (except empty state)
    blockedList.querySelectorAll('[data-user-id]').forEach(el => el.remove());

    // Render blocked user cards
    blockedUsers.forEach(user => {
      const card = this.createBlockedUserCard(user);
      blockedList.insertAdjacentHTML('beforeend', card);
    });

    this.attachUnblockListeners();
  },

  // create HTML for a blocked user card
  createBlockedUserCard(user: UserPublic): string {
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=ef4444&color=fff`;
    return `
      <div class="flex items-center justify-between p-3 bg-neutral-800 rounded-lg" data-user-id="${user.id}">
        <div class="flex items-center gap-3">
          <img src="${avatar}" alt="${user.name}" class="w-8 h-8 rounded-full object-cover opacity-50">
          <span class="text-sm text-neutral-400">${user.name || 'Unknown'}</span>
        </div>
        <button class="settings-unblock-btn px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded transition text-xs" data-user-id="${user.id}">
          Unblock
        </button>
      </div>
    `;
  },

  // attach click listeners to unblock btns
  attachUnblockListeners(): void {
    document.querySelectorAll('#settings-blocked-list .settings-unblock-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const userId = (e.currentTarget as HTMLElement).dataset.userId;
        if (!userId) return;

        try {
          const response = await fetch('/user/unblock', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ blockedUserId: userId })
          });

          if (response.ok) {
            const app = getAppInstance?.();
            // Update App maps
            if (app) {
              app.removeFromBlockedUsersMap(userId);
            }
            // Refresh blocked users list
            this.loadBlockedUsers();
          }
        } catch (error) {
          console.error('[SETTINGS] Failed to unblock user:', error);
        }
      });
    });
  },

  /**
   * Setup 2FA functionality
   */
  setup2FA(): void {
    const enableBtn = document.getElementById('settings-2fa-enable-btn');
    const cancelBtn = document.getElementById('settings-2fa-cancel-btn');
    const disableBtn = document.getElementById('settings-2fa-disable-btn');
    const codeInput = document.getElementById('settings-2fa-code') as HTMLInputElement;
    const disableCodeInput = document.getElementById('settings-2fa-disable-code') as HTMLInputElement;

    // Enable button - start setup
    enableBtn?.addEventListener('click', async () => {
      await this.start2FASetup();
    });

    // Cancel button - hide setup
    cancelBtn?.addEventListener('click', () => {
      this.hide2FASetup();
    });

    // Disable button
    disableBtn?.addEventListener('click', async () => {
      await this.disable2FA();
    });

    // Auto-filter input to only digits and auto-submit at 6 chars
    codeInput?.addEventListener('input', () => {
      codeInput.value = codeInput.value.replace(/\D/g, '');
      if (codeInput.value.length === 6) {
        this.confirm2FASetup();
      }
    });

    disableCodeInput?.addEventListener('input', () => {
      disableCodeInput.value = disableCodeInput.value.replace(/\D/g, '');
      if (disableCodeInput.value.length === 6) {
        this.disable2FA();
      }
    });
  },

  /**
   * Start 2FA setup - fetch QR code
   */
  async start2FASetup(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me?.id || !app.me.email) {
      alert('User data not available');
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('/authenticate/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: app.me.id,
          email: app.me.email
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to start 2FA setup'}`);
        return;
      }

      const data = await response.json();
      this.pending2FASecret = data.secret;

      // Display QR code and secret
      const qrImg = document.getElementById('settings-2fa-qr') as HTMLImageElement;
      const secretEl = document.getElementById('settings-2fa-secret');

      if (qrImg) qrImg.src = data.qrCode;
      if (secretEl) secretEl.textContent = data.secret;

      // Show setup section
      this.show2FASetup();
    } catch (error) {
      console.error('[SETTINGS] 2FA setup error:', error);
      alert('An error occurred while setting up 2FA');
    }
  },

  /**
   * Show 2FA setup section
   */
  show2FASetup(): void {
    document.getElementById('settings-2fa-enable-section')?.classList.add('hidden');
    document.getElementById('settings-2fa-setup-section')?.classList.remove('hidden');
    
    // Clear code input
    const codeInput = document.getElementById('settings-2fa-code') as HTMLInputElement;
    if (codeInput) {
      codeInput.value = '';
      codeInput.focus();
    }
  },

  /**
   * Hide 2FA setup section
   */
  hide2FASetup(): void {
    document.getElementById('settings-2fa-setup-section')?.classList.add('hidden');
    document.getElementById('settings-2fa-enable-section')?.classList.remove('hidden');
    this.pending2FASecret = null;
  },

  /**
   * Confirm 2FA setup - verify code and enable
   */
  async confirm2FASetup(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me?.id || !this.pending2FASecret) {
      alert('Setup data not available');
      return;
    }

    const codeInput = document.getElementById('settings-2fa-code') as HTMLInputElement;
    const code = codeInput?.value;

    if (!code || code.length !== 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('/authenticate/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: app.me.id,
          secret: this.pending2FASecret,
          code: code
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Verification failed: ${error.message || 'Invalid code'}`);
        codeInput.value = '';
        codeInput.focus();
        return;
      }

      // Success
      alert('2FA has been enabled successfully!');
      this.pending2FASecret = null;
      
      // Update UI to show enabled state
      this.update2FAStatus(true);
    } catch (error) {
      console.error('[SETTINGS] 2FA enable error:', error);
      alert('An error occurred while enabling 2FA');
    }
  },

  /**
   * Disable 2FA
   */
  async disable2FA(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me?.id) {
      alert('User data not available');
      return;
    }

    const codeInput = document.getElementById('settings-2fa-disable-code') as HTMLInputElement;
    const code = codeInput?.value;

    if (!code || code.length !== 6) {
      alert('Please enter your current 2FA code');
      return;
    }

    // Confirm
    const confirmed = confirm('Are you sure you want to disable 2FA? This will make your account less secure.');
    if (!confirmed) return;

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('/authenticate/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: app.me.id,
          code: code
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to disable: ${error.message || 'Invalid code'}`);
        codeInput.value = '';
        codeInput.focus();
        return;
      }

      // Success
      alert('2FA has been disabled');
      codeInput.value = '';
      
      // Update UI to show disabled state
      this.update2FAStatus(false);
    } catch (error) {
      console.error('[SETTINGS] 2FA disable error:', error);
      alert('An error occurred while disabling 2FA');
    }
  },

  /**
   * Update 2FA UI based on status
   */
  update2FAStatus(enabled: boolean): void {
    const badge = document.getElementById('settings-2fa-badge');
    const enableSection = document.getElementById('settings-2fa-enable-section');
    const setupSection = document.getElementById('settings-2fa-setup-section');
    const disableSection = document.getElementById('settings-2fa-disable-section');

    if (enabled) {
      if (badge) {
        badge.textContent = 'Activé';
        badge.className = 'text-xs px-2 py-1 rounded-full bg-emerald-600/30 text-emerald-400';
      }
      enableSection?.classList.add('hidden');
      setupSection?.classList.add('hidden');
      disableSection?.classList.remove('hidden');
    } else {
      if (badge) {
        badge.textContent = 'Désactivé';
        badge.className = 'text-xs px-2 py-1 rounded-full bg-neutral-700 text-neutral-400';
      }
      enableSection?.classList.remove('hidden');
      setupSection?.classList.add('hidden');
      disableSection?.classList.add('hidden');
    }

    // Clear disable code input
    const disableCodeInput = document.getElementById('settings-2fa-disable-code') as HTMLInputElement;
    if (disableCodeInput) disableCodeInput.value = '';
  },

  /**
   * Load 2FA status when opening settings
   */
  async load2FAStatus(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me?.id) return;

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`/user/find?id=${app.me.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const users = await response.json();
        console.log('[SETTINGS] load2FAStatus - users response:', users);
        if (users && users.length > 0) {
          const user = users[0] as User & { twoAuth_enabled?: number };
          console.log('[SETTINGS] load2FAStatus - twoAuth_enabled:', user.twoAuth_enabled);
          this.update2FAStatus(!!user.twoAuth_enabled);
        }
      }
    } catch (error) {
      console.error('[SETTINGS] Failed to load 2FA status:', error);
    }
  },

  /**
   * Setup 2FA functionality
   */
  setup2FA(): void {
    const enableBtn = document.getElementById('settings-2fa-enable-btn');
    const cancelBtn = document.getElementById('settings-2fa-cancel-btn');
    const disableBtn = document.getElementById('settings-2fa-disable-btn');
    const codeInput = document.getElementById('settings-2fa-code') as HTMLInputElement;
    const disableCodeInput = document.getElementById('settings-2fa-disable-code') as HTMLInputElement;

    // Enable button - start setup
    enableBtn?.addEventListener('click', async () => {
      await this.start2FASetup();
    });

    // Cancel button - hide setup
    cancelBtn?.addEventListener('click', () => {
      this.hide2FASetup();
    });

    // Disable button
    disableBtn?.addEventListener('click', async () => {
      await this.disable2FA();
    });

    // Auto-filter input to only digits and auto-submit at 6 chars
    codeInput?.addEventListener('input', () => {
      codeInput.value = codeInput.value.replace(/\D/g, '');
      if (codeInput.value.length === 6) {
        this.confirm2FASetup();
      }
    });

    disableCodeInput?.addEventListener('input', () => {
      disableCodeInput.value = disableCodeInput.value.replace(/\D/g, '');
      if (disableCodeInput.value.length === 6) {
        this.disable2FA();
      }
    });
  },

  /**
   * Start 2FA setup - fetch QR code
   */
  async start2FASetup(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me?.id || !app.me.email) {
      alert('User data not available');
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('/authenticate/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: app.me.id,
          email: app.me.email
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to start 2FA setup'}`);
        return;
      }

      const data = await response.json();
      this.pending2FASecret = data.secret;

      // Display QR code and secret
      const qrImg = document.getElementById('settings-2fa-qr') as HTMLImageElement;
      const secretEl = document.getElementById('settings-2fa-secret');

      if (qrImg) qrImg.src = data.qrCode;
      if (secretEl) secretEl.textContent = data.secret;

      // Show setup section
      this.show2FASetup();
    } catch (error) {
      console.error('[SETTINGS] 2FA setup error:', error);
      alert('An error occurred while setting up 2FA');
    }
  },

  /**
   * Show 2FA setup section
   */
  show2FASetup(): void {
    document.getElementById('settings-2fa-enable-section')?.classList.add('hidden');
    document.getElementById('settings-2fa-setup-section')?.classList.remove('hidden');
    
    // Clear code input
    const codeInput = document.getElementById('settings-2fa-code') as HTMLInputElement;
    if (codeInput) {
      codeInput.value = '';
      codeInput.focus();
    }
  },

  /**
   * Hide 2FA setup section
   */
  hide2FASetup(): void {
    document.getElementById('settings-2fa-setup-section')?.classList.add('hidden');
    document.getElementById('settings-2fa-enable-section')?.classList.remove('hidden');
    this.pending2FASecret = null;
  },

  /**
   * Confirm 2FA setup - verify code and enable
   */
  async confirm2FASetup(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me?.id || !this.pending2FASecret) {
      alert('Setup data not available');
      return;
    }

    const codeInput = document.getElementById('settings-2fa-code') as HTMLInputElement;
    const code = codeInput?.value;

    if (!code || code.length !== 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('/authenticate/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: app.me.id,
          secret: this.pending2FASecret,
          code: code
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Verification failed: ${error.message || 'Invalid code'}`);
        codeInput.value = '';
        codeInput.focus();
        return;
      }

      // Success
      alert('2FA has been enabled successfully!');
      this.pending2FASecret = null;
      
      // Update UI to show enabled state
      this.update2FAStatus(true);
    } catch (error) {
      console.error('[SETTINGS] 2FA enable error:', error);
      alert('An error occurred while enabling 2FA');
    }
  },

  /**
   * Disable 2FA
   */
  async disable2FA(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me?.id) {
      alert('User data not available');
      return;
    }

    const codeInput = document.getElementById('settings-2fa-disable-code') as HTMLInputElement;
    const code = codeInput?.value;

    if (!code || code.length !== 6) {
      alert('Please enter your current 2FA code');
      return;
    }

    // Confirm
    const confirmed = confirm('Are you sure you want to disable 2FA? This will make your account less secure.');
    if (!confirmed) return;

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('/authenticate/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: app.me.id,
          code: code
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to disable: ${error.message || 'Invalid code'}`);
        codeInput.value = '';
        codeInput.focus();
        return;
      }

      // Success
      alert('2FA has been disabled');
      codeInput.value = '';
      
      // Update UI to show disabled state
      this.update2FAStatus(false);
    } catch (error) {
      console.error('[SETTINGS] 2FA disable error:', error);
      alert('An error occurred while disabling 2FA');
    }
  },

  /**
   * Update 2FA UI based on status
   */
  update2FAStatus(enabled: boolean): void {
    const badge = document.getElementById('settings-2fa-badge');
    const enableSection = document.getElementById('settings-2fa-enable-section');
    const setupSection = document.getElementById('settings-2fa-setup-section');
    const disableSection = document.getElementById('settings-2fa-disable-section');

    if (enabled) {
      if (badge) {
        badge.textContent = 'Activé';
        badge.className = 'text-xs px-2 py-1 rounded-full bg-emerald-600/30 text-emerald-400';
      }
      enableSection?.classList.add('hidden');
      setupSection?.classList.add('hidden');
      disableSection?.classList.remove('hidden');
    } else {
      if (badge) {
        badge.textContent = 'Désactivé';
        badge.className = 'text-xs px-2 py-1 rounded-full bg-neutral-700 text-neutral-400';
      }
      enableSection?.classList.remove('hidden');
      setupSection?.classList.add('hidden');
      disableSection?.classList.add('hidden');
    }

    // Clear disable code input
    const disableCodeInput = document.getElementById('settings-2fa-disable-code') as HTMLInputElement;
    if (disableCodeInput) disableCodeInput.value = '';
  },

  /**
   * Load 2FA status when opening settings
   */
  async load2FAStatus(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me?.id) return;

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`/user/find?id=${app.me.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const users = await response.json();
        console.log('[SETTINGS] load2FAStatus - users response:', users);
        if (users && users.length > 0) {
          const user = users[0] as User & { twoAuth_enabled?: number };
          console.log('[SETTINGS] load2FAStatus - twoAuth_enabled:', user.twoAuth_enabled);
          this.update2FAStatus(!!user.twoAuth_enabled);
        }
      }
    } catch (error) {
      console.error('[SETTINGS] Failed to load 2FA status:', error);
    }
  },

  // close the modal
  close(): void {
    this.modal?.classList.add('hidden');
  }
};
