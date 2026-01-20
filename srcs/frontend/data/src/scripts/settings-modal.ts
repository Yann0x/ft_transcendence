/* ============================================
   SETTINGS MODAL - Account Settings Management
   ============================================ */

import { User, UserPublic } from '../shared/types';

// Forward declaration - will be set by App
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

  /**
   * Initialize the settings modal
   */
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
  },

  /**
   * Setup close button and background click
   */
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

  /**
   * Setup avatar upload functionality
   */
  setupAvatarUpload(): void {
    const avatarBtn = document.getElementById('settings-avatar-btn');

    avatarBtn?.addEventListener('click', () => {
      this.avatarInput?.click();
    });

    this.avatarInput?.addEventListener('change', () => {
      this.handleAvatarChange();
    });
  },

  /**
   * Handle avatar file selection
   */
  handleAvatarChange(): void {
    const file = this.avatarInput?.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide');
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5 Mo');
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
      alert('Erreur lors du traitement de l\'image');
    });
  },

  /**
   * Compress image to a maximum size and quality
   */
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

  /**
   * Setup form submission
   */
  setupFormSubmission(): void {
    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  },

  /**
   * Handle form submission
   */
  async handleSubmit(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me) {
      alert('Vous devez être connecté');
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
      alert('Le nom est requis');
      return;
    }

    if (name.length > 50) {
      alert('Le nom ne peut pas dépasser 50 caractères');
      return;
    }

    if (!email || !email.includes('@')) {
      alert('Email invalide');
      return;
    }

    // Password validation (only if provided)
    if (password || passwordConfirm) {
      if (password !== passwordConfirm) {
        alert('Les mots de passe ne correspondent pas');
        return;
      }
      if (password.length < 6) {
        alert('Le mot de passe doit contenir au moins 6 caractères');
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

    // Check if anything changed
    if (Object.keys(updateData).length === 1) {
      // Only id is present, nothing to update
      alert('Aucune modification détectée');
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
        alert(`Erreur: ${errorData.message || 'Mise à jour échouée'}`);
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

      // Reset avatar pending state
      this.avatarBase64 = null;

      alert('Modifications enregistrées avec succès');
      this.close();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Une erreur est survenue lors de la mise à jour');
    }
  },

  /**
   * Setup delete account button
   */
  setupDeleteAccount(): void {
    const deleteBtn = document.getElementById('settings-delete-btn');
    deleteBtn?.addEventListener('click', () => {
      this.handleDelete();
    });
  },

  /**
   * Handle account deletion
   */
  async handleDelete(): Promise<void> {
    const app = getAppInstance?.();
    if (!app?.me) {
      alert('Vous devez être connecté');
      return;
    }

    // Confirmation dialog
    const confirmed = confirm(
      'Êtes-vous sûr de vouloir supprimer votre compte ?\n\n' +
      'Cette action est irréversible. Toutes vos données seront définitivement supprimées.'
    );

    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirm = confirm(
      'Dernière confirmation :\n\n' +
      'Voulez-vous vraiment supprimer définitivement votre compte ?'
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
        alert(`Erreur: ${errorData.message || 'Suppression échouée'}`);
        return;
      }

      alert('Votre compte a été supprimé');
      this.close();

      // Logout and redirect
      await app.logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Une erreur est survenue lors de la suppression');
    }
  },

  /**
   * Open the modal and populate with current user data
   */
  open(): void {
    const app = getAppInstance?.();
    if (!app?.me) {
      alert('Vous devez être connecté pour accéder aux paramètres');
      return;
    }

    this.populateForm(app.me);
    this.loadBlockedUsers();
    this.modal?.classList.remove('hidden');
  },

  /**
   * Populate form with user data
   */
  populateForm(user: User): void {
    const nameInput = document.getElementById('settings-name') as HTMLInputElement;
    const emailInput = document.getElementById('settings-email') as HTMLInputElement;

    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';

    // Set avatar preview
    if (this.avatarPreview) {
      if (user.avatar) {
        this.avatarPreview.src = user.avatar;
      } else {
        this.avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
      }
    }

    // Reset pending avatar
    this.avatarBase64 = null;

    // Clear password fields
    const passwordInput = document.getElementById('settings-password') as HTMLInputElement;
    const passwordConfirmInput = document.getElementById('settings-password-confirm') as HTMLInputElement;
    if (passwordInput) passwordInput.value = '';
    if (passwordConfirmInput) passwordConfirmInput.value = '';
  },

  /**
   * Load and display blocked users
   */
  async loadBlockedUsers(): Promise<void> {
    const app = getAppInstance?.();
    const blockedList = document.getElementById('settings-blocked-list');
    const blockedCount = document.getElementById('settings-blocked-count');
    const emptyState = document.getElementById('settings-blocked-empty');

    if (!blockedList || !app?.me) return;

    // Get blocked users from blockedUsersMap
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

  /**
   * Create HTML for a blocked user card
   */
  createBlockedUserCard(user: UserPublic): string {
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=ef4444&color=fff`;
    return `
      <div class="flex items-center justify-between p-3 bg-neutral-800 rounded-lg" data-user-id="${user.id}">
        <div class="flex items-center gap-3">
          <img src="${avatar}" alt="${user.name}" class="w-8 h-8 rounded-full object-cover opacity-50">
          <span class="text-sm text-neutral-400">${user.name || 'Unknown'}</span>
        </div>
        <button class="settings-unblock-btn px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-white rounded transition text-xs" data-user-id="${user.id}">
          Débloquer
        </button>
      </div>
    `;
  },

  /**
   * Attach click listeners to unblock buttons
   */
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
   * Close the modal
   */
  close(): void {
    this.modal?.classList.add('hidden');
  }
};
