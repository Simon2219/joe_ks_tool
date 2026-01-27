/**
 * Database Schema Definitions
 * Contains all CREATE TABLE statements for the application
 * This file is only used during database initialization
 */

/**
 * Creates all database tables
 * @param {Object} db - Database instance with run method
 */
function createTables(db) {
    console.log('Creating database tables...');

    // ============================================
    // TEAMS TABLE (Unified team management)
    // ============================================
    db.run(`
        CREATE TABLE IF NOT EXISTS teams (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            team_code TEXT UNIQUE NOT NULL,
            description TEXT DEFAULT '',
            color TEXT DEFAULT '#3b82f6',
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            qs_settings TEXT DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);

    // User-Team membership (many-to-many)
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

    // ============================================
    // USERS & AUTH TABLES
    // ============================================
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            role_id TEXT NOT NULL,
            team_id TEXT DEFAULT NULL,
            is_supervisor INTEGER DEFAULT 0,
            phone TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_login TEXT,
            FOREIGN KEY (team_id) REFERENCES teams(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT DEFAULT '',
            is_admin INTEGER DEFAULT 0,
            is_supervisor INTEGER DEFAULT 0,
            is_management INTEGER DEFAULT 0,
            is_system INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS permissions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            module TEXT NOT NULL,
            description TEXT DEFAULT ''
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id TEXT NOT NULL,
            permission_id TEXT NOT NULL,
            PRIMARY KEY (role_id, permission_id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // ============================================
    // TICKETS TABLES
    // ============================================
    db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            ticket_number TEXT UNIQUE NOT NULL,
            subject TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'new',
            priority TEXT DEFAULT 'medium',
            channel TEXT DEFAULT 'email',
            customer_name TEXT NOT NULL,
            customer_email TEXT,
            customer_phone TEXT,
            created_by TEXT NOT NULL,
            assigned_to TEXT,
            sla_due_at TEXT,
            resolved_at TEXT,
            closed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS ticket_comments (
            id TEXT PRIMARY KEY,
            ticket_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            is_internal INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS ticket_history (
            id TEXT PRIMARY KEY,
            ticket_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // ============================================
    // QUALITY EVALUATION (Legacy) TABLES
    // ============================================
    db.run(`
        CREATE TABLE IF NOT EXISTS quality_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            weight INTEGER DEFAULT 25,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS quality_criteria (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            max_score INTEGER DEFAULT 10,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (category_id) REFERENCES quality_categories(id) ON DELETE CASCADE
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS quality_reports (
            id TEXT PRIMARY KEY,
            ticket_id TEXT,
            agent_id TEXT NOT NULL,
            evaluator_id TEXT NOT NULL,
            overall_score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'draft',
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id),
            FOREIGN KEY (agent_id) REFERENCES users(id),
            FOREIGN KEY (evaluator_id) REFERENCES users(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS quality_scores (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            criteria_id TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            notes TEXT,
            FOREIGN KEY (report_id) REFERENCES quality_reports(id) ON DELETE CASCADE,
            FOREIGN KEY (criteria_id) REFERENCES quality_criteria(id)
        )
    `);

    // ============================================
    // QUALITY SYSTEM v2 TABLES
    // ============================================
    db.run(`
        CREATE TABLE IF NOT EXISTS qs_task_categories (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            default_weight REAL DEFAULT 1.0,
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS qs_tasks (
            id TEXT PRIMARY KEY,
            task_number TEXT UNIQUE NOT NULL,
            team_id TEXT NOT NULL,
            category_id TEXT,
            title TEXT DEFAULT '',
            task_text TEXT NOT NULL,
            scoring_type TEXT DEFAULT 'points',
            max_points INTEGER DEFAULT 10,
            scale_size INTEGER DEFAULT 5,
            scale_inverted INTEGER DEFAULT 0,
            pass_threshold REAL DEFAULT 0.7,
            pass_scale_value INTEGER DEFAULT NULL,
            weight_override REAL DEFAULT NULL,
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            is_archived INTEGER DEFAULT 0,
            archived_at TEXT DEFAULT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams(id),
            FOREIGN KEY (category_id) REFERENCES qs_task_categories(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS qs_task_references (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            reference_type TEXT NOT NULL,
            reference_text TEXT DEFAULT '',
            file_path TEXT DEFAULT '',
            file_name TEXT DEFAULT '',
            url TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (task_id) REFERENCES qs_tasks(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS qs_check_categories (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS qs_quality_checks (
            id TEXT PRIMARY KEY,
            check_number TEXT UNIQUE NOT NULL,
            team_id TEXT NOT NULL,
            category_id TEXT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            passing_score INTEGER DEFAULT 80,
            min_passed_tasks INTEGER DEFAULT 0,
            require_all_critical INTEGER DEFAULT 0,
            sections TEXT DEFAULT '[]',
            is_active INTEGER DEFAULT 1,
            is_archived INTEGER DEFAULT 0,
            archived_at TEXT DEFAULT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams(id),
            FOREIGN KEY (category_id) REFERENCES qs_check_categories(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS qs_check_tasks (
            id TEXT PRIMARY KEY,
            check_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            section_name TEXT DEFAULT NULL,
            weight_override REAL DEFAULT NULL,
            is_critical INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (check_id) REFERENCES qs_quality_checks(id) ON DELETE CASCADE,
            FOREIGN KEY (task_id) REFERENCES qs_tasks(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS qs_evaluations (
            id TEXT PRIMARY KEY,
            evaluation_number TEXT UNIQUE NOT NULL,
            team_id TEXT NOT NULL,
            check_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            evaluator_id TEXT NOT NULL,
            interaction_channel TEXT DEFAULT 'ticket',
            interaction_reference TEXT DEFAULT '',
            started_at TEXT NOT NULL,
            completed_at TEXT,
            total_score REAL DEFAULT 0,
            max_score REAL DEFAULT 0,
            percentage REAL DEFAULT 0,
            passed_tasks INTEGER DEFAULT 0,
            total_tasks INTEGER DEFAULT 0,
            passed INTEGER DEFAULT 0,
            supervisor_notes TEXT DEFAULT '',
            status TEXT DEFAULT 'in_progress',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams(id),
            FOREIGN KEY (check_id) REFERENCES qs_quality_checks(id),
            FOREIGN KEY (agent_id) REFERENCES users(id),
            FOREIGN KEY (evaluator_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS qs_evaluation_answers (
            id TEXT PRIMARY KEY,
            evaluation_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            check_task_id TEXT NOT NULL,
            score REAL DEFAULT 0,
            max_score REAL DEFAULT 0,
            raw_value TEXT DEFAULT '',
            task_passed INTEGER DEFAULT 0,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (evaluation_id) REFERENCES qs_evaluations(id) ON DELETE CASCADE,
            FOREIGN KEY (task_id) REFERENCES qs_tasks(id),
            FOREIGN KEY (check_task_id) REFERENCES qs_check_tasks(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS qs_evaluation_evidence (
            id TEXT PRIMARY KEY,
            evaluation_id TEXT NOT NULL,
            answer_id TEXT DEFAULT NULL,
            evidence_type TEXT NOT NULL,
            evidence_text TEXT DEFAULT '',
            file_path TEXT DEFAULT '',
            file_name TEXT DEFAULT '',
            url TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (evaluation_id) REFERENCES qs_evaluations(id) ON DELETE CASCADE,
            FOREIGN KEY (answer_id) REFERENCES qs_evaluation_answers(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS qs_quotas (
            id TEXT PRIMARY KEY,
            team_id TEXT NOT NULL,
            quota_type TEXT NOT NULL,
            target_count INTEGER DEFAULT 0,
            period_type TEXT DEFAULT 'week',
            period_value INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        )
    `);

    // ============================================
    // SETTINGS & INTEGRATIONS TABLES
    // ============================================
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            encrypted INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL
        )
    `);
    
    db.run(`
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
    // KNOWLEDGE CHECK TABLES
    // ============================================
    db.run(`
        CREATE TABLE IF NOT EXISTS kc_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            default_weighting REAL DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS kc_questions (
            id TEXT PRIMARY KEY,
            question_number TEXT UNIQUE NOT NULL,
            category_id TEXT,
            question_text TEXT NOT NULL,
            question_type TEXT DEFAULT 'single',
            answer_options TEXT NOT NULL,
            correct_answers TEXT NOT NULL,
            explanation TEXT DEFAULT '',
            weighting_override REAL DEFAULT NULL,
            sort_order INTEGER DEFAULT 0,
            allow_partial_answer INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            is_archived INTEGER DEFAULT 0,
            archived_at TEXT DEFAULT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (category_id) REFERENCES kc_categories(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS kc_tests (
            id TEXT PRIMARY KEY,
            test_number TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            passing_score INTEGER DEFAULT 80,
            time_limit_minutes INTEGER DEFAULT NULL,
            shuffle_questions INTEGER DEFAULT 0,
            show_results INTEGER DEFAULT 1,
            show_correct_answers INTEGER DEFAULT 1,
            max_attempts INTEGER DEFAULT NULL,
            is_active INTEGER DEFAULT 1,
            is_archived INTEGER DEFAULT 0,
            archived_at TEXT DEFAULT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS kc_test_questions (
            id TEXT PRIMARY KEY,
            test_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            weighting_override REAL DEFAULT NULL,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (test_id) REFERENCES kc_tests(id) ON DELETE CASCADE,
            FOREIGN KEY (question_id) REFERENCES kc_questions(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS kc_test_runs (
            id TEXT PRIMARY KEY,
            run_number TEXT UNIQUE NOT NULL,
            test_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            start_date TEXT NOT NULL,
            end_date TEXT,
            is_active INTEGER DEFAULT 1,
            is_archived INTEGER DEFAULT 0,
            archived_at TEXT DEFAULT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (test_id) REFERENCES kc_tests(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS kc_test_assignments (
            id TEXT PRIMARY KEY,
            test_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            run_id TEXT DEFAULT NULL,
            due_date TEXT,
            assigned_by TEXT NOT NULL,
            assigned_at TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (test_id) REFERENCES kc_tests(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (run_id) REFERENCES kc_test_runs(id),
            FOREIGN KEY (assigned_by) REFERENCES users(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS kc_test_results (
            id TEXT PRIMARY KEY,
            result_number TEXT UNIQUE NOT NULL,
            test_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            assignment_id TEXT,
            run_id TEXT DEFAULT NULL,
            score REAL DEFAULT 0,
            max_score REAL DEFAULT 0,
            percentage REAL DEFAULT 0,
            passed INTEGER DEFAULT 0,
            time_taken_seconds INTEGER DEFAULT 0,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            evaluated_by TEXT,
            evaluated_at TEXT,
            evaluator_notes TEXT DEFAULT '',
            attempt_number INTEGER DEFAULT 1,
            status TEXT DEFAULT 'in_progress',
            FOREIGN KEY (test_id) REFERENCES kc_tests(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (assignment_id) REFERENCES kc_test_assignments(id),
            FOREIGN KEY (run_id) REFERENCES kc_test_runs(id),
            FOREIGN KEY (evaluated_by) REFERENCES users(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS kc_test_answers (
            id TEXT PRIMARY KEY,
            result_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            test_question_id TEXT,
            selected_answers TEXT NOT NULL,
            is_correct INTEGER DEFAULT 0,
            partial_score REAL DEFAULT 0,
            max_score REAL DEFAULT 1,
            answered_at TEXT NOT NULL,
            option_details TEXT DEFAULT '[]',
            FOREIGN KEY (result_id) REFERENCES kc_test_results(id) ON DELETE CASCADE,
            FOREIGN KEY (question_id) REFERENCES kc_questions(id),
            FOREIGN KEY (test_question_id) REFERENCES kc_test_questions(id)
        )
    `);

    console.log('Tables created successfully');
}

/**
 * Creates database indexes for performance
 * Safely handles cases where tables/columns may not exist in older databases
 * @param {Object} db - Database instance with run method
 */
function createIndexes(db) {
    console.log('Creating database indexes...');
    
    // Helper to safely create an index (ignores errors if table/column doesn't exist)
    function safeCreateIndex(sql) {
        try {
            db.run(sql);
        } catch (e) {
            // Index creation failed - likely table or column doesn't exist
            // This is expected for older databases, silently ignore
        }
    }

    // User & Auth indexes
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams(user_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_user_teams_team ON user_teams(team_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)');

    // Ticket indexes
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id)');

    // Quality (legacy) indexes
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_quality_reports_agent ON quality_reports(agent_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_quality_reports_ticket ON quality_reports(ticket_id)');

    // Knowledge Check indexes
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_kc_questions_category ON kc_questions(category_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_kc_test_questions_test ON kc_test_questions(test_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_kc_test_assignments_user ON kc_test_assignments(user_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_kc_test_assignments_test ON kc_test_assignments(test_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_kc_test_assignments_run ON kc_test_assignments(run_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_kc_test_results_test ON kc_test_results(test_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_kc_test_results_user ON kc_test_results(user_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_kc_test_results_run ON kc_test_results(run_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_kc_test_answers_result ON kc_test_answers(result_id)');

    // Quality System v2 indexes
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_qs_tasks_team ON qs_tasks(team_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_qs_tasks_category ON qs_tasks(category_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_qs_quality_checks_team ON qs_quality_checks(team_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_qs_check_tasks_check ON qs_check_tasks(check_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_qs_evaluations_team ON qs_evaluations(team_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_qs_evaluations_agent ON qs_evaluations(agent_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_qs_evaluations_evaluator ON qs_evaluations(evaluator_id)');
    safeCreateIndex('CREATE INDEX IF NOT EXISTS idx_qs_evaluation_answers_eval ON qs_evaluation_answers(evaluation_id)');

    console.log('Indexes created successfully');
}

module.exports = {
    createTables,
    createIndexes
};
