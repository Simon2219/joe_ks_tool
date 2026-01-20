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

    // ============================================
    // KNOWLEDGE CHECK SYSTEM TABLES
    // ============================================

    // Categories for grouping questions
    database.run(`
        CREATE TABLE IF NOT EXISTS kc_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            default_weighting INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);

    // Questions catalog
    database.run(`
        CREATE TABLE IF NOT EXISTS kc_questions (
            id TEXT PRIMARY KEY,
            category_id TEXT,
            title TEXT DEFAULT '',
            question_text TEXT NOT NULL,
            question_type TEXT DEFAULT 'multiple_choice',
            weighting INTEGER DEFAULT NULL,
            exact_answer TEXT DEFAULT '',
            trigger_words TEXT DEFAULT '[]',
            is_active INTEGER DEFAULT 1,
            is_archived INTEGER DEFAULT 0,
            archived_at TEXT DEFAULT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (category_id) REFERENCES kc_categories(id)
        )
    `);

    // Multiple choice options for questions
    database.run(`
        CREATE TABLE IF NOT EXISTS kc_question_options (
            id TEXT PRIMARY KEY,
            question_id TEXT NOT NULL,
            option_text TEXT NOT NULL,
            is_correct INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (question_id) REFERENCES kc_questions(id) ON DELETE CASCADE
        )
    `);

    // Test catalog (groupings of questions)
    database.run(`
        CREATE TABLE IF NOT EXISTS kc_tests (
            id TEXT PRIMARY KEY,
            test_number TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            category_id TEXT,
            time_limit_minutes INTEGER DEFAULT NULL,
            passing_score INTEGER DEFAULT 80,
            is_active INTEGER DEFAULT 1,
            is_archived INTEGER DEFAULT 0,
            archived_at TEXT DEFAULT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (category_id) REFERENCES kc_categories(id)
        )
    `);

    // Junction table for tests and questions
    database.run(`
        CREATE TABLE IF NOT EXISTS kc_test_questions (
            id TEXT PRIMARY KEY,
            test_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            weighting_override INTEGER DEFAULT NULL,
            FOREIGN KEY (test_id) REFERENCES kc_tests(id) ON DELETE CASCADE,
            FOREIGN KEY (question_id) REFERENCES kc_questions(id) ON DELETE CASCADE
        )
    `);

    // Test results
    database.run(`
        CREATE TABLE IF NOT EXISTS kc_test_results (
            id TEXT PRIMARY KEY,
            result_number TEXT UNIQUE NOT NULL,
            test_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            evaluator_id TEXT,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            total_score REAL DEFAULT 0,
            max_score REAL DEFAULT 0,
            percentage REAL DEFAULT 0,
            passed INTEGER DEFAULT 0,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (test_id) REFERENCES kc_tests(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (evaluator_id) REFERENCES users(id)
        )
    `);

    // Individual answers in a test result
    database.run(`
        CREATE TABLE IF NOT EXISTS kc_test_answers (
            id TEXT PRIMARY KEY,
            result_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            answer_text TEXT DEFAULT '',
            selected_options TEXT DEFAULT '[]',
            is_correct INTEGER DEFAULT 0,
            score REAL DEFAULT 0,
            max_score REAL DEFAULT 0,
            evaluator_notes TEXT DEFAULT '',
            FOREIGN KEY (result_id) REFERENCES kc_test_results(id) ON DELETE CASCADE,
            FOREIGN KEY (question_id) REFERENCES kc_questions(id)
        )
    `);

    // Create indexes
    database.run('CREATE INDEX IF NOT EXISTS idx_kc_questions_category ON kc_questions(category_id)');
    database.run('CREATE INDEX IF NOT EXISTS idx_kc_test_questions_test ON kc_test_questions(test_id)');
    database.run('CREATE INDEX IF NOT EXISTS idx_kc_test_results_test ON kc_test_results(test_id)');
    database.run('CREATE INDEX IF NOT EXISTS idx_kc_test_results_user ON kc_test_results(user_id)');
    database.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    database.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)');
    database.run('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');
    database.run('CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to)');
    database.run('CREATE INDEX IF NOT EXISTS idx_quality_reports_agent ON quality_reports(agent_id)');
    
    // Run migrations for existing databases
    runMigrations(database);
    
    saveDb();
    console.log('Database schema initialized');
}

/**
 * Run database migrations to add missing columns to existing tables
 */
function runMigrations(database) {
    console.log('Running database migrations...');
    
    // Helper function to check if a column exists
    function columnExists(tableName, columnName) {
        try {
            const result = all(`PRAGMA table_info(${tableName})`);
            return result.some(col => col.name === columnName);
        } catch (e) {
            return false;
        }
    }
    
    // Migration 1: Add is_archived and archived_at to kc_questions
    if (!columnExists('kc_questions', 'is_archived')) {
        console.log('Adding is_archived column to kc_questions...');
        database.run('ALTER TABLE kc_questions ADD COLUMN is_archived INTEGER DEFAULT 0');
    }
    if (!columnExists('kc_questions', 'archived_at')) {
        console.log('Adding archived_at column to kc_questions...');
        database.run('ALTER TABLE kc_questions ADD COLUMN archived_at TEXT DEFAULT NULL');
    }
    
    // Migration 2: Add is_archived and archived_at to kc_tests
    if (!columnExists('kc_tests', 'is_archived')) {
        console.log('Adding is_archived column to kc_tests...');
        database.run('ALTER TABLE kc_tests ADD COLUMN is_archived INTEGER DEFAULT 0');
    }
    if (!columnExists('kc_tests', 'archived_at')) {
        console.log('Adding archived_at column to kc_tests...');
        database.run('ALTER TABLE kc_tests ADD COLUMN archived_at TEXT DEFAULT NULL');
    }
    
    console.log('Database migrations completed');
}

// ============================================
// SEED DEFAULT DATA
// ============================================

/**
 * Ensure all current permissions exist in the database (for existing installations)
 */
function ensurePermissions() {
    console.log('Ensuring all permissions exist...');
    
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
        { id: 'kc_view', name: 'View Knowledge Check Tab', module: 'knowledge_check' },
        { id: 'kc_questions_view', name: 'View Question Catalog', module: 'knowledge_check' },
        { id: 'kc_questions_create', name: 'Create Questions', module: 'knowledge_check' },
        { id: 'kc_questions_edit', name: 'Edit Questions', module: 'knowledge_check' },
        { id: 'kc_questions_delete', name: 'Delete Questions', module: 'knowledge_check' },
        { id: 'kc_categories_create', name: 'Create Categories', module: 'knowledge_check' },
        { id: 'kc_categories_edit', name: 'Edit Categories', module: 'knowledge_check' },
        { id: 'kc_categories_delete', name: 'Delete Categories', module: 'knowledge_check' },
        { id: 'kc_tests_view', name: 'View Test Catalog', module: 'knowledge_check' },
        { id: 'kc_tests_create', name: 'Create Tests', module: 'knowledge_check' },
        { id: 'kc_tests_edit', name: 'Edit Tests', module: 'knowledge_check' },
        { id: 'kc_tests_delete', name: 'Delete Tests', module: 'knowledge_check' },
        { id: 'kc_results_view', name: 'View Test Results', module: 'knowledge_check' },
        { id: 'kc_results_create', name: 'Conduct Tests', module: 'knowledge_check' },
        { id: 'kc_results_delete', name: 'Delete Test Results', module: 'knowledge_check' },
        { id: 'kc_archive_view', name: 'View Archive', module: 'knowledge_check' },
        { id: 'kc_archive_restore', name: 'Restore from Archive', module: 'knowledge_check' },
        { id: 'kc_archive_delete', name: 'Permanently Delete Archived', module: 'knowledge_check' },
        { id: 'role_view', name: 'View Roles', module: 'roles' },
        { id: 'role_create', name: 'Create Roles', module: 'roles' },
        { id: 'role_edit', name: 'Edit Roles', module: 'roles' },
        { id: 'role_delete', name: 'Delete Roles', module: 'roles' },
        { id: 'settings_view', name: 'View Settings', module: 'settings' },
        { id: 'settings_edit', name: 'Edit Settings', module: 'settings' },
        { id: 'admin_access', name: 'Admin Access', module: 'admin' },
        { id: 'integration_access', name: 'Integration Access', module: 'integrations' }
    ];
    
    let addedCount = 0;
    permissions.forEach(p => {
        const exists = get('SELECT id FROM permissions WHERE id = ?', [p.id]);
        if (!exists) {
            run('INSERT INTO permissions (id, name, module) VALUES (?, ?, ?)', [p.id, p.name, p.module]);
            addedCount++;
        }
    });
    
    // Grant all KC permissions to admin role if it exists
    const adminRole = get('SELECT id FROM roles WHERE id = ? OR name = ?', ['admin', 'Administrator']);
    if (adminRole) {
        const kcPermIds = permissions.filter(p => p.module === 'knowledge_check').map(p => p.id);
        kcPermIds.forEach(permId => {
            run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRole.id, permId]);
        });
    }
    
    if (addedCount > 0) {
        console.log(`Added ${addedCount} new permissions`);
        saveDb();
    }
}

async function seedData() {
    const now = new Date().toISOString();
    
    // Always ensure permissions exist (for existing installations)
    ensurePermissions();
    
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
        { id: 'kc_view', name: 'View Knowledge Check Tab', module: 'knowledge_check' },
        { id: 'kc_questions_view', name: 'View Question Catalog', module: 'knowledge_check' },
        { id: 'kc_questions_create', name: 'Create Questions', module: 'knowledge_check' },
        { id: 'kc_questions_edit', name: 'Edit Questions', module: 'knowledge_check' },
        { id: 'kc_questions_delete', name: 'Delete Questions', module: 'knowledge_check' },
        { id: 'kc_categories_create', name: 'Create Categories', module: 'knowledge_check' },
        { id: 'kc_categories_edit', name: 'Edit Categories', module: 'knowledge_check' },
        { id: 'kc_categories_delete', name: 'Delete Categories', module: 'knowledge_check' },
        { id: 'kc_tests_view', name: 'View Test Catalog', module: 'knowledge_check' },
        { id: 'kc_tests_create', name: 'Create Tests', module: 'knowledge_check' },
        { id: 'kc_tests_edit', name: 'Edit Tests', module: 'knowledge_check' },
        { id: 'kc_tests_delete', name: 'Delete Tests', module: 'knowledge_check' },
        { id: 'kc_results_view', name: 'View Test Results', module: 'knowledge_check' },
        { id: 'kc_results_create', name: 'Conduct Tests', module: 'knowledge_check' },
        { id: 'kc_results_delete', name: 'Delete Test Results', module: 'knowledge_check' },
        { id: 'kc_archive_view', name: 'View Archive', module: 'knowledge_check' },
        { id: 'kc_archive_restore', name: 'Restore from Archive', module: 'knowledge_check' },
        { id: 'kc_archive_delete', name: 'Permanently Delete Archived', module: 'knowledge_check' },
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
    
    // Knowledge Check permission sets
    const kcManagerPerms = ['kc_view', 'kc_questions_view', 'kc_questions_create', 'kc_questions_edit', 'kc_questions_delete', 
                           'kc_categories_create', 'kc_categories_edit', 'kc_categories_delete',
                           'kc_tests_view', 'kc_tests_create', 'kc_tests_edit', 'kc_tests_delete',
                           'kc_results_view', 'kc_results_create', 'kc_results_delete',
                           'kc_archive_view', 'kc_archive_restore', 'kc_archive_delete'];
    const kcEditorPerms = ['kc_view', 'kc_questions_view', 'kc_questions_create', 'kc_questions_edit',
                          'kc_categories_create', 'kc_categories_edit',
                          'kc_tests_view', 'kc_tests_create', 'kc_tests_edit',
                          'kc_results_view', 'kc_results_create',
                          'kc_archive_view']; // Editors can view archive but not restore or delete
    const kcUserPerms = ['kc_view']; // Can only see the tab, not the sub-pages
    
    const roles = [
        { id: 'admin', name: 'Administrator', description: 'Full system access', isAdmin: 1, isSystem: 1, permissions: allPermIds },
        { id: 'supervisor', name: 'Supervisor', description: 'Team management', isAdmin: 0, isSystem: 1, 
          permissions: ['user_view', 'ticket_view', 'ticket_view_all', 'ticket_create', 'ticket_edit', 'ticket_assign', 'quality_view', 'quality_view_all', 'quality_create', ...kcEditorPerms, 'role_view', 'settings_view'] },
        { id: 'qa_analyst', name: 'QA Analyst', description: 'Quality evaluations', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', 'ticket_view', 'ticket_view_all', 'quality_view', 'quality_view_all', 'quality_create', 'quality_edit', 'quality_manage', ...kcEditorPerms] },
        { id: 'agent', name: 'Support Agent', description: 'Ticket handling', isAdmin: 0, isSystem: 1,
          permissions: ['ticket_view', 'ticket_create', 'ticket_edit', 'quality_view', ...kcUserPerms] },
        // Knowledge Check specific roles
        { id: 'kc_manager', name: 'Knowledge Manager', description: 'Full Knowledge Check management including delete', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', ...kcManagerPerms] },
        { id: 'kc_editor', name: 'Knowledge Editor', description: 'Create and edit Knowledge Check content', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', ...kcEditorPerms] },
        { id: 'kc_user', name: 'Knowledge User', description: 'View Knowledge Check (no content access)', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', ...kcUserPerms] }
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
        'quality.passingScore': String(Config.get('quality.passingScore', 80)),
        'knowledgeCheck.passingScore': '80'
    };
    
    Object.entries(defaultSettings).forEach(([k, v]) => {
        run('INSERT OR IGNORE INTO settings (key, value, encrypted, updated_at) VALUES (?, ?, ?, ?)', [k, v, 0, now]);
    });
    
    // Default Knowledge Check category
    const defaultKcCategory = {
        id: uuidv4(),
        name: 'Allgemein',
        description: 'Allgemeine Fragen',
        defaultWeighting: 1,
        sortOrder: 0
    };
    
    run(`INSERT OR IGNORE INTO kc_categories (id, name, description, default_weighting, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [defaultKcCategory.id, defaultKcCategory.name, defaultKcCategory.description, 
         defaultKcCategory.defaultWeighting, defaultKcCategory.sortOrder, now, now]);
    
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
// KNOWLEDGE CHECK SYSTEM
// ============================================

const KnowledgeCheckSystem = {
    // ID Generation helpers
    generateTestNumber() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 4; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `KC-${id}`;
    },

    generateResultNumber(testNumber) {
        // Get the last result for this test to increment
        const lastResult = get(
            "SELECT result_number FROM kc_test_results WHERE test_id = (SELECT id FROM kc_tests WHERE test_number = ?) ORDER BY created_at DESC LIMIT 1",
            [testNumber]
        );
        
        let suffix = '0000';
        if (lastResult && lastResult.result_number) {
            // Extract the suffix and increment
            const parts = lastResult.result_number.split('-');
            if (parts.length === 3) {
                const lastSuffix = parts[2];
                suffix = this.incrementBase36(lastSuffix);
            }
        }
        
        return `${testNumber}-${suffix}`;
    },

    incrementBase36(str) {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = str.toUpperCase().split('');
        let carry = 1;
        
        for (let i = result.length - 1; i >= 0 && carry; i--) {
            let index = chars.indexOf(result[i]);
            index += carry;
            if (index >= chars.length) {
                index = 0;
                carry = 1;
            } else {
                carry = 0;
            }
            result[i] = chars[index];
        }
        
        return result.join('');
    },

    // ============================================
    // CATEGORIES
    // ============================================
    
    getAllCategories() {
        const categories = all('SELECT * FROM kc_categories ORDER BY sort_order, name');
        return categories.map(c => ({
            ...c,
            is_active: !!c.is_active,
            questionCount: get('SELECT COUNT(*) as count FROM kc_questions WHERE category_id = ?', [c.id])?.count || 0
        }));
    },

    getCategoryById(id) {
        const category = get('SELECT * FROM kc_categories WHERE id = ?', [id]);
        if (!category) return null;
        return { ...category, is_active: !!category.is_active };
    },

    createCategory(data) {
        const now = new Date().toISOString();
        const id = uuidv4();
        const maxOrder = get('SELECT MAX(sort_order) as max FROM kc_categories')?.max || 0;
        
        run(`INSERT INTO kc_categories (id, name, description, default_weighting, sort_order, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, data.name, data.description || '', data.defaultWeighting || 1, maxOrder + 1, 1, now, now]);
        
        saveDb();
        return this.getCategoryById(id);
    },

    updateCategory(id, data) {
        const now = new Date().toISOString();
        let sql = 'UPDATE kc_categories SET updated_at = ?';
        let params = [now];
        
        if (data.name !== undefined) { sql += ', name = ?'; params.push(data.name); }
        if (data.description !== undefined) { sql += ', description = ?'; params.push(data.description); }
        if (data.defaultWeighting !== undefined) { sql += ', default_weighting = ?'; params.push(data.defaultWeighting); }
        if (data.sortOrder !== undefined) { sql += ', sort_order = ?'; params.push(data.sortOrder); }
        if (data.isActive !== undefined) { sql += ', is_active = ?'; params.push(data.isActive ? 1 : 0); }
        
        sql += ' WHERE id = ?';
        params.push(id);
        run(sql, params);
        
        saveDb();
        return this.getCategoryById(id);
    },

    deleteCategory(id) {
        const questionCount = get('SELECT COUNT(*) as count FROM kc_questions WHERE category_id = ?', [id])?.count || 0;
        if (questionCount > 0) {
            // Move questions to uncategorized (null category)
            run('UPDATE kc_questions SET category_id = NULL WHERE category_id = ?', [id]);
        }
        
        run('DELETE FROM kc_categories WHERE id = ?', [id]);
        saveDb();
        return { success: true };
    },

    reorderCategories(categoryIds) {
        categoryIds.forEach((id, index) => {
            run('UPDATE kc_categories SET sort_order = ? WHERE id = ?', [index, id]);
        });
        saveDb();
        return true;
    },

    // ============================================
    // QUESTIONS
    // ============================================

    getAllQuestions(filters = {}) {
        let sql = 'SELECT q.*, c.name as category_name FROM kc_questions q LEFT JOIN kc_categories c ON q.category_id = c.id WHERE 1=1';
        const params = [];
        
        // Exclude archived by default unless specifically requested
        if (filters.includeArchived) {
            // Include all
        } else if (filters.archivedOnly) {
            sql += ' AND q.is_archived = 1';
        } else {
            sql += ' AND q.is_archived = 0';
        }
        
        if (filters.categoryId) {
            if (filters.categoryId === 'uncategorized') {
                sql += ' AND q.category_id IS NULL';
            } else {
                sql += ' AND q.category_id = ?';
                params.push(filters.categoryId);
            }
        }
        if (filters.isActive !== undefined) {
            sql += ' AND q.is_active = ?';
            params.push(filters.isActive ? 1 : 0);
        }
        
        sql += ' ORDER BY c.sort_order, c.name, q.sort_order, q.created_at';
        
        const questions = all(sql, params);
        return questions.map(q => this.formatQuestion(q));
    },

    getQuestionById(id) {
        const question = get(`
            SELECT q.*, c.name as category_name, c.default_weighting as category_weighting
            FROM kc_questions q 
            LEFT JOIN kc_categories c ON q.category_id = c.id 
            WHERE q.id = ?
        `, [id]);
        
        if (!question) return null;
        return this.formatQuestion(question);
    },

    formatQuestion(question) {
        const options = all('SELECT * FROM kc_question_options WHERE question_id = ? ORDER BY sort_order', [question.id]);
        let triggerWords = [];
        try {
            triggerWords = JSON.parse(question.trigger_words || '[]');
        } catch (e) {
            triggerWords = [];
        }
        
        return {
            id: question.id,
            categoryId: question.category_id,
            categoryName: question.category_name || 'Uncategorized',
            title: question.title || '',
            questionText: question.question_text,
            questionType: question.question_type,
            weighting: question.weighting,
            effectiveWeighting: question.weighting || question.category_weighting || 1,
            exactAnswer: question.exact_answer || '',
            triggerWords: triggerWords,
            isActive: !!question.is_active,
            isArchived: !!question.is_archived,
            archivedAt: question.archived_at,
            sortOrder: question.sort_order,
            options: options.map(o => ({
                id: o.id,
                text: o.option_text,
                isCorrect: !!o.is_correct,
                sortOrder: o.sort_order
            })),
            createdAt: question.created_at,
            updatedAt: question.updated_at
        };
    },

    createQuestion(data) {
        const now = new Date().toISOString();
        const id = uuidv4();
        const maxOrder = get('SELECT MAX(sort_order) as max FROM kc_questions WHERE category_id = ?', [data.categoryId])?.max || 0;
        
        run(`INSERT INTO kc_questions (id, category_id, title, question_text, question_type, weighting, exact_answer, trigger_words, is_active, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, data.categoryId || null, data.title || '', data.questionText, data.questionType || 'multiple_choice',
             data.weighting || null, data.exactAnswer || '', JSON.stringify(data.triggerWords || []), 1, maxOrder + 1, now, now]);
        
        // Add options if multiple choice
        if (data.options && data.options.length > 0) {
            data.options.forEach((opt, index) => {
                run('INSERT INTO kc_question_options (id, question_id, option_text, is_correct, sort_order) VALUES (?, ?, ?, ?, ?)',
                    [uuidv4(), id, opt.text, opt.isCorrect ? 1 : 0, index]);
            });
        }
        
        saveDb();
        return this.getQuestionById(id);
    },

    updateQuestion(id, data) {
        const now = new Date().toISOString();
        let sql = 'UPDATE kc_questions SET updated_at = ?';
        let params = [now];
        
        if (data.categoryId !== undefined) { sql += ', category_id = ?'; params.push(data.categoryId || null); }
        if (data.title !== undefined) { sql += ', title = ?'; params.push(data.title); }
        if (data.questionText !== undefined) { sql += ', question_text = ?'; params.push(data.questionText); }
        if (data.questionType !== undefined) { sql += ', question_type = ?'; params.push(data.questionType); }
        if (data.weighting !== undefined) { sql += ', weighting = ?'; params.push(data.weighting); }
        if (data.exactAnswer !== undefined) { sql += ', exact_answer = ?'; params.push(data.exactAnswer); }
        if (data.triggerWords !== undefined) { sql += ', trigger_words = ?'; params.push(JSON.stringify(data.triggerWords)); }
        if (data.isActive !== undefined) { sql += ', is_active = ?'; params.push(data.isActive ? 1 : 0); }
        if (data.sortOrder !== undefined) { sql += ', sort_order = ?'; params.push(data.sortOrder); }
        
        sql += ' WHERE id = ?';
        params.push(id);
        run(sql, params);
        
        // Update options if provided
        if (data.options !== undefined) {
            run('DELETE FROM kc_question_options WHERE question_id = ?', [id]);
            data.options.forEach((opt, index) => {
                run('INSERT INTO kc_question_options (id, question_id, option_text, is_correct, sort_order) VALUES (?, ?, ?, ?, ?)',
                    [uuidv4(), id, opt.text, opt.isCorrect ? 1 : 0, index]);
            });
        }
        
        saveDb();
        return this.getQuestionById(id);
    },

    deleteQuestion(id) {
        // Check if question has been used in any test (exists in kc_test_questions or kc_test_answers)
        const usedInTest = get('SELECT COUNT(*) as count FROM kc_test_questions WHERE question_id = ?', [id]);
        const hasAnswers = get('SELECT COUNT(*) as count FROM kc_test_answers WHERE question_id = ?', [id]);
        
        if ((usedInTest && usedInTest.count > 0) || (hasAnswers && hasAnswers.count > 0)) {
            // Archive instead of delete - question has been used
            const now = new Date().toISOString();
            run('UPDATE kc_questions SET is_archived = 1, archived_at = ?, updated_at = ? WHERE id = ?', 
                [now, now, id]);
            // Remove from active tests (but keep historical answer records intact)
            run('DELETE FROM kc_test_questions WHERE question_id = ?', [id]);
            saveDb();
            return { success: true, archived: true };
        } else {
            // Safe to delete permanently - never used
            run('DELETE FROM kc_question_options WHERE question_id = ?', [id]);
            run('DELETE FROM kc_questions WHERE id = ?', [id]);
            saveDb();
            return { success: true, deleted: true };
        }
    },

    restoreQuestion(id) {
        const now = new Date().toISOString();
        run('UPDATE kc_questions SET is_archived = 0, archived_at = NULL, updated_at = ? WHERE id = ?', 
            [now, id]);
        saveDb();
        return this.getQuestionById(id);
    },

    permanentDeleteQuestion(id) {
        // Only allow permanent delete for archived questions
        const question = get('SELECT is_archived FROM kc_questions WHERE id = ?', [id]);
        if (!question || !question.is_archived) {
            return { success: false, error: 'Question must be archived before permanent deletion' };
        }
        
        // Also delete any orphaned test answers for this question
        run('DELETE FROM kc_test_answers WHERE question_id = ?', [id]);
        run('DELETE FROM kc_question_options WHERE question_id = ?', [id]);
        run('DELETE FROM kc_questions WHERE id = ?', [id]);
        saveDb();
        return { success: true };
    },

    moveQuestion(questionId, newCategoryId) {
        const now = new Date().toISOString();
        run('UPDATE kc_questions SET category_id = ?, updated_at = ? WHERE id = ?', 
            [newCategoryId || null, now, questionId]);
        saveDb();
        return this.getQuestionById(questionId);
    },

    // ============================================
    // TESTS
    // ============================================

    getAllTests(filters = {}) {
        let sql = `
            SELECT t.*, c.name as category_name,
                (SELECT COUNT(*) FROM kc_test_questions WHERE test_id = t.id) as question_count
            FROM kc_tests t 
            LEFT JOIN kc_categories c ON t.category_id = c.id 
            WHERE 1=1
        `;
        const params = [];
        
        // Exclude archived by default unless specifically requested
        if (filters.includeArchived) {
            // Include all
        } else if (filters.archivedOnly) {
            sql += ' AND t.is_archived = 1';
        } else {
            sql += ' AND t.is_archived = 0';
        }
        
        if (filters.categoryId) {
            sql += ' AND t.category_id = ?';
            params.push(filters.categoryId);
        }
        if (filters.isActive !== undefined) {
            sql += ' AND t.is_active = ?';
            params.push(filters.isActive ? 1 : 0);
        }
        
        sql += ' ORDER BY t.created_at DESC';
        
        return all(sql, params).map(t => ({
            id: t.id,
            testNumber: t.test_number,
            name: t.name,
            description: t.description,
            categoryId: t.category_id,
            categoryName: t.category_name || 'Uncategorized',
            timeLimitMinutes: t.time_limit_minutes,
            passingScore: t.passing_score,
            isActive: !!t.is_active,
            isArchived: !!t.is_archived,
            archivedAt: t.archived_at,
            questionCount: t.question_count,
            createdAt: t.created_at,
            updatedAt: t.updated_at
        }));
    },

    getTestById(id) {
        const test = get(`
            SELECT t.*, c.name as category_name
            FROM kc_tests t 
            LEFT JOIN kc_categories c ON t.category_id = c.id 
            WHERE t.id = ?
        `, [id]);
        
        if (!test) return null;
        
        const questions = all(`
            SELECT tq.*, q.title, q.question_text, q.question_type
            FROM kc_test_questions tq
            JOIN kc_questions q ON tq.question_id = q.id
            WHERE tq.test_id = ?
            ORDER BY tq.sort_order
        `, [id]);
        
        return {
            id: test.id,
            testNumber: test.test_number,
            name: test.name,
            description: test.description,
            categoryId: test.category_id,
            categoryName: test.category_name || 'Uncategorized',
            timeLimitMinutes: test.time_limit_minutes,
            passingScore: test.passing_score,
            isActive: !!test.is_active,
            questions: questions.map(q => ({
                id: q.id,
                questionId: q.question_id,
                title: q.title,
                questionText: q.question_text,
                questionType: q.question_type,
                sortOrder: q.sort_order,
                weightingOverride: q.weighting_override
            })),
            createdAt: test.created_at,
            updatedAt: test.updated_at
        };
    },

    createTest(data) {
        const now = new Date().toISOString();
        const id = uuidv4();
        const testNumber = this.generateTestNumber();
        
        run(`INSERT INTO kc_tests (id, test_number, name, description, category_id, time_limit_minutes, passing_score, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, testNumber, data.name, data.description || '', data.categoryId || null, 
             data.timeLimitMinutes || null, data.passingScore || 80, 1, now, now]);
        
        // Add questions to test
        if (data.questionIds && data.questionIds.length > 0) {
            data.questionIds.forEach((qId, index) => {
                run('INSERT INTO kc_test_questions (id, test_id, question_id, sort_order) VALUES (?, ?, ?, ?)',
                    [uuidv4(), id, qId, index]);
            });
        }
        
        saveDb();
        return this.getTestById(id);
    },

    updateTest(id, data) {
        const now = new Date().toISOString();
        let sql = 'UPDATE kc_tests SET updated_at = ?';
        let params = [now];
        
        if (data.name !== undefined) { sql += ', name = ?'; params.push(data.name); }
        if (data.description !== undefined) { sql += ', description = ?'; params.push(data.description); }
        if (data.categoryId !== undefined) { sql += ', category_id = ?'; params.push(data.categoryId || null); }
        if (data.timeLimitMinutes !== undefined) { sql += ', time_limit_minutes = ?'; params.push(data.timeLimitMinutes); }
        if (data.passingScore !== undefined) { sql += ', passing_score = ?'; params.push(data.passingScore); }
        if (data.isActive !== undefined) { sql += ', is_active = ?'; params.push(data.isActive ? 1 : 0); }
        
        sql += ' WHERE id = ?';
        params.push(id);
        run(sql, params);
        
        // Update questions if provided
        if (data.questionIds !== undefined) {
            run('DELETE FROM kc_test_questions WHERE test_id = ?', [id]);
            data.questionIds.forEach((qId, index) => {
                run('INSERT INTO kc_test_questions (id, test_id, question_id, sort_order) VALUES (?, ?, ?, ?)',
                    [uuidv4(), id, qId, index]);
            });
        }
        
        saveDb();
        return this.getTestById(id);
    },

    deleteTest(id) {
        // Check if test has any results
        const hasResults = get('SELECT COUNT(*) as count FROM kc_test_results WHERE test_id = ?', [id]);
        
        if (hasResults && hasResults.count > 0) {
            // Archive instead of delete - test has results
            const now = new Date().toISOString();
            run('UPDATE kc_tests SET is_archived = 1, archived_at = ?, is_active = 0, updated_at = ? WHERE id = ?', 
                [now, now, id]);
            saveDb();
            return { success: true, archived: true };
        } else {
            // Safe to delete permanently - no results
            run('DELETE FROM kc_test_questions WHERE test_id = ?', [id]);
            run('DELETE FROM kc_tests WHERE id = ?', [id]);
            saveDb();
            return { success: true, deleted: true };
        }
    },

    restoreTest(id) {
        const now = new Date().toISOString();
        run('UPDATE kc_tests SET is_archived = 0, archived_at = NULL, updated_at = ? WHERE id = ?', 
            [now, id]);
        saveDb();
        return this.getTestById(id);
    },

    permanentDeleteTest(id) {
        // Only allow permanent delete for archived tests
        const test = get('SELECT is_archived FROM kc_tests WHERE id = ?', [id]);
        if (!test || !test.is_archived) {
            return { success: false, error: 'Test must be archived before permanent deletion' };
        }
        
        // Delete all related data
        run('DELETE FROM kc_test_answers WHERE result_id IN (SELECT id FROM kc_test_results WHERE test_id = ?)', [id]);
        run('DELETE FROM kc_test_results WHERE test_id = ?', [id]);
        run('DELETE FROM kc_test_questions WHERE test_id = ?', [id]);
        run('DELETE FROM kc_tests WHERE id = ?', [id]);
        saveDb();
        return { success: true };
    },

    // ============================================
    // ARCHIVE STATISTICS
    // ============================================
    
    getArchiveStatistics() {
        const archivedQuestions = get('SELECT COUNT(*) as count FROM kc_questions WHERE is_archived = 1');
        const archivedTests = get('SELECT COUNT(*) as count FROM kc_tests WHERE is_archived = 1');
        
        return {
            archivedQuestions: archivedQuestions?.count || 0,
            archivedTests: archivedTests?.count || 0
        };
    },

    // ============================================
    // TEST RESULTS
    // ============================================

    getAllResults(filters = {}) {
        let sql = `
            SELECT r.*, t.name as test_name, t.test_number,
                u.first_name || ' ' || u.last_name as user_name,
                e.first_name || ' ' || e.last_name as evaluator_name
            FROM kc_test_results r
            JOIN kc_tests t ON r.test_id = t.id
            JOIN users u ON r.user_id = u.id
            LEFT JOIN users e ON r.evaluator_id = e.id
            WHERE 1=1
        `;
        const params = [];
        
        if (filters.testId) {
            sql += ' AND r.test_id = ?';
            params.push(filters.testId);
        }
        if (filters.userId) {
            sql += ' AND r.user_id = ?';
            params.push(filters.userId);
        }
        if (filters.startDate) {
            sql += ' AND r.created_at >= ?';
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            sql += ' AND r.created_at <= ?';
            params.push(filters.endDate);
        }
        
        sql += ' ORDER BY r.created_at DESC';
        
        return all(sql, params).map(r => ({
            id: r.id,
            resultNumber: r.result_number,
            testId: r.test_id,
            testNumber: r.test_number,
            testName: r.test_name,
            userId: r.user_id,
            userName: r.user_name,
            evaluatorId: r.evaluator_id,
            evaluatorName: r.evaluator_name,
            startedAt: r.started_at,
            completedAt: r.completed_at,
            totalScore: r.total_score,
            maxScore: r.max_score,
            percentage: r.percentage,
            passed: !!r.passed,
            notes: r.notes,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    },

    getResultById(id) {
        const result = get(`
            SELECT r.*, t.name as test_name, t.test_number,
                u.first_name || ' ' || u.last_name as user_name,
                e.first_name || ' ' || e.last_name as evaluator_name
            FROM kc_test_results r
            JOIN kc_tests t ON r.test_id = t.id
            JOIN users u ON r.user_id = u.id
            LEFT JOIN users e ON r.evaluator_id = e.id
            WHERE r.id = ?
        `, [id]);
        
        if (!result) return null;
        
        const answers = all(`
            SELECT a.*, q.question_text, q.question_type, q.title
            FROM kc_test_answers a
            JOIN kc_questions q ON a.question_id = q.id
            WHERE a.result_id = ?
        `, [id]);
        
        return {
            id: result.id,
            resultNumber: result.result_number,
            testId: result.test_id,
            testNumber: result.test_number,
            testName: result.test_name,
            userId: result.user_id,
            userName: result.user_name,
            evaluatorId: result.evaluator_id,
            evaluatorName: result.evaluator_name,
            startedAt: result.started_at,
            completedAt: result.completed_at,
            totalScore: result.total_score,
            maxScore: result.max_score,
            percentage: result.percentage,
            passed: !!result.passed,
            notes: result.notes,
            answers: answers.map(a => {
                let selectedOptions = [];
                try {
                    selectedOptions = JSON.parse(a.selected_options || '[]');
                } catch (e) {
                    selectedOptions = [];
                }
                return {
                    id: a.id,
                    questionId: a.question_id,
                    questionTitle: a.title,
                    questionText: a.question_text,
                    questionType: a.question_type,
                    answerText: a.answer_text,
                    selectedOptions: selectedOptions,
                    isCorrect: !!a.is_correct,
                    score: a.score,
                    maxScore: a.max_score,
                    evaluatorNotes: a.evaluator_notes
                };
            }),
            createdAt: result.created_at,
            updatedAt: result.updated_at
        };
    },

    createResult(data, evaluatorId) {
        const now = new Date().toISOString();
        const id = uuidv4();
        
        // Get test for passing score and to generate result number
        const test = this.getTestById(data.testId);
        if (!test) throw new Error('Test not found');
        
        const resultNumber = this.generateResultNumber(test.testNumber);
        const percentage = data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0;
        const passed = percentage >= test.passingScore;
        
        run(`INSERT INTO kc_test_results (id, result_number, test_id, user_id, evaluator_id, started_at, completed_at, total_score, max_score, percentage, passed, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, resultNumber, data.testId, data.userId, evaluatorId, data.startedAt || now, 
             data.completedAt || now, data.totalScore || 0, data.maxScore || 0, percentage, passed ? 1 : 0, 
             data.notes || '', now, now]);
        
        // Add answers
        if (data.answers && data.answers.length > 0) {
            data.answers.forEach(ans => {
                run(`INSERT INTO kc_test_answers (id, result_id, question_id, answer_text, selected_options, is_correct, score, max_score, evaluator_notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [uuidv4(), id, ans.questionId, ans.answerText || '', JSON.stringify(ans.selectedOptions || []),
                     ans.isCorrect ? 1 : 0, ans.score || 0, ans.maxScore || 0, ans.evaluatorNotes || '']);
            });
        }
        
        saveDb();
        return this.getResultById(id);
    },

    updateResult(id, data) {
        const now = new Date().toISOString();
        let sql = 'UPDATE kc_test_results SET updated_at = ?';
        let params = [now];
        
        if (data.completedAt !== undefined) { sql += ', completed_at = ?'; params.push(data.completedAt); }
        if (data.totalScore !== undefined) { sql += ', total_score = ?'; params.push(data.totalScore); }
        if (data.maxScore !== undefined) { sql += ', max_score = ?'; params.push(data.maxScore); }
        if (data.percentage !== undefined) { sql += ', percentage = ?'; params.push(data.percentage); }
        if (data.passed !== undefined) { sql += ', passed = ?'; params.push(data.passed ? 1 : 0); }
        if (data.notes !== undefined) { sql += ', notes = ?'; params.push(data.notes); }
        
        sql += ' WHERE id = ?';
        params.push(id);
        run(sql, params);
        
        saveDb();
        return this.getResultById(id);
    },

    deleteResult(id) {
        run('DELETE FROM kc_test_answers WHERE result_id = ?', [id]);
        run('DELETE FROM kc_test_results WHERE id = ?', [id]);
        saveDb();
        return { success: true };
    },

    // ============================================
    // STATISTICS
    // ============================================

    getStatistics() {
        const totalTests = get('SELECT COUNT(*) as count FROM kc_tests WHERE is_active = 1')?.count || 0;
        const totalQuestions = get('SELECT COUNT(*) as count FROM kc_questions WHERE is_active = 1')?.count || 0;
        const totalResults = get('SELECT COUNT(*) as count FROM kc_test_results')?.count || 0;
        const passedResults = get('SELECT COUNT(*) as count FROM kc_test_results WHERE passed = 1')?.count || 0;
        const avgScore = get('SELECT AVG(percentage) as avg FROM kc_test_results')?.avg || 0;
        
        return {
            totalTests,
            totalQuestions,
            totalResults,
            passedResults,
            passingRate: totalResults > 0 ? Math.round((passedResults / totalResults) * 100) : 0,
            averageScore: Math.round(avgScore)
        };
    },

    // Answer checking helper for open questions
    checkOpenAnswer(answer, exactAnswer, triggerWords) {
        if (!answer || !answer.trim()) return { isCorrect: false, matchedTriggers: [] };
        
        const normalizedAnswer = answer.toLowerCase().trim();
        const normalizedExact = (exactAnswer || '').toLowerCase().trim();
        
        // Check exact match (with typo tolerance using Levenshtein)
        if (normalizedExact && this.levenshteinDistance(normalizedAnswer, normalizedExact) <= 2) {
            return { isCorrect: true, matchedTriggers: ['exact_match'] };
        }
        
        // Check trigger words
        const matchedTriggers = [];
        if (triggerWords && triggerWords.length > 0) {
            for (const trigger of triggerWords) {
                const normalizedTrigger = trigger.toLowerCase().trim();
                // Check if trigger word is present (with minor typo tolerance)
                if (normalizedAnswer.includes(normalizedTrigger) || 
                    this.fuzzyContains(normalizedAnswer, normalizedTrigger)) {
                    matchedTriggers.push(trigger);
                }
            }
        }
        
        return {
            isCorrect: matchedTriggers.length > 0,
            matchedTriggers
        };
    },

    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i-1) === a.charAt(j-1)) {
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i-1][j-1] + 1,
                        matrix[i][j-1] + 1,
                        matrix[i-1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    },

    fuzzyContains(text, search) {
        // Simple fuzzy match - checks if search appears in text with up to 1 typo
        const words = text.split(/\s+/);
        for (const word of words) {
            if (this.levenshteinDistance(word, search) <= 1) {
                return true;
            }
        }
        return false;
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
    KnowledgeCheckSystem,
    SettingsSystem,
    IntegrationSystem,
    TokenSystem
};
