/**
 * User Model
 * Database operations for users
 */

const { getDatabase } = require('../sqlite');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const UserModel = {
    /**
     * Gets all users (without passwords)
     */
    getAll() {
        const db = getDatabase();
        return db.prepare(`
            SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
                   u.role_id, u.department, u.phone, u.hire_date, u.is_active,
                   u.created_at, u.updated_at, u.last_login,
                   r.name as role_name, r.is_admin
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `).all();
    },

    /**
     * Gets a user by ID
     */
    getById(id) {
        const db = getDatabase();
        return db.prepare(`
            SELECT u.*, r.name as role_name, r.is_admin
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `).get(id);
    },

    /**
     * Gets a user by username (includes password for auth)
     */
    getByUsername(username) {
        const db = getDatabase();
        return db.prepare(`
            SELECT u.*, r.name as role_name, r.is_admin
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE LOWER(u.username) = LOWER(?)
        `).get(username);
    },

    /**
     * Gets a user by email
     */
    getByEmail(email) {
        const db = getDatabase();
        return db.prepare(`
            SELECT u.*, r.name as role_name, r.is_admin
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE LOWER(u.email) = LOWER(?)
        `).get(email);
    },

    /**
     * Gets users by role
     */
    getByRole(roleId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
                   u.role_id, u.department, u.is_active
            FROM users u
            WHERE u.role_id = ?
        `).all(roleId);
    },

    /**
     * Creates a new user
     */
    async create(userData) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const id = uuidv4();
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        db.prepare(`
            INSERT INTO users (id, username, email, password, first_name, last_name, 
                             role_id, department, phone, hire_date, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            userData.username.toLowerCase(),
            userData.email.toLowerCase(),
            hashedPassword,
            userData.firstName,
            userData.lastName,
            userData.roleId || 'agent',
            userData.department || '',
            userData.phone || '',
            userData.hireDate || null,
            userData.isActive !== false ? 1 : 0,
            now,
            now
        );

        return this.getById(id);
    },

    /**
     * Updates a user
     */
    async update(id, updates) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const existing = this.getById(id);
        if (!existing) return null;

        const fields = [];
        const values = [];

        if (updates.username !== undefined) {
            fields.push('username = ?');
            values.push(updates.username.toLowerCase());
        }
        if (updates.email !== undefined) {
            fields.push('email = ?');
            values.push(updates.email.toLowerCase());
        }
        if (updates.password !== undefined) {
            fields.push('password = ?');
            values.push(await bcrypt.hash(updates.password, 10));
        }
        if (updates.firstName !== undefined) {
            fields.push('first_name = ?');
            values.push(updates.firstName);
        }
        if (updates.lastName !== undefined) {
            fields.push('last_name = ?');
            values.push(updates.lastName);
        }
        if (updates.roleId !== undefined) {
            fields.push('role_id = ?');
            values.push(updates.roleId);
        }
        if (updates.department !== undefined) {
            fields.push('department = ?');
            values.push(updates.department);
        }
        if (updates.phone !== undefined) {
            fields.push('phone = ?');
            values.push(updates.phone);
        }
        if (updates.hireDate !== undefined) {
            fields.push('hire_date = ?');
            values.push(updates.hireDate);
        }
        if (updates.isActive !== undefined) {
            fields.push('is_active = ?');
            values.push(updates.isActive ? 1 : 0);
        }
        if (updates.lastLogin !== undefined) {
            fields.push('last_login = ?');
            values.push(updates.lastLogin);
        }

        fields.push('updated_at = ?');
        values.push(now);
        values.push(id);

        db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

        return this.getById(id);
    },

    /**
     * Deletes a user
     */
    delete(id) {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return result.changes > 0;
    },

    /**
     * Counts users
     */
    count() {
        const db = getDatabase();
        return db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    },

    /**
     * Counts active users
     */
    countActive() {
        const db = getDatabase();
        return db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;
    },

    /**
     * Searches users
     */
    search(query) {
        const db = getDatabase();
        const searchTerm = `%${query.toLowerCase()}%`;
        return db.prepare(`
            SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
                   u.role_id, u.department, u.is_active,
                   r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE LOWER(u.username) LIKE ? 
               OR LOWER(u.email) LIKE ?
               OR LOWER(u.first_name) LIKE ?
               OR LOWER(u.last_name) LIKE ?
        `).all(searchTerm, searchTerm, searchTerm, searchTerm);
    },

    /**
     * Validates password
     */
    async validatePassword(user, password) {
        return bcrypt.compare(password, user.password);
    },

    /**
     * Gets user with full role and permissions
     */
    getWithPermissions(id) {
        const db = getDatabase();
        const user = this.getById(id);
        if (!user) return null;

        const permissions = db.prepare(`
            SELECT p.id
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
        `).all(user.role_id).map(p => p.id);

        return {
            ...user,
            permissions
        };
    }
};

module.exports = UserModel;
