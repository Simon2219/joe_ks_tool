/**
 * Database Seeding
 * Creates default data for new installations
 * This file is only used during database initialization
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * Gets all permissions that should exist in the system
 */
function getPermissions() {
    return [
        // User Management
        { id: 'user_view', name: 'View Users', module: 'users' },
        { id: 'user_create', name: 'Create Users', module: 'users' },
        { id: 'user_edit', name: 'Edit Users', module: 'users' },
        { id: 'user_delete', name: 'Delete Users', module: 'users' },
        
        // Ticket Management
        { id: 'ticket_view', name: 'View Tickets', module: 'tickets' },
        { id: 'ticket_view_all', name: 'View All Tickets', module: 'tickets' },
        { id: 'ticket_create', name: 'Create Tickets', module: 'tickets' },
        { id: 'ticket_edit', name: 'Edit Tickets', module: 'tickets' },
        { id: 'ticket_delete', name: 'Delete Tickets', module: 'tickets' },
        { id: 'ticket_assign', name: 'Assign Tickets', module: 'tickets' },
        
        // Quality (Legacy)
        { id: 'quality_view', name: 'View Quality', module: 'quality' },
        { id: 'quality_view_all', name: 'View All Quality', module: 'quality' },
        { id: 'quality_create', name: 'Create Quality Reports', module: 'quality' },
        { id: 'quality_edit', name: 'Edit Quality Reports', module: 'quality' },
        { id: 'quality_delete', name: 'Delete Quality Reports', module: 'quality' },
        { id: 'quality_manage', name: 'Manage Quality Categories', module: 'quality' },
        
        // Knowledge Check - Categories
        { id: 'kc_categories_delete', name: 'Delete Categories', module: 'knowledge_check' },
        { id: 'kc_categories_create', name: 'Create Categories', module: 'knowledge_check' },
        { id: 'kc_categories_edit', name: 'Edit Categories', module: 'knowledge_check' },
        // Knowledge Check - Questions
        { id: 'kc_questions_delete', name: 'Delete Questions', module: 'knowledge_check' },
        { id: 'kc_questions_create', name: 'Create Questions', module: 'knowledge_check' },
        { id: 'kc_questions_edit', name: 'Edit Questions', module: 'knowledge_check' },
        { id: 'kc_questions_view', name: 'View Question Catalog', module: 'knowledge_check' },
        // Knowledge Check - Tests
        { id: 'kc_tests_delete', name: 'Delete Tests', module: 'knowledge_check' },
        { id: 'kc_tests_create', name: 'Create Tests', module: 'knowledge_check' },
        { id: 'kc_tests_edit', name: 'Edit Tests', module: 'knowledge_check' },
        { id: 'kc_tests_view', name: 'View Test Catalog', module: 'knowledge_check' },
        // Knowledge Check - Results
        { id: 'kc_results_delete', name: 'Delete Test Results', module: 'knowledge_check' },
        { id: 'kc_results_evaluate', name: 'Evaluate Test Results', module: 'knowledge_check' },
        { id: 'kc_results_view', name: 'View Test Results', module: 'knowledge_check' },
        // Knowledge Check - Test Runs & Assignments
        { id: 'kc_assign_tests', name: 'Create Test Run', module: 'knowledge_check' },
        { id: 'kc_assigned_view', name: 'View Assigned Tests', module: 'knowledge_check' },
        // Knowledge Check - Archive
        { id: 'kc_archive_access', name: 'Archive Access', module: 'knowledge_check' },
        // Knowledge Check - Tab Access
        { id: 'kc_view', name: 'View Knowledge Check Tab', module: 'knowledge_check' },
        
        // Roles & Settings
        { id: 'role_view', name: 'View Roles', module: 'roles' },
        { id: 'role_create', name: 'Create Roles', module: 'roles' },
        { id: 'role_edit', name: 'Edit Roles', module: 'roles' },
        { id: 'role_delete', name: 'Delete Roles', module: 'roles' },
        { id: 'settings_view', name: 'View Settings', module: 'settings' },
        { id: 'settings_edit', name: 'Edit Settings', module: 'settings' },
        { id: 'admin_access', name: 'Admin Access', module: 'admin' },
        { id: 'integration_access', name: 'Integration Access', module: 'integrations' },
        
        // Teams Management
        { id: 'teams_view', name: 'View Teams', module: 'teams' },
        { id: 'teams_create', name: 'Create Teams', module: 'teams' },
        { id: 'teams_edit', name: 'Edit Teams', module: 'teams' },
        { id: 'teams_delete', name: 'Delete Teams', module: 'teams' },
        { id: 'teams_permissions_manage', name: 'Manage Team Permissions', module: 'teams' },
        
        // Quality System v2 - Tab Access
        { id: 'qs_view', name: 'View Quality System Tab', module: 'quality_system' },
        // Quality System v2 - Tracking Overview
        { id: 'qs_tracking_view', name: 'View Quality Tracking', module: 'quality_system' },
        { id: 'qs_tracking_view_all', name: 'View All Teams in Tracking', module: 'quality_system' },
        // Quality System v2 - Task Catalog
        { id: 'qs_tasks_delete', name: 'Delete Quality Tasks', module: 'quality_system' },
        { id: 'qs_tasks_create', name: 'Create Quality Tasks', module: 'quality_system' },
        { id: 'qs_tasks_edit', name: 'Edit Quality Tasks', module: 'quality_system' },
        { id: 'qs_tasks_view', name: 'View Task Catalog', module: 'quality_system' },
        // Quality System v2 - Check Catalog
        { id: 'qs_checks_delete', name: 'Delete Quality Checks', module: 'quality_system' },
        { id: 'qs_checks_create', name: 'Create Quality Checks', module: 'quality_system' },
        { id: 'qs_checks_edit', name: 'Edit Quality Checks', module: 'quality_system' },
        { id: 'qs_checks_view', name: 'View Check Catalog', module: 'quality_system' },
        // Quality System v2 - Categories
        { id: 'qs_categories_delete', name: 'Delete QS Categories', module: 'quality_system' },
        { id: 'qs_categories_create', name: 'Create QS Categories', module: 'quality_system' },
        { id: 'qs_categories_edit', name: 'Edit QS Categories', module: 'quality_system' },
        // Quality System v2 - Evaluations
        { id: 'qs_evaluate', name: 'Conduct Evaluations', module: 'quality_system' },
        { id: 'qs_evaluate_random', name: 'Create Random Evaluations', module: 'quality_system' },
        // Quality System v2 - Results
        { id: 'qs_results_view_own', name: 'View Own Results', module: 'quality_system' },
        { id: 'qs_results_view_team', name: 'View Team Results', module: 'quality_system' },
        { id: 'qs_results_delete', name: 'Delete Evaluation Results', module: 'quality_system' },
        // Quality System v2 - Supervisor Notes
        { id: 'qs_supervisor_notes_view', name: 'View Supervisor Notes', module: 'quality_system' },
        // Quality System v2 - Management
        { id: 'qs_settings_manage', name: 'Manage QS Settings', module: 'quality_system' },
        { id: 'qs_quotas_manage', name: 'Manage Evaluation Quotas', module: 'quality_system' },
        { id: 'qs_team_config_manage', name: 'Configure Team Roles', module: 'quality_system' }
    ];
}

