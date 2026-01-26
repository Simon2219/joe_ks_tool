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
            // Show specific API endpoint in error message for debugging
            return { 
                success: false, 
                error: `API Error: ${method} ${endpoint} failed - ${error.message || 'Connection error'}`,
                endpoint: endpoint,
                method: method
            };
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
 * HTTP client for backend communication (separate from Electron IPC)
 */
window.api = {
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
        getByTeam: (teamId) => API.get(`/users?teamId=${teamId}`),
        getStatistics: () => API.get('/users/stats'),
        exportUsers: (format) => API.get(`/users/export/${format}`)
    },

    teams: {
        getAll: (includeInactive = false) => API.get(`/teams${includeInactive ? '?includeInactive=true' : ''}`),
        getById: (id) => API.get(`/teams/${id}`),
        create: (teamData) => API.post('/teams', teamData),
        update: (id, teamData) => API.put(`/teams/${id}`, teamData),
        delete: (id) => API.delete(`/teams/${id}`),
        getMembers: (id) => API.get(`/teams/${id}/members`),
        getPermissions: (id) => API.get(`/teams/${id}/permissions`),
        setPermissions: (id, permissions) => API.put(`/teams/${id}/permissions`, { permissions }),
        getStatistics: (id) => API.get(`/teams/${id}/statistics`)
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
        exportTickets: (filters = {}, format = 'csv') => {
            const params = new URLSearchParams({ ...filters, format }).toString();
            return API.get(`/tickets/export${params ? '?' + params : ''}`);
        }
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
        getStatistics: () => API.get('/quality/stats'),
        exportReports: (filters = {}, format = 'csv') => {
            const params = new URLSearchParams({ ...filters, format }).toString();
            return API.get(`/quality/export${params ? '?' + params : ''}`);
        }
    },

    roles: {
        getAll: () => API.get('/roles'),
        getById: (id) => API.get(`/roles/${id}`),
        create: (roleData) => API.post('/roles', roleData),
        update: (id, roleData) => API.put(`/roles/${id}`, roleData),
        delete: (id) => API.delete(`/roles/${id}`),
        getPermissions: () => API.get('/roles/permissions')
    },

    knowledgeCheck: {
        // Question Categories
        getCategories: () => API.get('/knowledge-check/categories'),
        getCategoryById: (id) => API.get(`/knowledge-check/categories/${id}`),
        createCategory: (data) => API.post('/knowledge-check/categories', data),
        updateCategory: (id, data) => API.put(`/knowledge-check/categories/${id}`, data),
        deleteCategory: (id) => API.delete(`/knowledge-check/categories/${id}`),
        reorderCategories: (categoryIds) => API.put('/knowledge-check/categories/reorder', { categoryIds }),

        // Test Categories
        getTestCategories: () => API.get('/knowledge-check/test-categories'),
        getTestCategoryById: (id) => API.get(`/knowledge-check/test-categories/${id}`),
        createTestCategory: (data) => API.post('/knowledge-check/test-categories', data),
        updateTestCategory: (id, data) => API.put(`/knowledge-check/test-categories/${id}`, data),
        deleteTestCategory: (id) => API.delete(`/knowledge-check/test-categories/${id}`),

        // Questions
        getQuestions: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/knowledge-check/questions${params ? '?' + params : ''}`);
        },
        getQuestionById: (id) => API.get(`/knowledge-check/questions/${id}`),
        createQuestion: (data) => API.post('/knowledge-check/questions', data),
        updateQuestion: (id, data) => API.put(`/knowledge-check/questions/${id}`, data),
        deleteQuestion: (id) => API.delete(`/knowledge-check/questions/${id}`),
        moveQuestion: (id, categoryId) => API.put(`/knowledge-check/questions/${id}/move`, { categoryId }),

        // Tests
        getTests: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/knowledge-check/tests${params ? '?' + params : ''}`);
        },
        getTestsWithStats: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/knowledge-check/tests-with-stats${params ? '?' + params : ''}`);
        },
        getTestById: (id) => API.get(`/knowledge-check/tests/${id}`),
        createTest: (data) => API.post('/knowledge-check/tests', data),
        updateTest: (id, data) => API.put(`/knowledge-check/tests/${id}`, data),
        deleteTest: (id) => API.delete(`/knowledge-check/tests/${id}`),

        // Test Runs
        getTestRuns: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/knowledge-check/test-runs${params ? '?' + params : ''}`);
        },
        getTestRunById: (id) => API.get(`/knowledge-check/test-runs/${id}`),
        createTestRun: (data) => API.post('/knowledge-check/test-runs', data),
        updateTestRun: (id, data) => API.put(`/knowledge-check/test-runs/${id}`, data),
        deleteTestRun: (id) => API.delete(`/knowledge-check/test-runs/${id}`),

        // Results
        getResults: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/knowledge-check/results${params ? '?' + params : ''}`);
        },
        getResultById: (id) => API.get(`/knowledge-check/results/${id}`),
        createResult: (data) => API.post('/knowledge-check/results', data),
        updateResult: (id, data) => API.put(`/knowledge-check/results/${id}`, data),
        deleteResult: (id) => API.delete(`/knowledge-check/results/${id}`),

        // Assignments
        getAssignments: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/knowledge-check/assignments${params ? '?' + params : ''}`);
        },
        getMyAssignments: () => API.get('/knowledge-check/assignments/my'),
        getPendingAssignmentsCount: () => API.get('/knowledge-check/assignments/pending-count'),
        getAssignmentById: (id) => API.get(`/knowledge-check/assignments/${id}`),
        createAssignment: (data) => API.post('/knowledge-check/assignments', data),
        updateAssignment: (id, data) => API.put(`/knowledge-check/assignments/${id}`, data),
        deleteAssignment: (id) => API.delete(`/knowledge-check/assignments/${id}`),
        getTakeTestData: (assignmentId) => API.get(`/knowledge-check/assignments/${assignmentId}/take-test`),

        // Statistics & Export
        getStatistics: () => API.get('/knowledge-check/stats'),
        exportResults: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/knowledge-check/export/results${params ? '?' + params : ''}`);
        },
        checkAnswer: (answer, exactAnswer, triggerWords) => 
            API.post('/knowledge-check/check-answer', { answer, exactAnswer, triggerWords }),
        
        // Archive
        getArchiveStats: () => API.get('/knowledge-check/archive/stats'),
        getArchivedQuestions: () => API.get('/knowledge-check/archive/questions'),
        getArchivedTests: () => API.get('/knowledge-check/archive/tests'),
        getArchivedTestRuns: () => API.get('/knowledge-check/archive/test-runs'),
        restoreQuestion: (id) => API.put(`/knowledge-check/archive/questions/${id}/restore`),
        restoreTest: (id) => API.put(`/knowledge-check/archive/tests/${id}/restore`),
        restoreTestRun: (id) => API.put(`/knowledge-check/archive/test-runs/${id}/restore`),
        permanentDeleteQuestion: (id) => API.delete(`/knowledge-check/archive/questions/${id}`),
        permanentDeleteTest: (id) => API.delete(`/knowledge-check/archive/tests/${id}`),
        permanentDeleteTestRun: (id) => API.delete(`/knowledge-check/archive/test-runs/${id}`)
    },

    // Quality System v2
    qs: {
        // Teams
        getTeams: () => API.get('/qs/teams'),
        getTeamById: (id) => API.get(`/qs/teams/${id}`),
        getTeamAgents: (teamId) => API.get(`/qs/teams/${teamId}/agents`),
        updateTeamRoles: (teamId, roleIds, roleType) => API.put(`/qs/teams/${teamId}/roles`, { roleIds, roleType }),
        getTeamStatistics: (teamId, filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/qs/teams/${teamId}/statistics${params ? '?' + params : ''}`);
        },

        // Task Categories
        getTaskCategories: (teamId) => API.get(`/qs/teams/${teamId}/task-categories`),
        createTaskCategory: (teamId, data) => API.post(`/qs/teams/${teamId}/task-categories`, data),
        updateTaskCategory: (id, data) => API.put(`/qs/task-categories/${id}`, data),
        deleteTaskCategory: (id) => API.delete(`/qs/task-categories/${id}`),

        // Tasks
        getTasks: (teamId, filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/qs/teams/${teamId}/tasks${params ? '?' + params : ''}`);
        },
        getTaskById: (id) => API.get(`/qs/tasks/${id}`),
        createTask: (teamId, data) => API.post(`/qs/teams/${teamId}/tasks`, data),
        updateTask: (id, data) => API.put(`/qs/tasks/${id}`, data),
        deleteTask: (id) => API.delete(`/qs/tasks/${id}`),
        archiveTask: (id) => API.put(`/qs/tasks/${id}/archive`),
        restoreTask: (id) => API.put(`/qs/tasks/${id}/restore`),

        // Check Categories
        getCheckCategories: (teamId) => API.get(`/qs/teams/${teamId}/check-categories`),
        createCheckCategory: (teamId, data) => API.post(`/qs/teams/${teamId}/check-categories`, data),
        updateCheckCategory: (id, data) => API.put(`/qs/check-categories/${id}`, data),
        deleteCheckCategory: (id) => API.delete(`/qs/check-categories/${id}`),

        // Checks
        getChecks: (teamId, filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/qs/teams/${teamId}/checks${params ? '?' + params : ''}`);
        },
        getCheckById: (id, includeTasks = true) => API.get(`/qs/checks/${id}?includeTasks=${includeTasks}`),
        createCheck: (teamId, data) => API.post(`/qs/teams/${teamId}/checks`, data),
        updateCheck: (id, data) => API.put(`/qs/checks/${id}`, data),
        deleteCheck: (id) => API.delete(`/qs/checks/${id}`),
        archiveCheck: (id) => API.put(`/qs/checks/${id}/archive`),
        restoreCheck: (id) => API.put(`/qs/checks/${id}/restore`),

        // Evaluations
        getEvaluations: (teamId, filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/qs/teams/${teamId}/evaluations${params ? '?' + params : ''}`);
        },
        getEvaluationById: (id) => API.get(`/qs/evaluations/${id}`),
        createEvaluation: (teamId, data) => API.post(`/qs/teams/${teamId}/evaluations`, data),
        createRandomEvaluation: (teamId, data) => API.post(`/qs/teams/${teamId}/evaluations/random`, data),
        submitEvaluation: (id, data) => API.put(`/qs/evaluations/${id}/submit`, data),
        updateEvaluationNotes: (id, notes) => API.put(`/qs/evaluations/${id}/notes`, { notes }),
        deleteEvaluation: (id) => API.delete(`/qs/evaluations/${id}`),

        // Evidence
        uploadEvidence: async (evaluationId, file, evidenceType, answerId = null) => {
            const formData = new FormData();
            if (file) formData.append('file', file);
            formData.append('evidenceType', evidenceType);
            if (answerId) formData.append('answerId', answerId);
            
            const token = API.getAccessToken();
            const response = await fetch(`${API.baseUrl}/qs/evaluations/${evaluationId}/evidence`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });
            return response.json();
        },
        deleteEvidence: (id) => API.delete(`/qs/evidence/${id}`),

        // Quotas
        getQuotas: (teamId) => API.get(`/qs/teams/${teamId}/quotas`),
        setQuota: (teamId, data) => API.put(`/qs/teams/${teamId}/quotas`, data),

        // Settings
        getTeamSettings: (teamId) => API.get(`/qs/teams/${teamId}/settings`),
        updateTeamSettings: (teamId, settings) => API.put(`/qs/teams/${teamId}/settings`, settings),

        // Tracking (Global)
        getTrackingEvaluations: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.get(`/qs/tracking/evaluations${params ? '?' + params : ''}`);
        },
        getTrackingStatistics: () => API.get('/qs/tracking/statistics'),

        // Agent Results
        getMyResults: () => API.get('/qs/my-results'),
        getAgentStatistics: (agentId, teamId = null) => {
            const params = teamId ? `?teamId=${teamId}` : '';
            return API.get(`/qs/agents/${agentId}/statistics${params}`);
        }
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
    },

    admin: {
        getOrphanedAssignmentsCount: () => API.get('/admin/migrations/orphaned-assignments'),
        migrateOrphanedAssignments: () => API.post('/admin/migrations/orphaned-assignments')
    }
};

// Export API for direct use
window.API = API;
