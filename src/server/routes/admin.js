/**
 * Admin Routes
 * Database viewer and admin utilities
 */

const express = require('express');
const router = express.Router();

const { UserSystem, RoleSystem, TicketSystem, QualitySystem, KnowledgeCheckSystem, SettingsSystem, getDb } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/database
 * Returns database overview
 */
router.get('/database', (req, res) => {
    try {
        const stats = {
            users: UserSystem.count(),
            roles: RoleSystem.getAll().length,
            tickets: TicketSystem.getStatistics(),
            quality: QualitySystem.getStatistics()
        };
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Database stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/database/users
 * Returns all users (admin view)
 */
router.get('/database/users', (req, res) => {
    try {
        const users = UserSystem.getAll().map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            role_id: u.role_id,
            role_name: u.role_name,
            is_active: u.is_active,
            created_at: u.created_at,
            last_login: u.last_login
        }));
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/database/roles
 * Returns all roles
 */
router.get('/database/roles', (req, res) => {
    try {
        const roles = RoleSystem.getAll();
        res.json({ success: true, roles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/database/tickets
 * Returns all tickets
 */
router.get('/database/tickets', (req, res) => {
    try {
        const tickets = TicketSystem.getAll();
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/database/query
 * Execute a read-only SQL query (for debugging)
 */
router.get('/database/query', (req, res) => {
    try {
        const { sql } = req.query;
        
        if (!sql) {
            return res.status(400).json({ success: false, error: 'SQL query required' });
        }
        
        // Only allow SELECT queries for safety
        const trimmedSql = sql.trim().toUpperCase();
        if (!trimmedSql.startsWith('SELECT')) {
            return res.status(400).json({ success: false, error: 'Only SELECT queries allowed' });
        }
        
        const db = getDb();
        const stmt = db.prepare(sql);
        const results = [];
        
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        
        res.json({ success: true, results, count: results.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/database/tables
 * Returns list of all tables
 */
router.get('/database/tables', (req, res) => {
    try {
        const db = getDb();
        const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        const tables = [];
        
        while (stmt.step()) {
            tables.push(stmt.getAsObject().name);
        }
        stmt.free();
        
        res.json({ success: true, tables });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// MIGRATION UTILITIES
// ============================================

/**
 * GET /api/admin/migrations/orphaned-assignments
 * Get count of orphaned test assignments
 */
router.get('/migrations/orphaned-assignments', (req, res) => {
    try {
        const count = KnowledgeCheckSystem.getOrphanedAssignmentsCount();
        res.json({ success: true, count });
    } catch (error) {
        console.error('Get orphaned assignments count error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/migrations/orphaned-assignments
 * Run migration to assign orphaned assignments to default test run
 */
router.post('/migrations/orphaned-assignments', (req, res) => {
    try {
        const result = KnowledgeCheckSystem.migrateOrphanedAssignments();
        res.json(result);
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
