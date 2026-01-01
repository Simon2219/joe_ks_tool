/**
 * JIRA Routes
 * API endpoints for Atlassian JIRA integration
 */

const express = require('express');
const router = express.Router();

const jiraService = require('../services/jiraService');
const { TicketModel, IntegrationCredentialsModel } = require('../database');
const encryptionService = require('../services/encryptionService');
const { authenticate, requirePermission } = require('../middleware/auth');

// All JIRA routes require authentication and integration permission
router.use(authenticate);
router.use(requirePermission('integration_jira'));

/**
 * Helper to get decrypted credentials
 */
function getCredentials() {
    const record = IntegrationCredentialsModel.get('jira');
    if (!record) return null;

    try {
        if (record.encrypted) {
            return encryptionService.decrypt(record.credentials);
        }
        return JSON.parse(record.credentials);
    } catch (error) {
        console.error('Failed to get JIRA credentials:', error);
        return null;
    }
}

/**
 * POST /api/jira/connect
 * Connects to JIRA using stored or provided credentials
 */
router.post('/connect', async (req, res) => {
    try {
        // Use provided credentials or fall back to stored ones
        let config = req.body;
        if (!config.baseUrl || !config.email || !config.apiToken) {
            config = getCredentials();
        }

        if (!config) {
            return res.status(400).json({ 
                success: false, 
                error: 'JIRA is not configured. Please add credentials in Settings.' 
            });
        }

        const result = await jiraService.connect(config);
        
        // Update connection status in database
        IntegrationCredentialsModel.setConnectionStatus('jira', true);
        
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('JIRA connect error:', error);
        IntegrationCredentialsModel.setConnectionStatus('jira', false);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/jira/disconnect
 * Disconnects from JIRA
 */
router.post('/disconnect', (req, res) => {
    try {
        jiraService.disconnect();
        IntegrationCredentialsModel.setConnectionStatus('jira', false);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/jira/status
 * Returns connection status
 */
router.get('/status', (req, res) => {
    const serviceStatus = jiraService.getStatus();
    const hasCredentials = !!getCredentials();
    
    res.json({ 
        success: true, 
        ...serviceStatus,
        configured: hasCredentials
    });
});

/**
 * GET /api/jira/projects
 * Returns all accessible projects
 */
router.get('/projects', async (req, res) => {
    try {
        const projects = await jiraService.getProjects();
        res.json({ success: true, projects });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/jira/issues
 * Returns issues from a project
 */
router.get('/issues', async (req, res) => {
    try {
        const { projectKey, status, assignee, maxResults, startAt, jql } = req.query;
        const result = await jiraService.getIssues(projectKey, {
            status,
            assignee,
            maxResults: parseInt(maxResults) || 50,
            startAt: parseInt(startAt) || 0,
            jql
        });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Get issues error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/jira/issues/:issueKey
 * Returns a specific issue
 */
router.get('/issues/:issueKey', async (req, res) => {
    try {
        const issue = await jiraService.getIssue(req.params.issueKey);
        res.json({ success: true, issue });
    } catch (error) {
        console.error('Get issue error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/jira/issues
 * Creates a new issue
 */
router.post('/issues', async (req, res) => {
    try {
        const issue = await jiraService.createIssue(req.body);
        res.json({ success: true, issue });
    } catch (error) {
        console.error('Create issue error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/jira/issues/:issueKey
 * Updates an issue
 */
router.put('/issues/:issueKey', async (req, res) => {
    try {
        const result = await jiraService.updateIssue(req.params.issueKey, req.body);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Update issue error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/jira/issues/:issueKey
 * Deletes an issue
 */
router.delete('/issues/:issueKey', async (req, res) => {
    try {
        await jiraService.deleteIssue(req.params.issueKey);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete issue error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/jira/issues/:issueKey/transitions
 * Returns available transitions for an issue
 */
router.get('/issues/:issueKey/transitions', async (req, res) => {
    try {
        const transitions = await jiraService.getTransitions(req.params.issueKey);
        res.json({ success: true, transitions });
    } catch (error) {
        console.error('Get transitions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/jira/issues/:issueKey/transitions
 * Transitions an issue to a new status
 */
router.post('/issues/:issueKey/transitions', async (req, res) => {
    try {
        const { transitionId, comment } = req.body;
        const result = await jiraService.transitionIssue(req.params.issueKey, transitionId, comment);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Transition issue error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/jira/issues/:issueKey/comments
 * Returns comments for an issue
 */
router.get('/issues/:issueKey/comments', async (req, res) => {
    try {
        const comments = await jiraService.getComments(req.params.issueKey);
        res.json({ success: true, comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/jira/issues/:issueKey/comments
 * Adds a comment to an issue
 */
router.post('/issues/:issueKey/comments', async (req, res) => {
    try {
        const { body } = req.body;
        const comment = await jiraService.addComment(req.params.issueKey, body);
        res.json({ success: true, comment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/jira/search
 * Searches JIRA with JQL
 */
router.post('/search', async (req, res) => {
    try {
        const { jql, maxResults, startAt, fields } = req.body;
        const result = await jiraService.search(jql, { maxResults, startAt, fields });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/jira/sync
 * Syncs local tickets with JIRA
 */
router.post('/sync', async (req, res) => {
    try {
        const { projectKey } = req.body;
        if (!projectKey) {
            return res.status(400).json({ success: false, error: 'Project key is required' });
        }

        // Get all local tickets
        const tickets = TicketModel.getAll();

        // Sync with JIRA
        const result = await jiraService.syncWithTickets(tickets, projectKey);

        // Update local tickets with JIRA keys
        for (const ticket of tickets) {
            if (ticket.jiraKey) {
                TicketModel.update(ticket.id, { jiraKey: ticket.jiraKey }, null);
            }
        }

        res.json({ success: true, results: result });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
