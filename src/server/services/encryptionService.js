/**
 * Encryption Service
 * Handles encryption/decryption of sensitive data (integration credentials)
 * Uses AES-256-GCM for authenticated encryption
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Path to store auto-generated encryption key
const DATA_DIR = path.join(__dirname, '../../../data');
const KEY_FILE = path.join(DATA_DIR, '.encryption-key');

class EncryptionService {
    constructor() {
        this.key = null;
        this.enabled = false;
    }

    /**
     * Initializes the encryption service
     * - If ENCRYPTION_KEY env var is set, use it
     * - If .encryption-key file exists, use it
     * - Otherwise, generate a new key and save it
     * - If ENCRYPTION_DISABLED is set, skip encryption
     */
    initialize() {
        // Check if encryption is explicitly disabled
        if (process.env.ENCRYPTION_DISABLED === 'true') {
            console.log('Encryption: DISABLED (ENCRYPTION_DISABLED=true)');
            this.enabled = false;
            return;
        }

        try {
            // Priority 1: Environment variable
            if (process.env.ENCRYPTION_KEY) {
                const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
                if (keyBuffer.length !== KEY_LENGTH) {
                    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
                }
                this.key = keyBuffer;
                this.enabled = true;
                console.log('Encryption: ENABLED (using ENCRYPTION_KEY from environment)');
                return;
            }

            // Priority 2: Key file
            if (fs.existsSync(KEY_FILE)) {
                const keyHex = fs.readFileSync(KEY_FILE, 'utf8').trim();
                this.key = Buffer.from(keyHex, 'hex');
                this.enabled = true;
                console.log('Encryption: ENABLED (using stored key)');
                return;
            }

            // Priority 3: Generate new key
            this.key = crypto.randomBytes(KEY_LENGTH);
            
            // Ensure data directory exists
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }

            // Save the key
            fs.writeFileSync(KEY_FILE, this.key.toString('hex'), { mode: 0o600 });
            this.enabled = true;
            console.log('Encryption: ENABLED (new key generated and saved)');
            console.log(`  Key file: ${KEY_FILE}`);

        } catch (error) {
            console.error('Encryption initialization failed:', error.message);
            console.log('Encryption: DISABLED (initialization failed)');
            this.enabled = false;
        }
    }

    /**
     * Checks if encryption is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Encrypts a string or object
     * Returns base64 encoded string with format: iv:authTag:ciphertext
     */
    encrypt(data) {
        if (!this.enabled) {
            // Return data as-is if encryption is disabled
            return typeof data === 'string' ? data : JSON.stringify(data);
        }

        const text = typeof data === 'string' ? data : JSON.stringify(data);
        
        // Generate random IV
        const iv = crypto.randomBytes(IV_LENGTH);
        
        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
        
        // Encrypt
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        // Get auth tag
        const authTag = cipher.getAuthTag();
        
        // Combine iv:authTag:ciphertext
        return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    }

    /**
     * Decrypts an encrypted string
     * Expects format: iv:authTag:ciphertext (base64 encoded)
     */
    decrypt(encryptedData) {
        if (!this.enabled) {
            // Try to parse as JSON, otherwise return as-is
            try {
                return JSON.parse(encryptedData);
            } catch {
                return encryptedData;
            }
        }

        try {
            // Split the encrypted data
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                // Not encrypted data, return as-is
                try {
                    return JSON.parse(encryptedData);
                } catch {
                    return encryptedData;
                }
            }

            const iv = Buffer.from(parts[0], 'base64');
            const authTag = Buffer.from(parts[1], 'base64');
            const encrypted = parts[2];

            // Create decipher
            const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
            decipher.setAuthTag(authTag);

            // Decrypt
            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            // Try to parse as JSON
            try {
                return JSON.parse(decrypted);
            } catch {
                return decrypted;
            }

        } catch (error) {
            console.error('Decryption failed:', error.message);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Re-encrypts data (useful when rotating keys)
     */
    reEncrypt(encryptedData, oldKey) {
        // Decrypt with old key
        const tempKey = this.key;
        this.key = oldKey;
        const decrypted = this.decrypt(encryptedData);
        
        // Re-encrypt with new key
        this.key = tempKey;
        return this.encrypt(decrypted);
    }

    /**
     * Generates a new encryption key (for key rotation)
     */
    static generateKey() {
        return crypto.randomBytes(KEY_LENGTH).toString('hex');
    }

    /**
     * Gets the current key (hex encoded) - for backup purposes
     */
    getKeyHex() {
        if (!this.enabled || !this.key) return null;
        return this.key.toString('hex');
    }
}

// Export singleton instance
const encryptionService = new EncryptionService();

module.exports = encryptionService;
