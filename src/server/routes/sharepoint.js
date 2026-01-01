/**
 * SharePoint Routes - IntegrationSystem
 * Handles SharePoint integration operations
 */

const express = require('express');
const router = express.Router();

const { IntegrationSystem } = require('../database');
const sharepointService = require('../services/sharepointService');
const encryptionService = require('../services/encryptionService');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);
router.use(requirePermission('integration_access'));

/**
 * Gets and decrypts SharePoint credentials
 */
function getCredentials() {
    const stored = IntegrationSystem.getCredentials('sharepoint');
    if (!stored) return null;

    try {
        let data = stored.credentials;
        if (stored.encrypted && encryptionService.isEnabled()) {
            data = encryptionService.decrypt(data);
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to parse SharePoint credentials:', error);
        return null;
    }
}

/**
 * GET /api/sharepoint/status
 */
router.get('/status', (req, res) => {
    try {
        const credentials = getCredentials();
        const stored = IntegrationSystem.getCredentials('sharepoint');
        
        res.json({
            success: true,
            status: {
                configured: !!credentials,
                connected: stored?.is_connected || false
            }
        });
    } catch (error) {
        console.error('SharePoint status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get status' });
    }
});

/**
 * POST /api/sharepoint/connect
 */
router.post('/connect', async (req, res) => {
    try {
        const credentials = getCredentials();
        if (!credentials) {
            return res.status(400).json({ success: false, error: 'SharePoint not configured' });
        }

        const connected = await sharepointService.connect(credentials);
        if (connected) {
            IntegrationSystem.setConnected('sharepoint', true);
            res.json({ success: true });
        } else {
            res.status(500).json({ success: false, error: 'Failed to connect to SharePoint' });
        }
    } catch (error) {
        console.error('SharePoint connect error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sharepoint/disconnect
 */
router.post('/disconnect', (req, res) => {
    try {
        sharepointService.disconnect();
        IntegrationSystem.setConnected('sharepoint', false);
        res.json({ success: true });
    } catch (error) {
        console.error('SharePoint disconnect error:', error);
        res.status(500).json({ success: false, error: 'Failed to disconnect' });
    }
});

/**
 * GET /api/sharepoint/files
 */
router.get('/files', async (req, res) => {
    try {
        if (!sharepointService.isConnected()) {
            return res.status(400).json({ success: false, error: 'Not connected to SharePoint' });
        }

        const files = await sharepointService.getFiles(req.query.path || '/');
        res.json({ success: true, files });
    } catch (error) {
        console.error('SharePoint get files error:', error);
        res.status(500).json({ success: false, error: 'Failed to get files' });
    }
});

/**
 * POST /api/sharepoint/upload
 */
router.post('/upload', async (req, res) => {
    try {
        if (!sharepointService.isConnected()) {
            return res.status(400).json({ success: false, error: 'Not connected to SharePoint' });
        }

        const { fileName, content, path } = req.body;
        if (!fileName || !content) {
            return res.status(400).json({ success: false, error: 'Filename and content required' });
        }

        const result = await sharepointService.uploadFile(fileName, content, path || '/');
        res.json({ success: true, file: result });
    } catch (error) {
        console.error('SharePoint upload error:', error);
        res.status(500).json({ success: false, error: 'Failed to upload file' });
    }
});

module.exports = router;
