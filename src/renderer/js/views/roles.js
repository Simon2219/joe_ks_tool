/**
 * Roles View
 * Handles role and permission management
 */

const RolesView = {
    roles: [],
    allPermissions: [],
    eventsBound: false,

    /**
     * Initializes the roles view
     */
    async init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        await this.loadPermissions();
        await this.loadRoles();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        document.getElementById('add-role-btn')?.addEventListener('click', () => {
            this.showRoleForm();
        });
    },

    /**
     * Loads all permissions
     */
    async loadPermissions() {
        try {
            const result = await window.api.roles.getPermissions();
            if (result.success) {
                this.allPermissions = result.permissions;
            }
        } catch (error) {
            console.error('Failed to load permissions:', error);
        }
    },

    /**
     * Loads all roles
     */
    async loadRoles() {
        try {
            const result = await window.api.roles.getAll();
            if (result.success) {
                this.roles = result.roles;
                this.renderRoles();
            } else {
                Toast.error(result.error || 'Failed to load roles');
            }
        } catch (error) {
            console.error('Failed to load roles:', error);
            Toast.error('Failed to load roles');
        }
    },

    /**
     * Renders the roles grid
     */
    renderRoles() {
        const container = document.getElementById('roles-grid');
        if (!container) return;

        if (this.roles.length === 0) {
            container.innerHTML = '<p class="empty-state">No roles found</p>';
            return;
        }

        container.innerHTML = this.roles.map(role => this.renderRoleCard(role)).join('');

        // Add click handlers
        container.querySelectorAll('.btn-edit-role').forEach(btn => {
            btn.addEventListener('click', () => this.editRole(btn.dataset.id));
        });

        container.querySelectorAll('.btn-delete-role').forEach(btn => {
            btn.addEventListener('click', () => this.deleteRole(btn.dataset.id));
        });
    },

    /**
     * Renders a single role card
     */
    renderRoleCard(role) {
        const canEdit = Permissions.canEdit('role');
        const canDelete = Permissions.canDelete('role') && !role.isSystem;
        
        // Handle both camelCase and snake_case
        const isAdmin = role.isAdmin || role.is_admin;
        const isSupervisor = role.isSupervisor || role.is_supervisor;
        const isManagement = role.isManagement || role.is_management;
        const isSystem = role.isSystem || role.is_system;

        return `
            <div class="role-card" data-id="${role.id}">
                <div class="role-card-header">
                    <div class="role-info">
                        <h3>${Helpers.escapeHtml(role.name)}</h3>
                        <p>${Helpers.escapeHtml(role.description || 'No description')}</p>
                    </div>
                    <div class="role-meta">
                        ${isAdmin ? '<span class="badge badge-warning">Admin</span>' : ''}
                        ${isSupervisor ? '<span class="badge badge-info">Supervisor</span>' : ''}
                        ${isManagement ? '<span class="badge badge-purple">Management</span>' : ''}
                        ${isSystem ? '<span class="badge badge-secondary">System</span>' : ''}
                    </div>
                </div>
                <div class="role-card-body">
                    <h4>Permissions (${role.permissions.length})</h4>
                    <div class="permissions-list">
                        ${role.permissions.slice(0, 10).map(p => `
                            <span class="permission-tag">${Permissions.getPermissionName(p)}</span>
                        `).join('')}
                        ${role.permissions.length > 10 ? `
                            <span class="permission-tag">+${role.permissions.length - 10} more</span>
                        ` : ''}
                    </div>
                </div>
                <div class="role-card-footer">
                    <span style="color: var(--text-muted); font-size: 0.875rem;">
                        ${role.userCount || 0} user(s)
                    </span>
                    <div>
                        ${canEdit ? `
                            <button class="btn btn-secondary btn-sm btn-edit-role" data-id="${role.id}">
                                Edit
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="btn btn-danger btn-sm btn-delete-role" data-id="${role.id}">
                                Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Gets a display-friendly module name
     */
    getModuleDisplayName(module) {
        const moduleNames = {
            users: 'Users',
            teams: 'Teams',
            tickets: 'Tickets',
            quality: 'Quality (Legacy)',
            qualitySystem: 'Quality System v2',
            knowledgeCheck: 'Knowledge Check',
            roles: 'Roles',
            settings: 'Settings',
            integrations: 'Integrations',
            admin: 'Administration'
        };
        return moduleNames[module] || module;
    },

    /**
     * Shows the role form modal
     */
    async showRoleForm(role = null) {
        const isEdit = !!role;
        const title = isEdit ? 'Edit Role' : 'Create New Role';

        // Group permissions by module
        const grouped = Permissions.getPermissionsByModule(this.allPermissions.map(p => p.id));

        // Define the order of modules for display
        const moduleOrder = ['users', 'teams', 'tickets', 'quality', 'qualitySystem', 'knowledgeCheck', 'roles', 'settings', 'integrations', 'admin'];

        const formHtml = `
            <form id="role-form">
                <div class="form-group">
                    <label for="role-name">Role Name *</label>
                    <input type="text" id="role-name" name="name" class="form-input" 
                        value="${role?.name || ''}" required 
                        ${role?.isSystem ? 'readonly' : ''}>
                </div>
                
                <div class="form-group">
                    <label for="role-description">Description</label>
                    <textarea id="role-description" name="description" class="form-textarea" rows="2">${role?.description || ''}</textarea>
                </div>
                
                ${!role?.isSystem ? `
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" name="isAdmin" ${role?.isAdmin || role?.is_admin ? 'checked' : ''}>
                            <span>Administrator Role (full access)</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" name="isSupervisor" ${role?.isSupervisor || role?.is_supervisor ? 'checked' : ''}>
                            <span>Supervisor Role (can evaluate team members)</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" name="isManagement" ${role?.isManagement || role?.is_management ? 'checked' : ''}>
                            <span>Management Role (overview across teams)</span>
                        </label>
                    </div>
                ` : ''}
                
                <h4 style="margin: var(--space-lg) 0 var(--space-md);">Permissions</h4>
                
                ${moduleOrder.filter(module => grouped[module]?.length > 0).map(module => {
                    const perms = grouped[module];
                    return `
                    <div class="form-group" style="margin-bottom: var(--space-lg);">
                        <strong>${this.getModuleDisplayName(module)}</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: var(--space-sm); margin-top: var(--space-sm);">
                            ${perms.map(permId => {
                                const checked = role?.permissions?.includes(permId) ? 'checked' : '';
                                return `
                                    <label class="form-checkbox" style="flex: 0 0 calc(50% - var(--space-sm));">
                                        <input type="checkbox" name="permissions" value="${permId}" ${checked}>
                                        <span>${Permissions.getPermissionName(permId)}</span>
                                    </label>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `}).join('')}
            </form>
        `;

        // Convert HTML string to DOM node
        const template = document.createElement('template');
        template.innerHTML = formHtml.trim();
        const content = template.content.firstElementChild || template.content;

        // Footer buttons
        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.gap = 'var(--space-sm)';
        footer.style.justifyContent = 'flex-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => Modal.close());

        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Role';
        submitBtn.addEventListener('click', async () => {
            const form = document.getElementById('role-form');
            const nameInput = form.querySelector('[name="name"]');
            
            if (!nameInput.value.trim()) {
                Toast.error('Role name is required');
                return;
            }

            const formData = new FormData(form);
            const permissions = formData.getAll('permissions');

            const roleData = {
                name: formData.get('name'),
                description: formData.get('description'),
                isAdmin: formData.get('isAdmin') === 'on',
                isSupervisor: formData.get('isSupervisor') === 'on',
                isManagement: formData.get('isManagement') === 'on',
                permissions
            };

            if (isEdit) {
                await this.updateRole(role.id, roleData);
            } else {
                await this.createRole(roleData);
            }
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title,
            content,
            footer,
            size: 'lg'
        });
    },

    /**
     * Creates a new role
     */
    async createRole(roleData) {
        try {
            const result = await window.api.roles.create(roleData);
            if (result.success) {
                Toast.success('Role created successfully');
                Modal.close();
                await this.loadRoles();
            } else {
                Toast.error(result.error || 'Failed to create role');
            }
        } catch (error) {
            console.error('Failed to create role:', error);
            Toast.error('Failed to create role');
        }
    },

    /**
     * Edits an existing role
     */
    async editRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (role) {
            await this.showRoleForm(role);
        }
    },

    /**
     * Updates a role
     */
    async updateRole(roleId, roleData) {
        try {
            const result = await window.api.roles.update(roleId, roleData);
            if (result.success) {
                Toast.success('Role updated successfully');
                Modal.close();
                await this.loadRoles();
            } else {
                Toast.error(result.error || 'Failed to update role');
            }
        } catch (error) {
            console.error('Failed to update role:', error);
            Toast.error('Failed to update role');
        }
    },

    /**
     * Deletes a role
     */
    async deleteRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (!role) return;

        const confirmed = await Modal.confirm({
            title: 'Delete Role',
            message: `Are you sure you want to delete the "${role.name}" role? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const result = await window.api.roles.delete(roleId);
                if (result.success) {
                    Toast.success('Role deleted successfully');
                    await this.loadRoles();
                } else {
                    Toast.error(result.error || 'Failed to delete role');
                }
            } catch (error) {
                console.error('Failed to delete role:', error);
                Toast.error('Failed to delete role');
            }
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadRoles();
    }
};

// Export for use in other modules
window.RolesView = RolesView;
