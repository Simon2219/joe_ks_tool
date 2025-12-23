/**
 * Authentication Middleware
 * Handles session validation for API requests
 */

const { SessionsDB, UsersDB, RolesDB } = require('../database/dbService');

// In-memory session store (for simplicity)
const sessions = new Map();

/**
 * Creates a new session
 */
function createSession(user) {
    const token = require('uuid').v4();
    const session = {
        token,
        userId: user.id,
        user: sanitizeUser(user),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    sessions.set(token, session);
    return session;
}

/**
 * Gets a session by token
 */
function getSession(token) {
    const session = sessions.get(token);
    if (!session) return null;
    if (new Date() > session.expiresAt) {
        sessions.delete(token);
        return null;
    }
    return session;
}

/**
 * Deletes a session
 */
function deleteSession(token) {
    sessions.delete(token);
}

/**
 * Sanitizes user data (removes password)
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
 * Authentication middleware
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const session = getSession(token);

    if (!session) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    // Refresh user data
    const user = UsersDB.getById(session.userId);
    if (!user || !user.isActive) {
        deleteSession(token);
        return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    session.user = sanitizeUser(user);
    req.session = session;
    req.user = session.user;
    next();
}

/**
 * Optional authentication (doesn't fail if no token)
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const session = getSession(token);
        if (session) {
            req.session = session;
            req.user = session.user;
        }
    }
    next();
}

/**
 * Permission check middleware factory
 */
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        if (req.user.role?.isAdmin) {
            return next();
        }

        if (!req.user.role?.permissions?.includes(permission)) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        next();
    };
}

/**
 * Check if user has permission
 */
function hasPermission(user, permission) {
    if (!user || !user.role) return false;
    if (user.role.isAdmin) return true;
    return user.role.permissions?.includes(permission) || false;
}

module.exports = {
    createSession,
    getSession,
    deleteSession,
    sanitizeUser,
    authenticate,
    optionalAuth,
    requirePermission,
    hasPermission
};
