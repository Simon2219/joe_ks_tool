/**
 * Settings View
 * Handles account and system settings
 */

const SettingsView = {
    settings: {},

    /**
     * Initializes the settings view
     */
    async init() {
        this.bindEvents();
        await this.loadSettings();
        this.populateAccountSettings();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Change password button
        document.getElementById('change-password-btn')?.addEventListener('click', () => {
            this.changePassword();
        });

        // Save settings button
        document.getElementById('save-settings-btn')?.addEventListener('click', () => {
            this.saveSettings();
        });
    },

    /**
     * Loads system settings
     */
    async loadSettings() {
        try {
            const result = await window.electronAPI.settings.getAll();
            if (result.success) {
                this.settings = result.settings;
                this.populateSystemSettings();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    },

    /**
     * Populates account settings from current user
     */
    populateAccountSettings() {
        const user = Permissions.currentUser;
        if (user) {
            document.getElementById('settings-email').value = user.email || '';
        }
    },

    /**
     * Populates system settings
     */
    populateSystemSettings() {
        if (this.settings.general) {
            document.getElementById('settings-company-name').value = 
                this.settings.general.companyName || '';
            document.getElementById('settings-timezone').value = 
                this.settings.general.timezone || 'UTC';
        }
        
        if (this.settings.quality) {
            document.getElementById('settings-passing-score').value = 
                this.settings.quality.passingScore || 80;
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
            const result = await window.electronAPI.auth.changePassword({
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
     * Saves system settings
     */
    async saveSettings() {
        try {
            const companyName = document.getElementById('settings-company-name').value;
            const timezone = document.getElementById('settings-timezone').value;
            const passingScore = parseInt(document.getElementById('settings-passing-score').value);

            // Update general settings
            await window.electronAPI.settings.set('general.companyName', companyName);
            await window.electronAPI.settings.set('general.timezone', timezone);

            // Update quality settings
            await window.electronAPI.settings.set('quality.passingScore', passingScore);

            Toast.success('Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            Toast.error('Failed to save settings');
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadSettings();
    }
};

// Export for use in other modules
window.SettingsView = SettingsView;
