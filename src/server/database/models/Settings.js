/**
 * Settings Model
 * Database operations for application settings
 */

const { getDatabase } = require('../sqlite');

const SettingsModel = {
    /**
     * Gets all settings as an object
     */
    getAll() {
        const db = getDatabase();
        const rows = db.prepare('SELECT key, value, encrypted FROM settings').all();
        
        const settings = {};
        for (const row of rows) {
            // Build nested object from dot notation keys
            const keys = row.key.split('.');
            let obj = settings;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) obj[keys[i]] = {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = row.value;
        }
        
        return settings;
    },

    /**
     * Gets a specific setting by key (dot notation)
     */
    get(key) {
        const db = getDatabase();
        const row = db.prepare('SELECT value, encrypted FROM settings WHERE key = ?').get(key);
        return row ? row.value : null;
    },

    /**
     * Sets a setting value
     */
    set(key, value, encrypted = false) {
        const db = getDatabase();
        const now = new Date().toISOString();
        
        db.prepare(`
            INSERT INTO settings (key, value, encrypted, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, encrypted = ?, updated_at = ?
        `).run(key, value, encrypted ? 1 : 0, now, value, encrypted ? 1 : 0, now);

        return true;
    },

    /**
     * Sets multiple settings at once
     */
    setMany(settings) {
        const db = getDatabase();
        const now = new Date().toISOString();

        const transaction = db.transaction(() => {
            const stmt = db.prepare(`
                INSERT INTO settings (key, value, encrypted, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = ?, encrypted = ?, updated_at = ?
            `);

            for (const [key, value] of Object.entries(settings)) {
                const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
                stmt.run(key, val, 0, now, val, 0, now);
            }
        });

        transaction();
        return true;
    },

    /**
     * Deletes a setting
     */
    delete(key) {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM settings WHERE key = ?').run(key);
        return result.changes > 0;
    },

    /**
     * Gets settings by prefix
     */
    getByPrefix(prefix) {
        const db = getDatabase();
        const rows = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?').all(`${prefix}%`);
        
        const settings = {};
        for (const row of rows) {
            const shortKey = row.key.replace(`${prefix}.`, '');
            settings[shortKey] = row.value;
        }
        
        return settings;
    }
};

module.exports = SettingsModel;
