/**
 * Users View
 * Handles user management functionality
 */

const UsersView = {
    users: [],
    roles: [],
    teams: [],
    filters: {
        role: '',
        team: '',
        status: ''
    },
    eventsBound: false,

    /**
     * Initializes the users view
     */
    async init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        await Promise.all([this.loadRoles(), this.loadTeams()]);
        await this.loadUsers();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Add user button
        document.getElementById('add-user-btn')?.addEventListener('click', () => {
            this.showUserForm();
        });

        // Export button
        document.getElementById('export-users-btn')?.addEventListener('click', () => {
            this.exportUsers();
        });

        // Filters
        document.getElementById('filter-user-role')?.addEventListener('change', (e) => {
            this.filters.role = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filter-user-team')?.addEventListener('change', (e) => {
            this.filters.team = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filter-user-status')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });
    },

    /**
     * Loads roles for dropdown
     */
    async loadRoles() {
        try {
            const result = await window.api.roles.getAll();
            if (result.success) {
                this.roles = result.roles;
                this.populateRoleFilter();
            }
        } catch (error) {
            console.error('Failed to load roles:', error);
        }
    },

    /**
     * Loads teams for dropdown
     */
    async loadTeams() {
        try {
            const result = await window.api.teams.getAll();
            if (result.success) {
                this.teams = result.teams;
                this.populateTeamFilter();
            }
        } catch (error) {
            console.error('Failed to load teams:', error);
        }
    },

    /**
     * Populates the role filter dropdown
     */
    populateRoleFilter() {
        const select = document.getElementById('filter-user-role');
        if (!select) return;

        select.innerHTML = '<option value="">All Roles</option>';
        this.roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.name;
            select.appendChild(option);
        });
    },

    /**
     * Populates the team filter dropdown
     */
    populateTeamFilter() {
        const select = document.getElementById('filter-user-team');
        if (!select) return;

        select.innerHTML = '<option value="">All Teams</option>';
        this.teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            select.appendChild(option);
        });
    },

    /**
     * Loads all users
     */
    async loadUsers() {
        try {
            const result = await window.api.users.getAll();
            if (result.success) {
                this.users = result.users;
                this.renderTable();
            } else {
                Toast.error(result.error || 'Failed to load users');
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            Toast.error('Failed to load users');
        }
    },

    /**
     * Applies filters to the user list
     */
    applyFilters() {
        this.renderTable();
    },

    /**
     * Gets filtered users
     */
    getFilteredUsers() {
        return this.users.filter(user => {
            if (this.filters.role && user.roleId !== this.filters.role && user.role_id !== this.filters.role) {
                return false;
            }
            if (this.filters.team && user.teamId !== this.filters.team && user.team_id !== this.filters.team) {
                return false;
            }
            if (this.filters.status) {
                const isActive = this.filters.status === 'active';
                const userActive = user.isActive !== undefined ? user.isActive : !!user.is_active;
                if (userActive !== isActive) return false;
            }
            return true;
        });
    },

    /**
     * Renders the users table
     */
    renderTable() {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        const filteredUsers = this.getFilteredUsers();

        if (filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">No users found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredUsers.map(user => this.renderUserRow(user)).join('');

        // Add click handlers for actions
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.editUser(btn.dataset.id));
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.deleteUser(btn.dataset.id));
        });
    },

    /**
     * Renders a single user row
     */
    renderUserRow(user) {
        const firstName = user.firstName || user.first_name || '';
        const lastName = user.lastName || user.last_name || '';
        const initials = Helpers.getInitials(firstName, lastName);
        const fullName = `${firstName} ${lastName}`;
        const isActive = user.isActive !== undefined ? user.isActive : !!user.is_active;
        const statusClass = isActive ? 'badge-success' : 'badge-secondary';
        const statusText = isActive ? 'Active' : 'Inactive';
        const lastLogin = (user.lastLogin || user.last_login) ? Helpers.timeAgo(user.lastLogin || user.last_login) : 'Never';
        const roleName = user.roleName || user.role_name || '';
        const teamName = user.teamName || user.team_name || '';

        const canEdit = Permissions.canEdit('user');
        const canDelete = Permissions.canDelete('user');

        return `
            <tr data-id="${user.id}">
                <td>
                    <div class="user-cell">
                        <div class="avatar">${Helpers.escapeHtml(initials)}</div>
                        <div class="user-info">
                            <span class="name">${Helpers.escapeHtml(fullName)}</span>
                            <span class="username">@${Helpers.escapeHtml(user.username)}</span>
                        </div>
                    </div>
                </td>
                <td>${Helpers.escapeHtml(user.email)}</td>
                <td>${Helpers.escapeHtml(roleName)}</td>
                <td>${Helpers.escapeHtml(teamName || '-')}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${lastLogin}</td>
                <td>
                    <div class="table-actions">
                        ${canEdit ? `
                            <button class="btn-icon btn-edit" data-id="${user.id}" title="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="btn-icon btn-delete" data-id="${user.id}" title="Delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    },

    /**
     * Shows the user form modal
     */
    async showUserForm(user = null) {
        const isEdit = !!user;
        const title = isEdit ? 'Edit User' : 'Add New User';

        const fields = [
            { 
                name: 'username', 
                label: 'Username', 
                type: 'text', 
                required: true,
                placeholder: 'Enter username',
                readonly: isEdit
            },
            { 
                name: 'email', 
                label: 'Email', 
                type: 'email', 
                required: true,
                placeholder: 'user@example.com'
            },
            { 
                name: 'firstName', 
                label: 'First Name', 
                type: 'text', 
                required: true,
                placeholder: 'Enter first name'
            },
            { 
                name: 'lastName', 
                label: 'Last Name', 
                type: 'text', 
                required: true,
                placeholder: 'Enter last name'
            },
            { 
                name: 'password', 
                label: isEdit ? 'New Password (leave blank to keep current)' : 'Password', 
                type: 'password', 
                required: !isEdit,
                placeholder: isEdit ? 'Leave blank to keep current password' : 'Minimum 8 characters'
            },
            { 
                name: 'roleId', 
                label: 'Role', 
                type: 'select', 
                required: true,
                options: this.roles.map(r => ({ value: r.id, label: r.name })),
                placeholder: 'Select role'
            },
            { 
                name: 'teamId', 
                label: 'Team', 
                type: 'select',
                options: [{ value: '', label: 'No Team' }, ...this.teams.map(t => ({ value: t.id, label: t.name }))],
                placeholder: 'Select team'
            },
            { 
                name: 'phone', 
                label: 'Phone', 
                type: 'text',
                placeholder: 'Phone number'
            },
            { 
                name: 'hireDate', 
                label: 'Hire Date', 
                type: 'date'
            },
            { 
                name: 'isActive', 
                label: 'Active', 
                type: 'checkbox',
                default: true
            }
        ];

        const result = await Modal.form({
            title,
            fields,
            data: user || { isActive: true },
            submitText: isEdit ? 'Save Changes' : 'Create User',
            size: 'lg',
            validate: (data) => {
                // Skip username validation for edit (it's readonly)
                if (!isEdit && (!data.username || data.username.length < 3)) {
                    return 'Username must be at least 3 characters';
                }
                if (!data.email || !Helpers.isValidEmail(data.email)) {
                    return 'Please enter a valid email address';
                }
                if (!data.firstName || data.firstName.trim().length === 0) {
                    return 'First name is required';
                }
                if (!data.lastName || data.lastName.trim().length === 0) {
                    return 'Last name is required';
                }
                if (!isEdit && (!data.password || data.password.length < 8)) {
                    return 'Password must be at least 8 characters';
                }
                if (isEdit && data.password && data.password.length > 0 && data.password.length < 8) {
                    return 'Password must be at least 8 characters';
                }
                return null;
            }
        });

        if (result) {
            if (isEdit) {
                // For edit, ensure we keep the username and include original data
                const updateData = {
                    ...result,
                    username: user.username  // Preserve username since it's readonly
                };
                // Remove empty password (means don't change it)
                if (!updateData.password || updateData.password.trim() === '') {
                    delete updateData.password;
                }
                await this.updateUser(user.id, updateData);
            } else {
                await this.createUser(result);
            }
        }
    },

    /**
     * Creates a new user
     */
    async createUser(userData) {
        try {
            const result = await window.api.users.create(userData);
            if (result.success) {
                Toast.success('User created successfully');
                await this.loadUsers();
            } else {
                Toast.error(result.error || 'Failed to create user');
            }
        } catch (error) {
            console.error('Failed to create user:', error);
            Toast.error('Failed to create user');
        }
    },

    /**
     * Edits an existing user
     */
    async editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            // Ensure consistent field names for the form
            const formData = {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.firstName || user.first_name,
                lastName: user.lastName || user.last_name,
                roleId: user.roleId || user.role_id,
                teamId: user.teamId || user.team_id || '',
                phone: user.phone || '',
                isActive: user.isActive !== undefined ? user.isActive : !!user.is_active
            };
            await this.showUserForm(formData);
        }
    },

    /**
     * Updates a user
     */
    async updateUser(userId, userData) {
        try {
            const result = await window.api.users.update(userId, userData);
            if (result.success) {
                Toast.success('User updated successfully');
                await this.loadUsers();
            } else {
                Toast.error(result.error || 'Failed to update user');
            }
        } catch (error) {
            console.error('Failed to update user:', error);
            Toast.error('Failed to update user');
        }
    },

    /**
     * Deletes a user
     */
    async deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            Toast.error('User not found');
            return;
        }

        try {
            const confirmed = await Modal.confirm({
                title: 'Delete User',
                message: `Are you sure you want to delete "${user.firstName} ${user.lastName}"? This action cannot be undone.`,
                confirmText: 'Delete',
                confirmClass: 'btn-danger'
            });

            if (confirmed) {
                const result = await window.api.users.delete(userId);
                if (result && result.success) {
                    Toast.success('User deleted successfully');
                    await this.loadUsers();
                } else {
                    Toast.error(result?.error || 'Failed to delete user');
                }
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            Toast.error('Failed to delete user: ' + (error.message || 'Unknown error'));
        }
    },

    /**
     * Exports users
     */
    async exportUsers() {
        try {
            const result = await window.api.users.exportUsers('csv');
            if (result.success) {
                Helpers.downloadFile(result.data, 'users.csv', 'text/csv');
                Toast.success('Users exported successfully');
            } else {
                Toast.error(result.error || 'Failed to export users');
            }
        } catch (error) {
            console.error('Failed to export users:', error);
            Toast.error('Failed to export users');
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadUsers();
    }
};

// Export for use in other modules
window.UsersView = UsersView;
