/**
 * Settings Routes
 * System settings and configuration
 */

const express = require('express');
const router = express.Router();

const { SettingsModel, IntegrationCredentialsModel } = require('../database');
const encryptionService = require('../services/encryptionService');
const { authenticate, requirePermission, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/settings
 * Returns all settings
 */
router.get('/', authenticate, requirePermission('settings_view'), (req, res) => {
    try {
        const settings = SettingsModel.getAll();
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, error: 'Failed to get settings' });
    }
});

/**
 * GET /api/settings/:key
 * Returns a specific setting
 */
router.get('/:key', authenticate, requirePermission('settings_view'), (req, res) => {
    try {
        const value = SettingsModel.get(req.params.key);
        res.json({ success: true, value });
    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ success: false, error: 'Failed to get setting' });
    }
});

/**
 * PUT /api/settings/:key
 * Updates a setting
 */
router.put('/:key', authenticate, requirePermission('settings_edit'), (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        SettingsModel.set(key, value);
        res.json({ success: true });
    } catch (error) {
        console.error('Set setting error:', error);
        res.status(500).json({ success: false, error: 'Failed to update setting' });
    }
});

/**
 * PUT /api/settings
 * Updates multiple settings
 */
router.put('/', authenticate, requirePermission('settings_edit'), (req, res) => {
    try {
        const settings = req.body;
        SettingsModel.setMany(settings);
        res.json({ success: true });
    } catch (error) {
        console.error('Set settings error:', error);
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
});

// ==========================================
// INTEGRATION CREDENTIALS (Admin Only)
// ==========================================

/**
 * GET /api/settings/integrations/status
 * Returns status of all integrations
 */
router.get('/integrations/status', authenticate, requireAdmin, (req, res) => {
    try {
        const credentials = IntegrationCredentialsModel.getAll();
        
        const status = {
            sharepoint: {
                configured: credentials.some(c => c.integration_type === 'sharepoint'),
                connected: credentials.find(c => c.integration_type === 'sharepoint')?.is_connected || false
            },
            jira: {
                configured: credentials.some(c => c.integration_type === 'jira'),
                connected: credentials.find(c => c.integration_type === 'jira')?.is_connected || false
            },
            encryptionEnabled: encryptionService.isEnabled()
        };

        res.json({ success: true, status });
    } catch (error) {
        console.error('Get integration status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get status' });
    }
});

/**
 * POST /api/settings/integrations/sharepoint
 * Saves SharePoint credentials
 */
router.post('/integrations/sharepoint', authenticate, requireAdmin, (req, res) => {
    try {
        const { siteUrl, tenantId, clientId, clientSecret } = req.body;

        if (!siteUrl || !tenantId || !clientId || !clientSecret) {
            return res.status(400).json({ 
                success: false, 
                error: 'All SharePoint credentials are required' 
            });
        }

        const credentials = { siteUrl, tenantId, clientId, clientSecret };
        
        // Encrypt if encryption is enabled
        const isEncrypted = encryptionService.isEnabled();
        const credentialsToStore = isEncrypted 
            ? encryptionService.encrypt(credentials)
            : JSON.stringify(credentials);

        IntegrationCredentialsModel.save('sharepoint', credentialsToStore, isEncrypted);

        res.json({ 
            success: true, 
            message: 'SharePoint credentials saved',
            encrypted: isEncrypted
        });
    } catch (error) {
        console.error('Save SharePoint credentials error:', error);
        res.status(500).json({ success: false, error: 'Failed to save credentials' });
    }
});

/**
 * POST /api/settings/integrations/jira
 * Saves JIRA credentials
 */
router.post('/integrations/jira', authenticate, requireAdmin, (req, res) => {
    try {
        const { baseUrl, email, apiToken } = req.body;

        if (!baseUrl || !email || !apiToken) {
            return res.status(400).json({ 
                success: false, 
                error: 'All JIRA credentials are required' 
            });
        }

        const credentials = { baseUrl, email, apiToken };
        
        // Encrypt if encryption is enabled
        const isEncrypted = encryptionService.isEnabled();
        const credentialsToStore = isEncrypted 
            ? encryptionService.encrypt(credentials)
            : JSON.stringify(credentials);

        IntegrationCredentialsModel.save('jira', credentialsToStore, isEncrypted);

        res.json({ 
            success: true, 
            message: 'JIRA credentials saved',
            encrypted: isEncrypted
        });
    } catch (error) {
        console.error('Save JIRA credentials error:', error);
        res.status(500).json({ success: false, error: 'Failed to save credentials' });
    }
});

/**
 * DELETE /api/settings/integrations/:type
 * Deletes integration credentials
 */
router.delete('/integrations/:type', authenticate, requireAdmin, (req, res) => {
    try {
        const { type } = req.params;
        
        if (!['sharepoint', 'jira'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid integration type' });
        }

        IntegrationCredentialsModel.delete(type);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete credentials error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete credentials' });
    }
});

/**
 * Helper to get decrypted credentials
 */
function getDecryptedCredentials(integrationType) {
    const record = IntegrationCredentialsModel.get(integrationType);
    if (!record) return null;

    try {
        if (record.encrypted) {
            return encryptionService.decrypt(record.credentials);
        }
        return JSON.parse(record.credentials);
    } catch (error) {
        console.error(`Failed to decrypt ${integrationType} credentials:`, error);
        return null;
    }
}

// Export helper for use in integration routes
module.exports = router;
module.exports.getDecryptedCredentials = getDecryptedCredentials;
