/**
 * KC Results View (Test Ergebnisse)
 * Shows test results
 */

const KCResultsView = {
    results: [],
    tests: [],
    users: [],
    filters: {
        testId: '',
        userId: '',
        startDate: '',
        endDate: ''
    },

    /**
     * Initializes the results view
     */
    async init() {
        this.bindEvents();
        await this.loadTests();
        await this.loadUsers();
        await this.loadResults();
        await this.loadStatistics();
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

        // Filters
        document.getElementById('filter-kc-result-test')?.addEventListener('change', (e) => {
            this.filters.testId = e.target.value;
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
     * Loads all tests for filter
     */
    async loadTests() {
        try {
            const result = await window.api.knowledgeCheck.getTests();
            if (result.success) {
                this.tests = result.tests;
                this.populateTestFilter();
            }
        } catch (error) {
            console.error('Failed to load tests:', error);
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
     * Populates the test filter dropdown
     */
    populateTestFilter() {
        const select = document.getElementById('filter-kc-result-test');
        if (!select) return;

        select.innerHTML = '<option value="">Alle Tests</option>';
        this.tests.forEach(test => {
            const option = document.createElement('option');
            option.value = test.id;
            option.textContent = `${test.testNumber} - ${test.name}`;
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

        // Bind click handlers
        tbody.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', () => this.viewResult(btn.dataset.id));
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.deleteResult(btn.dataset.id));
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
     * Shows form to create a new test result
     */
    async showNewResultForm() {
        // Check permissions
        if (!Permissions.canCreate('kcResult')) {
            Toast.error('Keine Berechtigung zum Durchführen von Tests');
            return;
        }
        
        if (this.tests.length === 0) {
            Toast.error('Keine Tests verfügbar. Erstellen Sie zuerst einen Test.');
            return;
        }

        const testOptions = this.tests.filter(t => t.isActive).map(t => ({
            value: t.id,
            label: `${t.testNumber} - ${t.name}`
        }));

        const userOptions = this.users.map(u => ({
            value: u.id,
            label: `${u.firstName} ${u.lastName}`
        }));

        const result = await Modal.form({
            title: 'Neuen Test durchführen',
            fields: [
                {
                    name: 'testId',
                    label: 'Test *',
                    type: 'select',
                    options: testOptions,
                    required: true,
                    placeholder: 'Test auswählen'
                },
                {
                    name: 'userId',
                    label: 'Benutzer *',
                    type: 'select',
                    options: userOptions,
                    required: true,
                    placeholder: 'Benutzer auswählen'
                }
            ],
            submitText: 'Test starten',
            validate: (data) => {
                if (!data.testId) return 'Bitte wählen Sie einen Test';
                if (!data.userId) return 'Bitte wählen Sie einen Benutzer';
                return null;
            }
        });

        if (result) {
            await this.startTest(result.testId, result.userId);
        }
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
