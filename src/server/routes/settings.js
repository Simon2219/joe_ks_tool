/**
 * Settings Routes - SettingsSystem
 * Handles application settings and integration credentials
 * Configuration controlled via config/default.json or config/local.json
 */

const express = require('express');
const router = express.Router();

const Config = require('../../../config/Config');
const { SettingsSystem, IntegrationSystem } = require('../database');
const encryptionService = require('../services/encryptionService');
const { authenticate, requirePermission, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// ============================================
// SYSTEM CONFIGURATION (from config files)
// ============================================

/**
 * GET /api/settings/config
 * Returns current system configuration
 */
router.get('/config', requireAdmin, (req, res) => {
    try {
        res.json({
            success: true,
            config: {
                server: Config.server,
                security: {
                    encryptionEnabled: Config.isEncryptionEnabled(),
                    jwtAccessTokenExpiry: Config.get('security.jwtAccessTokenExpiry'),
                    jwtRefreshTokenExpiryDays: Config.get('security.jwtRefreshTokenExpiryDays'),
                    rateLimitMaxRequests: Config.get('security.rateLimitMaxRequests'),
                    loginRateLimitMaxAttempts: Config.get('security.loginRateLimitMaxAttempts')
                },
                users: Config.users,
                tickets: Config.tickets,
                quality: Config.quality,
                integrations: Config.integrations,
                logging: Config.logging,
                app: Config.app
            }
        });
    } catch (error) {
        console.error('Get config error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch config' });
    }
});

/**
 * PUT /api/settings/config
 * Updates system configuration (saves to local.json)
 */
router.put('/config', requireAdmin, (req, res) => {
    try {
        const { config } = req.body;
        if (!config || typeof config !== 'object') {
            return res.status(400).json({ success: false, error: 'Config object required' });
        }

        // Apply allowed configuration changes
        const allowedKeys = [
            'security.encryptionEnabled',
            'security.jwtAccessTokenExpiry',
            'security.jwtRefreshTokenExpiryDays',
            'security.rateLimitMaxRequests',
            'security.loginRateLimitMaxAttempts',
            'tickets.slaEnabled',
            'tickets.slaDurations',
            'tickets.defaultPriority',
            'quality.passingScore',
            'logging.logRequests',
            'logging.logErrors',
            'app.companyName',
            'app.timezone'
        ];

        for (const key of allowedKeys) {
            const keys = key.split('.');
            let value = config;
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    value = undefined;
                    break;
                }
            }
            if (value !== undefined) {
                Config.set(key, value);
            }
        }

        // Save to local.json
        const saved = Config.saveLocal();
        
        res.json({ 
            success: true, 
            saved,
            message: saved ? 'Configuration saved' : 'Configuration updated (not persisted)'
        });
    } catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({ success: false, error: 'Failed to update config' });
    }
});

/**
 * POST /api/settings/config/reload
 * Reloads configuration from files
 */
router.post('/config/reload', requireAdmin, (req, res) => {
    try {
        Config.reload();
        res.json({ success: true, message: 'Configuration reloaded' });
    } catch (error) {
        console.error('Reload config error:', error);
        res.status(500).json({ success: false, error: 'Failed to reload config' });
    }
});

// ============================================
// DATABASE SETTINGS
// ============================================

/**
 * GET /api/settings
 */
router.get('/', requirePermission('settings_view'), (req, res) => {
    try {
        const settings = SettingsSystem.getAll();
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
});

/**
 * GET /api/settings/:key
 */
router.get('/:key', requirePermission('settings_view'), (req, res) => {
    try {
        const value = SettingsSystem.get(req.params.key);
        res.json({ success: true, key: req.params.key, value });
    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch setting' });
    }
});

/**
 * PUT /api/settings
 */
router.put('/', requireAdmin, (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ success: false, error: 'Settings object required' });
        }
        
        SettingsSystem.setMany(settings);
        res.json({ success: true });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
});

/**
 * PUT /api/settings/:key
 */
router.put('/:key', requireAdmin, (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) {
            return res.status(400).json({ success: false, error: 'Value is required' });
        }

        SettingsSystem.set(req.params.key, String(value));
        res.json({ success: true });
    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({ success: false, error: 'Failed to update setting' });
    }
});

/**
 * GET /api/settings/integrations/status
 */
router.get('/integrations/status', requireAdmin, (req, res) => {
    try {
        const status = IntegrationSystem.getStatus();
        res.json({ 
            success: true, 
            integrations: status,
            encryptionEnabled: encryptionService.isEnabled()
        });
    } catch (error) {
        console.error('Get integration status error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch integration status' });
    }
});

/**
 * POST /api/settings/integrations/sharepoint
 */
router.post('/integrations/sharepoint', requireAdmin, (req, res) => {
    try {
        const { siteUrl, clientId, clientSecret, tenantId } = req.body;
        
        if (!siteUrl || !clientId || !clientSecret) {
            return res.status(400).json({ success: false, error: 'Required credentials missing' });
        }

        const credentials = { siteUrl, clientId, clientSecret, tenantId };
        let encrypted = false;
        let credData = JSON.stringify(credentials);

        if (encryptionService.isEnabled()) {
            credData = encryptionService.encrypt(credData);
            encrypted = true;
        }

        IntegrationSystem.saveCredentials('sharepoint', credData, encrypted);
        res.json({ success: true, encrypted });
    } catch (error) {
        console.error('Save SharePoint credentials error:', error);
        res.status(500).json({ success: false, error: 'Failed to save credentials' });
    }
});

/**
 * POST /api/settings/integrations/jira
 */
router.post('/integrations/jira', requireAdmin, (req, res) => {
    try {
        const { baseUrl, email, apiToken, projectKey } = req.body;
        
        if (!baseUrl || !email || !apiToken) {
            return res.status(400).json({ success: false, error: 'Required credentials missing' });
        }

        const credentials = { baseUrl, email, apiToken, projectKey };
        let encrypted = false;
        let credData = JSON.stringify(credentials);

        if (encryptionService.isEnabled()) {
            credData = encryptionService.encrypt(credData);
            encrypted = true;
        }

        IntegrationSystem.saveCredentials('jira', credData, encrypted);
        res.json({ success: true, encrypted });
    } catch (error) {
        console.error('Save JIRA credentials error:', error);
        res.status(500).json({ success: false, error: 'Failed to save credentials' });
    }
});

/**
 * DELETE /api/settings/integrations/:type
 */
router.delete('/integrations/:type', requireAdmin, (req, res) => {
    try {
        const { type } = req.params;
        if (!['sharepoint', 'jira'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid integration type' });
        }

        IntegrationSystem.deleteCredentials(type);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete integration error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete integration' });
    }
});

module.exports = router;
