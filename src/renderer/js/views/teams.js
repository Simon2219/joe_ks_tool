/**
 * Teams View
 * Handles team management functionality
 */

const TeamsView = {
    teams: [],
    expandedTeams: new Set(),
    teamMembers: {},
    eventsBound: false,

    /**
     * Initializes the teams view
     */
    async init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
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
     * Loads members for a specific team
     */
    async loadTeamMembers(teamId) {
        try {
            const result = await window.api.teams.getTeamMembers(teamId);
            if (result.success) {
                this.teamMembers[teamId] = result.members;
                return result.members;
            }
        } catch (error) {
            console.error('Failed to load team members:', error);
        }
        return [];
    },

    /**
     * Renders the teams list
     */
    renderTeams() {
        const container = document.getElementById('teams-list');
        const emptyState = document.getElementById('teams-empty');
        
        if (!container) return;

        if (this.teams.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = this.teams.map(team => this.renderTeamRow(team)).join('');

        // Bind all event handlers (uses event delegation, safe to call multiple times)
        this.bindTeamRowEvents();
        
        // Reload members for any expanded teams
        this.expandedTeams.forEach(async (teamId) => {
            const row = document.querySelector(`.team-row[data-id="${teamId}"]`);
            if (row) {
                row.classList.add('expanded');
                await this.loadTeamMembers(teamId);
                this.updateTeamMembersList(teamId);
            }
        });
    },

    /**
     * Binds events for team rows - uses event delegation for reliability
     */
    bindTeamRowEvents() {
        const container = document.getElementById('teams-list');
        if (!container) return;

        // Remove any existing listener to prevent duplicates
        container.removeEventListener('click', this.handleContainerClick);
        
        // Use event delegation - one listener on container
        this.handleContainerClick = async (e) => {
            const target = e.target;
            
            // Handle expand/collapse - click on header but not action buttons
            const header = target.closest('.team-row-header');
            if (header && !target.closest('.team-row-actions') && !target.closest('button')) {
                const teamId = header.closest('.team-row').dataset.id;
                await this.toggleTeamExpanded(teamId);
                return;
            }
            
            // Handle edit button
            const editBtn = target.closest('.btn-edit-team');
            if (editBtn) {
                e.stopPropagation();
                this.editTeam(editBtn.dataset.id);
                return;
            }
            
            // Handle delete button
            const deleteBtn = target.closest('.btn-delete-team');
            if (deleteBtn) {
                e.stopPropagation();
                this.deleteTeam(deleteBtn.dataset.id);
                return;
            }
            
            // Handle add user button
            const addUserBtn = target.closest('.btn-add-user-to-team');
            if (addUserBtn) {
                e.stopPropagation();
                this.showAddUserModal(addUserBtn.dataset.teamId);
                return;
            }
            
            // Handle remove user button
            const removeBtn = target.closest('.btn-remove-from-team');
            if (removeBtn) {
                e.stopPropagation();
                this.removeUserFromTeam(removeBtn.dataset.teamId, removeBtn.dataset.userId);
                return;
            }
            
            // Handle toggle supervisor button
            const supervisorBtn = target.closest('.btn-toggle-supervisor');
            if (supervisorBtn) {
                e.stopPropagation();
                const isSupervisor = supervisorBtn.dataset.isSupervisor === 'true';
                this.toggleSupervisor(supervisorBtn.dataset.teamId, supervisorBtn.dataset.userId, !isSupervisor);
                return;
            }
        };
        
        container.addEventListener('click', this.handleContainerClick);
    },

    /**
     * Toggle team expanded state
     */
    async toggleTeamExpanded(teamId) {
        const row = document.querySelector(`.team-row[data-id="${teamId}"]`);
        if (!row) return;

        if (this.expandedTeams.has(teamId)) {
            this.expandedTeams.delete(teamId);
            row.classList.remove('expanded');
        } else {
            this.expandedTeams.add(teamId);
            row.classList.add('expanded');
            
            // Always reload members when expanding to get fresh data
            const membersContainer = row.querySelector('.team-members-list');
            if (membersContainer) {
                membersContainer.innerHTML = '<div class="loading-indicator">Lade Mitglieder...</div>';
            }
            
            // Clear cached members and reload
            delete this.teamMembers[teamId];
            await this.loadTeamMembers(teamId);
            this.updateTeamMembersList(teamId);
        }
    },

    /**
     * Update team members list display
     */
    updateTeamMembersList(teamId) {
        const row = document.querySelector(`.team-row[data-id="${teamId}"]`);
        if (!row) return;

        const membersContainer = row.querySelector('.team-members-list');
        if (!membersContainer) return;

        const members = this.teamMembers[teamId] || [];
        const canEdit = Permissions.hasPermission('teams_edit');

        if (members.length === 0) {
            membersContainer.innerHTML = `
                <div class="team-members-empty">
                    <span class="text-muted">Keine Benutzer in diesem Team</span>
                </div>
            `;
        } else {
            membersContainer.innerHTML = `
                <table class="data-table team-members-table">
                    <thead>
                        <tr>
                            <th>Benutzer</th>
                            <th>Rolle</th>
                            <th>Supervisor</th>
                            ${canEdit ? '<th>Aktionen</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${members.map(member => this.renderMemberRow(teamId, member, canEdit)).join('')}
                    </tbody>
                </table>
            `;
        }
        
        // Update member count display
        const memberCountEl = row.querySelector('.team-member-count');
        if (memberCountEl) {
            const count = members.length;
            memberCountEl.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                </svg>
                ${count} ${count === 1 ? 'Mitglied' : 'Mitglieder'}
            `;
        }
        // Note: Event delegation handles clicks - no need to rebind
    },

    /**
     * Renders a team member row
     */
    renderMemberRow(teamId, member, canEdit) {
        const firstName = member.first_name || '';
        const lastName = member.last_name || '';
        const initials = Helpers.getInitials(firstName, lastName);
        const fullName = `${firstName} ${lastName}`;
        const isSupervisor = member.is_supervisor === 1;

        return `
            <tr data-user-id="${member.id}">
                <td>
                    <div class="user-cell">
                        <div class="avatar avatar-sm">${Helpers.escapeHtml(initials)}</div>
                        <div class="user-info">
                            <span class="name">${Helpers.escapeHtml(fullName)}</span>
                            <span class="username">@${Helpers.escapeHtml(member.username)}</span>
                        </div>
                    </div>
                </td>
                <td>${Helpers.escapeHtml(member.role_name || '-')}</td>
                <td>
                    ${isSupervisor ? 
                        '<span class="badge badge-primary">Supervisor</span>' : 
                        '<span class="badge badge-secondary">Mitglied</span>'
                    }
                </td>
                ${canEdit ? `
                    <td>
                        <div class="table-actions">
                            <button class="btn-icon btn-toggle-supervisor" 
                                    data-team-id="${teamId}" 
                                    data-user-id="${member.id}" 
                                    data-is-supervisor="${isSupervisor}"
                                    title="${isSupervisor ? 'Supervisor entfernen' : 'Als Supervisor setzen'}">
                                <svg viewBox="0 0 24 24" fill="${isSupervisor ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                            <button class="btn-icon btn-danger btn-remove-from-team" 
                                    data-team-id="${teamId}" 
                                    data-user-id="${member.id}"
                                    title="Aus Team entfernen">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </td>
                ` : ''}
            </tr>
        `;
    },

    /**
     * Renders a single team row
     */
    renderTeamRow(team) {
        const canEdit = Permissions.hasPermission('teams_edit');
        const canDelete = Permissions.hasPermission('teams_delete');
        const isExpanded = this.expandedTeams.has(team.id);
        const colorStyle = team.color ? `border-left: 4px solid ${team.color};` : 'border-left: 4px solid var(--border);';

        return `
            <div class="team-row ${isExpanded ? 'expanded' : ''}" data-id="${team.id}" style="${colorStyle}">
                <div class="team-row-header">
                    <div class="team-row-expand">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="expand-icon">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                    <div class="team-row-info">
                        <h3 class="team-row-name">${Helpers.escapeHtml(team.name)}</h3>
                        ${team.team_code ? `<span class="badge badge-secondary">${Helpers.escapeHtml(team.team_code)}</span>` : ''}
                        ${!team.is_active ? '<span class="badge badge-danger">Inaktiv</span>' : ''}
                    </div>
                    <div class="team-row-stats">
                        <span class="team-member-count">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                            </svg>
                            ${team.memberCount || 0} ${team.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
                        </span>
                    </div>
                    <div class="team-row-actions">
                        ${canEdit ? `
                            <button class="btn btn-sm btn-secondary btn-add-user-to-team" data-team-id="${team.id}" title="Benutzer hinzufügen">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                                Benutzer hinzufügen
                            </button>
                            <button class="btn btn-sm btn-secondary btn-edit-team" data-id="${team.id}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="btn btn-sm btn-danger btn-icon btn-delete-team" data-id="${team.id}" title="Löschen">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="team-row-content">
                    ${team.description ? `<p class="team-description">${Helpers.escapeHtml(team.description)}</p>` : ''}
                    <div class="team-members-list">
                        ${this.teamMembers[team.id] ? '' : '<div class="loading-indicator">Lade Mitglieder...</div>'}
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
     * Shows the add user to team modal
     */
    async showAddUserModal(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) {
            Toast.error('Team nicht gefunden');
            return;
        }

        // Load available users
        let availableUsers = [];
        try {
            const result = await window.api.teams.getAvailableUsers(teamId);
            if (result.success) {
                availableUsers = result.users;
            }
        } catch (error) {
            console.error('Failed to load available users:', error);
        }

        if (availableUsers.length === 0) {
            Toast.info('Alle Benutzer sind bereits in diesem Team');
            return;
        }

        const formHtml = `
            <form id="add-user-form">
                <div class="form-group">
                    <label for="add-user-select">Benutzer auswählen *</label>
                    <select id="add-user-select" name="userId" class="form-select" required>
                        <option value="">-- Benutzer wählen --</option>
                        ${availableUsers.map(u => `
                            <option value="${u.id}">${Helpers.escapeHtml(u.first_name + ' ' + u.last_name)} (${Helpers.escapeHtml(u.username)})</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-checkbox">
                        <input type="checkbox" name="isSupervisor">
                        <span>Als Supervisor hinzufügen</span>
                    </label>
                    <small class="text-muted">Supervisoren können Quality Checks für dieses Team durchführen und verwalten</small>
                </div>
            </form>
        `;

        const template = document.createElement('template');
        template.innerHTML = formHtml.trim();
        const content = template.content.firstElementChild || template.content;

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
        submitBtn.textContent = 'Hinzufügen';
        submitBtn.addEventListener('click', async () => {
            const form = document.getElementById('add-user-form');
            const userId = form.querySelector('[name="userId"]').value;
            const isSupervisor = form.querySelector('[name="isSupervisor"]').checked;

            if (!userId) {
                Toast.error('Bitte wählen Sie einen Benutzer');
                return;
            }

            try {
                const result = await window.api.teams.addUserToTeam(teamId, userId, isSupervisor);
                if (result.success) {
                    Toast.success('Benutzer zum Team hinzugefügt');
                    Modal.close();
                    this.teamMembers[teamId] = result.members;
                    this.updateTeamMembersList(teamId);
                    // Update member count
                    await this.loadTeams();
                } else {
                    Toast.error(result.error || 'Fehler beim Hinzufügen');
                }
            } catch (error) {
                console.error('Failed to add user to team:', error);
                Toast.error('Fehler beim Hinzufügen');
            }
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        Modal.open({
            title: `Benutzer zu "${team.name}" hinzufügen`,
            content,
            footer,
            size: 'md'
        });
    },

    /**
     * Removes a user from a team
     */
    async removeUserFromTeam(teamId, userId) {
        const confirmed = await Modal.confirm({
            title: 'Benutzer entfernen',
            message: 'Möchten Sie diesen Benutzer wirklich aus dem Team entfernen?',
            confirmText: 'Entfernen',
            confirmClass: 'btn-danger'
        });

        if (!confirmed) return;

        try {
            const result = await window.api.teams.removeUserFromTeam(teamId, userId);
            if (result.success) {
                Toast.success('Benutzer aus Team entfernt');
                this.teamMembers[teamId] = result.members;
                this.updateTeamMembersList(teamId);
                await this.loadTeams();
            } else {
                Toast.error(result.error || 'Fehler beim Entfernen');
            }
        } catch (error) {
            console.error('Failed to remove user from team:', error);
            Toast.error('Fehler beim Entfernen');
        }
    },

    /**
     * Toggles supervisor status for a user in a team
     */
    async toggleSupervisor(teamId, userId, isSupervisor) {
        try {
            const result = await window.api.teams.setUserSupervisor(teamId, userId, isSupervisor);
            if (result.success) {
                Toast.success(isSupervisor ? 'Supervisor-Status aktiviert' : 'Supervisor-Status entfernt');
                this.teamMembers[teamId] = result.members;
                this.updateTeamMembersList(teamId);
            } else {
                Toast.error(result.error || 'Fehler beim Aktualisieren');
            }
        } catch (error) {
            console.error('Failed to toggle supervisor:', error);
            Toast.error('Fehler beim Aktualisieren');
        }
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
