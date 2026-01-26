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
                                   this.hasPermission('teams_view') ||
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
        
        // Knowledge Check buttons
        this.toggleElement('add-kc-question-btn', 'kc_questions_create');
        this.toggleElement('add-kc-category-btn', 'kc_categories_create');
        this.toggleElement('add-kc-test-btn', 'kc_tests_create');
        this.toggleElement('export-kc-results-btn', 'kc_results_view');
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
            role: 'role_create',
            kcQuestion: 'kc_questions_create',
            kcCategory: 'kc_categories_create',
            kcTest: 'kc_tests_create'
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
            role: 'role_edit',
            kcQuestion: 'kc_questions_edit',
            kcCategory: 'kc_categories_edit',
            kcTest: 'kc_tests_edit'
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
            role: 'role_delete',
            kcQuestion: 'kc_questions_delete',
            kcCategory: 'kc_categories_delete',
            kcTest: 'kc_tests_delete',
            kcResult: 'kc_results_delete'
        };
        return this.hasPermission(deletePermissions[entityType]);
    },

    /**
     * Checks if user can view entities of a type
     */
    canView(entityType) {
        const viewPermissions = {
            kcQuestion: 'kc_questions_view',
            kcTest: 'kc_tests_view',
            kcResult: 'kc_results_view'
        };
        return this.hasPermission(viewPermissions[entityType]);
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
     * Knowledge Check specific permission helpers
     */
    canAccessKnowledgeCheck() {
        return this.hasPermission('kc_view');
    },

    canAccessKCQuestions() {
        return this.hasPermission('kc_questions_view');
    },

    canAccessKCTests() {
        return this.hasPermission('kc_tests_view');
    },

    canAccessKCResults() {
        return this.hasPermission('kc_results_view');
    },

    canAccessKCArchive() {
        return this.hasPermission('kc_archive_access');
    },

    canRestoreFromArchive() {
        return this.hasPermission('kc_archive_access');
    },

    canPermanentDelete() {
        return this.hasPermission('kc_archive_access');
    },

    canAccessAssignedTests() {
        return this.hasPermission('kc_assigned_view');
    },

    canAssignTests() {
        return this.hasPermission('kc_assign_tests');
    },

    /**
     * Quality System v2 permission helpers
     */
    canAccessQualitySystem() {
        return this.hasPermission('qs_view');
    },

    canAccessQSTeam(teamId) {
        // Can access if: admin, has view_all permission, or user is assigned to this team
        if (this.isAdmin()) return true;
        if (this.hasPermission('qs_tracking_view_all')) return true;
        return this.currentUser?.teamId === teamId;
    },

    canAccessQSTracking() {
        return this.hasPermission('qs_tracking_view');
    },

    canViewAllQSTeams() {
        return this.hasPermission('qs_tracking_view_all');
    },

    canCreateQSTasks() {
        return this.hasPermission('qs_tasks_create');
    },

    canEditQSTasks() {
        return this.hasPermission('qs_tasks_edit');
    },

    canDeleteQSTasks() {
        return this.hasPermission('qs_tasks_delete');
    },

    canViewQSTasks() {
        return this.hasPermission('qs_tasks_view');
    },

    canCreateQSChecks() {
        return this.hasPermission('qs_checks_create');
    },

    canEditQSChecks() {
        return this.hasPermission('qs_checks_edit');
    },

    canDeleteQSChecks() {
        return this.hasPermission('qs_checks_delete');
    },

    canViewQSChecks() {
        return this.hasPermission('qs_checks_view');
    },

    canConductQSEvaluations() {
        return this.hasPermission('qs_evaluate');
    },

    canCreateRandomEvaluations() {
        return this.hasPermission('qs_evaluate_random');
    },

    canViewOwnQSResults() {
        return this.hasPermission('qs_results_view_own');
    },

    canViewTeamQSResults() {
        return this.hasPermission('qs_results_view_team');
    },

    canDeleteQSResults() {
        return this.hasPermission('qs_results_delete');
    },

    canViewSupervisorNotes() {
        return this.hasPermission('qs_supervisor_notes_view');
    },

    canManageQSSettings() {
        return this.hasPermission('qs_settings_manage');
    },

    canManageQSQuotas() {
        return this.hasPermission('qs_quotas_manage');
    },

    canConfigureQSTeamRoles() {
        return this.hasPermission('qs_team_config_manage');
    },

    /**
     * Shorthand for hasPermission
     */
    has(permission) {
        return this.hasPermission(permission);
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
            'quality_manage': 'Manage Categories',
            'quality_export': 'Export Quality Data',
            'role_view': 'View Roles',
            'role_create': 'Create Roles',
            'role_edit': 'Edit Roles',
            'role_delete': 'Delete Roles',
            'settings_view': 'View Settings',
            'settings_edit': 'Edit Settings',
            'admin_access': 'Admin Panel Access',
            'integration_sharepoint': 'SharePoint Integration',
            'integration_jira': 'JIRA Integration',
            'integration_access': 'Integration Access',
            // Knowledge Check permissions - Categories
            'kc_categories_delete': 'Delete Categories',
            'kc_categories_create': 'Create Categories',
            'kc_categories_edit': 'Edit Categories',
            // Knowledge Check permissions - Questions
            'kc_questions_delete': 'Delete Questions',
            'kc_questions_create': 'Create Questions',
            'kc_questions_edit': 'Edit Questions',
            'kc_questions_view': 'View Question Catalog',
            // Knowledge Check permissions - Tests
            'kc_tests_delete': 'Delete Tests',
            'kc_tests_create': 'Create Tests',
            'kc_tests_edit': 'Edit Tests',
            'kc_tests_view': 'View Test Catalog',
            // Knowledge Check permissions - Results
            'kc_results_delete': 'Delete Test Results',
            'kc_results_evaluate': 'Evaluate Test Results',
            'kc_results_view': 'View Test Results',
            // Knowledge Check permissions - Test Runs & Assignments
            'kc_assign_tests': 'Create Test Run',
            'kc_assigned_view': 'View Assigned Tests',
            // Knowledge Check permissions - Archive
            'kc_archive_access': 'Archive Access',
            // Knowledge Check permissions - Tab
            'kc_view': 'View Knowledge Check Tab',
            // Teams Management
            'teams_view': 'View Teams',
            'teams_create': 'Create Teams',
            'teams_edit': 'Edit Teams',
            'teams_delete': 'Delete Teams',
            'teams_permissions_manage': 'Manage Team Permissions',
            // Quality System v2 permissions - Tab
            'qs_view': 'View Quality System Tab',
            // Quality System v2 permissions - Tracking
            'qs_tracking_view': 'View Quality Tracking',
            'qs_tracking_view_all': 'View All Teams in Tracking',
            // Quality System v2 permissions - Tasks
            'qs_tasks_delete': 'Delete Quality Tasks',
            'qs_tasks_create': 'Create Quality Tasks',
            'qs_tasks_edit': 'Edit Quality Tasks',
            'qs_tasks_view': 'View Task Catalog',
            // Quality System v2 permissions - Checks
            'qs_checks_delete': 'Delete Quality Checks',
            'qs_checks_create': 'Create Quality Checks',
            'qs_checks_edit': 'Edit Quality Checks',
            'qs_checks_view': 'View Check Catalog',
            // Quality System v2 permissions - Categories
            'qs_categories_delete': 'Delete QS Categories',
            'qs_categories_create': 'Create QS Categories',
            'qs_categories_edit': 'Edit QS Categories',
            // Quality System v2 permissions - Evaluations
            'qs_evaluate': 'Conduct Evaluations',
            'qs_evaluate_random': 'Create Random Evaluations',
            // Quality System v2 permissions - Results
            'qs_results_view_own': 'View Own Results',
            'qs_results_view_team': 'View Team Results',
            'qs_results_delete': 'Delete Evaluation Results',
            // Quality System v2 permissions - Supervisor Notes
            'qs_supervisor_notes_view': 'View Supervisor Notes',
            // Quality System v2 permissions - Management
            'qs_settings_manage': 'Manage QS Settings',
            'qs_quotas_manage': 'Manage Evaluation Quotas',
            'qs_team_config_manage': 'Configure Team Roles'
        };
        
        return permissionNames[permissionId] || permissionId;
    },

    /**
     * Groups permissions by module and sorts them in the proper order
     */
    getPermissionsByModule(permissions) {
        const modules = {
            users: [],
            teams: [],
            tickets: [],
            quality: [],
            qualitySystem: [],
            knowledgeCheck: [],
            roles: [],
            settings: [],
            integrations: [],
            admin: []
        };

        for (const perm of permissions) {
            if (perm.startsWith('user_')) modules.users.push(perm);
            else if (perm.startsWith('teams_')) modules.teams.push(perm);
            else if (perm.startsWith('ticket_')) modules.tickets.push(perm);
            else if (perm.startsWith('quality_')) modules.quality.push(perm);
            else if (perm.startsWith('qs_')) modules.qualitySystem.push(perm);
            else if (perm.startsWith('kc_')) modules.knowledgeCheck.push(perm);
            else if (perm.startsWith('role_')) modules.roles.push(perm);
            else if (perm.startsWith('settings_')) modules.settings.push(perm);
            else if (perm.startsWith('integration_')) modules.integrations.push(perm);
            else if (perm.startsWith('admin_')) modules.admin.push(perm);
        }

        // Sort Teams permissions
        const teamsOrder = ['teams_view', 'teams_create', 'teams_edit', 'teams_delete', 'teams_permissions_manage'];
        modules.teams.sort((a, b) => teamsOrder.indexOf(a) - teamsOrder.indexOf(b));

        // Sort Quality System permissions
        const qsOrder = [
            'qs_view',
            'qs_tracking_view', 'qs_tracking_view_all',
            'qs_tasks_delete', 'qs_tasks_create', 'qs_tasks_edit', 'qs_tasks_view',
            'qs_checks_delete', 'qs_checks_create', 'qs_checks_edit', 'qs_checks_view',
            'qs_categories_delete', 'qs_categories_create', 'qs_categories_edit',
            'qs_evaluate', 'qs_evaluate_random',
            'qs_results_view_own', 'qs_results_view_team', 'qs_results_delete',
            'qs_supervisor_notes_view',
            'qs_settings_manage', 'qs_quotas_manage', 'qs_team_config_manage'
        ];
        
        modules.qualitySystem.sort((a, b) => {
            const indexA = qsOrder.indexOf(a);
            const indexB = qsOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        // Sort Knowledge Check permissions in the proper order (by importance/group)
        const kcOrder = [
            // Categories (Delete > Create > Edit)
            'kc_categories_delete', 'kc_categories_create', 'kc_categories_edit',
            // Questions (Delete > Create > Edit > View)
            'kc_questions_delete', 'kc_questions_create', 'kc_questions_edit', 'kc_questions_view',
            // Tests (Delete > Create > Edit > View)
            'kc_tests_delete', 'kc_tests_create', 'kc_tests_edit', 'kc_tests_view',
            // Results (Delete > Evaluate > View)
            'kc_results_delete', 'kc_results_evaluate', 'kc_results_view',
            // Test Runs & Assignments
            'kc_assign_tests', 'kc_assigned_view',
            // Archive
            'kc_archive_access',
            // Tab Access
            'kc_view'
        ];
        
        modules.knowledgeCheck.sort((a, b) => {
            const indexA = kcOrder.indexOf(a);
            const indexB = kcOrder.indexOf(b);
            // If not found in order array, put at end
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        return modules;
    }
};

// Export for use in other modules
window.Permissions = Permissions;
