/**
 * JIRA IPC Handlers
 * Bridges the JIRA service with the Electron IPC system
 */

const { ipcMain } = require('electron');
const { jiraService } = require('./jiraService');
const { checkPermission } = require('../../main/ipc/authHandlers');
const { TicketsDB } = require('../../main/database/dbService');

/**
 * Registers JIRA IPC handlers
 */
function registerJiraHandlers() {
    // Connect to JIRA
    ipcMain.handle('jira:connect', async (event, config) => {
        try {
            if (!checkPermission('integration_jira')) {
                return { success: false, error: 'Permission denied' };
            }
            
            if (!config.baseUrl || !config.email || !config.apiToken) {
                return { success: false, error: 'Missing required configuration' };
            }
            
            const result = await jiraService.connect(config);
            return { success: true, ...result };
        } catch (error) {
            console.error('JIRA connect error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Disconnect from JIRA
    ipcMain.handle('jira:disconnect', async () => {
        try {
            const result = jiraService.disconnect();
            return { success: true, ...result };
        } catch (error) {
            console.error('JIRA disconnect error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Get connection status
    ipcMain.handle('jira:getStatus', async () => {
        try {
            const status = jiraService.getStatus();
            return { success: true, ...status };
        } catch (error) {
            console.error('JIRA status error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Get projects
    ipcMain.handle('jira:getProjects', async () => {
        try {
            if (!checkPermission('integration_jira')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const projects = await jiraService.getProjects();
            return { success: true, projects };
        } catch (error) {
            console.error('JIRA get projects error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Get issues
    ipcMain.handle('jira:getIssues', async (event, projectKey, filters) => {
        try {
            if (!checkPermission('integration_jira')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await jiraService.getIssues(projectKey, filters);
            return { success: true, ...result };
        } catch (error) {
            console.error('JIRA get issues error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Get single issue
    ipcMain.handle('jira:getIssue', async (event, issueKey) => {
        try {
            if (!checkPermission('integration_jira')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const issue = await jiraService.getIssue(issueKey);
            return { success: true, issue };
        } catch (error) {
            console.error('JIRA get issue error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Create issue
    ipcMain.handle('jira:createIssue', async (event, projectKey, issueData) => {
        try {
            if (!checkPermission('integration_jira')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await jiraService.createIssue(projectKey, issueData);
            return { success: true, ...result };
        } catch (error) {
            console.error('JIRA create issue error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Update issue
    ipcMain.handle('jira:updateIssue', async (event, issueKey, issueData) => {
        try {
            if (!checkPermission('integration_jira')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await jiraService.updateIssue(issueKey, issueData);
            return { success: true, ...result };
        } catch (error) {
            console.error('JIRA update issue error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Delete issue
    ipcMain.handle('jira:deleteIssue', async (event, issueKey) => {
        try {
            if (!checkPermission('integration_jira')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await jiraService.deleteIssue(issueKey);
            return { success: true, ...result };
        } catch (error) {
            console.error('JIRA delete issue error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Add comment
    ipcMain.handle('jira:addComment', async (event, issueKey, comment) => {
        try {
            if (!checkPermission('integration_jira')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await jiraService.addComment(issueKey, comment);
            return { success: true, ...result };
        } catch (error) {
            console.error('JIRA add comment error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Transition issue
    ipcMain.handle('jira:transitionIssue', async (event, issueKey, transitionId) => {
        try {
            if (!checkPermission('integration_jira')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await jiraService.transitionIssue(issueKey, transitionId);
            return { success: true, ...result };
        } catch (error) {
            console.error('JIRA transition issue error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Sync with internal tickets
    ipcMain.handle('jira:syncWithTickets', async (event, projectKey) => {
        try {
            if (!checkPermission('integration_jira')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const tickets = TicketsDB.getAll();
            const results = {
                synced: 0,
                created: 0,
                updated: 0,
                failed: 0,
                errors: []
            };
            
            for (const ticket of tickets) {
                try {
                    const syncResult = await jiraService.syncTicketToJira(ticket, projectKey);
                    results.synced++;
                    
                    if (syncResult.action === 'created') {
                        results.created++;
                        // Update local ticket with JIRA key
                        TicketsDB.update(ticket.id, { jiraKey: syncResult.jiraKey });
                    } else {
                        results.updated++;
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        ticketId: ticket.id,
                        ticketNumber: ticket.ticketNumber,
                        error: error.message
                    });
                }
            }
            
            return { success: true, results };
        } catch (error) {
            console.error('JIRA sync error:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = { registerJiraHandlers };
