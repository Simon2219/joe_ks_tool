/**
 * Users View
 * Handles user management functionality
 */

const UsersView = {
    users: [],
    roles: [],
    filters: {
        role: '',
        status: ''
    },

    /**
     * Initializes the users view
     */
    async init() {
        this.bindEvents();
        await this.loadRoles();
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
            const result = await window.electronAPI.roles.getAll();
            if (result.success) {
                this.roles = result.roles;
                this.populateRoleFilter();
            }
        } catch (error) {
            console.error('Failed to load roles:', error);
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
     * Loads all users
     */
    async loadUsers() {
        try {
            const result = await window.electronAPI.users.getAll();
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
            if (this.filters.role && user.roleId !== this.filters.role) {
                return false;
            }
            if (this.filters.status) {
                const isActive = this.filters.status === 'active';
                if (user.isActive !== isActive) return false;
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
        const initials = Helpers.getInitials(user.firstName, user.lastName);
        const fullName = `${user.firstName} ${user.lastName}`;
        const statusClass = user.isActive ? 'badge-success' : 'badge-secondary';
        const statusText = user.isActive ? 'Active' : 'Inactive';
        const lastLogin = user.lastLogin ? Helpers.timeAgo(user.lastLogin) : 'Never';

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
                <td>${Helpers.escapeHtml(user.roleName)}</td>
                <td>${Helpers.escapeHtml(user.department || '-')}</td>
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
                name: 'department', 
                label: 'Department', 
                type: 'text',
                placeholder: 'e.g., Customer Support'
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
                if (!data.username || data.username.length < 3) {
                    return 'Username must be at least 3 characters';
                }
                if (!Helpers.isValidEmail(data.email)) {
                    return 'Please enter a valid email address';
                }
                if (!isEdit && (!data.password || data.password.length < 8)) {
                    return 'Password must be at least 8 characters';
                }
                if (data.password && data.password.length > 0 && data.password.length < 8) {
                    return 'Password must be at least 8 characters';
                }
                return null;
            }
        });

        if (result) {
            if (isEdit) {
                await this.updateUser(user.id, result);
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
            const result = await window.electronAPI.users.create(userData);
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
            await this.showUserForm(user);
        }
    },

    /**
     * Updates a user
     */
    async updateUser(userId, userData) {
        try {
            const result = await window.electronAPI.users.update(userId, userData);
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
        if (!user) return;

        const confirmed = await Modal.confirm({
            title: 'Delete User',
            message: `Are you sure you want to delete "${user.firstName} ${user.lastName}"? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const result = await window.electronAPI.users.delete(userId);
                if (result.success) {
                    Toast.success('User deleted successfully');
                    await this.loadUsers();
                } else {
                    Toast.error(result.error || 'Failed to delete user');
                }
            } catch (error) {
                console.error('Failed to delete user:', error);
                Toast.error('Failed to delete user');
            }
        }
    },

    /**
     * Exports users
     */
    async exportUsers() {
        try {
            const result = await window.electronAPI.users.exportUsers('csv');
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
