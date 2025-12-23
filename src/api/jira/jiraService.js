/**
 * JIRA API Service
 * Provides integration with Atlassian JIRA
 * 
 * Features:
 * - REST API authentication with API tokens
 * - Project management
 * - Issue CRUD operations
 * - Issue transitions (workflow)
 * - Comments and attachments
 * - Search with JQL
 * - Sync with internal ticket system
 */

const axios = require('axios');

class JiraService {
    constructor() {
        this.baseUrl = null;
        this.auth = null;
        this.config = {
            baseUrl: '',
            email: '',
            apiToken: ''
        };
        this.isConnected = false;
    }

    /**
     * Configures the JIRA connection
     * @param {Object} config - Configuration object
     */
    configure(config) {
        this.config = {
            baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
            email: config.email,
            apiToken: config.apiToken
        };
        this.baseUrl = `${this.config.baseUrl}/rest/api/3`;
        this.auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    }

    /**
     * Gets request headers with authentication
     */
    getHeaders() {
        return {
            'Authorization': `Basic ${this.auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    /**
     * Validates connection by fetching current user
     */
    async validateConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/myself`, {
                headers: this.getHeaders()
            });
            return {
                valid: true,
                user: {
                    accountId: response.data.accountId,
                    displayName: response.data.displayName,
                    emailAddress: response.data.emailAddress
                }
            };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Connects to JIRA with the provided configuration
     * @param {Object} config - JIRA configuration
     */
    async connect(config) {
        this.configure(config);
        
        const validation = await this.validateConnection();
        if (!validation.valid) {
            this.isConnected = false;
            throw new Error(`Connection failed: ${validation.error}`);
        }
        
        this.isConnected = true;
        return { 
            success: true, 
            message: 'Connected to JIRA',
            user: validation.user
        };
    }

    /**
     * Disconnects from JIRA
     */
    disconnect() {
        this.auth = null;
        this.isConnected = false;
        return { success: true, message: 'Disconnected from JIRA' };
    }

    /**
     * Gets the current connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            baseUrl: this.config.baseUrl
        };
    }

    // ============================================
    // PROJECT OPERATIONS
    // ============================================

    /**
     * Gets all accessible projects
     * @param {Object} options - Query options
     */
    async getProjects(options = {}) {
        try {
            const params = new URLSearchParams();
            if (options.maxResults) params.append('maxResults', options.maxResults);
            if (options.startAt) params.append('startAt', options.startAt);
            if (options.expand) params.append('expand', options.expand);

            const url = `${this.baseUrl}/project${params.toString() ? '?' + params.toString() : ''}`;
            const response = await axios.get(url, { headers: this.getHeaders() });
            
            return response.data.map(project => ({
                id: project.id,
                key: project.key,
                name: project.name,
                projectTypeKey: project.projectTypeKey,
                avatarUrls: project.avatarUrls,
                lead: project.lead ? {
                    accountId: project.lead.accountId,
                    displayName: project.lead.displayName
                } : null
            }));
        } catch (error) {
            throw new Error(`Failed to get projects: ${error.message}`);
        }
    }

    /**
     * Gets a specific project by key
     * @param {string} projectKey - Project key
     */
    async getProject(projectKey) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/project/${projectKey}`,
                { headers: this.getHeaders() }
            );
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get project: ${error.message}`);
        }
    }

    // ============================================
    // ISSUE OPERATIONS
    // ============================================

    /**
     * Gets issues from a project with optional filters
     * @param {string} projectKey - Project key
     * @param {Object} filters - Query filters
     */
    async getIssues(projectKey, filters = {}) {
        try {
            let jql = `project = ${projectKey}`;
            
            if (filters.status) jql += ` AND status = "${filters.status}"`;
            if (filters.assignee) jql += ` AND assignee = "${filters.assignee}"`;
            if (filters.priority) jql += ` AND priority = "${filters.priority}"`;
            if (filters.issueType) jql += ` AND issuetype = "${filters.issueType}"`;
            if (filters.createdAfter) jql += ` AND created >= "${filters.createdAfter}"`;
            if (filters.updatedAfter) jql += ` AND updated >= "${filters.updatedAfter}"`;
            
            jql += ' ORDER BY created DESC';

            const params = new URLSearchParams();
            params.append('jql', jql);
            params.append('maxResults', filters.maxResults || 50);
            if (filters.startAt) params.append('startAt', filters.startAt);
            params.append('fields', 'summary,status,priority,assignee,reporter,created,updated,issuetype,description');

            const response = await axios.get(
                `${this.baseUrl}/search?${params.toString()}`,
                { headers: this.getHeaders() }
            );
            
            return {
                total: response.data.total,
                startAt: response.data.startAt,
                maxResults: response.data.maxResults,
                issues: response.data.issues.map(issue => this.formatIssue(issue))
            };
        } catch (error) {
            throw new Error(`Failed to get issues: ${error.message}`);
        }
    }

    /**
     * Gets a specific issue by key
     * @param {string} issueKey - Issue key (e.g., "PROJ-123")
     */
    async getIssue(issueKey) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/issue/${issueKey}`,
                { headers: this.getHeaders() }
            );
            return this.formatIssue(response.data);
        } catch (error) {
            throw new Error(`Failed to get issue: ${error.message}`);
        }
    }

    /**
     * Creates a new issue
     * @param {string} projectKey - Project key
     * @param {Object} issueData - Issue data
     */
    async createIssue(projectKey, issueData) {
        try {
            const payload = {
                fields: {
                    project: { key: projectKey },
                    summary: issueData.summary,
                    description: this.formatDescription(issueData.description),
                    issuetype: { name: issueData.issueType || 'Task' }
                }
            };

            if (issueData.priority) {
                payload.fields.priority = { name: issueData.priority };
            }
            if (issueData.assignee) {
                payload.fields.assignee = { accountId: issueData.assignee };
            }
            if (issueData.labels) {
                payload.fields.labels = issueData.labels;
            }

            const response = await axios.post(
                `${this.baseUrl}/issue`,
                payload,
                { headers: this.getHeaders() }
            );
            
            return {
                id: response.data.id,
                key: response.data.key,
                self: response.data.self
            };
        } catch (error) {
            throw new Error(`Failed to create issue: ${error.message}`);
        }
    }

    /**
     * Updates an existing issue
     * @param {string} issueKey - Issue key
     * @param {Object} issueData - Updated data
     */
    async updateIssue(issueKey, issueData) {
        try {
            const payload = { fields: {} };

            if (issueData.summary) {
                payload.fields.summary = issueData.summary;
            }
            if (issueData.description) {
                payload.fields.description = this.formatDescription(issueData.description);
            }
            if (issueData.priority) {
                payload.fields.priority = { name: issueData.priority };
            }
            if (issueData.assignee !== undefined) {
                payload.fields.assignee = issueData.assignee 
                    ? { accountId: issueData.assignee } 
                    : null;
            }
            if (issueData.labels) {
                payload.fields.labels = issueData.labels;
            }

            await axios.put(
                `${this.baseUrl}/issue/${issueKey}`,
                payload,
                { headers: this.getHeaders() }
            );
            
            return { success: true, issueKey };
        } catch (error) {
            throw new Error(`Failed to update issue: ${error.message}`);
        }
    }

    /**
     * Deletes an issue
     * @param {string} issueKey - Issue key
     */
    async deleteIssue(issueKey) {
        try {
            await axios.delete(
                `${this.baseUrl}/issue/${issueKey}`,
                { headers: this.getHeaders() }
            );
            return { success: true, issueKey };
        } catch (error) {
            throw new Error(`Failed to delete issue: ${error.message}`);
        }
    }

    // ============================================
    // TRANSITIONS (WORKFLOW)
    // ============================================

    /**
     * Gets available transitions for an issue
     * @param {string} issueKey - Issue key
     */
    async getTransitions(issueKey) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/issue/${issueKey}/transitions`,
                { headers: this.getHeaders() }
            );
            
            return response.data.transitions.map(t => ({
                id: t.id,
                name: t.name,
                to: {
                    id: t.to.id,
                    name: t.to.name,
                    statusCategory: t.to.statusCategory?.name
                }
            }));
        } catch (error) {
            throw new Error(`Failed to get transitions: ${error.message}`);
        }
    }

    /**
     * Transitions an issue to a new status
     * @param {string} issueKey - Issue key
     * @param {string} transitionId - Transition ID
     * @param {Object} options - Additional options (comment, fields)
     */
    async transitionIssue(issueKey, transitionId, options = {}) {
        try {
            const payload = {
                transition: { id: transitionId }
            };

            if (options.comment) {
                payload.update = {
                    comment: [{
                        add: {
                            body: this.formatDescription(options.comment)
                        }
                    }]
                };
            }

            if (options.fields) {
                payload.fields = options.fields;
            }

            await axios.post(
                `${this.baseUrl}/issue/${issueKey}/transitions`,
                payload,
                { headers: this.getHeaders() }
            );
            
            return { success: true, issueKey, transitionId };
        } catch (error) {
            throw new Error(`Failed to transition issue: ${error.message}`);
        }
    }

    // ============================================
    // COMMENTS
    // ============================================

    /**
     * Gets comments for an issue
     * @param {string} issueKey - Issue key
     */
    async getComments(issueKey) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/issue/${issueKey}/comment`,
                { headers: this.getHeaders() }
            );
            
            return response.data.comments.map(comment => ({
                id: comment.id,
                body: this.parseDescription(comment.body),
                author: {
                    accountId: comment.author?.accountId,
                    displayName: comment.author?.displayName
                },
                created: comment.created,
                updated: comment.updated
            }));
        } catch (error) {
            throw new Error(`Failed to get comments: ${error.message}`);
        }
    }

    /**
     * Adds a comment to an issue
     * @param {string} issueKey - Issue key
     * @param {string} comment - Comment text
     */
    async addComment(issueKey, comment) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/issue/${issueKey}/comment`,
                { body: this.formatDescription(comment) },
                { headers: this.getHeaders() }
            );
            
            return {
                id: response.data.id,
                created: response.data.created
            };
        } catch (error) {
            throw new Error(`Failed to add comment: ${error.message}`);
        }
    }

    // ============================================
    // SEARCH
    // ============================================

    /**
     * Searches issues using JQL
     * @param {string} jql - JQL query string
     * @param {Object} options - Search options
     */
    async search(jql, options = {}) {
        try {
            const params = new URLSearchParams();
            params.append('jql', jql);
            params.append('maxResults', options.maxResults || 50);
            if (options.startAt) params.append('startAt', options.startAt);
            if (options.fields) params.append('fields', options.fields.join(','));

            const response = await axios.get(
                `${this.baseUrl}/search?${params.toString()}`,
                { headers: this.getHeaders() }
            );
            
            return {
                total: response.data.total,
                issues: response.data.issues.map(issue => this.formatIssue(issue))
            };
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    // ============================================
    // SYNC WITH INTERNAL TICKETS
    // ============================================

    /**
     * Syncs a local ticket with JIRA
     * @param {Object} ticket - Local ticket object
     * @param {string} projectKey - JIRA project key
     */
    async syncTicketToJira(ticket, projectKey) {
        try {
            // Check if ticket already linked
            if (ticket.jiraKey) {
                // Update existing JIRA issue
                await this.updateIssue(ticket.jiraKey, {
                    summary: ticket.title,
                    description: ticket.description,
                    priority: this.mapPriority(ticket.priority)
                });
                return { action: 'updated', jiraKey: ticket.jiraKey };
            } else {
                // Create new JIRA issue
                const result = await this.createIssue(projectKey, {
                    summary: ticket.title,
                    description: `${ticket.description}\n\n---\nInternal Ticket: ${ticket.ticketNumber}`,
                    issueType: 'Task',
                    priority: this.mapPriority(ticket.priority)
                });
                return { action: 'created', jiraKey: result.key };
            }
        } catch (error) {
            throw new Error(`Failed to sync ticket: ${error.message}`);
        }
    }

    /**
     * Syncs JIRA issue status back to local ticket
     * @param {string} jiraKey - JIRA issue key
     */
    async getJiraStatusForSync(jiraKey) {
        try {
            const issue = await this.getIssue(jiraKey);
            return {
                jiraKey,
                status: issue.status.name,
                statusCategory: issue.status.statusCategory,
                lastUpdated: issue.updated
            };
        } catch (error) {
            throw new Error(`Failed to get JIRA status: ${error.message}`);
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Formats an issue response for consistent output
     */
    formatIssue(issue) {
        return {
            id: issue.id,
            key: issue.key,
            summary: issue.fields?.summary,
            description: this.parseDescription(issue.fields?.description),
            status: {
                name: issue.fields?.status?.name,
                statusCategory: issue.fields?.status?.statusCategory?.name
            },
            priority: issue.fields?.priority?.name,
            issueType: issue.fields?.issuetype?.name,
            assignee: issue.fields?.assignee ? {
                accountId: issue.fields.assignee.accountId,
                displayName: issue.fields.assignee.displayName,
                avatarUrl: issue.fields.assignee.avatarUrls?.['48x48']
            } : null,
            reporter: issue.fields?.reporter ? {
                accountId: issue.fields.reporter.accountId,
                displayName: issue.fields.reporter.displayName
            } : null,
            created: issue.fields?.created,
            updated: issue.fields?.updated,
            labels: issue.fields?.labels || []
        };
    }

    /**
     * Formats description for JIRA's Atlassian Document Format (ADF)
     */
    formatDescription(text) {
        if (!text) return null;
        
        return {
            type: 'doc',
            version: 1,
            content: [
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: text
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Parses JIRA's ADF description to plain text
     */
    parseDescription(adf) {
        if (!adf) return '';
        if (typeof adf === 'string') return adf;
        
        const extractText = (node) => {
            if (!node) return '';
            if (node.type === 'text') return node.text || '';
            if (node.content) {
                return node.content.map(extractText).join('');
            }
            return '';
        };
        
        return extractText(adf);
    }

    /**
     * Maps internal priority to JIRA priority
     */
    mapPriority(priority) {
        const mapping = {
            'critical': 'Highest',
            'high': 'High',
            'medium': 'Medium',
            'low': 'Low'
        };
        return mapping[priority] || 'Medium';
    }
}

// Create singleton instance
const jiraService = new JiraService();

module.exports = { jiraService, JiraService };
