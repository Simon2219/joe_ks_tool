/**
 * KC Results View (Test Ergebnisse)
 * Shows all tests with their assignment and completion statistics
 */

const KCResultsView = {
    testsWithStats: [],
    testCategories: [],
    users: [],
    filters: {
        categoryId: ''
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
        await this.loadTestCategories();
        await this.loadUsers();
        await this.loadTestsWithStats();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // New result button
        document.getElementById('add-kc-result-btn')?.addEventListener('click', () => {
            this.showNewResultForm();
        });

        // Export button
        document.getElementById('export-kc-results-btn')?.addEventListener('click', () => {
            this.exportResults();
        });

        // Category filter
        document.getElementById('filter-kc-result-category')?.addEventListener('change', (e) => {
            this.filters.categoryId = e.target.value;
            this.applyFilters();
        });
    },

    /**
     * Loads all test categories for filter
     */
    async loadTestCategories() {
        try {
            const result = await window.api.knowledgeCheck.getTestCategories();
            if (result.success) {
                this.testCategories = result.categories;
                this.populateCategoryFilter();
            }
        } catch (error) {
            console.error('Failed to load test categories:', error);
        }
    },

    /**
     * Loads all users for assignment form
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
     * Loads all tests with their statistics
     */
    async loadTestsWithStats() {
        try {
            const result = await window.api.knowledgeCheck.getTestsWithStats(this.filters);
            if (result.success) {
                this.testsWithStats = result.tests;
                this.renderTable();
                this.updateStatistics();
            }
        } catch (error) {
            console.error('Failed to load tests with stats:', error);
            Toast.error('Tests konnten nicht geladen werden');
        }
    },

    /**
     * Updates the statistics cards
     */
    updateStatistics() {
        const tests = this.testsWithStats;
        const totalAssigned = tests.reduce((sum, t) => sum + t.assignedCount, 0);
        const totalCompleted = tests.reduce((sum, t) => sum + t.completedCount, 0);
        const avgScores = tests.filter(t => t.avgScore !== null).map(t => t.avgScore);
        const avgScore = avgScores.length > 0 ? Math.round(avgScores.reduce((a, b) => a + b, 0) / avgScores.length) : 0;

        document.getElementById('kc-results-avg-score').textContent = `${avgScore}%`;
        document.getElementById('kc-results-passing-rate').textContent = totalAssigned > 0 ? `${Math.round((totalCompleted / totalAssigned) * 100)}%` : '0%';
        document.getElementById('kc-results-total').textContent = tests.length;
    },

    /**
     * Populates the category filter dropdown
     */
    populateCategoryFilter() {
        const select = document.getElementById('filter-kc-result-category');
        if (!select) return;

        select.innerHTML = '<option value="">Alle Kategorien</option>';
        this.testCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    },

    /**
     * Applies filters
     */
    applyFilters() {
        this.loadTestsWithStats();
    },

    /**
     * Renders the tests table
     */
    renderTable() {
        const tbody = document.getElementById('kc-results-tbody');
        if (!tbody) return;

        if (this.testsWithStats.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">Keine Tests gefunden</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.testsWithStats.map(test => this.renderTestRow(test)).join('');

        // Bind click handlers
        tbody.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', () => this.viewTestResults(btn.dataset.id));
        });

        tbody.querySelectorAll('.btn-assign').forEach(btn => {
            btn.addEventListener('click', () => this.assignTest(btn.dataset.id));
        });
    },

    /**
     * Renders a single test row
     */
    renderTestRow(test) {
        const hasCompletions = test.completedCount > 0;
        const avgScoreDisplay = test.avgScore !== null ? `${test.avgScore}%` : '-';
        const passRate = test.totalResults > 0 ? `${Math.round((test.passedCount / test.totalResults) * 100)}%` : '-';
        
        // Determine status
        let status, statusClass;
        if (test.assignedCount === 0) {
            status = 'Nicht zugewiesen';
            statusClass = 'badge-secondary';
        } else if (test.pendingCount > 0 && test.completedCount === 0) {
            status = 'Ausstehend';
            statusClass = 'badge-warning';
        } else if (test.pendingCount > 0) {
            status = 'In Bearbeitung';
            statusClass = 'badge-info';
        } else {
            status = 'Abgeschlossen';
            statusClass = 'badge-success';
        }

        const canAssign = Permissions.has('kc_assign_tests');

        return `
            <tr>
                <td><strong>${Helpers.escapeHtml(test.testNumber)}</strong></td>
                <td>${Helpers.escapeHtml(test.name)}</td>
                <td>
                    <span class="assignment-count">
                        <strong>${test.assignedCount}</strong> zugewiesen
                        ${test.pendingCount > 0 ? `<span class="text-muted">(${test.pendingCount} ausstehend)</span>` : ''}
                    </span>
                </td>
                <td>${avgScoreDisplay}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td>${Helpers.formatDate(test.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" data-id="${test.id}" title="Ergebnisse anzeigen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        ${canAssign ? `
                            <button class="btn-icon btn-assign" data-id="${test.id}" title="Test zuweisen">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    },

    /**
     * Shows results for a specific test
     */
    async viewTestResults(testId) {
        const test = this.testsWithStats.find(t => t.id === testId);
        if (!test) return;

        try {
            // Load results for this test
            const result = await window.api.knowledgeCheck.getResults({ testId });
            if (!result.success) {
                Toast.error('Ergebnisse konnten nicht geladen werden');
                return;
            }

            // Load assignments for this test
            const assignmentsResult = await window.api.knowledgeCheck.getAssignments({ testId });
            const assignments = assignmentsResult.success ? assignmentsResult.assignments : [];

            // Build content showing assignments and their status
            let contentHtml = `
                <div class="test-results-detail">
                    <div class="test-detail-header">
                        <h3>${Helpers.escapeHtml(test.testNumber)} - ${Helpers.escapeHtml(test.name)}</h3>
                        <div class="test-stats-row">
                            <span><strong>${test.assignedCount}</strong> zugewiesen</span>
                            <span><strong>${test.completedCount}</strong> abgeschlossen</span>
                            <span><strong>${test.pendingCount}</strong> ausstehend</span>
                            ${test.avgScore !== null ? `<span>Durchschnitt: <strong>${test.avgScore}%</strong></span>` : ''}
                        </div>
                    </div>
                    <div class="assignments-list">
                        <h4>Zuweisungen</h4>
                        ${assignments.length === 0 ? '<p class="empty-state">Keine Zuweisungen</p>' : `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Benutzer</th>
                                        <th>Zugewiesen am</th>
                                        <th>Fällig</th>
                                        <th>Status</th>
                                        <th>Ergebnis</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${assignments.map(a => {
                                        const matchingResult = result.results.find(r => r.userId === a.userId);
                                        const statusClass = a.status === 'completed' ? 'badge-success' : 'badge-warning';
                                        const statusText = a.status === 'completed' ? 'Abgeschlossen' : 'Ausstehend';
                                        return `
                                            <tr>
                                                <td>${Helpers.escapeHtml(a.userName)}</td>
                                                <td>${Helpers.formatDate(a.createdAt)}</td>
                                                <td>${a.dueDate ? Helpers.formatDate(a.dueDate) : '-'}</td>
                                                <td><span class="badge ${statusClass}">${statusText}</span></td>
                                                <td>${matchingResult ? `${matchingResult.percentage}% ${matchingResult.passed ? '✓' : '✗'}` : '-'}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        `}
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
                title: 'Test Ergebnisse',
                content,
                footer,
                size: 'lg'
            });
        } catch (error) {
            console.error('View test results error:', error);
            Toast.error('Fehler beim Laden der Ergebnisse');
        }
    },

    /**
     * Shows form to assign a test
     */
    async assignTest(testId) {
        const test = this.testsWithStats.find(t => t.id === testId);
        if (!test) return;

        // Build assignment form with multi-user selection
        const formHtml = `
            <div class="assign-test-form">
                <div class="form-group">
                    <label>Test</label>
                    <input type="text" class="form-input" value="${Helpers.escapeHtml(test.testNumber)} - ${Helpers.escapeHtml(test.name)}" readonly>
                </div>
                <div class="form-group">
                    <label>Benutzer auswählen *</label>
                    <div style="margin-bottom: var(--space-xs);">
                        <button type="button" class="btn btn-sm btn-secondary" id="assign-select-all">Alle</button>
                        <button type="button" class="btn btn-sm btn-secondary" id="assign-deselect-all">Keine</button>
                    </div>
                    <div class="user-checkboxes" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: var(--space-sm);">
                        ${this.users.map(u => `
                            <label class="form-checkbox" style="display: flex; padding: var(--space-xs) 0;">
                                <input type="checkbox" name="assignUserIds" value="${u.id}">
                                <span>${Helpers.escapeHtml(u.firstName)} ${Helpers.escapeHtml(u.lastName)}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label for="assign-due-date">Fälligkeitsdatum (optional)</label>
                    <input type="date" id="assign-due-date" class="form-input">
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
        submitBtn.textContent = 'Zuweisen';

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title: `Test zuweisen: ${test.testNumber}`,
            content,
            footer,
            size: 'default'
        });

        // Select all / deselect all
        document.getElementById('assign-select-all')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="assignUserIds"]').forEach(cb => cb.checked = true);
        });
        document.getElementById('assign-deselect-all')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="assignUserIds"]').forEach(cb => cb.checked = false);
        });

        // Submit handler
        submitBtn.addEventListener('click', async () => {
            const selectedUsers = Array.from(document.querySelectorAll('input[name="assignUserIds"]:checked')).map(cb => cb.value);
            const dueDate = document.getElementById('assign-due-date')?.value || null;

            if (selectedUsers.length === 0) {
                Toast.error('Bitte wählen Sie mindestens einen Benutzer');
                return;
            }

            let successCount = 0;
            for (const userId of selectedUsers) {
                try {
                    const response = await window.api.knowledgeCheck.createAssignment({
                        testId: test.id,
                        userId,
                        dueDate
                    });
                    if (response && response.success) successCount++;
                } catch (error) {
                    console.error('Assignment error:', error);
                }
            }

            Modal.close();

            if (successCount > 0) {
                Toast.success(`Test wurde ${successCount} Benutzer(n) zugewiesen`);
                await this.loadTestsWithStats();
            } else {
                Toast.error('Fehler beim Zuweisen');
            }
        });
    },

    /**
     * Legacy: Renders a single result row (kept for compatibility)
     */
    renderResultRow(result) {
        const scoreClass = result.passed ? 'score-pass' : 'score-fail';
        const statusBadge = result.passed ?
            '<span class="badge badge-success">Bestanden</span>' :
            '<span class="badge badge-danger">Nicht bestanden</span>';
        const canDelete = Permissions.canDelete('kcResult');

        return `
            <tr data-id="${result.id}">
                <td><strong>${Helpers.escapeHtml(result.resultNumber)}</strong></td>
                <td>${Helpers.escapeHtml(result.testName)}</td>
                <td>${Helpers.escapeHtml(result.userName)}</td>
                <td><span class="score-display ${scoreClass}">${result.percentage}%</span></td>
                <td>${statusBadge}</td>
                <td>${Helpers.formatDate(result.completedAt || result.createdAt)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-view" data-id="${result.id}" title="Anzeigen">
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
     * Shows form to assign a test to users
     */
    async showNewResultForm() {
        // Check permissions
        const canAssign = Permissions.has('kc_assign_tests');
        
        if (!canAssign) {
            Toast.error('Keine Berechtigung zum Zuweisen von Tests');
            return;
        }
        
        if (this.testsWithStats.length === 0) {
            Toast.error('Keine Tests verfügbar. Erstellen Sie zuerst einen Test.');
            return;
        }

        const tests = this.testsWithStats.filter(t => t.isActive);
        const users = this.users;

        // Build form for multi-user assignment
        const formHtml = `
            <div class="new-test-form">
                <div class="form-group">
                    <label for="new-test-select">Test *</label>
                    <select id="new-test-select" class="form-select" required>
                        <option value="">Test auswählen</option>
                        ${tests.map(t => `<option value="${t.id}">${Helpers.escapeHtml(t.testNumber)} - ${Helpers.escapeHtml(t.name)}</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Benutzer auswählen *</label>
                    <div style="margin-bottom: var(--space-xs);">
                        <button type="button" class="btn btn-sm btn-secondary" id="new-test-select-all">Alle</button>
                        <button type="button" class="btn btn-sm btn-secondary" id="new-test-deselect-all">Keine</button>
                    </div>
                    <div class="user-checkboxes" style="max-height: 180px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: var(--space-sm);">
                        ${users.map(u => `
                            <label class="form-checkbox" style="display: flex; padding: var(--space-xs) 0;">
                                <input type="checkbox" name="assignUserIds" value="${u.id}">
                                <span>${Helpers.escapeHtml(u.firstName)} ${Helpers.escapeHtml(u.lastName)}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="new-test-due-date">Fälligkeitsdatum (optional)</label>
                    <input type="date" id="new-test-due-date" class="form-input">
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
        submitBtn.textContent = 'Zuweisen';

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title: 'Test zuweisen',
            content,
            footer,
            size: 'default'
        });

        // Select all / deselect all
        document.getElementById('new-test-select-all')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="assignUserIds"]').forEach(cb => cb.checked = true);
        });
        document.getElementById('new-test-deselect-all')?.addEventListener('click', () => {
            document.querySelectorAll('input[name="assignUserIds"]').forEach(cb => cb.checked = false);
        });

        // Submit handler
        submitBtn.addEventListener('click', async () => {
            const testId = document.getElementById('new-test-select')?.value;
            if (!testId) {
                Toast.error('Bitte wählen Sie einen Test');
                return;
            }

            const selectedUsers = Array.from(document.querySelectorAll('input[name="assignUserIds"]:checked')).map(cb => cb.value);
            const dueDate = document.getElementById('new-test-due-date')?.value || null;

            if (selectedUsers.length === 0) {
                Toast.error('Bitte wählen Sie mindestens einen Benutzer');
                return;
            }

            let successCount = 0;
            for (const userId of selectedUsers) {
                try {
                    const response = await window.api.knowledgeCheck.createAssignment({
                        testId,
                        userId,
                        dueDate
                    });
                    if (response && response.success) successCount++;
                } catch (error) {
                    console.error('Assignment error:', error);
                }
            }

            Modal.close();

            if (successCount > 0) {
                Toast.success(`Test wurde ${successCount} Benutzer(n) zugewiesen`);
                await this.loadTestsWithStats();
            } else {
                Toast.error('Fehler beim Zuweisen');
            }
        });
    },

    /**
     * Starts a test and opens the test taking interface
     */
    async startTest(testId, userId) {
        try {
            const testResult = await window.api.knowledgeCheck.getTestById(testId);
            if (!testResult.success) {
                Toast.error('Test konnte nicht geladen werden');
                return;
            }

            const test = testResult.test;
            
            // Load questions with their options
            const questionsWithOptions = [];
            for (const tq of test.questions) {
                const qResult = await window.api.knowledgeCheck.getQuestionById(tq.questionId);
                if (qResult.success) {
                    questionsWithOptions.push(qResult.question);
                }
            }

            if (questionsWithOptions.length === 0) {
                Toast.error('Der Test enthält keine Fragen');
                return;
            }

            // Show test taking modal
            this.showTestTakingModal(test, questionsWithOptions, userId);
        } catch (error) {
            console.error('Start test error:', error);
            Toast.error('Fehler beim Starten des Tests');
        }
    },

    /**
     * Shows the test taking modal
     */
    showTestTakingModal(test, questions, userId) {
        const startTime = new Date().toISOString();
        
        let questionsHtml = questions.map((q, index) => `
            <div class="test-question" data-question-id="${q.id}" data-question-index="${index}">
                <div class="test-question-header">
                    <span class="test-question-number">Frage ${index + 1} von ${questions.length}</span>
                    ${q.effectiveWeighting > 1 ? `<span class="badge badge-info">Gewichtung: ${q.effectiveWeighting}</span>` : ''}
                </div>
                ${q.title ? `<h4>${Helpers.escapeHtml(q.title)}</h4>` : ''}
                <p class="test-question-text">${Helpers.escapeHtml(q.questionText)}</p>
                
                ${q.questionType === 'multiple_choice' ? `
                    <div class="test-options">
                        ${q.options.map((opt, oi) => `
                            <label class="test-option">
                                <input type="checkbox" name="q_${q.id}" value="${opt.id}" data-correct="${opt.isCorrect}">
                                <span>${Helpers.escapeHtml(opt.text)}</span>
                            </label>
                        `).join('')}
                    </div>
                ` : `
                    <div class="test-answer-input">
                        <textarea name="q_${q.id}" class="form-textarea" rows="3" placeholder="Ihre Antwort..."></textarea>
                    </div>
                `}
            </div>
        `).join('');

        const formHtml = `
            <div class="test-taking-container">
                <div class="test-info">
                    <h3>${Helpers.escapeHtml(test.name)}</h3>
                    <p>${questions.length} Fragen · Bestehensgrenze: ${test.passingScore}%</p>
                </div>
                <form id="test-taking-form">
                    ${questionsHtml}
                </form>
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
        submitBtn.textContent = 'Test abschließen';

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title: `Test: ${test.testNumber}`,
            content,
            footer,
            size: 'lg'
        });

        // Submit handler
        submitBtn.addEventListener('click', async () => {
            const answers = [];
            let totalScore = 0;
            let maxScore = 0;

            for (const q of questions) {
                const weighting = q.effectiveWeighting || 1;
                maxScore += weighting;

                if (q.questionType === 'multiple_choice') {
                    const checkboxes = document.querySelectorAll(`input[name="q_${q.id}"]`);
                    const selectedOptions = [];
                    let questionCorrect = true;
                    let correctCount = 0;
                    let totalCorrect = 0;

                    checkboxes.forEach(cb => {
                        const isCorrectOption = cb.dataset.correct === 'true';
                        if (isCorrectOption) totalCorrect++;
                        
                        if (cb.checked) {
                            selectedOptions.push(cb.value);
                            if (!isCorrectOption) questionCorrect = false;
                        } else if (isCorrectOption) {
                            questionCorrect = false;
                        }

                        if (cb.checked && isCorrectOption) correctCount++;
                    });

                    // Partial scoring for MC
                    const mcScore = totalCorrect > 0 ? (correctCount / totalCorrect) * weighting : 0;
                    totalScore += questionCorrect ? weighting : mcScore;

                    answers.push({
                        questionId: q.id,
                        selectedOptions,
                        isCorrect: questionCorrect,
                        score: questionCorrect ? weighting : mcScore,
                        maxScore: weighting
                    });
                } else {
                    const textarea = document.querySelector(`textarea[name="q_${q.id}"]`);
                    const answerText = textarea?.value?.trim() || '';
                    
                    // Check answer
                    const checkResult = await window.api.knowledgeCheck.checkAnswer(
                        answerText, 
                        q.exactAnswer, 
                        q.triggerWords
                    );

                    const isCorrect = checkResult.success && checkResult.isCorrect;
                    const score = isCorrect ? weighting : 0;
                    totalScore += score;

                    answers.push({
                        questionId: q.id,
                        answerText,
                        isCorrect,
                        score,
                        maxScore: weighting,
                        evaluatorNotes: checkResult.success ? `Matched: ${checkResult.matchedTriggers?.join(', ') || 'none'}` : ''
                    });
                }
            }

            // Create result
            try {
                const createResult = await window.api.knowledgeCheck.createResult({
                    testId: test.id,
                    userId,
                    startedAt: startTime,
                    completedAt: new Date().toISOString(),
                    totalScore,
                    maxScore,
                    answers
                });

                if (createResult.success) {
                    Toast.success('Test abgeschlossen!');
                    Modal.close();
                    await this.loadResults();
                    await this.loadStatistics();

                    // Show results
                    setTimeout(() => {
                        this.viewResult(createResult.result.id);
                    }, 500);
                } else {
                    Toast.error(createResult.error || 'Fehler beim Speichern');
                }
            } catch (error) {
                console.error('Submit test error:', error);
                Toast.error('Fehler beim Speichern des Tests');
            }
        });
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
            const scoreClass = data.passed ? 'score-pass' : 'score-fail';
            
            const answersHtml = data.answers?.map((a, i) => `
                <div class="result-answer ${a.isCorrect ? 'correct' : 'incorrect'}">
                    <div class="result-answer-header">
                        <span>Frage ${i + 1}: ${Helpers.escapeHtml(a.questionTitle || Helpers.truncate(a.questionText, 40))}</span>
                        <span class="badge ${a.isCorrect ? 'badge-success' : 'badge-danger'}">${a.score}/${a.maxScore}</span>
                    </div>
                    ${a.answerText ? `<p class="result-answer-text">Antwort: ${Helpers.escapeHtml(a.answerText)}</p>` : ''}
                    ${a.selectedOptions?.length > 0 ? `<p class="result-answer-text">Ausgewählt: ${a.selectedOptions.length} Option(en)</p>` : ''}
                </div>
            `).join('') || '<p>Keine Antwortdetails verfügbar</p>';

            const contentHtml = `
                <div class="result-detail">
                    <div class="result-summary">
                        <div class="result-score ${scoreClass}">
                            <span class="score-value">${data.percentage}%</span>
                            <span class="score-label">${data.passed ? 'Bestanden' : 'Nicht bestanden'}</span>
                        </div>
                        <div class="result-meta">
                            <div><strong>Test:</strong> ${Helpers.escapeHtml(data.testName)}</div>
                            <div><strong>Benutzer:</strong> ${Helpers.escapeHtml(data.userName)}</div>
                            <div><strong>Datum:</strong> ${Helpers.formatDateTime(data.completedAt)}</div>
                            <div><strong>Punkte:</strong> ${data.totalScore}/${data.maxScore}</div>
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
                title: `Ergebnis: ${data.resultNumber}`,
                content,
                footer,
                size: 'lg'
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
        // Check permissions
        if (!Permissions.canDelete('kcResult')) {
            Toast.error('Keine Berechtigung zum Löschen von Ergebnissen');
            return;
        }
        
        const result = this.results.find(r => r.id === resultId);
        if (!result) return;

        const confirmed = await Modal.confirm({
            title: 'Ergebnis löschen',
            message: `Möchten Sie das Ergebnis "${result.resultNumber}" wirklich löschen?`,
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
                    Toast.error(response?.error || 'Fehler beim Löschen des Ergebnisses');
                }
            } catch (error) {
                console.error('Delete result error:', error);
                Toast.error('Fehler beim Löschen: ' + (error.message || 'Unbekannter Fehler'));
            }
        }
    },

    /**
     * Exports results
     */
    async exportResults() {
        try {
            const result = await window.api.knowledgeCheck.exportResults(this.filters);
            if (result.success) {
                Helpers.downloadFile(result.data, 'knowledge_check_results.csv', 'text/csv');
                Toast.success('Export erfolgreich');
            } else {
                Toast.error(result.error || 'Export fehlgeschlagen');
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
