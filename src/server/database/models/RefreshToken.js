/**
 * RefreshToken Model
 * Database operations for JWT refresh tokens
 */

const { getDatabase } = require('../sqlite');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const RefreshTokenModel = {
    /**
     * Creates a new refresh token
     */
    create(userId, token, expiresAt, userAgent = null, ipAddress = null) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const id = uuidv4();
        
        // Hash the token for storage
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        db.prepare(`
            INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, user_agent, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, userId, tokenHash, expiresAt, now, userAgent, ipAddress);

        return {
            id,
            userId,
            token,
            expiresAt,
            createdAt: now
        };
    },

    /**
     * Finds a refresh token by its value
     */
    findByToken(token) {
        const db = getDatabase();
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        return db.prepare(`
            SELECT * FROM refresh_tokens 
            WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime('now')
        `).get(tokenHash);
    },

    /**
     * Revokes a refresh token
     */
    revoke(token) {
        const db = getDatabase();
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const now = new Date().toISOString();

        const result = db.prepare(`
            UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE token_hash = ?
        `).run(now, tokenHash);

        return result.changes > 0;
    },

    /**
     * Revokes all refresh tokens for a user
     */
    revokeAllForUser(userId) {
        const db = getDatabase();
        const now = new Date().toISOString();

        const result = db.prepare(`
            UPDATE refresh_tokens SET revoked = 1, revoked_at = ? WHERE user_id = ? AND revoked = 0
        `).run(now, userId);

        return result.changes;
    },

    /**
     * Gets all active tokens for a user
     */
    getActiveByUser(userId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT id, user_id, expires_at, created_at, user_agent, ip_address
            FROM refresh_tokens 
            WHERE user_id = ? AND revoked = 0 AND expires_at > datetime('now')
            ORDER BY created_at DESC
        `).all(userId);
    },

    /**
     * Cleans up expired tokens
     */
    cleanupExpired() {
        const db = getDatabase();
        const result = db.prepare(`
            DELETE FROM refresh_tokens WHERE expires_at < datetime('now') OR revoked = 1
        `).run();

        return result.changes;
    },

    /**
     * Counts active sessions for a user
     */
    countActiveForUser(userId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT COUNT(*) as count FROM refresh_tokens 
            WHERE user_id = ? AND revoked = 0 AND expires_at > datetime('now')
        `).get(userId).count;
    }
};

module.exports = RefreshTokenModel;
