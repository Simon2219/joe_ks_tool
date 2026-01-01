/**
 * Config.js
 * Centralized configuration management for all systems
 * 
 * Priority (highest to lowest):
 * 1. Environment variables (for secrets only)
 * 2. config/local.json (user overrides - gitignored)
 * 3. config/default.json (defaults)
 */

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = __dirname;
const DEFAULT_CONFIG = path.join(CONFIG_DIR, 'default.json');
const LOCAL_CONFIG = path.join(CONFIG_DIR, 'local.json');

let config = null;

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

/**
 * Load configuration from JSON files
 */
function loadConfig() {
    // Load defaults
    let defaultConfig = {};
    if (fs.existsSync(DEFAULT_CONFIG)) {
        defaultConfig = JSON.parse(fs.readFileSync(DEFAULT_CONFIG, 'utf8'));
    }

    // Load local overrides (if exists)
    let localConfig = {};
    if (fs.existsSync(LOCAL_CONFIG)) {
        try {
            localConfig = JSON.parse(fs.readFileSync(LOCAL_CONFIG, 'utf8'));
            console.log('Config: Loaded local.json overrides');
        } catch (e) {
            console.error('Config: Failed to parse local.json:', e.message);
        }
    }

    // Merge configs
    config = deepMerge(defaultConfig, localConfig);

    // Apply environment variable overrides (for secrets)
    if (process.env.PORT) config.server.port = parseInt(process.env.PORT);
    if (process.env.JWT_SECRET) config.security.jwtSecret = process.env.JWT_SECRET;
    if (process.env.CORS_ORIGIN) config.server.corsOrigin = process.env.CORS_ORIGIN;
    if (process.env.NODE_ENV === 'production') config.logging.logRequests = false;

    return config;
}

/**
 * Get the full configuration object
 */
function getConfig() {
    if (!config) loadConfig();
    return config;
}

/**
 * Get a specific configuration value by path
 * @param {string} keyPath - Dot-separated path (e.g., "security.encryptionEnabled")
 * @param {*} defaultValue - Default value if not found
 */
function get(keyPath, defaultValue = undefined) {
    if (!config) loadConfig();
    
    const keys = keyPath.split('.');
    let value = config;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return defaultValue;
        }
    }
    
    return value;
}

/**
 * Set a configuration value at runtime (does not persist)
 * @param {string} keyPath - Dot-separated path
 * @param {*} value - Value to set
 */
function set(keyPath, value) {
    if (!config) loadConfig();
    
    const keys = keyPath.split('.');
    let obj = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in obj)) obj[keys[i]] = {};
        obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
}

/**
 * Reload configuration from files
 */
function reload() {
    config = null;
    return loadConfig();
}

/**
 * Save current config to local.json (for runtime changes)
 */
function saveLocal() {
    if (!config) return false;
    
    try {
        // Only save differences from default
        const defaultConfig = JSON.parse(fs.readFileSync(DEFAULT_CONFIG, 'utf8'));
        const diff = getDiff(defaultConfig, config);
        
        fs.writeFileSync(LOCAL_CONFIG, JSON.stringify(diff, null, 2));
        return true;
    } catch (e) {
        console.error('Config: Failed to save local.json:', e.message);
        return false;
    }
}

/**
 * Get differences between two objects
 */
function getDiff(base, current) {
    const diff = {};
    
    for (const key in current) {
        if (!(key in base)) {
            diff[key] = current[key];
        } else if (typeof current[key] === 'object' && !Array.isArray(current[key])) {
            const nestedDiff = getDiff(base[key] || {}, current[key]);
            if (Object.keys(nestedDiff).length > 0) {
                diff[key] = nestedDiff;
            }
        } else if (JSON.stringify(base[key]) !== JSON.stringify(current[key])) {
            diff[key] = current[key];
        }
    }
    
    return diff;
}

// Export configuration accessors
module.exports = {
    // Core methods
    get,
    set,
    getConfig,
    reload,
    saveLocal,
    
    // Convenience getters for common settings
    get server() { return get('server'); },
    get security() { return get('security'); },
    get database() { return get('database'); },
    get users() { return get('users'); },
    get tickets() { return get('tickets'); },
    get quality() { return get('quality'); },
    get integrations() { return get('integrations'); },
    get logging() { return get('logging'); },
    get app() { return get('app'); },
    
    // Specific helpers
    isEncryptionEnabled: () => get('security.encryptionEnabled', true),
    getJwtSecret: () => get('security.jwtSecret') || generateDevSecret(),
    getPort: () => get('server.port', 3000),
    isDevelopment: () => process.env.NODE_ENV !== 'production',
    isProduction: () => process.env.NODE_ENV === 'production'
};

/**
 * Generate a development-only secret (warns user)
 */
function generateDevSecret() {
    console.warn('WARNING: No JWT_SECRET configured. Using development secret.');
    return 'dev-secret-' + require('os').hostname();
}
