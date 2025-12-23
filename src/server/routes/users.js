/**
 * User Management Routes
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { UsersDB, RolesDB } = require('../database/dbService');
const { authenticate, requirePermission, hasPermission } = require('../middleware/auth');

// Validation helper
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Sanitize user for response
function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    const role = RolesDB.getById(user.roleId);
    return {
        ...safeUser,
        roleName: role ? role.name : 'Unknown',
        isAdmin: role ? role.isAdmin : false
    };
}

// GET /api/users
router.get('/', authenticate, requirePermission('user_view'), (req, res) => {
    try {
        const users = UsersDB.getAll().map(sanitizeUser);
        res.json({ success: true, users });
    } catch (error) {
        console.error('Get users error:', error);
        res.json({ success: false, error: 'Failed to retrieve users' });
    }
});

// GET /api/users/statistics
router.get('/statistics', authenticate, requirePermission('user_view'), (req, res) => {
    try {
        const users = UsersDB.getAll();
        const roles = RolesDB.getAll();

        const roleStats = roles.map(role => ({
            roleId: role.id,
            roleName: role.name,
            count: users.filter(u => u.roleId === role.id).length
        }));

        res.json({
            success: true,
            statistics: {
                total: users.length,
                active: users.filter(u => u.isActive).length,
                inactive: users.filter(u => !u.isActive).length,
                byRole: roleStats
            }
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.json({ success: false, error: 'Failed to get statistics' });
    }
});

// GET /api/users/:id
router.get('/:id', authenticate, requirePermission('user_view'), (req, res) => {
    try {
        const user = UsersDB.getById(req.params.id);
        if (!user) {
            return res.json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, user: sanitizeUser(user) });
    } catch (error) {
        console.error('Get user error:', error);
        res.json({ success: false, error: 'Failed to retrieve user' });
    }
});

// POST /api/users
router.post('/', authenticate, requirePermission('user_create'), async (req, res) => {
    try {
        const userData = req.body;

        // Validation
        if (!userData.username || userData.username.length < 3) {
            return res.json({ success: false, error: 'Username must be at least 3 characters' });
        }
        if (!isValidEmail(userData.email)) {
            return res.json({ success: false, error: 'Valid email is required' });
        }
        if (!userData.password || userData.password.length < 8) {
            return res.json({ success: false, error: 'Password must be at least 8 characters' });
        }
        if (!userData.firstName || !userData.lastName) {
            return res.json({ success: false, error: 'First and last name are required' });
        }

        // Check duplicates
        if (UsersDB.getByUsername(userData.username.toLowerCase())) {
            return res.json({ success: false, error: 'Username already exists' });
        }
        if (UsersDB.getByEmail(userData.email.toLowerCase())) {
            return res.json({ success: false, error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const newUser = {
            id: uuidv4(),
            username: userData.username.toLowerCase(),
            email: userData.email.toLowerCase(),
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            roleId: userData.roleId || 'agent',
            department: userData.department || '',
            phone: userData.phone || '',
            hireDate: userData.hireDate || null,
            isActive: userData.isActive !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLogin: null
        };

        UsersDB.create(newUser);
        res.json({ success: true, user: sanitizeUser(newUser) });
    } catch (error) {
        console.error('Create user error:', error);
        res.json({ success: false, error: 'Failed to create user' });
    }
});

// PUT /api/users/:id
router.put('/:id', authenticate, requirePermission('user_edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const userData = req.body;

        const existingUser = UsersDB.getById(id);
        if (!existingUser) {
            return res.json({ success: false, error: 'User not found' });
        }

        // Check for duplicate username/email
        if (userData.username && userData.username !== existingUser.username) {
            if (UsersDB.getByUsername(userData.username.toLowerCase())) {
                return res.json({ success: false, error: 'Username already exists' });
            }
        }
        if (userData.email && userData.email !== existingUser.email) {
            if (UsersDB.getByEmail(userData.email.toLowerCase())) {
                return res.json({ success: false, error: 'Email already exists' });
            }
        }

        const updates = {
            username: userData.username?.toLowerCase() || existingUser.username,
            email: userData.email?.toLowerCase() || existingUser.email,
            firstName: userData.firstName || existingUser.firstName,
            lastName: userData.lastName || existingUser.lastName,
            roleId: userData.roleId || existingUser.roleId,
            department: userData.department ?? existingUser.department,
            phone: userData.phone ?? existingUser.phone,
            hireDate: userData.hireDate ?? existingUser.hireDate,
            isActive: userData.isActive ?? existingUser.isActive
        };

        if (userData.password && userData.password.length >= 8) {
            updates.password = await bcrypt.hash(userData.password, 10);
        }

        const updatedUser = UsersDB.update(id, updates);
        res.json({ success: true, user: sanitizeUser(updatedUser) });
    } catch (error) {
        console.error('Update user error:', error);
        res.json({ success: false, error: 'Failed to update user' });
    }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, requirePermission('user_delete'), (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.id === id) {
            return res.json({ success: false, error: 'Cannot delete your own account' });
        }

        const user = UsersDB.getById(id);
        if (!user) {
            return res.json({ success: false, error: 'User not found' });
        }

        const role = RolesDB.getById(user.roleId);
        if (role && role.isAdmin) {
            const adminUsers = UsersDB.getByRole('admin');
            if (adminUsers.length <= 1) {
                return res.json({ success: false, error: 'Cannot delete the last administrator' });
            }
        }

        UsersDB.delete(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.json({ success: false, error: 'Failed to delete user' });
    }
});

// GET /api/users/export/:format
router.get('/export/:format', authenticate, requirePermission('user_export'), (req, res) => {
    try {
        const { format } = req.params;
        const users = UsersDB.getAll().map(sanitizeUser);

        if (format === 'json') {
            res.json({ success: true, data: JSON.stringify(users, null, 2), format: 'json' });
        } else if (format === 'csv') {
            const headers = ['ID', 'Username', 'Email', 'First Name', 'Last Name', 'Role', 'Department', 'Active'];
            const rows = users.map(u => [
                u.id, u.username, u.email, u.firstName, u.lastName,
                u.roleName, u.department || '', u.isActive
            ]);
            const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
            res.json({ success: true, data: csv, format: 'csv' });
        } else {
            res.json({ success: false, error: 'Invalid export format' });
        }
    } catch (error) {
        console.error('Export users error:', error);
        res.json({ success: false, error: 'Failed to export users' });
    }
});

module.exports = router;
