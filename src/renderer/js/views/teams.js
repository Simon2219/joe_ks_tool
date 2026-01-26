/**
 * Teams View
 * Handles team management functionality
 */

const TeamsView = {
    teams: [],
    allPermissions: [],
    eventsBound: false,

    /**
     * Initializes the teams view
     */
    async init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        await this.loadPermissions();
        await this.loadTeams();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        document.getElementById('add-team-btn')?.addEventListener('click', () => {
            this.showTeamForm();
        });
    },

    /**
     * Loads all permissions
     */
    async loadPermissions() {
        try {
            const result = await window.api.roles.getPermissions();
            if (result.success) {
                this.allPermissions = result.permissions;
            }
        } catch (error) {
            console.error('Failed to load permissions:', error);
        }
    },

    /**
     * Loads all teams
     */
    async loadTeams() {
        try {
            const result = await window.api.teams.getAll(true); // Include inactive
            if (result.success) {
                this.teams = result.teams;
                this.renderTeams();
            } else {
                Toast.error(result.error || 'Fehler beim Laden der Teams');
            }
        } catch (error) {
            console.error('Failed to load teams:', error);
            Toast.error('Fehler beim Laden der Teams');
        }
    },

    /**
     * Renders the teams grid
     */
    renderTeams() {
        const container = document.getElementById('teams-grid');
        const emptyState = document.getElementById('teams-empty');
        
        if (!container) return;

        if (this.teams.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = this.teams.map(team => this.renderTeamCard(team)).join('');

        // Add click handlers
        container.querySelectorAll('.btn-edit-team').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editTeam(btn.dataset.id);
            });
        });

        container.querySelectorAll('.btn-permissions-team').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showPermissionsForm(btn.dataset.id);
            });
        });

        container.querySelectorAll('.btn-delete-team').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTeam(btn.dataset.id);
            });
        });
    },

    /**
     * Renders a single team card
     */
    renderTeamCard(team) {
        const canEdit = Permissions.hasPermission('teams_edit');
        const canDelete = Permissions.hasPermission('teams_delete');
        const canManagePermissions = Permissions.hasPermission('teams_permissions_manage');

        const colorStyle = team.color ? `border-left: 4px solid ${team.color};` : '';

        return `
            <div class="role-card team-card" data-id="${team.id}" style="${colorStyle}">
                <div class="role-card-header">
                    <div class="role-info">
                        <h3>${Helpers.escapeHtml(team.name)}</h3>
                        <p>${Helpers.escapeHtml(team.description || 'Keine Beschreibung')}</p>
                    </div>
                    <div class="role-meta">
                        ${team.team_code ? `<span class="badge badge-secondary">${Helpers.escapeHtml(team.team_code)}</span>` : ''}
                        ${!team.is_active ? '<span class="badge badge-danger">Inaktiv</span>' : ''}
                    </div>
                </div>
                <div class="role-card-body">
                    <div class="team-stats-row">
                        <span><strong>${team.memberCount || 0}</strong> Mitglieder</span>
                    </div>
                </div>
                <div class="role-card-footer">
                    <span style="color: var(--text-muted); font-size: 0.875rem;">
                        ${team.memberCount || 0} Benutzer zugewiesen
                    </span>
                    <div>
                        ${canManagePermissions ? `
                            <button class="btn btn-secondary btn-sm btn-permissions-team" data-id="${team.id}">
                                Berechtigungen
                            </button>
                        ` : ''}
                        ${canEdit ? `
                            <button class="btn btn-secondary btn-sm btn-edit-team" data-id="${team.id}">
                                Bearbeiten
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="btn btn-danger btn-sm btn-delete-team" data-id="${team.id}">
                                Löschen
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Shows the team form modal
     */
    async showTeamForm(team = null) {
        const isEdit = !!team;
        const title = isEdit ? 'Team bearbeiten' : 'Neues Team erstellen';

        const formHtml = `
            <form id="team-form">
                <div class="form-group">
                    <label for="team-name">Team Name *</label>
                    <input type="text" id="team-name" name="name" class="form-input" 
                        value="${team?.name || ''}" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="team-code">Team Code</label>
                        <input type="text" id="team-code" name="teamCode" class="form-input" 
                            value="${team?.team_code || ''}" placeholder="z.B. billa, social_media">
                        <small class="text-muted">Eindeutiger Code für interne Referenz</small>
                    </div>
                    <div class="form-group">
                        <label for="team-color">Farbe</label>
                        <input type="color" id="team-color" name="color" class="form-input" 
                            value="${team?.color || '#6366f1'}" style="height: 40px; padding: 4px;">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="team-description">Beschreibung</label>
                    <textarea id="team-description" name="description" class="form-textarea" rows="2">${team?.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="team-sort-order">Sortierung</label>
                    <input type="number" id="team-sort-order" name="sortOrder" class="form-input" 
                        value="${team?.sort_order || 0}" min="0">
                </div>
                
                <div class="form-group">
                    <label class="form-checkbox">
                        <input type="checkbox" name="isActive" ${team?.is_active !== false ? 'checked' : ''}>
                        <span>Team ist aktiv</span>
                    </label>
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
        footer.style.gap = 'var(--space-sm)';
        footer.style.justifyContent = 'flex-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Abbrechen';
        cancelBtn.addEventListener('click', () => Modal.close());

        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary';
        submitBtn.textContent = isEdit ? 'Speichern' : 'Erstellen';
        submitBtn.addEventListener('click', async () => {
            const form = document.getElementById('team-form');
            const nameInput = form.querySelector('[name="name"]');
            
            if (!nameInput.value.trim()) {
                Toast.error('Team Name ist erforderlich');
                return;
            }

            const formData = new FormData(form);
            const teamData = {
                name: formData.get('name'),
                teamCode: formData.get('teamCode') || null,
                description: formData.get('description'),
                color: formData.get('color'),
                sortOrder: parseInt(formData.get('sortOrder')) || 0,
                isActive: formData.get('isActive') === 'on'
            };

            if (isEdit) {
                await this.updateTeam(team.id, teamData);
            } else {
                await this.createTeam(teamData);
            }
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title,
            content,
            footer,
            size: 'md'
        });
    },

    /**
     * Shows the permissions form for a team
     */
    async showPermissionsForm(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) {
            Toast.error('Team nicht gefunden');
            return;
        }

        // Load current team permissions
        let teamPermissions = [];
        try {
            const result = await window.api.teams.getPermissions(teamId);
            if (result.success) {
                teamPermissions = result.permissions.map(p => p.permission_id);
            }
        } catch (error) {
            console.error('Failed to load team permissions:', error);
        }

        // Group permissions by module
        const grouped = Permissions.getPermissionsByModule(this.allPermissions.map(p => p.id));
        const moduleOrder = ['users', 'tickets', 'quality', 'knowledgeCheck', 'teams', 'roles', 'settings', 'integrations', 'admin'];

        const formHtml = `
            <form id="team-permissions-form">
                <p class="text-muted" style="margin-bottom: var(--space-lg);">
                    Berechtigungen die diesem Team zugewiesen sind gelten für alle Mitglieder des Teams, 
                    zusätzlich zu deren Rollen-Berechtigungen.
                </p>
                
                ${moduleOrder.filter(module => grouped[module]?.length > 0).map(module => {
                    const perms = grouped[module];
                    return `
                    <div class="form-group" style="margin-bottom: var(--space-lg);">
                        <strong>${this.getModuleDisplayName(module)}</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: var(--space-sm); margin-top: var(--space-sm);">
                            ${perms.map(permId => {
                                const checked = teamPermissions.includes(permId) ? 'checked' : '';
                                return `
                                    <label class="form-checkbox" style="flex: 0 0 calc(50% - var(--space-sm));">
                                        <input type="checkbox" name="permissions" value="${permId}" ${checked}>
                                        <span>${Permissions.getPermissionName(permId)}</span>
                                    </label>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `}).join('')}
            </form>
        `;

        // Convert HTML string to DOM node
        const template = document.createElement('template');
        template.innerHTML = formHtml.trim();
        const content = template.content.firstElementChild || template.content;

        // Footer buttons
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
        submitBtn.textContent = 'Berechtigungen speichern';
        submitBtn.addEventListener('click', async () => {
            const form = document.getElementById('team-permissions-form');
            const formData = new FormData(form);
            const permissions = formData.getAll('permissions');

            try {
                const result = await window.api.teams.setPermissions(teamId, permissions);
                if (result.success) {
                    Toast.success('Team-Berechtigungen aktualisiert');
                    Modal.close();
                    await this.loadTeams();
                } else {
                    Toast.error(result.error || 'Fehler beim Speichern der Berechtigungen');
                }
            } catch (error) {
                console.error('Failed to save team permissions:', error);
                Toast.error('Fehler beim Speichern der Berechtigungen');
            }
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title: `Team-Berechtigungen: ${team.name}`,
            content,
            footer,
            size: 'lg'
        });
    },

    /**
     * Gets a display-friendly module name
     */
    getModuleDisplayName(module) {
        const moduleNames = {
            users: 'Benutzer',
            tickets: 'Tickets',
            quality: 'Quality System',
            knowledgeCheck: 'Knowledge Check',
            teams: 'Teams',
            roles: 'Rollen',
            settings: 'Einstellungen',
            integrations: 'Integrationen',
            admin: 'Administration'
        };
        return moduleNames[module] || module;
    },

    /**
     * Creates a new team
     */
    async createTeam(teamData) {
        try {
            const result = await window.api.teams.create(teamData);
            if (result.success) {
                Toast.success('Team erfolgreich erstellt');
                Modal.close();
                await this.loadTeams();
            } else {
                Toast.error(result.error || 'Fehler beim Erstellen des Teams');
            }
        } catch (error) {
            console.error('Failed to create team:', error);
            Toast.error('Fehler beim Erstellen des Teams');
        }
    },

    /**
     * Edits an existing team
     */
    async editTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (team) {
            await this.showTeamForm(team);
        }
    },

    /**
     * Updates a team
     */
    async updateTeam(teamId, teamData) {
        try {
            const result = await window.api.teams.update(teamId, teamData);
            if (result.success) {
                Toast.success('Team erfolgreich aktualisiert');
                Modal.close();
                await this.loadTeams();
            } else {
                Toast.error(result.error || 'Fehler beim Aktualisieren des Teams');
            }
        } catch (error) {
            console.error('Failed to update team:', error);
            Toast.error('Fehler beim Aktualisieren des Teams');
        }
    },

    /**
     * Deletes a team
     */
    async deleteTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) return;

        const confirmed = await Modal.confirm({
            title: 'Team löschen',
            message: `Sind Sie sicher, dass Sie das Team "${team.name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`,
            confirmText: 'Löschen',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const result = await window.api.teams.delete(teamId);
                if (result.success) {
                    Toast.success('Team erfolgreich gelöscht');
                    await this.loadTeams();
                } else {
                    Toast.error(result.error || 'Fehler beim Löschen des Teams');
                }
            } catch (error) {
                console.error('Failed to delete team:', error);
                Toast.error('Fehler beim Löschen des Teams');
            }
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadTeams();
    }
};

// Export for use in other modules
window.TeamsView = TeamsView;
