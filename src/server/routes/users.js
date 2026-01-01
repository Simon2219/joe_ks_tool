/**
 * User Management Routes
 * CRUD operations for users
 */

const express = require('express');
const router = express.Router();

const { UserModel, RoleModel } = require('../database');
const { authenticate, requirePermission, hasPermission } = require('../middleware/auth');

/**
 * Validates email format
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Sanitizes user for response (removes password, formats data)
 */
function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return {
        id: safeUser.id,
        username: safeUser.username,
        email: safeUser.email,
        firstName: safeUser.first_name,
        lastName: safeUser.last_name,
        roleId: safeUser.role_id,
        roleName: safeUser.role_name || 'Unknown',
        isAdmin: !!safeUser.is_admin,
        department: safeUser.department,
        phone: safeUser.phone,
        hireDate: safeUser.hire_date,
        isActive: !!safeUser.is_active,
        createdAt: safeUser.created_at,
        updatedAt: safeUser.updated_at,
        lastLogin: safeUser.last_login
    };
}

/**
 * GET /api/users
 * Returns all users
 */
router.get('/', authenticate, requirePermission('user_view'), (req, res) => {
    try {
        const users = UserModel.getAll().map(sanitizeUser);
        res.json({ success: true, users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve users' });
    }
});

/**
 * GET /api/users/statistics
 * Returns user statistics
 */
router.get('/statistics', authenticate, requirePermission('user_view'), (req, res) => {
    try {
        const users = UserModel.getAll();
        const roles = RoleModel.getAll();

        const roleStats = roles.map(role => ({
            roleId: role.id,
            roleName: role.name,
            count: users.filter(u => u.role_id === role.id).length
        }));

        res.json({
            success: true,
            statistics: {
                total: users.length,
                active: users.filter(u => u.is_active).length,
                inactive: users.filter(u => !u.is_active).length,
                byRole: roleStats
            }
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ success: false, error: 'Failed to get statistics' });
    }
});

/**
 * GET /api/users/:id
 * Returns a specific user
 */
router.get('/:id', authenticate, requirePermission('user_view'), (req, res) => {
    try {
        const user = UserModel.getById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, user: sanitizeUser(user) });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve user' });
    }
});

/**
 * POST /api/users
 * Creates a new user
 */
router.post('/', authenticate, requirePermission('user_create'), async (req, res) => {
    try {
        const userData = req.body;

        // Validation
        if (!userData.username || userData.username.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username must be at least 3 characters' 
            });
        }
        if (!isValidEmail(userData.email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Valid email is required' 
            });
        }
        if (!userData.password || userData.password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password must be at least 8 characters' 
            });
        }
        if (!userData.firstName || !userData.lastName) {
            return res.status(400).json({ 
                success: false, 
                error: 'First and last name are required' 
            });
        }

        // Check duplicates
        if (UserModel.getByUsername(userData.username)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username already exists' 
            });
        }
        if (UserModel.getByEmail(userData.email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email already exists' 
            });
        }

        // Check if role exists
        if (userData.roleId) {
            const role = RoleModel.getById(userData.roleId);
            if (!role) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid role' 
                });
            }
        }

        const newUser = await UserModel.create(userData);
        res.status(201).json({ success: true, user: sanitizeUser(newUser) });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, error: 'Failed to create user' });
    }
});

/**
 * PUT /api/users/:id
 * Updates a user
 */
router.put('/:id', authenticate, requirePermission('user_edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const userData = req.body;

        const existingUser = UserModel.getById(id);
        if (!existingUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Check for duplicate username/email
        if (userData.username && userData.username.toLowerCase() !== existingUser.username.toLowerCase()) {
            if (UserModel.getByUsername(userData.username)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Username already exists' 
                });
            }
        }
        if (userData.email && userData.email.toLowerCase() !== existingUser.email.toLowerCase()) {
            if (UserModel.getByEmail(userData.email)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Email already exists' 
                });
            }
        }

        // Validate password if provided
        if (userData.password && userData.password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password must be at least 8 characters' 
            });
        }

        const updatedUser = await UserModel.update(id, userData);
        res.json({ success: true, user: sanitizeUser(updatedUser) });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
});

/**
 * DELETE /api/users/:id
 * Deletes a user
 */
router.delete('/:id', authenticate, requirePermission('user_delete'), (req, res) => {
    try {
        const { id } = req.params;

        // Can't delete yourself
        if (req.user.id === id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete your own account' 
            });
        }

        const user = UserModel.getById(id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Can't delete last admin
        const role = RoleModel.getById(user.role_id);
        if (role && role.is_admin) {
            const adminUsers = UserModel.getByRole('admin');
            if (adminUsers.length <= 1) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Cannot delete the last administrator' 
                });
            }
        }

        UserModel.delete(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

/**
 * GET /api/users/export/:format
 * Exports users to CSV or JSON
 */
router.get('/export/:format', authenticate, requirePermission('user_export'), (req, res) => {
    try {
        const { format } = req.params;
        const users = UserModel.getAll().map(sanitizeUser);

        if (format === 'json') {
            res.json({ 
                success: true, 
                data: JSON.stringify(users, null, 2), 
                format: 'json' 
            });
        } else if (format === 'csv') {
            const headers = ['ID', 'Username', 'Email', 'First Name', 'Last Name', 'Role', 'Department', 'Active'];
            const rows = users.map(u => [
                u.id, u.username, u.email, u.firstName, u.lastName,
                u.roleName, u.department || '', u.isActive
            ]);
            const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
            res.json({ success: true, data: csv, format: 'csv' });
        } else {
            res.status(400).json({ success: false, error: 'Invalid export format' });
        }
    } catch (error) {
        console.error('Export users error:', error);
        res.status(500).json({ success: false, error: 'Failed to export users' });
    }
});

module.exports = router;
