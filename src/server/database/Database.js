/**
 * Database.js
 * Consolidated SQLite database operations for all subsystems
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ============================================
// DATABASE CONNECTION
// ============================================

const DATA_DIR = path.join(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'customer-support.db');

let db = null;

function getDb() {
    if (!db) {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        db = new Database(DB_PATH);
        db.pragma('foreign_keys = ON');
        db.pragma('journal_mode = WAL');
    }
    return db;
}

function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

// ============================================
// SCHEMA INITIALIZATION
// ============================================

function initSchema() {
    const database = getDb();
    
    database.exec(`
        -- Users & Auth
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            role_id TEXT NOT NULL,
            department TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_login TEXT
        );
        
        CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT DEFAULT '',
            is_admin INTEGER DEFAULT 0,
            is_system INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS permissions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            module TEXT NOT NULL,
            description TEXT DEFAULT ''
        );
        
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id TEXT NOT NULL,
            permission_id TEXT NOT NULL,
            PRIMARY KEY (role_id, permission_id)
        );
        
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            revoked INTEGER DEFAULT 0
        );
        
        -- Tickets
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            ticket_number TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'new',
            priority TEXT DEFAULT 'medium',
            category TEXT DEFAULT 'general',
            customer_name TEXT DEFAULT '',
            customer_email TEXT DEFAULT '',
            customer_phone TEXT DEFAULT '',
            assigned_to TEXT,
            created_by TEXT NOT NULL,
            due_date TEXT,
            resolved_at TEXT,
            closed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS ticket_comments (
            id TEXT PRIMARY KEY,
            ticket_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS ticket_history (
            id TEXT PRIMARY KEY,
            ticket_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
        
        -- Quality
        CREATE TABLE IF NOT EXISTS quality_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            weight INTEGER DEFAULT 25,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS quality_criteria (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL,
            name TEXT NOT NULL,
            max_score INTEGER DEFAULT 10
        );
        
        CREATE TABLE IF NOT EXISTS quality_reports (
            id TEXT PRIMARY KEY,
            report_number TEXT UNIQUE NOT NULL,
            agent_id TEXT NOT NULL,
            evaluator_id TEXT NOT NULL,
            evaluation_type TEXT NOT NULL,
            evaluation_date TEXT NOT NULL,
            overall_score INTEGER DEFAULT 0,
            passed INTEGER DEFAULT 0,
            strengths TEXT DEFAULT '',
            improvements TEXT DEFAULT '',
            coaching_notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS quality_scores (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            category_id TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            max_score INTEGER DEFAULT 10
        );
        
        -- Settings
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            encrypted INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS integration_credentials (
            id TEXT PRIMARY KEY,
            type TEXT UNIQUE NOT NULL,
            credentials TEXT NOT NULL,
            encrypted INTEGER DEFAULT 0,
            is_connected INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL
        );
        
        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
        CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_quality_reports_agent ON quality_reports(agent_id);
    `);
    
    console.log('Database schema initialized');
}

// ============================================
// SEED DEFAULT DATA
// ============================================

async function seedData() {
    const database = getDb();
    const now = new Date().toISOString();
    
    // Check if already seeded
    const existing = database.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (existing) {
        console.log('Database already seeded');
        return;
    }
    
    console.log('Seeding database...');
    
    // Default permissions
    const permissions = [
        { id: 'user_view', name: 'View Users', module: 'users' },
        { id: 'user_create', name: 'Create Users', module: 'users' },
        { id: 'user_edit', name: 'Edit Users', module: 'users' },
        { id: 'user_delete', name: 'Delete Users', module: 'users' },
        { id: 'ticket_view', name: 'View Own Tickets', module: 'tickets' },
        { id: 'ticket_view_all', name: 'View All Tickets', module: 'tickets' },
        { id: 'ticket_create', name: 'Create Tickets', module: 'tickets' },
        { id: 'ticket_edit', name: 'Edit Tickets', module: 'tickets' },
        { id: 'ticket_delete', name: 'Delete Tickets', module: 'tickets' },
        { id: 'ticket_assign', name: 'Assign Tickets', module: 'tickets' },
        { id: 'quality_view', name: 'View Own Evaluations', module: 'quality' },
        { id: 'quality_view_all', name: 'View All Evaluations', module: 'quality' },
        { id: 'quality_create', name: 'Create Evaluations', module: 'quality' },
        { id: 'quality_edit', name: 'Edit Evaluations', module: 'quality' },
        { id: 'quality_delete', name: 'Delete Evaluations', module: 'quality' },
        { id: 'quality_manage', name: 'Manage Categories', module: 'quality' },
        { id: 'role_view', name: 'View Roles', module: 'roles' },
        { id: 'role_create', name: 'Create Roles', module: 'roles' },
        { id: 'role_edit', name: 'Edit Roles', module: 'roles' },
        { id: 'role_delete', name: 'Delete Roles', module: 'roles' },
        { id: 'settings_view', name: 'View Settings', module: 'settings' },
        { id: 'settings_edit', name: 'Edit Settings', module: 'settings' },
        { id: 'admin_access', name: 'Admin Access', module: 'admin' },
        { id: 'integration_access', name: 'Integration Access', module: 'integrations' }
    ];
    
    const insertPerm = database.prepare('INSERT OR IGNORE INTO permissions (id, name, module) VALUES (?, ?, ?)');
    permissions.forEach(p => insertPerm.run(p.id, p.name, p.module));
    
    // Default roles
    const allPermIds = permissions.map(p => p.id);
    const roles = [
        { id: 'admin', name: 'Administrator', description: 'Full system access', isAdmin: 1, isSystem: 1, permissions: allPermIds },
        { id: 'supervisor', name: 'Supervisor', description: 'Team management', isAdmin: 0, isSystem: 1, 
          permissions: ['user_view', 'ticket_view', 'ticket_view_all', 'ticket_create', 'ticket_edit', 'ticket_assign', 'quality_view', 'quality_view_all', 'quality_create', 'role_view', 'settings_view'] },
        { id: 'qa_analyst', name: 'QA Analyst', description: 'Quality evaluations', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', 'ticket_view', 'ticket_view_all', 'quality_view', 'quality_view_all', 'quality_create', 'quality_edit', 'quality_manage'] },
        { id: 'agent', name: 'Support Agent', description: 'Ticket handling', isAdmin: 0, isSystem: 1,
          permissions: ['ticket_view', 'ticket_create', 'ticket_edit', 'quality_view'] }
    ];
    
    const insertRole = database.prepare('INSERT OR IGNORE INTO roles (id, name, description, is_admin, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertRolePerm = database.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    
    roles.forEach(r => {
        insertRole.run(r.id, r.name, r.description, r.isAdmin, r.isSystem, now, now);
        r.permissions.forEach(p => insertRolePerm.run(r.id, p));
    });
    
    // Default admin user
    const hashedPw = await bcrypt.hash('admin123', 10);
    database.prepare(`
        INSERT INTO users (id, username, email, password, first_name, last_name, role_id, department, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), 'admin', 'admin@company.com', hashedPw, 'System', 'Administrator', 'admin', 'IT', 1, now, now);
    
    // Default quality categories
    const categories = [
        { name: 'Communication', description: 'Communication skills', weight: 25, criteria: ['Clarity', 'Professionalism', 'Empathy'] },
        { name: 'Problem Resolution', description: 'Issue resolution ability', weight: 30, criteria: ['First Contact Resolution', 'Solution Quality', 'Follow-up'] },
        { name: 'Process Adherence', description: 'Following procedures', weight: 20, criteria: ['Documentation', 'Compliance', 'Tool Usage'] },
        { name: 'Product Knowledge', description: 'Product understanding', weight: 25, criteria: ['Technical Accuracy', 'Feature Knowledge', 'Policy Understanding'] }
    ];
    
    const insertCat = database.prepare('INSERT INTO quality_categories (id, name, description, weight, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertCrit = database.prepare('INSERT INTO quality_criteria (id, category_id, name, max_score) VALUES (?, ?, ?, ?)');
    
    categories.forEach(c => {
        const catId = uuidv4();
        insertCat.run(catId, c.name, c.description, c.weight, 1, now, now);
        c.criteria.forEach(cr => insertCrit.run(uuidv4(), catId, cr, 10));
    });
    
    // Default settings
    const defaultSettings = {
        'general.companyName': 'Customer Support Agency',
        'general.timezone': 'UTC',
        'tickets.defaultPriority': 'medium',
        'tickets.slaEnabled': 'true',
        'quality.passingScore': '80'
    };
    
    const insertSetting = database.prepare('INSERT OR IGNORE INTO settings (key, value, encrypted, updated_at) VALUES (?, ?, ?, ?)');
    Object.entries(defaultSettings).forEach(([k, v]) => insertSetting.run(k, v, 0, now));
    
    console.log('Database seeding complete');
}

// ============================================
// USER SYSTEM
// ============================================

const UserSystem = {
    getAll() {
        return getDb().prepare(`
            SELECT u.*, r.name as role_name, r.is_admin 
            FROM users u LEFT JOIN roles r ON u.role_id = r.id 
            ORDER BY u.created_at DESC
        `).all();
    },
    
    getById(id) {
        return getDb().prepare(`
            SELECT u.*, r.name as role_name, r.is_admin 
            FROM users u LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.id = ?
        `).get(id);
    },
    
    getByUsername(username) {
        return getDb().prepare(`
            SELECT u.*, r.name as role_name, r.is_admin 
            FROM users u LEFT JOIN roles r ON u.role_id = r.id 
            WHERE LOWER(u.username) = LOWER(?)
        `).get(username);
    },
    
    getByEmail(email) {
        return getDb().prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    },
    
    getByRole(roleId) {
        return getDb().prepare('SELECT * FROM users WHERE role_id = ?').all(roleId);
    },
    
    async create(data) {
        const now = new Date().toISOString();
        const id = uuidv4();
        const hashedPw = await bcrypt.hash(data.password, 10);
        
        getDb().prepare(`
            INSERT INTO users (id, username, email, password, first_name, last_name, role_id, department, phone, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, data.username.toLowerCase(), data.email.toLowerCase(), hashedPw, data.firstName, data.lastName, 
               data.roleId || 'agent', data.department || '', data.phone || '', data.isActive !== false ? 1 : 0, now, now);
        
        return this.getById(id);
    },
    
    async update(id, data) {
        const now = new Date().toISOString();
        const fields = ['updated_at = ?'];
        const values = [now];
        
        if (data.username) { fields.push('username = ?'); values.push(data.username.toLowerCase()); }
        if (data.email) { fields.push('email = ?'); values.push(data.email.toLowerCase()); }
        if (data.password) { fields.push('password = ?'); values.push(await bcrypt.hash(data.password, 10)); }
        if (data.firstName) { fields.push('first_name = ?'); values.push(data.firstName); }
        if (data.lastName) { fields.push('last_name = ?'); values.push(data.lastName); }
        if (data.roleId) { fields.push('role_id = ?'); values.push(data.roleId); }
        if (data.department !== undefined) { fields.push('department = ?'); values.push(data.department); }
        if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
        if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
        if (data.lastLogin) { fields.push('last_login = ?'); values.push(data.lastLogin); }
        
        values.push(id);
        getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getById(id);
    },
    
    delete(id) {
        return getDb().prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
    },
    
    async validatePassword(user, password) {
        return bcrypt.compare(password, user.password);
    },
    
    getWithPermissions(id) {
        const user = this.getById(id);
        if (!user) return null;
        const permissions = getDb().prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?').all(user.role_id).map(p => p.permission_id);
        return { ...user, permissions };
    },
    
    count() {
        return getDb().prepare('SELECT COUNT(*) as count FROM users').get().count;
    },
    
    countActive() {
        return getDb().prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;
    }
};

// ============================================
// ROLE SYSTEM
// ============================================

const RoleSystem = {
    getAll() {
        const roles = getDb().prepare('SELECT * FROM roles ORDER BY is_system DESC, name').all();
        return roles.map(r => ({
            ...r,
            is_admin: !!r.is_admin,
            is_system: !!r.is_system,
            permissions: this.getPermissions(r.id),
            userCount: getDb().prepare('SELECT COUNT(*) as c FROM users WHERE role_id = ?').get(r.id).c
        }));
    },
    
    getById(id) {
        const role = getDb().prepare('SELECT * FROM roles WHERE id = ?').get(id);
        if (!role) return null;
        return { ...role, is_admin: !!role.is_admin, is_system: !!role.is_system, permissions: this.getPermissions(id) };
    },
    
    getPermissions(roleId) {
        return getDb().prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?').all(roleId).map(p => p.permission_id);
    },
    
    getAllPermissions() {
        return getDb().prepare('SELECT * FROM permissions ORDER BY module, name').all();
    },
    
    create(data) {
        const now = new Date().toISOString();
        const id = uuidv4();
        
        getDb().transaction(() => {
            getDb().prepare('INSERT INTO roles (id, name, description, is_admin, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .run(id, data.name, data.description || '', data.isAdmin ? 1 : 0, 0, now, now);
            
            const insertPerm = getDb().prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
            (data.permissions || []).forEach(p => insertPerm.run(id, p));
        })();
        
        return this.getById(id);
    },
    
    update(id, data) {
        const now = new Date().toISOString();
        const existing = this.getById(id);
        if (!existing) return null;
        
        getDb().transaction(() => {
            const fields = ['updated_at = ?'];
            const values = [now];
            
            if (data.name) { fields.push('name = ?'); values.push(data.name); }
            if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
            if (data.isAdmin !== undefined && !existing.is_system) { fields.push('is_admin = ?'); values.push(data.isAdmin ? 1 : 0); }
            
            values.push(id);
            getDb().prepare(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
            
            if (data.permissions) {
                getDb().prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id);
                const insertPerm = getDb().prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
                data.permissions.forEach(p => insertPerm.run(id, p));
            }
        })();
        
        return this.getById(id);
    },
    
    delete(id) {
        const role = this.getById(id);
        if (!role) return { success: false, error: 'Role not found' };
        if (role.is_system) return { success: false, error: 'Cannot delete system roles' };
        
        const userCount = getDb().prepare('SELECT COUNT(*) as c FROM users WHERE role_id = ?').get(id).c;
        if (userCount > 0) return { success: false, error: `${userCount} users have this role` };
        
        getDb().prepare('DELETE FROM roles WHERE id = ?').run(id);
        return { success: true };
    },
    
    hasPermission(roleId, permissionId) {
        const role = getDb().prepare('SELECT is_admin FROM roles WHERE id = ?').get(roleId);
        if (role?.is_admin) return true;
        return !!getDb().prepare('SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?').get(roleId, permissionId);
    }
};

// ============================================
// TICKET SYSTEM
// ============================================

const TicketSystem = {
    generateNumber() {
        return `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    },
    
    calculateDueDate(priority) {
        const hours = { critical: 2, high: 8, medium: 24, low: 72 };
        return new Date(Date.now() + (hours[priority] || 24) * 60 * 60 * 1000).toISOString();
    },
    
    getAll(filters = {}) {
        let sql = `SELECT t.*, 
            (SELECT first_name || ' ' || last_name FROM users WHERE id = t.assigned_to) as assigned_to_name,
            (SELECT first_name || ' ' || last_name FROM users WHERE id = t.created_by) as created_by_name
            FROM tickets t WHERE 1=1`;
        const params = [];
        
        if (filters.status) { sql += ' AND t.status = ?'; params.push(filters.status); }
        if (filters.priority) { sql += ' AND t.priority = ?'; params.push(filters.priority); }
        if (filters.assignedTo) { sql += ' AND t.assigned_to = ?'; params.push(filters.assignedTo); }
        
        sql += ' ORDER BY t.created_at DESC';
        return getDb().prepare(sql).all(...params);
    },
    
    getByUser(userId) {
        return getDb().prepare(`
            SELECT t.*, 
                (SELECT first_name || ' ' || last_name FROM users WHERE id = t.assigned_to) as assigned_to_name,
                (SELECT first_name || ' ' || last_name FROM users WHERE id = t.created_by) as created_by_name
            FROM tickets t WHERE t.assigned_to = ? OR t.created_by = ? ORDER BY t.created_at DESC
        `).all(userId, userId);
    },
    
    getById(id) {
        return getDb().prepare(`
            SELECT t.*, 
                (SELECT first_name || ' ' || last_name FROM users WHERE id = t.assigned_to) as assigned_to_name,
                (SELECT first_name || ' ' || last_name FROM users WHERE id = t.created_by) as created_by_name
            FROM tickets t WHERE t.id = ?
        `).get(id);
    },
    
    create(data, userId) {
        const now = new Date().toISOString();
        const id = uuidv4();
        const priority = data.priority || 'medium';
        
        getDb().prepare(`
            INSERT INTO tickets (id, ticket_number, title, description, status, priority, category, customer_name, customer_email, customer_phone, assigned_to, created_by, due_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, this.generateNumber(), data.title, data.description, 'new', priority, data.category || 'general',
               data.customerName || '', data.customerEmail || '', data.customerPhone || '', data.assignedTo || null,
               userId, this.calculateDueDate(priority), now, now);
        
        this.addHistory(id, 'created', 'Ticket created', userId);
        return this.getById(id);
    },
    
    update(id, data, userId) {
        const now = new Date().toISOString();
        const fields = ['updated_at = ?'];
        const values = [now];
        
        if (data.title) { fields.push('title = ?'); values.push(data.title); }
        if (data.description) { fields.push('description = ?'); values.push(data.description); }
        if (data.priority) { fields.push('priority = ?'); values.push(data.priority); fields.push('due_date = ?'); values.push(this.calculateDueDate(data.priority)); }
        if (data.category) { fields.push('category = ?'); values.push(data.category); }
        if (data.customerName !== undefined) { fields.push('customer_name = ?'); values.push(data.customerName); }
        if (data.customerEmail !== undefined) { fields.push('customer_email = ?'); values.push(data.customerEmail); }
        if (data.customerPhone !== undefined) { fields.push('customer_phone = ?'); values.push(data.customerPhone); }
        
        values.push(id);
        getDb().prepare(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        if (userId) this.addHistory(id, 'updated', 'Ticket updated', userId);
        return this.getById(id);
    },
    
    changeStatus(id, status, userId) {
        const now = new Date().toISOString();
        const ticket = this.getById(id);
        const updates = { status, updated_at: now };
        if (status === 'resolved') updates.resolved_at = now;
        if (status === 'closed') updates.closed_at = now;
        
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        getDb().prepare(`UPDATE tickets SET ${fields} WHERE id = ?`).run(...Object.values(updates), id);
        this.addHistory(id, 'status_changed', `Status: ${ticket.status} → ${status}`, userId);
        return this.getById(id);
    },
    
    assign(id, assignedTo, userId) {
        const now = new Date().toISOString();
        const ticket = this.getById(id);
        const status = ticket.status === 'new' ? 'open' : ticket.status;
        
        getDb().prepare('UPDATE tickets SET assigned_to = ?, status = ?, updated_at = ? WHERE id = ?').run(assignedTo || null, status, now, id);
        this.addHistory(id, 'assigned', assignedTo ? 'Ticket assigned' : 'Ticket unassigned', userId);
        return this.getById(id);
    },
    
    delete(id) {
        getDb().prepare('DELETE FROM ticket_comments WHERE ticket_id = ?').run(id);
        getDb().prepare('DELETE FROM ticket_history WHERE ticket_id = ?').run(id);
        return getDb().prepare('DELETE FROM tickets WHERE id = ?').run(id).changes > 0;
    },
    
    getComments(ticketId) {
        return getDb().prepare(`
            SELECT c.*, (SELECT first_name || ' ' || last_name FROM users WHERE id = c.user_id) as user_name
            FROM ticket_comments c WHERE c.ticket_id = ? ORDER BY c.created_at DESC
        `).all(ticketId);
    },
    
    addComment(ticketId, userId, content) {
        const now = new Date().toISOString();
        const id = uuidv4();
        getDb().prepare('INSERT INTO ticket_comments (id, ticket_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)').run(id, ticketId, userId, content, now);
        this.addHistory(ticketId, 'comment_added', 'Comment added', userId);
        return getDb().prepare(`
            SELECT c.*, (SELECT first_name || ' ' || last_name FROM users WHERE id = c.user_id) as user_name
            FROM ticket_comments c WHERE c.id = ?
        `).get(id);
    },
    
    getHistory(ticketId) {
        return getDb().prepare(`
            SELECT h.*, (SELECT first_name || ' ' || last_name FROM users WHERE id = h.user_id) as user_name
            FROM ticket_history h WHERE h.ticket_id = ? ORDER BY h.created_at DESC
        `).all(ticketId);
    },
    
    addHistory(ticketId, action, details, userId) {
        getDb().prepare('INSERT INTO ticket_history (id, ticket_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), ticketId, userId, action, details, new Date().toISOString());
    },
    
    getStatistics() {
        const db = getDb();
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        return {
            total: db.prepare('SELECT COUNT(*) as c FROM tickets').get().c,
            byStatus: Object.fromEntries(db.prepare('SELECT status, COUNT(*) as c FROM tickets GROUP BY status').all().map(r => [r.status, r.c])),
            byPriority: Object.fromEntries(db.prepare('SELECT priority, COUNT(*) as c FROM tickets GROUP BY priority').all().map(r => [r.priority, r.c])),
            openTickets: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('resolved', 'closed')").get().c,
            resolvedThisWeek: db.prepare('SELECT COUNT(*) as c FROM tickets WHERE resolved_at >= ?').get(weekAgo).c,
            createdThisWeek: db.prepare('SELECT COUNT(*) as c FROM tickets WHERE created_at >= ?').get(weekAgo).c
        };
    }
};

// ============================================
// QUALITY SYSTEM
// ============================================

const QualitySystem = {
    getAllReports(filters = {}) {
        let sql = `SELECT r.*, 
            (SELECT first_name || ' ' || last_name FROM users WHERE id = r.agent_id) as agent_name,
            (SELECT first_name || ' ' || last_name FROM users WHERE id = r.evaluator_id) as evaluator_name
            FROM quality_reports r WHERE 1=1`;
        const params = [];
        
        if (filters.agentId) { sql += ' AND r.agent_id = ?'; params.push(filters.agentId); }
        if (filters.startDate) { sql += ' AND r.evaluation_date >= ?'; params.push(filters.startDate); }
        if (filters.endDate) { sql += ' AND r.evaluation_date <= ?'; params.push(filters.endDate); }
        
        sql += ' ORDER BY r.evaluation_date DESC';
        
        const reports = getDb().prepare(sql).all(...params);
        return reports.map(r => ({ ...r, passed: !!r.passed, categoryScores: this.getReportScores(r.id) }));
    },
    
    getByAgent(agentId) {
        return this.getAllReports({ agentId });
    },
    
    getReportById(id) {
        const report = getDb().prepare(`
            SELECT r.*, 
                (SELECT first_name || ' ' || last_name FROM users WHERE id = r.agent_id) as agent_name,
                (SELECT first_name || ' ' || last_name FROM users WHERE id = r.evaluator_id) as evaluator_name
            FROM quality_reports r WHERE r.id = ?
        `).get(id);
        if (!report) return null;
        return { ...report, passed: !!report.passed, categoryScores: this.getReportScores(id) };
    },
    
    getReportScores(reportId) {
        return getDb().prepare(`
            SELECT s.*, c.name as category_name, c.weight 
            FROM quality_scores s LEFT JOIN quality_categories c ON s.category_id = c.id
            WHERE s.report_id = ?
        `).all(reportId);
    },
    
    calculateScore(categoryScores, categories) {
        let totalWeight = 0, weightedScore = 0;
        categoryScores.forEach(cs => {
            const cat = categories.find(c => c.id === cs.categoryId);
            if (cat) {
                totalWeight += cat.weight;
                weightedScore += (cs.score / cs.maxScore) * cat.weight;
            }
        });
        return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
    },
    
    createReport(data, evaluatorId) {
        const now = new Date().toISOString();
        const id = uuidv4();
        const categories = this.getActiveCategories();
        const overallScore = this.calculateScore(data.categoryScores, categories);
        const passingScore = parseInt(SettingsSystem.get('quality.passingScore') || '80');
        
        getDb().transaction(() => {
            getDb().prepare(`
                INSERT INTO quality_reports (id, report_number, agent_id, evaluator_id, evaluation_type, evaluation_date, overall_score, passed, strengths, improvements, coaching_notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, `QA-${Date.now().toString(36).toUpperCase()}`, data.agentId, evaluatorId, data.evaluationType,
                   now, overallScore, overallScore >= passingScore ? 1 : 0, data.strengths || '', data.areasForImprovement || '', data.coachingNotes || '', now, now);
            
            const insertScore = getDb().prepare('INSERT INTO quality_scores (id, report_id, category_id, score, max_score) VALUES (?, ?, ?, ?, ?)');
            data.categoryScores.forEach(s => insertScore.run(uuidv4(), id, s.categoryId, s.score, s.maxScore));
        })();
        
        return this.getReportById(id);
    },
    
    updateReport(id, data) {
        const now = new Date().toISOString();
        const existing = this.getReportById(id);
        if (!existing) return null;
        
        let overallScore = existing.overall_score;
        if (data.categoryScores) {
            const categories = this.getActiveCategories();
            overallScore = this.calculateScore(data.categoryScores, categories);
        }
        const passingScore = parseInt(SettingsSystem.get('quality.passingScore') || '80');
        
        getDb().transaction(() => {
            getDb().prepare(`
                UPDATE quality_reports SET evaluation_type = ?, overall_score = ?, passed = ?, strengths = ?, improvements = ?, coaching_notes = ?, updated_at = ? WHERE id = ?
            `).run(data.evaluationType || existing.evaluation_type, overallScore, overallScore >= passingScore ? 1 : 0,
                   data.strengths ?? existing.strengths, data.areasForImprovement ?? existing.improvements, data.coachingNotes ?? existing.coaching_notes, now, id);
            
            if (data.categoryScores) {
                getDb().prepare('DELETE FROM quality_scores WHERE report_id = ?').run(id);
                const insertScore = getDb().prepare('INSERT INTO quality_scores (id, report_id, category_id, score, max_score) VALUES (?, ?, ?, ?, ?)');
                data.categoryScores.forEach(s => insertScore.run(uuidv4(), id, s.categoryId, s.score, s.maxScore));
            }
        })();
        
        return this.getReportById(id);
    },
    
    deleteReport(id) {
        getDb().prepare('DELETE FROM quality_scores WHERE report_id = ?').run(id);
        return getDb().prepare('DELETE FROM quality_reports WHERE id = ?').run(id).changes > 0;
    },
    
    getAllCategories() {
        const cats = getDb().prepare('SELECT * FROM quality_categories ORDER BY name').all();
        return cats.map(c => ({ ...c, is_active: !!c.is_active, criteria: this.getCategoryCriteria(c.id) }));
    },
    
    getActiveCategories() {
        return this.getAllCategories().filter(c => c.is_active);
    },
    
    getCategoryById(id) {
        const cat = getDb().prepare('SELECT * FROM quality_categories WHERE id = ?').get(id);
        if (!cat) return null;
        return { ...cat, is_active: !!cat.is_active, criteria: this.getCategoryCriteria(id) };
    },
    
    getCategoryCriteria(categoryId) {
        return getDb().prepare('SELECT * FROM quality_criteria WHERE category_id = ?').all(categoryId);
    },
    
    createCategory(data) {
        const now = new Date().toISOString();
        const id = uuidv4();
        
        getDb().transaction(() => {
            getDb().prepare('INSERT INTO quality_categories (id, name, description, weight, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .run(id, data.name, data.description || '', data.weight || 25, 1, now, now);
            
            if (data.criteria?.length) {
                const insertCrit = getDb().prepare('INSERT INTO quality_criteria (id, category_id, name, max_score) VALUES (?, ?, ?, ?)');
                data.criteria.forEach(c => insertCrit.run(uuidv4(), id, c.name, c.maxScore || 10));
            }
        })();
        
        return this.getCategoryById(id);
    },
    
    updateCategory(id, data) {
        const now = new Date().toISOString();
        
        getDb().transaction(() => {
            const fields = ['updated_at = ?'];
            const values = [now];
            
            if (data.name) { fields.push('name = ?'); values.push(data.name); }
            if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
            if (data.weight !== undefined) { fields.push('weight = ?'); values.push(data.weight); }
            if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
            
            values.push(id);
            getDb().prepare(`UPDATE quality_categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
            
            if (data.criteria) {
                getDb().prepare('DELETE FROM quality_criteria WHERE category_id = ?').run(id);
                const insertCrit = getDb().prepare('INSERT INTO quality_criteria (id, category_id, name, max_score) VALUES (?, ?, ?, ?)');
                data.criteria.forEach(c => insertCrit.run(uuidv4(), id, c.name, c.maxScore || 10));
            }
        })();
        
        return this.getCategoryById(id);
    },
    
    deleteCategory(id) {
        const used = getDb().prepare('SELECT COUNT(*) as c FROM quality_scores WHERE category_id = ?').get(id).c;
        if (used > 0) return { success: false, error: 'Category is used in evaluations' };
        
        getDb().prepare('DELETE FROM quality_criteria WHERE category_id = ?').run(id);
        getDb().prepare('DELETE FROM quality_categories WHERE id = ?').run(id);
        return { success: true };
    },
    
    getStatistics() {
        const db = getDb();
        const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0];
        const reports = db.prepare('SELECT * FROM quality_reports').all();
        
        return {
            totalReports: reports.length,
            reportsThisMonth: db.prepare('SELECT COUNT(*) as c FROM quality_reports WHERE evaluation_date >= ?').get(monthStart).c,
            averageScore: reports.length ? Math.round(reports.reduce((sum, r) => sum + r.overall_score, 0) / reports.length) : 0,
            passingRate: reports.length ? Math.round(reports.filter(r => r.passed).length / reports.length * 100) : 0,
            categoryCount: db.prepare('SELECT COUNT(*) as c FROM quality_categories WHERE is_active = 1').get().c
        };
    }
};

// ============================================
// SETTINGS SYSTEM
// ============================================

const SettingsSystem = {
    getAll() {
        const rows = getDb().prepare('SELECT key, value FROM settings').all();
        const settings = {};
        rows.forEach(r => {
            const keys = r.key.split('.');
            let obj = settings;
            keys.slice(0, -1).forEach(k => { if (!obj[k]) obj[k] = {}; obj = obj[k]; });
            obj[keys[keys.length - 1]] = r.value;
        });
        return settings;
    },
    
    get(key) {
        const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row?.value || null;
    },
    
    set(key, value) {
        const now = new Date().toISOString();
        getDb().prepare('INSERT INTO settings (key, value, encrypted, updated_at) VALUES (?, ?, 0, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?')
            .run(key, value, now, value, now);
        return true;
    },
    
    setMany(settings) {
        const now = new Date().toISOString();
        const stmt = getDb().prepare('INSERT INTO settings (key, value, encrypted, updated_at) VALUES (?, ?, 0, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?');
        Object.entries(settings).forEach(([k, v]) => stmt.run(k, String(v), now, String(v), now));
        return true;
    }
};

// ============================================
// INTEGRATION SYSTEM
// ============================================

const IntegrationSystem = {
    getCredentials(type) {
        return getDb().prepare('SELECT * FROM integration_credentials WHERE type = ?').get(type);
    },
    
    saveCredentials(type, credentials, encrypted = false) {
        const now = new Date().toISOString();
        const existing = this.getCredentials(type);
        const creds = typeof credentials === 'string' ? credentials : JSON.stringify(credentials);
        
        if (existing) {
            getDb().prepare('UPDATE integration_credentials SET credentials = ?, encrypted = ?, updated_at = ? WHERE type = ?')
                .run(creds, encrypted ? 1 : 0, now, type);
        } else {
            getDb().prepare('INSERT INTO integration_credentials (id, type, credentials, encrypted, is_connected, updated_at) VALUES (?, ?, ?, ?, 0, ?)')
                .run(uuidv4(), type, creds, encrypted ? 1 : 0, now);
        }
        return true;
    },
    
    setConnected(type, connected) {
        getDb().prepare('UPDATE integration_credentials SET is_connected = ?, updated_at = ? WHERE type = ?')
            .run(connected ? 1 : 0, new Date().toISOString(), type);
    },
    
    deleteCredentials(type) {
        return getDb().prepare('DELETE FROM integration_credentials WHERE type = ?').run(type).changes > 0;
    },
    
    getStatus() {
        const all = getDb().prepare('SELECT type, is_connected FROM integration_credentials').all();
        return {
            sharepoint: { configured: all.some(c => c.type === 'sharepoint'), connected: all.find(c => c.type === 'sharepoint')?.is_connected || false },
            jira: { configured: all.some(c => c.type === 'jira'), connected: all.find(c => c.type === 'jira')?.is_connected || false }
        };
    }
};

// ============================================
// TOKEN SYSTEM (for JWT refresh tokens)
// ============================================

const crypto = require('crypto');

const TokenSystem = {
    create(userId, token, expiresAt) {
        const id = uuidv4();
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        getDb().prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
            .run(id, userId, tokenHash, expiresAt, new Date().toISOString());
        return { id, userId, token, expiresAt };
    },
    
    findByToken(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        return getDb().prepare("SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime('now')").get(tokenHash);
    },
    
    revoke(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        return getDb().prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(tokenHash).changes > 0;
    },
    
    revokeAllForUser(userId) {
        return getDb().prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0').run(userId).changes;
    },
    
    cleanup() {
        return getDb().prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now') OR revoked = 1").run().changes;
    }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Database management
    getDb,
    closeDb,
    initSchema,
    seedData,
    DB_PATH,
    DATA_DIR,
    
    // Subsystems
    UserSystem,
    RoleSystem,
    TicketSystem,
    QualitySystem,
    SettingsSystem,
    IntegrationSystem,
    TokenSystem
};
