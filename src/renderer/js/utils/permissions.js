/**
 * Permission Utilities
 * Handles permission checking and UI visibility based on user role
 */

const Permissions = {
    currentUser: null,

    /**
     * Sets the current user and updates UI
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
     * Gets current user ID
     */
    getUserId() {
        return this.currentUser?.id || null;
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
        
        return this.currentUser.role.permissions?.includes(permission) || false;
    },

    /**
     * Checks if the current user is an admin
     */
    isAdmin() {
        return this.currentUser?.role?.isAdmin || false;
    },

    /**
     * Gets user's role name
     */
    getRoleName() {
        return this.currentUser?.role?.name || 'Unknown';
    },

    /**
     * Updates the entire UI based on permissions
     */
    updateUI() {
        this.updateNavigation();
        this.updateAdminSections();
        this.updateActionButtons();
        this.updateViewElements();
    },

    /**
     * Updates navigation items based on permissions
     */
    updateNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-permission]');
        
        navItems.forEach(item => {
            const permission = item.dataset.permission;
            const hasAccess = this.hasPermission(permission);
            // Hide completely - not just disable
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
        this.toggleElement('add-user-btn', 'user_create');
        this.toggleElement('export-users-btn', 'user_export');
        
        // Ticket buttons
        this.toggleElement('add-ticket-btn', 'ticket_create');
        this.toggleElement('export-tickets-btn', 'ticket_export');
        
        // Quality buttons
        this.toggleElement('add-quality-btn', 'quality_create');
        this.toggleElement('manage-categories-btn', 'quality_manage_categories');
        this.toggleElement('export-quality-btn', 'quality_export');
        
        // Role buttons
        this.toggleElement('add-role-btn', 'role_create');
    },

    /**
     * Updates view-specific elements
     */
    updateViewElements() {
        // Update any elements with data-permission attribute
        document.querySelectorAll('[data-permission]').forEach(el => {
            if (!el.classList.contains('nav-item')) {
                const permission = el.dataset.permission;
                el.style.display = this.hasPermission(permission) ? '' : 'none';
            }
        });

        // Update elements that require admin
        document.querySelectorAll('[data-require-admin]').forEach(el => {
            el.style.display = this.isAdmin() ? '' : 'none';
        });
    },

    /**
     * Toggles an element's visibility based on permission
     */
    toggleElement(elementId, permission) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = this.hasPermission(permission) ? '' : 'none';
        }
    },

    /**
     * Checks if user can perform action on an entity type
     */
    canCreate(entityType) {
        const createPermissions = {
            user: 'user_create',
            ticket: 'ticket_create',
            quality: 'quality_create',
            role: 'role_create'
        };
        return this.hasPermission(createPermissions[entityType]);
    },

    /**
     * Checks if user can edit an entity type
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
     * Checks if user can delete an entity type
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
     * Checks if user can assign tickets
     */
    canAssignTickets() {
        return this.hasPermission('ticket_assign');
    },

    /**
     * Checks if user can access integrations
     */
    canAccessIntegration(type) {
        const integrationPermissions = {
            sharepoint: 'integration_sharepoint',
            jira: 'integration_jira'
        };
        return this.hasPermission(integrationPermissions[type]) || this.hasPermission('admin_access');
    },

    /**
     * Creates action buttons for a table row based on permissions
     */
    createActionButtons(entityType, entityId, extraActions = []) {
        const actions = [];

        // View action (usually always allowed if they can see the table)
        actions.push({
            icon: 'view',
            title: 'View',
            className: 'btn-icon',
            action: 'view'
        });

        // Edit action
        if (this.canEdit(entityType)) {
            actions.push({
                icon: 'edit',
                title: 'Edit',
                className: 'btn-icon',
                action: 'edit'
            });
        }

        // Delete action
        if (this.canDelete(entityType)) {
            actions.push({
                icon: 'delete',
                title: 'Delete',
                className: 'btn-icon btn-danger',
                action: 'delete'
            });
        }

        // Extra actions
        for (const extra of extraActions) {
            if (!extra.permission || this.hasPermission(extra.permission)) {
                actions.push(extra);
            }
        }

        return actions;
    },

    /**
     * Gets a permission's display name
     */
    getPermissionName(permissionId) {
        const permissionNames = {
            'user_view': 'View Users',
            'user_create': 'Create Users',
            'user_edit': 'Edit Users',
            'user_delete': 'Delete Users',
            'user_export': 'Export Users',
            'ticket_view': 'View Own Tickets',
            'ticket_view_all': 'View All Tickets',
            'ticket_create': 'Create Tickets',
            'ticket_edit': 'Edit Tickets',
            'ticket_delete': 'Delete Tickets',
            'ticket_assign': 'Assign Tickets',
            'ticket_export': 'Export Tickets',
            'quality_view': 'View Own Evaluations',
            'quality_view_all': 'View All Evaluations',
            'quality_create': 'Create Evaluations',
            'quality_edit': 'Edit Evaluations',
            'quality_delete': 'Delete Evaluations',
            'quality_manage_categories': 'Manage Categories',
            'quality_export': 'Export Quality Data',
            'role_view': 'View Roles',
            'role_create': 'Create Roles',
            'role_edit': 'Edit Roles',
            'role_delete': 'Delete Roles',
            'settings_view': 'View Settings',
            'settings_edit': 'Edit Settings',
            'admin_access': 'Admin Panel Access',
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
