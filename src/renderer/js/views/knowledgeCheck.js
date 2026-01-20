/**
 * Knowledge Check Main View
 * Shows overview tiles for the Knowledge Check system
 */

const KnowledgeCheckView = {
    /**
     * Initializes the knowledge check main view
     */
    async init() {
        this.bindEvents();
        await this.loadStatistics();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Tile navigation
        document.querySelectorAll('.kc-tile[data-navigate]').forEach(tile => {
            tile.addEventListener('click', () => {
                const view = tile.dataset.navigate;
                if (view && window.App) {
                    App.navigateTo(view);
                }
            });
        });
    },

    /**
     * Loads and displays statistics
     */
    async loadStatistics() {
        try {
            const result = await window.api.knowledgeCheck.getStatistics();
            if (result.success) {
                const stats = result.statistics;
                document.getElementById('kc-stat-questions').textContent = `${stats.totalQuestions} Fragen`;
                document.getElementById('kc-stat-tests').textContent = `${stats.totalTests} Tests`;
                document.getElementById('kc-stat-results').textContent = `${stats.totalResults} Ergebnisse`;
            }
        } catch (error) {
            console.error('Failed to load KC statistics:', error);
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadStatistics();
    }
};

// Export for use in other modules
window.KnowledgeCheckView = KnowledgeCheckView;
