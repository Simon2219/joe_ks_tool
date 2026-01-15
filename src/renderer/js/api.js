/**
 * API Client
 * Handles all HTTP requests to the backend with JWT authentication
 */

const API = {
    baseUrl: '/api',
    accessToken: null,
    refreshToken: null,
    isRefreshing: false,
    refreshQueue: [],

    /**
     * Initializes the API client with stored tokens
     */
    init() {
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
    },

    /**
     * Stores authentication tokens
     */
    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        
        if (accessToken) {
            localStorage.setItem('accessToken', accessToken);
        } else {
            localStorage.removeItem('accessToken');
        }
        
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        } else {
            localStorage.removeItem('refreshToken');
        }
    },

    /**
     * Clears all tokens
     */
    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },

    /**
     * Gets stored access token
     */
    getAccessToken() {
        if (!this.accessToken) {
            this.accessToken = localStorage.getItem('accessToken');
        }
        return this.accessToken;
    },

    /**
     * Refreshes the access token
     */
    async refreshAccessToken() {
        if (!this.refreshToken) {
            this.refreshToken = localStorage.getItem('refreshToken');
        }
        
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken: this.refreshToken })
        });

        const result = await response.json();
        
        if (result.success) {
            this.setTokens(result.accessToken, result.refreshToken);
            return result.accessToken;
        } else {
            this.clearTokens();
            throw new Error(result.error || 'Token refresh failed');
        }
    },

    /**
     * Makes an API request with automatic token refresh
     */
    async request(method, endpoint, data = null, retryCount = 0) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const token = this.getAccessToken();
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            // Handle token expiration
            if (response.status === 401 && result.code === 'INVALID_TOKEN' && retryCount === 0) {
                try {
                    await this.refreshAccessToken();
                    return this.request(method, endpoint, data, 1);
                } catch (refreshError) {
                    console.error('[API] Token refresh failed:', refreshError);
                    this.handleAuthError();
                    return result;
                }
            }

            return result;
        } catch (error) {
            console.error('[API] Request failed:', error);
            return { success: false, error: 'Network error' };
        }
    },

    /**
     * Handles authentication errors
     */
    handleAuthError() {
        this.clearTokens();
        // Trigger logout in the app
        if (window.App && window.App.handleLogout) {
            window.App.showLoginScreen();
        }
    },

    // Convenience methods
    get(endpoint) { return this.request('GET', endpoint); },
    post(endpoint, data) { return this.request('POST', endpoint, data); },
    put(endpoint, data) { return this.request('PUT', endpoint, data); },
    delete(endpoint) { return this.request('DELETE', endpoint); }
};

// Initialize on load
API.init();

/**
 * API Interface for the application
 */
