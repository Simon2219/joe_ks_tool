/**
 * API Client
 * Handles all HTTP requests to the backend
 */

const API = {
    baseUrl: '/api',
    token: null,

    /**
     * Sets the authentication token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    },

    /**
     * Gets the stored token
     */
    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('authToken');
        }
        return this.token;
    },

    /**
     * Makes an API request
     */
    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const token = this.getToken();
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API request failed:', error);
            return { success: false, error: 'Network error' };
        }
    },

    // Convenience methods
    get(endpoint) { return this.request('GET', endpoint); },
    post(endpoint, data) { return this.request('POST', endpoint, data); },
    put(endpoint, data) { return this.request('PUT', endpoint, data); },
    delete(endpoint) { return this.request('DELETE', endpoint); }
};

/**
 * API Interface matching the Electron API structure
 * This allows the same frontend code to work with both Electron and Express
 */
window.electronAPI = {
    auth: {
        login: (credentials) => API.post('/auth/login', credentials),
        logout: () => API.post('/auth/logout'),
        getCurrentUser: () => API.get('/auth/me'),
        changePassword: (data) => API.post('/auth/change-password', data),
        validateSession: () => API.get('/auth/validate')
    },

    users: {
        getAll: () => API.get('/users'),
        getById: (id) => API.get(`/users/${id}`),
        create: (userData) => API.post('/users', userData),
        update: (id, userData) => API.put(`/users/${id}`, userData),
        delete: (id) => API.delete(`/users/${id}`),
        search: (query) => API.get(`/users?search=${encodeURIComponent(query)}`),
        getByRole: (roleId) => API.get(`/users?roleId=${roleId}`),
        getStatistics: () => API.get('/users/statistics'),
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
        getByUser: (userId) => API.get(`/tickets?assignedTo=${userId}`),
        exportTickets: (filters, format) => API.get(`/tickets/export/${format}`)
    },

    quality: {
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/quality${params ? '?' + params : ''}`);
        },
        getById: (id) => API.get(`/quality/${id}`),
        create: (reportData) => API.post('/quality', reportData),
        update: (id, reportData) => API.put(`/quality/${id}`, reportData),
        delete: (id) => API.delete(`/quality/${id}`),
        getByAgent: (agentId) => API.get(`/quality?agentId=${agentId}`),
        getCategories: () => API.get('/quality/categories'),
        createCategory: (categoryData) => API.post('/quality/categories', categoryData),
        getStatistics: () => API.get('/quality/statistics'),
        exportReports: (filters, format) => API.get(`/quality/export/${format}`)
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
        getAll: () => API.get('/settings')
    },

    sharepoint: {
        connect: (config) => API.post('/sharepoint/connect', config),
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
        connect: (config) => API.post('/jira/connect', config),
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

// Store token when login succeeds
const originalLogin = window.electronAPI.auth.login;
window.electronAPI.auth.login = async (credentials) => {
    const result = await originalLogin(credentials);
    if (result.success && result.token) {
        API.setToken(result.token);
    }
    return result;
};

// Clear token on logout
const originalLogout = window.electronAPI.auth.logout;
window.electronAPI.auth.logout = async () => {
    const result = await originalLogout();
    API.setToken(null);
    return result;
};

// Export API for direct use if needed
window.API = API;
