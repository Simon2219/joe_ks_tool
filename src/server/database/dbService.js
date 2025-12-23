/**
 * Database Service
 * Provides CRUD operations for JSON-based data storage
 */

const fs = require('fs');
const path = require('path');
const { DB_FILES } = require('./dbInit');

/**
 * Reads data from a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Array|Object} Parsed data
 */
function readData(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
}

/**
 * Writes data to a JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {Array|Object} data - Data to write
 */
function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        throw error;
    }
}

/**
 * Generic collection operations
 */
const Collections = {
    /**
     * Gets all items from a collection
     */
    getAll(collectionPath) {
        return readData(collectionPath);
    },

    /**
     * Gets an item by ID
     */
    getById(collectionPath, id) {
        const items = readData(collectionPath);
        return items.find(item => item.id === id) || null;
    },

    /**
     * Creates a new item
     */
    create(collectionPath, item) {
        const items = readData(collectionPath);
        items.push(item);
        writeData(collectionPath, items);
        return item;
    },

    /**
     * Updates an existing item
     */
    update(collectionPath, id, updates) {
        const items = readData(collectionPath);
        const index = items.findIndex(item => item.id === id);
        
        if (index === -1) {
            return null;
        }
        
        items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
        writeData(collectionPath, items);
        return items[index];
    },

    /**
     * Deletes an item
     */
    delete(collectionPath, id) {
        const items = readData(collectionPath);
        const index = items.findIndex(item => item.id === id);
        
        if (index === -1) {
            return false;
        }
        
        items.splice(index, 1);
        writeData(collectionPath, items);
        return true;
    },

    /**
     * Searches items by a field value
     */
    findBy(collectionPath, field, value) {
        const items = readData(collectionPath);
        return items.filter(item => item[field] === value);
    },

    /**
     * Searches items with a query function
     */
    findWhere(collectionPath, predicate) {
        const items = readData(collectionPath);
        return items.filter(predicate);
    },

    /**
     * Counts items matching a predicate
     */
    count(collectionPath, predicate = null) {
        const items = readData(collectionPath);
        if (!predicate) return items.length;
        return items.filter(predicate).length;
    }
};

/**
 * User-specific operations
 */
const UsersDB = {
    getAll: () => Collections.getAll(DB_FILES.users),
    getById: (id) => Collections.getById(DB_FILES.users, id),
    getByUsername: (username) => {
        const users = Collections.getAll(DB_FILES.users);
        return users.find(u => u.username === username) || null;
    },
    getByEmail: (email) => {
        const users = Collections.getAll(DB_FILES.users);
        return users.find(u => u.email === email) || null;
    },
    getByRole: (roleId) => Collections.findBy(DB_FILES.users, 'roleId', roleId),
    create: (user) => Collections.create(DB_FILES.users, user),
    update: (id, updates) => Collections.update(DB_FILES.users, id, updates),
    delete: (id) => Collections.delete(DB_FILES.users, id),
    search: (query) => {
        const lowerQuery = query.toLowerCase();
        return Collections.findWhere(DB_FILES.users, user => 
            user.username.toLowerCase().includes(lowerQuery) ||
            user.email.toLowerCase().includes(lowerQuery) ||
            user.firstName.toLowerCase().includes(lowerQuery) ||
            user.lastName.toLowerCase().includes(lowerQuery)
        );
    },
    count: () => Collections.count(DB_FILES.users),
    getActiveCount: () => Collections.count(DB_FILES.users, u => u.isActive)
};

/**
 * Role-specific operations
 */
const RolesDB = {
    getAll: () => Collections.getAll(DB_FILES.roles),
    getById: (id) => Collections.getById(DB_FILES.roles, id),
    create: (role) => Collections.create(DB_FILES.roles, role),
    update: (id, updates) => Collections.update(DB_FILES.roles, id, updates),
    delete: (id) => {
        const role = Collections.getById(DB_FILES.roles, id);
        if (role && role.isSystem) {
            throw new Error('Cannot delete system roles');
        }
        return Collections.delete(DB_FILES.roles, id);
    }
};

/**
 * Permission-specific operations
 */
const PermissionsDB = {
    getAll: () => Collections.getAll(DB_FILES.permissions),
    getById: (id) => Collections.getById(DB_FILES.permissions, id),
    getByModule: (module) => Collections.findBy(DB_FILES.permissions, 'module', module)
};

/**
 * Ticket-specific operations
 */
const TicketsDB = {
    getAll: () => Collections.getAll(DB_FILES.tickets),
    getById: (id) => Collections.getById(DB_FILES.tickets, id),
    getByUser: (userId) => Collections.findBy(DB_FILES.tickets, 'assignedTo', userId),
    getByCreator: (userId) => Collections.findBy(DB_FILES.tickets, 'createdBy', userId),
    getByStatus: (status) => Collections.findBy(DB_FILES.tickets, 'status', status),
    getByPriority: (priority) => Collections.findBy(DB_FILES.tickets, 'priority', priority),
    create: (ticket) => Collections.create(DB_FILES.tickets, ticket),
    update: (id, updates) => Collections.update(DB_FILES.tickets, id, updates),
    delete: (id) => Collections.delete(DB_FILES.tickets, id),
    search: (query) => {
        const lowerQuery = query.toLowerCase();
        return Collections.findWhere(DB_FILES.tickets, ticket => 
            ticket.title.toLowerCase().includes(lowerQuery) ||
            ticket.description.toLowerCase().includes(lowerQuery) ||
            ticket.ticketNumber?.toLowerCase().includes(lowerQuery)
        );
    },
    getFiltered: (filters) => {
        return Collections.findWhere(DB_FILES.tickets, ticket => {
            if (filters.status && ticket.status !== filters.status) return false;
            if (filters.priority && ticket.priority !== filters.priority) return false;
            if (filters.assignedTo && ticket.assignedTo !== filters.assignedTo) return false;
            if (filters.category && ticket.category !== filters.category) return false;
            return true;
        });
    },
    count: () => Collections.count(DB_FILES.tickets),
    countByStatus: (status) => Collections.count(DB_FILES.tickets, t => t.status === status)
};

