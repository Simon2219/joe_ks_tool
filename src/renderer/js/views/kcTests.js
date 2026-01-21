/**
 * KC Tests View (Test Katalog)
 * Manages the test catalog
 */

const KCTestsView = {
    tests: [],
    testCategories: [],
    questionCategories: [],
    questions: [],
    filters: {
        categoryId: ''
    },
    eventsBound: false,

    /**
     * Initializes the tests view
     */
    async init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        await this.loadTestCategories();
        await this.loadQuestionCategories();
        await this.loadQuestions();
        await this.loadTests();
        this.renderTestList();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Add test category button
        document.getElementById('add-kc-test-category-btn')?.addEventListener('click', () => {
            this.showTestCategoryForm();
        });

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
     * Loads all test categories
     */
    async loadTestCategories() {
        try {
            const result = await window.api.knowledgeCheck.getTestCategories();
            if (result.success) {
                this.testCategories = result.categories;
                this.populateCategoryFilter();
            }
        } catch (error) {
            console.error('Failed to load KC test categories:', error);
        }
    },

    /**
     * Loads all question categories (for grouping questions in test form)
     */
    async loadQuestionCategories() {
        try {
            const result = await window.api.knowledgeCheck.getCategories();
            if (result.success) {
                this.questionCategories = result.categories;
            }
        } catch (error) {
            console.error('Failed to load KC question categories:', error);
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
        this.testCategories.forEach(cat => {
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

        if (filteredTests.length === 0 && this.testCategories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Keine Tests vorhanden</h3>
                    <p>Erstellen Sie eine Kategorie und Tests, um Fragen zu gruppieren.</p>
                </div>
            `;
            return;
        }

        // Group tests by category
        const grouped = this.groupTestsByCategory(filteredTests);
        let html = '';

        // Render test categories with their tests
        for (const category of this.testCategories) {
            if (this.filters.categoryId && this.filters.categoryId !== category.id) continue;
            
            const categoryTests = grouped[category.id] || [];
            html += this.renderTestCategory(category, categoryTests);
        }

        // Render uncategorized tests
        const uncategorized = grouped['uncategorized'] || [];
        if (uncategorized.length > 0 && !this.filters.categoryId) {
            html += this.renderTestCategory({
                id: 'uncategorized',
                name: 'Unkategorisiert',
                description: 'Tests ohne Kategorie'
            }, uncategorized, true);
        }

        container.innerHTML = html;
        this.bindTestActions();
    },

    /**
     * Groups tests by category
     */
    groupTestsByCategory(tests) {
        const groups = { uncategorized: [] };
        
        tests.forEach(t => {
            const catId = t.categoryId || 'uncategorized';
            if (!groups[catId]) groups[catId] = [];
            groups[catId].push(t);
        });
        
        return groups;
    },

    /**
     * Renders a test category with its tests
     */
    renderTestCategory(category, tests, isUncategorized = false) {
        const canCreateTests = Permissions.canCreate('kcTest');
        const canDeleteCategories = Permissions.canDelete('kcTest');
        
        return `
            <div class="kc-category" data-category-id="${category.id}">
                <div class="kc-category-header">
                    <button class="kc-category-toggle btn-icon" title="Ein-/Ausklappen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div class="kc-category-info">
                        <h3>${Helpers.escapeHtml(category.name)}</h3>
                        <span class="kc-category-meta">${tests.length} Tests</span>
                    </div>
                    <div class="kc-category-actions">
                        ${!isUncategorized ? `
                            ${canCreateTests ? `
                                <button class="btn btn-sm btn-secondary kc-add-test-to-cat" data-category-id="${category.id}" title="Test hinzufügen">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                            ` : ''}
                            ${canDeleteCategories ? `
                                <button class="btn-icon kc-test-category-menu" data-category-id="${category.id}" title="Mehr Optionen">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="1"></circle>
                                        <circle cx="12" cy="5" r="1"></circle>
                                        <circle cx="12" cy="19" r="1"></circle>
                                    </svg>
                                </button>
                            ` : ''}
                        ` : ''}
                    </div>
                </div>
                <div class="kc-category-content">
                    ${tests.length === 0 ? `
                        <div class="kc-empty-category">
                            <span>Keine Tests in dieser Kategorie</span>
                        </div>
                    ` : tests.map(t => this.renderTestItem(t)).join('')}
                </div>
            </div>
        `;
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

        // Add test to category
        document.querySelectorAll('.kc-add-test-to-cat').forEach(btn => {
            btn.addEventListener('click', () => {
                const categoryId = btn.dataset.categoryId;
                this.showTestForm(null, categoryId);
            });
        });

        // Test category menu (3 dots)
        document.querySelectorAll('.kc-test-category-menu').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showTestCategoryMenu(btn.dataset.categoryId);
            });
        });

        // Double-click on test to view
        document.querySelectorAll('.kc-test-item').forEach(item => {
            item.addEventListener('dblclick', () => {
                const testId = item.dataset.testId;
                if (testId) this.viewTest(testId);
            });
            item.classList.add('clickable-row');
        });

        // View test
        document.querySelectorAll('.kc-view-test').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewTest(btn.dataset.id);
            });
        });

        // Edit test
        document.querySelectorAll('.kc-edit-test').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editTest(btn.dataset.id);
            });
        });

        // Delete test
        document.querySelectorAll('.kc-delete-test').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTest(btn.dataset.id);
            });
        });
    },

    /**
     * Shows the test category form
     */
    async showTestCategoryForm(category = null) {
        const isEdit = !!category;
        
        // Check permissions
        if (isEdit && !Permissions.canEdit('kcTest')) {
            Toast.error('Keine Berechtigung zum Bearbeiten von Kategorien');
            return;
        }
        if (!isEdit && !Permissions.canCreate('kcTest')) {
            Toast.error('Keine Berechtigung zum Erstellen von Kategorien');
            return;
        }
        
        const title = isEdit ? 'Test-Kategorie bearbeiten' : 'Neue Test-Kategorie';

        const fields = [
            { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Kategoriename' },
            { name: 'description', label: 'Beschreibung', type: 'textarea', rows: 2, placeholder: 'Beschreibung (optional)' }
        ];

        const result = await Modal.form({
            title,
            fields,
            data: category || {},
            submitText: isEdit ? 'Speichern' : 'Erstellen',
            validate: (data) => {
                if (!data.name || data.name.trim().length < 2) {
                    return 'Name muss mindestens 2 Zeichen haben';
                }
                return null;
            }
        });

        if (result) {
            try {
                let response;
                if (isEdit) {
                    response = await window.api.knowledgeCheck.updateTestCategory(category.id, result);
                } else {
                    response = await window.api.knowledgeCheck.createTestCategory(result);
                }
                
                if (response && response.success) {
                    Toast.success(isEdit ? 'Kategorie aktualisiert' : 'Kategorie erstellt');
                    await this.loadTestCategories();
                    await this.loadTests();
                    this.renderTestList();
                } else {
                    Toast.error(response?.error || 'Fehler beim Speichern der Kategorie');
                }
            } catch (error) {
                console.error('Test category save error:', error);
                Toast.error('Fehler beim Speichern: ' + (error.message || 'Unbekannter Fehler'));
            }
        }
    },

    /**
     * Shows the test category menu (delete option)
     */
    async showTestCategoryMenu(categoryId) {
        const category = this.testCategories.find(c => c.id === categoryId);
        if (!category) return;
        
        if (!Permissions.canDelete('kcTest')) {
            Toast.error('Keine Berechtigung zum Löschen von Kategorien');
            return;
        }

        const confirmed = await Modal.confirm({
            title: 'Kategorie löschen',
            message: `Möchten Sie die Kategorie "${category.name}" wirklich löschen? Die Tests werden in "Unkategorisiert" verschoben.`,
            confirmText: 'Löschen',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const response = await window.api.knowledgeCheck.deleteTestCategory(categoryId);
                if (response && response.success) {
                    Toast.success('Kategorie gelöscht');
                    await this.loadTestCategories();
                    await this.loadTests();
                    this.renderTestList();
                } else {
                    Toast.error(response?.error || 'Fehler beim Löschen der Kategorie');
                }
            } catch (error) {
                console.error('Delete test category error:', error);
                Toast.error('Fehler beim Löschen: ' + (error.message || 'Unbekannter Fehler'));
            }
        }
    },

    /**
     * Shows the test form
     */
    async showTestForm(test = null, preselectedCategoryId = null) {
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

        // Group questions by question category for display
        const groupedQuestions = {};
        this.questions.forEach(q => {
            const catName = q.categoryName || 'Unkategorisiert';
            if (!groupedQuestions[catName]) groupedQuestions[catName] = [];
            groupedQuestions[catName].push(q);
        });

        // Test category options (use test categories)
        const categoryOptions = this.testCategories.map(c => 
            `<option value="${c.id}" ${(test?.categoryId || preselectedCategoryId) === c.id ? 'selected' : ''}>${Helpers.escapeHtml(c.name)}</option>`
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
                let response;
                if (isEdit) {
                    response = await window.api.knowledgeCheck.updateTest(test.id, data);
                } else {
                    response = await window.api.knowledgeCheck.createTest(data);
                }
                
                if (response && response.success) {
                    Toast.success(isEdit ? 'Test aktualisiert' : 'Test erstellt');
                    Modal.close();
                    await this.loadTests();
                    this.renderTestList();
                } else {
                    Toast.error(response?.error || 'Fehler beim Speichern des Tests');
                }
            } catch (error) {
                console.error('Test save error:', error);
                Toast.error('Fehler beim Speichern: ' + (error.message || 'Unbekannter Fehler'));
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
            
            const typeLabels = {
                'multiple_choice': 'Multiple Choice',
                'open_question': 'Offene Frage'
            };
            
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
                                <div class="test-question-item" data-question-id="${q.questionId}">
                                    <div class="test-question-content">
                                        <span class="test-question-num">${i + 1}.</span>
                                        <div class="test-question-info">
                                            ${q.title ? `<div class="test-question-title">${Helpers.escapeHtml(q.title)}</div>` : ''}
                                            <div class="test-question-text">${Helpers.escapeHtml(Helpers.truncate(q.questionText, 80))}</div>
                                            <div class="test-question-meta">
                                                <span class="badge badge-secondary">${typeLabels[q.questionType] || q.questionType}</span>
                                                <span class="badge badge-info">Gewichtung: ${q.effectiveWeighting}</span>
                                                <span class="badge badge-outline">${q.categoryName}</span>
                                                ${q.questionType === 'multiple_choice' && q.options ? `<span>${q.options.length} Antworten</span>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <button class="btn-icon kc-view-question-detail" data-id="${q.questionId}" title="Frage anzeigen">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>
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
            footer.style.gap = 'var(--space-sm)';
            footer.style.justifyContent = 'space-between';

            const leftBtns = document.createElement('div');
            leftBtns.style.display = 'flex';
            leftBtns.style.gap = 'var(--space-sm)';

            // Add "Neuer Testdurchgang" button if user can assign tests
            if (Permissions.has('kc_assign_tests')) {
                const assignBtn = document.createElement('button');
                assignBtn.className = 'btn btn-primary';
                assignBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 6px;">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    Neuer Testdurchgang
                `;
                assignBtn.addEventListener('click', () => {
                    Modal.close();
                    setTimeout(() => this.showAssignTestForm(test), 250);
                });
                leftBtns.appendChild(assignBtn);
            }
            footer.appendChild(leftBtns);

            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-secondary';
            closeBtn.textContent = 'Schließen';
            closeBtn.addEventListener('click', () => Modal.close());
            footer.appendChild(closeBtn);

            Modal.open({
                title: `Test Details`,
                content,
                footer,
                size: 'xl'
            });

            // Bind view question detail buttons
            document.querySelectorAll('.kc-view-question-detail').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewQuestionDetail(btn.dataset.id);
                });
            });
        } catch (error) {
            console.error('View test error:', error);
            Toast.error('Fehler beim Laden');
        }
    },

    /**
     * Shows the form to assign a test to multiple users
     */
    async showAssignTestForm(test) {
        if (!Permissions.has('kc_assign_tests')) {
            Toast.error('Keine Berechtigung zum Zuweisen von Tests');
            return;
        }

        try {
            // Load users
            const usersResult = await window.api.users.getAll();
            if (!usersResult.success) {
                Toast.error('Benutzer konnten nicht geladen werden');
                return;
            }

            const users = usersResult.users;

            // Build custom form with checkboxes for multiple user selection
            const formHtml = `
                <div class="assign-test-form">
                    <div class="form-group">
                        <label>Test</label>
                        <input type="text" class="form-input" value="${Helpers.escapeHtml(test.testNumber)} - ${Helpers.escapeHtml(test.name)}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Benutzer auswählen *</label>
                        <div class="user-select-actions" style="margin-bottom: var(--space-xs);">
                            <button type="button" class="btn btn-sm btn-secondary" id="select-all-users">Alle auswählen</button>
                            <button type="button" class="btn btn-sm btn-secondary" id="deselect-all-users">Keine auswählen</button>
                        </div>
                        <div class="user-checkboxes" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: var(--space-sm);">
                            ${users.map(u => `
                                <label class="form-checkbox" style="display: flex; padding: var(--space-xs) 0;">
                                    <input type="checkbox" name="userIds" value="${u.id}">
                                    <span>${Helpers.escapeHtml(u.firstName)} ${Helpers.escapeHtml(u.lastName)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="assign-due-date">Fälligkeitsdatum (optional)</label>
                        <input type="date" id="assign-due-date" class="form-input">
                    </div>
                    <div class="form-group">
                        <label for="assign-notes">Hinweise (optional)</label>
                        <textarea id="assign-notes" class="form-textarea" rows="2" placeholder="Besondere Hinweise für die Teilnehmer"></textarea>
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
            submitBtn.textContent = 'Test zuweisen';

            footer.appendChild(cancelBtn);
            footer.appendChild(submitBtn);

            Modal.open({
                title: `Testdurchgang: ${test.testNumber}`,
                content,
                footer,
                size: 'default'
            });

            // Bind select all / deselect all
            document.getElementById('select-all-users')?.addEventListener('click', () => {
                document.querySelectorAll('input[name="userIds"]').forEach(cb => cb.checked = true);
            });
            document.getElementById('deselect-all-users')?.addEventListener('click', () => {
                document.querySelectorAll('input[name="userIds"]').forEach(cb => cb.checked = false);
            });

            // Submit handler
            submitBtn.addEventListener('click', async () => {
                const selectedUsers = Array.from(document.querySelectorAll('input[name="userIds"]:checked')).map(cb => cb.value);
                const dueDate = document.getElementById('assign-due-date')?.value || null;
                const notes = document.getElementById('assign-notes')?.value || '';

                if (selectedUsers.length === 0) {
                    Toast.error('Bitte wählen Sie mindestens einen Benutzer');
                    return;
                }

                // Create assignments for each selected user
                let successCount = 0;
                let errorCount = 0;

                for (const userId of selectedUsers) {
                    try {
                        const response = await window.api.knowledgeCheck.createAssignment({
                            testId: test.id,
                            userId,
                            dueDate,
                            notes
                        });

                        if (response && response.success) {
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    } catch (error) {
                        console.error('Assignment error for user:', userId, error);
                        errorCount++;
                    }
                }

                Modal.close();

                if (successCount > 0 && errorCount === 0) {
                    Toast.success(`Test wurde ${successCount} Benutzer(n) zugewiesen`);
                } else if (successCount > 0 && errorCount > 0) {
                    Toast.warning(`${successCount} zugewiesen, ${errorCount} fehlgeschlagen`);
                } else {
                    Toast.error('Fehler beim Zuweisen des Tests');
                }
            });
        } catch (error) {
            console.error('Assign test error:', error);
            Toast.error('Fehler beim Zuweisen: ' + (error.message || 'Unbekannter Fehler'));
        }
    },

    /**
     * Views a question's full details
     */
    async viewQuestionDetail(questionId) {
        try {
            const result = await window.api.knowledgeCheck.getQuestionById(questionId);
            if (!result.success) {
                Toast.error('Frage konnte nicht geladen werden');
                return;
            }

            const q = result.question;
            const typeLabels = {
                'multiple_choice': 'Multiple Choice',
                'open_question': 'Offene Frage'
            };

            let answerSection = '';
            if (q.questionType === 'multiple_choice' && q.options && q.options.length > 0) {
                answerSection = `
                    <div class="question-detail-section">
                        <h5>Antwortmöglichkeiten</h5>
                        <ul class="question-options-list">
                            ${q.options.map(o => `
                                <li class="${o.isCorrect ? 'correct' : ''}">
                                    ${o.isCorrect ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-outline">○</span>'}
                                    ${Helpers.escapeHtml(o.text)}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            } else if (q.questionType === 'open_question') {
                answerSection = `
                    <div class="question-detail-section">
                        <h5>Erwartete Antwort</h5>
                        ${q.exactAnswer ? `<p><strong>Exakte Antwort:</strong> ${Helpers.escapeHtml(q.exactAnswer)}</p>` : ''}
                        ${q.triggerWords && q.triggerWords.length > 0 ? `
                            <p><strong>Schlüsselwörter:</strong></p>
                            <div class="trigger-words-display">
                                ${q.triggerWords.map(tw => `<span class="badge badge-info">${Helpers.escapeHtml(tw)}</span>`).join(' ')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }

            const contentHtml = `
                <div class="question-detail">
                    <div class="question-detail-header">
                        ${q.title ? `<h4>${Helpers.escapeHtml(q.title)}</h4>` : ''}
                        <p class="question-detail-text">${Helpers.escapeHtml(q.questionText)}</p>
                    </div>
                    <div class="question-detail-meta">
                        <span class="badge badge-secondary">${typeLabels[q.questionType] || q.questionType}</span>
                        <span class="badge badge-info">Gewichtung: ${q.effectiveWeighting}</span>
                        <span class="badge badge-outline">${q.categoryName}</span>
                    </div>
                    ${answerSection}
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
                title: 'Frage Details',
                content,
                footer,
                size: 'lg'
            });
        } catch (error) {
            console.error('View question detail error:', error);
            Toast.error('Fehler beim Laden der Frage');
        }
    },

    /**
     * Edits a test
     */
    async editTest(testId) {
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
                const response = await window.api.knowledgeCheck.deleteTest(testId);
                if (response && response.success) {
                    Toast.success(response.archived ? 'Test archiviert' : 'Test gelöscht');
                    await this.loadTests();
                    this.renderTestList();
                } else {
                    Toast.error(response?.error || 'Fehler beim Löschen des Tests');
                }
            } catch (error) {
                console.error('Delete test error:', error);
                Toast.error('Fehler beim Löschen: ' + (error.message || 'Unbekannter Fehler'));
            }
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadTestCategories();
        await this.loadQuestionCategories();
        await this.loadQuestions();
        await this.loadTests();
        this.renderTestList();
    }
};

// Export for use in other modules
window.KCTestsView = KCTestsView;
