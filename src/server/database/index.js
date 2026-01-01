/**
 * Database Module
 * Main entry point for database operations
 */

const { initializeSchema, closeDatabase, getDatabase, DB_PATH, DATA_DIR } = require('./sqlite');
const { seedDatabase } = require('./seed');
const models = require('./models');

/**
 * Initializes the database
 */
async function initializeDatabase() {
    console.log('Initializing database...');
    console.log(`  Database path: ${DB_PATH}`);
    
    // Initialize schema
    initializeSchema();
    
    // Seed default data
    await seedDatabase();
    
    console.log('Database initialization complete!');
    return true;
}

/**
 * Graceful shutdown
 */
function shutdown() {
    console.log('Closing database connection...');
    closeDatabase();
}

module.exports = {
    initializeDatabase,
    shutdown,
    getDatabase,
    DB_PATH,
    DATA_DIR,
    ...models
};
