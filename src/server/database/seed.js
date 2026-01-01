/**
 * Database Seed Data
 * Initializes the database with default data
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('./sqlite');

/**
 * Default permissions
 */
const DEFAULT_PERMISSIONS = [
    // User Management
    { id: 'user_view', name: 'View Users', module: 'users', description: 'Can view user list and details' },
    { id: 'user_create', name: 'Create Users', module: 'users', description: 'Can create new users' },
    { id: 'user_edit', name: 'Edit Users', module: 'users', description: 'Can edit existing users' },
    { id: 'user_delete', name: 'Delete Users', module: 'users', description: 'Can delete users' },
    { id: 'user_export', name: 'Export Users', module: 'users', description: 'Can export user data' },
    
    // Ticket System
    { id: 'ticket_view', name: 'View Own Tickets', module: 'tickets', description: 'Can view own assigned tickets' },
    { id: 'ticket_view_all', name: 'View All Tickets', module: 'tickets', description: 'Can view all tickets' },
    { id: 'ticket_create', name: 'Create Tickets', module: 'tickets', description: 'Can create new tickets' },
    { id: 'ticket_edit', name: 'Edit Tickets', module: 'tickets', description: 'Can edit tickets' },
    { id: 'ticket_delete', name: 'Delete Tickets', module: 'tickets', description: 'Can delete tickets' },
    { id: 'ticket_assign', name: 'Assign Tickets', module: 'tickets', description: 'Can assign tickets to users' },
    { id: 'ticket_export', name: 'Export Tickets', module: 'tickets', description: 'Can export ticket data' },
    
    // Quality Management
    { id: 'quality_view', name: 'View Own Evaluations', module: 'quality', description: 'Can view own quality evaluations' },
    { id: 'quality_view_all', name: 'View All Evaluations', module: 'quality', description: 'Can view all quality evaluations' },
    { id: 'quality_create', name: 'Create Evaluations', module: 'quality', description: 'Can create quality evaluations' },
    { id: 'quality_edit', name: 'Edit Evaluations', module: 'quality', description: 'Can edit quality evaluations' },
    { id: 'quality_delete', name: 'Delete Evaluations', module: 'quality', description: 'Can delete quality evaluations' },
    { id: 'quality_manage_categories', name: 'Manage QA Categories', module: 'quality', description: 'Can manage quality categories and criteria' },
    { id: 'quality_export', name: 'Export Quality Data', module: 'quality', description: 'Can export quality data' },
    
    // Role Management
    { id: 'role_view', name: 'View Roles', module: 'roles', description: 'Can view roles and permissions' },
    { id: 'role_create', name: 'Create Roles', module: 'roles', description: 'Can create new roles' },
    { id: 'role_edit', name: 'Edit Roles', module: 'roles', description: 'Can edit existing roles' },
    { id: 'role_delete', name: 'Delete Roles', module: 'roles', description: 'Can delete roles' },
    
    // Settings & Admin
    { id: 'settings_view', name: 'View Settings', module: 'settings', description: 'Can view system settings' },
    { id: 'settings_edit', name: 'Edit Settings', module: 'settings', description: 'Can modify system settings' },
    { id: 'admin_access', name: 'Admin Panel Access', module: 'admin', description: 'Can access admin panel and integrations' },
    
    // Integrations
    { id: 'integration_sharepoint', name: 'SharePoint Integration', module: 'integrations', description: 'Can use SharePoint integration' },
    { id: 'integration_jira', name: 'JIRA Integration', module: 'integrations', description: 'Can use JIRA integration' }
];

/**
 * Default roles
 */
const DEFAULT_ROLES = [
    {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access with all permissions',
        isAdmin: true,
        isSystem: true,
        permissions: DEFAULT_PERMISSIONS.map(p => p.id)
    },
    {
        id: 'supervisor',
        name: 'Supervisor',
        description: 'Team lead with management capabilities',
        isAdmin: false,
        isSystem: true,
        permissions: [
            'user_view', 'ticket_view', 'ticket_view_all', 'ticket_create', 'ticket_edit',
            'ticket_assign', 'ticket_export', 'quality_view', 'quality_view_all', 'quality_create',
            'quality_edit', 'quality_export', 'role_view', 'settings_view'
        ]
    },
    {
        id: 'qa_analyst',
        name: 'QA Analyst',
        description: 'Quality assurance specialist',
        isAdmin: false,
        isSystem: true,
        permissions: [
            'user_view', 'ticket_view', 'ticket_view_all', 'quality_view', 'quality_view_all',
            'quality_create', 'quality_edit', 'quality_manage_categories', 'quality_export'
        ]
    },
    {
        id: 'agent',
        name: 'Support Agent',
        description: 'Customer support agent with limited access',
        isAdmin: false,
        isSystem: true,
        permissions: [
            'ticket_view', 'ticket_create', 'ticket_edit', 'quality_view'
        ]
    }
];

/**
 * Default quality categories
 */
