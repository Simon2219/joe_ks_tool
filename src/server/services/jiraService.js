/**
 * JIRA Service
 * Handles integration with Atlassian JIRA
 * Uses API token authentication
 */

const axios = require('axios');

class JiraService {
    constructor() {
        this.config = null;
        this.isConnected = false;
        this.currentUser = null;
    }

    /**
     * Connects to JIRA with the provided configuration
     */
    async connect(config) {
        const { baseUrl, email, apiToken } = config;

        if (!baseUrl || !email || !apiToken) {
            throw new Error('Missing required JIRA configuration');
        }

        this.config = {
            baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
            email,
            apiToken,
            auth: Buffer.from(`${email}:${apiToken}`).toString('base64')
        };

        // Test connection by getting current user
        try {
            this.currentUser = await this.getCurrentUser();
            this.isConnected = true;
            return { 
                success: true, 
                user: this.currentUser 
            };
        } catch (error) {
            this.config = null;
            throw new Error('Failed to connect to JIRA: ' + error.message);
        }
    }

    /**
     * Disconnects from JIRA
     */
    disconnect() {
        this.config = null;
        this.isConnected = false;
        this.currentUser = null;
        return { success: true };
    }

    /**
     * Gets the connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            baseUrl: this.config?.baseUrl || null,
            user: this.currentUser
        };
    }

    /**
     * Makes an authenticated request to JIRA
     */
    async request(method, endpoint, data = null) {
        if (!this.isConnected && endpoint !== '/rest/api/3/myself') {
            throw new Error('Not connected to JIRA');
        }

        const url = `${this.config.baseUrl}${endpoint}`;

        const config = {
            method,
            url,
            headers: {
                'Authorization': `Basic ${this.config.auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error('JIRA request failed:', error.response?.data || error.message);
            const errorMessage = error.response?.data?.errorMessages?.[0] 
                || error.response?.data?.message 
                || error.message;
            throw new Error(errorMessage);
        }
    }

    /**
     * Gets the current authenticated user
     */
    async getCurrentUser() {
        return await this.request('GET', '/rest/api/3/myself');
    }

    /**
     * Gets all accessible projects
     */
    async getProjects() {
        const response = await this.request('GET', '/rest/api/3/project');
        return response.map(project => ({
            id: project.id,
            key: project.key,
            name: project.name,
            projectTypeKey: project.projectTypeKey,
            avatarUrls: project.avatarUrls
        }));
    }

    /**
     * Gets issues from a project
     */
    async getIssues(projectKey, options = {}) {
        const { 
            maxResults = 50, 
            startAt = 0, 
            status = null, 
            assignee = null,
            jql = null 
        } = options;

        let query = jql || `project = ${projectKey}`;
        if (status) query += ` AND status = "${status}"`;
        if (assignee) query += ` AND assignee = "${assignee}"`;

        const response = await this.request('GET', 
            `/rest/api/3/search?jql=${encodeURIComponent(query)}&maxResults=${maxResults}&startAt=${startAt}&expand=changelog`
        );

        return {
            total: response.total,
            startAt: response.startAt,
            maxResults: response.maxResults,
            issues: response.issues.map(issue => this.formatIssue(issue))
        };
    }

    /**
     * Gets a single issue by key
     */
    async getIssue(issueKey) {
        const response = await this.request('GET', `/rest/api/3/issue/${issueKey}?expand=changelog,comments`);
        return this.formatIssue(response);
    }

    /**
     * Formats a JIRA issue for consistent output
     */
    formatIssue(issue) {
        return {
            id: issue.id,
            key: issue.key,
            self: issue.self,
            summary: issue.fields.summary,
            description: this.extractTextFromADF(issue.fields.description),
            status: {
                name: issue.fields.status?.name,
                category: issue.fields.status?.statusCategory?.name
            },
            priority: issue.fields.priority?.name,
            issueType: issue.fields.issuetype?.name,
            assignee: issue.fields.assignee ? {
                accountId: issue.fields.assignee.accountId,
                displayName: issue.fields.assignee.displayName,
                emailAddress: issue.fields.assignee.emailAddress
            } : null,
            reporter: issue.fields.reporter ? {
                accountId: issue.fields.reporter.accountId,
                displayName: issue.fields.reporter.displayName
            } : null,
            created: issue.fields.created,
            updated: issue.fields.updated,
            dueDate: issue.fields.duedate,
            labels: issue.fields.labels || [],
            components: issue.fields.components?.map(c => c.name) || []
        };
    }

    /**
     * Extracts plain text from Atlassian Document Format (ADF)
     */
    extractTextFromADF(adf) {
        if (!adf) return '';
        if (typeof adf === 'string') return adf;

        const extractText = (node) => {
            if (!node) return '';
            if (node.type === 'text') return node.text || '';
            if (node.content) {
                return node.content.map(extractText).join(node.type === 'paragraph' ? '\n' : '');
            }
            return '';
        };

        return extractText(adf);
    }

    /**
     * Converts plain text to Atlassian Document Format (ADF)
     */
    textToADF(text) {
        return {
            type: 'doc',
            version: 1,
            content: text.split('\n').map(paragraph => ({
                type: 'paragraph',
                content: paragraph ? [{ type: 'text', text: paragraph }] : []
            }))
        };
    }

    /**
     * Creates a new issue
     */
    async createIssue(issueData) {
        const { projectKey, summary, description, issueType = 'Task', priority = 'Medium', assigneeId = null, labels = [] } = issueData;

        const data = {
            fields: {
                project: { key: projectKey },
                summary,
                description: this.textToADF(description),
                issuetype: { name: issueType },
                priority: { name: priority },
                labels
            }
        };

        if (assigneeId) {
            data.fields.assignee = { accountId: assigneeId };
        }

        const response = await this.request('POST', '/rest/api/3/issue', data);

        return {
            id: response.id,
            key: response.key,
            self: response.self
        };
    }

    /**
     * Updates an existing issue
     */
    async updateIssue(issueKey, updateData) {
        const fields = {};

        if (updateData.summary) fields.summary = updateData.summary;
        if (updateData.description) fields.description = this.textToADF(updateData.description);
        if (updateData.priority) fields.priority = { name: updateData.priority };
        if (updateData.labels) fields.labels = updateData.labels;
        if (updateData.assigneeId !== undefined) {
            fields.assignee = updateData.assigneeId ? { accountId: updateData.assigneeId } : null;
        }

        await this.request('PUT', `/rest/api/3/issue/${issueKey}`, { fields });

        return { success: true, key: issueKey };
    }

    /**
     * Deletes an issue
     */
    async deleteIssue(issueKey) {
        await this.request('DELETE', `/rest/api/3/issue/${issueKey}`);
        return { success: true };
    }

    /**
     * Gets available transitions for an issue
     */
    async getTransitions(issueKey) {
        const response = await this.request('GET', `/rest/api/3/issue/${issueKey}/transitions`);
        return response.transitions.map(t => ({
            id: t.id,
            name: t.name,
            to: t.to?.name
        }));
    }

    /**
     * Transitions an issue to a new status
     */
    async transitionIssue(issueKey, transitionId, comment = null) {
        const data = {
            transition: { id: transitionId }
        };

        if (comment) {
            data.update = {
                comment: [{
                    add: {
                        body: this.textToADF(comment)
                    }
                }]
            };
        }

        await this.request('POST', `/rest/api/3/issue/${issueKey}/transitions`, data);

        return { success: true, key: issueKey };
    }

    /**
     * Adds a comment to an issue
     */
    async addComment(issueKey, commentText) {
        const data = {
            body: this.textToADF(commentText)
        };

        const response = await this.request('POST', `/rest/api/3/issue/${issueKey}/comment`, data);

        return {
            id: response.id,
            author: response.author?.displayName,
            created: response.created
        };
    }

    /**
     * Gets comments for an issue
     */
    async getComments(issueKey) {
        const response = await this.request('GET', `/rest/api/3/issue/${issueKey}/comment`);
        return response.comments.map(comment => ({
            id: comment.id,
            author: comment.author?.displayName,
            body: this.extractTextFromADF(comment.body),
            created: comment.created,
            updated: comment.updated
        }));
    }

    /**
     * Searches JIRA with JQL
     */
    async search(jql, options = {}) {
        const { maxResults = 50, startAt = 0, fields = ['summary', 'status', 'priority', 'assignee'] } = options;

        const response = await this.request('GET', 
            `/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=${fields.join(',')}`
        );

        return {
            total: response.total,
            issues: response.issues.map(issue => this.formatIssue(issue))
        };
    }

    /**
     * Syncs local tickets with JIRA
     * @param {Array} tickets - Local tickets to sync
     * @param {String} projectKey - JIRA project key
     */
    async syncWithTickets(tickets, projectKey) {
        const results = {
            synced: 0,
            created: 0,
            updated: 0,
            errors: []
        };

        for (const ticket of tickets) {
            try {
                if (ticket.jiraKey) {
                    // Update existing JIRA issue
                    await this.updateIssue(ticket.jiraKey, {
                        summary: ticket.title,
                        description: ticket.description,
                        priority: this.mapPriority(ticket.priority)
                    });
                    results.updated++;
                } else {
                    // Create new JIRA issue
                    const issue = await this.createIssue({
                        projectKey,
                        summary: ticket.title,
                        description: ticket.description,
                        issueType: 'Task',
                        priority: this.mapPriority(ticket.priority)
                    });
                    ticket.jiraKey = issue.key;
                    results.created++;
                }
                results.synced++;
            } catch (error) {
                results.errors.push({
                    ticketId: ticket.id,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Maps local priority to JIRA priority
     */
    mapPriority(priority) {
        const mapping = {
            'critical': 'Highest',
            'high': 'High',
            'medium': 'Medium',
            'low': 'Low'
        };
        return mapping[priority?.toLowerCase()] || 'Medium';
    }
}

// Export singleton instance
module.exports = new JiraService();
