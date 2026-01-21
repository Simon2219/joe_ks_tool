/**
 * Admin Panel View
 * Handles system settings, database viewer, and migrations (Admin only)
 */

const AdminPanelView = {
    settings: {},

    /**
     * Initializes the admin panel view
     */
    async init() {
        // Verify admin access on frontend
        if (!Permissions.isAdmin) {
            Toast.error('Admin access required');
            window.App.navigateTo('dashboard');
            return;
        }

        this.bindEvents();
        await this.loadSettings();
        await this.checkMigrations();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Save settings button
        document.getElementById('admin-save-settings-btn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Database viewer button
        document.getElementById('admin-db-view-btn')?.addEventListener('click', () => {
            this.viewDatabaseTable();
        });

        // Migration button
        document.getElementById('admin-migrate-orphaned-btn')?.addEventListener('click', () => {
            this.runOrphanedAssignmentsMigration();
        });
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
            Toast.error('Failed to load settings');
        }
    },

    /**
     * Populates system settings fields
     */
    populateSystemSettings() {
        if (this.settings.general) {
            const companyNameEl = document.getElementById('admin-company-name');
            const timezoneEl = document.getElementById('admin-timezone');
            
            if (companyNameEl) companyNameEl.value = this.settings.general.companyName || '';
            if (timezoneEl) timezoneEl.value = this.settings.general.timezone || 'UTC';
        }
        
        if (this.settings.quality) {
            const passingScoreEl = document.getElementById('admin-passing-score');
            if (passingScoreEl) passingScoreEl.value = this.settings.quality.passingScore || 80;
        }
    },

    /**
     * Saves system settings
     */
    async saveSettings() {
        try {
            const companyName = document.getElementById('admin-company-name')?.value || '';
            const timezone = document.getElementById('admin-timezone')?.value || 'UTC';
            const passingScore = parseInt(document.getElementById('admin-passing-score')?.value) || 80;

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
     * Views database table content
     */
    async viewDatabaseTable() {
        const tableSelect = document.getElementById('admin-db-table-select');
        const outputEl = document.getElementById('admin-db-viewer-output');
        const tableName = tableSelect?.value;

        if (!tableName) {
            if (outputEl) outputEl.textContent = 'Please select a table';
            return;
        }

        try {
            if (outputEl) outputEl.textContent = 'Loading...';
            const result = await API.get(`/admin/database/query?sql=SELECT * FROM ${tableName} LIMIT 100`);
            
            if (result.success) {
                if (outputEl) outputEl.textContent = JSON.stringify(result.results, null, 2);
            } else {
                if (outputEl) outputEl.textContent = 'Error: ' + (result.error || 'Unknown error');
            }
        } catch (error) {
            if (outputEl) outputEl.textContent = 'Error: ' + error.message;
        }
    },

    /**
     * Checks migration status
     */
    async checkMigrations() {
        try {
            const result = await window.api.admin.getOrphanedAssignmentsCount();
            const badge = document.getElementById('admin-orphaned-count-badge');
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
        const btn = document.getElementById('admin-migrate-orphaned-btn');
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
     * Refreshes the view
     */
    async refresh() {
        await this.loadSettings();
        await this.checkMigrations();
    }
};

// Export for use in other modules
window.AdminPanelView = AdminPanelView;
