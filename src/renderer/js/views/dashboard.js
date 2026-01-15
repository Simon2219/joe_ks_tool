/**
 * Dashboard View
 * Shows overview statistics and recent activity
 */

const DashboardView = {
    /**
     * Initializes the dashboard view
     */
    async init() {
        await this.loadStatistics();
    },

    /**
     * Loads and displays all statistics
     */
    async loadStatistics() {
        await Promise.all([
            this.loadUserStats(),
            this.loadTicketStats(),
            this.loadQualityStats()
        ]);
    },

    /**
     * Loads user statistics
     */
    async loadUserStats() {
        try {
            const result = await window.api.users.getStatistics();
            if (result.success) {
                document.getElementById('stat-total-users').textContent = 
                    Helpers.formatNumber(result.statistics.total);
                document.getElementById('stat-active-users').textContent = 
                    Helpers.formatNumber(result.statistics.active);
            }
        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    },

    /**
     * Loads ticket statistics
     */
    async loadTicketStats() {
        try {
            const result = await window.api.tickets.getStatistics();
            if (result.success) {
                document.getElementById('stat-open-tickets').textContent = 
                    Helpers.formatNumber(result.statistics.openTickets);
                document.getElementById('stat-resolved-week').textContent = 
                    Helpers.formatNumber(result.statistics.resolvedThisWeek);
            }
        } catch (error) {
            console.error('Failed to load ticket stats:', error);
        }
    },

    /**
     * Loads quality statistics
     */
    async loadQualityStats() {
        try {
            const result = await window.api.quality.getStatistics();
            if (result.success) {
                document.getElementById('stat-avg-score').textContent = 
                    `${result.statistics.averageScore}%`;
                document.getElementById('stat-evaluations').textContent = 
                    Helpers.formatNumber(result.statistics.totalReports);
            }
        } catch (error) {
            console.error('Failed to load quality stats:', error);
        }
    },

    /**
     * Refreshes the dashboard
     */
    async refresh() {
        await this.loadStatistics();
    }
};

// Export for use in other modules
window.DashboardView = DashboardView;
