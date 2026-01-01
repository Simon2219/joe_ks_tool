/**
 * Database.js
 * Consolidated SQLite database operations for all subsystems
 * Uses sql.js (pure JavaScript - no native compilation required)
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const Config = require('../../../config/Config');

// ============================================
// DATABASE CONNECTION
// ============================================

const DATA_DIR = path.join(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'customer-support.db');

let db = null;
let SQL = null;
let saveInterval = null;

/**
 * Initialize sql.js and load/create database
 */
async function initDb() {
    if (db) return db;

    // Initialize sql.js
    SQL = await initSqlJs();

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Load existing database or create new
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('Database loaded from file');
    } else {
        db = new SQL.Database();
        console.log('New database created');
    }

    // Auto-save every 30 seconds
    saveInterval = setInterval(() => saveDb(), 30000);

    return db;
}

/**
 * Get database instance (must call initDb first)
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDb() first.');
    }
    return db;
}

/**
 * Save database to file
 */
function saveDb() {
    if (!db) return;
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    } catch (error) {
        console.error('Failed to save database:', error.message);
    }
}

/**
 * Close database connection
 */
function closeDb() {
    if (saveInterval) {
        clearInterval(saveInterval);
        saveInterval = null;
    }
    if (db) {
        saveDb(); // Final save
        db.close();
        db = null;
    }
}

/**
 * Execute a SQL statement
 */
function run(sql, params = []) {
    return getDb().run(sql, params);
}

/**
 * Get all rows from a query
 */
function all(sql, params = []) {
    const stmt = getDb().prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

/**
 * Get single row from a query
 */
function get(sql, params = []) {
    const results = all(sql, params);
    return results.length > 0 ? results[0] : null;
}

// ============================================
// SCHEMA INITIALIZATION
// ============================================

function initSchema() {
    const database = getDb();
    
    database.run(`
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
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT DEFAULT '',
            is_admin INTEGER DEFAULT 0,
            is_system INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS permissions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            module TEXT NOT NULL,
            description TEXT DEFAULT ''
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id TEXT NOT NULL,
            permission_id TEXT NOT NULL,
            PRIMARY KEY (role_id, permission_id)
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            revoked INTEGER DEFAULT 0
        )
    `);
    
    database.run(`
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
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS ticket_comments (
            id TEXT PRIMARY KEY,
            ticket_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS ticket_history (
            id TEXT PRIMARY KEY,
            ticket_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS quality_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            weight INTEGER DEFAULT 25,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS quality_criteria (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL,
            name TEXT NOT NULL,
            max_score INTEGER DEFAULT 10
        )
    `);
    
    database.run(`
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
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS quality_scores (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            category_id TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            max_score INTEGER DEFAULT 10
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            encrypted INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL
        )
    `);
    
    database.run(`
        CREATE TABLE IF NOT EXISTS integration_credentials (
            id TEXT PRIMARY KEY,
            type TEXT UNIQUE NOT NULL,
            credentials TEXT NOT NULL,
            encrypted INTEGER DEFAULT 0,
            is_connected INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL
        )
    `);

    // Create indexes
    database.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    database.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)');
    database.run('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');
    database.run('CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to)');
    database.run('CREATE INDEX IF NOT EXISTS idx_quality_reports_agent ON quality_reports(agent_id)');
    
    saveDb();
    console.log('Database schema initialized');
}

// ============================================
// SEED DEFAULT DATA
// ============================================

