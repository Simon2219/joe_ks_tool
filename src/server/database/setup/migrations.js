/**
 * Database Migrations
 * Handles schema changes for existing databases
 * This file is only used during database initialization
 */

/**
 * Run all database migrations
 * @param {Object} db - Database instance
 * @param {Function} all - Query all rows function
 */
function runMigrations(db, all) {
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
    
    // Helper function to check if a table exists
    function tableExists(tableName) {
        try {
            const result = all(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
            return result.length > 0;
        } catch (e) {
            return false;
        }
    }
    
    let migrationsRun = 0;
    
    // Migration 1: Add is_archived and archived_at to kc_questions
    if (tableExists('kc_questions') && !columnExists('kc_questions', 'is_archived')) {
        console.log('  [Migration 1] Adding is_archived to kc_questions...');
        db.run('ALTER TABLE kc_questions ADD COLUMN is_archived INTEGER DEFAULT 0');
        migrationsRun++;
    }
    if (tableExists('kc_questions') && !columnExists('kc_questions', 'archived_at')) {
        db.run('ALTER TABLE kc_questions ADD COLUMN archived_at TEXT DEFAULT NULL');
    }
    
    // Migration 2: Add is_archived and archived_at to kc_tests
    if (tableExists('kc_tests') && !columnExists('kc_tests', 'is_archived')) {
        console.log('  [Migration 2] Adding is_archived to kc_tests...');
        db.run('ALTER TABLE kc_tests ADD COLUMN is_archived INTEGER DEFAULT 0');
        migrationsRun++;
    }
    if (tableExists('kc_tests') && !columnExists('kc_tests', 'archived_at')) {
        db.run('ALTER TABLE kc_tests ADD COLUMN archived_at TEXT DEFAULT NULL');
    }
    
    // Migration 3: Add run_id to kc_test_assignments
    if (tableExists('kc_test_assignments') && !columnExists('kc_test_assignments', 'run_id')) {
        console.log('  [Migration 3] Adding run_id to kc_test_assignments...');
        db.run('ALTER TABLE kc_test_assignments ADD COLUMN run_id TEXT DEFAULT NULL');
        db.run('CREATE INDEX IF NOT EXISTS idx_kc_test_assignments_run ON kc_test_assignments(run_id)');
        migrationsRun++;
    }
    
    // Migration 4: Add allow_partial_answer to kc_questions
    if (tableExists('kc_questions') && !columnExists('kc_questions', 'allow_partial_answer')) {
        console.log('  [Migration 4] Adding allow_partial_answer to kc_questions...');
        db.run('ALTER TABLE kc_questions ADD COLUMN allow_partial_answer INTEGER DEFAULT 0');
        migrationsRun++;
    }
    
    // Migration 5: Add option_details to kc_test_answers
    if (tableExists('kc_test_answers') && !columnExists('kc_test_answers', 'option_details')) {
        console.log('  [Migration 5] Adding option_details to kc_test_answers...');
        db.run("ALTER TABLE kc_test_answers ADD COLUMN option_details TEXT DEFAULT '[]'");
        migrationsRun++;
    }
    
    // Migration 6: Add is_archived and archived_at to kc_test_runs
    if (tableExists('kc_test_runs') && !columnExists('kc_test_runs', 'is_archived')) {
        console.log('  [Migration 6] Adding is_archived to kc_test_runs...');
        db.run('ALTER TABLE kc_test_runs ADD COLUMN is_archived INTEGER DEFAULT 0');
        migrationsRun++;
    }
    if (tableExists('kc_test_runs') && !columnExists('kc_test_runs', 'archived_at')) {
        db.run('ALTER TABLE kc_test_runs ADD COLUMN archived_at TEXT DEFAULT NULL');
    }
    
    // Migration 7: Add team_id to users (for existing databases)
    if (tableExists('users') && !columnExists('users', 'team_id')) {
        console.log('  [Migration 7] Adding team_id to users...');
        db.run('ALTER TABLE users ADD COLUMN team_id TEXT DEFAULT NULL');
        migrationsRun++;
    }
    // Create index for team_id
    if (tableExists('users') && columnExists('users', 'team_id')) {
        db.run('CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id)');
    }
    
    // Migration 8: Add pass_threshold to qs_tasks
    if (tableExists('qs_tasks') && !columnExists('qs_tasks', 'pass_threshold')) {
        console.log('  [Migration 8] Adding pass_threshold to qs_tasks...');
        db.run('ALTER TABLE qs_tasks ADD COLUMN pass_threshold REAL DEFAULT 0.7');
        db.run('ALTER TABLE qs_tasks ADD COLUMN pass_scale_value INTEGER DEFAULT NULL');
        migrationsRun++;
    }
    
    // Migration 9: Rename qs_checks to qs_quality_checks (if needed)
    if (tableExists('qs_checks') && !tableExists('qs_quality_checks')) {
        console.log('  [Migration 9] Renaming qs_checks to qs_quality_checks...');
        db.run('ALTER TABLE qs_checks RENAME TO qs_quality_checks');
        
        // Add new columns
        if (!columnExists('qs_quality_checks', 'min_passed_tasks')) {
            db.run('ALTER TABLE qs_quality_checks ADD COLUMN min_passed_tasks INTEGER DEFAULT 0');
        }
        if (!columnExists('qs_quality_checks', 'require_all_critical')) {
            db.run('ALTER TABLE qs_quality_checks ADD COLUMN require_all_critical INTEGER DEFAULT 0');
        }
        if (!columnExists('qs_quality_checks', 'sections')) {
            db.run("ALTER TABLE qs_quality_checks ADD COLUMN sections TEXT DEFAULT '[]'");
        }
        
        // Update indexes
        db.run('DROP INDEX IF EXISTS idx_qs_checks_team');
        db.run('CREATE INDEX IF NOT EXISTS idx_qs_quality_checks_team ON qs_quality_checks(team_id)');
        migrationsRun++;
    }
    
    // Migration 10: Add is_critical to qs_check_tasks
    if (tableExists('qs_check_tasks') && !columnExists('qs_check_tasks', 'is_critical')) {
        console.log('  [Migration 10] Adding is_critical to qs_check_tasks...');
        db.run('ALTER TABLE qs_check_tasks ADD COLUMN is_critical INTEGER DEFAULT 0');
        migrationsRun++;
    }
    if (tableExists('qs_check_tasks') && !columnExists('qs_check_tasks', 'section_name')) {
        db.run('ALTER TABLE qs_check_tasks ADD COLUMN section_name TEXT DEFAULT NULL');
    }
    
    // Migration 11: Add task_passed to qs_evaluation_answers
    if (tableExists('qs_evaluation_answers') && !columnExists('qs_evaluation_answers', 'task_passed')) {
        console.log('  [Migration 11] Adding task_passed to qs_evaluation_answers...');
        db.run('ALTER TABLE qs_evaluation_answers ADD COLUMN task_passed INTEGER DEFAULT 0');
        migrationsRun++;
    }
    
    // Migration 12: Add passed_tasks and total_tasks to qs_evaluations
    if (tableExists('qs_evaluations') && !columnExists('qs_evaluations', 'passed_tasks')) {
        console.log('  [Migration 12] Adding passed_tasks/total_tasks to qs_evaluations...');
        db.run('ALTER TABLE qs_evaluations ADD COLUMN passed_tasks INTEGER DEFAULT 0');
        db.run('ALTER TABLE qs_evaluations ADD COLUMN total_tasks INTEGER DEFAULT 0');
        migrationsRun++;
    }
    
    // Migration 13: Add is_supervisor to users
    if (tableExists('users') && !columnExists('users', 'is_supervisor')) {
        console.log('  [Migration 13] Adding is_supervisor to users...');
        db.run('ALTER TABLE users ADD COLUMN is_supervisor INTEGER DEFAULT 0');
        migrationsRun++;
    }
    
    // Migration 14: Add is_supervisor and is_management to roles
    if (tableExists('roles') && !columnExists('roles', 'is_supervisor')) {
        console.log('  [Migration 14] Adding is_supervisor/is_management to roles...');
        db.run('ALTER TABLE roles ADD COLUMN is_supervisor INTEGER DEFAULT 0');
        db.run('ALTER TABLE roles ADD COLUMN is_management INTEGER DEFAULT 0');
        migrationsRun++;
    }
    
    // Migration 15: Create user_teams junction table for multi-team membership
    if (!tableExists('user_teams')) {
        console.log('  [Migration 15] Creating user_teams table...');
        db.run(`
            CREATE TABLE IF NOT EXISTS user_teams (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                team_id TEXT NOT NULL,
                is_supervisor INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                UNIQUE(user_id, team_id)
            )
        `);
        db.run('CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_user_teams_team ON user_teams(team_id)');
        
        // Migrate existing user team assignments
        const usersWithTeams = all('SELECT id, team_id, is_supervisor FROM users WHERE team_id IS NOT NULL');
        const { v4: uuidv4 } = require('uuid');
        const now = new Date().toISOString();
        for (const user of usersWithTeams) {
            try {
                const id = uuidv4();
                db.run(
                    'INSERT OR IGNORE INTO user_teams (id, user_id, team_id, is_supervisor, created_at) VALUES (?, ?, ?, ?, ?)',
                    [id, user.id, user.team_id, user.is_supervisor || 0, now]
                );
            } catch (e) {
                // Ignore duplicates
            }
        }
        migrationsRun++;
    }
    
    if (migrationsRun > 0) {
        console.log(`Migrations completed: ${migrationsRun} migration(s) applied`);
    } else {
        console.log('Migrations completed: Database is up to date');
    }
}

module.exports = {
    runMigrations
};
