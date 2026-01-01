/**
 * Role Model
 * Database operations for roles and permissions
 */

const { getDatabase } = require('../sqlite');
const { v4: uuidv4 } = require('uuid');

const RoleModel = {
    /**
     * Gets all roles with user counts
     */
    getAll() {
        const db = getDatabase();
        const roles = db.prepare(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM users WHERE role_id = r.id) as user_count
            FROM roles r
            ORDER BY r.is_system DESC, r.name ASC
        `).all();

        // Get permissions for each role
        return roles.map(role => ({
            ...role,
            is_admin: !!role.is_admin,
            is_system: !!role.is_system,
            permissions: this.getRolePermissions(role.id)
        }));
    },

    /**
     * Gets a role by ID
     */
    getById(id) {
        const db = getDatabase();
        const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
        if (!role) return null;

        return {
            ...role,
            is_admin: !!role.is_admin,
            is_system: !!role.is_system,
            permissions: this.getRolePermissions(id)
        };
    },

    /**
     * Gets permissions for a role
     */
    getRolePermissions(roleId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT permission_id FROM role_permissions WHERE role_id = ?
        `).all(roleId).map(p => p.permission_id);
    },

    /**
     * Gets all permissions
     */
    getAllPermissions() {
        const db = getDatabase();
        return db.prepare('SELECT * FROM permissions ORDER BY module, name').all();
    },

    /**
     * Gets permissions grouped by module
     */
    getPermissionsGrouped() {
        const permissions = this.getAllPermissions();
        const grouped = {};

        for (const perm of permissions) {
            if (!grouped[perm.module]) {
                grouped[perm.module] = [];
            }
            grouped[perm.module].push(perm);
        }

        return grouped;
    },

    /**
     * Creates a new role
     */
    create(roleData) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const id = uuidv4();

        const transaction = db.transaction(() => {
            // Insert role
            db.prepare(`
                INSERT INTO roles (id, name, description, is_admin, is_system, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                roleData.name,
                roleData.description || '',
                roleData.isAdmin ? 1 : 0,
                0, // Custom roles are not system roles
                now,
                now
            );

            // Insert role permissions
            const insertPermission = db.prepare(
                'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
            );
            for (const permId of (roleData.permissions || [])) {
                insertPermission.run(id, permId);
            }
        });

        transaction();
        return this.getById(id);
    },

    /**
     * Updates a role
     */
    update(id, updates) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const existing = this.getById(id);
        if (!existing) return null;

        const transaction = db.transaction(() => {
            const fields = [];
            const values = [];

            if (updates.name !== undefined) {
                fields.push('name = ?');
                values.push(updates.name);
            }
            if (updates.description !== undefined) {
                fields.push('description = ?');
                values.push(updates.description);
            }
            // Only allow changing isAdmin for non-system roles
            if (updates.isAdmin !== undefined && !existing.is_system) {
                fields.push('is_admin = ?');
                values.push(updates.isAdmin ? 1 : 0);
            }

            if (fields.length > 0) {
                fields.push('updated_at = ?');
                values.push(now);
                values.push(id);
                db.prepare(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
            }

            // Update permissions if provided
            if (updates.permissions !== undefined) {
                db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id);
                const insertPermission = db.prepare(
                    'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
                );
                for (const permId of updates.permissions) {
                    insertPermission.run(id, permId);
                }
            }
        });

        transaction();
        return this.getById(id);
    },

    /**
     * Deletes a role
     */
    delete(id) {
        const db = getDatabase();
        const role = this.getById(id);
        
        if (!role) return { success: false, error: 'Role not found' };
        if (role.is_system) return { success: false, error: 'Cannot delete system roles' };
        
        // Check if any users have this role
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role_id = ?').get(id).count;
        if (userCount > 0) {
            return { success: false, error: `Cannot delete role. ${userCount} user(s) are assigned to this role` };
        }

        const result = db.prepare('DELETE FROM roles WHERE id = ?').run(id);
        return { success: result.changes > 0 };
    },

    /**
     * Checks if a user has a specific permission
     */
    hasPermission(roleId, permissionId) {
        const db = getDatabase();
        const role = db.prepare('SELECT is_admin FROM roles WHERE id = ?').get(roleId);
        
        // Admins have all permissions
        if (role && role.is_admin) return true;

        const result = db.prepare(`
            SELECT 1 FROM role_permissions 
            WHERE role_id = ? AND permission_id = ?
        `).get(roleId, permissionId);

        return !!result;
    },

    /**
     * Checks if role name exists
     */
    nameExists(name, excludeId = null) {
        const db = getDatabase();
        if (excludeId) {
            return !!db.prepare(
                'SELECT 1 FROM roles WHERE LOWER(name) = LOWER(?) AND id != ?'
            ).get(name, excludeId);
        }
        return !!db.prepare('SELECT 1 FROM roles WHERE LOWER(name) = LOWER(?)').get(name);
    }
};

module.exports = RoleModel;
