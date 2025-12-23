/**
 * User Management IPC Handlers
 * Handles CRUD operations for users
 */

const { ipcMain } = require('electron');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { UsersDB, RolesDB } = require('../database/dbService');
const { checkPermission, getCurrentSession } = require('./authHandlers');

/**
 * Validates user data
 */
function validateUserData(userData, isNew = true) {
    const errors = [];
    
    if (!userData.username || userData.username.length < 3) {
        errors.push('Username must be at least 3 characters');
    }
    
    if (!userData.email || !isValidEmail(userData.email)) {
        errors.push('Valid email is required');
    }
    
    if (isNew && (!userData.password || userData.password.length < 8)) {
        errors.push('Password must be at least 8 characters');
    }
    
    if (!userData.firstName || userData.firstName.trim() === '') {
        errors.push('First name is required');
    }
    
    if (!userData.lastName || userData.lastName.trim() === '') {
        errors.push('Last name is required');
    }
    
    if (!userData.roleId) {
        errors.push('Role is required');
    }
    
    return errors;
}

/**
 * Validates email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitizes user data for response
 */
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

/**
 * Generates user statistics
 */
function generateStatistics() {
    const users = UsersDB.getAll();
    const roles = RolesDB.getAll();
    
    const roleStats = roles.map(role => ({
        roleId: role.id,
        roleName: role.name,
        count: users.filter(u => u.roleId === role.id).length
    }));
    
    return {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length,
        byRole: roleStats,
        recentlyCreated: users
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map(sanitizeUser)
    };
}

/**
 * Exports users to specified format
 */
