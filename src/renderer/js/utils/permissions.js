/**
 * Permission Utilities
 * Handles permission checking and UI visibility based on user role
 */

const Permissions = {
    currentUser: null,

    /**
     * Sets the current user
     */
    setUser(user) {
        this.currentUser = user;
        this.updateUI();
    },

    /**
     * Clears the current user
     */
    clearUser() {
        this.currentUser = null;
    },

    /**
     * Checks if the current user has a specific permission
     */
    hasPermission(permission) {
        if (!this.currentUser || !this.currentUser.role) {
            return false;
        }
        
        // Admins have all permissions
        if (this.currentUser.role.isAdmin) {
            return true;
        }
        
        return this.currentUser.role.permissions.includes(permission);
    },

    /**
     * Checks if the current user is an admin
     */
    isAdmin() {
        return this.currentUser?.role?.isAdmin || false;
    },

    /**
     * Updates the UI based on permissions
     */
    updateUI() {
        // Update navigation visibility
        this.updateNavigation();
        
        // Update admin-only sections
        this.updateAdminSections();
        
        // Update action buttons
        this.updateActionButtons();
    },

    /**
     * Updates navigation items based on permissions
     */
    updateNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-permission]');
        
        navItems.forEach(item => {
            const permission = item.dataset.permission;
            const hasAccess = this.hasPermission(permission);
            item.style.display = hasAccess ? '' : 'none';
        });

        // Show/hide admin navigation section
        const adminNavSection = document.getElementById('admin-nav-section');
        if (adminNavSection) {
            const hasAdminAccess = this.hasPermission('role_view') || 
                                   this.hasPermission('admin_access');
            adminNavSection.style.display = hasAdminAccess ? '' : 'none';
        }
    },

    /**
     * Updates admin-only sections
     */
    updateAdminSections() {
        const adminSections = document.querySelectorAll('[data-admin-only]');
        
        adminSections.forEach(section => {
            section.style.display = this.isAdmin() ? '' : 'none';
        });

        // Admin settings section
        const adminSettingsSection = document.getElementById('admin-settings-section');
        if (adminSettingsSection) {
            adminSettingsSection.style.display = this.isAdmin() ? '' : 'none';
        }
    },

    /**
     * Updates action buttons based on permissions
     */
    updateActionButtons() {
        // User management buttons
        this.toggleButton('add-user-btn', 'user_create');
        this.toggleButton('export-users-btn', 'user_export');
        
        // Ticket buttons
        this.toggleButton('add-ticket-btn', 'ticket_create');
        this.toggleButton('export-tickets-btn', 'ticket_export');
        
        // Quality buttons
        this.toggleButton('add-quality-btn', 'quality_create');
        this.toggleButton('manage-categories-btn', 'quality_manage_categories');
        this.toggleButton('export-quality-btn', 'quality_export');
        
        // Role buttons
        this.toggleButton('add-role-btn', 'role_create');
    },

    /**
     * Toggles a button's visibility based on permission
     */
    toggleButton(buttonId, permission) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.style.display = this.hasPermission(permission) ? '' : 'none';
        }
    },

    /**
     * Checks if user can perform action on an entity
     */
    canEdit(entityType) {
        const editPermissions = {
            user: 'user_edit',
            ticket: 'ticket_edit',
            quality: 'quality_edit',
            role: 'role_edit'
        };
        return this.hasPermission(editPermissions[entityType]);
    },

    /**
     * Checks if user can delete an entity
     */
    canDelete(entityType) {
        const deletePermissions = {
            user: 'user_delete',
            ticket: 'ticket_delete',
            quality: 'quality_delete',
            role: 'role_delete'
        };
        return this.hasPermission(deletePermissions[entityType]);
    },

    /**
     * Checks if user can view all entities (not just their own)
     */
    canViewAll(entityType) {
        const viewAllPermissions = {
            ticket: 'ticket_view_all',
            quality: 'quality_view_all'
        };
        return this.hasPermission(viewAllPermissions[entityType]);
    },

    /**
     * Gets a list of permission names for a permission ID
     */
    getPermissionName(permissionId) {
        const permissionNames = {
            'user_view': 'View Users',
            'user_create': 'Create Users',
            'user_edit': 'Edit Users',
            'user_delete': 'Delete Users',
            'user_export': 'Export Users',
            'user_import': 'Import Users',
            'ticket_view': 'View Tickets',
            'ticket_view_all': 'View All Tickets',
            'ticket_create': 'Create Tickets',
            'ticket_edit': 'Edit Tickets',
            'ticket_delete': 'Delete Tickets',
            'ticket_assign': 'Assign Tickets',
            'ticket_bulk_update': 'Bulk Update Tickets',
            'ticket_export': 'Export Tickets',
            'quality_view': 'View Quality Reports',
            'quality_view_all': 'View All Reports',
            'quality_create': 'Create Evaluations',
            'quality_edit': 'Edit Evaluations',
            'quality_delete': 'Delete Evaluations',
            'quality_manage_categories': 'Manage Categories',
            'quality_manage_templates': 'Manage Templates',
            'quality_export': 'Export Quality Data',
            'role_view': 'View Roles',
            'role_create': 'Create Roles',
            'role_edit': 'Edit Roles',
            'role_delete': 'Delete Roles',
            'settings_view': 'View Settings',
            'settings_edit': 'Edit Settings',
            'admin_access': 'Admin Access',
            'integration_sharepoint': 'SharePoint Integration',
            'integration_jira': 'JIRA Integration'
        };
        
        return permissionNames[permissionId] || permissionId;
    },

    /**
     * Groups permissions by module
     */
    getPermissionsByModule(permissions) {
        const modules = {
            users: [],
            tickets: [],
            quality: [],
            roles: [],
            settings: [],
            integrations: [],
            admin: []
        };

        for (const perm of permissions) {
            if (perm.startsWith('user_')) modules.users.push(perm);
            else if (perm.startsWith('ticket_')) modules.tickets.push(perm);
            else if (perm.startsWith('quality_')) modules.quality.push(perm);
            else if (perm.startsWith('role_')) modules.roles.push(perm);
            else if (perm.startsWith('settings_')) modules.settings.push(perm);
            else if (perm.startsWith('integration_')) modules.integrations.push(perm);
            else if (perm.startsWith('admin_')) modules.admin.push(perm);
        }

        return modules;
    }
};

// Export for use in other modules
window.Permissions = Permissions;
