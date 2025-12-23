/**
 * Preload Script
 * Securely exposes IPC methods to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Authentication
    auth: {
        login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
        logout: () => ipcRenderer.invoke('auth:logout'),
        getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
        changePassword: (data) => ipcRenderer.invoke('auth:changePassword', data),
        validateSession: () => ipcRenderer.invoke('auth:validateSession')
    },
    
    // User Management
    users: {
        getAll: () => ipcRenderer.invoke('users:getAll'),
        getById: (id) => ipcRenderer.invoke('users:getById', id),
        create: (userData) => ipcRenderer.invoke('users:create', userData),
        update: (id, userData) => ipcRenderer.invoke('users:update', id, userData),
        delete: (id) => ipcRenderer.invoke('users:delete', id),
        search: (query) => ipcRenderer.invoke('users:search', query),
        getByRole: (roleId) => ipcRenderer.invoke('users:getByRole', roleId),
        getStatistics: () => ipcRenderer.invoke('users:getStatistics'),
        exportUsers: (format) => ipcRenderer.invoke('users:export', format),
        importUsers: (data) => ipcRenderer.invoke('users:import', data)
    },
    
    // Ticket System
    tickets: {
        getAll: (filters) => ipcRenderer.invoke('tickets:getAll', filters),
        getById: (id) => ipcRenderer.invoke('tickets:getById', id),
        create: (ticketData) => ipcRenderer.invoke('tickets:create', ticketData),
        update: (id, ticketData) => ipcRenderer.invoke('tickets:update', id, ticketData),
        delete: (id) => ipcRenderer.invoke('tickets:delete', id),
        assignTo: (ticketId, userId) => ipcRenderer.invoke('tickets:assignTo', ticketId, userId),
        changeStatus: (ticketId, status) => ipcRenderer.invoke('tickets:changeStatus', ticketId, status),
        addComment: (ticketId, comment) => ipcRenderer.invoke('tickets:addComment', ticketId, comment),
        getComments: (ticketId) => ipcRenderer.invoke('tickets:getComments', ticketId),
        getHistory: (ticketId) => ipcRenderer.invoke('tickets:getHistory', ticketId),
        getStatistics: () => ipcRenderer.invoke('tickets:getStatistics'),
        getByUser: (userId) => ipcRenderer.invoke('tickets:getByUser', userId),
        searchTickets: (query) => ipcRenderer.invoke('tickets:search', query),
        bulkUpdate: (ticketIds, updates) => ipcRenderer.invoke('tickets:bulkUpdate', ticketIds, updates),
        exportTickets: (filters, format) => ipcRenderer.invoke('tickets:export', filters, format)
    },
    
    // Quality Management
    quality: {
        getAll: (filters) => ipcRenderer.invoke('quality:getAll', filters),
        getById: (id) => ipcRenderer.invoke('quality:getById', id),
        create: (reportData) => ipcRenderer.invoke('quality:create', reportData),
        update: (id, reportData) => ipcRenderer.invoke('quality:update', id, reportData),
        delete: (id) => ipcRenderer.invoke('quality:delete', id),
        getByAgent: (agentId) => ipcRenderer.invoke('quality:getByAgent', agentId),
        getByEvaluator: (evaluatorId) => ipcRenderer.invoke('quality:getByEvaluator', evaluatorId),
        getCategories: () => ipcRenderer.invoke('quality:getCategories'),
        createCategory: (categoryData) => ipcRenderer.invoke('quality:createCategory', categoryData),
        updateCategory: (id, categoryData) => ipcRenderer.invoke('quality:updateCategory', id, categoryData),
        deleteCategory: (id) => ipcRenderer.invoke('quality:deleteCategory', id),
        getScorecard: (agentId, dateRange) => ipcRenderer.invoke('quality:getScorecard', agentId, dateRange),
        getTeamStats: (teamId, dateRange) => ipcRenderer.invoke('quality:getTeamStats', teamId, dateRange),
        getStatistics: () => ipcRenderer.invoke('quality:getStatistics'),
        exportReports: (filters, format) => ipcRenderer.invoke('quality:export', filters, format),
        getTemplates: () => ipcRenderer.invoke('quality:getTemplates'),
        createTemplate: (templateData) => ipcRenderer.invoke('quality:createTemplate', templateData),
        updateTemplate: (id, templateData) => ipcRenderer.invoke('quality:updateTemplate', id, templateData),
        deleteTemplate: (id) => ipcRenderer.invoke('quality:deleteTemplate', id)
    },
    
    // Role Management
    roles: {
        getAll: () => ipcRenderer.invoke('roles:getAll'),
        getById: (id) => ipcRenderer.invoke('roles:getById', id),
        create: (roleData) => ipcRenderer.invoke('roles:create', roleData),
        update: (id, roleData) => ipcRenderer.invoke('roles:update', id, roleData),
        delete: (id) => ipcRenderer.invoke('roles:delete', id),
        getPermissions: () => ipcRenderer.invoke('roles:getPermissions'),
        assignPermissions: (roleId, permissions) => ipcRenderer.invoke('roles:assignPermissions', roleId, permissions)
    },
    
    // Settings
    settings: {
        get: (key) => ipcRenderer.invoke('settings:get', key),
        set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
        getAll: () => ipcRenderer.invoke('settings:getAll'),
        resetToDefault: () => ipcRenderer.invoke('settings:resetToDefault'),
        exportSettings: () => ipcRenderer.invoke('settings:export'),
        importSettings: (data) => ipcRenderer.invoke('settings:import', data)
    },
    
    // SharePoint Integration
    sharepoint: {
        connect: (config) => ipcRenderer.invoke('sharepoint:connect', config),
        disconnect: () => ipcRenderer.invoke('sharepoint:disconnect'),
        getStatus: () => ipcRenderer.invoke('sharepoint:getStatus'),
        getLists: () => ipcRenderer.invoke('sharepoint:getLists'),
        getListItems: (listName) => ipcRenderer.invoke('sharepoint:getListItems', listName),
        createListItem: (listName, data) => ipcRenderer.invoke('sharepoint:createListItem', listName, data),
        updateListItem: (listName, itemId, data) => ipcRenderer.invoke('sharepoint:updateListItem', listName, itemId, data),
        deleteListItem: (listName, itemId) => ipcRenderer.invoke('sharepoint:deleteListItem', listName, itemId),
        uploadDocument: (libraryName, file) => ipcRenderer.invoke('sharepoint:uploadDocument', libraryName, file),
        downloadDocument: (libraryName, fileName) => ipcRenderer.invoke('sharepoint:downloadDocument', libraryName, fileName)
    },
    
    // JIRA Integration
    jira: {
        connect: (config) => ipcRenderer.invoke('jira:connect', config),
        disconnect: () => ipcRenderer.invoke('jira:disconnect'),
        getStatus: () => ipcRenderer.invoke('jira:getStatus'),
        getProjects: () => ipcRenderer.invoke('jira:getProjects'),
        getIssues: (projectKey, filters) => ipcRenderer.invoke('jira:getIssues', projectKey, filters),
        getIssue: (issueKey) => ipcRenderer.invoke('jira:getIssue', issueKey),
        createIssue: (projectKey, issueData) => ipcRenderer.invoke('jira:createIssue', projectKey, issueData),
        updateIssue: (issueKey, issueData) => ipcRenderer.invoke('jira:updateIssue', issueKey, issueData),
        deleteIssue: (issueKey) => ipcRenderer.invoke('jira:deleteIssue', issueKey),
        addComment: (issueKey, comment) => ipcRenderer.invoke('jira:addComment', issueKey, comment),
        transitionIssue: (issueKey, transitionId) => ipcRenderer.invoke('jira:transitionIssue', issueKey, transitionId),
        syncWithTickets: () => ipcRenderer.invoke('jira:syncWithTickets')
    }
});
