/**
 * Encryption Service
 * Handles AES-256-GCM encryption for sensitive data
 * Configuration controlled via config/default.json or config/local.json
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Config = require('../../../config/Config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const DATA_DIR = path.join(__dirname, '../../../data');
const KEY_FILE = path.join(DATA_DIR, '.encryption-key');

class EncryptionService {
    constructor() {
        this.key = null;
        this.enabled = false;
    }

    /**
     * Initialize the encryption service based on configuration
     */
    initialize() {
        // Check config setting
        if (!Config.isEncryptionEnabled()) {
            console.log('Encryption: DISABLED (config: security.encryptionEnabled = false)');
            this.enabled = false;
            return;
        }

        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        // Try to load existing key or generate new one
        if (fs.existsSync(KEY_FILE)) {
            try {
                const keyHex = fs.readFileSync(KEY_FILE, 'utf8').trim();
                this.key = Buffer.from(keyHex, 'hex');
                
                if (this.key.length !== KEY_LENGTH) {
                    throw new Error('Invalid key length');
                }
                
                this.enabled = true;
                console.log('Encryption: ENABLED (key loaded from file)');
            } catch (error) {
                console.error('Encryption: Failed to load key:', error.message);
                this.generateNewKey();
            }
        } else {
            this.generateNewKey();
        }
    }

    /**
     * Generate and save a new encryption key
     */
    generateNewKey() {
        this.key = crypto.randomBytes(KEY_LENGTH);
        
        try {
            fs.writeFileSync(KEY_FILE, this.key.toString('hex'), { mode: 0o600 });
            this.enabled = true;
            console.log('Encryption: ENABLED (new key generated)');
            console.log(`  Key file: ${KEY_FILE}`);
        } catch (error) {
            console.error('Encryption: Failed to save key:', error.message);
            this.enabled = false;
        }
    }

    /**
     * Check if encryption is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Encrypt a string
     * @param {string} plaintext - Text to encrypt
     * @returns {string} - Encrypted data as base64 string
     */
    encrypt(plaintext) {
        if (!this.enabled || !this.key) {
            throw new Error('Encryption not enabled');
        }

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
        
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        const authTag = cipher.getAuthTag();
        
        // Format: iv:authTag:encrypted (all base64)
        return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    }

    /**
     * Decrypt a string
     * @param {string} encryptedData - Encrypted data from encrypt()
     * @returns {string} - Original plaintext
     */
    decrypt(encryptedData) {
        if (!this.enabled || !this.key) {
            throw new Error('Encryption not enabled');
        }

        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(parts[0], 'base64');
        const authTag = Buffer.from(parts[1], 'base64');
        const encrypted = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Encrypt an object (serializes to JSON first)
     */
    encryptObject(obj) {
        return this.encrypt(JSON.stringify(obj));
    }

    /**
     * Decrypt to an object
     */
    decryptObject(encryptedData) {
        return JSON.parse(this.decrypt(encryptedData));
    }
}

module.exports = new EncryptionService();
