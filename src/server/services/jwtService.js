/**
 * JWT Service
 * Handles JWT token generation and verification
 * Configuration controlled via config/default.json or config/local.json
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Config = require('../../../config/Config');
const { UserSystem, RoleSystem, TokenSystem } = require('../database');

const JwtService = {
    /**
     * Get JWT secret from config
     */
    getSecret() {
        return Config.getJwtSecret();
    },

    /**
     * Get access token expiry from config
     */
    getAccessExpiry() {
        return Config.get('security.jwtAccessTokenExpiry', '15m');
    },

    /**
     * Get refresh token expiry in milliseconds
     */
    getRefreshExpiryMs() {
        const days = Config.get('security.jwtRefreshTokenExpiryDays', 7);
        return days * 24 * 60 * 60 * 1000;
    },

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
            this.getSecret(),
            { expiresIn: this.getAccessExpiry() }
        );

        const refreshToken = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + this.getRefreshExpiryMs()).toISOString();

        TokenSystem.create(user.id, refreshToken, expiresAt);

        // Parse expiry for response
        const expiryMatch = this.getAccessExpiry().match(/(\d+)([mhd])/);
        let expiresIn = 900; // default 15 minutes
        if (expiryMatch) {
            const num = parseInt(expiryMatch[1]);
            const unit = expiryMatch[2];
            if (unit === 'm') expiresIn = num * 60;
            else if (unit === 'h') expiresIn = num * 3600;
            else if (unit === 'd') expiresIn = num * 86400;
        }

        return {
            accessToken,
            refreshToken,
            expiresIn,
            tokenType: 'Bearer'
        };
    },

    /**
     * Verifies an access token
     */
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.getSecret());
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
     * Gets user data for token payload (camelCase format for frontend)
     */
    getUserForToken(userId) {
        const user = UserSystem.getById(userId);
        if (!user) return null;

        const role = RoleSystem.getById(user.role_id);
        const permissions = role ? role.permissions : [];

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            roleId: user.role_id,
            roleName: user.role_name || (role ? role.name : ''),
            department: user.department || '',
            phone: user.phone || '',
            isActive: !!user.is_active,
            isAdmin: !!user.is_admin || (role ? !!role.is_admin : false),
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            lastLogin: user.last_login,
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
