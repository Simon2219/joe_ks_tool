/**
 * JWT Service
 * Handles JWT token generation and verification
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { RefreshTokenModel, UserModel, RoleModel } = require('../database');

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;  // 7 days in ms

/**
 * Gets JWT secret from environment or generates one
 */
function getJwtSecret() {
    if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
    }
    
    // For development, use a consistent secret
    // In production, this should always be set via environment variable
    console.warn('WARNING: JWT_SECRET not set. Using development secret.');
    return 'dev-secret-change-in-production-' + require('os').hostname();
}

const JWT_SECRET = getJwtSecret();
const REFRESH_SECRET = JWT_SECRET + '-refresh';

const JwtService = {
    /**
     * Generates access and refresh tokens for a user
     */
    generateTokens(user, userAgent = null, ipAddress = null) {
        // Generate access token
        const accessToken = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                roleId: user.role_id,
                isAdmin: !!user.is_admin
            },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        // Generate refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY).toISOString();

        // Store refresh token in database
        RefreshTokenModel.create(user.id, refreshToken, expiresAt, userAgent, ipAddress);

        return {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
            tokenType: 'Bearer'
        };
    },

    /**
     * Verifies an access token
     */
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    },

    /**
     * Refreshes tokens using a refresh token
     */
    async refreshTokens(refreshToken, userAgent = null, ipAddress = null) {
        // Find the refresh token in database
        const storedToken = RefreshTokenModel.findByToken(refreshToken);
        if (!storedToken) {
            return { success: false, error: 'Invalid or expired refresh token' };
        }

        // Get the user
        const user = UserModel.getById(storedToken.user_id);
        if (!user || !user.is_active) {
            RefreshTokenModel.revoke(refreshToken);
            return { success: false, error: 'User not found or inactive' };
        }

        // Revoke the old refresh token
        RefreshTokenModel.revoke(refreshToken);

        // Generate new tokens
        const tokens = this.generateTokens(user, userAgent, ipAddress);

        return {
            success: true,
            ...tokens
        };
    },

    /**
     * Revokes a refresh token (logout)
     */
    revokeToken(refreshToken) {
        return RefreshTokenModel.revoke(refreshToken);
    },

    /**
     * Revokes all tokens for a user (logout all devices)
     */
    revokeAllUserTokens(userId) {
        return RefreshTokenModel.revokeAllForUser(userId);
    },

    /**
     * Gets user data for token payload
     */
    getUserForToken(userId) {
        const user = UserModel.getById(userId);
        if (!user) return null;

        const role = RoleModel.getById(user.role_id);
        const permissions = role ? RoleModel.getRolePermissions(role.id) : [];

        // Remove sensitive data
        const { password, ...safeUser } = user;

        return {
            ...safeUser,
            role: role ? {
                id: role.id,
                name: role.name,
                isAdmin: !!role.is_admin,
                permissions
            } : null
        };
    },

    /**
     * Decodes token without verification (for debugging)
     */
    decodeToken(token) {
        return jwt.decode(token);
    },

    /**
     * Cleans up expired tokens
     */
    cleanup() {
        return RefreshTokenModel.cleanupExpired();
    }
};

module.exports = JwtService;