async function seedData() {
    const now = new Date().toISOString();
    
    // Check if already seeded
    const existing = get('SELECT id FROM users WHERE username = ?', ['admin']);
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
    
    permissions.forEach(p => {
        run('INSERT OR IGNORE INTO permissions (id, name, module) VALUES (?, ?, ?)', [p.id, p.name, p.module]);
    });
    
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
    
    roles.forEach(r => {
        run('INSERT OR IGNORE INTO roles (id, name, description, is_admin, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [r.id, r.name, r.description, r.isAdmin, r.isSystem, now, now]);
        r.permissions.forEach(p => {
            run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [r.id, p]);
        });
    });
    
    // Default admin user
    const bcryptRounds = Config.get('security.bcryptRounds', 10);
    const hashedPw = await bcrypt.hash('admin123', bcryptRounds);
    run(`INSERT INTO users (id, username, email, password, first_name, last_name, role_id, department, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), 'admin', 'admin@company.com', hashedPw, 'System', 'Administrator', 'admin', 'IT', 1, now, now]);
    
    // Default quality categories
    const categories = [
        { name: 'Communication', description: 'Communication skills', weight: 25, criteria: ['Clarity', 'Professionalism', 'Empathy'] },
        { name: 'Problem Resolution', description: 'Issue resolution ability', weight: 30, criteria: ['First Contact Resolution', 'Solution Quality', 'Follow-up'] },
        { name: 'Process Adherence', description: 'Following procedures', weight: 20, criteria: ['Documentation', 'Compliance', 'Tool Usage'] },
        { name: 'Product Knowledge', description: 'Product understanding', weight: 25, criteria: ['Technical Accuracy', 'Feature Knowledge', 'Policy Understanding'] }
    ];
    
    categories.forEach(c => {
        const catId = uuidv4();
        run('INSERT INTO quality_categories (id, name, description, weight, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [catId, c.name, c.description, c.weight, 1, now, now]);
        c.criteria.forEach(cr => {
            run('INSERT INTO quality_criteria (id, category_id, name, max_score) VALUES (?, ?, ?, ?)',
                [uuidv4(), catId, cr, 10]);
        });
    });
    
    // Default settings
    const defaultSettings = {
        'general.companyName': Config.get('app.companyName', 'Customer Support Agency'),
        'general.timezone': Config.get('app.timezone', 'UTC'),
        'tickets.defaultPriority': Config.get('tickets.defaultPriority', 'medium'),
        'tickets.slaEnabled': String(Config.get('tickets.slaEnabled', true)),
        'quality.passingScore': String(Config.get('quality.passingScore', 80))
    };
    
    Object.entries(defaultSettings).forEach(([k, v]) => {
        run('INSERT OR IGNORE INTO settings (key, value, encrypted, updated_at) VALUES (?, ?, ?, ?)', [k, v, 0, now]);
    });
    
    saveDb();
    console.log('Database seeding complete');
}

// ============================================
// USER SYSTEM
// ============================================

const UserSystem = {
    getAll() {
        return all(`
            SELECT u.*, r.name as role_name, r.is_admin 
            FROM users u LEFT JOIN roles r ON u.role_id = r.id 
            ORDER BY u.created_at DESC
        `);
    },
    
    getById(id) {
        return get(`
            SELECT u.*, r.name as role_name, r.is_admin 
            FROM users u LEFT JOIN roles r ON u.role_id = r.id 
            WHERE u.id = ?
        `, [id]);
    },
    
    getByUsername(username) {
        return get(`
            SELECT u.*, r.name as role_name, r.is_admin 
            FROM users u LEFT JOIN roles r ON u.role_id = r.id 
            WHERE LOWER(u.username) = LOWER(?)
        `, [username]);
    },
    
    getByEmail(email) {
        return get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    },
    
    getByRole(roleId) {
        return all('SELECT * FROM users WHERE role_id = ?', [roleId]);
    },
    
    async create(data) {
        const now = new Date().toISOString();
        const id = uuidv4();
        const bcryptRounds = Config.get('security.bcryptRounds', 10);
        const hashedPw = await bcrypt.hash(data.password, bcryptRounds);
        const defaultRole = Config.get('users.defaultRole', 'agent');
        
        run(`INSERT INTO users (id, username, email, password, first_name, last_name, role_id, department, phone, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, data.username.toLowerCase(), data.email.toLowerCase(), hashedPw, data.firstName, data.lastName,
             data.roleId || defaultRole, data.department || '', data.phone || '', data.isActive !== false ? 1 : 0, now, now]);
        
        saveDb();
        return this.getById(id);
    },
    
    async update(id, data) {
        const now = new Date().toISOString();
        const existing = this.getById(id);
        if (!existing) return null;
        
        let sql = 'UPDATE users SET updated_at = ?';
        let params = [now];
        
        if (data.username) { sql += ', username = ?'; params.push(data.username.toLowerCase()); }
        if (data.email) { sql += ', email = ?'; params.push(data.email.toLowerCase()); }
        if (data.password) { 
            const bcryptRounds = Config.get('security.bcryptRounds', 10);
            sql += ', password = ?'; 
            params.push(await bcrypt.hash(data.password, bcryptRounds)); 
        }
        if (data.firstName) { sql += ', first_name = ?'; params.push(data.firstName); }
        if (data.lastName) { sql += ', last_name = ?'; params.push(data.lastName); }
        if (data.roleId) { sql += ', role_id = ?'; params.push(data.roleId); }
        if (data.department !== undefined) { sql += ', department = ?'; params.push(data.department); }
        if (data.phone !== undefined) { sql += ', phone = ?'; params.push(data.phone); }
        if (data.isActive !== undefined) { sql += ', is_active = ?'; params.push(data.isActive ? 1 : 0); }
        if (data.lastLogin) { sql += ', last_login = ?'; params.push(data.lastLogin); }
        
        sql += ' WHERE id = ?';
        params.push(id);
        
        run(sql, params);
        saveDb();
        return this.getById(id);
    },
    
    delete(id) {
        run('DELETE FROM users WHERE id = ?', [id]);
        saveDb();
        return true;
    },
    
    async validatePassword(user, password) {
        return bcrypt.compare(password, user.password);
    },
    
    getWithPermissions(id) {
        const user = this.getById(id);
        if (!user) return null;
        const permissions = all('SELECT permission_id FROM role_permissions WHERE role_id = ?', [user.role_id]).map(p => p.permission_id);
        return { ...user, permissions };
    },
    
    count() {
        return get('SELECT COUNT(*) as count FROM users').count;
    },
    
    countActive() {
        return get('SELECT COUNT(*) as count FROM users WHERE is_active = 1').count;
    }
};

