/**
 * User Routes - UserSystem
 * Handles user management operations
 */

const express = require('express');
const router = express.Router();

const { UserSystem, RoleSystem } = require('../database');
const { authenticate, requirePermission, requireAdmin, hasPermission } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/users
 */
router.get('/', requirePermission('user_view'), (req, res) => {
    try {
        const users = UserSystem.getAll();
        const sanitized = users.map(sanitizeUser);
        res.json({ success: true, users: sanitized });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/users/stats - User statistics
 * Note: This must come BEFORE /:id route
 */
router.get('/stats', requirePermission('user_view'), (req, res) => {
    try {
        const users = UserSystem.getAll();
        const total = users.length;
        const active = users.filter(u => u.is_active).length;
        
        res.json({
            success: true,
            statistics: {
                total,
                active,
                inactive: total - active
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

/**
 * GET /api/users/export/:format - Export users
 * Note: This must come BEFORE /:id route
 */
router.get('/export/:format', requirePermission('user_view'), (req, res) => {
    try {
        const users = UserSystem.getAll().map(sanitizeUser);
        
        // Generate CSV
        const headers = ['Username', 'Email', 'First Name', 'Last Name', 'Role', 'Department', 'Status', 'Last Login'];
        const rows = users.map(u => [
            u.username,
            u.email,
            u.firstName,
            u.lastName,
            u.roleName,
            u.department || '',
            u.isActive ? 'Active' : 'Inactive',
            u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        res.json({ success: true, data: csv });
    } catch (error) {
        console.error('Export users error:', error);
        res.status(500).json({ success: false, error: 'Failed to export users' });
    }
});

/**
 * GET /api/users/:id
 */
router.get('/:id', requirePermission('user_view'), (req, res) => {
    try {
        const user = UserSystem.getById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, user: sanitizeUser(user) });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
});

/**
 * POST /api/users
 */
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, roleId, department, phone, isActive } = req.body;

        // Validation
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({ success: false, error: 'Required fields missing' });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        }

        // Check for duplicates
        if (UserSystem.getByUsername(username)) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }
        if (UserSystem.getByEmail(email)) {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }

        // Verify role exists
        if (roleId && !RoleSystem.getById(roleId)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        const user = await UserSystem.create({ username, email, password, firstName, lastName, roleId, department, phone, isActive });
        res.status(201).json({ success: true, user: sanitizeUser(user) });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, error: 'Failed to create user' });
    }
});

/**
 * PUT /api/users/:id
 */
router.put('/:id', requirePermission('user_edit'), async (req, res) => {
    try {
        const existing = UserSystem.getById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Only admins can change roles
        if (req.body.roleId && !req.user.role?.isAdmin) {
            delete req.body.roleId;
        }

        // Check username/email uniqueness
        if (req.body.username && req.body.username.toLowerCase() !== existing.username.toLowerCase()) {
            if (UserSystem.getByUsername(req.body.username)) {
                return res.status(400).json({ success: false, error: 'Username already exists' });
            }
        }
        if (req.body.email && req.body.email.toLowerCase() !== existing.email.toLowerCase()) {
            if (UserSystem.getByEmail(req.body.email)) {
                return res.status(400).json({ success: false, error: 'Email already exists' });
            }
        }

        const user = await UserSystem.update(req.params.id, req.body);
        res.json({ success: true, user: sanitizeUser(user) });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        }

        const user = UserSystem.getById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Prevent deleting the last admin
        if (user.is_admin) {
            const adminCount = UserSystem.getAll().filter(u => u.is_admin && u.is_active).length;
            if (adminCount <= 1) {
                return res.status(400).json({ success: false, error: 'Cannot delete the last admin' });
            }
        }

        UserSystem.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

function sanitizeUser(user) {
    const { password, ...rest } = user;
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id,
        roleName: user.role_name || '',
        department: user.department || '',
        phone: user.phone || '',
        isActive: !!user.is_active,
        isAdmin: !!user.is_admin,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
    };
}

module.exports = router;
