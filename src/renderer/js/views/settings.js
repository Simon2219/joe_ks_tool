/**
 * Settings View
 * Handles account, appearance, and system settings
 */

const SettingsView = {
    settings: {},

    /**
     * Initializes the settings view
     */
    async init() {
        this.initTheme();
        this.bindEvents();
        await this.loadSettings();
        this.populateAccountSettings();
        this.checkMigrations();
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

        // Save settings button
        document.getElementById('save-settings-btn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Database viewer button
        document.getElementById('db-view-btn')?.addEventListener('click', () => {
            this.viewDatabaseTable();
        });

        // Migration button
        document.getElementById('migrate-orphaned-btn')?.addEventListener('click', () => {
            this.runOrphanedAssignmentsMigration();
        });
    },

    /**
     * Checks migration status (for admin users)
     */
    async checkMigrations() {
        const migrationsSection = document.getElementById('migrations-section');
        if (!migrationsSection) return;

        // Only show for admins
        if (!Permissions.isAdmin) {
            migrationsSection.style.display = 'none';
            return;
        }

        try {
            const result = await window.api.admin.getOrphanedAssignmentsCount();
            const badge = document.getElementById('orphaned-count-badge');
            if (badge && result.success) {
                badge.textContent = `${result.count} verwaist`;
                badge.className = result.count > 0 ? 'badge badge-warning' : 'badge badge-success';
            }
        } catch (error) {
            console.error('Failed to check migrations:', error);
        }
    },

    /**
     * Runs the orphaned assignments migration
     */
    async runOrphanedAssignmentsMigration() {
        const btn = document.getElementById('migrate-orphaned-btn');
        if (!btn) return;

        btn.disabled = true;
        btn.textContent = 'Migration läuft...';

        try {
            const result = await window.api.admin.migrateOrphanedAssignments();
            if (result.success) {
                Toast.success(result.message);
                this.checkMigrations(); // Refresh count
            } else {
                Toast.error(result.error || 'Migration fehlgeschlagen');
            }
        } catch (error) {
            console.error('Migration error:', error);
            Toast.error('Migration fehlgeschlagen: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Migration ausführen';
        }
    },

    /**
     * Views database table content
     */
    async viewDatabaseTable() {
        const tableSelect = document.getElementById('db-table-select');
        const outputEl = document.getElementById('db-viewer-output');
        const tableName = tableSelect?.value;

        if (!tableName) {
            outputEl.textContent = 'Please select a table';
            return;
        }

        try {
            outputEl.textContent = 'Loading...';
            const result = await API.get(`/admin/database/query?sql=SELECT * FROM ${tableName} LIMIT 100`);
            
            if (result.success) {
                outputEl.textContent = JSON.stringify(result.results, null, 2);
            } else {
                outputEl.textContent = 'Error: ' + (result.error || 'Unknown error');
            }
        } catch (error) {
            outputEl.textContent = 'Error: ' + error.message;
        }
    },

    /**
     * Loads system settings
     */
    async loadSettings() {
        try {
            const result = await window.api.settings.getAll();
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
     * Saves system settings
     */
    async saveSettings() {
        try {
            const companyName = document.getElementById('settings-company-name').value;
            const timezone = document.getElementById('settings-timezone').value;
            const passingScore = parseInt(document.getElementById('settings-passing-score').value);

            // Update general settings
            await window.api.settings.set('general.companyName', companyName);
            await window.api.settings.set('general.timezone', timezone);

            // Update quality settings
            await window.api.settings.set('quality.passingScore', passingScore);

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