window.electronAPI = {
    auth: {
        login: async (credentials) => {
            const result = await API.post('/auth/login', credentials);
            if (result.success) {
                API.setTokens(result.accessToken, result.refreshToken);
            }
            return result;
        },
        logout: async () => {
            const refreshToken = API.refreshToken || localStorage.getItem('refreshToken');
            const result = await API.post('/auth/logout', { refreshToken });
            API.clearTokens();
            return result;
        },
        logoutAll: () => API.post('/auth/logout-all'),
        getCurrentUser: () => API.get('/auth/me'),
        changePassword: (data) => API.post('/auth/change-password', data),
        validateSession: async () => {
            const token = API.getAccessToken();
            if (!token) {
                return { valid: false };
            }
            const result = await API.get('/auth/validate');
            return result.valid ? result : { valid: false };
        },
        getSessions: () => API.get('/auth/sessions')
    },

    users: {
        getAll: () => API.get('/users'),
        getById: (id) => API.get(`/users/${id}`),
        create: (userData) => API.post('/users', userData),
        update: (id, userData) => API.put(`/users/${id}`, userData),
        delete: (id) => API.delete(`/users/${id}`),
        search: (query) => API.get(`/users?search=${encodeURIComponent(query)}`),
        getByRole: (roleId) => API.get(`/users?roleId=${roleId}`),
        getStatistics: () => API.get('/users/stats'),
        exportUsers: (format) => API.get(`/users/export/${format}`)
    },

    tickets: {
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/tickets${params ? '?' + params : ''}`);
        },
        getById: (id) => API.get(`/tickets/${id}`),
        create: (ticketData) => API.post('/tickets', ticketData),
        update: (id, ticketData) => API.put(`/tickets/${id}`, ticketData),
        delete: (id) => API.delete(`/tickets/${id}`),
        assignTo: (ticketId, userId) => API.put(`/tickets/${ticketId}/assign`, { userId }),
        changeStatus: (ticketId, status) => API.put(`/tickets/${ticketId}/status`, { status }),
        addComment: (ticketId, content) => API.post(`/tickets/${ticketId}/comments`, { content }),
        getComments: (ticketId) => API.get(`/tickets/${ticketId}/comments`),
        getHistory: (ticketId) => API.get(`/tickets/${ticketId}/history`),
        getStatistics: () => API.get('/tickets/statistics'),
        getByUser: (userId) => API.get(`/tickets?assignedTo=${userId}`)
    },

    quality: {
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/quality/reports${params ? '?' + params : ''}`);
        },
        getById: (id) => API.get(`/quality/reports/${id}`),
        create: (reportData) => API.post('/quality/reports', reportData),
        update: (id, reportData) => API.put(`/quality/reports/${id}`, reportData),
        delete: (id) => API.delete(`/quality/reports/${id}`),
        getByAgent: (agentId) => API.get(`/quality/reports?agentId=${agentId}`),
        getCategories: () => API.get('/quality/categories'),
        createCategory: (categoryData) => API.post('/quality/categories', categoryData),
        updateCategory: (id, categoryData) => API.put(`/quality/categories/${id}`, categoryData),
        deleteCategory: (id) => API.delete(`/quality/categories/${id}`),
        getStatistics: () => API.get('/quality/stats')
    },

    roles: {
        getAll: () => API.get('/roles'),
        getById: (id) => API.get(`/roles/${id}`),
        create: (roleData) => API.post('/roles', roleData),
        update: (id, roleData) => API.put(`/roles/${id}`, roleData),
        delete: (id) => API.delete(`/roles/${id}`),
        getPermissions: () => API.get('/roles/permissions')
    },

    settings: {
        get: (key) => API.get(`/settings/${key}`),
        set: (key, value) => API.put(`/settings/${key}`, { value }),
        getAll: () => API.get('/settings'),
        setMany: (settings) => API.put('/settings', settings),
        getIntegrationStatus: () => API.get('/settings/integrations/status'),
        saveSharePointCredentials: (credentials) => API.post('/settings/integrations/sharepoint', credentials),
        saveJiraCredentials: (credentials) => API.post('/settings/integrations/jira', credentials),
        deleteIntegration: (type) => API.delete(`/settings/integrations/${type}`)
    },

    sharepoint: {
        connect: (config) => API.post('/sharepoint/connect', config || {}),
        disconnect: () => API.post('/sharepoint/disconnect'),
        getStatus: () => API.get('/sharepoint/status'),
        getLists: () => API.get('/sharepoint/lists'),
        getListItems: (listTitle, options = {}) => {
            const params = new URLSearchParams(options).toString();
            return API.get(`/sharepoint/lists/${encodeURIComponent(listTitle)}/items${params ? '?' + params : ''}`);
        },
        createListItem: (listTitle, data) => API.post(`/sharepoint/lists/${encodeURIComponent(listTitle)}/items`, data),
        updateListItem: (listTitle, itemId, data) => API.put(`/sharepoint/lists/${encodeURIComponent(listTitle)}/items/${itemId}`, data),
        deleteListItem: (listTitle, itemId) => API.delete(`/sharepoint/lists/${encodeURIComponent(listTitle)}/items/${itemId}`),
        uploadDocument: (libraryName, fileName, fileContent) => API.post('/sharepoint/documents/upload', { libraryName, fileName, fileContent }),
        downloadDocument: (serverRelativeUrl) => API.get(`/sharepoint/documents/download?serverRelativeUrl=${encodeURIComponent(serverRelativeUrl)}`),
        search: (queryText, options = {}) => API.post('/sharepoint/search', { queryText, ...options })
    },

    jira: {
        connect: (config) => API.post('/jira/connect', config || {}),
        disconnect: () => API.post('/jira/disconnect'),
        getStatus: () => API.get('/jira/status'),
        getProjects: () => API.get('/jira/projects'),
        getIssues: (projectKey, options = {}) => {
            const params = new URLSearchParams({ projectKey, ...options }).toString();
            return API.get(`/jira/issues?${params}`);
        },
        getIssue: (issueKey) => API.get(`/jira/issues/${issueKey}`),
        createIssue: (data) => API.post('/jira/issues', data),
        updateIssue: (issueKey, data) => API.put(`/jira/issues/${issueKey}`, data),
        deleteIssue: (issueKey) => API.delete(`/jira/issues/${issueKey}`),
        getTransitions: (issueKey) => API.get(`/jira/issues/${issueKey}/transitions`),
        transitionIssue: (issueKey, transitionId, comment) => API.post(`/jira/issues/${issueKey}/transitions`, { transitionId, comment }),
        getComments: (issueKey) => API.get(`/jira/issues/${issueKey}/comments`),
        addComment: (issueKey, body) => API.post(`/jira/issues/${issueKey}/comments`, { body }),
        search: (jql, options = {}) => API.post('/jira/search', { jql, ...options }),
        syncWithTickets: (projectKey) => API.post('/jira/sync', { projectKey })
    }
};

// Export API for direct use
window.API = API;
