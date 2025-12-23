/**
 * Authentication IPC Handlers
 * Handles login, logout, session management, and password changes
 */

const { ipcMain } = require('electron');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { UsersDB, SessionsDB, RolesDB } = require('../database/dbService');

// In-memory current session (for this instance)
let currentSession = null;

/**
 * Validates user credentials
 */
async function validateCredentials(username, password) {
    const user = UsersDB.getByUsername(username);
    if (!user) {
        return { success: false, error: 'Invalid username or password' };
    }
    
    if (!user.isActive) {
        return { success: false, error: 'Account is deactivated' };
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        return { success: false, error: 'Invalid username or password' };
    }
    
    return { success: true, user };
}

/**
 * Creates a new session for the user
 */
function createSession(user) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const session = {
        id: uuidv4(),
        token,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
    };
    
    SessionsDB.create(session);
    return session;
}

/**
 * Gets user data without sensitive information
 */
function sanitizeUser(user) {
    const { password, ...safeUser } = user;
    const role = RolesDB.getById(user.roleId);
    return {
        ...safeUser,
        role: role ? {
            id: role.id,
            name: role.name,
            isAdmin: role.isAdmin,
            permissions: role.permissions
        } : null
    };
}

/**
 * Checks if user has a specific permission
 */
function hasPermission(user, permission) {
    if (!user || !user.role) return false;
    if (user.role.isAdmin) return true;
    return user.role.permissions.includes(permission);
}

/**
 * Registers authentication IPC handlers
 */
function registerAuthHandlers() {
    // Login handler
    ipcMain.handle('auth:login', async (event, credentials) => {
        try {
            const { username, password } = credentials;
            
            if (!username || !password) {
                return { success: false, error: 'Username and password are required' };
            }
            
            const result = await validateCredentials(username, password);
            if (!result.success) {
                return result;
            }
            
            // Update last login
            UsersDB.update(result.user.id, { lastLogin: new Date().toISOString() });
            
            // Create session
            const session = createSession(result.user);
            currentSession = {
                ...session,
                user: sanitizeUser(result.user)
            };
            
            return {
                success: true,
                user: currentSession.user,
                token: session.token
            };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'An error occurred during login' };
        }
    });
    
    // Logout handler
    ipcMain.handle('auth:logout', async () => {
        try {
            if (currentSession) {
                SessionsDB.delete(currentSession.token);
                currentSession = null;
            }
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: 'An error occurred during logout' };
        }
    });
    
    // Get current user handler
    ipcMain.handle('auth:getCurrentUser', async () => {
        try {
            if (!currentSession) {
                return { success: false, user: null };
            }
            
            // Refresh user data
            const user = UsersDB.getById(currentSession.user.id);
            if (!user) {
                currentSession = null;
                return { success: false, user: null };
            }
            
            currentSession.user = sanitizeUser(user);
            return { success: true, user: currentSession.user };
        } catch (error) {
            console.error('Get current user error:', error);
            return { success: false, user: null };
        }
    });
    
    // Change password handler
    ipcMain.handle('auth:changePassword', async (event, data) => {
        try {
            if (!currentSession) {
                return { success: false, error: 'Not authenticated' };
            }
            
            const { currentPassword, newPassword } = data;
            
            if (!currentPassword || !newPassword) {
                return { success: false, error: 'Current and new passwords are required' };
            }
            
            if (newPassword.length < 8) {
                return { success: false, error: 'New password must be at least 8 characters' };
            }
            
            const user = UsersDB.getById(currentSession.user.id);
            const isValid = await bcrypt.compare(currentPassword, user.password);
            
            if (!isValid) {
                return { success: false, error: 'Current password is incorrect' };
            }
            
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            UsersDB.update(user.id, { password: hashedPassword });
            
            return { success: true };
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, error: 'An error occurred while changing password' };
        }
    });
    
    // Validate session handler
    ipcMain.handle('auth:validateSession', async () => {
        try {
            if (!currentSession) {
                return { valid: false };
            }
            
            const session = SessionsDB.getByToken(currentSession.token);
            if (!session || new Date(session.expiresAt) < new Date()) {
                currentSession = null;
                return { valid: false };
            }
            
            return { valid: true, user: currentSession.user };
        } catch (error) {
            console.error('Validate session error:', error);
            return { valid: false };
        }
    });
}

/**
 * Gets the current session (for use by other handlers)
 */
function getCurrentSession() {
    return currentSession;
}

/**
 * Checks if the current user has a permission
 */
function checkPermission(permission) {
    if (!currentSession || !currentSession.user) return false;
    return hasPermission(currentSession.user, permission);
}

module.exports = {
    registerAuthHandlers,
    getCurrentSession,
    checkPermission,
    hasPermission
};
