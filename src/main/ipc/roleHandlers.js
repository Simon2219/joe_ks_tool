/**
 * Role Management IPC Handlers
 * Handles CRUD operations for roles and permissions
 */

const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { RolesDB, PermissionsDB, UsersDB } = require('../database/dbService');
const { checkPermission } = require('./authHandlers');

/**
 * Validates role data
 */
function validateRoleData(roleData) {
    const errors = [];
    
    if (!roleData.name || roleData.name.trim().length < 2) {
        errors.push('Role name must be at least 2 characters');
    }
    
    if (!roleData.permissions || roleData.permissions.length === 0) {
        errors.push('At least one permission is required');
    }
    
    return errors;
}

/**
 * Enriches role with user count
 */
function enrichRole(role) {
    const userCount = UsersDB.getByRole(role.id).length;
    return {
        ...role,
        userCount
    };
}

/**
 * Registers role management IPC handlers
 */
function registerRoleHandlers() {
    // Get all roles
    ipcMain.handle('roles:getAll', async () => {
        try {
            if (!checkPermission('role_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const roles = RolesDB.getAll().map(enrichRole);
            return { success: true, roles };
        } catch (error) {
            console.error('Get roles error:', error);
            return { success: false, error: 'Failed to retrieve roles' };
        }
    });
    
    // Get role by ID
    ipcMain.handle('roles:getById', async (event, id) => {
        try {
            if (!checkPermission('role_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const role = RolesDB.getById(id);
            if (!role) {
                return { success: false, error: 'Role not found' };
            }
            
            return { success: true, role: enrichRole(role) };
        } catch (error) {
            console.error('Get role error:', error);
            return { success: false, error: 'Failed to retrieve role' };
        }
    });
    
    // Create role
    ipcMain.handle('roles:create', async (event, roleData) => {
        try {
            if (!checkPermission('role_create')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const errors = validateRoleData(roleData);
            if (errors.length > 0) {
                return { success: false, error: errors.join(', ') };
            }
            
            // Check for duplicate name
            const existingRoles = RolesDB.getAll();
            if (existingRoles.some(r => r.name.toLowerCase() === roleData.name.toLowerCase())) {
                return { success: false, error: 'A role with this name already exists' };
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
            
            return { success: true, role: enrichRole(newRole) };
        } catch (error) {
            console.error('Create role error:', error);
            return { success: false, error: 'Failed to create role' };
        }
    });
    
    // Update role
    ipcMain.handle('roles:update', async (event, id, roleData) => {
        try {
            if (!checkPermission('role_edit')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const existingRole = RolesDB.getById(id);
            if (!existingRole) {
                return { success: false, error: 'Role not found' };
            }
            
            // Prevent editing system role core properties
            if (existingRole.isSystem && roleData.isAdmin !== undefined && roleData.isAdmin !== existingRole.isAdmin) {
                return { success: false, error: 'Cannot change admin status of system roles' };
            }
            
            const errors = validateRoleData({ ...existingRole, ...roleData });
            if (errors.length > 0) {
                return { success: false, error: errors.join(', ') };
            }
            
            // Check for duplicate name (excluding current role)
            const existingRoles = RolesDB.getAll();
            if (roleData.name && existingRoles.some(r => 
                r.id !== id && r.name.toLowerCase() === roleData.name.toLowerCase()
            )) {
                return { success: false, error: 'A role with this name already exists' };
            }
            
            const updates = {
                name: roleData.name ?? existingRole.name,
                description: roleData.description ?? existingRole.description,
                isAdmin: existingRole.isSystem ? existingRole.isAdmin : (roleData.isAdmin ?? existingRole.isAdmin),
                permissions: roleData.permissions ?? existingRole.permissions
            };
            
            const updatedRole = RolesDB.update(id, updates);
            
            return { success: true, role: enrichRole(updatedRole) };
        } catch (error) {
            console.error('Update role error:', error);
            return { success: false, error: 'Failed to update role' };
        }
    });
    
    // Delete role
    ipcMain.handle('roles:delete', async (event, id) => {
        try {
            if (!checkPermission('role_delete')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const role = RolesDB.getById(id);
            if (!role) {
                return { success: false, error: 'Role not found' };
            }
            
            if (role.isSystem) {
                return { success: false, error: 'Cannot delete system roles' };
            }
            
            // Check if any users have this role
            const usersWithRole = UsersDB.getByRole(id);
            if (usersWithRole.length > 0) {
                return { 
                    success: false, 
                    error: `Cannot delete role. ${usersWithRole.length} user(s) are assigned to this role` 
                };
            }
            
            RolesDB.delete(id);
            
            return { success: true };
        } catch (error) {
            console.error('Delete role error:', error);
            return { success: false, error: 'Failed to delete role' };
        }
    });
    
    // Get all permissions
    ipcMain.handle('roles:getPermissions', async () => {
        try {
            if (!checkPermission('role_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const permissions = PermissionsDB.getAll();
            
            // Group permissions by module
            const grouped = {};
            for (const perm of permissions) {
                if (!grouped[perm.module]) {
                    grouped[perm.module] = [];
                }
                grouped[perm.module].push(perm);
            }
            
            return { success: true, permissions, grouped };
        } catch (error) {
            console.error('Get permissions error:', error);
            return { success: false, error: 'Failed to retrieve permissions' };
        }
    });
    
    // Assign permissions to role
    ipcMain.handle('roles:assignPermissions', async (event, roleId, permissions) => {
        try {
            if (!checkPermission('role_edit')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const role = RolesDB.getById(roleId);
            if (!role) {
                return { success: false, error: 'Role not found' };
            }
            
            // Validate permissions exist
            const validPermissions = PermissionsDB.getAll().map(p => p.id);
            const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
            if (invalidPerms.length > 0) {
                return { success: false, error: `Invalid permissions: ${invalidPerms.join(', ')}` };
            }
            
            const updatedRole = RolesDB.update(roleId, { permissions });
            
            return { success: true, role: enrichRole(updatedRole) };
        } catch (error) {
            console.error('Assign permissions error:', error);
            return { success: false, error: 'Failed to assign permissions' };
        }
    });
}

module.exports = { registerRoleHandlers };
