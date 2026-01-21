/**
 * KC Test Runs View (Testdurchläufe)
 * Shows all test runs and allows creating new ones
 */

const KCTestRunsView = {
    runs: [],
    tests: [],
    users: [],
    filters: {
        status: ''
    },
    eventsBound: false,

    /**
     * Initializes the test runs view
     */
    async init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        await this.loadTests();
        await this.loadUsers();
        await this.loadRuns();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // New run button
        document.getElementById('add-test-run-btn')?.addEventListener('click', () => {
            this.showNewRunForm();
        });

        // Export button
        document.getElementById('export-test-runs-btn')?.addEventListener('click', () => {
            this.exportRuns();
        });

        // Status filter
        document.getElementById('filter-run-status')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });
    },

    /**
     * Loads all tests for the form
     */
    async loadTests() {
        try {
            const result = await window.api.knowledgeCheck.getTests();
            if (result.success) {
                this.tests = result.tests.filter(t => t.isActive && !t.isArchived);
            }
        } catch (error) {
            console.error('Failed to load tests:', error);
        }
    },

    /**
     * Loads all users for the form
     */
    async loadUsers() {
        try {
            const result = await window.api.users.getAll();
            if (result.success) {
                this.users = result.users.filter(u => u.isActive);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    },

    /**
     * Loads all test runs
     */
    async loadRuns() {
        try {
            const result = await window.api.knowledgeCheck.getTestRuns(this.filters);
            if (result.success) {
                this.runs = result.runs;
                this.renderTable();
                this.updateStatistics();
            }
        } catch (error) {
            console.error('Failed to load test runs:', error);
            Toast.error('Testdurchläufe konnten nicht geladen werden');
        }
    },

    /**
     * Updates statistics
     */
    updateStatistics() {
        const total = this.runs.length;
        const pending = this.runs.filter(r => r.status === 'pending' || r.pendingCount > 0).length;
        const completed = this.runs.filter(r => r.pendingCount === 0 && r.completedCount > 0).length;
        const avgScores = this.runs.filter(r => r.avgScore !== null).map(r => r.avgScore);
        const avgScore = avgScores.length > 0 ? Math.round(avgScores.reduce((a, b) => a + b, 0) / avgScores.length) : 0;

        document.getElementById('runs-total').textContent = total;
        document.getElementById('runs-pending').textContent = pending;
        document.getElementById('runs-completed').textContent = completed;
        document.getElementById('runs-avg-score').textContent = `${avgScore}%`;
    },

    /**
     * Applies filters
     */
    applyFilters() {
        this.loadRuns();
    },

    /**
     * Renders the table
     */
    renderTable() {
        const tbody = document.getElementById('test-runs-tbody');
        if (!tbody) return;

        if (this.runs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">Keine Testdurchläufe gefunden</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.runs.map(run => this.renderRunRow(run)).join('');

        // Bind click handlers
        tbody.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('dblclick', () => this.viewRun(row.dataset.id));
        });

        tbody.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewRun(btn.dataset.id);
            });
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteRun(btn.dataset.id);
            });
        });
    },

    /**
     * Renders a single run row
     */
    renderRunRow(run) {
        // Determine status
        let status, statusClass;
        if (run.totalAssignments === 0) {
            status = 'Leer';
            statusClass = 'badge-secondary';
        } else if (run.completedCount === run.totalAssignments) {
            status = 'Abgeschlossen';
            statusClass = 'badge-success';
        } else if (run.completedCount > 0) {
            status = 'In Bearbeitung';
            statusClass = 'badge-info';
        } else {
            status = 'Ausstehend';
            statusClass = 'badge-warning';
        }

        const progress = run.totalAssignments > 0 
            ? Math.round((run.completedCount / run.totalAssignments) * 100) 
            : 0;

        const canDelete = Permissions.has('kc_assign_tests');

        return `
            <tr data-id="${run.id}" class="clickable-row">
                <td><strong>${Helpers.escapeHtml(run.runNumber)}</strong></td>
                <td>${Helpers.escapeHtml(run.name)}</td>
                <td>${run.testCount}</td>
                <td>${run.userCount}</td>
                <td>
                    <div class="progress-bar-container" title="${run.completedCount}/${run.totalAssignments}">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                        <span class="progress-text">${progress}%</span>
                    </div>
                </td>
                <td>${run.avgScore !== null ? `${run.avgScore}%` : '-'}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td>${Helpers.formatDate(run.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" data-id="${run.id}" title="Details anzeigen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        ${canDelete ? `
                            <button class="btn-icon btn-delete" data-id="${run.id}" title="Löschen">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    },

    /**
     * Shows form to create a new test run
     */
    async showNewRunForm() {
        if (!Permissions.has('kc_assign_tests')) {
            Toast.error('Keine Berechtigung zum Erstellen von Testdurchläufen');
            return;
        }

        // Build form with test and user checkboxes
        const formHtml = `
            <div class="new-run-form">
                <div class="form-group">
                    <label for="run-name">Name *</label>
                    <input type="text" id="run-name" class="form-input" placeholder="z.B. Quartalstest Q1 2024" required>
                </div>
                
                <div class="form-group">
                    <label for="run-description">Beschreibung (optional)</label>
                    <textarea id="run-description" class="form-textarea" rows="2" placeholder="Beschreibung des Testdurchlaufs"></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Tests auswählen *</label>
                        <div style="margin-bottom: var(--space-xs);">
                            <button type="button" class="btn btn-sm btn-secondary" id="run-select-all-tests">Alle</button>
                            <button type="button" class="btn btn-sm btn-secondary" id="run-deselect-all-tests">Keine</button>
                        </div>
                        <div class="checkbox-list" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: var(--space-sm);">
                            ${this.tests.map(t => `
                                <label class="form-checkbox" style="display: flex; padding: var(--space-xs) 0;">
                                    <input type="checkbox" name="testIds" value="${t.id}">
                                    <span>${Helpers.escapeHtml(t.testNumber)} - ${Helpers.escapeHtml(t.name)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Teilnehmer auswählen *</label>
                        <div style="margin-bottom: var(--space-xs);">
                            <button type="button" class="btn btn-sm btn-secondary" id="run-select-all-users">Alle</button>
                            <button type="button" class="btn btn-sm btn-secondary" id="run-deselect-all-users">Keine</button>
                        </div>
                        <div class="checkbox-list" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: var(--space-sm);">
                            ${this.users.map(u => `
                                <label class="form-checkbox" style="display: flex; padding: var(--space-xs) 0;">
                                    <input type="checkbox" name="userIds" value="${u.id}">
                                    <span>${Helpers.escapeHtml(u.firstName)} ${Helpers.escapeHtml(u.lastName)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="run-due-date">Fälligkeitsdatum (optional)</label>
                    <input type="date" id="run-due-date" class="form-input">
                </div>
            </div>
        `;

        const template = document.createElement('template');
        template.innerHTML = formHtml.trim();
        const content = template.content.firstElementChild;

        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.gap = 'var(--space-sm)';
        footer.style.justifyContent = 'flex-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Abbrechen';
        cancelBtn.addEventListener('click', () => Modal.close());

        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = 'Testdurchlauf erstellen';

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title: 'Neuer Testdurchlauf',
            content,
            footer,
            size: 'lg'
        });

        // Select all / deselect all handlers
        document.getElementById('run-select-all-tests')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="testIds"]').forEach(cb => cb.checked = true);
        });
        document.getElementById('run-deselect-all-tests')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="testIds"]').forEach(cb => cb.checked = false);
        });
        document.getElementById('run-select-all-users')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="userIds"]').forEach(cb => cb.checked = true);
        });
        document.getElementById('run-deselect-all-users')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="userIds"]').forEach(cb => cb.checked = false);
        });

        // Submit handler
        submitBtn.addEventListener('click', async () => {
            const name = document.getElementById('run-name')?.value?.trim();
            const description = document.getElementById('run-description')?.value?.trim();
            const dueDate = document.getElementById('run-due-date')?.value || null;
            const testIds = Array.from(document.querySelectorAll('input[name="testIds"]:checked')).map(cb => cb.value);
            const userIds = Array.from(document.querySelectorAll('input[name="userIds"]:checked')).map(cb => cb.value);

            if (!name) {
                Toast.error('Bitte geben Sie einen Namen ein');
                return;
            }
            if (testIds.length === 0) {
                Toast.error('Bitte wählen Sie mindestens einen Test');
                return;
            }
            if (userIds.length === 0) {
                Toast.error('Bitte wählen Sie mindestens einen Teilnehmer');
                return;
            }

            try {
                const response = await window.api.knowledgeCheck.createTestRun({
                    name,
                    description,
                    dueDate,
                    testIds,
                    userIds
                });

                if (response && response.success) {
                    Toast.success(`Testdurchlauf "${name}" wurde erstellt mit ${testIds.length} Tests für ${userIds.length} Teilnehmer`);
                    Modal.close();
                    await this.loadRuns();
                } else {
                    Toast.error(response?.error || 'Fehler beim Erstellen');
                }
            } catch (error) {
                console.error('Create test run error:', error);
                Toast.error('Fehler beim Erstellen: ' + (error.message || 'Unbekannter Fehler'));
            }
        });
    },

    /**
     * Views a test run's details
     */
    async viewRun(runId) {
        try {
            const result = await window.api.knowledgeCheck.getTestRunById(runId);
            if (!result.success) {
                Toast.error('Testdurchlauf konnte nicht geladen werden');
                return;
            }

            const run = result.run;
            
            // Group assignments by user
            const userAssignments = {};
            run.assignments.forEach(a => {
                if (!userAssignments[a.userId]) {
                    userAssignments[a.userId] = {
                        userName: a.userName,
                        assignments: []
                    };
                }
                userAssignments[a.userId].assignments.push(a);
            });

            const contentHtml = `
                <div class="run-detail">
                    <div class="run-detail-header">
                        <h3>${Helpers.escapeHtml(run.runNumber)} - ${Helpers.escapeHtml(run.name)}</h3>
                        ${run.description ? `<p>${Helpers.escapeHtml(run.description)}</p>` : ''}
                    </div>
                    
                    <div class="run-stats-row">
                        <div class="run-stat">
                            <strong>${run.stats.testCount}</strong> Tests
                        </div>
                        <div class="run-stat">
                            <strong>${run.stats.userCount}</strong> Teilnehmer
                        </div>
                        <div class="run-stat">
                            <strong>${run.stats.completedCount}/${run.stats.totalAssignments}</strong> abgeschlossen
                        </div>
                        ${run.stats.avgScore !== null ? `
                            <div class="run-stat">
                                Ø <strong>${run.stats.avgScore}%</strong>
                            </div>
                        ` : ''}
                        ${run.dueDate ? `
                            <div class="run-stat">
                                Fällig: <strong>${Helpers.formatDate(run.dueDate)}</strong>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="run-participants">
                        <h4>Teilnehmer & Ergebnisse</h4>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Teilnehmer</th>
                                    <th>Fortschritt</th>
                                    <th>Tests</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.values(userAssignments).map(ua => {
                                    const completed = ua.assignments.filter(a => a.status === 'completed').length;
                                    const total = ua.assignments.length;
                                    const progress = Math.round((completed / total) * 100);
                                    const avgScore = ua.assignments.filter(a => a.percentage !== null).length > 0
                                        ? Math.round(ua.assignments.filter(a => a.percentage !== null).reduce((s, a) => s + a.percentage, 0) / ua.assignments.filter(a => a.percentage !== null).length)
                                        : null;
                                    
                                    return `
                                        <tr>
                                            <td><strong>${Helpers.escapeHtml(ua.userName)}</strong></td>
                                            <td>
                                                <div class="progress-bar-container" style="width: 100px;">
                                                    <div class="progress-bar" style="width: ${progress}%"></div>
                                                    <span class="progress-text">${completed}/${total}</span>
                                                </div>
                                            </td>
                                            <td>
                                                ${ua.assignments.map(a => `
                                                    <span class="badge ${a.status === 'completed' ? (a.passed ? 'badge-success' : 'badge-danger') : 'badge-secondary'}" 
                                                          title="${Helpers.escapeHtml(a.testName)}: ${a.status === 'completed' ? a.percentage + '%' : 'Ausstehend'}">
                                                        ${Helpers.escapeHtml(a.testNumber)}${a.status === 'completed' ? ': ' + a.percentage + '%' : ''}
                                                    </span>
                                                `).join(' ')}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            const template = document.createElement('template');
            template.innerHTML = contentHtml.trim();
            const content = template.content.firstElementChild;

            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.gap = 'var(--space-sm)';
            footer.style.justifyContent = 'space-between';

            const leftBtns = document.createElement('div');
            // Could add "Ergebnisse anzeigen" button here to navigate to results
            footer.appendChild(leftBtns);

            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-secondary';
            closeBtn.textContent = 'Schließen';
            closeBtn.addEventListener('click', () => Modal.close());
            footer.appendChild(closeBtn);

            Modal.open({
                title: 'Testdurchlauf Details',
                content,
                footer,
                size: 'lg'
            });
        } catch (error) {
            console.error('View run error:', error);
            Toast.error('Fehler beim Laden');
        }
    },

    /**
     * Deletes a test run
     */
    async deleteRun(runId) {
        const run = this.runs.find(r => r.id === runId);
        if (!run) return;

        const confirmed = await Modal.confirm({
            title: 'Testdurchlauf löschen',
            message: `Möchten Sie den Testdurchlauf "${run.name}" wirklich löschen? Alle zugehörigen Zuweisungen werden ebenfalls gelöscht.`,
            confirmText: 'Löschen',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const response = await window.api.knowledgeCheck.deleteTestRun(runId);
                if (response && response.success) {
                    Toast.success('Testdurchlauf gelöscht');
                    await this.loadRuns();
                } else {
                    Toast.error(response?.error || 'Fehler beim Löschen');
                }
            } catch (error) {
                console.error('Delete run error:', error);
                Toast.error('Fehler beim Löschen');
            }
        }
    },

    /**
     * Exports test runs
     */
    async exportRuns() {
        Toast.info('Export wird vorbereitet...');
        // TODO: Implement export
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadRuns();
    }
};

// Export for use in other modules
window.KCTestRunsView = KCTestRunsView;
