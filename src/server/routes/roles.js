/**
 * Role Management Routes
 * CRUD operations for roles and permissions
 */

const express = require('express');
const router = express.Router();

const { RoleModel, UserModel } = require('../database');
const { authenticate, requirePermission } = require('../middleware/auth');

/**
 * Formats role for response
 */
function formatRole(role) {
    return {
        id: role.id,
        name: role.name,
        description: role.description,
        isAdmin: !!role.is_admin,
        isSystem: !!role.is_system,
        permissions: role.permissions || [],
        userCount: role.user_count || 0,
        createdAt: role.created_at,
        updatedAt: role.updated_at
    };
}

/**
 * GET /api/roles
 * Returns all roles
 */
router.get('/', authenticate, requirePermission('role_view'), (req, res) => {
    try {
        const roles = RoleModel.getAll().map(formatRole);
        res.json({ success: true, roles });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve roles' });
    }
});

/**
 * GET /api/roles/permissions
 * Returns all available permissions
 */
router.get('/permissions', authenticate, requirePermission('role_view'), (req, res) => {
    try {
        const permissions = RoleModel.getAllPermissions();
        const grouped = RoleModel.getPermissionsGrouped();

        res.json({ 
            success: true, 
            permissions,
            grouped 
        });
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve permissions' });
    }
});

/**
 * GET /api/roles/:id
 * Returns a specific role
 */
router.get('/:id', authenticate, requirePermission('role_view'), (req, res) => {
    try {
        const role = RoleModel.getById(req.params.id);
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }
        res.json({ success: true, role: formatRole(role) });
    } catch (error) {
        console.error('Get role error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve role' });
    }
});

/**
 * POST /api/roles
 * Creates a new role
 */
router.post('/', authenticate, requirePermission('role_create'), (req, res) => {
    try {
        const roleData = req.body;

        // Validation
        if (!roleData.name || roleData.name.trim().length < 2) {
            return res.status(400).json({ 
                success: false, 
                error: 'Role name must be at least 2 characters' 
            });
        }
        if (!roleData.permissions || roleData.permissions.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'At least one permission is required' 
            });
        }

        // Check duplicate name
        if (RoleModel.nameExists(roleData.name)) {
            return res.status(400).json({ 
                success: false, 
                error: 'A role with this name already exists' 
            });
        }

        const newRole = RoleModel.create(roleData);
        res.status(201).json({ success: true, role: formatRole(newRole) });
    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({ success: false, error: 'Failed to create role' });
    }
});

/**
 * PUT /api/roles/:id
 * Updates a role
 */
router.put('/:id', authenticate, requirePermission('role_edit'), (req, res) => {
    try {
        const { id } = req.params;
        const roleData = req.body;

        const existingRole = RoleModel.getById(id);
        if (!existingRole) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        // Check duplicate name
        if (roleData.name && RoleModel.nameExists(roleData.name, id)) {
            return res.status(400).json({ 
                success: false, 
                error: 'A role with this name already exists' 
            });
        }

        // Prevent changing admin status of system roles
        if (existingRole.is_system && roleData.isAdmin !== undefined && roleData.isAdmin !== existingRole.is_admin) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot change admin status of system roles' 
            });
        }

        const updatedRole = RoleModel.update(id, roleData);
        res.json({ success: true, role: formatRole(updatedRole) });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ success: false, error: 'Failed to update role' });
    }
});

/**
 * DELETE /api/roles/:id
 * Deletes a role
 */
router.delete('/:id', authenticate, requirePermission('role_delete'), (req, res) => {
    try {
        const result = RoleModel.delete(req.params.id);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete role' });
    }
});

module.exports = router;
