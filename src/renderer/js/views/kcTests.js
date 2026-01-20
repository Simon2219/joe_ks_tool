/**
 * KC Tests View (Test Katalog)
 * Manages the test catalog
 */

const KCTestsView = {
    tests: [],
    categories: [],
    questions: [],
    filters: {
        categoryId: ''
    },

    /**
     * Initializes the tests view
     */
    async init() {
        this.bindEvents();
        await this.loadCategories();
        await this.loadQuestions();
        await this.loadTests();
        this.renderTestList();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Add test button
        document.getElementById('add-kc-test-btn')?.addEventListener('click', () => {
            this.showTestForm();
        });

        // Category filter
        document.getElementById('filter-kc-test-category')?.addEventListener('change', (e) => {
            this.filters.categoryId = e.target.value;
            this.renderTestList();
        });
    },

    /**
     * Loads all categories
     */
    async loadCategories() {
        try {
            const result = await window.api.knowledgeCheck.getCategories();
            if (result.success) {
                this.categories = result.categories;
                this.populateCategoryFilter();
            }
        } catch (error) {
            console.error('Failed to load KC categories:', error);
        }
    },

    /**
     * Loads all questions (for test creation)
     */
    async loadQuestions() {
        try {
            const result = await window.api.knowledgeCheck.getQuestions({ isActive: true });
            if (result.success) {
                this.questions = result.questions;
            }
        } catch (error) {
            console.error('Failed to load KC questions:', error);
        }
    },

    /**
     * Loads all tests
     */
    async loadTests() {
        try {
            const result = await window.api.knowledgeCheck.getTests(this.filters);
            if (result.success) {
                this.tests = result.tests;
            }
        } catch (error) {
            console.error('Failed to load KC tests:', error);
            Toast.error('Tests konnten nicht geladen werden');
        }
    },

    /**
     * Populates the category filter dropdown
     */
    populateCategoryFilter() {
        const select = document.getElementById('filter-kc-test-category');
        if (!select) return;

        select.innerHTML = '<option value="">Alle Kategorien</option>';
        this.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    },

    /**
     * Renders the test list
     */
    renderTestList() {
        const container = document.getElementById('kc-tests-list');
        if (!container) return;

        // Filter tests
        let filteredTests = this.tests;
        if (this.filters.categoryId) {
            filteredTests = this.tests.filter(t => t.categoryId === this.filters.categoryId);
        }

        if (filteredTests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Keine Tests vorhanden</h3>
                    <p>Erstellen Sie einen Test, um Fragen zu gruppieren.</p>
                </div>
            `;
            return;
        }

        // Group tests by category
        const grouped = this.groupTestsByCategory(filteredTests);
        let html = '';

        for (const [categoryId, tests] of Object.entries(grouped)) {
            const category = this.categories.find(c => c.id === categoryId);
            html += `
                <div class="kc-category" data-category-id="${categoryId}">
                    <div class="kc-category-header">
                        <button class="kc-category-toggle btn-icon" title="Ein-/Ausklappen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        <div class="kc-category-info">
                            <h3>${category ? Helpers.escapeHtml(category.name) : 'Unkategorisiert'}</h3>
                            <span class="kc-category-meta">${tests.length} Tests</span>
                        </div>
                    </div>
                    <div class="kc-category-content">
                        ${tests.map(t => this.renderTestItem(t)).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        this.bindTestActions();
    },

    /**
     * Groups tests by category
     */
    groupTestsByCategory(tests) {
        const groups = {};
        
        tests.forEach(t => {
            const catId = t.categoryId || 'uncategorized';
            if (!groups[catId]) groups[catId] = [];
            groups[catId].push(t);
        });
        
        return groups;
    },

    /**
     * Renders a single test item
     */
    renderTestItem(test) {
        const canEdit = Permissions.canEdit('kcTest');
        const canDelete = Permissions.canDelete('kcTest');
        
        return `
            <div class="kc-question-item kc-test-item" data-test-id="${test.id}">
                <div class="kc-question-content">
                    <div class="kc-question-title">
                        <strong>${Helpers.escapeHtml(test.testNumber)}</strong> - ${Helpers.escapeHtml(test.name)}
                    </div>
                    ${test.description ? `<div class="kc-question-text">${Helpers.escapeHtml(Helpers.truncate(test.description, 100))}</div>` : ''}
                    <div class="kc-question-meta">
                        <span class="badge badge-info">${test.questionCount} Fragen</span>
                        <span class="badge badge-secondary">Bestehen: ${test.passingScore}%</span>
                        ${test.timeLimitMinutes ? `<span class="badge badge-warning">${test.timeLimitMinutes} Min.</span>` : ''}
                        ${!test.isActive ? '<span class="badge badge-danger">Inaktiv</span>' : ''}
                    </div>
                </div>
                <div class="kc-question-actions">
                    <button class="btn-icon kc-view-test" data-id="${test.id}" title="Anzeigen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    ${canEdit ? `
                        <button class="btn-icon kc-edit-test" data-id="${test.id}" title="Bearbeiten">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="btn-icon kc-delete-test" data-id="${test.id}" title="Löschen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Binds test actions
     */
    bindTestActions() {
        // Category toggle
        document.querySelectorAll('#kc-tests-list .kc-category-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.closest('.kc-category');
                if (category) category.classList.toggle('collapsed');
            });
        });

        // View test
        document.querySelectorAll('.kc-view-test').forEach(btn => {
            btn.addEventListener('click', () => this.viewTest(btn.dataset.id));
        });

        // Edit test
        document.querySelectorAll('.kc-edit-test').forEach(btn => {
            btn.addEventListener('click', () => this.editTest(btn.dataset.id));
        });

        // Delete test
        document.querySelectorAll('.kc-delete-test').forEach(btn => {
            btn.addEventListener('click', () => this.deleteTest(btn.dataset.id));
        });
    },

    /**
     * Shows the test form
     */
    async showTestForm(test = null) {
        const isEdit = !!test;
        
        // Check permissions
        if (isEdit && !Permissions.canEdit('kcTest')) {
            Toast.error('Keine Berechtigung zum Bearbeiten von Tests');
            return;
        }
        if (!isEdit && !Permissions.canCreate('kcTest')) {
            Toast.error('Keine Berechtigung zum Erstellen von Tests');
            return;
        }
        
        const title = isEdit ? 'Test bearbeiten' : 'Neuer Test';

        // Get selected question IDs if editing
        let selectedQuestionIds = [];
        if (isEdit && test.questions) {
            selectedQuestionIds = test.questions.map(q => q.questionId);
        }

        // Group questions by category for display
        const groupedQuestions = {};
        this.questions.forEach(q => {
            const catName = q.categoryName || 'Unkategorisiert';
            if (!groupedQuestions[catName]) groupedQuestions[catName] = [];
            groupedQuestions[catName].push(q);
        });

        const categoryOptions = this.categories.map(c => 
            `<option value="${c.id}" ${test?.categoryId === c.id ? 'selected' : ''}>${Helpers.escapeHtml(c.name)}</option>`
        ).join('');

        const questionCheckboxes = Object.entries(groupedQuestions).map(([catName, questions]) => `
            <div class="kc-question-select-category">
                <div class="kc-question-select-header">
                    <strong>${Helpers.escapeHtml(catName)}</strong>
                    <button type="button" class="btn btn-sm btn-secondary select-all-cat" data-category="${catName}">Alle</button>
                </div>
                ${questions.map(q => `
                    <label class="kc-question-checkbox">
                        <input type="checkbox" name="questions" value="${q.id}" ${selectedQuestionIds.includes(q.id) ? 'checked' : ''}>
                        <span>${Helpers.escapeHtml(q.title || Helpers.truncate(q.questionText, 50))}</span>
                    </label>
                `).join('')}
            </div>
        `).join('');

        const formHtml = `
            <form id="test-form" class="test-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="t-name">Name *</label>
                        <input type="text" id="t-name" name="name" class="form-input" value="${Helpers.escapeHtml(test?.name || '')}" required placeholder="Testname">
                    </div>
                    <div class="form-group">
                        <label for="t-category">Kategorie</label>
                        <select id="t-category" name="categoryId" class="form-select">
                            <option value="">Keine Kategorie</option>
                            ${categoryOptions}
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="t-description">Beschreibung</label>
                    <textarea id="t-description" name="description" class="form-textarea" rows="2" placeholder="Beschreibung des Tests">${Helpers.escapeHtml(test?.description || '')}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="t-passing">Bestehensgrenze (%)</label>
                        <input type="number" id="t-passing" name="passingScore" class="form-input" min="0" max="100" value="${test?.passingScore || 80}">
                    </div>
                    <div class="form-group">
                        <label for="t-time">Zeitlimit (Minuten)</label>
                        <input type="number" id="t-time" name="timeLimitMinutes" class="form-input" min="0" value="${test?.timeLimitMinutes || ''}" placeholder="Unbegrenzt">
                    </div>
                </div>
                
                ${isEdit ? `
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="t-active" name="isActive" ${test?.isActive !== false ? 'checked' : ''}>
                            <span>Test ist aktiv</span>
                        </label>
                    </div>
                ` : ''}
                
                <div class="form-group">
                    <label>Fragen auswählen</label>
                    <div class="kc-question-select-container">
                        ${questionCheckboxes || '<p class="empty-state">Keine Fragen verfügbar. Erstellen Sie zuerst Fragen im Fragen Katalog.</p>'}
                    </div>
                </div>
            </form>
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
        submitBtn.textContent = isEdit ? 'Speichern' : 'Erstellen';

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title,
            content,
            footer,
            size: 'lg'
        });

        // Bind select all buttons
        document.querySelectorAll('.select-all-cat').forEach(btn => {
            btn.addEventListener('click', () => {
                const container = btn.closest('.kc-question-select-category');
                const checkboxes = container.querySelectorAll('input[type="checkbox"]');
                const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                checkboxes.forEach(cb => cb.checked = !allChecked);
            });
        });

        // Submit handler
        submitBtn.addEventListener('click', async () => {
            const name = document.getElementById('t-name').value.trim();
            if (!name) {
                Toast.error('Bitte geben Sie einen Namen ein');
                return;
            }

            const selectedQuestions = Array.from(document.querySelectorAll('input[name="questions"]:checked')).map(cb => cb.value);

            const data = {
                name,
                description: document.getElementById('t-description').value.trim(),
                categoryId: document.getElementById('t-category').value || null,
                passingScore: parseInt(document.getElementById('t-passing').value) || 80,
                timeLimitMinutes: parseInt(document.getElementById('t-time').value) || null,
                questionIds: selectedQuestions
            };

            if (isEdit) {
                const activeCheckbox = document.getElementById('t-active');
                if (activeCheckbox) {
                    data.isActive = activeCheckbox.checked;
                }
            }

            try {
                if (isEdit) {
                    await window.api.knowledgeCheck.updateTest(test.id, data);
                    Toast.success('Test aktualisiert');
                } else {
                    await window.api.knowledgeCheck.createTest(data);
                    Toast.success('Test erstellt');
                }
                Modal.close();
                await this.loadTests();
                this.renderTestList();
            } catch (error) {
                console.error('Test save error:', error);
                Toast.error('Fehler beim Speichern');
            }
        });
    },

    /**
     * Views a test's details
     */
    async viewTest(testId) {
        try {
            const result = await window.api.knowledgeCheck.getTestById(testId);
            if (!result.success) {
                Toast.error('Test konnte nicht geladen werden');
                return;
            }

            const test = result.test;
            
            const contentHtml = `
                <div class="test-detail">
                    <div class="test-detail-header">
                        <h3>${Helpers.escapeHtml(test.testNumber)} - ${Helpers.escapeHtml(test.name)}</h3>
                        ${test.description ? `<p>${Helpers.escapeHtml(test.description)}</p>` : ''}
                    </div>
                    <div class="test-detail-meta">
                        <div class="test-meta-item">
                            <strong>Kategorie:</strong> ${test.categoryName || 'Keine'}
                        </div>
                        <div class="test-meta-item">
                            <strong>Bestehensgrenze:</strong> ${test.passingScore}%
                        </div>
                        <div class="test-meta-item">
                            <strong>Zeitlimit:</strong> ${test.timeLimitMinutes ? test.timeLimitMinutes + ' Minuten' : 'Unbegrenzt'}
                        </div>
                        <div class="test-meta-item">
                            <strong>Status:</strong> ${test.isActive ? 'Aktiv' : 'Inaktiv'}
                        </div>
                    </div>
                    <div class="test-detail-questions">
                        <h4>Fragen (${test.questions?.length || 0})</h4>
                        <div class="test-questions-list">
                            ${test.questions && test.questions.length > 0 ? test.questions.map((q, i) => `
                                <div class="test-question-item">
                                    <span class="test-question-num">${i + 1}.</span>
                                    <span class="test-question-text">${Helpers.escapeHtml(q.title || Helpers.truncate(q.questionText, 60))}</span>
                                </div>
                            `).join('') : '<p class="empty-state">Keine Fragen zugewiesen</p>'}
                        </div>
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
                title: `Test Details`,
                content,
                footer,
                size: 'lg'
            });
        } catch (error) {
            console.error('View test error:', error);
            Toast.error('Fehler beim Laden');
        }
    },

    /**
     * Edits a test
     */
    async editTest(testId) {
        // Permission check is done in showTestForm
        try {
            const result = await window.api.knowledgeCheck.getTestById(testId);
            if (result.success) {
                await this.showTestForm(result.test);
            }
        } catch (error) {
            console.error('Edit test error:', error);
            Toast.error('Test konnte nicht geladen werden');
        }
    },

    /**
     * Deletes a test
     */
    async deleteTest(testId) {
        // Check permissions
        if (!Permissions.canDelete('kcTest')) {
            Toast.error('Keine Berechtigung zum Löschen von Tests');
            return;
        }
        
        const test = this.tests.find(t => t.id === testId);
        if (!test) return;

        const confirmed = await Modal.confirm({
            title: 'Test löschen',
            message: `Möchten Sie den Test "${test.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
            confirmText: 'Löschen',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                await window.api.knowledgeCheck.deleteTest(testId);
                Toast.success('Test gelöscht');
                await this.loadTests();
                this.renderTestList();
            } catch (error) {
                console.error('Delete test error:', error);
                Toast.error('Fehler beim Löschen');
            }
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadCategories();
        await this.loadQuestions();
        await this.loadTests();
        this.renderTestList();
    }
};

// Export for use in other modules
window.KCTestsView = KCTestsView;
