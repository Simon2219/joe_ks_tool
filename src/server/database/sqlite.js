/**
 * SQLite Database Connection & Utilities
 * Provides connection management and query helpers
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { SCHEMA } = require('./schema');

// Database file location
const DATA_DIR = path.join(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'customer-support.db');

let db = null;

/**
 * Gets the database connection (singleton)
 */
function getDatabase() {
    if (!db) {
        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        // Create database connection
        db = new Database(DB_PATH, { 
            // verbose: console.log // Uncomment for debugging
        });

        // Enable foreign keys
        db.pragma('foreign_keys = ON');
        
        // Enable WAL mode for better concurrency
        db.pragma('journal_mode = WAL');
    }
    return db;
}

/**
 * Initializes the database schema
 */
function initializeSchema() {
    const database = getDatabase();
    database.exec(SCHEMA);
    console.log('Database schema initialized');
}

/**
 * Closes the database connection
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

/**
 * Generic query helpers
 */
const QueryHelpers = {
    /**
     * Gets all rows from a query
     */
    all(sql, params = []) {
        const database = getDatabase();
        const stmt = database.prepare(sql);
        return stmt.all(...params);
    },

    /**
     * Gets first row from a query
     */
    get(sql, params = []) {
        const database = getDatabase();
        const stmt = database.prepare(sql);
        return stmt.get(...params);
    },

    /**
     * Runs a query (INSERT, UPDATE, DELETE)
     */
    run(sql, params = []) {
        const database = getDatabase();
        const stmt = database.prepare(sql);
        return stmt.run(...params);
    },

    /**
     * Runs multiple queries in a transaction
     */
    transaction(callback) {
        const database = getDatabase();
        return database.transaction(callback)();
    }
};

module.exports = {
    getDatabase,
    initializeSchema,
    closeDatabase,
    QueryHelpers,
    DB_PATH,
    DATA_DIR
};
