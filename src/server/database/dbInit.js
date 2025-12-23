/**
 * Database Initialization
 * Sets up the local JSON-based database with proper schema
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../../../data');
const DB_FILES = {
    users: path.join(DATA_DIR, 'users.json'),
    roles: path.join(DATA_DIR, 'roles.json'),
    permissions: path.join(DATA_DIR, 'permissions.json'),
    tickets: path.join(DATA_DIR, 'tickets.json'),
    ticketComments: path.join(DATA_DIR, 'ticket_comments.json'),
    ticketHistory: path.join(DATA_DIR, 'ticket_history.json'),
    qualityReports: path.join(DATA_DIR, 'quality_reports.json'),
    qualityCategories: path.join(DATA_DIR, 'quality_categories.json'),
    qualityTemplates: path.join(DATA_DIR, 'quality_templates.json'),
    settings: path.join(DATA_DIR, 'settings.json'),
    sessions: path.join(DATA_DIR, 'sessions.json')
};

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

/**
 * Creates a JSON file with initial data if it doesn't exist
 */
function ensureFileExists(filePath, initialData = []) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
    }
}

/**
 * Creates default permissions
 */
function getDefaultPermissions() {
    return [
        // User Management Permissions
        { id: 'user_view', name: 'View Users', module: 'users', description: 'Can view user list and details' },
        { id: 'user_create', name: 'Create Users', module: 'users', description: 'Can create new users' },
        { id: 'user_edit', name: 'Edit Users', module: 'users', description: 'Can edit existing users' },
        { id: 'user_delete', name: 'Delete Users', module: 'users', description: 'Can delete users' },
        { id: 'user_export', name: 'Export Users', module: 'users', description: 'Can export user data' },
        { id: 'user_import', name: 'Import Users', module: 'users', description: 'Can import user data' },
        
        // Ticket System Permissions
        { id: 'ticket_view', name: 'View Tickets', module: 'tickets', description: 'Can view ticket list and details' },
        { id: 'ticket_view_all', name: 'View All Tickets', module: 'tickets', description: 'Can view all tickets regardless of assignment' },
        { id: 'ticket_create', name: 'Create Tickets', module: 'tickets', description: 'Can create new tickets' },
        { id: 'ticket_edit', name: 'Edit Tickets', module: 'tickets', description: 'Can edit existing tickets' },
        { id: 'ticket_delete', name: 'Delete Tickets', module: 'tickets', description: 'Can delete tickets' },
        { id: 'ticket_assign', name: 'Assign Tickets', module: 'tickets', description: 'Can assign tickets to users' },
        { id: 'ticket_bulk_update', name: 'Bulk Update Tickets', module: 'tickets', description: 'Can perform bulk ticket operations' },
        { id: 'ticket_export', name: 'Export Tickets', module: 'tickets', description: 'Can export ticket data' },
        
        // Quality Management Permissions
        { id: 'quality_view', name: 'View Quality Reports', module: 'quality', description: 'Can view quality reports' },
        { id: 'quality_view_all', name: 'View All Quality Reports', module: 'quality', description: 'Can view all quality reports' },
        { id: 'quality_create', name: 'Create Quality Reports', module: 'quality', description: 'Can create quality evaluations' },
        { id: 'quality_edit', name: 'Edit Quality Reports', module: 'quality', description: 'Can edit quality evaluations' },
        { id: 'quality_delete', name: 'Delete Quality Reports', module: 'quality', description: 'Can delete quality evaluations' },
        { id: 'quality_manage_categories', name: 'Manage QA Categories', module: 'quality', description: 'Can manage quality categories' },
        { id: 'quality_manage_templates', name: 'Manage QA Templates', module: 'quality', description: 'Can manage evaluation templates' },
        { id: 'quality_export', name: 'Export Quality Data', module: 'quality', description: 'Can export quality data' },
        
        // Role Management Permissions
        { id: 'role_view', name: 'View Roles', module: 'roles', description: 'Can view role list and details' },
        { id: 'role_create', name: 'Create Roles', module: 'roles', description: 'Can create new roles' },
        { id: 'role_edit', name: 'Edit Roles', module: 'roles', description: 'Can edit existing roles' },
        { id: 'role_delete', name: 'Delete Roles', module: 'roles', description: 'Can delete roles' },
        
        // Settings Permissions
        { id: 'settings_view', name: 'View Settings', module: 'settings', description: 'Can view settings' },
        { id: 'settings_edit', name: 'Edit Settings', module: 'settings', description: 'Can modify settings' },
        { id: 'admin_access', name: 'Admin Access', module: 'admin', description: 'Full administrative access' },
        
        // Integration Permissions
        { id: 'integration_sharepoint', name: 'SharePoint Integration', module: 'integrations', description: 'Can use SharePoint integration' },
        { id: 'integration_jira', name: 'JIRA Integration', module: 'integrations', description: 'Can use JIRA integration' }
    ];
}

/**
 * Creates default roles
 */
