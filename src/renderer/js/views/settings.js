/**
 * Settings View
 * Handles account and appearance settings
 */

const SettingsView = {
    /**
     * Initializes the settings view
     */
    async init() {
        this.initTheme();
        this.bindEvents();
        this.populateAccountSettings();
    },

    /**
     * Initializes theme from localStorage
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.applyTheme(savedTheme);
        
        // Update toggle state
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.checked = savedTheme === 'light';
        }
        this.updateThemeLabel(savedTheme);
    },

    /**
     * Applies the theme to the document
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    },

    /**
     * Updates the theme label text
     */
    updateThemeLabel(theme) {
        const label = document.getElementById('theme-label');
        if (label) {
            label.textContent = theme === 'dark' ? 'Dark' : 'Light';
        }
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'light' : 'dark';
            this.applyTheme(theme);
            this.updateThemeLabel(theme);
            Toast.success(`Switched to ${theme} mode`);
        });

        // Change password button
        document.getElementById('change-password-btn')?.addEventListener('click', () => {
            this.changePassword();
        });
    },

    /**
     * Populates account settings from current user
     */
    populateAccountSettings() {
        const user = Permissions.currentUser;
        if (user) {
            const emailEl = document.getElementById('settings-email');
            if (emailEl) emailEl.value = user.email || '';
        }
    },

    /**
     * Changes the user's password
     */
    async changePassword() {
        const currentPassword = document.getElementById('settings-current-password').value;
        const newPassword = document.getElementById('settings-new-password').value;
        const confirmPassword = document.getElementById('settings-confirm-password').value;

        if (!currentPassword) {
            Toast.error('Please enter your current password');
            return;
        }

        if (!newPassword) {
            Toast.error('Please enter a new password');
            return;
        }

        if (newPassword.length < 8) {
            Toast.error('New password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            Toast.error('New passwords do not match');
            return;
        }

        try {
            const result = await window.api.auth.changePassword({
                currentPassword,
                newPassword
            });

            if (result.success) {
                Toast.success('Password changed successfully');
                // Clear form
                document.getElementById('settings-current-password').value = '';
                document.getElementById('settings-new-password').value = '';
                document.getElementById('settings-confirm-password').value = '';
            } else {
                Toast.error(result.error || 'Failed to change password');
            }
        } catch (error) {
            console.error('Failed to change password:', error);
            Toast.error('Failed to change password');
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        this.populateAccountSettings();
    }
};

// Export for use in other modules
window.SettingsView = SettingsView;
