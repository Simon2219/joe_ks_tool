/**
 * Quality Management View
 * Handles quality evaluation functionality
 */

const QualityView = {
    reports: [],
    categories: [],
    agents: [],
    filters: {
        agentId: '',
        startDate: '',
        endDate: ''
    },

    /**
     * Initializes the quality view
     */
    async init() {
        this.bindEvents();
        await this.loadCategories();
        await this.loadAgents();
        await this.loadReports();
        await this.loadStatistics();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Add evaluation button
        document.getElementById('add-quality-btn')?.addEventListener('click', () => {
            this.showEvaluationForm();
        });

        // Manage categories button
        document.getElementById('manage-categories-btn')?.addEventListener('click', () => {
            this.showCategoriesManager();
        });

        // Export button
        document.getElementById('export-quality-btn')?.addEventListener('click', () => {
            this.exportReports();
        });

        // Filters
        document.getElementById('filter-quality-agent')?.addEventListener('change', (e) => {
            this.filters.agentId = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filter-quality-start')?.addEventListener('change', (e) => {
            this.filters.startDate = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filter-quality-end')?.addEventListener('change', (e) => {
            this.filters.endDate = e.target.value;
            this.applyFilters();
        });
    },

    /**
     * Loads quality categories
     */
    async loadCategories() {
        try {
            const result = await window.electronAPI.quality.getCategories();
            if (result.success) {
                this.categories = result.categories.filter(c => c.isActive);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    },

    /**
     * Loads agents for dropdown
     */
    async loadAgents() {
        try {
            const result = await window.electronAPI.users.getAll();
            if (result.success) {
                // Filter to get agents (users with agent role or similar)
                this.agents = result.users.filter(u => u.isActive);
                this.populateAgentFilter();
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    },

    /**
     * Populates the agent filter dropdown
     */
    populateAgentFilter() {
        const select = document.getElementById('filter-quality-agent');
        if (!select) return;

        select.innerHTML = '<option value="">All Agents</option>';
        this.agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = `${agent.firstName} ${agent.lastName}`;
            select.appendChild(option);
        });
    },

    /**
     * Loads all quality reports
     */
    async loadReports() {
        try {
            const result = await window.electronAPI.quality.getAll(this.filters);
            if (result.success) {
                this.reports = result.reports;
                this.renderTable();
            } else {
                Toast.error(result.error || 'Failed to load quality reports');
            }
        } catch (error) {
            console.error('Failed to load reports:', error);
            Toast.error('Failed to load quality reports');
        }
    },

    /**
     * Loads and displays statistics
     */
    async loadStatistics() {
        try {
            const result = await window.electronAPI.quality.getStatistics();
            if (result.success) {
                const stats = result.statistics;
                document.getElementById('quality-avg-score').textContent = `${stats.averageScore}%`;
                document.getElementById('quality-passing-rate').textContent = `${stats.passingRate}%`;
                document.getElementById('quality-total-evals').textContent = stats.totalReports;
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    },

    /**
     * Applies filters
     */
    applyFilters() {
        this.loadReports();
    },

    /**
     * Renders the quality reports table
     */
    renderTable() {
        const tbody = document.getElementById('quality-tbody');
        if (!tbody) return;

        if (this.reports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">No quality reports found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.reports.map(report => this.renderReportRow(report)).join('');

        // Add click handlers
        tbody.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', () => this.viewReport(btn.dataset.id));
        });

        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.editReport(btn.dataset.id));
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.deleteReport(btn.dataset.id));
        });
    },

    /**
     * Renders a single report row
     */
    renderReportRow(report) {
        const scoreClass = report.passed ? 'score-pass' : 'score-fail';
        const resultBadge = report.passed ? 
            '<span class="badge badge-success">Pass</span>' : 
            '<span class="badge badge-danger">Fail</span>';

        const canEdit = Permissions.canEdit('quality');
        const canDelete = Permissions.canDelete('quality');

        return `
            <tr data-id="${report.id}">
                <td><strong>${Helpers.escapeHtml(report.reportNumber)}</strong></td>
                <td>${Helpers.escapeHtml(report.agentName)}</td>
                <td>${Helpers.escapeHtml(report.evaluatorName)}</td>
                <td>${Helpers.capitalize(report.evaluationType)}</td>
                <td><span class="score-display ${scoreClass}">${report.overallScore}%</span></td>
                <td>${resultBadge}</td>
                <td>${Helpers.formatDate(report.evaluationDate)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-view" data-id="${report.id}" title="View">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        ${canEdit ? `
                            <button class="btn-icon btn-edit" data-id="${report.id}" title="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="btn-icon btn-delete" data-id="${report.id}" title="Delete">
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
     * Shows the evaluation form
     */
    async showEvaluationForm(report = null) {
        const isEdit = !!report;
        const title = isEdit ? 'Edit Evaluation' : 'New Quality Evaluation';

        // Build evaluation form content as HTML string
        const formHtml = `
            <form id="evaluation-form" class="evaluation-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="agentId">Agent *</label>
                        <select id="agentId" name="agentId" class="form-select" required ${isEdit ? 'disabled' : ''}>
                            <option value="">Select Agent</option>
                            ${this.agents.map(a => `
                                <option value="${a.id}" ${report?.agentId === a.id ? 'selected' : ''}>
                                    ${Helpers.escapeHtml(a.firstName)} ${Helpers.escapeHtml(a.lastName)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="evaluationType">Evaluation Type *</label>
                        <select id="evaluationType" name="evaluationType" class="form-select" required>
                            <option value="call" ${report?.evaluationType === 'call' ? 'selected' : ''}>Call</option>
                            <option value="email" ${report?.evaluationType === 'email' ? 'selected' : ''}>Email</option>
                            <option value="chat" ${report?.evaluationType === 'chat' ? 'selected' : ''}>Chat</option>
                            <option value="ticket" ${report?.evaluationType === 'ticket' ? 'selected' : ''}>Ticket</option>
                        </select>
                    </div>
                </div>
                
                <h4 style="margin: var(--spacing-lg) 0 var(--spacing-md);">Category Scores</h4>
                ${this.categories.map(category => {
                    const existingScore = report?.categoryScores?.find(cs => cs.categoryId === category.id);
                    return `
                        <div class="evaluation-category">
                            <div class="evaluation-category-header">
                                <h4>${Helpers.escapeHtml(category.name)}</h4>
                                <span class="evaluation-category-weight">Weight: ${category.weight}%</span>
                            </div>
                            <div class="evaluation-criteria-list">
                                ${category.criteria.map(criterion => `
                                    <div class="evaluation-criterion">
                                        <span class="criterion-name">${Helpers.escapeHtml(criterion.name)}</span>
                                        <div class="criterion-score">
                                            <input type="number" 
                                                name="score_${category.id}_${criterion.id}" 
                                                class="form-input"
                                                min="0" 
                                                max="${criterion.maxScore}"
                                                value="${existingScore?.criteriaScores?.find(cs => cs.criterionId === criterion.id)?.score || 0}"
                                                data-category="${category.id}"
                                                data-criterion="${criterion.id}"
                                                data-max="${criterion.maxScore}"
                                                required>
                                            <span class="criterion-max">/ ${criterion.maxScore}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
                
                <div class="form-group" style="margin-top: var(--spacing-lg);">
                    <label for="strengths">Strengths</label>
                    <textarea id="strengths" name="strengths" class="form-textarea" rows="3" 
                        placeholder="What did the agent do well?">${report?.strengths || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="areasForImprovement">Areas for Improvement</label>
                    <textarea id="areasForImprovement" name="areasForImprovement" class="form-textarea" rows="3"
                        placeholder="What areas need improvement?">${report?.areasForImprovement || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="coachingNotes">Coaching Notes</label>
                    <textarea id="coachingNotes" name="coachingNotes" class="form-textarea" rows="3"
                        placeholder="Notes for coaching session">${report?.coachingNotes || ''}</textarea>
                </div>
            </form>
        `;

        // Convert HTML string to DOM node
        const template = document.createElement('template');
        template.innerHTML = formHtml.trim();
        const content = template.content.firstElementChild || template.content;

        // Footer buttons
        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.gap = 'var(--spacing-sm)';
        footer.style.justifyContent = 'flex-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => Modal.close());

        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = isEdit ? 'Save Changes' : 'Submit Evaluation';
        submitBtn.addEventListener('click', async () => {
            const form = document.getElementById('evaluation-form');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = this.collectEvaluationData();
            if (!formData.agentId) {
                Toast.error('Please select an agent');
                return;
            }

            if (isEdit) {
                await this.updateReport(report.id, formData);
            } else {
                await this.createReport(formData);
            }
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title,
            content,
            footer,
            size: 'lg'
        });
    },

    /**
     * Collects evaluation form data
     */
    collectEvaluationData() {
        const form = document.getElementById('evaluation-form');
        const formData = new FormData(form);
        
        const data = {
            agentId: formData.get('agentId'),
            evaluationType: formData.get('evaluationType'),
            strengths: formData.get('strengths'),
            areasForImprovement: formData.get('areasForImprovement'),
            coachingNotes: formData.get('coachingNotes'),
            categoryScores: []
        };

        // Collect scores
        for (const category of this.categories) {
            const categoryScore = {
                categoryId: category.id,
                criteriaScores: [],
                score: 0,
                maxScore: 0
            };

            for (const criterion of category.criteria) {
                const input = form.querySelector(`[name="score_${category.id}_${criterion.id}"]`);
                const score = parseInt(input.value) || 0;
                categoryScore.criteriaScores.push({
                    criterionId: criterion.id,
                    score,
                    maxScore: criterion.maxScore
                });
                categoryScore.score += score;
                categoryScore.maxScore += criterion.maxScore;
            }

            data.categoryScores.push(categoryScore);
        }

        return data;
    },

    /**
     * Views a report's details
     */
    async viewReport(reportId) {
        try {
            const result = await window.electronAPI.quality.getById(reportId);
            if (!result.success) {
                Toast.error('Failed to load report');
                return;
            }

            const report = result.report;
            const contentHtml = this.buildReportDetailView(report);

            // Convert HTML string to DOM node
            const template = document.createElement('template');
            template.innerHTML = contentHtml.trim();
            const content = template.content.firstElementChild || template.content;

            // Footer with close button
            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.justifyContent = 'flex-end';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-secondary';
            closeBtn.textContent = 'Close';
            closeBtn.addEventListener('click', () => Modal.close());
            footer.appendChild(closeBtn);

            Modal.open({
                title: `Quality Report ${report.reportNumber}`,
                content,
                footer,
                size: 'lg'
            });
        } catch (error) {
            console.error('Failed to view report:', error);
            Toast.error('Failed to load report details');
        }
    },

    /**
     * Builds the report detail view HTML
     */
    buildReportDetailView(report) {
        const scoreClass = report.passed ? 'score-pass' : 'score-fail';
        
        return `
            <div class="ticket-detail">
                <div class="ticket-main">
                    <div class="ticket-section">
                        <div class="ticket-section-header">Category Scores</div>
                        <div class="ticket-section-body">
                            ${report.categoryScores.map(cs => {
                                const category = this.categories.find(c => c.id === cs.categoryId);
                                const percentage = cs.maxScore > 0 ? Math.round((cs.score / cs.maxScore) * 100) : 0;
                                return `
                                    <div style="margin-bottom: var(--spacing-md);">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs);">
                                            <strong>${category?.name || 'Unknown Category'}</strong>
                                            <span>${cs.score}/${cs.maxScore} (${percentage}%)</span>
                                        </div>
                                        <div style="height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                                            <div style="height: 100%; width: ${percentage}%; background: ${percentage >= 80 ? 'var(--color-success)' : 'var(--color-danger)'}"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    ${report.strengths ? `
                        <div class="ticket-section">
                            <div class="ticket-section-header">Strengths</div>
                            <div class="ticket-section-body">
                                <p>${Helpers.escapeHtml(report.strengths)}</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${report.areasForImprovement ? `
                        <div class="ticket-section">
                            <div class="ticket-section-header">Areas for Improvement</div>
                            <div class="ticket-section-body">
                                <p>${Helpers.escapeHtml(report.areasForImprovement)}</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${report.coachingNotes ? `
                        <div class="ticket-section">
                            <div class="ticket-section-header">Coaching Notes</div>
                            <div class="ticket-section-body">
                                <p>${Helpers.escapeHtml(report.coachingNotes)}</p>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="ticket-sidebar">
                    <div class="ticket-section">
                        <div class="ticket-section-header">Summary</div>
                        <div class="ticket-section-body" style="text-align: center;">
                            <div style="font-size: 3rem; font-weight: 700;" class="${scoreClass}">${report.overallScore}%</div>
                            <div style="margin-top: var(--spacing-sm);">
                                ${report.passed ? 
                                    '<span class="badge badge-success" style="font-size: 1rem; padding: 0.5rem 1rem;">PASSED</span>' : 
                                    '<span class="badge badge-danger" style="font-size: 1rem; padding: 0.5rem 1rem;">FAILED</span>'
                                }
                            </div>
                        </div>
                    </div>
                    
                    <div class="ticket-section">
                        <div class="ticket-section-header">Details</div>
                        <div class="ticket-section-body">
                            <div class="ticket-meta-item">
                                <span class="ticket-meta-label">Agent</span>
                                <span>${Helpers.escapeHtml(report.agentName)}</span>
                            </div>
                            <div class="ticket-meta-item">
                                <span class="ticket-meta-label">Evaluator</span>
                                <span>${Helpers.escapeHtml(report.evaluatorName)}</span>
                            </div>
                            <div class="ticket-meta-item">
                                <span class="ticket-meta-label">Type</span>
                                <span>${Helpers.capitalize(report.evaluationType)}</span>
                            </div>
                            <div class="ticket-meta-item">
                                <span class="ticket-meta-label">Date</span>
                                <span>${Helpers.formatDateTime(report.evaluationDate)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Creates a new quality report
     */
    async createReport(reportData) {
        try {
            const result = await window.electronAPI.quality.create(reportData);
            if (result.success) {
                Toast.success('Quality evaluation submitted successfully');
                Modal.close();
                await this.loadReports();
                await this.loadStatistics();
            } else {
                Toast.error(result.error || 'Failed to submit evaluation');
            }
        } catch (error) {
            console.error('Failed to create report:', error);
            Toast.error('Failed to submit evaluation');
        }
    },

    /**
     * Edits an existing report
     */
    async editReport(reportId) {
        try {
            const result = await window.electronAPI.quality.getById(reportId);
            if (result.success) {
                await this.showEvaluationForm(result.report);
            }
        } catch (error) {
            console.error('Failed to load report for editing:', error);
        }
    },

    /**
     * Updates a quality report
     */
    async updateReport(reportId, reportData) {
        try {
            const result = await window.electronAPI.quality.update(reportId, reportData);
            if (result.success) {
                Toast.success('Evaluation updated successfully');
                Modal.close();
                await this.loadReports();
                await this.loadStatistics();
            } else {
                Toast.error(result.error || 'Failed to update evaluation');
            }
        } catch (error) {
            console.error('Failed to update report:', error);
            Toast.error('Failed to update evaluation');
        }
    },

    /**
     * Deletes a quality report
     */
    async deleteReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) return;

        const confirmed = await Modal.confirm({
            title: 'Delete Quality Report',
            message: `Are you sure you want to delete report "${report.reportNumber}"? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const result = await window.electronAPI.quality.delete(reportId);
                if (result.success) {
                    Toast.success('Report deleted successfully');
                    await this.loadReports();
                    await this.loadStatistics();
                } else {
                    Toast.error(result.error || 'Failed to delete report');
                }
            } catch (error) {
                console.error('Failed to delete report:', error);
                Toast.error('Failed to delete report');
            }
        }
    },

    /**
     * Shows categories manager
     */
    async showCategoriesManager() {
        const contentHtml = `
            <div class="categories-manager">
                <div id="categories-list">
                    ${this.categories.map(category => `
                        <div class="category-item" data-id="${category.id}">
                            <div class="category-info">
                                <strong>${Helpers.escapeHtml(category.name)}</strong>
                                <span>Weight: ${category.weight}%</span>
                            </div>
                            <div class="category-criteria">
                                ${category.criteria.map(c => `
                                    <span class="permission-tag">${Helpers.escapeHtml(c.name)} (max: ${c.maxScore})</span>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Convert HTML string to DOM node
        const template = document.createElement('template');
        template.innerHTML = contentHtml.trim();
        const content = template.content.firstElementChild || template.content;

        // Footer with close button
        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-secondary';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', () => Modal.close());
        footer.appendChild(closeBtn);

        Modal.open({
            title: 'Manage Quality Categories',
            content,
            footer,
            size: 'lg'
        });
    },

    /**
     * Exports quality reports
     */
    async exportReports() {
        try {
            const result = await window.electronAPI.quality.exportReports(this.filters, 'csv');
            if (result.success) {
                Helpers.downloadFile(result.data, 'quality_reports.csv', 'text/csv');
                Toast.success('Reports exported successfully');
            } else {
                Toast.error(result.error || 'Failed to export reports');
            }
        } catch (error) {
            console.error('Failed to export reports:', error);
            Toast.error('Failed to export reports');
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadReports();
        await this.loadStatistics();
    }
};

// Export for use in other modules
window.QualityView = QualityView;
