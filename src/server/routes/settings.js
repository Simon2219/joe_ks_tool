/**
 * Settings Routes - SettingsSystem
 * Handles application settings and integration credentials
 */

const express = require('express');
const router = express.Router();

const { SettingsSystem, IntegrationSystem } = require('../database');
const encryptionService = require('../services/encryptionService');
const { authenticate, requirePermission, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

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
