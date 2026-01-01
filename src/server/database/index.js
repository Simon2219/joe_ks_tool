/**
 * Database - Entry Point
 * Exports the consolidated database systems
 */

const Database = require('./Database');

async function initializeDatabase() {
    await Database.initDb();
    Database.initSchema();
    await Database.seedData();
    console.log('Database initialization complete');
}

function shutdown() {
    Database.closeDb();
    console.log('Database connection closed');
}

module.exports = {
    initializeDatabase,
    shutdown,
    ...Database
};
