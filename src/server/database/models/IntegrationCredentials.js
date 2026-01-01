/**
 * IntegrationCredentials Model
 * Database operations for integration credentials (SharePoint, JIRA, etc.)
 */

const { getDatabase } = require('../sqlite');
const { v4: uuidv4 } = require('uuid');

const IntegrationCredentialsModel = {
    /**
     * Gets credentials for an integration type
     */
    get(integrationType) {
        const db = getDatabase();
        return db.prepare(`
            SELECT * FROM integration_credentials WHERE integration_type = ?
        `).get(integrationType);
    },

    /**
     * Gets all integration credentials (without decrypted values)
     */
    getAll() {
        const db = getDatabase();
        return db.prepare(`
            SELECT integration_type, encrypted, is_connected, last_connected, created_at, updated_at
            FROM integration_credentials
        `).all();
    },

    /**
     * Saves or updates credentials for an integration
     */
    save(integrationType, credentials, encrypted = false) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const existing = this.get(integrationType);

        if (existing) {
            db.prepare(`
                UPDATE integration_credentials 
                SET credentials = ?, encrypted = ?, updated_at = ?
                WHERE integration_type = ?
            `).run(
                typeof credentials === 'string' ? credentials : JSON.stringify(credentials),
                encrypted ? 1 : 0,
                now,
                integrationType
            );
        } else {
            db.prepare(`
                INSERT INTO integration_credentials 
                (id, integration_type, credentials, encrypted, is_connected, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(),
                integrationType,
                typeof credentials === 'string' ? credentials : JSON.stringify(credentials),
                encrypted ? 1 : 0,
                0,
                now,
                now
            );
        }

        return true;
    },

    /**
     * Updates connection status
     */
    setConnectionStatus(integrationType, isConnected) {
        const db = getDatabase();
        const now = new Date().toISOString();

        const updates = isConnected 
            ? { is_connected: 1, last_connected: now, updated_at: now }
            : { is_connected: 0, updated_at: now };

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), integrationType];

        db.prepare(`
            UPDATE integration_credentials SET ${fields} WHERE integration_type = ?
        `).run(...values);

        return true;
    },

    /**
     * Deletes credentials for an integration
     */
    delete(integrationType) {
        const db = getDatabase();
        const result = db.prepare(`
            DELETE FROM integration_credentials WHERE integration_type = ?
        `).run(integrationType);
        return result.changes > 0;
    },

    /**
     * Checks if an integration has credentials
     */
    hasCredentials(integrationType) {
        const db = getDatabase();
        const row = db.prepare(`
            SELECT 1 FROM integration_credentials WHERE integration_type = ?
        `).get(integrationType);
        return !!row;
    }
};

module.exports = IntegrationCredentialsModel;
