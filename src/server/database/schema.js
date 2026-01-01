/**
 * SQLite Database Schema
 * Defines all tables for the Customer Support Tool
 */

const SCHEMA = `
-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

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
    hire_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login TEXT,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================

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
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- ============================================
-- SESSIONS & TOKENS
-- ============================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0,
    revoked_at TEXT,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================================
-- TICKETS
-- ============================================

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
    jira_key TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);

CREATE TABLE IF NOT EXISTS ticket_tags (
    ticket_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (ticket_id, tag),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ticket_comments (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);

CREATE TABLE IF NOT EXISTS ticket_history (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id);

-- ============================================
-- QUALITY MANAGEMENT
-- ============================================

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
    max_score INTEGER DEFAULT 10,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES quality_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quality_criteria_category ON quality_criteria(category_id);

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
    areas_for_improvement TEXT DEFAULT '',
    coaching_notes TEXT DEFAULT '',
    ticket_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES users(id),
    FOREIGN KEY (evaluator_id) REFERENCES users(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quality_reports_agent ON quality_reports(agent_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_evaluator ON quality_reports(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_date ON quality_reports(evaluation_date);

CREATE TABLE IF NOT EXISTS quality_scores (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    criteria_id TEXT,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 10,
    notes TEXT DEFAULT '',
    FOREIGN KEY (report_id) REFERENCES quality_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES quality_categories(id),
    FOREIGN KEY (criteria_id) REFERENCES quality_criteria(id)
);

CREATE INDEX IF NOT EXISTS idx_quality_scores_report ON quality_scores(report_id);

-- ============================================
-- SETTINGS & INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    encrypted INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS integration_credentials (
    id TEXT PRIMARY KEY,
    integration_type TEXT UNIQUE NOT NULL,
    credentials TEXT NOT NULL,
    encrypted INTEGER DEFAULT 0,
    is_connected INTEGER DEFAULT 0,
    last_connected TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
`;

module.exports = { SCHEMA };