/**
 * Ensures all permissions exist in the database
 * @param {Function} run - Execute SQL function
 * @param {Function} get - Get single row function
 */
function ensurePermissions(run, get) {
    console.log('Ensuring all permissions exist...');
    
    const permissions = getPermissions();
    let addedCount = 0;
    
    permissions.forEach(p => {
        const exists = get('SELECT id FROM permissions WHERE id = ?', [p.id]);
        if (!exists) {
            run('INSERT INTO permissions (id, name, module) VALUES (?, ?, ?)', [p.id, p.name, p.module]);
            addedCount++;
        }
    });
    
    // Grant all permissions to admin role if it exists
    const adminRole = get('SELECT id FROM roles WHERE id = ? OR name = ?', ['admin', 'Administrator']);
    if (adminRole) {
        permissions.forEach(p => {
            run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRole.id, p.id]);
        });
    }
    
    if (addedCount > 0) {
        console.log(`  Added ${addedCount} new permission(s)`);
    }
}

/**
 * Seeds default data for a fresh database
 * @param {Function} run - Execute SQL function
 * @param {Function} get - Get single row function
 * @param {Object} Config - Configuration object
 */
async function seedData(run, get, Config) {
    console.log('Seeding default data...');
    
    const now = new Date().toISOString();
    const permissions = getPermissions();
    
    // Insert all permissions
    permissions.forEach(p => {
        run('INSERT OR IGNORE INTO permissions (id, name, module) VALUES (?, ?, ?)', [p.id, p.name, p.module]);
    });
    
    // Permission sets for roles
    const allPermIds = permissions.map(p => p.id);
    
    const kcManagerPerms = ['kc_view', 'kc_questions_view', 'kc_questions_create', 'kc_questions_edit', 'kc_questions_delete', 
                           'kc_categories_create', 'kc_categories_edit', 'kc_categories_delete',
                           'kc_tests_view', 'kc_tests_create', 'kc_tests_edit', 'kc_tests_delete',
                           'kc_results_view', 'kc_results_evaluate', 'kc_results_delete',
                           'kc_assign_tests', 'kc_assigned_view', 'kc_archive_access'];
    
    const kcEditorPerms = ['kc_view', 'kc_questions_view', 'kc_questions_create', 'kc_questions_edit',
                          'kc_categories_create', 'kc_categories_edit',
                          'kc_tests_view', 'kc_tests_create', 'kc_tests_edit',
                          'kc_results_view', 'kc_results_evaluate',
                          'kc_assign_tests', 'kc_assigned_view'];
    
    const kcUserPerms = ['kc_view', 'kc_assigned_view'];
    
    const teamAdminPerms = ['teams_view', 'teams_create', 'teams_edit', 'teams_delete', 'teams_permissions_manage'];
    
    const qsSupervisorPerms = ['qs_view', 'qs_tracking_view', 'qs_tracking_view_all',
                               'qs_tasks_view', 'qs_tasks_create', 'qs_tasks_edit', 'qs_tasks_delete',
                               'qs_checks_view', 'qs_checks_create', 'qs_checks_edit', 'qs_checks_delete',
                               'qs_categories_create', 'qs_categories_edit', 'qs_categories_delete',
                               'qs_evaluate', 'qs_evaluate_random',
                               'qs_results_view_team', 'qs_results_delete',
                               'qs_supervisor_notes_view',
                               'qs_settings_manage', 'qs_quotas_manage', 'qs_team_config_manage'];
    
    const qsEvaluatorPerms = ['qs_view', 'qs_tracking_view',
                              'qs_tasks_view', 'qs_checks_view',
                              'qs_evaluate', 'qs_results_view_team',
                              'qs_supervisor_notes_view'];
    
    const qsAgentPerms = ['qs_view', 'qs_results_view_own'];
    
    // Default roles
    const roles = [
        { id: 'admin', name: 'Administrator', description: 'Full system access', isAdmin: 1, isSystem: 1, permissions: allPermIds },
        { id: 'supervisor', name: 'Supervisor', description: 'Team management', isAdmin: 0, isSystem: 1, 
          permissions: ['user_view', 'ticket_view', 'ticket_view_all', 'ticket_create', 'ticket_edit', 'ticket_assign', 
                       'quality_view', 'quality_view_all', 'quality_create', 
                       ...teamAdminPerms, ...kcEditorPerms, ...qsSupervisorPerms, 'role_view', 'settings_view'] },
        { id: 'qa_analyst', name: 'QA Analyst', description: 'Quality evaluations', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', 'ticket_view', 'ticket_view_all', 'quality_view', 'quality_view_all', 
                       'quality_create', 'quality_edit', 'quality_manage', 'teams_view', ...kcEditorPerms, ...qsEvaluatorPerms] },
        { id: 'agent', name: 'Support Agent', description: 'Ticket handling', isAdmin: 0, isSystem: 1,
          permissions: ['ticket_view', 'ticket_create', 'ticket_edit', 'quality_view', ...kcUserPerms, ...qsAgentPerms] },
        { id: 'kc_manager', name: 'Knowledge Manager', description: 'Full Knowledge Check management', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', ...kcManagerPerms] },
        { id: 'kc_editor', name: 'Knowledge Editor', description: 'Create and edit Knowledge Check content', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', ...kcEditorPerms] },
        { id: 'kc_user', name: 'Knowledge User', description: 'View Knowledge Check', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', ...kcUserPerms] },
        { id: 'qs_supervisor', name: 'QS Supervisor', description: 'Full Quality System management', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', 'teams_view', ...qsSupervisorPerms] },
        { id: 'qs_evaluator', name: 'QS Evaluator', description: 'Conduct quality evaluations', isAdmin: 0, isSystem: 1,
          permissions: ['user_view', 'teams_view', ...qsEvaluatorPerms] }
    ];
    
    roles.forEach(r => {
        run('INSERT OR IGNORE INTO roles (id, name, description, is_admin, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [r.id, r.name, r.description, r.isAdmin, r.isSystem, now, now]);
        r.permissions.forEach(p => {
            run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [r.id, p]);
        });
    });
    
    // Default teams
    const defaultTeams = [
        { id: uuidv4(), name: 'BILLA', teamCode: 'billa', description: 'BILLA Partner Team', color: '#ff6b00', sortOrder: 0 },
        { id: uuidv4(), name: 'Social Media', teamCode: 'social_media', description: 'Social Media Team', color: '#1da1f2', sortOrder: 1 },
        { id: uuidv4(), name: 'Support', teamCode: 'support', description: 'General Support Team', color: '#10b981', sortOrder: 2 }
    ];
    
    defaultTeams.forEach(team => {
        run(`INSERT OR IGNORE INTO teams (id, name, team_code, description, color, is_active, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
            [team.id, team.name, team.teamCode, team.description, team.color, team.sortOrder, now, now]);
        
        // Add default QS categories for each team
        run(`INSERT OR IGNORE INTO qs_task_categories (id, team_id, name, description, default_weight, sort_order, is_active, created_at, updated_at)
             VALUES (?, ?, 'Allgemein', 'Allgemeine Aufgaben', 1.0, 0, 1, ?, ?)`,
            [uuidv4(), team.id, now, now]);
        
        run(`INSERT OR IGNORE INTO qs_check_categories (id, team_id, name, description, sort_order, is_active, created_at, updated_at)
             VALUES (?, ?, 'Standard', 'Standard Quality Checks', 0, 1, ?, ?)`,
            [uuidv4(), team.id, now, now]);
    });
    
    // Default admin user
    const bcryptRounds = Config.get('security.bcryptRounds', 10);
    const hashedPw = await bcrypt.hash('admin123', bcryptRounds);
    run(`INSERT OR IGNORE INTO users (id, username, email, password, first_name, last_name, role_id, team_id, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), 'admin', 'admin@company.com', hashedPw, 'System', 'Administrator', 'admin', null, 1, now, now]);
    
    // Default quality categories (legacy)
    const categories = [
        { name: 'Communication', description: 'Communication skills', weight: 25, criteria: ['Clarity', 'Professionalism', 'Empathy'] },
        { name: 'Problem Resolution', description: 'Issue resolution ability', weight: 30, criteria: ['First Contact Resolution', 'Solution Quality', 'Follow-up'] },
        { name: 'Process Adherence', description: 'Following procedures', weight: 20, criteria: ['Documentation', 'Compliance', 'Tool Usage'] },
        { name: 'Product Knowledge', description: 'Product understanding', weight: 25, criteria: ['Technical Accuracy', 'Feature Knowledge', 'Policy Understanding'] }
    ];
    
    categories.forEach(c => {
        const catId = uuidv4();
        run('INSERT OR IGNORE INTO quality_categories (id, name, description, weight, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [catId, c.name, c.description, c.weight, 1, now, now]);
        c.criteria.forEach(cr => {
            run('INSERT OR IGNORE INTO quality_criteria (id, category_id, name, max_score) VALUES (?, ?, ?, ?)',
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
        'knowledgeCheck.passingScore': '80',
        'qs.passingScore': '80',
        'qs.defaultScoringType': 'points',
        'qs.supervisorNotesRoles': JSON.stringify(['admin', 'supervisor', 'qs_supervisor']),
        'qs.evaluationQuotaEnabled': 'true'
    };
    
    Object.entries(defaultSettings).forEach(([k, v]) => {
        run('INSERT OR IGNORE INTO settings (key, value, encrypted, updated_at) VALUES (?, ?, ?, ?)', [k, v, 0, now]);
    });
    
    // Default KC category
    run(`INSERT OR IGNORE INTO kc_categories (id, name, description, default_weighting, sort_order, is_active, created_at, updated_at)
         VALUES (?, 'Allgemein', 'Allgemeine Fragen', 1, 0, 1, ?, ?)`,
        [uuidv4(), now, now]);
    
    console.log('Default data seeded successfully');
}

module.exports = {
    getPermissions,
    ensurePermissions,
    seedData
};
