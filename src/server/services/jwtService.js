/**
 * JWT Service
 * Handles JWT token generation and verification
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { UserSystem, RoleSystem, TokenSystem } = require('../database');

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

function getJwtSecret() {
    if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
    }
    console.warn('WARNING: JWT_SECRET not set. Using development secret.');
    return 'dev-secret-change-in-production-' + require('os').hostname();
}

const JWT_SECRET = getJwtSecret();

const JwtService = {
    /**
     * Generates access and refresh tokens for a user
     */
    generateTokens(user, userAgent = null, ipAddress = null) {
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

        const refreshToken = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY).toISOString();

        TokenSystem.create(user.id, refreshToken, expiresAt);

        return {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60,
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
        const storedToken = TokenSystem.findByToken(refreshToken);
        if (!storedToken) {
            return { success: false, error: 'Invalid or expired refresh token' };
        }

        const user = UserSystem.getById(storedToken.user_id);
        if (!user || !user.is_active) {
            TokenSystem.revoke(refreshToken);
            return { success: false, error: 'User not found or inactive' };
        }

        TokenSystem.revoke(refreshToken);
        const tokens = this.generateTokens(user, userAgent, ipAddress);

        return { success: true, ...tokens };
    },

    /**
     * Revokes a refresh token
     */
    revokeToken(refreshToken) {
        return TokenSystem.revoke(refreshToken);
    },

    /**
     * Revokes all tokens for a user
     */
    revokeAllUserTokens(userId) {
        return TokenSystem.revokeAllForUser(userId);
    },

    /**
     * Gets user data for token payload
     */
    getUserForToken(userId) {
        const user = UserSystem.getById(userId);
        if (!user) return null;

        const role = RoleSystem.getById(user.role_id);
        const permissions = role ? role.permissions : [];

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
     * Decodes token without verification
     */
    decodeToken(token) {
        return jwt.decode(token);
    },

    /**
     * Cleans up expired tokens
     */
    cleanup() {
        return TokenSystem.cleanup();
    }
};

module.exports = JwtService;
