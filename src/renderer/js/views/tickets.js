/**
 * Tickets View
 * Handles ticket management functionality
 */

const TicketsView = {
    tickets: [],
    users: [],
    filters: {
        status: '',
        priority: '',
        assignee: ''
    },
    eventsBound: false,

    /**
     * Initializes the tickets view
     */
    async init() {
        if (!this.eventsBound) {
            this.bindEvents();
            this.eventsBound = true;
        }
        await this.loadUsers();
        await this.loadTickets();
    },

    /**
     * Binds event handlers
     */
    bindEvents() {
        // Add ticket button
        document.getElementById('add-ticket-btn')?.addEventListener('click', () => {
            this.showTicketForm();
        });

        // Export button
        document.getElementById('export-tickets-btn')?.addEventListener('click', () => {
            this.exportTickets();
        });

        // Filters
        document.getElementById('filter-ticket-status')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filter-ticket-priority')?.addEventListener('change', (e) => {
            this.filters.priority = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filter-ticket-assignee')?.addEventListener('change', (e) => {
            this.filters.assignee = e.target.value;
            this.applyFilters();
        });
    },

    /**
     * Loads users for assignment dropdown
     */
    async loadUsers() {
        try {
            const result = await window.api.users.getAll();
            if (result.success) {
                this.users = result.users.filter(u => u.isActive);
                this.populateAssigneeFilter();
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    },

    /**
     * Populates the assignee filter dropdown
     */
    populateAssigneeFilter() {
        const select = document.getElementById('filter-ticket-assignee');
        if (!select) return;

        select.innerHTML = '<option value="">All Assignees</option>';
        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.firstName} ${user.lastName}`;
            select.appendChild(option);
        });
    },

    /**
     * Loads all tickets
     */
    async loadTickets() {
        try {
            const result = await window.api.tickets.getAll(this.filters);
            if (result.success) {
                this.tickets = result.tickets;
                this.renderTable();
            } else {
                Toast.error(result.error || 'Failed to load tickets');
            }
        } catch (error) {
            console.error('Failed to load tickets:', error);
            Toast.error('Failed to load tickets');
        }
    },

    /**
     * Applies filters
     */
    applyFilters() {
        this.loadTickets();
    },

    /**
     * Renders the tickets table
     */
    renderTable() {
        const tbody = document.getElementById('tickets-tbody');
        if (!tbody) return;

        if (this.tickets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">No tickets found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.tickets.map(ticket => this.renderTicketRow(ticket)).join('');

        // Add click handlers
        tbody.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', () => this.viewTicket(btn.dataset.id));
        });

        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.editTicket(btn.dataset.id));
        });

        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.deleteTicket(btn.dataset.id));
        });
    },

    /**
     * Renders a single ticket row
     */
    renderTicketRow(ticket) {
        const statusClass = `status-${ticket.status.replace('_', '-')}`;
        const priorityClass = `priority-${ticket.priority}`;
        const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && 
                          !['resolved', 'closed'].includes(ticket.status);

        const canEdit = Permissions.canEdit('ticket');
        const canDelete = Permissions.canDelete('ticket');

        return `
            <tr data-id="${ticket.id}" class="${isOverdue ? 'overdue' : ''}">
                <td><strong>${Helpers.escapeHtml(ticket.ticketNumber)}</strong></td>
                <td>${Helpers.escapeHtml(Helpers.truncate(ticket.title, 40))}</td>
                <td><span class="badge ${statusClass}">${Helpers.formatStatus(ticket.status)}</span></td>
                <td><span class="badge ${priorityClass}">${Helpers.capitalize(ticket.priority)}</span></td>
                <td>${Helpers.escapeHtml(ticket.assignedToName)}</td>
                <td>${Helpers.formatDate(ticket.createdAt)}</td>
                <td class="${isOverdue ? 'text-danger' : ''}">${Helpers.formatDate(ticket.dueDate)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-view" data-id="${ticket.id}" title="View">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        ${canEdit ? `
                            <button class="btn-icon btn-edit" data-id="${ticket.id}" title="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="btn-icon btn-delete" data-id="${ticket.id}" title="Delete">
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
     * Shows the ticket form modal
     */
    async showTicketForm(ticket = null) {
        const isEdit = !!ticket;
        const title = isEdit ? 'Edit Ticket' : 'Create New Ticket';

        const fields = [
            { 
                name: 'title', 
                label: 'Title', 
                type: 'text', 
                required: true,
                placeholder: 'Brief description of the issue'
            },
            { 
                name: 'description', 
                label: 'Description', 
                type: 'textarea', 
                required: true,
                placeholder: 'Detailed description of the issue',
                rows: 4
            },
            { 
                name: 'priority', 
                label: 'Priority', 
                type: 'select', 
                required: true,
                options: [
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'critical', label: 'Critical' }
                ],
                default: 'medium'
            },
            { 
                name: 'category', 
                label: 'Category', 
                type: 'select', 
                options: [
                    { value: 'general', label: 'General' },
                    { value: 'technical', label: 'Technical' },
                    { value: 'billing', label: 'Billing' },
                    { value: 'sales', label: 'Sales' },
                    { value: 'complaint', label: 'Complaint' },
                    { value: 'feedback', label: 'Feedback' },
                    { value: 'other', label: 'Other' }
                ],
                default: 'general'
            },
            { 
                name: 'assignedTo', 
                label: 'Assign To', 
                type: 'select', 
                options: [
                    { value: '', label: 'Unassigned' },
                    ...this.users.map(u => ({ 
                        value: u.id, 
                        label: `${u.firstName} ${u.lastName}` 
                    }))
                ]
            },
            { 
                name: 'customerName', 
                label: 'Customer Name', 
                type: 'text',
                placeholder: 'Customer name'
            },
            { 
                name: 'customerEmail', 
                label: 'Customer Email', 
                type: 'email',
                placeholder: 'customer@example.com'
            },
            { 
                name: 'customerPhone', 
                label: 'Customer Phone', 
                type: 'text',
                placeholder: 'Customer phone number'
            }
        ];

        const result = await Modal.form({
            title,
            fields,
            data: ticket || {},
            submitText: isEdit ? 'Save Changes' : 'Create Ticket',
            size: 'lg',
            validate: (data) => {
                if (!data.title || data.title.length < 5) {
                    return 'Title must be at least 5 characters';
                }
                if (!data.description || data.description.length < 10) {
                    return 'Description must be at least 10 characters';
                }
                return null;
            }
        });

        if (result) {
            if (isEdit) {
                await this.updateTicket(ticket.id, result);
            } else {
                await this.createTicket(result);
            }
        }
    },

    /**
     * Views a ticket's details
     */
    async viewTicket(ticketId) {
        try {
            const ticketResult = await window.api.tickets.getById(ticketId);
            const commentsResult = await window.api.tickets.getComments(ticketId);
            const historyResult = await window.api.tickets.getHistory(ticketId);

            if (!ticketResult.success) {
                Toast.error('Failed to load ticket');
                return;
            }

            const ticket = ticketResult.ticket;
            const comments = commentsResult.success ? commentsResult.comments : [];
            const history = historyResult.success ? historyResult.history : [];

            const contentHtml = this.buildTicketDetailView(ticket, comments, history);

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
                title: `Ticket ${ticket.ticketNumber}`,
                content,
                footer,
                size: 'lg'
            });

            // Bind comment form
            setTimeout(() => {
                const commentForm = document.getElementById('comment-form');
                if (commentForm) {
                    commentForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const input = document.getElementById('comment-input');
                        if (input.value.trim()) {
                            await this.addComment(ticketId, input.value);
                            input.value = '';
                            Modal.close();
                            this.viewTicket(ticketId);
                        }
                    });
                }

                // Bind status change
                const statusSelect = document.getElementById('ticket-status-select');
                if (statusSelect) {
                    statusSelect.addEventListener('change', async (e) => {
                        await this.changeStatus(ticketId, e.target.value);
                        Modal.close();
                        this.viewTicket(ticketId);
                    });
                }
            }, 100);

        } catch (error) {
            console.error('Failed to view ticket:', error);
            Toast.error('Failed to load ticket details');
        }
    },

    /**
     * Builds the ticket detail view HTML
     */
    buildTicketDetailView(ticket, comments, history) {
        const statusOptions = ['new', 'open', 'in_progress', 'pending', 'resolved', 'closed']
            .map(s => `<option value="${s}" ${ticket.status === s ? 'selected' : ''}>${Helpers.formatStatus(s)}</option>`)
            .join('');

        return `
            <div class="ticket-detail">
                <div class="ticket-main">
                    <div class="ticket-section">
                        <div class="ticket-section-header">Description</div>
                        <div class="ticket-section-body">
                            <p>${Helpers.escapeHtml(ticket.description)}</p>
                        </div>
                    </div>
                    
                    <div class="ticket-section">
                        <div class="ticket-section-header">Comments (${comments.length})</div>
                        <div class="ticket-section-body">
                            <div class="comments-list">
                                ${comments.length === 0 ? '<p class="empty-state">No comments yet</p>' : 
                                    comments.map(c => `
                                        <div class="comment-item">
                                            <div class="comment-avatar">${Helpers.getInitials(c.userName.split(' ')[0], c.userName.split(' ')[1])}</div>
                                            <div class="comment-content">
                                                <div class="comment-header">
                                                    <span class="comment-author">${Helpers.escapeHtml(c.userName)}</span>
                                                    <span class="comment-time">${Helpers.timeAgo(c.createdAt)}</span>
                                                </div>
                                                <div class="comment-text">${Helpers.escapeHtml(c.content)}</div>
                                            </div>
                                        </div>
                                    `).join('')
                                }
                            </div>
                            <form id="comment-form" class="comment-form">
                                <textarea id="comment-input" class="form-textarea" placeholder="Add a comment..." rows="2"></textarea>
                                <button type="submit" class="btn btn-primary btn-sm">Add Comment</button>
                            </form>
                        </div>
                    </div>
                </div>
                
                <div class="ticket-sidebar">
                    <div class="ticket-section">
                        <div class="ticket-section-header">Details</div>
                        <div class="ticket-section-body">
                            <div class="ticket-meta-item">
                                <span class="ticket-meta-label">Status</span>
                                <select id="ticket-status-select" class="form-select" style="width: auto;">
                                    ${statusOptions}
                                </select>
                            </div>
                            <div class="ticket-meta-item">
                                <span class="ticket-meta-label">Priority</span>
                                <span class="badge priority-${ticket.priority}">${Helpers.capitalize(ticket.priority)}</span>
                            </div>
                            <div class="ticket-meta-item">
                                <span class="ticket-meta-label">Category</span>
                                <span>${Helpers.capitalize(ticket.category)}</span>
                            </div>
                            <div class="ticket-meta-item">
                                <span class="ticket-meta-label">Assigned To</span>
                                <span>${Helpers.escapeHtml(ticket.assignedToName)}</span>
                            </div>
                            <div class="ticket-meta-item">
                                <span class="ticket-meta-label">Created</span>
                                <span>${Helpers.formatDateTime(ticket.createdAt)}</span>
                            </div>
                            <div class="ticket-meta-item">
                                <span class="ticket-meta-label">Due Date</span>
                                <span>${Helpers.formatDateTime(ticket.dueDate)}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${ticket.customerName ? `
                        <div class="ticket-section">
                            <div class="ticket-section-header">Customer</div>
                            <div class="ticket-section-body">
                                <div class="ticket-meta-item">
                                    <span class="ticket-meta-label">Name</span>
                                    <span>${Helpers.escapeHtml(ticket.customerName)}</span>
                                </div>
                                ${ticket.customerEmail ? `
                                    <div class="ticket-meta-item">
                                        <span class="ticket-meta-label">Email</span>
                                        <span>${Helpers.escapeHtml(ticket.customerEmail)}</span>
                                    </div>
                                ` : ''}
                                ${ticket.customerPhone ? `
                                    <div class="ticket-meta-item">
                                        <span class="ticket-meta-label">Phone</span>
                                        <span>${Helpers.escapeHtml(ticket.customerPhone)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Creates a new ticket
     */
    async createTicket(ticketData) {
        try {
            const result = await window.api.tickets.create(ticketData);
            if (result.success) {
                Toast.success(`Ticket ${result.ticket.ticketNumber} created successfully`);
                await this.loadTickets();
            } else {
                Toast.error(result.error || 'Failed to create ticket');
            }
        } catch (error) {
            console.error('Failed to create ticket:', error);
            Toast.error('Failed to create ticket');
        }
    },

    /**
     * Edits an existing ticket
     */
    async editTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (ticket) {
            await this.showTicketForm(ticket);
        }
    },

    /**
     * Updates a ticket
     */
    async updateTicket(ticketId, ticketData) {
        try {
            const result = await window.api.tickets.update(ticketId, ticketData);
            if (result.success) {
                Toast.success('Ticket updated successfully');
                await this.loadTickets();
            } else {
                Toast.error(result.error || 'Failed to update ticket');
            }
        } catch (error) {
            console.error('Failed to update ticket:', error);
            Toast.error('Failed to update ticket');
        }
    },

    /**
     * Changes ticket status
     */
    async changeStatus(ticketId, status) {
        try {
            const result = await window.api.tickets.changeStatus(ticketId, status);
            if (result.success) {
                Toast.success('Status updated');
                await this.loadTickets();
            } else {
                Toast.error(result.error || 'Failed to update status');
            }
        } catch (error) {
            console.error('Failed to change status:', error);
            Toast.error('Failed to update status');
        }
    },

    /**
     * Adds a comment to a ticket
     */
    async addComment(ticketId, comment) {
        try {
            const result = await window.api.tickets.addComment(ticketId, comment);
            if (result.success) {
                Toast.success('Comment added');
            } else {
                Toast.error(result.error || 'Failed to add comment');
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
            Toast.error('Failed to add comment');
        }
    },

    /**
     * Deletes a ticket
     */
    async deleteTicket(ticketId) {
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        const confirmed = await Modal.confirm({
            title: 'Delete Ticket',
            message: `Are you sure you want to delete ticket "${ticket.ticketNumber}"? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                const result = await window.api.tickets.delete(ticketId);
                if (result.success) {
                    Toast.success('Ticket deleted successfully');
                    await this.loadTickets();
                } else {
                    Toast.error(result.error || 'Failed to delete ticket');
                }
            } catch (error) {
                console.error('Failed to delete ticket:', error);
                Toast.error('Failed to delete ticket');
            }
        }
    },

    /**
     * Exports tickets
     */
    async exportTickets() {
        try {
            const result = await window.api.tickets.exportTickets(this.filters, 'csv');
            if (result.success) {
                Helpers.downloadFile(result.data, 'tickets.csv', 'text/csv');
                Toast.success('Tickets exported successfully');
            } else {
                Toast.error(result.error || 'Failed to export tickets');
            }
        } catch (error) {
            console.error('Failed to export tickets:', error);
            Toast.error('Failed to export tickets');
        }
    },

    /**
     * Refreshes the view
     */
    async refresh() {
        await this.loadTickets();
    }
};

// Export for use in other modules
window.TicketsView = TicketsView;
