/**
 * KC Archive View
 * Shows archived questions and tests
 */

const KCArchiveView = {
    archivedQuestions: [],
    archivedTests: [],
    currentTab: 'questions',

    /**
     * Initializes the archive view
     */
    async init() {
        this.bindEvents();
        await this.loadStats();
        await this.loadArchivedQuestions();
        await this.loadArchivedTests();
        this.renderCurrentTab();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Tab switching
        document.querySelectorAll('.archive-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    },

    /**
     * Switches between tabs
     */
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.archive-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update content visibility
        document.getElementById('archive-questions-content').classList.toggle('hidden', tabName !== 'questions');
        document.getElementById('archive-tests-content').classList.toggle('hidden', tabName !== 'tests');
        
        this.renderCurrentTab();
    },

    /**
     * Loads archive statistics
     */
    async loadStats() {
        try {
            const result = await window.api.knowledgeCheck.getArchiveStats();
            if (result.success) {
                document.getElementById('archive-questions-count').textContent = result.statistics.archivedQuestions;
                document.getElementById('archive-tests-count').textContent = result.statistics.archivedTests;
            }
        } catch (error) {
            console.error('Failed to load archive stats:', error);
        }
    },

    /**
     * Loads archived questions
     */
    async loadArchivedQuestions() {
        try {
            const result = await window.api.knowledgeCheck.getArchivedQuestions();
            if (result.success) {
                this.archivedQuestions = result.questions;
            }
        } catch (error) {
            console.error('Failed to load archived questions:', error);
            Toast.error('Archivierte Fragen konnten nicht geladen werden');
        }
    },

    /**
     * Loads archived tests
     */
    async loadArchivedTests() {
        try {
            const result = await window.api.knowledgeCheck.getArchivedTests();
            if (result.success) {
                this.archivedTests = result.tests;
            }
        } catch (error) {
            console.error('Failed to load archived tests:', error);
            Toast.error('Archivierte Tests konnten nicht geladen werden');
        }
    },

    /**
     * Renders the current tab
     */
    renderCurrentTab() {
        if (this.currentTab === 'questions') {
            this.renderArchivedQuestions();
        } else {
            this.renderArchivedTests();
        }
    },

    /**
     * Renders archived questions
     */
    renderArchivedQuestions() {
        const container = document.getElementById('archive-questions-list');
        if (!container) return;

        if (this.archivedQuestions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;">
                        <path d="M21 8v13H3V8"></path>
                        <path d="M1 3h22v5H1z"></path>
                        <path d="M10 12h4"></path>
                    </svg>
                    <h3>Keine archivierten Fragen</h3>
                    <p>Fragen werden automatisch archiviert wenn sie gelöscht werden und in Tests verwendet wurden.</p>
                </div>
            `;
            return;
        }

        const canRestore = Permissions.canRestoreFromArchive();
        const canDelete = Permissions.canPermanentDelete();

        const html = this.archivedQuestions.map(q => `
            <div class="archive-item" data-id="${q.id}">
                <div class="archive-item-content">
                    <div class="archive-item-header">
                        ${q.title ? `<strong>${Helpers.escapeHtml(q.title)}</strong>` : ''}
                        <span class="badge badge-secondary">${q.questionType === 'multiple_choice' ? 'Multiple Choice' : 'Offene Frage'}</span>
                    </div>
                    <p class="archive-item-text">${Helpers.escapeHtml(Helpers.truncate(q.questionText, 150))}</p>
                    <div class="archive-item-meta">
                        <span>Kategorie: ${Helpers.escapeHtml(q.categoryName || 'Unkategorisiert')}</span>
                        <span>Archiviert: ${Helpers.formatDate(q.archivedAt)}</span>
                    </div>
                </div>
                <div class="archive-item-actions">
                    ${canRestore ? `
                        <button class="btn btn-sm btn-secondary restore-question" data-id="${q.id}" title="Wiederherstellen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                            </svg>
                            Wiederherstellen
                        </button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="btn btn-sm btn-danger delete-question-permanent" data-id="${q.id}" title="Endgültig löschen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            Löschen
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        this.bindQuestionActions();
    },

    /**
     * Renders archived tests
     */
    renderArchivedTests() {
        const container = document.getElementById('archive-tests-list');
        if (!container) return;

        if (this.archivedTests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;">
                        <path d="M21 8v13H3V8"></path>
                        <path d="M1 3h22v5H1z"></path>
                        <path d="M10 12h4"></path>
                    </svg>
                    <h3>Keine archivierten Tests</h3>
                    <p>Tests werden automatisch archiviert wenn sie gelöscht werden und Testergebnisse vorhanden sind.</p>
                </div>
            `;
            return;
        }

        const canRestore = Permissions.canRestoreFromArchive();
        const canDelete = Permissions.canPermanentDelete();

        const html = this.archivedTests.map(t => `
            <div class="archive-item" data-id="${t.id}">
                <div class="archive-item-content">
                    <div class="archive-item-header">
                        <strong>${Helpers.escapeHtml(t.testNumber)} - ${Helpers.escapeHtml(t.name)}</strong>
                    </div>
                    ${t.description ? `<p class="archive-item-text">${Helpers.escapeHtml(Helpers.truncate(t.description, 150))}</p>` : ''}
                    <div class="archive-item-meta">
                        <span>Kategorie: ${Helpers.escapeHtml(t.categoryName || 'Keine')}</span>
                        <span>${t.questionCount} Fragen</span>
                        <span>Archiviert: ${Helpers.formatDate(t.archivedAt)}</span>
                    </div>
                </div>
                <div class="archive-item-actions">
                    ${canRestore ? `
                        <button class="btn btn-sm btn-secondary restore-test" data-id="${t.id}" title="Wiederherstellen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                            </svg>
                            Wiederherstellen
                        </button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="btn btn-sm btn-danger delete-test-permanent" data-id="${t.id}" title="Endgültig löschen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            Löschen
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        this.bindTestActions();
    },

    /**
     * Binds question action handlers
     */
    bindQuestionActions() {
        document.querySelectorAll('.restore-question').forEach(btn => {
            btn.addEventListener('click', () => this.restoreQuestion(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-question-permanent').forEach(btn => {
            btn.addEventListener('click', () => this.permanentDeleteQuestion(btn.dataset.id));
        });
    },

    /**
     * Binds test action handlers
     */
    bindTestActions() {
        document.querySelectorAll('.restore-test').forEach(btn => {
            btn.addEventListener('click', () => this.restoreTest(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-test-permanent').forEach(btn => {
            btn.addEventListener('click', () => this.permanentDeleteTest(btn.dataset.id));
        });
    },

    /**
     * Restores a question from archive
     */
    async restoreQuestion(id) {
        const confirmed = await Modal.confirm({
            title: 'Frage wiederherstellen',
            message: 'Möchten Sie diese Frage aus dem Archiv wiederherstellen? Sie wird wieder im Fragen Katalog sichtbar sein.',
            confirmText: 'Wiederherstellen',
            confirmClass: 'btn-primary'
        });

        if (confirmed) {
            try {
                const result = await window.api.knowledgeCheck.restoreQuestion(id);
                if (result.success) {
                    Toast.success('Frage wiederhergestellt');
                    await this.loadStats();
                    await this.loadArchivedQuestions();
                    this.renderArchivedQuestions();
                } else {
                    Toast.error(result.error || 'Fehler beim Wiederherstellen');
                }
            } catch (error) {
                console.error('Restore question error:', error);
                Toast.error('Fehler beim Wiederherstellen');
            }
        }
    },

    /**
     * Restores a test from archive
     */
    async restoreTest(id) {
        const confirmed = await Modal.confirm({
            title: 'Test wiederherstellen',
            message: 'Möchten Sie diesen Test aus dem Archiv wiederherstellen? Er wird wieder im Test Katalog sichtbar sein (als inaktiv markiert).',
            confirmText: 'Wiederherstellen',
            confirmClass: 'btn-primary'
        });

        if (confirmed) {
            try {
                const result = await window.api.knowledgeCheck.restoreTest(id);
                if (result.success) {
                    Toast.success('Test wiederhergestellt');
                    await this.loadStats();
                    await this.loadArchivedTests();
                    this.renderArchivedTests();
                } else {
                    Toast.error(result.error || 'Fehler beim Wiederherstellen');
                }
            } catch (error) {
                console.error('Restore test error:', error);
                Toast.error('Fehler beim Wiederherstellen');
            }
        }
    },

    /**
     * Permanently deletes a question
     */
    async permanentDeleteQuestion(id) {
        const confirmed = await Modal.confirm({
            title: 'Frage endgültig löschen',
            message: 'ACHTUNG: Diese Aktion kann nicht rückgängig gemacht werden! Die Frage und alle zugehörigen Antwortdaten werden unwiderruflich gelöscht. Historische Testergebnisse könnten dadurch unvollständig werden.',
            confirmText: 'Endgültig löschen',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const result = await window.api.knowledgeCheck.permanentDeleteQuestion(id);
                if (result.success) {
                    Toast.success('Frage endgültig gelöscht');
                    await this.loadStats();
                    await this.loadArchivedQuestions();
                    this.renderArchivedQuestions();
                } else {
                    Toast.error(result.error || 'Fehler beim Löschen');
                }
            } catch (error) {
                console.error('Permanent delete question error:', error);
                Toast.error('Fehler beim Löschen');
            }
        }
    },

    /**
     * Permanently deletes a test
     */
    async permanentDeleteTest(id) {
        const confirmed = await Modal.confirm({
            title: 'Test endgültig löschen',
            message: 'ACHTUNG: Diese Aktion kann nicht rückgängig gemacht werden! Der Test, alle Ergebnisse und Antwortdaten werden unwiderruflich gelöscht.',
            confirmText: 'Endgültig löschen',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const result = await window.api.knowledgeCheck.permanentDeleteTest(id);
                if (result.success) {
                    Toast.success('Test endgültig gelöscht');
                    await this.loadStats();
                    await this.loadArchivedTests();
                    this.renderArchivedTests();
                } else {
                    Toast.error(result.error || 'Fehler beim Löschen');
                }
            } catch (error) {
                console.error('Permanent delete test error:', error);
                Toast.error('Fehler beim Löschen');
            }
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadStats();
        await this.loadArchivedQuestions();
        await this.loadArchivedTests();
        this.renderCurrentTab();
    }
};

// Export for use in other modules
window.KCArchiveView = KCArchiveView;