// ============================================
// ROLE SYSTEM
// ============================================

const RoleSystem = {
    getAll() {
        const roles = all('SELECT * FROM roles ORDER BY is_system DESC, name');
        return roles.map(r => ({
            ...r,
            is_admin: !!r.is_admin,
            is_system: !!r.is_system,
            permissions: this.getPermissions(r.id),
            userCount: get('SELECT COUNT(*) as c FROM users WHERE role_id = ?', [r.id]).c
        }));
    },
    
    getById(id) {
        const role = get('SELECT * FROM roles WHERE id = ?', [id]);
        if (!role) return null;
        return { ...role, is_admin: !!role.is_admin, is_system: !!role.is_system, permissions: this.getPermissions(id) };
    },
    
    getPermissions(roleId) {
        return all('SELECT permission_id FROM role_permissions WHERE role_id = ?', [roleId]).map(p => p.permission_id);
    },
    
    getAllPermissions() {
        return all('SELECT * FROM permissions ORDER BY module, name');
    },
    
    create(data) {
        const now = new Date().toISOString();
        const id = uuidv4();
        
        run('INSERT INTO roles (id, name, description, is_admin, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, data.name, data.description || '', data.isAdmin ? 1 : 0, 0, now, now]);
        
        (data.permissions || []).forEach(p => {
            run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, p]);
        });
        
        saveDb();
        return this.getById(id);
    },
    
    update(id, data) {
        const now = new Date().toISOString();
        const existing = this.getById(id);
        if (!existing) return null;
        
        let sql = 'UPDATE roles SET updated_at = ?';
        let params = [now];
        
        if (data.name) { sql += ', name = ?'; params.push(data.name); }
        if (data.description !== undefined) { sql += ', description = ?'; params.push(data.description); }
        if (data.isAdmin !== undefined && !existing.is_system) { sql += ', is_admin = ?'; params.push(data.isAdmin ? 1 : 0); }
        
        sql += ' WHERE id = ?';
        params.push(id);
        run(sql, params);
        
        if (data.permissions) {
            run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
            data.permissions.forEach(p => {
                run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, p]);
            });
        }
        
        saveDb();
        return this.getById(id);
    },
    
    delete(id) {
        const role = this.getById(id);
        if (!role) return { success: false, error: 'Role not found' };
        if (role.is_system) return { success: false, error: 'Cannot delete system roles' };
        
        const userCount = get('SELECT COUNT(*) as c FROM users WHERE role_id = ?', [id]).c;
        if (userCount > 0) return { success: false, error: `${userCount} users have this role` };
        
        run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
        run('DELETE FROM roles WHERE id = ?', [id]);
        saveDb();
        return { success: true };
    },
    
    hasPermission(roleId, permissionId) {
        const role = get('SELECT is_admin FROM roles WHERE id = ?', [roleId]);
        if (role?.is_admin) return true;
        return !!get('SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?', [roleId, permissionId]);
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
        const slaDurations = Config.get('tickets.slaDurations', { critical: 2, high: 8, medium: 24, low: 72 });
        const hours = slaDurations[priority] || slaDurations.medium || 24;
        return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
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
        return all(sql, params);
    },
    
    getByUser(userId) {
        return all(`
            SELECT t.*, 
                (SELECT first_name || ' ' || last_name FROM users WHERE id = t.assigned_to) as assigned_to_name,
                (SELECT first_name || ' ' || last_name FROM users WHERE id = t.created_by) as created_by_name
            FROM tickets t WHERE t.assigned_to = ? OR t.created_by = ? ORDER BY t.created_at DESC
        `, [userId, userId]);
    },
    
    getById(id) {
        return get(`
            SELECT t.*, 
                (SELECT first_name || ' ' || last_name FROM users WHERE id = t.assigned_to) as assigned_to_name,
                (SELECT first_name || ' ' || last_name FROM users WHERE id = t.created_by) as created_by_name
            FROM tickets t WHERE t.id = ?
        `, [id]);
    },
    
    create(data, userId) {
        const now = new Date().toISOString();
        const id = uuidv4();
        const priority = data.priority || Config.get('tickets.defaultPriority', 'medium');
        
        run(`INSERT INTO tickets (id, ticket_number, title, description, status, priority, category, customer_name, customer_email, customer_phone, assigned_to, created_by, due_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, this.generateNumber(), data.title, data.description, 'new', priority, data.category || 'general',
             data.customerName || '', data.customerEmail || '', data.customerPhone || '', data.assignedTo || null,
             userId, this.calculateDueDate(priority), now, now]);
        
        this.addHistory(id, 'created', 'Ticket created', userId);
        saveDb();
        return this.getById(id);
    },
    
    update(id, data, userId) {
        const now = new Date().toISOString();
        let sql = 'UPDATE tickets SET updated_at = ?';
        let params = [now];
        
        if (data.title) { sql += ', title = ?'; params.push(data.title); }
        if (data.description) { sql += ', description = ?'; params.push(data.description); }
        if (data.priority) { sql += ', priority = ?, due_date = ?'; params.push(data.priority, this.calculateDueDate(data.priority)); }
        if (data.category) { sql += ', category = ?'; params.push(data.category); }
        if (data.customerName !== undefined) { sql += ', customer_name = ?'; params.push(data.customerName); }
        if (data.customerEmail !== undefined) { sql += ', customer_email = ?'; params.push(data.customerEmail); }
        if (data.customerPhone !== undefined) { sql += ', customer_phone = ?'; params.push(data.customerPhone); }
        
        sql += ' WHERE id = ?';
        params.push(id);
        run(sql, params);
        
        if (userId) this.addHistory(id, 'updated', 'Ticket updated', userId);
        saveDb();
        return this.getById(id);
    },
    
    changeStatus(id, status, userId) {
        const now = new Date().toISOString();
        const ticket = this.getById(id);
        
        let sql = 'UPDATE tickets SET status = ?, updated_at = ?';
        let params = [status, now];
        
        if (status === 'resolved') { sql += ', resolved_at = ?'; params.push(now); }
        if (status === 'closed') { sql += ', closed_at = ?'; params.push(now); }
        
        sql += ' WHERE id = ?';
        params.push(id);
        run(sql, params);
        
        this.addHistory(id, 'status_changed', `Status: ${ticket.status} → ${status}`, userId);
        saveDb();
        return this.getById(id);
    },
    
    assign(id, assignedTo, userId) {
        const now = new Date().toISOString();
        const ticket = this.getById(id);
        const status = ticket.status === 'new' ? 'open' : ticket.status;
        
        run('UPDATE tickets SET assigned_to = ?, status = ?, updated_at = ? WHERE id = ?', [assignedTo || null, status, now, id]);
        this.addHistory(id, 'assigned', assignedTo ? 'Ticket assigned' : 'Ticket unassigned', userId);
        saveDb();
        return this.getById(id);
    },
    
    delete(id) {
        run('DELETE FROM ticket_comments WHERE ticket_id = ?', [id]);
        run('DELETE FROM ticket_history WHERE ticket_id = ?', [id]);
        run('DELETE FROM tickets WHERE id = ?', [id]);
        saveDb();
        return true;
    },
    
    getComments(ticketId) {
        return all(`
            SELECT c.*, (SELECT first_name || ' ' || last_name FROM users WHERE id = c.user_id) as user_name
            FROM ticket_comments c WHERE c.ticket_id = ? ORDER BY c.created_at DESC
        `, [ticketId]);
    },
    
    addComment(ticketId, userId, content) {
        const now = new Date().toISOString();
        const id = uuidv4();
        run('INSERT INTO ticket_comments (id, ticket_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)', [id, ticketId, userId, content, now]);
        this.addHistory(ticketId, 'comment_added', 'Comment added', userId);
        saveDb();
        return get(`
            SELECT c.*, (SELECT first_name || ' ' || last_name FROM users WHERE id = c.user_id) as user_name
            FROM ticket_comments c WHERE c.id = ?
        `, [id]);
    },
    
    getHistory(ticketId) {
        return all(`
            SELECT h.*, (SELECT first_name || ' ' || last_name FROM users WHERE id = h.user_id) as user_name
            FROM ticket_history h WHERE h.ticket_id = ? ORDER BY h.created_at DESC
        `, [ticketId]);
    },
    
    addHistory(ticketId, action, details, userId) {
        run('INSERT INTO ticket_history (id, ticket_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [uuidv4(), ticketId, userId, action, details, new Date().toISOString()]);
    },
    
    getStatistics() {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const byStatus = all('SELECT status, COUNT(*) as c FROM tickets GROUP BY status');
        const byPriority = all('SELECT priority, COUNT(*) as c FROM tickets GROUP BY priority');
        
        return {
            total: get('SELECT COUNT(*) as c FROM tickets').c,
            byStatus: Object.fromEntries(byStatus.map(r => [r.status, r.c])),
            byPriority: Object.fromEntries(byPriority.map(r => [r.priority, r.c])),
            openTickets: get("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('resolved', 'closed')").c,
            resolvedThisWeek: get('SELECT COUNT(*) as c FROM tickets WHERE resolved_at >= ?', [weekAgo]).c,
            createdThisWeek: get('SELECT COUNT(*) as c FROM tickets WHERE created_at >= ?', [weekAgo]).c
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
        
        const reports = all(sql, params);
        return reports.map(r => ({ ...r, passed: !!r.passed, categoryScores: this.getReportScores(r.id) }));
    },
    
    getByAgent(agentId) {
        return this.getAllReports({ agentId });
    },
    
    getReportById(id) {
        const report = get(`
            SELECT r.*, 
                (SELECT first_name || ' ' || last_name FROM users WHERE id = r.agent_id) as agent_name,
                (SELECT first_name || ' ' || last_name FROM users WHERE id = r.evaluator_id) as evaluator_name
            FROM quality_reports r WHERE r.id = ?
        `, [id]);
        if (!report) return null;
        return { ...report, passed: !!report.passed, categoryScores: this.getReportScores(id) };
    },
    
    getReportScores(reportId) {
        return all(`
            SELECT s.*, c.name as category_name, c.weight 
            FROM quality_scores s LEFT JOIN quality_categories c ON s.category_id = c.id
            WHERE s.report_id = ?
        `, [reportId]);
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
        const passingScore = parseInt(SettingsSystem.get('quality.passingScore') || Config.get('quality.passingScore', 80));
        
        run(`INSERT INTO quality_reports (id, report_number, agent_id, evaluator_id, evaluation_type, evaluation_date, overall_score, passed, strengths, improvements, coaching_notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, `QA-${Date.now().toString(36).toUpperCase()}`, data.agentId, evaluatorId, data.evaluationType,
             now, overallScore, overallScore >= passingScore ? 1 : 0, data.strengths || '', data.areasForImprovement || '', data.coachingNotes || '', now, now]);
        
        data.categoryScores.forEach(s => {
            run('INSERT INTO quality_scores (id, report_id, category_id, score, max_score) VALUES (?, ?, ?, ?, ?)',
                [uuidv4(), id, s.categoryId, s.score, s.maxScore]);
        });
        
        saveDb();
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
        const passingScore = parseInt(SettingsSystem.get('quality.passingScore') || Config.get('quality.passingScore', 80));
        
        run(`UPDATE quality_reports SET evaluation_type = ?, overall_score = ?, passed = ?, strengths = ?, improvements = ?, coaching_notes = ?, updated_at = ? WHERE id = ?`,
            [data.evaluationType || existing.evaluation_type, overallScore, overallScore >= passingScore ? 1 : 0,
             data.strengths ?? existing.strengths, data.areasForImprovement ?? existing.improvements, data.coachingNotes ?? existing.coaching_notes, now, id]);
        
        if (data.categoryScores) {
            run('DELETE FROM quality_scores WHERE report_id = ?', [id]);
            data.categoryScores.forEach(s => {
                run('INSERT INTO quality_scores (id, report_id, category_id, score, max_score) VALUES (?, ?, ?, ?, ?)',
                    [uuidv4(), id, s.categoryId, s.score, s.maxScore]);
            });
        }
        
        saveDb();
        return this.getReportById(id);
    },
    
    deleteReport(id) {
        run('DELETE FROM quality_scores WHERE report_id = ?', [id]);
        run('DELETE FROM quality_reports WHERE id = ?', [id]);
        saveDb();
        return true;
    },
    
    getAllCategories() {
        const cats = all('SELECT * FROM quality_categories ORDER BY name');
        return cats.map(c => ({ ...c, is_active: !!c.is_active, criteria: this.getCategoryCriteria(c.id) }));
    },
    
    getActiveCategories() {
        return this.getAllCategories().filter(c => c.is_active);
    },
    
    getCategoryById(id) {
        const cat = get('SELECT * FROM quality_categories WHERE id = ?', [id]);
        if (!cat) return null;
        return { ...cat, is_active: !!cat.is_active, criteria: this.getCategoryCriteria(id) };
    },
    
    getCategoryCriteria(categoryId) {
        return all('SELECT * FROM quality_criteria WHERE category_id = ?', [categoryId]);
    },
    
    createCategory(data) {
        const now = new Date().toISOString();
        const id = uuidv4();
        
        run('INSERT INTO quality_categories (id, name, description, weight, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, data.name, data.description || '', data.weight || 25, 1, now, now]);
        
        if (data.criteria?.length) {
            data.criteria.forEach(c => {
                run('INSERT INTO quality_criteria (id, category_id, name, max_score) VALUES (?, ?, ?, ?)',
                    [uuidv4(), id, c.name, c.maxScore || 10]);
            });
        }
        
        saveDb();
        return this.getCategoryById(id);
    },
    
    updateCategory(id, data) {
        const now = new Date().toISOString();
        
        let sql = 'UPDATE quality_categories SET updated_at = ?';
        let params = [now];
        
        if (data.name) { sql += ', name = ?'; params.push(data.name); }
        if (data.description !== undefined) { sql += ', description = ?'; params.push(data.description); }
        if (data.weight !== undefined) { sql += ', weight = ?'; params.push(data.weight); }
        if (data.isActive !== undefined) { sql += ', is_active = ?'; params.push(data.isActive ? 1 : 0); }
        
        sql += ' WHERE id = ?';
        params.push(id);
        run(sql, params);
        
        if (data.criteria) {
            run('DELETE FROM quality_criteria WHERE category_id = ?', [id]);
            data.criteria.forEach(c => {
                run('INSERT INTO quality_criteria (id, category_id, name, max_score) VALUES (?, ?, ?, ?)',
                    [uuidv4(), id, c.name, c.maxScore || 10]);
            });
        }
        
        saveDb();
        return this.getCategoryById(id);
    },
    
    deleteCategory(id) {
        const used = get('SELECT COUNT(*) as c FROM quality_scores WHERE category_id = ?', [id]).c;
        if (used > 0) return { success: false, error: 'Category is used in evaluations' };
        
        run('DELETE FROM quality_criteria WHERE category_id = ?', [id]);
        run('DELETE FROM quality_categories WHERE id = ?', [id]);
        saveDb();
        return { success: true };
    },
    
    getStatistics() {
        const monthStart = new Date(new Date().setDate(1)).toISOString().split('T')[0];
        const reports = all('SELECT * FROM quality_reports');
        
        return {
            totalReports: reports.length,
            reportsThisMonth: get('SELECT COUNT(*) as c FROM quality_reports WHERE evaluation_date >= ?', [monthStart]).c,
            averageScore: reports.length ? Math.round(reports.reduce((sum, r) => sum + r.overall_score, 0) / reports.length) : 0,
            passingRate: reports.length ? Math.round(reports.filter(r => r.passed).length / reports.length * 100) : 0,
            categoryCount: get('SELECT COUNT(*) as c FROM quality_categories WHERE is_active = 1').c
        };
    }
};

