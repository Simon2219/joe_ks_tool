/**
 * KC Questions View (Fragen Katalog)
 * Manages the question catalog with categories
 */

const KCQuestionsView = {
    categories: [],
    questions: [],
    filters: {
        categoryId: ''
    },
    eventsBound: false,

    /**
     * Initializes the questions view
     */
    async init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        await this.loadCategories();
        await this.loadQuestions();
        this.renderCatalog();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Add category button
        document.getElementById('add-kc-category-btn')?.addEventListener('click', () => {
            this.showCategoryForm();
        });

        // Add question button
        document.getElementById('add-kc-question-btn')?.addEventListener('click', () => {
            this.showQuestionForm();
        });

        // Category filter
        document.getElementById('filter-kc-category')?.addEventListener('change', (e) => {
            this.filters.categoryId = e.target.value;
            this.renderCatalog();
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
            Toast.error('Kategorien konnten nicht geladen werden');
        }
    },

    /**
     * Loads all questions
     */
    async loadQuestions() {
        try {
            const result = await window.api.knowledgeCheck.getQuestions(this.filters);
            if (result.success) {
                this.questions = result.questions;
            }
        } catch (error) {
            console.error('Failed to load KC questions:', error);
            Toast.error('Fragen konnten nicht geladen werden');
        }
    },

    /**
     * Populates the category filter dropdown
     */
    populateCategoryFilter() {
        const select = document.getElementById('filter-kc-category');
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
     * Renders the catalog list
     */
    renderCatalog() {
        const container = document.getElementById('kc-questions-list');
        if (!container) return;

        // Group questions by category
        const groupedQuestions = this.groupQuestionsByCategory();
        
        if (Object.keys(groupedQuestions).length === 0 && this.categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Keine Kategorien vorhanden</h3>
                    <p>Erstellen Sie eine Kategorie, um Fragen hinzuzufügen.</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Render categories with their questions
        for (const category of this.categories) {
            if (this.filters.categoryId && this.filters.categoryId !== category.id) continue;
            
            const categoryQuestions = groupedQuestions[category.id] || [];
            html += this.renderCategory(category, categoryQuestions);
        }

        // Render uncategorized questions
        const uncategorized = groupedQuestions['uncategorized'] || [];
        if (uncategorized.length > 0 && !this.filters.categoryId) {
            html += this.renderCategory({
                id: 'uncategorized',
                name: 'Unkategorisiert',
                description: 'Fragen ohne Kategorie',
                defaultWeighting: 1
            }, uncategorized, true);
        }

        container.innerHTML = html;

        // Bind category and question actions
        this.bindCatalogActions();
    },

    /**
     * Groups questions by category
     */
    groupQuestionsByCategory() {
        const groups = { uncategorized: [] };
        
        this.questions.forEach(q => {
            const catId = q.categoryId || 'uncategorized';
            if (!groups[catId]) groups[catId] = [];
            groups[catId].push(q);
        });
        
        return groups;
    },

    /**
     * Renders a category with its questions
     */
    renderCategory(category, questions, isUncategorized = false) {
        const isCollapsed = false; // Could be stored in localStorage
        const canCreateQuestions = Permissions.canCreate('kcQuestion');
        const canDeleteCategories = Permissions.canDelete('kcCategory');
        
        return `
            <div class="kc-category ${isCollapsed ? 'collapsed' : ''}" data-category-id="${category.id}">
                <div class="kc-category-header">
                    <button class="kc-category-toggle btn-icon" title="Kategorie ein-/ausklappen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div class="kc-category-info">
                        <h3>${Helpers.escapeHtml(category.name)}</h3>
                        <span class="kc-category-meta">${questions.length} Fragen · Gewichtung: ${category.defaultWeighting || 1}</span>
                    </div>
                    <div class="kc-category-actions">
                        ${!isUncategorized ? `
                            ${canCreateQuestions ? `
                                <button class="btn btn-sm btn-secondary kc-add-question-to-cat" data-category-id="${category.id}" title="Frage hinzufügen">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                            ` : ''}
                            ${canDeleteCategories ? `
                                <button class="btn-icon kc-category-menu" data-category-id="${category.id}" title="Mehr Optionen">
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
                    ${questions.length === 0 ? `
                        <div class="kc-empty-category">
                            <span>Keine Fragen in dieser Kategorie</span>
                        </div>
                    ` : questions.map(q => this.renderQuestion(q)).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Renders a single question item
     */
    renderQuestion(question) {
        const typeLabels = {
            'multiple_choice': 'Multiple Choice',
            'open_question': 'Offene Frage'
        };
        const typeLabel = typeLabels[question.questionType] || question.questionType;
        
        const canEdit = Permissions.canEdit('kcQuestion');
        const canDelete = Permissions.canDelete('kcQuestion');
        
        return `
            <div class="kc-question-item" data-question-id="${question.id}">
                ${canEdit ? `
                    <div class="kc-question-drag-handle" title="Zum Verschieben ziehen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="5" r="1"></circle>
                            <circle cx="9" cy="12" r="1"></circle>
                            <circle cx="9" cy="19" r="1"></circle>
                            <circle cx="15" cy="5" r="1"></circle>
                            <circle cx="15" cy="12" r="1"></circle>
                            <circle cx="15" cy="19" r="1"></circle>
                        </svg>
                    </div>
                ` : ''}
                <div class="kc-question-content">
                    ${question.title ? `<div class="kc-question-title">${Helpers.escapeHtml(question.title)}</div>` : ''}
                    <div class="kc-question-text">${Helpers.escapeHtml(Helpers.truncate(question.questionText, 100))}</div>
                    <div class="kc-question-meta">
                        <span class="badge badge-secondary">${typeLabel}</span>
                        ${question.weighting ? `<span class="badge badge-info">Gewichtung: ${question.weighting}</span>` : ''}
                    </div>
                </div>
                <div class="kc-question-actions">
                    ${canEdit ? `
                        <button class="btn-icon kc-edit-question" data-id="${question.id}" title="Bearbeiten">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon kc-move-question" data-id="${question.id}" title="Verschieben">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="5 9 2 12 5 15"></polyline>
                                <polyline points="9 5 12 2 15 5"></polyline>
                                <polyline points="15 19 12 22 9 19"></polyline>
                                <polyline points="19 9 22 12 19 15"></polyline>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <line x1="12" y1="2" x2="12" y2="22"></line>
                            </svg>
                        </button>
                    ` : ''}
                    ${canDelete ? `
                        <button class="btn-icon kc-delete-question" data-id="${question.id}" title="Löschen">
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
     * Binds actions for catalog items
     */
    bindCatalogActions() {
        // Category toggle
        document.querySelectorAll('.kc-category-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.closest('.kc-category');
                if (category) category.classList.toggle('collapsed');
            });
        });

        // Add question to category
        document.querySelectorAll('.kc-add-question-to-cat').forEach(btn => {
            btn.addEventListener('click', () => {
                const categoryId = btn.dataset.categoryId;
                this.showQuestionForm(null, categoryId);
            });
        });

        // Category menu (3 dots)
        document.querySelectorAll('.kc-category-menu').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCategoryMenu(btn.dataset.categoryId, btn);
            });
        });

        // Click on question to view preview
        document.querySelectorAll('.kc-question-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.kc-question-actions')) return;
                const questionId = item.dataset.questionId;
                if (questionId) this.viewQuestion(questionId);
            });
            item.classList.add('clickable-row');
        });

        // Edit question
        document.querySelectorAll('.kc-edit-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editQuestion(btn.dataset.id);
            });
        });

        // Move question
        document.querySelectorAll('.kc-move-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMoveDialog(btn.dataset.id);
            });
        });

        // Delete question
        document.querySelectorAll('.kc-delete-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteQuestion(btn.dataset.id);
            });
        });
    },

    /**
     * Shows the category form
     */
    async showCategoryForm(category = null) {
        const isEdit = !!category;
        
        // Check permissions
        if (isEdit && !Permissions.canEdit('kcCategory')) {
            Toast.error('Keine Berechtigung zum Bearbeiten von Kategorien');
            return;
        }
        if (!isEdit && !Permissions.canCreate('kcCategory')) {
            Toast.error('Keine Berechtigung zum Erstellen von Kategorien');
            return;
        }
        
        const title = isEdit ? 'Kategorie bearbeiten' : 'Neue Kategorie';

        const fields = [
            { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Kategoriename' },
            { name: 'description', label: 'Beschreibung', type: 'textarea', rows: 2, placeholder: 'Beschreibung (optional)' },
            { name: 'defaultWeighting', label: 'Standard-Gewichtung', type: 'number', min: 1, max: 10, default: 1 }
        ];

        const result = await Modal.form({
            title,
            fields,
            data: category || { defaultWeighting: 1 },
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
                    response = await window.api.knowledgeCheck.updateCategory(category.id, result);
                } else {
                    response = await window.api.knowledgeCheck.createCategory(result);
                }
                
                if (response && response.success) {
                    Toast.success(isEdit ? 'Kategorie aktualisiert' : 'Kategorie erstellt');
                    await this.loadCategories();
                    await this.loadQuestions();
                    this.renderCatalog();
                } else {
                    Toast.error(response?.error || 'Fehler beim Speichern der Kategorie');
                }
            } catch (error) {
                console.error('Category save error:', error);
                Toast.error('Fehler beim Speichern: ' + (error.message || 'Unbekannter Fehler'));
            }
        }
    },

    /**
     * Shows the category menu
     */
    showCategoryMenu(categoryId, buttonEl) {
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;

        const menuItems = [];
        
        // Edit category
        if (Permissions.canEdit('kcCategory')) {
            menuItems.push({
                label: 'Bearbeiten',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>`,
                action: () => this.showCategoryForm(category)
            });
        }

        // Delete category
        if (Permissions.canDelete('kcCategory')) {
            if (menuItems.length > 0) {
                menuItems.push({ divider: true });
            }
            menuItems.push({
                label: 'Löschen',
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>`,
                danger: true,
                action: () => this.deleteCategory(categoryId)
            });
        }

        if (menuItems.length === 0) {
            Toast.error('Keine verfügbaren Aktionen');
            return;
        }

        Helpers.showDropdownMenu(buttonEl, menuItems);
    },

    /**
     * Deletes a category after confirmation
     */
    async deleteCategory(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;

        const confirmed = await Modal.confirm({
            title: 'Kategorie löschen',
            message: `Möchten Sie die Kategorie "${category.name}" wirklich löschen? Die Fragen werden in "Unkategorisiert" verschoben.`,
            confirmText: 'Löschen',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const response = await window.api.knowledgeCheck.deleteCategory(categoryId);
                if (response && response.success) {
                    Toast.success('Kategorie gelöscht');
                    await this.loadCategories();
                    await this.loadQuestions();
                    this.renderCatalog();
                } else {
                    Toast.error(response?.error || 'Fehler beim Löschen der Kategorie');
                }
            } catch (error) {
                console.error('Delete category error:', error);
                Toast.error('Fehler beim Löschen: ' + (error.message || 'Unbekannter Fehler'));
            }
        }
    },

    /**
     * Shows the question form
     */
    async showQuestionForm(question = null, preselectedCategoryId = null) {
        const isEdit = !!question;
        
        // Check permissions
        if (isEdit && !Permissions.canEdit('kcQuestion')) {
            Toast.error('Keine Berechtigung zum Bearbeiten von Fragen');
            return;
        }
        if (!isEdit && !Permissions.canCreate('kcQuestion')) {
            Toast.error('Keine Berechtigung zum Erstellen von Fragen');
            return;
        }
        
        const title = isEdit ? 'Frage bearbeiten' : 'Neue Frage';

        // Build form HTML manually for complex form
        const categoryOptions = this.categories.map(c => 
            `<option value="${c.id}" ${(question?.categoryId || preselectedCategoryId) === c.id ? 'selected' : ''}>${Helpers.escapeHtml(c.name)}</option>`
        ).join('');

        const formHtml = `
            <form id="question-form" class="question-form">
                <!-- Static Section - Always visible -->
                <div class="form-section">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="q-category">Kategorie</label>
                            <select id="q-category" name="categoryId" class="form-select">
                                <option value="">Unkategorisiert</option>
                                ${categoryOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="q-type">Fragetyp *</label>
                            <select id="q-type" name="questionType" class="form-select" required>
                                <option value="multiple_choice" ${question?.questionType === 'multiple_choice' || !question ? 'selected' : ''}>Multiple Choice</option>
                                <option value="open_question" ${question?.questionType === 'open_question' ? 'selected' : ''}>Offene Frage</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;"></div>
                        <div class="form-group" style="flex: 1;">
                            <label for="q-weighting">Gewichtung (optional)</label>
                            <input type="number" id="q-weighting" name="weighting" class="form-input" min="1" max="10" value="${question?.weighting || ''}" placeholder="Standard aus Kategorie">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="q-title">Titel (optional)</label>
                        <input type="text" id="q-title" name="title" class="form-input" value="${Helpers.escapeHtml(question?.title || '')}" placeholder="Beschreibender Titel für die Frage">
                    </div>
                    
                    <div class="form-group">
                        <label for="q-text">Frage *</label>
                        <textarea id="q-text" name="questionText" class="form-textarea" rows="3" required placeholder="Die eigentliche Frage">${Helpers.escapeHtml(question?.questionText || '')}</textarea>
                    </div>
                </div>
                
                <!-- Separator -->
                <hr class="form-separator" style="margin: var(--space-md) 0; border: 0; border-top: 1px solid var(--border-color); opacity: 0.5;">
                
                <!-- Dynamic Section - Changes based on question type -->
                <!-- Multiple Choice Options -->
                <div id="mc-options-section" class="${question?.questionType === 'open_question' ? 'hidden' : ''}">
                    <div class="form-group">
                        <label class="form-checkbox" style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-md);">
                            <input type="checkbox" id="q-partial-answer" name="allowPartialAnswer" ${question?.allowPartialAnswer ? 'checked' : ''}>
                            <span>Teilweise Antwort erlauben</span>
                        </label>
                        <small class="form-hint" style="display: block; margin-top: calc(-1 * var(--space-sm)); margin-bottom: var(--space-md); color: var(--text-muted);">
                            Wenn aktiviert, werden Punkte anteilig vergeben. Wenn deaktiviert, muss alles richtig sein.
                        </small>
                    </div>
                    <div class="form-group">
                        <label>Antwortmöglichkeiten</label>
                        <div id="mc-options-list">
                            ${(question?.options || [{ text: '', isCorrect: false }]).map((opt, i) => `
                                <div class="mc-option-row">
                                    <input type="checkbox" class="mc-correct" ${opt.isCorrect ? 'checked' : ''}>
                                    <input type="text" class="form-input mc-text" value="${Helpers.escapeHtml(opt.text)}" placeholder="Antwort ${i + 1}">
                                    <button type="button" class="btn-icon mc-remove" title="Entfernen">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" id="add-mc-option" class="btn btn-sm btn-secondary" style="margin-top: var(--space-sm);">+ Antwort hinzufügen</button>
                    </div>
                </div>
                
                <!-- Open Question Options -->
                <div id="open-question-section" class="${question?.questionType !== 'open_question' ? 'hidden' : ''}">
                    <div class="form-group">
                        <label for="q-exact-answer">Exakte Antwort</label>
                        <input type="text" id="q-exact-answer" name="exactAnswer" class="form-input" value="${Helpers.escapeHtml(question?.exactAnswer || '')}" placeholder="Die exakt richtige Antwort">
                    </div>
                    <div class="form-group">
                        <label>Schlüsselwörter (Trigger Words)</label>
                        <div id="trigger-words-list">
                            ${(question?.triggerWords || []).map(tw => `
                                <div class="trigger-word-row">
                                    <input type="text" class="form-input trigger-word" value="${Helpers.escapeHtml(tw)}">
                                    <button type="button" class="btn-icon trigger-remove" title="Entfernen">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" id="add-trigger-word" class="btn btn-sm btn-secondary" style="margin-top: var(--space-sm);">+ Schlüsselwort hinzufügen</button>
                        <small class="form-hint" style="display: block; margin-top: var(--space-xs); color: var(--text-muted);">
                            Wörter oder Phrasen, die in der Antwort enthalten sein sollten
                        </small>
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

        // Bind form interactions
        this.bindQuestionFormEvents(submitBtn, isEdit, question);
    },

    /**
     * Binds events for the question form
     */
    bindQuestionFormEvents(submitBtn, isEdit, existingQuestion) {
        const form = document.getElementById('question-form');
        const typeSelect = document.getElementById('q-type');
        const mcSection = document.getElementById('mc-options-section');
        const openSection = document.getElementById('open-question-section');

        // Question type change
        typeSelect?.addEventListener('change', (e) => {
            const isOpen = e.target.value === 'open_question';
            mcSection?.classList.toggle('hidden', isOpen);
            openSection?.classList.toggle('hidden', !isOpen);
        });

        // Add MC option
        document.getElementById('add-mc-option')?.addEventListener('click', () => {
            const list = document.getElementById('mc-options-list');
            const index = list.children.length;
            const row = document.createElement('div');
            row.className = 'mc-option-row';
            row.innerHTML = `
                <input type="checkbox" class="mc-correct">
                <input type="text" class="form-input mc-text" placeholder="Antwort ${index + 1}">
                <button type="button" class="btn-icon mc-remove" title="Entfernen">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            `;
            list.appendChild(row);
            this.bindMcRemove(row.querySelector('.mc-remove'));
        });

        // Bind existing MC remove buttons
        document.querySelectorAll('.mc-remove').forEach(btn => this.bindMcRemove(btn));

        // Add trigger word
        document.getElementById('add-trigger-word')?.addEventListener('click', () => {
            const list = document.getElementById('trigger-words-list');
            const row = document.createElement('div');
            row.className = 'trigger-word-row';
            row.innerHTML = `
                <input type="text" class="form-input trigger-word">
                <button type="button" class="btn-icon trigger-remove" title="Entfernen">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            `;
            list.appendChild(row);
            this.bindTriggerRemove(row.querySelector('.trigger-remove'));
        });

        // Bind existing trigger remove buttons
        document.querySelectorAll('.trigger-remove').forEach(btn => this.bindTriggerRemove(btn));

        // Submit
        submitBtn.addEventListener('click', async () => {
            const questionText = document.getElementById('q-text').value.trim();
            if (!questionText) {
                Toast.error('Bitte geben Sie eine Frage ein');
                return;
            }

            const data = {
                categoryId: document.getElementById('q-category').value || null,
                questionType: document.getElementById('q-type').value,
                title: document.getElementById('q-title').value.trim(),
                questionText: questionText,
                weighting: parseInt(document.getElementById('q-weighting').value) || null
            };

            if (data.questionType === 'multiple_choice') {
                data.allowPartialAnswer = document.getElementById('q-partial-answer')?.checked || false;
                data.options = [];
                document.querySelectorAll('.mc-option-row').forEach(row => {
                    const text = row.querySelector('.mc-text').value.trim();
                    if (text) {
                        data.options.push({
                            text,
                            isCorrect: row.querySelector('.mc-correct').checked
                        });
                    }
                });
            } else {
                data.exactAnswer = document.getElementById('q-exact-answer').value.trim();
                data.triggerWords = [];
                document.querySelectorAll('.trigger-word').forEach(input => {
                    const word = input.value.trim();
                    if (word) data.triggerWords.push(word);
                });
            }

            try {
                let response;
                if (isEdit) {
                    response = await window.api.knowledgeCheck.updateQuestion(existingQuestion.id, data);
                } else {
                    response = await window.api.knowledgeCheck.createQuestion(data);
                }
                
                if (response && response.success) {
                    Toast.success(isEdit ? 'Frage aktualisiert' : 'Frage erstellt');
                    Modal.close();
                    await this.loadQuestions();
                    this.renderCatalog();
                } else {
                    Toast.error(response?.error || 'Fehler beim Speichern der Frage');
                }
            } catch (error) {
                console.error('Question save error:', error);
                Toast.error('Fehler beim Speichern: ' + (error.message || 'Unbekannter Fehler'));
            }
        });
    },

    bindMcRemove(btn) {
        btn.addEventListener('click', () => btn.closest('.mc-option-row').remove());
    },

    bindTriggerRemove(btn) {
        btn.addEventListener('click', () => btn.closest('.trigger-word-row').remove());
    },

    /**
     * Views a question's details (preview)
     */
    async viewQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) return;

        const canEdit = Permissions.canEdit('kcQuestion');
        const typeLabels = {
            'multiple_choice': 'Multiple Choice',
            'open_question': 'Offene Frage'
        };

        let answerSection = '';
        if (question.questionType === 'multiple_choice' && question.options && question.options.length > 0) {
            answerSection = `
                <div class="question-detail-section">
                    <h5>Antwortmöglichkeiten</h5>
                    <ul class="question-options-list">
                        ${question.options.map(o => `
                            <li class="${o.isCorrect ? 'correct' : ''}">
                                ${o.isCorrect ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-outline">○</span>'}
                                ${Helpers.escapeHtml(o.text)}
                            </li>
                        `).join('')}
                    </ul>
                    ${question.allowPartialAnswer ? '<p class="text-muted"><small>Teilweise Antworten erlaubt</small></p>' : ''}
                </div>
            `;
        } else if (question.questionType === 'open_question') {
            answerSection = `
                <div class="question-detail-section">
                    <h5>Erwartete Antwort</h5>
                    ${question.exactAnswer ? `<p><strong>Exakte Antwort:</strong> ${Helpers.escapeHtml(question.exactAnswer)}</p>` : ''}
                    ${question.triggerWords && question.triggerWords.length > 0 ? `
                        <p><strong>Schlüsselwörter:</strong></p>
                        <div class="trigger-words-display">
                            ${question.triggerWords.map(tw => `<span class="badge badge-info">${Helpers.escapeHtml(tw)}</span>`).join(' ')}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        const contentHtml = `
            <div class="question-detail">
                <div class="question-detail-header">
                    ${question.title ? `<h4>${Helpers.escapeHtml(question.title)}</h4>` : ''}
                    <p class="question-detail-text">${Helpers.escapeHtml(question.questionText)}</p>
                </div>
                <div class="question-detail-meta">
                    <span class="badge badge-secondary">${typeLabels[question.questionType] || question.questionType}</span>
                    ${question.weighting ? `<span class="badge badge-info">Gewichtung: ${question.weighting}</span>` : ''}
                    <span class="badge badge-outline">${question.categoryName}</span>
                </div>
                ${answerSection}
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

        if (canEdit) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-primary';
            editBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 6px;">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Bearbeiten
            `;
            editBtn.addEventListener('click', () => {
                Modal.close();
                setTimeout(() => this.editQuestion(questionId), 250);
            });
            leftBtns.appendChild(editBtn);
        }
        footer.appendChild(leftBtns);

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
    },

    /**
     * Edits a question
     */
    async editQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (question) {
            await this.showQuestionForm(question);
        }
    },

    /**
     * Shows the move question dialog
     */
    async showMoveDialog(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) return;

        const currentCat = this.categories.find(c => c.id === question.categoryId);
        const currentCategoryName = currentCat ? currentCat.name : 'Keine Kategorie';
        const questionTitle = question.title || Helpers.truncate(question.questionText, 50);

        await Helpers.showMoveDialog({
            title: 'Frage verschieben',
            itemLabel: 'Frage',
            itemName: questionTitle,
            currentCategoryName,
            categories: this.categories,
            currentCategoryId: question.categoryId,
            onSubmit: async (newCategoryId) => {
                try {
                    await window.api.knowledgeCheck.moveQuestion(questionId, newCategoryId);
                    Toast.success('Frage verschoben');
                    await this.loadQuestions();
                    this.renderCatalog();
                } catch (error) {
                    console.error('Move question error:', error);
                    Toast.error('Fehler beim Verschieben');
                }
            }
        });
    },

    /**
     * Deletes a question
     */
    async deleteQuestion(questionId) {
        // Check permissions
        if (!Permissions.canDelete('kcQuestion')) {
            Toast.error('Keine Berechtigung zum Löschen von Fragen');
            return;
        }
        
        const question = this.questions.find(q => q.id === questionId);
        if (!question) return;

        const confirmed = await Modal.confirm({
            title: 'Frage löschen',
            message: `Möchten Sie diese Frage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
            confirmText: 'Löschen',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const response = await window.api.knowledgeCheck.deleteQuestion(questionId);
                if (response && response.success) {
                    Toast.success(response.archived ? 'Frage archiviert' : 'Frage gelöscht');
                    await this.loadQuestions();
                    this.renderCatalog();
                } else {
                    Toast.error(response?.error || 'Fehler beim Löschen der Frage');
                }
            } catch (error) {
                console.error('Delete question error:', error);
                Toast.error('Fehler beim Löschen: ' + (error.message || 'Unbekannter Fehler'));
            }
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadCategories();
        await this.loadQuestions();
        this.renderCatalog();
    }
};

// Export for use in other modules
window.KCQuestionsView = KCQuestionsView;
