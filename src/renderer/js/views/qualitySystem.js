/**
 * Quality System v2 Views
 * Handles all Quality System pages and functionality
 */

const QualitySystemViews = {
    currentTeam: null,
    currentTeamId: null,
    teams: [],
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async init() {
        await this.loadTeams();
    },
    
    async loadTeams() {
        try {
            const result = await api.qs.getTeams();
            if (result.success) {
                this.teams = result.teams;
            }
        } catch (error) {
            console.error('Failed to load teams:', error);
        }
    },
    
    getTeamByCode(code) {
        return this.teams.find(t => t.teamCode === code);
    },

    // ============================================
    // MAIN TILES PAGE
    // ============================================
    
    async showMainPage() {
        await this.loadTeams();
        
        // Update tile statistics
        for (const team of this.teams) {
            const agents = await api.qs.getTeamAgents(team.id);
            if (agents.success) {
                const statEl = document.getElementById(`qs-stat-${team.teamCode.replace('_', '-')}-agents`);
                if (statEl) {
                    statEl.textContent = `${agents.agents.length} Agents`;
                }
            }
        }
        
        // Update tracking stats
        const trackingStats = await api.qs.getTrackingStatistics();
        if (trackingStats.success) {
            const trackingEl = document.getElementById('qs-stat-tracking-total');
            if (trackingEl) {
                trackingEl.textContent = `${trackingStats.statistics.totalEvaluations} Evaluierungen`;
            }
        }
        
        // Update my results stats
        if (Permissions.canViewOwnQSResults()) {
            const myResults = await api.qs.getMyResults();
            if (myResults.success) {
                const myResultsEl = document.getElementById('qs-stat-my-results');
                if (myResultsEl) {
                    myResultsEl.textContent = `${myResults.totalEvaluations} Checks`;
                }
            }
        }
        
        // Setup tile click handlers
        document.querySelectorAll('.qs-tile[data-navigate]').forEach(tile => {
            tile.onclick = () => {
                const view = tile.dataset.navigate;
                if (view && Permissions.hasPermission(tile.dataset.permission)) {
                    App.navigateTo(view);
                }
            };
        });
        
        // Show/hide tiles based on permissions
        this.updateTileVisibility();
    },
    
    updateTileVisibility() {
        document.querySelectorAll('.qs-tile[data-permission]').forEach(tile => {
            const perm = tile.dataset.permission;
            tile.style.display = Permissions.hasPermission(perm) ? '' : 'none';
        });
        
        // Check if any tiles are visible
        const visibleTiles = document.querySelectorAll('.qs-tile[data-permission]:not([style*="display: none"])');
        const noAccessMsg = document.getElementById('qs-no-access-message');
        if (noAccessMsg) {
            noAccessMsg.style.display = visibleTiles.length === 0 ? 'block' : 'none';
        }
    },

    // ============================================
    // TEAM VIEW (BILLA / Social Media)
    // ============================================
    
    async showTeamView(teamCode) {
        const team = this.getTeamByCode(teamCode);
        if (!team) {
            Toast.error('Team nicht gefunden');
            App.navigateTo('qualitySystem');
            return;
        }
        
        this.currentTeam = team;
        this.currentTeamId = team.id;
        
        // Update title
        document.getElementById('qs-team-title').textContent = team.name;
        
        // Setup back button
        document.getElementById('qs-team-back-btn').onclick = () => App.navigateTo('qualitySystem');
        
        // Setup action buttons
        document.getElementById('qs-team-tasks-btn').onclick = () => this.showTasksCatalog(teamCode);
        document.getElementById('qs-team-checks-btn').onclick = () => this.showChecksCatalog(teamCode);
        document.getElementById('qs-new-evaluation-btn').onclick = () => this.showNewEvaluationModal();
        
        // Setup view toggle
        document.getElementById('qs-view-agents-btn').onclick = () => this.toggleTeamView('agents');
        document.getElementById('qs-view-evaluations-btn').onclick = () => this.toggleTeamView('evaluations');
        
        // Setup search
        document.getElementById('qs-team-search').oninput = (e) => this.filterTeamView(e.target.value);
        
        // Load data
        await this.loadTeamStats();
        await this.loadTeamAgents();
        await this.loadTeamEvaluations();
        
        // Show agents view by default
        this.toggleTeamView('agents');
    },
    
    async loadTeamStats() {
        const result = await api.qs.getTeamStatistics(this.currentTeamId);
        if (result.success) {
            const stats = result.statistics;
            document.getElementById('qs-stat-team-agents').textContent = stats.totalAgents;
            document.getElementById('qs-stat-team-evaluations').textContent = stats.totalEvaluations;
            document.getElementById('qs-stat-team-week').textContent = stats.evaluationsThisWeek;
            document.getElementById('qs-stat-team-avg').textContent = `${stats.averageScore}%`;
            document.getElementById('qs-stat-team-pass').textContent = `${stats.passingRate}%`;
        }
    },
    
    async loadTeamAgents() {
        const result = await api.qs.getTeamAgents(this.currentTeamId);
        if (!result.success) {
            Toast.error('Fehler beim Laden der Agents');
            return;
        }
        
        const tbody = document.getElementById('qs-agents-tbody');
        const emptyState = document.getElementById('qs-agents-empty');
        
        if (result.agents.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        // Load stats for each agent
        const agentsWithStats = await Promise.all(result.agents.map(async agent => {
            const statsResult = await api.qs.getAgentStatistics(agent.id, this.currentTeamId);
            return {
                ...agent,
                stats: statsResult.success ? statsResult.statistics : { totalEvaluations: 0, averageScore: 0 }
            };
        }));
        
        tbody.innerHTML = agentsWithStats.map(agent => `
            <tr data-agent-id="${agent.id}">
                <td>${agent.first_name} ${agent.last_name}</td>
                <td>${agent.role_name || '-'}</td>
                <td>${agent.stats.totalEvaluations}</td>
                <td>${agent.stats.averageScore}%</td>
                <td>${agent.stats.recentEvaluations?.[0]?.createdAt ? 
                    new Date(agent.stats.recentEvaluations[0].createdAt).toLocaleDateString('de-DE') : '-'}</td>
                <td>
                    <button class="btn btn-icon btn-sm" onclick="QualitySystemViews.viewAgentDetails('${agent.id}')" title="Details">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="btn btn-icon btn-sm btn-primary" onclick="QualitySystemViews.startEvaluationForAgent('${agent.id}')" title="Neuer Check" data-permission="qs_evaluate">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    },
    
    async loadTeamEvaluations() {
        const result = await api.qs.getEvaluations(this.currentTeamId, { limit: 100 });
        if (!result.success) {
            Toast.error('Fehler beim Laden der Evaluierungen');
            return;
        }
        
        const tbody = document.getElementById('qs-evaluations-tbody');
        const emptyState = document.getElementById('qs-evaluations-empty');
        
        if (result.evaluations.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        tbody.innerHTML = result.evaluations.map(evaluation => `
            <tr data-evaluation-id="${evaluation.id}">
                <td><code>${evaluation.evaluationNumber}</code></td>
                <td>${evaluation.agentName}</td>
                <td>${evaluation.checkName}</td>
                <td>${evaluation.evaluatorName}</td>
                <td>
                    <span class="badge ${evaluation.passed ? 'badge-success' : 'badge-danger'}">
                        ${evaluation.percentage}%
                    </span>
                </td>
                <td>
                    <span class="badge ${evaluation.status === 'completed' ? 'badge-success' : 'badge-warning'}">
                        ${evaluation.status === 'completed' ? 'Abgeschlossen' : 'In Bearbeitung'}
                    </span>
                </td>
                <td>${new Date(evaluation.createdAt).toLocaleDateString('de-DE')}</td>
                <td>
                    <button class="btn btn-icon btn-sm" onclick="QualitySystemViews.viewEvaluationResult('${evaluation.id}')" title="Ansehen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    ${evaluation.status === 'in_progress' ? `
                        <button class="btn btn-icon btn-sm btn-primary" onclick="QualitySystemViews.continueEvaluation('${evaluation.id}')" title="Fortsetzen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    },
    
    toggleTeamView(view) {
        const agentsView = document.getElementById('qs-agents-view');
        const evaluationsView = document.getElementById('qs-evaluations-view');
        const agentsBtn = document.getElementById('qs-view-agents-btn');
        const evaluationsBtn = document.getElementById('qs-view-evaluations-btn');
        const statusFilter = document.getElementById('qs-filter-status-group');
        const dateFilter = document.getElementById('qs-filter-date-group');
        
        if (view === 'agents') {
            agentsView.style.display = 'block';
            evaluationsView.style.display = 'none';
            agentsBtn.classList.add('active');
            evaluationsBtn.classList.remove('active');
            statusFilter.style.display = 'none';
            dateFilter.style.display = 'none';
        } else {
            agentsView.style.display = 'none';
            evaluationsView.style.display = 'block';
            agentsBtn.classList.remove('active');
            evaluationsBtn.classList.add('active');
            statusFilter.style.display = 'block';
            dateFilter.style.display = 'block';
        }
    },
    
    filterTeamView(searchText) {
        const agentsView = document.getElementById('qs-agents-view');
        const evaluationsView = document.getElementById('qs-evaluations-view');
        const search = searchText.toLowerCase();
        
        if (agentsView.style.display !== 'none') {
            document.querySelectorAll('#qs-agents-tbody tr').forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(search) ? '' : 'none';
            });
        } else {
            document.querySelectorAll('#qs-evaluations-tbody tr').forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(search) ? '' : 'none';
            });
        }
    },

    // ============================================
    // TASKS CATALOG
    // ============================================
    
    async showTasksCatalog(teamCode) {
        const team = this.getTeamByCode(teamCode);
        if (!team) return;
        
        this.currentTeam = team;
        this.currentTeamId = team.id;
        
        // Load the template if not already loaded
        const container = document.getElementById('main-content');
        if (!document.getElementById('view-qsTasks')) {
            const template = await fetch('templates/qsTasks.html').then(r => r.text());
            container.insertAdjacentHTML('beforeend', template);
        }
        
        // Hide other views and show tasks
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-qsTasks').classList.add('active');
        
        // Update title
        document.getElementById('qs-tasks-title').textContent = `${team.name} - Aufgaben Katalog`;
        
        // Setup back button
        document.getElementById('qs-tasks-back-btn').onclick = () => {
            if (teamCode === 'billa') App.navigateTo('qsTeamBilla');
            else if (teamCode === 'social_media') App.navigateTo('qsTeamSocial');
            else App.navigateTo('qualitySystem');
        };
        
        // Setup action buttons
        document.getElementById('qs-manage-task-categories-btn').onclick = () => this.showManageCategoriesModal('task');
        document.getElementById('qs-add-task-btn').onclick = () => this.showTaskModal();
        
        // Setup filters
        document.getElementById('qs-tasks-search').oninput = () => this.filterTasks();
        document.getElementById('qs-tasks-category-filter').onchange = () => this.filterTasks();
        document.getElementById('qs-tasks-scoring-filter').onchange = () => this.filterTasks();
        document.getElementById('qs-tasks-archived-filter').onchange = () => this.loadTasks();
        
        // Load data
        await this.loadTaskCategories();
        await this.loadTasks();
    },
    
    async loadTaskCategories() {
        const result = await api.qs.getTaskCategories(this.currentTeamId);
        if (!result.success) return;
        
        // Update sidebar
        const sidebar = document.getElementById('qs-task-categories-list');
        sidebar.innerHTML = `
            <div class="qs-category-item active" data-category="">
                <span>Alle Kategorien</span>
                <span class="count" id="qs-tasks-count-all">0</span>
            </div>
            ${result.categories.map(cat => `
                <div class="qs-category-item" data-category="${cat.id}">
                    <span>${cat.name}</span>
                    <span class="count" id="qs-tasks-count-${cat.id}">0</span>
                </div>
            `).join('')}
        `;
        
        // Setup click handlers
        sidebar.querySelectorAll('.qs-category-item').forEach(item => {
            item.onclick = () => {
                sidebar.querySelectorAll('.qs-category-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.getElementById('qs-tasks-category-filter').value = item.dataset.category;
                this.filterTasks();
            };
        });
        
        // Update filter dropdown
        const filterSelect = document.getElementById('qs-tasks-category-filter');
        filterSelect.innerHTML = `
            <option value="">Alle Kategorien</option>
            ${result.categories.map(cat => `
                <option value="${cat.id}">${cat.name}</option>
            `).join('')}
        `;
    },
    
    async loadTasks() {
        const includeArchived = document.getElementById('qs-tasks-archived-filter')?.checked;
        const result = await api.qs.getTasks(this.currentTeamId, { includeArchived });
        
        if (!result.success) {
            Toast.error('Fehler beim Laden der Aufgaben');
            return;
        }
        
        this.currentTasks = result.tasks;
        
        // Update counts
        document.getElementById('qs-tasks-count-all').textContent = result.tasks.length;
        
        // Count by category
        const catCounts = {};
        result.tasks.forEach(t => {
            if (t.categoryId) {
                catCounts[t.categoryId] = (catCounts[t.categoryId] || 0) + 1;
            }
        });
        Object.entries(catCounts).forEach(([catId, count]) => {
            const el = document.getElementById(`qs-tasks-count-${catId}`);
            if (el) el.textContent = count;
        });
        
        this.renderTasks(result.tasks);
    },
    
    renderTasks(tasks) {
        const list = document.getElementById('qs-tasks-list');
        const emptyState = document.getElementById('qs-tasks-empty');
        
        if (tasks.length === 0) {
            list.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        list.innerHTML = tasks.map(task => `
            <div class="qs-task-item ${task.isArchived ? 'archived' : ''}" data-task-id="${task.id}">
                <div class="qs-task-header">
                    <h4>
                        ${task.title || 'Ohne Titel'}
                        <span class="qs-task-number">${task.taskNumber}</span>
                    </h4>
                    <div class="qs-task-actions">
                        <button class="btn btn-icon btn-sm" onclick="QualitySystemViews.showTaskModal('${task.id}')" title="Bearbeiten" data-permission="qs_tasks_edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        ${task.isArchived ? `
                            <button class="btn btn-icon btn-sm" onclick="QualitySystemViews.restoreTask('${task.id}')" title="Wiederherstellen" data-permission="qs_tasks_delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                    <polyline points="1 4 1 10 7 10"></polyline>
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                </svg>
                            </button>
                        ` : `
                            <button class="btn btn-icon btn-sm btn-danger" onclick="QualitySystemViews.deleteTask('${task.id}')" title="Löschen" data-permission="qs_tasks_delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        `}
                    </div>
                </div>
                <div class="qs-task-body">${task.taskText}</div>
                <div class="qs-task-meta">
                    <span class="qs-task-meta-item">
                        <span class="scoring-badge ${task.scoringType}">${this.getScoringTypeLabel(task)}</span>
                    </span>
                    <span class="qs-task-meta-item">Gewichtung: ${task.effectiveWeight}</span>
                    ${task.categoryName ? `<span class="qs-task-meta-item">Kategorie: ${task.categoryName}</span>` : ''}
                    ${task.references?.length ? `<span class="qs-task-meta-item">${task.references.length} Referenz(en)</span>` : ''}
                </div>
            </div>
        `).join('');
        
        // Update permission-based visibility
        Permissions.updateViewElements();
    },
    
    getScoringTypeLabel(task) {
        switch (task.scoringType) {
            case 'points': return `Punkte (max ${task.maxPoints})`;
            case 'scale': return `Skala 1-${task.scaleSize}${task.scaleInverted ? ' (invertiert)' : ''}`;
            case 'checkbox': return 'Ja/Nein';
            default: return task.scoringType;
        }
    },
    
    filterTasks() {
        const search = document.getElementById('qs-tasks-search').value.toLowerCase();
        const categoryId = document.getElementById('qs-tasks-category-filter').value;
        const scoringType = document.getElementById('qs-tasks-scoring-filter').value;
        
        let filtered = this.currentTasks || [];
        
        if (search) {
            filtered = filtered.filter(t => 
                t.title?.toLowerCase().includes(search) || 
                t.taskText?.toLowerCase().includes(search) ||
                t.taskNumber?.toLowerCase().includes(search)
            );
        }
        
        if (categoryId) {
            filtered = filtered.filter(t => t.categoryId === categoryId);
        }
        
        if (scoringType) {
            filtered = filtered.filter(t => t.scoringType === scoringType);
        }
        
        this.renderTasks(filtered);
    },

    // ============================================
    // CHECKS CATALOG
    // ============================================
    
    async showChecksCatalog(teamCode) {
        const team = this.getTeamByCode(teamCode);
        if (!team) return;
        
        this.currentTeam = team;
        this.currentTeamId = team.id;
        
        // Load the template if not already loaded
        const container = document.getElementById('main-content');
        if (!document.getElementById('view-qsChecks')) {
            const template = await fetch('templates/qsChecks.html').then(r => r.text());
            container.insertAdjacentHTML('beforeend', template);
        }
        
        // Hide other views and show checks
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-qsChecks').classList.add('active');
        
        // Update title
        document.getElementById('qs-checks-title').textContent = `${team.name} - Check Katalog`;
        
        // Setup back button
        document.getElementById('qs-checks-back-btn').onclick = () => {
            if (teamCode === 'billa') App.navigateTo('qsTeamBilla');
            else if (teamCode === 'social_media') App.navigateTo('qsTeamSocial');
            else App.navigateTo('qualitySystem');
        };
        
        // Setup action buttons
        document.getElementById('qs-manage-check-categories-btn').onclick = () => this.showManageCategoriesModal('check');
        document.getElementById('qs-add-check-btn').onclick = () => this.showCheckModal();
        
        // Load data
        await this.loadCheckCategories();
        await this.loadChecks();
    },
    
    async loadCheckCategories() {
        const result = await api.qs.getCheckCategories(this.currentTeamId);
        if (!result.success) return;
        
        // Update sidebar
        const sidebar = document.getElementById('qs-check-categories-list');
        sidebar.innerHTML = `
            <div class="qs-category-item active" data-category="">
                <span>Alle Kategorien</span>
            </div>
            ${result.categories.map(cat => `
                <div class="qs-category-item" data-category="${cat.id}">
                    <span>${cat.name}</span>
                </div>
            `).join('')}
        `;
        
        // Setup click handlers
        sidebar.querySelectorAll('.qs-category-item').forEach(item => {
            item.onclick = () => {
                sidebar.querySelectorAll('.qs-category-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.getElementById('qs-checks-category-filter').value = item.dataset.category;
                this.filterChecks();
            };
        });
        
        // Update filter dropdown
        const filterSelect = document.getElementById('qs-checks-category-filter');
        filterSelect.innerHTML = `
            <option value="">Alle Kategorien</option>
            ${result.categories.map(cat => `
                <option value="${cat.id}">${cat.name}</option>
            `).join('')}
        `;
    },
    
    async loadChecks() {
        const includeArchived = document.getElementById('qs-checks-archived-filter')?.checked;
        const result = await api.qs.getChecks(this.currentTeamId, { includeArchived, includeTasks: true });
        
        if (!result.success) {
            Toast.error('Fehler beim Laden der Checks');
            return;
        }
        
        this.currentChecks = result.checks;
        this.renderChecks(result.checks);
    },
    
    renderChecks(checks) {
        const grid = document.getElementById('qs-checks-grid');
        const emptyState = document.getElementById('qs-checks-empty');
        
        if (checks.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        grid.innerHTML = checks.map(check => `
            <div class="qs-check-card ${check.isArchived ? 'archived' : ''}" data-check-id="${check.id}" onclick="QualitySystemViews.showCheckDetails('${check.id}')">
                <div class="qs-check-header">
                    <h4>${check.name}</h4>
                    <span class="qs-check-number">${check.checkNumber}</span>
                </div>
                <p class="qs-check-description">${check.description || 'Keine Beschreibung'}</p>
                <div class="qs-check-stats">
                    <span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                        </svg>
                        ${check.taskCount} Aufgaben
                    </span>
                    <span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        ${check.passingScore}% zum Bestehen
                    </span>
                </div>
            </div>
        `).join('');
    },
    
    filterChecks() {
        const search = document.getElementById('qs-checks-search')?.value.toLowerCase();
        const categoryId = document.getElementById('qs-checks-category-filter')?.value;
        
        let filtered = this.currentChecks || [];
        
        if (search) {
            filtered = filtered.filter(c => 
                c.name?.toLowerCase().includes(search) || 
                c.description?.toLowerCase().includes(search) ||
                c.checkNumber?.toLowerCase().includes(search)
            );
        }
        
        if (categoryId) {
            filtered = filtered.filter(c => c.categoryId === categoryId);
        }
        
        this.renderChecks(filtered);
    },

    // ============================================
    // TRACKING VIEW
    // ============================================
    
    async showTrackingView() {
        // Update back button
        document.getElementById('qs-tracking-back-btn').onclick = () => App.navigateTo('qualitySystem');
        
        // Load statistics
        await this.loadTrackingStats();
        await this.loadTrackingEvaluations();
        
        // Setup filters
        document.getElementById('qs-tracking-search').oninput = () => this.filterTracking();
        document.getElementById('qs-tracking-team-filter').onchange = () => this.filterTracking();
        document.getElementById('qs-tracking-status-filter').onchange = () => this.filterTracking();
        document.getElementById('qs-tracking-result-filter').onchange = () => this.filterTracking();
    },
    
    async loadTrackingStats() {
        const result = await api.qs.getTrackingStatistics();
        if (!result.success) return;
        
        const stats = result.statistics;
        document.getElementById('qs-tracking-total').textContent = stats.totalEvaluations;
        document.getElementById('qs-tracking-month').textContent = stats.evaluationsThisMonth;
        document.getElementById('qs-tracking-avg').textContent = `${stats.averageScore}%`;
        document.getElementById('qs-tracking-pass').textContent = `${stats.passingRate}%`;
        
        // Team cards
        const teamCardsEl = document.getElementById('qs-team-cards');
        teamCardsEl.innerHTML = stats.teamStats.map(team => `
            <div class="qs-team-stat-card">
                <h4>${team.teamName}</h4>
                <div class="team-stats-grid">
                    <div class="mini-stat">
                        <div class="mini-stat-value">${team.totalEvaluations}</div>
                        <div class="mini-stat-label">Evaluierungen</div>
                    </div>
                    <div class="mini-stat">
                        <div class="mini-stat-value">${team.totalAgents}</div>
                        <div class="mini-stat-label">Agents</div>
                    </div>
                    <div class="mini-stat">
                        <div class="mini-stat-value">${team.averageScore}%</div>
                        <div class="mini-stat-label">Ø Score</div>
                    </div>
                    <div class="mini-stat">
                        <div class="mini-stat-value">${team.passingRate}%</div>
                        <div class="mini-stat-label">Bestanden</div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Update team filter
        const teamFilter = document.getElementById('qs-tracking-team-filter');
        teamFilter.innerHTML = `
            <option value="">Alle Teams</option>
            ${stats.teamStats.map(team => `
                <option value="${team.teamId}">${team.teamName}</option>
            `).join('')}
        `;
    },
    
    async loadTrackingEvaluations() {
        const result = await api.qs.getTrackingEvaluations({ limit: 100 });
        if (!result.success) return;
        
        this.trackingEvaluations = result.evaluations;
        this.renderTrackingEvaluations(result.evaluations);
    },
    
    renderTrackingEvaluations(evaluations) {
        const tbody = document.getElementById('qs-tracking-tbody');
        const emptyState = document.getElementById('qs-tracking-empty');
        
        if (evaluations.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        tbody.innerHTML = evaluations.map(e => `
            <tr data-evaluation-id="${e.id}">
                <td><code>${e.evaluationNumber}</code></td>
                <td>${e.teamName}</td>
                <td>${e.agentName}</td>
                <td>${e.checkName}</td>
                <td>${e.evaluatorName}</td>
                <td>
                    <span class="badge ${e.passed ? 'badge-success' : 'badge-danger'}">${e.percentage}%</span>
                </td>
                <td>
                    <span class="badge ${e.status === 'completed' ? 'badge-success' : 'badge-warning'}">
                        ${e.status === 'completed' ? 'Abgeschlossen' : 'In Bearbeitung'}
                    </span>
                </td>
                <td>${new Date(e.createdAt).toLocaleDateString('de-DE')}</td>
                <td>
                    <button class="btn btn-icon btn-sm" onclick="QualitySystemViews.viewEvaluationResult('${e.id}')" title="Ansehen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    },
    
    filterTracking() {
        const search = document.getElementById('qs-tracking-search').value.toLowerCase();
        const teamId = document.getElementById('qs-tracking-team-filter').value;
        const status = document.getElementById('qs-tracking-status-filter').value;
        const resultFilter = document.getElementById('qs-tracking-result-filter').value;
        
        let filtered = this.trackingEvaluations || [];
        
        if (search) {
            filtered = filtered.filter(e => 
                e.evaluationNumber?.toLowerCase().includes(search) ||
                e.agentName?.toLowerCase().includes(search) ||
                e.checkName?.toLowerCase().includes(search) ||
                e.evaluatorName?.toLowerCase().includes(search)
            );
        }
        
        if (teamId) {
            filtered = filtered.filter(e => e.teamId === teamId);
        }
        
        if (status) {
            filtered = filtered.filter(e => e.status === status);
        }
        
        if (resultFilter === 'passed') {
            filtered = filtered.filter(e => e.passed);
        } else if (resultFilter === 'failed') {
            filtered = filtered.filter(e => !e.passed);
        }
        
        this.renderTrackingEvaluations(filtered);
    },

    // ============================================
    // MY RESULTS VIEW
    // ============================================
    
    async showMyResultsView() {
        document.getElementById('qs-my-results-back-btn').onclick = () => App.navigateTo('qualitySystem');
        
        const result = await api.qs.getMyResults();
        if (!result.success) {
            Toast.error('Fehler beim Laden der Ergebnisse');
            return;
        }
        
        // Update stats
        document.getElementById('qs-my-total').textContent = result.totalEvaluations;
        document.getElementById('qs-my-avg').textContent = `${result.averageScore}%`;
        document.getElementById('qs-my-pass').textContent = `${result.passingRate}%`;
        
        // Render results list
        const list = document.getElementById('qs-my-results-list');
        const emptyState = document.getElementById('qs-my-results-empty');
        
        if (!result.recentEvaluations?.length) {
            list.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        list.innerHTML = result.recentEvaluations.map(e => `
            <div class="qs-my-result-card" onclick="QualitySystemViews.viewEvaluationResult('${e.id}')">
                <div class="qs-my-result-score ${e.passed ? 'passed' : 'failed'}">
                    <span class="value">${e.percentage}%</span>
                    <span class="label">${e.passed ? 'Bestanden' : 'Nicht best.'}</span>
                </div>
                <div class="qs-my-result-info">
                    <h4>${e.checkName}</h4>
                    <p>Evaluator: ${e.evaluatorName}</p>
                </div>
                <div class="qs-my-result-date">
                    ${new Date(e.createdAt).toLocaleDateString('de-DE')}
                </div>
            </div>
        `).join('');
    },

    // ============================================
    // EVALUATION RESULT VIEW
    // ============================================
    
    async viewEvaluationResult(evaluationId) {
        // Load the template if not already loaded
        const container = document.getElementById('main-content');
        if (!document.getElementById('view-qsResult')) {
            const template = await fetch('templates/qsResult.html').then(r => r.text());
            container.insertAdjacentHTML('beforeend', template);
        }
        
        // Hide other views and show result
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-qsResult').classList.add('active');
        
        // Load evaluation data
        const result = await api.qs.getEvaluationById(evaluationId);
        if (!result.success) {
            Toast.error('Fehler beim Laden der Evaluierung');
            App.navigateTo('qualitySystem');
            return;
        }
        
        const evaluation = result.evaluation;
        this.currentEvaluation = evaluation;
        
        // Setup back button
        document.getElementById('qs-result-back-btn').onclick = () => {
            if (this.currentTeam) {
                if (this.currentTeam.teamCode === 'billa') App.navigateTo('qsTeamBilla');
                else if (this.currentTeam.teamCode === 'social_media') App.navigateTo('qsTeamSocial');
                else App.navigateTo('qualitySystem');
            } else {
                App.navigateTo('qualitySystem');
            }
        };
        
        // Update title
        document.getElementById('qs-result-title').textContent = `Evaluierung ${evaluation.evaluationNumber}`;
        
        // Update score circle
        const scoreCircle = document.getElementById('qs-result-score-circle');
        scoreCircle.className = `score-circle ${evaluation.passed ? 'passed' : 'failed'}`;
        document.getElementById('qs-result-percentage').textContent = `${evaluation.percentage}%`;
        document.getElementById('qs-result-status').textContent = evaluation.passed ? 'Bestanden' : 'Nicht bestanden';
        
        // Update details
        document.getElementById('qs-result-number').textContent = evaluation.evaluationNumber;
        document.getElementById('qs-result-agent').textContent = evaluation.agentName;
        document.getElementById('qs-result-evaluator').textContent = evaluation.evaluatorName;
        document.getElementById('qs-result-check').textContent = evaluation.checkName;
        document.getElementById('qs-result-channel').textContent = evaluation.interactionChannel || '-';
        document.getElementById('qs-result-reference').textContent = evaluation.interactionReference || '-';
        document.getElementById('qs-result-date').textContent = new Date(evaluation.completedAt || evaluation.createdAt).toLocaleDateString('de-DE');
        document.getElementById('qs-result-points').textContent = `${evaluation.totalScore.toFixed(1)} / ${evaluation.maxScore.toFixed(1)}`;
        
        // Render task results
        const tasksList = document.getElementById('qs-result-tasks-list');
        tasksList.innerHTML = evaluation.answers?.map(answer => {
            const scorePercent = answer.maxScore > 0 ? (answer.score / answer.maxScore * 100) : 0;
            const isGood = scorePercent >= 70;
            
            return `
                <div class="qs-result-task-item ${isGood ? 'passed' : 'failed'}">
                    <div class="qs-result-task-header">
                        <h4>${answer.task?.title || 'Aufgabe'}</h4>
                        <span class="qs-result-task-score ${isGood ? 'good' : 'bad'}">
                            ${answer.score.toFixed(1)} / ${answer.maxScore.toFixed(1)}
                        </span>
                    </div>
                    <p class="qs-result-task-text">${answer.task?.taskText || ''}</p>
                    ${answer.notes ? `<div class="qs-result-task-notes"><strong>Notiz:</strong> ${answer.notes}</div>` : ''}
                </div>
            `;
        }).join('') || '<p>Keine Antworten vorhanden</p>';
        
        // Show supervisor notes if user has permission
        const notesSection = document.getElementById('qs-result-notes-section');
        if (evaluation.supervisorNotes && Permissions.canViewSupervisorNotes()) {
            notesSection.style.display = 'block';
            document.getElementById('qs-result-supervisor-notes').textContent = evaluation.supervisorNotes;
        } else {
            notesSection.style.display = 'none';
        }
        
        // Show evidence if any
        const evidenceSection = document.getElementById('qs-result-evidence-section');
        if (evaluation.evidence?.length) {
            evidenceSection.style.display = 'block';
            const evidenceList = document.getElementById('qs-result-evidence-list');
            evidenceList.innerHTML = evaluation.evidence.map(e => {
                if (e.evidenceType === 'image') {
                    return `
                        <div class="qs-evidence-gallery-item">
                            <img src="${e.filePath ? `/api/files/${e.filePath}` : ''}" alt="Evidence">
                            <div class="file-name">${e.fileName || 'Bild'}</div>
                        </div>
                    `;
                } else if (e.evidenceType === 'file') {
                    return `
                        <div class="qs-evidence-gallery-item">
                            <div class="file-preview">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                            </div>
                            <div class="file-name">${e.fileName || 'Datei'}</div>
                        </div>
                    `;
                } else if (e.evidenceType === 'link') {
                    return `
                        <div class="qs-evidence-gallery-item">
                            <a href="${e.url}" target="_blank">${e.url}</a>
                        </div>
                    `;
                }
                return `<div class="qs-evidence-gallery-item"><p>${e.evidenceText || ''}</p></div>`;
            }).join('');
        } else {
            evidenceSection.style.display = 'none';
        }
        
        // Setup delete button
        document.getElementById('qs-result-delete-btn').onclick = () => this.deleteEvaluation(evaluationId);
    },

    // ============================================
    // MODALS
    // ============================================
    
    async showNewEvaluationModal() {
        // Load checks for selection
        const checksResult = await api.qs.getChecks(this.currentTeamId, { includeTasks: false });
        const agentsResult = await api.qs.getTeamAgents(this.currentTeamId);
        
        if (!checksResult.success || !agentsResult.success) {
            Toast.error('Fehler beim Laden der Daten');
            return;
        }
        
        const content = `
            <form id="new-evaluation-form">
                <div class="form-group">
                    <label for="eval-agent">Agent *</label>
                    <select id="eval-agent" class="form-select" required>
                        <option value="">Agent auswählen...</option>
                        ${agentsResult.agents.map(a => `
                            <option value="${a.id}">${a.first_name} ${a.last_name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="eval-check">Quality Check *</label>
                    <select id="eval-check" class="form-select" required>
                        <option value="">Check auswählen...</option>
                        ${checksResult.checks.map(c => `
                            <option value="${c.id}">${c.name} (${c.checkNumber})</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="eval-channel">Interaktionskanal</label>
                    <select id="eval-channel" class="form-select">
                        <option value="ticket">Ticket</option>
                        <option value="call">Anruf</option>
                        <option value="chat">Chat</option>
                        <option value="email">E-Mail</option>
                        <option value="social">Social Media</option>
                        <option value="other">Sonstige</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="eval-reference">Referenz (Ticket-Nr., Link, etc.)</label>
                    <input type="text" id="eval-reference" class="form-input" placeholder="Optional">
                </div>
                ${Permissions.canCreateRandomEvaluations() ? `
                    <div class="form-group">
                        <button type="button" class="btn btn-secondary" onclick="QualitySystemViews.selectRandomAgent()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <polyline points="16 3 21 3 21 8"></polyline>
                                <line x1="4" y1="20" x2="21" y2="3"></line>
                                <polyline points="21 16 21 21 16 21"></polyline>
                                <line x1="15" y1="15" x2="21" y2="21"></line>
                                <line x1="4" y1="4" x2="9" y2="9"></line>
                            </svg>
                            Zufälligen Agent wählen
                        </button>
                    </div>
                ` : ''}
            </form>
        `;
        
        Modal.show({
            title: 'Neuer Quality Check',
            content,
            size: 'medium',
            buttons: [
                { text: 'Abbrechen', className: 'btn-secondary', action: 'close' },
                { text: 'Starten', className: 'btn-primary', action: () => this.createAndStartEvaluation() }
            ]
        });
    },
    
    async selectRandomAgent() {
        const result = await api.qs.createRandomEvaluation(this.currentTeamId, {
            checkId: document.getElementById('eval-check').value,
            interactionChannel: document.getElementById('eval-channel').value
        });
        
        if (result.success && result.agent) {
            document.getElementById('eval-agent').value = result.agent.id;
            Toast.success(`Zufälliger Agent ausgewählt: ${result.agent.first_name} ${result.agent.last_name}`);
        } else {
            Toast.error(result.error || 'Konnte keinen Agent auswählen');
        }
    },
    
    async createAndStartEvaluation() {
        const agentId = document.getElementById('eval-agent').value;
        const checkId = document.getElementById('eval-check').value;
        const channel = document.getElementById('eval-channel').value;
        const reference = document.getElementById('eval-reference').value;
        
        if (!agentId || !checkId) {
            Toast.error('Bitte Agent und Check auswählen');
            return;
        }
        
        const result = await api.qs.createEvaluation(this.currentTeamId, {
            agentId,
            checkId,
            interactionChannel: channel,
            interactionReference: reference
        });
        
        if (result.success) {
            Modal.close();
            this.startEvaluationForm(result.evaluation.id);
        } else {
            Toast.error(result.error || 'Fehler beim Erstellen der Evaluierung');
        }
    },
    
    async startEvaluationForAgent(agentId) {
        // Set agent in modal and show
        await this.showNewEvaluationModal();
        setTimeout(() => {
            document.getElementById('eval-agent').value = agentId;
        }, 100);
    },

    async showTaskModal(taskId = null) {
        // Load categories for selection
        const catResult = await api.qs.getTaskCategories(this.currentTeamId);
        const categories = catResult.success ? catResult.categories : [];
        
        let task = null;
        if (taskId) {
            const taskResult = await api.qs.getTaskById(taskId);
            if (taskResult.success) {
                task = taskResult.task;
            }
        }
        
        const content = `
            <form id="task-form">
                <div class="form-group">
                    <label for="task-title">Titel (optional)</label>
                    <input type="text" id="task-title" class="form-input" value="${task?.title || ''}" placeholder="Kurzer Titel">
                </div>
                <div class="form-group">
                    <label for="task-text">Aufgabe / Frage *</label>
                    <textarea id="task-text" class="form-textarea" rows="4" required placeholder="Beschreibung der Aufgabe...">${task?.taskText || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="task-category">Kategorie</label>
                        <select id="task-category" class="form-select">
                            <option value="">Keine Kategorie</option>
                            ${categories.map(c => `
                                <option value="${c.id}" ${task?.categoryId === c.id ? 'selected' : ''}>${c.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="task-weight">Gewichtung</label>
                        <input type="number" id="task-weight" class="form-input" step="0.1" min="0.1" value="${task?.weightOverride || ''}" placeholder="Standard">
                    </div>
                </div>
                <div class="form-group">
                    <label for="task-scoring">Scoring-Typ *</label>
                    <select id="task-scoring" class="form-select" onchange="QualitySystemViews.updateScoringOptions()">
                        <option value="points" ${task?.scoringType === 'points' ? 'selected' : ''}>Punkte</option>
                        <option value="scale" ${task?.scoringType === 'scale' ? 'selected' : ''}>Skala</option>
                        <option value="checkbox" ${task?.scoringType === 'checkbox' ? 'selected' : ''}>Checkbox (Ja/Nein)</option>
                    </select>
                </div>
                <div id="scoring-options">
                    <div id="points-options" class="form-group" ${task?.scoringType !== 'points' && task ? 'style="display:none"' : ''}>
                        <label for="task-max-points">Maximale Punkte</label>
                        <input type="number" id="task-max-points" class="form-input" min="1" value="${task?.maxPoints || 10}">
                    </div>
                    <div id="scale-options" class="form-group" ${task?.scoringType !== 'scale' ? 'style="display:none"' : ''}>
                        <label for="task-scale-size">Skala-Größe</label>
                        <select id="task-scale-size" class="form-select">
                            <option value="5" ${task?.scaleSize === 5 ? 'selected' : ''}>1-5</option>
                            <option value="10" ${task?.scaleSize === 10 ? 'selected' : ''}>1-10</option>
                        </select>
                        <label class="checkbox-label mt-sm">
                            <input type="checkbox" id="task-scale-inverted" ${task?.scaleInverted ? 'checked' : ''}>
                            Invertiert (1 = Beste Bewertung)
                        </label>
                    </div>
                </div>
            </form>
        `;
        
        Modal.show({
            title: task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe',
            content,
            size: 'medium',
            buttons: [
                { text: 'Abbrechen', className: 'btn-secondary', action: 'close' },
                { text: 'Speichern', className: 'btn-primary', action: () => this.saveTask(taskId) }
            ]
        });
    },
    
    updateScoringOptions() {
        const scoringType = document.getElementById('task-scoring').value;
        document.getElementById('points-options').style.display = scoringType === 'points' ? '' : 'none';
        document.getElementById('scale-options').style.display = scoringType === 'scale' ? '' : 'none';
    },
    
    async saveTask(taskId = null) {
        const data = {
            title: document.getElementById('task-title').value,
            taskText: document.getElementById('task-text').value,
            categoryId: document.getElementById('task-category').value || null,
            weightOverride: document.getElementById('task-weight').value ? parseFloat(document.getElementById('task-weight').value) : null,
            scoringType: document.getElementById('task-scoring').value,
            maxPoints: parseInt(document.getElementById('task-max-points').value) || 10,
            scaleSize: parseInt(document.getElementById('task-scale-size').value) || 5,
            scaleInverted: document.getElementById('task-scale-inverted').checked
        };
        
        if (!data.taskText) {
            Toast.error('Bitte Aufgabentext eingeben');
            return;
        }
        
        let result;
        if (taskId) {
            result = await api.qs.updateTask(taskId, data);
        } else {
            result = await api.qs.createTask(this.currentTeamId, data);
        }
        
        if (result.success) {
            Modal.close();
            Toast.success(taskId ? 'Aufgabe aktualisiert' : 'Aufgabe erstellt');
            await this.loadTasks();
        } else {
            Toast.error(result.error || 'Fehler beim Speichern');
        }
    },
    
    async deleteTask(taskId) {
        if (!confirm('Aufgabe wirklich löschen?')) return;
        
        const result = await api.qs.deleteTask(taskId);
        if (result.success) {
            Toast.success('Aufgabe gelöscht');
            await this.loadTasks();
        } else if (result.archived) {
            Toast.info('Aufgabe wurde archiviert (wird in Checks verwendet)');
            await this.loadTasks();
        } else {
            Toast.error(result.error || 'Fehler beim Löschen');
        }
    },
    
    async restoreTask(taskId) {
        const result = await api.qs.restoreTask(taskId);
        if (result.success) {
            Toast.success('Aufgabe wiederhergestellt');
            await this.loadTasks();
        } else {
            Toast.error(result.error || 'Fehler beim Wiederherstellen');
        }
    },
    
    async deleteEvaluation(evaluationId) {
        if (!confirm('Evaluierung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
        
        const result = await api.qs.deleteEvaluation(evaluationId);
        if (result.success) {
            Toast.success('Evaluierung gelöscht');
            App.navigateTo('qualitySystem');
        } else {
            Toast.error(result.error || 'Fehler beim Löschen');
        }
    },

    // ============================================
    // EVALUATION FORM
    // ============================================
    
    async startEvaluationForm(evaluationId) {
        // Load the template if not already loaded
        const container = document.getElementById('main-content');
        if (!document.getElementById('view-qsEvaluation')) {
            const template = await fetch('templates/qsEvaluation.html').then(r => r.text());
            container.insertAdjacentHTML('beforeend', template);
        }
        
        // Hide other views and show evaluation form
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-qsEvaluation').classList.add('active');
        
        // Load evaluation data with check details
        const result = await api.qs.getEvaluationById(evaluationId);
        if (!result.success) {
            Toast.error('Fehler beim Laden der Evaluierung');
            return;
        }
        
        const evaluation = result.evaluation;
        this.currentEvaluation = evaluation;
        
        // Load check with tasks
        const checkResult = await api.qs.getCheckById(evaluation.checkId, true);
        if (!checkResult.success) {
            Toast.error('Fehler beim Laden des Checks');
            return;
        }
        
        const check = checkResult.check;
        
        // Setup header
        document.getElementById('qs-eval-title').textContent = `Quality Check: ${check.name}`;
        document.getElementById('qs-eval-agent-name').textContent = evaluation.agentName;
        document.getElementById('qs-eval-check-name').textContent = check.name;
        document.getElementById('qs-eval-channel').textContent = evaluation.interactionChannel || 'Ticket';
        document.getElementById('qs-eval-reference').value = evaluation.interactionReference || '';
        
        // Setup buttons
        document.getElementById('qs-eval-back-btn').onclick = () => {
            if (confirm('Änderungen verwerfen?')) {
                App.navigateTo('qualitySystem');
            }
        };
        document.getElementById('qs-eval-submit-btn').onclick = () => this.submitCurrentEvaluation();
        
        // Render tasks
        const tasksContainer = document.getElementById('qs-eval-tasks');
        tasksContainer.innerHTML = check.tasks.map((ct, idx) => this.renderEvaluationTask(ct, idx)).join('');
        
        // Update progress
        this.updateEvaluationProgress();
    },
    
    renderEvaluationTask(checkTask, index) {
        const task = checkTask.task;
        
        let scoringHtml = '';
        switch (task.scoringType) {
            case 'points':
                scoringHtml = `
                    <div class="qs-scoring-points">
                        <input type="number" class="form-input" id="score-${index}" min="0" max="${task.maxPoints}" 
                               data-task-id="${checkTask.taskId}" data-check-task-id="${checkTask.id}"
                               onchange="QualitySystemViews.updateEvaluationProgress()" placeholder="0">
                        <span>/ ${task.maxPoints} Punkte</span>
                    </div>
                `;
                break;
            case 'scale':
                const scaleSize = task.scaleSize || 5;
                const buttons = [];
                for (let i = 1; i <= scaleSize; i++) {
                    buttons.push(`
                        <button type="button" class="qs-scale-btn" data-value="${i}" 
                                onclick="QualitySystemViews.selectScaleValue(${index}, ${i})">
                            ${i}
                        </button>
                    `);
                }
                scoringHtml = `
                    <div class="qs-scoring-scale" id="scale-${index}" data-task-id="${checkTask.taskId}" data-check-task-id="${checkTask.id}">
                        ${buttons.join('')}
                    </div>
                    <input type="hidden" id="score-${index}" data-task-id="${checkTask.taskId}">
                    <small class="text-muted">${task.scaleInverted ? '(1 = Beste Bewertung)' : `(${scaleSize} = Beste Bewertung)`}</small>
                `;
                break;
            case 'checkbox':
                scoringHtml = `
                    <div class="qs-scoring-checkbox" id="checkbox-${index}" data-task-id="${checkTask.taskId}" data-check-task-id="${checkTask.id}">
                        <button type="button" class="qs-checkbox-btn yes" data-value="true" onclick="QualitySystemViews.selectCheckboxValue(${index}, true)">Ja</button>
                        <button type="button" class="qs-checkbox-btn no" data-value="false" onclick="QualitySystemViews.selectCheckboxValue(${index}, false)">Nein</button>
                    </div>
                    <input type="hidden" id="score-${index}" data-task-id="${checkTask.taskId}">
                `;
                break;
        }
        
        return `
            <div class="qs-eval-task" data-task-index="${index}" data-scoring-type="${task.scoringType}">
                <div class="qs-eval-task-header">
                    <h4 class="qs-eval-task-title">${task.title || `Aufgabe ${index + 1}`}</h4>
                    <span class="qs-eval-task-weight">Gewichtung: ${checkTask.weightOverride ?? task.effectiveWeight}</span>
                </div>
                <p class="qs-eval-task-text">${task.taskText}</p>
                ${task.references?.length ? `
                    <div class="qs-eval-task-references">
                        <h5>Referenzen:</h5>
                        ${task.references.map(r => {
                            if (r.referenceType === 'text') return `<p>${r.referenceText}</p>`;
                            if (r.referenceType === 'link') return `<a href="${r.url}" target="_blank">${r.url}</a>`;
                            if (r.referenceType === 'image') return `<img src="/api/files/${r.filePath}" alt="Reference" style="max-width:200px">`;
                            return '';
                        }).join('')}
                    </div>
                ` : ''}
                <div class="qs-eval-scoring">
                    ${scoringHtml}
                </div>
                <div class="qs-eval-task-notes">
                    <textarea class="form-textarea" id="notes-${index}" rows="2" placeholder="Notizen (optional)"></textarea>
                </div>
            </div>
        `;
    },
    
    selectScaleValue(index, value) {
        const container = document.getElementById(`scale-${index}`);
        container.querySelectorAll('.qs-scale-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.value) === value);
        });
        document.getElementById(`score-${index}`).value = value;
        this.updateEvaluationProgress();
    },
    
    selectCheckboxValue(index, value) {
        const container = document.getElementById(`checkbox-${index}`);
        container.querySelectorAll('.qs-checkbox-btn').forEach(btn => {
            const btnValue = btn.dataset.value === 'true';
            btn.classList.toggle('selected', btnValue === value);
        });
        document.getElementById(`score-${index}`).value = value;
        this.updateEvaluationProgress();
    },
    
    updateEvaluationProgress() {
        const tasks = document.querySelectorAll('.qs-eval-task');
        let completed = 0;
        let totalScore = 0;
        let maxScore = 0;
        
        tasks.forEach((task, idx) => {
            const scoreInput = document.getElementById(`score-${idx}`);
            const scoringType = task.dataset.scoringType;
            
            if (scoreInput && scoreInput.value !== '') {
                completed++;
                task.classList.add('completed');
                
                // Calculate scores (simplified - real calculation is server-side)
                const value = parseFloat(scoreInput.value) || 0;
                totalScore += value;
                
                if (scoringType === 'points') {
                    maxScore += parseInt(scoreInput.max) || 10;
                } else if (scoringType === 'scale') {
                    maxScore += 5; // Simplified
                } else if (scoringType === 'checkbox') {
                    maxScore += 1;
                    totalScore = scoreInput.value === 'true' ? totalScore + 1 : totalScore;
                }
            } else {
                task.classList.remove('completed');
            }
        });
        
        const progress = tasks.length > 0 ? (completed / tasks.length * 100) : 0;
        document.getElementById('qs-eval-progress-fill').style.width = `${progress}%`;
        document.getElementById('qs-eval-progress-text').textContent = `${completed} / ${tasks.length} Aufgaben`;
        document.getElementById('qs-eval-score-preview').textContent = `Score: ${totalScore.toFixed(1)} / ${maxScore.toFixed(1)}`;
    },
    
    async submitCurrentEvaluation() {
        if (!this.currentEvaluation) return;
        
        // Collect answers
        const tasks = document.querySelectorAll('.qs-eval-task');
        const answers = [];
        
        tasks.forEach((task, idx) => {
            const scoreInput = document.getElementById(`score-${idx}`);
            const notesInput = document.getElementById(`notes-${idx}`);
            
            if (scoreInput) {
                const taskId = scoreInput.dataset.taskId;
                const checkTaskId = task.querySelector('[data-check-task-id]')?.dataset.checkTaskId;
                
                answers.push({
                    taskId,
                    checkTaskId,
                    rawValue: scoreInput.value,
                    notes: notesInput?.value || ''
                });
            }
        });
        
        // Check if all tasks have scores
        const incomplete = answers.filter(a => a.rawValue === '');
        if (incomplete.length > 0) {
            if (!confirm(`${incomplete.length} Aufgabe(n) sind nicht bewertet. Trotzdem abschließen?`)) {
                return;
            }
        }
        
        const supervisorNotes = document.getElementById('qs-eval-supervisor-notes')?.value || '';
        
        const result = await api.qs.submitEvaluation(this.currentEvaluation.id, {
            answers,
            supervisorNotes
        });
        
        if (result.success) {
            Toast.success('Evaluierung abgeschlossen!');
            this.viewEvaluationResult(this.currentEvaluation.id);
        } else {
            Toast.error(result.error || 'Fehler beim Abschließen');
        }
    },
    
    async continueEvaluation(evaluationId) {
        await this.startEvaluationForm(evaluationId);
    }
};

// Make it globally available
window.QualitySystemViews = QualitySystemViews;
