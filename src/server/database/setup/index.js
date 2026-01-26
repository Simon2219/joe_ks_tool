/**
 * Database Setup Module
 * Exports all setup-related functionality
 * Only used during database initialization, not at runtime
 */

const { createTables, createIndexes } = require('./schema');
const { runMigrations } = require('./migrations');
const { getPermissions, ensurePermissions, seedData } = require('./seed');

module.exports = {
    // Schema
    createTables,
    createIndexes,
    
    // Migrations
    runMigrations,
    
    // Seeding
    getPermissions,
    ensurePermissions,
    seedData
};
