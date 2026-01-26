/**
 * File Service
 * Handles file uploads, storage, and retrieval for evidence and references
 * Designed to easily switch from local storage to a file server later
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Storage configuration
const STORAGE_TYPE = process.env.FILE_STORAGE_TYPE || 'local'; // 'local' or 'server'
const LOCAL_STORAGE_PATH = process.env.FILE_STORAGE_PATH || path.join(__dirname, '../../../uploads');
const SERVER_BASE_URL = process.env.FILE_SERVER_URL || '';

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
    ...ALLOWED_IMAGE_TYPES,
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Ensure storage directories exist
 */
function ensureStorageDirectories() {
    const dirs = [
        LOCAL_STORAGE_PATH,
        path.join(LOCAL_STORAGE_PATH, 'evidence'),
        path.join(LOCAL_STORAGE_PATH, 'references'),
        path.join(LOCAL_STORAGE_PATH, 'temp')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

/**
 * Get file extension from mimetype
 */
function getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'text/plain': '.txt',
        'text/csv': '.csv'
    };
    return mimeToExt[mimeType] || '';
}

/**
 * Check if file type is allowed
 */
function isAllowedFileType(mimeType, allowedTypes = ALLOWED_FILE_TYPES) {
    return allowedTypes.includes(mimeType);
}

/**
 * Check if file is an image
 */
function isImageFile(mimeType) {
    return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

/**
 * Generate a unique filename
 */
function generateFileName(originalName, mimeType) {
    const ext = path.extname(originalName) || getExtensionFromMimeType(mimeType);
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    return `${timestamp}-${uniqueId}${ext}`;
}

/**
 * Save file to local storage
 */
function saveFileLocal(buffer, category, fileName) {
    ensureStorageDirectories();
    
    const filePath = path.join(LOCAL_STORAGE_PATH, category, fileName);
    fs.writeFileSync(filePath, buffer);
    
    return {
        filePath: `${category}/${fileName}`,
        absolutePath: filePath
    };
}

/**
 * Save file to remote server (placeholder for future implementation)
 */
async function saveFileRemote(buffer, category, fileName) {
    // This would be implemented when switching to a file server
    // For now, throw an error indicating it's not implemented
    throw new Error('Remote file storage not yet implemented');
}

/**
 * Get file from local storage
 */
function getFileLocal(relativePath) {
    const absolutePath = path.join(LOCAL_STORAGE_PATH, relativePath);
    
    if (!fs.existsSync(absolutePath)) {
        return null;
    }
    
    return {
        buffer: fs.readFileSync(absolutePath),
        absolutePath
    };
}

/**
 * Get file from remote server (placeholder)
 */
async function getFileRemote(relativePath) {
    throw new Error('Remote file retrieval not yet implemented');
}

/**
 * Delete file from local storage
 */
function deleteFileLocal(relativePath) {
    const absolutePath = path.join(LOCAL_STORAGE_PATH, relativePath);
    
    if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        return true;
    }
    
    return false;
}

/**
 * Delete file from remote server (placeholder)
 */
async function deleteFileRemote(relativePath) {
    throw new Error('Remote file deletion not yet implemented');
}

/**
 * Get file URL for serving
 */
function getFileUrl(relativePath) {
    if (STORAGE_TYPE === 'server' && SERVER_BASE_URL) {
        return `${SERVER_BASE_URL}/${relativePath}`;
    }
    // For local storage, return a relative API path
    return `/api/files/${relativePath}`;
}

/**
 * Get file info icon based on mime type
 */
function getFileIcon(mimeType) {
    if (isImageFile(mimeType)) return 'image';
    if (mimeType === 'application/pdf') return 'file-pdf';
    if (mimeType.includes('word')) return 'file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-excel';
    if (mimeType.includes('text')) return 'file-text';
    return 'file';
}

// ============================================
// PUBLIC API
// ============================================

const FileService = {
    /**
     * Upload a file
     * @param {Buffer} buffer - File buffer
     * @param {string} originalName - Original filename
     * @param {string} mimeType - File MIME type
     * @param {string} category - Storage category ('evidence' or 'references')
     * @returns {Object} - Upload result with file info
     */
    async upload(buffer, originalName, mimeType, category = 'evidence') {
        // Validate file type
        if (!isAllowedFileType(mimeType)) {
            return {
                success: false,
                error: `File type "${mimeType}" is not allowed`
            };
        }
        
        // Validate file size
        if (buffer.length > MAX_FILE_SIZE) {
            return {
                success: false,
                error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`
            };
        }
        
        const fileName = generateFileName(originalName, mimeType);
        
        try {
            let result;
            
            if (STORAGE_TYPE === 'server') {
                result = await saveFileRemote(buffer, category, fileName);
            } else {
                result = saveFileLocal(buffer, category, fileName);
            }
            
            return {
                success: true,
                file: {
                    fileName,
                    originalName,
                    mimeType,
                    size: buffer.length,
                    filePath: result.filePath,
                    url: getFileUrl(result.filePath),
                    isImage: isImageFile(mimeType),
                    icon: getFileIcon(mimeType)
                }
            };
        } catch (error) {
            console.error('File upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Get a file
     * @param {string} relativePath - Relative file path
     * @returns {Object|null} - File data or null if not found
     */
    async get(relativePath) {
        try {
            if (STORAGE_TYPE === 'server') {
                return await getFileRemote(relativePath);
            }
            return getFileLocal(relativePath);
        } catch (error) {
            console.error('File get error:', error);
            return null;
        }
    },
    
    /**
     * Delete a file
     * @param {string} relativePath - Relative file path
     * @returns {boolean} - Success status
     */
    async delete(relativePath) {
        try {
            if (STORAGE_TYPE === 'server') {
                return await deleteFileRemote(relativePath);
            }
            return deleteFileLocal(relativePath);
        } catch (error) {
            console.error('File delete error:', error);
            return false;
        }
    },
    
    /**
     * Get file URL for serving
     * @param {string} relativePath - Relative file path
     * @returns {string} - File URL
     */
    getUrl(relativePath) {
        return getFileUrl(relativePath);
    },
    
    /**
     * Check if a file exists
     * @param {string} relativePath - Relative file path
     * @returns {boolean} - Whether file exists
     */
    exists(relativePath) {
        if (STORAGE_TYPE === 'server') {
            // Would need to implement remote check
            return false;
        }
        const absolutePath = path.join(LOCAL_STORAGE_PATH, relativePath);
        return fs.existsSync(absolutePath);
    },
    
    /**
     * Get allowed file types
     * @returns {string[]} - Array of allowed MIME types
     */
    getAllowedTypes() {
        return ALLOWED_FILE_TYPES;
    },
    
    /**
     * Get allowed image types
     * @returns {string[]} - Array of allowed image MIME types
     */
    getAllowedImageTypes() {
        return ALLOWED_IMAGE_TYPES;
    },
    
    /**
     * Get max file size
     * @returns {number} - Max file size in bytes
     */
    getMaxFileSize() {
        return MAX_FILE_SIZE;
    },
    
    /**
     * Check if file type is image
     * @param {string} mimeType - File MIME type
     * @returns {boolean}
     */
    isImage(mimeType) {
        return isImageFile(mimeType);
    },
    
    /**
     * Get storage path
     * @returns {string} - Local storage path
     */
    getStoragePath() {
        return LOCAL_STORAGE_PATH;
    },
    
    /**
     * Initialize storage (ensure directories exist)
     */
    init() {
        ensureStorageDirectories();
    }
};

module.exports = FileService;
