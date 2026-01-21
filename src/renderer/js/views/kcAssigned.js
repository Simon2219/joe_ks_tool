/**
 * KC Assigned Tests View (Zugewiesene Tests)
 * Shows tests assigned to the current user and allows taking them
 */

const KCAssignedView = {
    assignments: [],
    eventsBound: false,

    /**
     * Initializes the assigned tests view
     */
    async init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        await this.loadAssignments();
        this.renderAssignments();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // No action buttons for users - they can only take assigned tests
    },

    /**
     * Loads user's assignments
     */
    async loadAssignments() {
        try {
            const result = await window.api.knowledgeCheck.getMyAssignments();
            if (result.success) {
                this.assignments = result.assignments;
            }
        } catch (error) {
            console.error('Failed to load assignments:', error);
            Toast.error('Zugewiesene Tests konnten nicht geladen werden');
        }
    },

    /**
     * Renders the assignments list
     */
    renderAssignments() {
        const container = document.getElementById('kc-assigned-list');
        if (!container) return;

        // Separate pending and completed assignments
        const pending = this.assignments.filter(a => a.status === 'pending');
        const completed = this.assignments.filter(a => a.status === 'completed');

        if (this.assignments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: var(--space-md);">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <h3>Keine zugewiesenen Tests</h3>
                    <p>Ihnen wurden noch keine Tests zugewiesen.</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Pending tests section
        if (pending.length > 0) {
            html += `
                <div class="assignment-section">
                    <h3 class="section-title">
                        <span class="badge badge-warning">${pending.length}</span>
                        Ausstehende Tests
                    </h3>
                    <div class="assignment-cards">
                        ${pending.map(a => this.renderAssignmentCard(a, true)).join('')}
                    </div>
                </div>
            `;
        }

        // Completed tests section
        if (completed.length > 0) {
            html += `
                <div class="assignment-section">
                    <h3 class="section-title">
                        <span class="badge badge-success">${completed.length}</span>
                        Abgeschlossene Tests
                    </h3>
                    <div class="assignment-cards">
                        ${completed.map(a => this.renderAssignmentCard(a, false)).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        this.bindCardActions();
    },

    /**
     * Renders a single assignment card
     */
    renderAssignmentCard(assignment, isPending) {
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && isPending;
        
        return `
            <div class="assignment-card ${isPending ? 'pending' : 'completed'} ${isOverdue ? 'overdue' : ''}" data-assignment-id="${assignment.id}">
                <div class="assignment-card-header">
                    <div class="assignment-test-info">
                        <span class="assignment-test-number">${Helpers.escapeHtml(assignment.testNumber)}</span>
                        <h4>${Helpers.escapeHtml(assignment.testName)}</h4>
                    </div>
                    ${isPending ? `
                        <button class="btn btn-primary btn-start-test" data-id="${assignment.id}" data-test-id="${assignment.testId}">
                            Test starten
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-view-result" data-id="${assignment.id}" data-result-id="${assignment.resultId}">
                            Ergebnis anzeigen
                        </button>
                    `}
                </div>
                <div class="assignment-card-meta">
                    <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>Zugewiesen von: ${Helpers.escapeHtml(assignment.assignedByName)}</span>
                    </div>
                    <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>Zugewiesen: ${Helpers.formatDate(assignment.createdAt)}</span>
                    </div>
                    ${dueDate ? `
                        <div class="meta-item ${isOverdue ? 'overdue-text' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>Fällig: ${Helpers.formatDate(assignment.dueDate)} ${isOverdue ? '(Überfällig!)' : ''}</span>
                        </div>
                    ` : ''}
                    <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span>Bestehensgrenze: ${assignment.passingScore}%</span>
                        ${!isPending && assignment.resultPercentage !== undefined ? `
                            <span class="result-label">· Ergebnis:</span>
                            <span class="badge ${assignment.resultPassed ? 'badge-success' : 'badge-danger'}">${assignment.resultPercentage}%</span>
                        ` : ''}
                    </div>
                    ${assignment.timeLimitMinutes ? `
                        <div class="meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>Zeitlimit: ${assignment.timeLimitMinutes} Minuten</span>
                        </div>
                    ` : ''}
                </div>
                ${assignment.notes ? `
                    <div class="assignment-notes">
                        <strong>Hinweise:</strong> ${Helpers.escapeHtml(assignment.notes)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Binds actions for assignment cards
     */
    bindCardActions() {
        // Double-click on card to start test or view result
        document.querySelectorAll('.assignment-card').forEach(card => {
            card.addEventListener('dblclick', () => {
                const startBtn = card.querySelector('.btn-start-test');
                const viewBtn = card.querySelector('.btn-view-result');
                if (startBtn) {
                    this.startAssignedTest(startBtn.dataset.id, startBtn.dataset.testId);
                } else if (viewBtn) {
                    this.viewResult(viewBtn.dataset.resultId);
                }
            });
            card.style.cursor = 'pointer';
        });

        // Start test buttons
        document.querySelectorAll('.btn-start-test').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startAssignedTest(btn.dataset.id, btn.dataset.testId);
            });
        });

        // View result buttons
        document.querySelectorAll('.btn-view-result').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewResult(btn.dataset.resultId);
            });
        });
    },

    /**
     * Starts an assigned test
     */
    async startAssignedTest(assignmentId, testId) {
        try {
            // Load the test
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

            // Get current user
            const userResult = await window.api.auth.getCurrentUser();
            if (!userResult.success) {
                Toast.error('Benutzer konnte nicht ermittelt werden');
                return;
            }

            // Show test taking modal
            this.showTestTakingModal(test, questionsWithOptions, userResult.user.id, assignmentId);
        } catch (error) {
            console.error('Start assigned test error:', error);
            Toast.error('Fehler beim Starten des Tests');
        }
    },

    /**
     * Shows the test taking modal
     */
    showTestTakingModal(test, questions, userId, assignmentId) {
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
            size: 'full'
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
                    let correctSelected = 0;
                    let incorrectSelected = 0;
                    let totalCorrectOptions = 0;
                    let allCorrect = true;

                    checkboxes.forEach(cb => {
                        const isCorrectOption = cb.dataset.correct === 'true';
                        if (isCorrectOption) totalCorrectOptions++;
                        
                        if (cb.checked) {
                            selectedOptions.push(cb.value);
                            if (isCorrectOption) {
                                correctSelected++;
                            } else {
                                incorrectSelected++;
                                allCorrect = false;
                            }
                        } else if (isCorrectOption) {
                            allCorrect = false;
                        }
                    });

                    let score = 0;
                    let isCorrect = allCorrect;

                    if (q.allowPartialAnswer) {
                        // Partial scoring: award points based on correct selections minus wrong selections
                        // Formula: (correct - wrong) / totalCorrect * weighting, minimum 0
                        const partialRatio = totalCorrectOptions > 0 
                            ? Math.max(0, (correctSelected - incorrectSelected) / totalCorrectOptions)
                            : 0;
                        score = partialRatio * weighting;
                        isCorrect = correctSelected > 0 && incorrectSelected === 0 && correctSelected === totalCorrectOptions;
                    } else {
                        // All-or-nothing scoring: must have all correct selected and no wrong selected
                        score = allCorrect ? weighting : 0;
                    }

                    totalScore += score;

                    answers.push({
                        questionId: q.id,
                        selectedOptions,
                        isCorrect: isCorrect,
                        score: score,
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
                    // Update assignment status
                    await window.api.knowledgeCheck.updateAssignment(assignmentId, {
                        status: 'completed',
                        resultId: createResult.result.id
                    });

                    Toast.success('Test abgeschlossen!');
                    Modal.close();
                    await this.loadAssignments();
                    this.renderAssignments();

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
     * Views a result
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
                size: 'xl'
            });
        } catch (error) {
            console.error('View result error:', error);
            Toast.error('Fehler beim Laden');
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadAssignments();
        this.renderAssignments();
    }
};

// Export for use in other modules
window.KCAssignedView = KCAssignedView;
