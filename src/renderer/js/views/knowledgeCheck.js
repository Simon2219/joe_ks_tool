/**
 * Knowledge Check Main View
 * Shows overview tiles for the Knowledge Check system
 */

const KnowledgeCheckView = {
    /**
     * Initializes the knowledge check main view
     */
    async init() {
        this.updateTilePermissions();
        this.bindEvents();
        await this.loadStatistics();
    },

    /**
     * Updates tile visibility based on permissions
     */
    updateTilePermissions() {
        const tilesContainer = document.getElementById('kc-tiles-container');
        const noAccessMessage = document.getElementById('kc-no-access-message');
        
        // Check each tile for permission
        const tiles = tilesContainer.querySelectorAll('.kc-tile[data-permission]');
        let visibleTiles = 0;
        
        tiles.forEach(tile => {
            const permission = tile.dataset.permission;
            const hasAccess = Permissions.hasPermission(permission);
            tile.style.display = hasAccess ? '' : 'none';
            if (hasAccess) visibleTiles++;
        });
        
        // Show message if user has no access to any sub-pages
        if (visibleTiles === 0 && noAccessMessage) {
            noAccessMessage.style.display = 'block';
            tilesContainer.style.display = 'none';
        } else {
            noAccessMessage.style.display = 'none';
            tilesContainer.style.display = '';
        }
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Tile navigation - only for visible tiles
        document.querySelectorAll('.kc-tile[data-navigate]').forEach(tile => {
            tile.addEventListener('click', () => {
                const view = tile.dataset.navigate;
                const permission = tile.dataset.permission;
                
                // Double-check permission before navigating
                if (permission && !Permissions.hasPermission(permission)) {
                    Toast.warning('Sie haben keine Berechtigung für diese Seite');
                    return;
                }
                
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
                
                // Only update stats for tiles the user can see
                if (Permissions.hasPermission('kc_assigned_view')) {
                    const assignedEl = document.getElementById('kc-stat-assigned');
                    if (assignedEl) assignedEl.textContent = `${stats.myAssignedCount || 0} Zugewiesen`;
                }
                if (Permissions.hasPermission('kc_questions_view')) {
                    const questionsEl = document.getElementById('kc-stat-questions');
                    if (questionsEl) questionsEl.textContent = `${stats.totalQuestions} Fragen`;
                }
                if (Permissions.hasPermission('kc_tests_view')) {
                    const testsEl = document.getElementById('kc-stat-tests');
                    if (testsEl) testsEl.textContent = `${stats.totalTests} Tests`;
                }
                if (Permissions.hasPermission('kc_results_view')) {
                    const runsEl = document.getElementById('kc-stat-runs');
                    if (runsEl) runsEl.textContent = `${stats.totalRuns || 0} Durchläufe`;
                }
                if (Permissions.hasPermission('kc_archive_access')) {
                    const archivedEl = document.getElementById('kc-stat-archived');
                    if (archivedEl) archivedEl.textContent = `${stats.totalArchived || 0} Archiviert`;
                }
            }
        } catch (error) {
            console.error('Failed to load KC statistics:', error);
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        this.updateTilePermissions();
        await this.loadStatistics();
    }
};

// Export for use in other modules
window.KnowledgeCheckView = KnowledgeCheckView;
