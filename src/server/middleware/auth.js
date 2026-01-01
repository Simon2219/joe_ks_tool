/**
 * Authentication Middleware
 * Handles JWT-based authentication and authorization
 * Configuration controlled via config/default.json or config/local.json
 */

const Config = require('../../../config/Config');
const JwtService = require('../services/jwtService');

/**
 * Authentication middleware
 * Verifies JWT access token and attaches user to request
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            error: 'No token provided',
            code: 'NO_TOKEN'
        });
    }

    const token = authHeader.substring(7);
    const payload = JwtService.verifyAccessToken(token);

    if (!payload) {
        return res.status(401).json({ 
            success: false, 
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }

    const user = JwtService.getUserForToken(payload.userId);
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            error: 'User not found',
            code: 'USER_NOT_FOUND'
        });
    }

    if (!user.is_active) {
        return res.status(401).json({ 
            success: false, 
            error: 'User account is deactivated',
            code: 'USER_INACTIVE'
        });
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
}

/**
 * Optional authentication middleware
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = JwtService.verifyAccessToken(token);
        
        if (payload) {
            const user = JwtService.getUserForToken(payload.userId);
            if (user && user.is_active) {
                req.user = user;
                req.tokenPayload = payload;
            }
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
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        if (req.user.role?.isAdmin) {
            return next();
        }

        if (!req.user.role?.permissions?.includes(permission)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Permission denied',
                code: 'PERMISSION_DENIED',
                required: permission
            });
        }

        next();
    };
}

/**
 * Require admin access middleware
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    if (!req.user.role?.isAdmin) {
        return res.status(403).json({ 
            success: false, 
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED'
        });
    }

    next();
}

/**
 * Checks if user has a specific permission
 */
function hasPermission(user, permission) {
    if (!user || !user.role) return false;
    if (user.role.isAdmin) return true;
    return user.role.permissions?.includes(permission) || false;
}

/**
 * Checks if user can access a specific resource
 */
function canAccessResource(user, resource, resourceUserId) {
    if (!user || !user.role) return false;
    if (user.role.isAdmin) return true;
    
    const viewAllPermissions = {
        ticket: 'ticket_view_all',
        quality: 'quality_view_all'
    };
    
    if (viewAllPermissions[resource] && hasPermission(user, viewAllPermissions[resource])) {
        return true;
    }
    
    return user.id === resourceUserId;
}

// Rate limiting using config values
const rateLimitState = new Map();

function rateLimit(maxRequests, windowMs) {
    // Use config defaults if not specified
    const max = maxRequests || Config.get('security.rateLimitMaxRequests', 100);
    const window = windowMs || Config.get('security.rateLimitWindowMs', 60000);
    
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        
        let state = rateLimitState.get(key);
        
        if (!state || now > state.resetTime) {
            state = { count: 1, resetTime: now + window };
            rateLimitState.set(key, state);
        } else {
            state.count++;
        }
        
        if (state.count > max) {
            return res.status(429).json({
                success: false,
                error: 'Too many requests',
                code: 'RATE_LIMITED',
                retryAfter: Math.ceil((state.resetTime - now) / 1000)
            });
        }
        
        next();
    };
}

// Login rate limiting using config
const loginRateLimit = rateLimit(
    Config.get('security.loginRateLimitMaxAttempts', 5),
    Config.get('security.loginRateLimitWindowMs', 60000)
);

module.exports = {
    authenticate,
    optionalAuth,
    requirePermission,
    requireAdmin,
    hasPermission,
    canAccessResource,
    rateLimit,
    loginRateLimit
};
