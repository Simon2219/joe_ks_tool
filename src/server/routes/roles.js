/**
 * Role Routes - RoleSystem
 * Handles role and permission management
 */

const express = require('express');
const router = express.Router();

const { RoleSystem, UserSystem } = require('../database');
const { authenticate, requirePermission, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/roles
 */
router.get('/', requirePermission('role_view'), (req, res) => {
    try {
        const roles = RoleSystem.getAll();
        res.json({ success: true, roles });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch roles' });
    }
});

/**
 * GET /api/roles/permissions
 */
router.get('/permissions', requirePermission('role_view'), (req, res) => {
    try {
        const permissions = RoleSystem.getAllPermissions();
        
        // Group by module
        const grouped = {};
        permissions.forEach(p => {
            if (!grouped[p.module]) grouped[p.module] = [];
            grouped[p.module].push(p);
        });
        
        res.json({ success: true, permissions, grouped });
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
    }
});

/**
 * GET /api/roles/:id
 */
router.get('/:id', requirePermission('role_view'), (req, res) => {
    try {
        const role = RoleSystem.getById(req.params.id);
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }
        res.json({ success: true, role });
    } catch (error) {
        console.error('Get role error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch role' });
    }
});

/**
 * POST /api/roles
 */
router.post('/', requireAdmin, (req, res) => {
    try {
        const { name, description, isAdmin, permissions } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }

        // Check for duplicate name
        const existing = RoleSystem.getAll().find(r => r.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            return res.status(400).json({ success: false, error: 'Role name already exists' });
        }

        const role = RoleSystem.create({ name, description, isAdmin, permissions });
        res.status(201).json({ success: true, role });
    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({ success: false, error: 'Failed to create role' });
    }
});

/**
 * PUT /api/roles/:id
 */
router.put('/:id', requireAdmin, (req, res) => {
    try {
        const role = RoleSystem.getById(req.params.id);
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        // Check name uniqueness if changing
        if (req.body.name && req.body.name.toLowerCase() !== role.name.toLowerCase()) {
            const existing = RoleSystem.getAll().find(r => r.name.toLowerCase() === req.body.name.toLowerCase());
            if (existing) {
                return res.status(400).json({ success: false, error: 'Role name already exists' });
            }
        }

        const updated = RoleSystem.update(req.params.id, req.body);
        res.json({ success: true, role: updated });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ success: false, error: 'Failed to update role' });
    }
});

/**
 * DELETE /api/roles/:id
 */
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const result = RoleSystem.delete(req.params.id);
        
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete role' });
    }
});

module.exports = router;