function exportUsers(format) {
    const users = UsersDB.getAll().map(sanitizeUser);
    
    if (format === 'json') {
        return JSON.stringify(users, null, 2);
    }
    
    if (format === 'csv') {
        const headers = ['ID', 'Username', 'Email', 'First Name', 'Last Name', 'Role', 'Department', 'Active', 'Created At'];
        const rows = users.map(u => [
            u.id, u.username, u.email, u.firstName, u.lastName,
            u.roleName, u.department || '', u.isActive, u.createdAt
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return null;
}

/**
 * Registers user management IPC handlers
 */
function registerUserHandlers() {
    // Get all users
    ipcMain.handle('users:getAll', async () => {
        try {
            if (!checkPermission('user_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const users = UsersDB.getAll().map(sanitizeUser);
            return { success: true, users };
        } catch (error) {
            console.error('Get users error:', error);
            return { success: false, error: 'Failed to retrieve users' };
        }
    });
    
    // Get user by ID
    ipcMain.handle('users:getById', async (event, id) => {
        try {
            if (!checkPermission('user_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const user = UsersDB.getById(id);
            if (!user) {
                return { success: false, error: 'User not found' };
            }
            
            return { success: true, user: sanitizeUser(user) };
        } catch (error) {
            console.error('Get user error:', error);
            return { success: false, error: 'Failed to retrieve user' };
        }
    });
    
    // Create user
    ipcMain.handle('users:create', async (event, userData) => {
        try {
            if (!checkPermission('user_create')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const errors = validateUserData(userData, true);
            if (errors.length > 0) {
                return { success: false, error: errors.join(', ') };
            }
            
            // Check for duplicate username
            if (UsersDB.getByUsername(userData.username)) {
                return { success: false, error: 'Username already exists' };
            }
            
            // Check for duplicate email
            if (UsersDB.getByEmail(userData.email)) {
                return { success: false, error: 'Email already exists' };
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            
            const newUser = {
                id: uuidv4(),
                username: userData.username.toLowerCase(),
                email: userData.email.toLowerCase(),
                password: hashedPassword,
                firstName: userData.firstName,
                lastName: userData.lastName,
                roleId: userData.roleId,
                department: userData.department || '',
                phone: userData.phone || '',
                hireDate: userData.hireDate || null,
                notes: userData.notes || '',
                isActive: userData.isActive !== false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastLogin: null
            };
            
            UsersDB.create(newUser);
            
            return { success: true, user: sanitizeUser(newUser) };
        } catch (error) {
            console.error('Create user error:', error);
            return { success: false, error: 'Failed to create user' };
        }
    });
    
    // Update user
    ipcMain.handle('users:update', async (event, id, userData) => {
        try {
            if (!checkPermission('user_edit')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const existingUser = UsersDB.getById(id);
            if (!existingUser) {
                return { success: false, error: 'User not found' };
            }
            
            const errors = validateUserData({ ...existingUser, ...userData }, false);
            if (errors.length > 0) {
                return { success: false, error: errors.join(', ') };
            }
            
            // Check for duplicate username (excluding current user)
            if (userData.username && userData.username !== existingUser.username) {
                const existingUsername = UsersDB.getByUsername(userData.username);
                if (existingUsername) {
                    return { success: false, error: 'Username already exists' };
                }
            }
            
            // Check for duplicate email (excluding current user)
            if (userData.email && userData.email !== existingUser.email) {
                const existingEmail = UsersDB.getByEmail(userData.email);
                if (existingEmail) {
                    return { success: false, error: 'Email already exists' };
                }
            }
            
            // Prepare updates (exclude password if not provided)
            const updates = {
                username: userData.username?.toLowerCase() || existingUser.username,
                email: userData.email?.toLowerCase() || existingUser.email,
                firstName: userData.firstName || existingUser.firstName,
                lastName: userData.lastName || existingUser.lastName,
                roleId: userData.roleId || existingUser.roleId,
                department: userData.department ?? existingUser.department,
                phone: userData.phone ?? existingUser.phone,
                hireDate: userData.hireDate ?? existingUser.hireDate,
                notes: userData.notes ?? existingUser.notes,
                isActive: userData.isActive ?? existingUser.isActive
            };
            
            // Handle password update if provided
            if (userData.password && userData.password.length >= 8) {
                updates.password = await bcrypt.hash(userData.password, 10);
            }
            
            const updatedUser = UsersDB.update(id, updates);
            
            return { success: true, user: sanitizeUser(updatedUser) };
        } catch (error) {
            console.error('Update user error:', error);
            return { success: false, error: 'Failed to update user' };
        }
    });
    
    // Delete user
    ipcMain.handle('users:delete', async (event, id) => {
        try {
            if (!checkPermission('user_delete')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const session = getCurrentSession();
            if (session && session.user.id === id) {
                return { success: false, error: 'Cannot delete your own account' };
            }
            
            const user = UsersDB.getById(id);
            if (!user) {
                return { success: false, error: 'User not found' };
            }
            
            // Check if user is the last admin
            const role = RolesDB.getById(user.roleId);
            if (role && role.isAdmin) {
                const adminUsers = UsersDB.getByRole('admin');
                if (adminUsers.length <= 1) {
                    return { success: false, error: 'Cannot delete the last administrator' };
                }
            }
            
            UsersDB.delete(id);
            
            return { success: true };
        } catch (error) {
            console.error('Delete user error:', error);
            return { success: false, error: 'Failed to delete user' };
        }
    });
    
    // Search users
    ipcMain.handle('users:search', async (event, query) => {
        try {
            if (!checkPermission('user_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const users = UsersDB.search(query).map(sanitizeUser);
            return { success: true, users };
        } catch (error) {
            console.error('Search users error:', error);
            return { success: false, error: 'Failed to search users' };
        }
    });
    
    // Get users by role
    ipcMain.handle('users:getByRole', async (event, roleId) => {
        try {
            if (!checkPermission('user_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const users = UsersDB.getByRole(roleId).map(sanitizeUser);
            return { success: true, users };
        } catch (error) {
            console.error('Get users by role error:', error);
            return { success: false, error: 'Failed to retrieve users' };
        }
    });
    
    // Get user statistics
    ipcMain.handle('users:getStatistics', async () => {
        try {
            if (!checkPermission('user_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const stats = generateStatistics();
            return { success: true, statistics: stats };
        } catch (error) {
            console.error('Get statistics error:', error);
            return { success: false, error: 'Failed to get statistics' };
        }
    });
    
    // Export users
    ipcMain.handle('users:export', async (event, format) => {
        try {
            if (!checkPermission('user_export')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const data = exportUsers(format);
            if (!data) {
                return { success: false, error: 'Invalid export format' };
            }
            
            return { success: true, data, format };
        } catch (error) {
            console.error('Export users error:', error);
            return { success: false, error: 'Failed to export users' };
        }
    });
    
    // Import users
    ipcMain.handle('users:import', async (event, importData) => {
        try {
            if (!checkPermission('user_import')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const { data, format } = importData;
            let users = [];
            
            if (format === 'json') {
                users = JSON.parse(data);
            } else {
                return { success: false, error: 'Invalid import format' };
            }
            
            let imported = 0;
            let failed = 0;
            const errors = [];
            
            for (const userData of users) {
                try {
                    // Check for required fields
                    if (!userData.username || !userData.email || !userData.firstName || !userData.lastName) {
                        failed++;
                        errors.push(`Invalid data for user: ${userData.username || 'unknown'}`);
                        continue;
                    }
                    
                    // Skip if username or email exists
                    if (UsersDB.getByUsername(userData.username) || UsersDB.getByEmail(userData.email)) {
                        failed++;
                        errors.push(`User already exists: ${userData.username}`);
                        continue;
                    }
                    
                    const hashedPassword = await bcrypt.hash(userData.password || 'Temp123!', 10);
                    
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
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        lastLogin: null
                    };
                    
                    UsersDB.create(newUser);
                    imported++;
                } catch (err) {
                    failed++;
                    errors.push(`Failed to import: ${userData.username}`);
                }
            }
            
            return { success: true, imported, failed, errors };
        } catch (error) {
            console.error('Import users error:', error);
            return { success: false, error: 'Failed to import users' };
        }
    });
}

module.exports = { registerUserHandlers };