function getDefaultRoles() {
    return [
        {
            id: 'admin',
            name: 'Administrator',
            description: 'Full system access with all permissions',
            isAdmin: true,
            isSystem: true,
            permissions: getDefaultPermissions().map(p => p.id),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'supervisor',
            name: 'Supervisor',
            description: 'Team lead with management capabilities',
            isAdmin: false,
            isSystem: true,
            permissions: [
                'user_view', 'ticket_view', 'ticket_view_all', 'ticket_create', 'ticket_edit', 
                'ticket_assign', 'quality_view', 'quality_view_all', 'quality_create', 
                'quality_edit', 'role_view', 'settings_view'
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'qa_analyst',
            name: 'QA Analyst',
            description: 'Quality assurance specialist',
            isAdmin: false,
            isSystem: true,
            permissions: [
                'user_view', 'ticket_view', 'quality_view', 'quality_view_all', 
                'quality_create', 'quality_edit', 'quality_manage_categories',
                'quality_manage_templates', 'quality_export'
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'agent',
            name: 'Support Agent',
            description: 'Customer support agent',
            isAdmin: false,
            isSystem: true,
            permissions: [
                'ticket_view', 'ticket_create', 'ticket_edit', 'quality_view'
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
}

/**
 * Creates default admin user
 */
async function getDefaultAdminUser() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    return {
        id: uuidv4(),
        username: 'admin',
        email: 'admin@company.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        roleId: 'admin',
        department: 'IT',
        phone: '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null
    };
}

/**
 * Creates default quality categories
 */
function getDefaultQualityCategories() {
    return [
        {
            id: uuidv4(),
            name: 'Communication Skills',
            description: 'Evaluation of verbal and written communication',
            weight: 25,
            isActive: true,
            criteria: [
                { id: uuidv4(), name: 'Clarity', maxScore: 10 },
                { id: uuidv4(), name: 'Professionalism', maxScore: 10 },
                { id: uuidv4(), name: 'Empathy', maxScore: 10 }
            ],
            createdAt: new Date().toISOString()
        },
        {
            id: uuidv4(),
            name: 'Problem Resolution',
            description: 'Ability to resolve customer issues effectively',
            weight: 30,
            isActive: true,
            criteria: [
                { id: uuidv4(), name: 'First Contact Resolution', maxScore: 10 },
                { id: uuidv4(), name: 'Solution Quality', maxScore: 10 },
                { id: uuidv4(), name: 'Follow-up Actions', maxScore: 10 }
            ],
            createdAt: new Date().toISOString()
        },
        {
            id: uuidv4(),
            name: 'Process Adherence',
            description: 'Following company procedures and guidelines',
            weight: 20,
            isActive: true,
            criteria: [
                { id: uuidv4(), name: 'Documentation', maxScore: 10 },
                { id: uuidv4(), name: 'Procedure Compliance', maxScore: 10 },
                { id: uuidv4(), name: 'Tool Usage', maxScore: 10 }
            ],
            createdAt: new Date().toISOString()
        },
        {
            id: uuidv4(),
            name: 'Product Knowledge',
            description: 'Understanding of products and services',
            weight: 25,
            isActive: true,
            criteria: [
                { id: uuidv4(), name: 'Technical Accuracy', maxScore: 10 },
                { id: uuidv4(), name: 'Feature Knowledge', maxScore: 10 },
                { id: uuidv4(), name: 'Policy Understanding', maxScore: 10 }
            ],
            createdAt: new Date().toISOString()
        }
    ];
}

/**
 * Creates default settings
 */
function getDefaultSettings() {
    return {
        general: {
            companyName: 'Customer Support Agency',
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
            timeFormat: '24h'
        },
        tickets: {
            defaultPriority: 'medium',
            autoAssign: false,
            slaEnabled: true,
            slaLow: 72,
            slaMedium: 24,
            slaHigh: 8,
            slaCritical: 2
        },
        quality: {
            passingScore: 80,
            requireComments: true,
            allowSelfEvaluation: false
        },
        notifications: {
            emailEnabled: false,
            desktopEnabled: true
        },
        integrations: {
            sharepoint: {
                enabled: false,
                siteUrl: '',
                clientId: '',
                clientSecret: ''
            },
            jira: {
                enabled: false,
                baseUrl: '',
                email: '',
                apiToken: ''
            }
        }
    };
}

/**
 * Initializes the database with default data
 */
async function initializeDatabase() {
    try {
        console.log('Initializing database...');
        
        // Ensure data directory exists
        ensureDataDirectory();
        
        // Initialize permissions
        ensureFileExists(DB_FILES.permissions, getDefaultPermissions());
        
        // Initialize roles
        if (!fs.existsSync(DB_FILES.roles)) {
            fs.writeFileSync(DB_FILES.roles, JSON.stringify(getDefaultRoles(), null, 2));
        }
        
        // Initialize users with default admin
        if (!fs.existsSync(DB_FILES.users)) {
            const adminUser = await getDefaultAdminUser();
            fs.writeFileSync(DB_FILES.users, JSON.stringify([adminUser], null, 2));
        }
        
        // Initialize quality categories
        if (!fs.existsSync(DB_FILES.qualityCategories)) {
            fs.writeFileSync(DB_FILES.qualityCategories, JSON.stringify(getDefaultQualityCategories(), null, 2));
        }
        
        // Initialize settings
        if (!fs.existsSync(DB_FILES.settings)) {
            fs.writeFileSync(DB_FILES.settings, JSON.stringify(getDefaultSettings(), null, 2));
        }
        
        // Initialize empty collections
        ensureFileExists(DB_FILES.tickets, []);
        ensureFileExists(DB_FILES.ticketComments, []);
        ensureFileExists(DB_FILES.ticketHistory, []);
        ensureFileExists(DB_FILES.qualityReports, []);
        ensureFileExists(DB_FILES.qualityTemplates, []);
        ensureFileExists(DB_FILES.sessions, []);
        
        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

module.exports = {
    initializeDatabase,
    DB_FILES,
    DATA_DIR
};
