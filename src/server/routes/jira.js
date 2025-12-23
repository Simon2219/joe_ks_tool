/**
 * JIRA Routes
 * API endpoints for Atlassian JIRA integration
 */

const express = require('express');
const router = express.Router();

const jiraService = require('../services/jiraService');
const { TicketsDB } = require('../database/dbService');
const { authenticate, requirePermission } = require('../middleware/auth');

// All JIRA routes require authentication and integration permission
router.use(authenticate);
router.use(requirePermission('integration_jira'));

// POST /api/jira/connect
router.post('/connect', async (req, res) => {
    try {
        const result = await jiraService.connect(req.body);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('JIRA connect error:', error);
        res.json({ success: false, error: error.message });
    }
});

// POST /api/jira/disconnect
router.post('/disconnect', (req, res) => {
    try {
        jiraService.disconnect();
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// GET /api/jira/status
router.get('/status', (req, res) => {
    res.json({ success: true, ...jiraService.getStatus() });
});

// GET /api/jira/projects
router.get('/projects', async (req, res) => {
    try {
        const projects = await jiraService.getProjects();
        res.json({ success: true, projects });
    } catch (error) {
        console.error('Get projects error:', error);
        res.json({ success: false, error: error.message });
    }
});

// GET /api/jira/issues
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
        res.json({ success: false, error: error.message });
    }
});

// GET /api/jira/issues/:issueKey
router.get('/issues/:issueKey', async (req, res) => {
    try {
        const issue = await jiraService.getIssue(req.params.issueKey);
        res.json({ success: true, issue });
    } catch (error) {
        console.error('Get issue error:', error);
        res.json({ success: false, error: error.message });
    }
});

// POST /api/jira/issues
router.post('/issues', async (req, res) => {
    try {
        const issue = await jiraService.createIssue(req.body);
        res.json({ success: true, issue });
    } catch (error) {
        console.error('Create issue error:', error);
        res.json({ success: false, error: error.message });
    }
});

// PUT /api/jira/issues/:issueKey
router.put('/issues/:issueKey', async (req, res) => {
    try {
        const result = await jiraService.updateIssue(req.params.issueKey, req.body);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Update issue error:', error);
        res.json({ success: false, error: error.message });
    }
});

// DELETE /api/jira/issues/:issueKey
router.delete('/issues/:issueKey', async (req, res) => {
    try {
        await jiraService.deleteIssue(req.params.issueKey);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete issue error:', error);
        res.json({ success: false, error: error.message });
    }
});

// GET /api/jira/issues/:issueKey/transitions
router.get('/issues/:issueKey/transitions', async (req, res) => {
    try {
        const transitions = await jiraService.getTransitions(req.params.issueKey);
        res.json({ success: true, transitions });
    } catch (error) {
        console.error('Get transitions error:', error);
        res.json({ success: false, error: error.message });
    }
});

// POST /api/jira/issues/:issueKey/transitions
router.post('/issues/:issueKey/transitions', async (req, res) => {
    try {
        const { transitionId, comment } = req.body;
        const result = await jiraService.transitionIssue(req.params.issueKey, transitionId, comment);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Transition issue error:', error);
        res.json({ success: false, error: error.message });
    }
});

// GET /api/jira/issues/:issueKey/comments
router.get('/issues/:issueKey/comments', async (req, res) => {
    try {
        const comments = await jiraService.getComments(req.params.issueKey);
        res.json({ success: true, comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.json({ success: false, error: error.message });
    }
});

// POST /api/jira/issues/:issueKey/comments
router.post('/issues/:issueKey/comments', async (req, res) => {
    try {
        const { body } = req.body;
        const comment = await jiraService.addComment(req.params.issueKey, body);
        res.json({ success: true, comment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.json({ success: false, error: error.message });
    }
});

// POST /api/jira/search
router.post('/search', async (req, res) => {
    try {
        const { jql, maxResults, startAt, fields } = req.body;
        const result = await jiraService.search(jql, { maxResults, startAt, fields });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Search error:', error);
        res.json({ success: false, error: error.message });
    }
});

// POST /api/jira/sync
router.post('/sync', async (req, res) => {
    try {
        const { projectKey } = req.body;
        if (!projectKey) {
            return res.json({ success: false, error: 'Project key is required' });
        }

        // Get all local tickets
        const tickets = TicketsDB.getAll();

        // Sync with JIRA
        const result = await jiraService.syncWithTickets(tickets, projectKey);

        // Update local tickets with JIRA keys
        tickets.forEach(ticket => {
            if (ticket.jiraKey) {
                TicketsDB.update(ticket.id, { jiraKey: ticket.jiraKey });
            }
        });

        res.json({ success: true, results: result });
    } catch (error) {
        console.error('Sync error:', error);
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;
