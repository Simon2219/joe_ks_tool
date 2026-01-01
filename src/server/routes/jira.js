/**
 * JIRA Routes - IntegrationSystem
 * Handles JIRA integration operations
 */

const express = require('express');
const router = express.Router();

const { IntegrationSystem } = require('../database');
const jiraService = require('../services/jiraService');
const encryptionService = require('../services/encryptionService');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);
router.use(requirePermission('integration_access'));

/**
 * Gets and decrypts JIRA credentials
 */
function getCredentials() {
    const stored = IntegrationSystem.getCredentials('jira');
    if (!stored) return null;

    try {
        let data = stored.credentials;
        if (stored.encrypted && encryptionService.isEnabled()) {
            data = encryptionService.decrypt(data);
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to parse JIRA credentials:', error);
        return null;
    }
}

/**
 * GET /api/jira/status
 */
router.get('/status', (req, res) => {
    try {
        const credentials = getCredentials();
        const stored = IntegrationSystem.getCredentials('jira');
        
        res.json({
            success: true,
            status: {
                configured: !!credentials,
                connected: stored?.is_connected || false
            }
        });
    } catch (error) {
        console.error('JIRA status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get status' });
    }
});

/**
 * POST /api/jira/connect
 */
router.post('/connect', async (req, res) => {
    try {
        const credentials = getCredentials();
        if (!credentials) {
            return res.status(400).json({ success: false, error: 'JIRA not configured' });
        }

        const connected = await jiraService.connect(credentials);
        if (connected) {
            IntegrationSystem.setConnected('jira', true);
            res.json({ success: true });
        } else {
            res.status(500).json({ success: false, error: 'Failed to connect to JIRA' });
        }
    } catch (error) {
        console.error('JIRA connect error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/jira/disconnect
 */
router.post('/disconnect', (req, res) => {
    try {
        jiraService.disconnect();
        IntegrationSystem.setConnected('jira', false);
        res.json({ success: true });
    } catch (error) {
        console.error('JIRA disconnect error:', error);
        res.status(500).json({ success: false, error: 'Failed to disconnect' });
    }
});

/**
 * GET /api/jira/issues
 */
router.get('/issues', async (req, res) => {
    try {
        if (!jiraService.isConnected()) {
            return res.status(400).json({ success: false, error: 'Not connected to JIRA' });
        }

        const issues = await jiraService.getIssues(req.query);
        res.json({ success: true, issues });
    } catch (error) {
        console.error('JIRA get issues error:', error);
        res.status(500).json({ success: false, error: 'Failed to get issues' });
    }
});

/**
 * GET /api/jira/issues/:key
 */
router.get('/issues/:key', async (req, res) => {
    try {
        if (!jiraService.isConnected()) {
            return res.status(400).json({ success: false, error: 'Not connected to JIRA' });
        }

        const issue = await jiraService.getIssue(req.params.key);
        if (!issue) {
            return res.status(404).json({ success: false, error: 'Issue not found' });
        }
        res.json({ success: true, issue });
    } catch (error) {
        console.error('JIRA get issue error:', error);
        res.status(500).json({ success: false, error: 'Failed to get issue' });
    }
});

/**
 * POST /api/jira/issues
 */
router.post('/issues', async (req, res) => {
    try {
        if (!jiraService.isConnected()) {
            return res.status(400).json({ success: false, error: 'Not connected to JIRA' });
        }

        const { summary, description, issueType } = req.body;
        if (!summary) {
            return res.status(400).json({ success: false, error: 'Summary is required' });
        }

        const issue = await jiraService.createIssue({ summary, description, issueType });
        res.status(201).json({ success: true, issue });
    } catch (error) {
        console.error('JIRA create issue error:', error);
        res.status(500).json({ success: false, error: 'Failed to create issue' });
    }
});

/**
 * POST /api/jira/sync/:ticketId
 */
router.post('/sync/:ticketId', async (req, res) => {
    try {
        if (!jiraService.isConnected()) {
            return res.status(400).json({ success: false, error: 'Not connected to JIRA' });
        }

        const result = await jiraService.syncTicket(req.params.ticketId);
        res.json({ success: true, result });
    } catch (error) {
        console.error('JIRA sync error:', error);
        res.status(500).json({ success: false, error: 'Failed to sync ticket' });
    }
});

module.exports = router;
