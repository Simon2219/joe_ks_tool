/**
 * KC Test Runs View (Test Durchläufe)
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
            Toast.error('Test Durchläufe konnten nicht geladen werden');
        }
    },

    /**
     * Updates statistics
     */
    updateStatistics() {
        const total = this.runs.length;
        const pending = this.runs.filter(r => r.status === 'pending' || r.pendingCount > 0).length;
        const completed = this.runs.filter(r => r.pendingCount === 0 && r.completedCount > 0).length;

        document.getElementById('runs-total').textContent = total;
        document.getElementById('runs-pending').textContent = pending;
        document.getElementById('runs-completed').textContent = completed;
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
                    <td colspan="9" class="empty-state">Keine Test Durchläufe gefunden</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.runs.map(run => this.renderRunRow(run)).join('');

        // Bind click handlers - single click to view
        tbody.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.action-buttons')) return;
                this.viewRun(row.dataset.id);
            });
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
            Toast.error('Keine Berechtigung zum Erstellen von Test Durchläufen');
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
                    <textarea id="run-description" class="form-textarea" rows="2" placeholder="Beschreibung des Test Durchlaufs"></textarea>
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
        submitBtn.textContent = 'Test Durchlauf erstellen';

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title: 'Neuer Test Durchlauf',
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
                    Toast.success(`Test Durchlauf "${name}" wurde erstellt mit ${testIds.length} Tests für ${userIds.length} Teilnehmer`);
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
     * Views a test run's details with full results (similar to Test Results page layout)
     */
    async viewRun(runId) {
        try {
            const result = await window.api.knowledgeCheck.getTestRunById(runId);
            if (!result.success) {
                Toast.error('Test Durchlauf konnte nicht geladen werden');
                return;
            }

            const run = result.run;
            
            // Calculate statistics
            const completedResults = run.assignments.filter(a => a.status === 'completed');
            const avgScore = completedResults.length > 0 
                ? Math.round(completedResults.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedResults.length)
                : 0;
            const passingRate = completedResults.length > 0
                ? Math.round((completedResults.filter(a => a.passed).length / completedResults.length) * 100)
                : 0;

            // Determine color class based on percentage
            const getStatColorClass = (value) => {
                if (value < 50) return 'stat-color-danger';
                if (value <= 75) return 'stat-color-warning';
                return 'stat-color-success';
            };

            const avgScoreColorClass = getStatColorClass(avgScore);
            const passingRateColorClass = getStatColorClass(passingRate);

            const contentHtml = `
                <div class="run-detail-full">
                    <div class="run-detail-header-info">
                        <div class="run-title-section">
                            <span class="run-number">${Helpers.escapeHtml(run.runNumber)}</span>
                            <span class="run-name">${Helpers.escapeHtml(run.name)}</span>
                            ${run.dueDate ? `<span class="run-due">Fällig: ${Helpers.formatDate(run.dueDate)}</span>` : ''}
                        </div>
                        ${run.description ? `<p class="run-description">${Helpers.escapeHtml(run.description)}</p>` : ''}
                    </div>
                    
                    <div class="kc-results-overview">
                        <div class="quality-stat-card">
                            <span class="stat-value ${avgScoreColorClass}">${avgScore}%</span>
                            <span class="stat-label">Ø Ergebnis</span>
                        </div>
                        <div class="quality-stat-card">
                            <span class="stat-value ${passingRateColorClass}">${passingRate}%</span>
                            <span class="stat-label">Bestehensrate</span>
                        </div>
                        <div class="quality-stat-card">
                            <span class="stat-value">${completedResults.length}/${run.stats.totalAssignments}</span>
                            <span class="stat-label">Abgeschlossen</span>
                        </div>
                        <div class="quality-stat-card">
                            <span class="stat-value">${run.stats.userCount}</span>
                            <span class="stat-label">Teilnehmer</span>
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table class="data-table" id="run-results-table">
                            <thead>
                                <tr>
                                    <th>Teilnehmer</th>
                                    <th>Test</th>
                                    <th>Ergebnis</th>
                                    <th>Status</th>
                                    <th>Abgeschlossen</th>
                                    <th>Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${run.assignments.map(a => {
                                    let statusClass, statusText;
                                    if (a.status === 'completed') {
                                        if (a.passed) {
                                            statusClass = 'badge-success';
                                            statusText = 'Bestanden';
                                        } else {
                                            statusClass = 'badge-danger';
                                            statusText = 'Nicht bestanden';
                                        }
                                    } else {
                                        statusClass = 'badge-warning';
                                        statusText = 'Ausstehend';
                                    }
                                    
                                    return `
                                        <tr data-assignment-id="${a.id}" data-result-id="${a.resultId || ''}" class="${a.resultId ? 'clickable-row' : ''}">
                                            <td><strong>${Helpers.escapeHtml(a.userName)}</strong></td>
                                            <td>
                                                <strong>${Helpers.escapeHtml(a.testName)}</strong>
                                            </td>
                                            <td>
                                                ${a.status === 'completed' 
                                                    ? `<span class="result-percentage ${a.passed ? 'passed' : 'failed'}">${a.percentage}%</span>` 
                                                    : '<span class="text-muted">-</span>'}
                                            </td>
                                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                                            <td>${a.completedAt ? Helpers.formatDate(a.completedAt) : '<span class="text-muted">-</span>'}</td>
                                            <td>
                                                ${a.resultId ? `
                                                    <button class="btn btn-sm btn-secondary btn-view-result" data-result-id="${a.resultId}">
                                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                            <circle cx="12" cy="12" r="3"></circle>
                                                        </svg>
                                                        Details
                                                    </button>
                                                ` : ''}
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
            footer.style.justifyContent = 'flex-end';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-secondary';
            closeBtn.textContent = 'Schließen';
            closeBtn.addEventListener('click', () => Modal.close());
            footer.appendChild(closeBtn);

            Modal.open({
                title: `Test Durchlauf: ${run.runNumber}`,
                content,
                footer,
                size: 'full'
            });

            // Bind view result buttons
            content.querySelectorAll('.btn-view-result').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewResult(btn.dataset.resultId);
                });
            });

            // Bind click on rows with results
            content.querySelectorAll('tr[data-result-id]').forEach(row => {
                if (row.dataset.resultId) {
                    row.addEventListener('click', (e) => {
                        // Don't trigger if clicking on action buttons
                        if (e.target.closest('button')) return;
                        this.viewResult(row.dataset.resultId);
                    });
                }
            });
        } catch (error) {
            console.error('View run error:', error);
            Toast.error('Fehler beim Laden');
        }
    },

    /**
     * Views a specific result
     */
    async viewResult(resultId) {
        if (!resultId) return;

        try {
            const result = await window.api.knowledgeCheck.getResultById(resultId);
            if (!result.success) {
                Toast.error('Ergebnis konnte nicht geladen werden');
                return;
            }

            const data = result.result;
            
            const answersHtml = data.answers?.map((a, i) => {
                let answerDetailsHtml = '';
                
                if (a.questionType === 'multiple_choice') {
                    const details = a.optionDetails || {};
                    const allOptions = details.allOptions || [];
                    
                    if (allOptions.length > 0) {
                        // Show all options with their status
                        answerDetailsHtml = `
                            <div class="result-options">
                                ${allOptions.map(opt => {
                                    let optClass = '';
                                    let statusIcon = '';
                                    
                                    if (opt.wasSelected && opt.isCorrect) {
                                        optClass = 'option-correct-selected';
                                        statusIcon = '✓';
                                    } else if (opt.wasSelected && !opt.isCorrect) {
                                        optClass = 'option-incorrect-selected';
                                        statusIcon = '✗';
                                    } else if (!opt.wasSelected && opt.isCorrect) {
                                        optClass = 'option-correct-missed';
                                        statusIcon = '○';
                                    } else {
                                        optClass = 'option-not-selected';
                                        statusIcon = '';
                                    }
                                    
                                    return `
                                        <div class="result-option ${optClass}">
                                            <span class="option-status">${statusIcon}</span>
                                            <span class="option-text">${Helpers.escapeHtml(opt.text)}</span>
                                            ${opt.isCorrect ? '<span class="option-badge correct">Richtig</span>' : ''}
                                            ${opt.wasSelected ? '<span class="option-badge selected">Gewählt</span>' : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            ${details.allowPartialAnswer ? `
                                <p class="result-scoring-info">
                                    <small>Teilweise Antworten erlaubt · ${details.correctSelected || 0}/${details.totalCorrectOptions || 0} richtige gewählt, ${details.incorrectSelected || 0} falsche gewählt</small>
                                </p>
                            ` : ''}
                        `;
                    } else {
                        // Fallback for old data without option details
                        answerDetailsHtml = `<p class="result-answer-text">Ausgewählt: ${a.selectedOptions?.length || 0} Option(en)</p>`;
                    }
                } else {
                    // Open question
                    if (a.answerText) {
                        answerDetailsHtml = `<p class="result-answer-text"><strong>Antwort:</strong> ${Helpers.escapeHtml(a.answerText)}</p>`;
                    } else {
                        answerDetailsHtml = `<p class="result-answer-text text-muted"><em>Keine Antwort eingegeben</em></p>`;
                    }
                }
                
                return `
                    <div class="result-answer ${a.isCorrect ? 'correct' : 'incorrect'}">
                        <div class="result-answer-header">
                            <span>Frage ${i + 1}: ${Helpers.escapeHtml(a.questionTitle || Helpers.truncate(a.questionText, 40))}</span>
                            <span class="badge ${a.isCorrect ? 'badge-success' : 'badge-danger'}">${Math.round(a.score * 100) / 100}/${a.maxScore}</span>
                        </div>
                        <p class="result-question-text">${Helpers.escapeHtml(a.questionText)}</p>
                        ${answerDetailsHtml}
                    </div>
                `;
            }).join('') || '<p>Keine Antwortdetails verfügbar</p>';
            
            const contentHtml = `
                <div class="result-detail">
                    <div class="result-header">
                        <h3>${Helpers.escapeHtml(data.resultNumber)}</h3>
                        <p>${Helpers.escapeHtml(data.testName)} - ${Helpers.escapeHtml(data.userName)}</p>
                    </div>
                    
                    <div class="result-stats-row">
                        <div class="run-stat">
                            Ergebnis: <strong>${data.percentage}%</strong>
                        </div>
                        <div class="run-stat">
                            Punkte: <strong>${Math.round(data.totalScore * 100) / 100}/${data.maxScore}</strong>
                        </div>
                        <div class="run-stat">
                            Status: <span class="badge ${data.passed ? 'badge-success' : 'badge-danger'}">${data.passed ? 'Bestanden' : 'Nicht bestanden'}</span>
                        </div>
                        <div class="run-stat">
                            Datum: <strong>${Helpers.formatDate(data.completedAt)}</strong>
                        </div>
                    </div>
                    
                    <div class="result-answers">
                        <h4>Antworten</h4>
                        ${answersHtml}
                    </div>
                </div>
            `;

            const template = document.createElement('template');
            template.innerHTML = contentHtml.trim();
            const content = template.content.firstElementChild;

            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.justifyContent = 'flex-end';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-secondary';
            closeBtn.textContent = 'Schließen';
            closeBtn.addEventListener('click', () => Modal.close());
            footer.appendChild(closeBtn);

            Modal.open({
                title: 'Testergebnis Details',
                content,
                footer,
                size: 'xl'
            });
        } catch (error) {
            console.error('View result error:', error);
            Toast.error('Fehler beim Laden des Ergebnisses');
        }
    },

    /**
     * Deletes a test run
     */
    async deleteRun(runId) {
        const run = this.runs.find(r => r.id === runId);
        if (!run) return;

        const confirmed = await Modal.confirm({
            title: 'Test Durchlauf löschen',
            message: `Möchten Sie den Test Durchlauf "${run.name}" wirklich löschen? Alle zugehörigen Zuweisungen werden ebenfalls gelöscht.`,
            confirmText: 'Löschen',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const response = await window.api.knowledgeCheck.deleteTestRun(runId);
                if (response && response.success) {
                    Toast.success('Test Durchlauf gelöscht');
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