// ============================================
// SETTINGS SYSTEM
// ============================================

const SettingsSystem = {
    getAll() {
        const rows = all('SELECT key, value FROM settings');
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
        const row = get('SELECT value FROM settings WHERE key = ?', [key]);
        return row?.value || null;
    },
    
    set(key, value) {
        const now = new Date().toISOString();
        const existing = get('SELECT key FROM settings WHERE key = ?', [key]);
        if (existing) {
            run('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [value, now, key]);
        } else {
            run('INSERT INTO settings (key, value, encrypted, updated_at) VALUES (?, ?, 0, ?)', [key, value, now]);
        }
        saveDb();
        return true;
    },
    
    setMany(settings) {
        const now = new Date().toISOString();
        Object.entries(settings).forEach(([k, v]) => {
            const existing = get('SELECT key FROM settings WHERE key = ?', [k]);
            if (existing) {
                run('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [String(v), now, k]);
            } else {
                run('INSERT INTO settings (key, value, encrypted, updated_at) VALUES (?, ?, 0, ?)', [k, String(v), now]);
            }
        });
        saveDb();
        return true;
    }
};

// ============================================
// INTEGRATION SYSTEM
// ============================================

const IntegrationSystem = {
    getCredentials(type) {
        return get('SELECT * FROM integration_credentials WHERE type = ?', [type]);
    },
    
    saveCredentials(type, credentials, encrypted = false) {
        const now = new Date().toISOString();
        const existing = this.getCredentials(type);
        const creds = typeof credentials === 'string' ? credentials : JSON.stringify(credentials);
        
        if (existing) {
            run('UPDATE integration_credentials SET credentials = ?, encrypted = ?, updated_at = ? WHERE type = ?',
                [creds, encrypted ? 1 : 0, now, type]);
        } else {
            run('INSERT INTO integration_credentials (id, type, credentials, encrypted, is_connected, updated_at) VALUES (?, ?, ?, ?, 0, ?)',
                [uuidv4(), type, creds, encrypted ? 1 : 0, now]);
        }
        saveDb();
        return true;
    },
    
    setConnected(type, connected) {
        run('UPDATE integration_credentials SET is_connected = ?, updated_at = ? WHERE type = ?',
            [connected ? 1 : 0, new Date().toISOString(), type]);
        saveDb();
    },
    
    deleteCredentials(type) {
        run('DELETE FROM integration_credentials WHERE type = ?', [type]);
        saveDb();
        return true;
    },
    
    getStatus() {
        const allCreds = all('SELECT type, is_connected FROM integration_credentials');
        return {
            sharepoint: { configured: allCreds.some(c => c.type === 'sharepoint'), connected: allCreds.find(c => c.type === 'sharepoint')?.is_connected || false },
            jira: { configured: allCreds.some(c => c.type === 'jira'), connected: allCreds.find(c => c.type === 'jira')?.is_connected || false }
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
        run('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
            [id, userId, tokenHash, expiresAt, new Date().toISOString()]);
        saveDb();
        return { id, userId, token, expiresAt };
    },
    
    findByToken(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        return get("SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime('now')", [tokenHash]);
    },
    
    revoke(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        run('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [tokenHash]);
        saveDb();
        return true;
    },
    
    revokeAllForUser(userId) {
        const result = all('SELECT id FROM refresh_tokens WHERE user_id = ? AND revoked = 0', [userId]);
        run('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0', [userId]);
        saveDb();
        return result.length;
    },
    
    cleanup() {
        run("DELETE FROM refresh_tokens WHERE expires_at < datetime('now') OR revoked = 1");
        saveDb();
        return true;
    }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Database management
    initDb,
    getDb,
    closeDb,
    saveDb,
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