/**
 * Ticket Comments operations
 */
const TicketCommentsDB = {
    getAll: () => Collections.getAll(DB_FILES.ticketComments),
    getByTicket: (ticketId) => Collections.findBy(DB_FILES.ticketComments, 'ticketId', ticketId),
    create: (comment) => Collections.create(DB_FILES.ticketComments, comment),
    delete: (id) => Collections.delete(DB_FILES.ticketComments, id)
};

/**
 * Ticket History operations
 */
const TicketHistoryDB = {
    getAll: () => Collections.getAll(DB_FILES.ticketHistory),
    getByTicket: (ticketId) => Collections.findBy(DB_FILES.ticketHistory, 'ticketId', ticketId),
    create: (entry) => Collections.create(DB_FILES.ticketHistory, entry)
};

/**
 * Quality Reports operations
 */
const QualityReportsDB = {
    getAll: () => Collections.getAll(DB_FILES.qualityReports),
    getById: (id) => Collections.getById(DB_FILES.qualityReports, id),
    getByAgent: (agentId) => Collections.findBy(DB_FILES.qualityReports, 'agentId', agentId),
    getByEvaluator: (evaluatorId) => Collections.findBy(DB_FILES.qualityReports, 'evaluatorId', evaluatorId),
    create: (report) => Collections.create(DB_FILES.qualityReports, report),
    update: (id, updates) => Collections.update(DB_FILES.qualityReports, id, updates),
    delete: (id) => Collections.delete(DB_FILES.qualityReports, id),
    getFiltered: (filters) => {
        return Collections.findWhere(DB_FILES.qualityReports, report => {
            if (filters.agentId && report.agentId !== filters.agentId) return false;
            if (filters.evaluatorId && report.evaluatorId !== filters.evaluatorId) return false;
            if (filters.startDate && new Date(report.evaluationDate) < new Date(filters.startDate)) return false;
            if (filters.endDate && new Date(report.evaluationDate) > new Date(filters.endDate)) return false;
            return true;
        });
    },
    count: () => Collections.count(DB_FILES.qualityReports)
};

/**
 * Quality Categories operations
 */
const QualityCategoriesDB = {
    getAll: () => Collections.getAll(DB_FILES.qualityCategories),
    getById: (id) => Collections.getById(DB_FILES.qualityCategories, id),
    getActive: () => Collections.findWhere(DB_FILES.qualityCategories, c => c.isActive),
    create: (category) => Collections.create(DB_FILES.qualityCategories, category),
    update: (id, updates) => Collections.update(DB_FILES.qualityCategories, id, updates),
    delete: (id) => Collections.delete(DB_FILES.qualityCategories, id)
};

/**
 * Quality Templates operations
 */
const QualityTemplatesDB = {
    getAll: () => Collections.getAll(DB_FILES.qualityTemplates),
    getById: (id) => Collections.getById(DB_FILES.qualityTemplates, id),
    create: (template) => Collections.create(DB_FILES.qualityTemplates, template),
    update: (id, updates) => Collections.update(DB_FILES.qualityTemplates, id, updates),
    delete: (id) => Collections.delete(DB_FILES.qualityTemplates, id)
};

/**
 * Settings operations
 */
const SettingsDB = {
    getAll: () => readData(DB_FILES.settings),
    get: (key) => {
        const settings = readData(DB_FILES.settings);
        return key.split('.').reduce((obj, k) => obj?.[k], settings);
    },
    set: (key, value) => {
        const settings = readData(DB_FILES.settings);
        const keys = key.split('.');
        let obj = settings;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        writeData(DB_FILES.settings, settings);
        return settings;
    },
    reset: () => {
        const defaultSettings = require('./dbInit').getDefaultSettings?.() || {};
        writeData(DB_FILES.settings, defaultSettings);
        return defaultSettings;
    }
};

/**
 * Session operations
 */
const SessionsDB = {
    getAll: () => Collections.getAll(DB_FILES.sessions),
    getByToken: (token) => {
        const sessions = Collections.getAll(DB_FILES.sessions);
        return sessions.find(s => s.token === token) || null;
    },
    getByUserId: (userId) => Collections.findBy(DB_FILES.sessions, 'userId', userId),
    create: (session) => Collections.create(DB_FILES.sessions, session),
    delete: (token) => {
        const sessions = readData(DB_FILES.sessions);
        const filtered = sessions.filter(s => s.token !== token);
        writeData(DB_FILES.sessions, filtered);
        return true;
    },
    deleteByUserId: (userId) => {
        const sessions = readData(DB_FILES.sessions);
        const filtered = sessions.filter(s => s.userId !== userId);
        writeData(DB_FILES.sessions, filtered);
        return true;
    },
    cleanup: () => {
        const sessions = readData(DB_FILES.sessions);
        const now = new Date();
        const valid = sessions.filter(s => new Date(s.expiresAt) > now);
        writeData(DB_FILES.sessions, valid);
        return valid.length;
    }
};

module.exports = {
    Collections,
    UsersDB,
    RolesDB,
    PermissionsDB,
    TicketsDB,
    TicketCommentsDB,
    TicketHistoryDB,
    QualityReportsDB,
    QualityCategoriesDB,
    QualityTemplatesDB,
    SettingsDB,
    SessionsDB
};