const DEFAULT_QUALITY_CATEGORIES = [
    {
        name: 'Communication Skills',
        description: 'Evaluation of verbal and written communication',
        weight: 25,
        criteria: [
            { name: 'Clarity', maxScore: 10 },
            { name: 'Professionalism', maxScore: 10 },
            { name: 'Empathy', maxScore: 10 }
        ]
    },
    {
        name: 'Problem Resolution',
        description: 'Ability to resolve customer issues effectively',
        weight: 30,
        criteria: [
            { name: 'First Contact Resolution', maxScore: 10 },
            { name: 'Solution Quality', maxScore: 10 },
            { name: 'Follow-up Actions', maxScore: 10 }
        ]
    },
    {
        name: 'Process Adherence',
        description: 'Following company procedures and guidelines',
        weight: 20,
        criteria: [
            { name: 'Documentation', maxScore: 10 },
            { name: 'Procedure Compliance', maxScore: 10 },
            { name: 'Tool Usage', maxScore: 10 }
        ]
    },
    {
        name: 'Product Knowledge',
        description: 'Understanding of products and services',
        weight: 25,
        criteria: [
            { name: 'Technical Accuracy', maxScore: 10 },
            { name: 'Feature Knowledge', maxScore: 10 },
            { name: 'Policy Understanding', maxScore: 10 }
        ]
    }
];

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
    'general.companyName': 'Customer Support Agency',
    'general.timezone': 'UTC',
    'general.dateFormat': 'YYYY-MM-DD',
    'general.timeFormat': '24h',
    'tickets.defaultPriority': 'medium',
    'tickets.autoAssign': 'false',
    'tickets.slaEnabled': 'true',
    'tickets.slaLow': '72',
    'tickets.slaMedium': '24',
    'tickets.slaHigh': '8',
    'tickets.slaCritical': '2',
    'quality.passingScore': '80',
    'quality.requireComments': 'true',
    'quality.allowSelfEvaluation': 'false',
    'notifications.emailEnabled': 'false',
    'notifications.desktopEnabled': 'true'
};

/**
 * Seeds the database with initial data
 */
async function seedDatabase() {
    const db = getDatabase();
    const now = new Date().toISOString();

    console.log('Seeding database...');

    // Check if already seeded (check for admin user)
    const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (existingAdmin) {
        console.log('Database already seeded, skipping...');
        return;
    }

    // Use transaction for atomic seeding
    const seedTransaction = db.transaction(() => {
        // Seed permissions
        console.log('  - Seeding permissions...');
        const insertPermission = db.prepare(
            'INSERT OR IGNORE INTO permissions (id, name, module, description) VALUES (?, ?, ?, ?)'
        );
        for (const perm of DEFAULT_PERMISSIONS) {
            insertPermission.run(perm.id, perm.name, perm.module, perm.description);
        }

        // Seed roles
        console.log('  - Seeding roles...');
        const insertRole = db.prepare(
            'INSERT OR IGNORE INTO roles (id, name, description, is_admin, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        const insertRolePermission = db.prepare(
            'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
        );

        for (const role of DEFAULT_ROLES) {
            insertRole.run(role.id, role.name, role.description, role.isAdmin ? 1 : 0, role.isSystem ? 1 : 0, now, now);
            for (const permId of role.permissions) {
                insertRolePermission.run(role.id, permId);
            }
        }

        // Seed admin user
        console.log('  - Seeding admin user...');
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        const insertUser = db.prepare(`
            INSERT INTO users (id, username, email, password, first_name, last_name, role_id, department, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertUser.run(
            uuidv4(), 'admin', 'admin@company.com', hashedPassword,
            'System', 'Administrator', 'admin', 'IT', 1, now, now
        );

        // Seed quality categories
        console.log('  - Seeding quality categories...');
        const insertCategory = db.prepare(`
            INSERT INTO quality_categories (id, name, description, weight, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const insertCriteria = db.prepare(`
            INSERT INTO quality_criteria (id, category_id, name, max_score, sort_order)
            VALUES (?, ?, ?, ?, ?)
        `);

        for (const category of DEFAULT_QUALITY_CATEGORIES) {
            const categoryId = uuidv4();
            insertCategory.run(categoryId, category.name, category.description, category.weight, 1, now, now);
            
            category.criteria.forEach((criteria, index) => {
                insertCriteria.run(uuidv4(), categoryId, criteria.name, criteria.maxScore, index);
            });
        }

        // Seed settings
        console.log('  - Seeding settings...');
        const insertSetting = db.prepare(
            'INSERT OR IGNORE INTO settings (key, value, encrypted, updated_at) VALUES (?, ?, ?, ?)'
        );
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
            insertSetting.run(key, value, 0, now);
        }
    });

    seedTransaction();
    console.log('Database seeding complete!');
}

module.exports = {
    seedDatabase,
    DEFAULT_PERMISSIONS,
    DEFAULT_ROLES
};
