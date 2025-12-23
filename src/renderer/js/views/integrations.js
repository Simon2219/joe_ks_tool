/**
 * Integrations View
 * Placeholder for future SharePoint and JIRA integrations
 */

const IntegrationsView = {
    /**
     * Initializes the integrations view
     */
    async init() {
        this.showComingSoon();
    },

    /**
     * Shows coming soon message
     */
    showComingSoon() {
        const statusEls = document.querySelectorAll('.integration-status');
        statusEls.forEach(el => {
            el.textContent = 'Coming Soon';
        });

        const connectBtns = document.querySelectorAll('#sp-connect-btn, #jira-connect-btn');
        connectBtns.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Coming Soon';
        });
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        // Nothing to refresh
    }
};

// Export for use in other modules
window.IntegrationsView = IntegrationsView;
