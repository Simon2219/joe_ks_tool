/**
 * Integrations View
 * Handles SharePoint and JIRA integrations
 */

const IntegrationsView = {
    /**
     * Initializes the integrations view
     */
    async init() {
        this.bindEvents();
        await this.checkConnectionStatus();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // SharePoint connect button
        document.getElementById('sp-connect-btn')?.addEventListener('click', () => {
            this.connectSharePoint();
        });

        // JIRA connect button
        document.getElementById('jira-connect-btn')?.addEventListener('click', () => {
            this.connectJira();
        });
    },

    /**
     * Checks connection status for both integrations
     */
    async checkConnectionStatus() {
        await Promise.all([
            this.checkSharePointStatus(),
            this.checkJiraStatus()
        ]);
    },

    /**
     * Checks SharePoint connection status
     */
    async checkSharePointStatus() {
        try {
            const result = await window.electronAPI.sharepoint.getStatus();
            const statusEl = document.getElementById('sharepoint-status');
            const connectBtn = document.getElementById('sp-connect-btn');
            
            if (result.success && result.isConnected) {
                statusEl.textContent = 'Connected';
                statusEl.classList.add('connected');
                connectBtn.textContent = 'Disconnect';
                connectBtn.classList.remove('btn-primary');
                connectBtn.classList.add('btn-danger');
                
                // Update button handler
                connectBtn.onclick = () => this.disconnectSharePoint();
            } else {
                statusEl.textContent = 'Disconnected';
                statusEl.classList.remove('connected');
                connectBtn.textContent = 'Connect';
                connectBtn.classList.add('btn-primary');
                connectBtn.classList.remove('btn-danger');
                connectBtn.onclick = () => this.connectSharePoint();
            }
        } catch (error) {
            console.error('Failed to check SharePoint status:', error);
        }
    },

    /**
     * Checks JIRA connection status
     */
    async checkJiraStatus() {
        try {
            const result = await window.electronAPI.jira.getStatus();
            const statusEl = document.getElementById('jira-status');
            const connectBtn = document.getElementById('jira-connect-btn');
            
            if (result.success && result.isConnected) {
                statusEl.textContent = 'Connected';
                statusEl.classList.add('connected');
                connectBtn.textContent = 'Disconnect';
                connectBtn.classList.remove('btn-primary');
                connectBtn.classList.add('btn-danger');
                
                // Update button handler
                connectBtn.onclick = () => this.disconnectJira();
            } else {
                statusEl.textContent = 'Disconnected';
                statusEl.classList.remove('connected');
                connectBtn.textContent = 'Connect';
                connectBtn.classList.add('btn-primary');
                connectBtn.classList.remove('btn-danger');
                connectBtn.onclick = () => this.connectJira();
            }
        } catch (error) {
            console.error('Failed to check JIRA status:', error);
        }
    },

    /**
     * Connects to SharePoint
     */
    async connectSharePoint() {
        const siteUrl = document.getElementById('sp-site-url').value;
        const tenantId = document.getElementById('sp-tenant-id').value;
        const clientId = document.getElementById('sp-client-id').value;
        const clientSecret = document.getElementById('sp-client-secret').value;

        if (!siteUrl || !tenantId || !clientId || !clientSecret) {
            Toast.error('Please fill in all SharePoint configuration fields');
            return;
        }

        try {
            const connectBtn = document.getElementById('sp-connect-btn');
            connectBtn.disabled = true;
            connectBtn.innerHTML = '<span class="spinner"></span> Connecting...';

            const result = await window.electronAPI.sharepoint.connect({
                siteUrl,
                tenantId,
                clientId,
                clientSecret
            });

            if (result.success) {
                Toast.success('Connected to SharePoint successfully');
                await this.checkSharePointStatus();
            } else {
                Toast.error(result.error || 'Failed to connect to SharePoint');
            }
        } catch (error) {
            console.error('SharePoint connection error:', error);
            Toast.error('Failed to connect to SharePoint');
        } finally {
            const connectBtn = document.getElementById('sp-connect-btn');
            connectBtn.disabled = false;
            await this.checkSharePointStatus();
        }
    },

    /**
     * Disconnects from SharePoint
     */
    async disconnectSharePoint() {
        const confirmed = await Modal.confirm({
            title: 'Disconnect SharePoint',
            message: 'Are you sure you want to disconnect from SharePoint?',
            confirmText: 'Disconnect',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                await window.electronAPI.sharepoint.disconnect();
                Toast.success('Disconnected from SharePoint');
                await this.checkSharePointStatus();
            } catch (error) {
                console.error('Failed to disconnect SharePoint:', error);
                Toast.error('Failed to disconnect');
            }
        }
    },

    /**
     * Connects to JIRA
     */
    async connectJira() {
        const baseUrl = document.getElementById('jira-base-url').value;
        const email = document.getElementById('jira-email').value;
        const apiToken = document.getElementById('jira-api-token').value;

        if (!baseUrl || !email || !apiToken) {
            Toast.error('Please fill in all JIRA configuration fields');
            return;
        }

        try {
            const connectBtn = document.getElementById('jira-connect-btn');
            connectBtn.disabled = true;
            connectBtn.innerHTML = '<span class="spinner"></span> Connecting...';

            const result = await window.electronAPI.jira.connect({
                baseUrl,
                email,
                apiToken
            });

            if (result.success) {
                Toast.success(`Connected to JIRA as ${result.user?.displayName || email}`);
                await this.checkJiraStatus();
            } else {
                Toast.error(result.error || 'Failed to connect to JIRA');
            }
        } catch (error) {
            console.error('JIRA connection error:', error);
            Toast.error('Failed to connect to JIRA');
        } finally {
            const connectBtn = document.getElementById('jira-connect-btn');
            connectBtn.disabled = false;
            await this.checkJiraStatus();
        }
    },

    /**
     * Disconnects from JIRA
     */
    async disconnectJira() {
        const confirmed = await Modal.confirm({
            title: 'Disconnect JIRA',
            message: 'Are you sure you want to disconnect from JIRA?',
            confirmText: 'Disconnect',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                await window.electronAPI.jira.disconnect();
                Toast.success('Disconnected from JIRA');
                await this.checkJiraStatus();
            } catch (error) {
                console.error('Failed to disconnect JIRA:', error);
                Toast.error('Failed to disconnect');
            }
        }
    },

    /**
     * Syncs tickets with JIRA
     */
    async syncWithJira() {
        try {
            const result = await window.electronAPI.jira.syncWithTickets();
            if (result.success) {
                Toast.success(`Synced ${result.results.synced} tickets (${result.results.created} created, ${result.results.updated} updated)`);
            } else {
                Toast.error(result.error || 'Failed to sync with JIRA');
            }
        } catch (error) {
            console.error('JIRA sync error:', error);
            Toast.error('Failed to sync with JIRA');
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.checkConnectionStatus();
    }
};

// Export for use in other modules
window.IntegrationsView = IntegrationsView;
