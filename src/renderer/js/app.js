/**
 * Main Application Controller
 * Handles application initialization, navigation, and global state
 */

const App = {
    currentView: 'dashboard',
    isAuthenticated: false,

    /**
     * Initializes the application
     */
    async init() {
        // Initialize components
        Modal.init();
        Toast.init();

        // Check for existing session
        await this.checkSession();

        // Bind global events
        this.bindEvents();

        console.log('Customer Support Tool initialized');
    },

    /**
     * Binds global event handlers
     */
    bindEvents() {
        // Login form
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation items
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(item.dataset.view);
            });
        });

        // Sidebar toggle
        document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Sidebar resize
        this.initSidebarResize();

        // Refresh button
        document.getElementById('refresh-btn')?.addEventListener('click', () => {
            this.refreshCurrentView();
        });

        // Global search
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', Helpers.debounce((e) => {
                this.handleGlobalSearch(e.target.value);
            }, 300));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    },

    /**
     * Checks for existing session
     */
    async checkSession() {
        try {
            const result = await window.electronAPI.auth.validateSession();
            if (result.valid && result.user) {
                await this.onLoginSuccess(result.user);
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Session check failed:', error);
            this.showLoginScreen();
        }
    },

    /**
     * Shows the login screen
     */
    showLoginScreen() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        document.getElementById('login-username').focus();
    },

    /**
     * Shows the main application
     */
    showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    },

    /**
     * Handles login form submission
     */
    async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const submitBtn = document.querySelector('#login-form button[type="submit"]');

        if (!username || !password) {
            errorEl.textContent = 'Please enter username and password';
            errorEl.classList.remove('hidden');
            return;
        }

        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.querySelector('span').textContent = 'Signing in...';
            submitBtn.querySelector('.spinner').classList.remove('hidden');
            errorEl.classList.add('hidden');

            const result = await window.electronAPI.auth.login({ username, password });

            if (result.success) {
                await this.onLoginSuccess(result.user);
            } else {
                errorEl.textContent = result.error || 'Login failed';
                errorEl.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorEl.textContent = 'An error occurred during login';
            errorEl.classList.remove('hidden');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = 'Sign In';
            submitBtn.querySelector('.spinner').classList.add('hidden');
        }
    },

    /**
     * Called after successful login
     */
    async onLoginSuccess(user) {
        this.isAuthenticated = true;

        // Set user in permissions manager
        Permissions.setUser(user);

        // Update UI with user info
        this.updateUserInfo(user);

        // Show the main app
        this.showApp();

        // Clear login form
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error').classList.add('hidden');

        // Initialize the default view
        await this.navigateTo('dashboard');

        Toast.info(`Welcome back, ${user.firstName}!`);
    },

    /**
     * Updates the user info in the sidebar
     */
    updateUserInfo(user) {
        const initials = Helpers.getInitials(user.firstName, user.lastName);
        const fullName = `${user.firstName} ${user.lastName}`;
        const roleName = user.role?.name || 'Unknown Role';

        document.getElementById('user-initials').textContent = initials;
        document.getElementById('user-name').textContent = fullName;
        document.getElementById('user-role').textContent = roleName;
    },

    /**
     * Handles logout
     */
    async handleLogout() {
        const confirmed = await Modal.confirm({
            title: 'Logout',
            message: 'Are you sure you want to logout?',
            confirmText: 'Logout',
            confirmClass: 'btn-primary'
        });

        if (confirmed) {
            try {
                await window.electronAPI.auth.logout();
                this.isAuthenticated = false;
                Permissions.clearUser();
                this.showLoginScreen();
                Toast.info('You have been logged out');
            } catch (error) {
                console.error('Logout error:', error);
                Toast.error('Failed to logout');
            }
        }
    },

    /**
     * Navigates to a view
     */
    async navigateTo(viewName) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            users: 'UserSystem',
            tickets: 'TicketSystem',
            quality: 'QualitySystem',
            roles: 'RoleSystem',
            integrations: 'IntegrationSystem',
            settings: 'SettingsSystem'
        };
        document.getElementById('page-title').textContent = titles[viewName] || viewName;

        // Initialize view
        this.currentView = viewName;
        await this.initializeView(viewName);
    },

    /**
     * Initializes a view
     */
    async initializeView(viewName) {
        try {
            switch (viewName) {
                case 'dashboard':
                    await DashboardView.init();
                    break;
                case 'users':
                    await UsersView.init();
                    break;
                case 'tickets':
                    await TicketsView.init();
                    break;
                case 'quality':
                    await QualityView.init();
                    break;
                case 'roles':
                    await RolesView.init();
                    break;
                case 'integrations':
                    await IntegrationsView.init();
                    break;
                case 'settings':
                    await SettingsView.init();
                    break;
            }
        } catch (error) {
            console.error(`Failed to initialize ${viewName} view:`, error);
            Toast.error(`Failed to load ${viewName}`);
        }
    },

    /**
     * Refreshes the current view
     */
    async refreshCurrentView() {
        const viewMap = {
            dashboard: DashboardView,
            users: UsersView,
            tickets: TicketsView,
            quality: QualityView,
            roles: RolesView,
            integrations: IntegrationsView,
            settings: SettingsView
        };

        const view = viewMap[this.currentView];
        if (view && view.refresh) {
            await view.refresh();
            Toast.info('View refreshed');
        }
    },

    /**
     * Toggles sidebar collapsed state
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
    },

    /**
     * Initializes sidebar resize functionality
     */
    initSidebarResize() {
        const sidebar = document.getElementById('sidebar');
        const handle = document.getElementById('sidebar-resize-handle');
        let isResizing = false;

        handle?.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const newWidth = e.clientX;
            const minWidth = parseInt(getComputedStyle(sidebar).getPropertyValue('--sidebar-min-width')) || 200;
            const maxWidth = parseInt(getComputedStyle(sidebar).getPropertyValue('--sidebar-max-width')) || 400;
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                sidebar.style.width = `${newWidth}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    },

    /**
     * Handles global search
     */
    handleGlobalSearch(query) {
        if (!query) return;

        // Implement global search based on current view
        console.log('Global search:', query);
    },

    /**
     * Handles keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('global-search')?.focus();
        }

        // Ctrl/Cmd + R: Refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.refreshCurrentView();
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for use in other modules
window.App = App;
