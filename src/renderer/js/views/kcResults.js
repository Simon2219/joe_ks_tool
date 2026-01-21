/**
 * KC Results View (Test Ergebnisse)
 * Shows individual test results
 */

const KCResultsView = {
    results: [],
    testRuns: [],
    users: [],
    filters: {
        runId: '',
        userId: '',
        startDate: '',
        endDate: ''
    },
    eventsBound: false,

    /**
     * Initializes the results view
     */
    async init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        await this.loadTestRuns();
        await this.loadUsers();
        await this.loadResults();
        await this.loadStatistics();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Export button
        document.getElementById('export-kc-results-btn')?.addEventListener('click', () => {
            this.exportResults();
        });

        // Filters
        document.getElementById('filter-kc-result-run')?.addEventListener('change', (e) => {
            this.filters.runId = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filter-kc-result-user')?.addEventListener('change', (e) => {
            this.filters.userId = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filter-kc-result-start')?.addEventListener('change', (e) => {
            this.filters.startDate = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filter-kc-result-end')?.addEventListener('change', (e) => {
            this.filters.endDate = e.target.value;
            this.applyFilters();
        });
    },

    /**
     * Loads all test runs for filter
     */
    async loadTestRuns() {
        try {
            const result = await window.api.knowledgeCheck.getTestRuns();
            if (result.success) {
                this.testRuns = result.runs;
                this.populateRunFilter();
            }
        } catch (error) {
            console.error('Failed to load test runs:', error);
        }
    },

    /**
     * Loads all users for filter
     */
    async loadUsers() {
        try {
            const result = await window.api.users.getAll();
            if (result.success) {
                this.users = result.users.filter(u => u.isActive);
                this.populateUserFilter();
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    },

    /**
     * Loads all results
     */
    async loadResults() {
        try {
            const result = await window.api.knowledgeCheck.getResults(this.filters);
            if (result.success) {
                this.results = result.results;
                this.renderTable();
            }
        } catch (error) {
            console.error('Failed to load KC results:', error);
            Toast.error('Ergebnisse konnten nicht geladen werden');
        }
    },

    /**
     * Loads statistics
     */
    async loadStatistics() {
        try {
            const result = await window.api.knowledgeCheck.getStatistics();
            if (result.success) {
                const stats = result.statistics;
                document.getElementById('kc-results-avg-score').textContent = `${stats.averageScore}%`;
                document.getElementById('kc-results-passing-rate').textContent = `${stats.passingRate}%`;
                document.getElementById('kc-results-total').textContent = stats.totalResults;
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    },

    /**
     * Populates the run filter dropdown
     */
    populateRunFilter() {
        const select = document.getElementById('filter-kc-result-run');
        if (!select) return;

        select.innerHTML = '<option value="">Alle Durchläufe</option>';
        this.testRuns.forEach(run => {
            const option = document.createElement('option');
            option.value = run.id;
            option.textContent = `${run.runNumber} - ${run.name}`;
            select.appendChild(option);
        });
    },

    /**
     * Populates the user filter dropdown
     */
    populateUserFilter() {
        const select = document.getElementById('filter-kc-result-user');
        if (!select) return;

        select.innerHTML = '<option value="">Alle Benutzer</option>';
        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.firstName} ${user.lastName}`;
            select.appendChild(option);
        });
    },

    /**
     * Applies filters
     */
    applyFilters() {
        this.loadResults();
    },

    /**
     * Renders the results table
     */
    renderTable() {
        const tbody = document.getElementById('kc-results-tbody');
        if (!tbody) return;

        if (this.results.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">Keine Ergebnisse gefunden</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.results.map(result => this.renderResultRow(result)).join('');

        // Bind click handlers - double click and button
        tbody.querySelectorAll('tr[data-id]').forEach(row => {
            row.addEventListener('dblclick', () => this.viewResult(row.dataset.id));
        });

        tbody.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewResult(btn.dataset.id);
            });
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteResult(btn.dataset.id);
            });
        });
    },

    /**
     * Renders a single result row
     */
    renderResultRow(result) {
        const scoreClass = result.passed ? 'score-pass' : 'score-fail';
        const statusBadge = result.passed ?
            '<span class="badge badge-success">Bestanden</span>' :
            '<span class="badge badge-danger">Nicht bestanden</span>';
        const canDelete = Permissions.canDelete('kcResult');

        return `
            <tr data-id="${result.id}" class="clickable-row">
                <td><strong>${Helpers.escapeHtml(result.resultNumber)}</strong></td>
                <td>${Helpers.escapeHtml(result.testName)}</td>
                <td>${Helpers.escapeHtml(result.userName)}</td>
                <td><span class="score-display ${scoreClass}">${result.percentage}%</span></td>
                <td>${statusBadge}</td>
                <td>${Helpers.formatDate(result.completedAt || result.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" data-id="${result.id}" title="Details anzeigen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        ${canDelete ? `
                            <button class="btn-icon btn-delete" data-id="${result.id}" title="Löschen">
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
     * Views a result's details
     */
    async viewResult(resultId) {
        try {
            const result = await window.api.knowledgeCheck.getResultById(resultId);
            if (!result.success) {
                Toast.error('Ergebnis konnte nicht geladen werden');
                return;
            }

            const data = result.result;
            const canEvaluate = result.canEvaluate;
            const scoreClass = data.passed ? 'score-pass' : 'score-fail';
            
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
                                    
                                    if (canEvaluate) {
                                        // Full evaluation view - show correct/incorrect status
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
                                    } else {
                                        // View only - just show what was selected
                                        if (opt.wasSelected) {
                                            optClass = 'option-selected-only';
                                            statusIcon = '●';
                                        } else {
                                            optClass = 'option-not-selected';
                                            statusIcon = '';
                                        }
                                    }
                                    
                                    return `
                                        <div class="result-option ${optClass}">
                                            <span class="option-status">${statusIcon}</span>
                                            <span class="option-text">${Helpers.escapeHtml(opt.text)}</span>
                                            ${canEvaluate && opt.isCorrect ? '<span class="option-badge correct">Richtig</span>' : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            ${canEvaluate && details.allowPartialAnswer ? `
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
                    <div class="result-answer ${canEvaluate ? (a.isCorrect ? 'correct' : 'incorrect') : ''}">
                        <div class="result-answer-header">
                            <span>Frage ${i + 1}: ${Helpers.escapeHtml(a.questionTitle || Helpers.truncate(a.questionText, 40))}</span>
                            ${canEvaluate ? `<span class="badge ${a.isCorrect ? 'badge-success' : 'badge-danger'}">${Math.round(a.score * 100) / 100}/${a.maxScore}</span>` : ''}
                        </div>
                        <p class="result-question-text">${Helpers.escapeHtml(a.questionText)}</p>
                        ${answerDetailsHtml}
                    </div>
                `;
            }).join('') || '<p>Keine Antwortdetails verfügbar</p>';

            const contentHtml = `
                <div class="result-detail">
                    <div class="result-summary">
                        <div class="result-score ${scoreClass}">
                            <span class="score-value">${data.percentage}%</span>
                            <span class="score-label">${data.passed ? 'Bestanden' : 'Nicht bestanden'}</span>
                        </div>
                        <div class="result-meta">
                            <div><strong>Ergebnis #:</strong> ${Helpers.escapeHtml(data.resultNumber)}</div>
                            <div><strong>Test:</strong> ${Helpers.escapeHtml(data.testName)}</div>
                            <div><strong>Teilnehmer:</strong> ${Helpers.escapeHtml(data.userName)}</div>
                            <div><strong>Datum:</strong> ${Helpers.formatDateTime(data.completedAt)}</div>
                            <div><strong>Punkte:</strong> ${Math.round(data.totalScore * 100) / 100}/${data.maxScore}</div>
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
                title: 'Ergebnis Details',
                content,
                footer,
                size: 'xl'
            });
        } catch (error) {
            console.error('View result error:', error);
            Toast.error('Fehler beim Laden');
        }
    },

    /**
     * Deletes a result
     */
    async deleteResult(resultId) {
        const confirmed = await Modal.confirm({
            title: 'Ergebnis löschen',
            message: 'Möchten Sie dieses Ergebnis wirklich löschen?',
            confirmText: 'Löschen',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const response = await window.api.knowledgeCheck.deleteResult(resultId);
                if (response && response.success) {
                    Toast.success('Ergebnis gelöscht');
                    await this.loadResults();
                    await this.loadStatistics();
                } else {
                    Toast.error(response?.error || 'Fehler beim Löschen');
                }
            } catch (error) {
                console.error('Delete result error:', error);
                Toast.error('Fehler beim Löschen');
            }
        }
    },

    /**
     * Exports results
     */
    async exportResults() {
        try {
            const result = await window.api.knowledgeCheck.exportResults(this.filters);
            if (result.success && result.csv) {
                Helpers.downloadFile(result.csv, 'test-ergebnisse.csv', 'text/csv');
                Toast.success('Export erfolgreich');
            } else {
                Toast.error(result?.error || 'Export fehlgeschlagen');
            }
        } catch (error) {
            console.error('Export error:', error);
            Toast.error('Export fehlgeschlagen');
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadResults();
        await this.loadStatistics();
    }
};

// Export for use in other modules
window.KCResultsView = KCResultsView;
