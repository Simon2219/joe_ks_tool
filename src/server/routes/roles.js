/**
 * Role Management Routes
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { RolesDB, PermissionsDB, UsersDB } = require('../database/dbService');
const { authenticate, requirePermission } = require('../middleware/auth');

// Enrich role with user count
function enrichRole(role) {
    const userCount = UsersDB.getByRole(role.id).length;
    return { ...role, userCount };
}

// GET /api/roles
router.get('/', authenticate, requirePermission('role_view'), (req, res) => {
    try {
        const roles = RolesDB.getAll().map(enrichRole);
        res.json({ success: true, roles });
    } catch (error) {
        console.error('Get roles error:', error);
        res.json({ success: false, error: 'Failed to retrieve roles' });
    }
});

// GET /api/roles/permissions
router.get('/permissions', authenticate, requirePermission('role_view'), (req, res) => {
    try {
        const permissions = PermissionsDB.getAll();

        // Group by module
        const grouped = {};
        for (const perm of permissions) {
            if (!grouped[perm.module]) grouped[perm.module] = [];
            grouped[perm.module].push(perm);
        }

        res.json({ success: true, permissions, grouped });
    } catch (error) {
        console.error('Get permissions error:', error);
        res.json({ success: false, error: 'Failed to retrieve permissions' });
    }
});

// GET /api/roles/:id
router.get('/:id', authenticate, requirePermission('role_view'), (req, res) => {
    try {
        const role = RolesDB.getById(req.params.id);
        if (!role) {
            return res.json({ success: false, error: 'Role not found' });
        }
        res.json({ success: true, role: enrichRole(role) });
    } catch (error) {
        console.error('Get role error:', error);
        res.json({ success: false, error: 'Failed to retrieve role' });
    }
});

// POST /api/roles
router.post('/', authenticate, requirePermission('role_create'), (req, res) => {
    try {
        const roleData = req.body;

        if (!roleData.name || roleData.name.trim().length < 2) {
            return res.json({ success: false, error: 'Role name must be at least 2 characters' });
        }
        if (!roleData.permissions || roleData.permissions.length === 0) {
            return res.json({ success: false, error: 'At least one permission is required' });
        }

        // Check duplicate name
        const existingRoles = RolesDB.getAll();
        if (existingRoles.some(r => r.name.toLowerCase() === roleData.name.toLowerCase())) {
            return res.json({ success: false, error: 'A role with this name already exists' });
        }

        const newRole = {
            id: uuidv4(),
            name: roleData.name.trim(),
            description: roleData.description || '',
            isAdmin: roleData.isAdmin || false,
            isSystem: false,
            permissions: roleData.permissions,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        RolesDB.create(newRole);
        res.json({ success: true, role: enrichRole(newRole) });
    } catch (error) {
        console.error('Create role error:', error);
        res.json({ success: false, error: 'Failed to create role' });
    }
});

// PUT /api/roles/:id
router.put('/:id', authenticate, requirePermission('role_edit'), (req, res) => {
    try {
        const { id } = req.params;
        const roleData = req.body;

        const existingRole = RolesDB.getById(id);
        if (!existingRole) {
            return res.json({ success: false, error: 'Role not found' });
        }

        if (existingRole.isSystem && roleData.isAdmin !== undefined && roleData.isAdmin !== existingRole.isAdmin) {
            return res.json({ success: false, error: 'Cannot change admin status of system roles' });
        }

        // Check duplicate name
        const allRoles = RolesDB.getAll();
        if (roleData.name && allRoles.some(r => r.id !== id && r.name.toLowerCase() === roleData.name.toLowerCase())) {
            return res.json({ success: false, error: 'A role with this name already exists' });
        }

        const updates = {
            name: roleData.name ?? existingRole.name,
            description: roleData.description ?? existingRole.description,
            isAdmin: existingRole.isSystem ? existingRole.isAdmin : (roleData.isAdmin ?? existingRole.isAdmin),
            permissions: roleData.permissions ?? existingRole.permissions
        };

        const updatedRole = RolesDB.update(id, updates);
        res.json({ success: true, role: enrichRole(updatedRole) });
    } catch (error) {
        console.error('Update role error:', error);
        res.json({ success: false, error: 'Failed to update role' });
    }
});

// DELETE /api/roles/:id
router.delete('/:id', authenticate, requirePermission('role_delete'), (req, res) => {
    try {
        const role = RolesDB.getById(req.params.id);
        if (!role) {
            return res.json({ success: false, error: 'Role not found' });
        }

        if (role.isSystem) {
            return res.json({ success: false, error: 'Cannot delete system roles' });
        }

        const usersWithRole = UsersDB.getByRole(req.params.id);
        if (usersWithRole.length > 0) {
            return res.json({ success: false, error: `Cannot delete role. ${usersWithRole.length} user(s) are assigned to this role` });
        }

        RolesDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete role error:', error);
        res.json({ success: false, error: 'Failed to delete role' });
    }
});

module.exports = router;
