/**
 * Ticket System IPC Handlers
 * Handles CRUD operations and workflow for tickets
 */

const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { TicketsDB, TicketCommentsDB, TicketHistoryDB, UsersDB } = require('../database/dbService');
const { checkPermission, getCurrentSession } = require('./authHandlers');

// Ticket status workflow
const TICKET_STATUSES = ['new', 'open', 'in_progress', 'pending', 'resolved', 'closed'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const TICKET_CATEGORIES = ['general', 'technical', 'billing', 'sales', 'complaint', 'feedback', 'other'];

/**
 * Generates a unique ticket number
 */
function generateTicketNumber() {
    const prefix = 'TKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Validates ticket data
 */
function validateTicketData(ticketData) {
    const errors = [];
    
    if (!ticketData.title || ticketData.title.trim().length < 5) {
        errors.push('Title must be at least 5 characters');
    }
    
    if (!ticketData.description || ticketData.description.trim().length < 10) {
        errors.push('Description must be at least 10 characters');
    }
    
    if (ticketData.priority && !TICKET_PRIORITIES.includes(ticketData.priority)) {
        errors.push('Invalid priority level');
    }
    
    if (ticketData.category && !TICKET_CATEGORIES.includes(ticketData.category)) {
        errors.push('Invalid category');
    }
    
    return errors;
}

/**
 * Enriches ticket data with user information
 */
function enrichTicket(ticket) {
    const assignedUser = ticket.assignedTo ? UsersDB.getById(ticket.assignedTo) : null;
    const createdByUser = UsersDB.getById(ticket.createdBy);
    
    return {
        ...ticket,
        assignedToName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned',
        createdByName: createdByUser ? `${createdByUser.firstName} ${createdByUser.lastName}` : 'Unknown'
    };
}

/**
 * Creates a history entry for ticket changes
 */
function createHistoryEntry(ticketId, action, details, userId) {
    const entry = {
        id: uuidv4(),
        ticketId,
        action,
        details,
        userId,
        createdAt: new Date().toISOString()
    };
    TicketHistoryDB.create(entry);
    return entry;
}

/**
 * Calculates SLA due date based on priority
 */
function calculateDueDate(priority) {
    const now = new Date();
    const hours = {
        critical: 2,
        high: 8,
        medium: 24,
        low: 72
    };
    return new Date(now.getTime() + (hours[priority] || 24) * 60 * 60 * 1000).toISOString();
}

/**
 * Generates ticket statistics
 */
function generateStatistics() {
    const tickets = TicketsDB.getAll();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const byStatus = {};
    TICKET_STATUSES.forEach(status => {
        byStatus[status] = tickets.filter(t => t.status === status).length;
    });
    
    const byPriority = {};
    TICKET_PRIORITIES.forEach(priority => {
        byPriority[priority] = tickets.filter(t => t.priority === priority).length;
    });
    
    const byCategory = {};
    TICKET_CATEGORIES.forEach(category => {
        byCategory[category] = tickets.filter(t => t.category === category).length;
    });
    
    const overdue = tickets.filter(t => 
        t.dueDate && new Date(t.dueDate) < now && !['resolved', 'closed'].includes(t.status)
    ).length;
    
    const createdThisWeek = tickets.filter(t => new Date(t.createdAt) >= weekAgo).length;
    const resolvedThisWeek = tickets.filter(t => 
        t.resolvedAt && new Date(t.resolvedAt) >= weekAgo
    ).length;
    
    // Calculate average resolution time (in hours)
    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    let avgResolutionTime = 0;
    if (resolvedTickets.length > 0) {
        const totalTime = resolvedTickets.reduce((sum, t) => {
            return sum + (new Date(t.resolvedAt) - new Date(t.createdAt));
        }, 0);
        avgResolutionTime = Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60) * 10) / 10;
    }
    
    return {
        total: tickets.length,
        byStatus,
        byPriority,
        byCategory,
        overdue,
        createdThisWeek,
        resolvedThisWeek,
        avgResolutionTime,
        openTickets: tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length
    };
}

/**
 * Registers ticket IPC handlers
 */
function registerTicketHandlers() {
    // Get all tickets
    ipcMain.handle('tickets:getAll', async (event, filters = {}) => {
        try {
            if (!checkPermission('ticket_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            let tickets;
            const session = getCurrentSession();
            
            if (checkPermission('ticket_view_all')) {
                tickets = Object.keys(filters).length > 0 
                    ? TicketsDB.getFiltered(filters)
                    : TicketsDB.getAll();
            } else {
                // Only show assigned tickets
                tickets = TicketsDB.getByUser(session.user.id);
            }
            
            tickets = tickets.map(enrichTicket);
            
            // Sort by created date (newest first)
            tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return { success: true, tickets };
        } catch (error) {
            console.error('Get tickets error:', error);
            return { success: false, error: 'Failed to retrieve tickets' };
        }
    });
    
    // Get ticket by ID
    ipcMain.handle('tickets:getById', async (event, id) => {
        try {
            if (!checkPermission('ticket_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const ticket = TicketsDB.getById(id);
            if (!ticket) {
                return { success: false, error: 'Ticket not found' };
            }
            
            return { success: true, ticket: enrichTicket(ticket) };
        } catch (error) {
            console.error('Get ticket error:', error);
            return { success: false, error: 'Failed to retrieve ticket' };
        }
    });
    
    // Create ticket
    ipcMain.handle('tickets:create', async (event, ticketData) => {
        try {
            if (!checkPermission('ticket_create')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const errors = validateTicketData(ticketData);
            if (errors.length > 0) {
                return { success: false, error: errors.join(', ') };
            }
            
            const session = getCurrentSession();
            const priority = ticketData.priority || 'medium';
            
            const newTicket = {
                id: uuidv4(),
                ticketNumber: generateTicketNumber(),
                title: ticketData.title.trim(),
                description: ticketData.description.trim(),
                status: 'new',
                priority,
                category: ticketData.category || 'general',
                customerName: ticketData.customerName || '',
                customerEmail: ticketData.customerEmail || '',
                customerPhone: ticketData.customerPhone || '',
                assignedTo: ticketData.assignedTo || null,
                createdBy: session.user.id,
                dueDate: calculateDueDate(priority),
                tags: ticketData.tags || [],
                attachments: [],
                resolvedAt: null,
                closedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            TicketsDB.create(newTicket);
            
            // Create history entry
            createHistoryEntry(newTicket.id, 'created', 'Ticket created', session.user.id);
            
            return { success: true, ticket: enrichTicket(newTicket) };
        } catch (error) {
            console.error('Create ticket error:', error);
            return { success: false, error: 'Failed to create ticket' };
        }
    });
    
    // Update ticket
    ipcMain.handle('tickets:update', async (event, id, ticketData) => {
        try {
            if (!checkPermission('ticket_edit')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const existingTicket = TicketsDB.getById(id);
            if (!existingTicket) {
                return { success: false, error: 'Ticket not found' };
            }
            
            const errors = validateTicketData({ ...existingTicket, ...ticketData });
            if (errors.length > 0) {
                return { success: false, error: errors.join(', ') };
            }
            
            const session = getCurrentSession();
            const updates = {
                title: ticketData.title ?? existingTicket.title,
                description: ticketData.description ?? existingTicket.description,
                priority: ticketData.priority ?? existingTicket.priority,
                category: ticketData.category ?? existingTicket.category,
                customerName: ticketData.customerName ?? existingTicket.customerName,
                customerEmail: ticketData.customerEmail ?? existingTicket.customerEmail,
                customerPhone: ticketData.customerPhone ?? existingTicket.customerPhone,
                tags: ticketData.tags ?? existingTicket.tags
            };
            
            // Recalculate due date if priority changed
            if (ticketData.priority && ticketData.priority !== existingTicket.priority) {
                updates.dueDate = calculateDueDate(ticketData.priority);
            }
            
            const updatedTicket = TicketsDB.update(id, updates);
            
            // Create history entry
            createHistoryEntry(id, 'updated', 'Ticket updated', session.user.id);
            
            return { success: true, ticket: enrichTicket(updatedTicket) };
        } catch (error) {
            console.error('Update ticket error:', error);
            return { success: false, error: 'Failed to update ticket' };
        }
    });
    
    // Delete ticket
    ipcMain.handle('tickets:delete', async (event, id) => {
        try {
            if (!checkPermission('ticket_delete')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const ticket = TicketsDB.getById(id);
            if (!ticket) {
                return { success: false, error: 'Ticket not found' };
            }
            
            // Delete related comments and history
            const comments = TicketCommentsDB.getByTicket(id);
            comments.forEach(c => TicketCommentsDB.delete(c.id));
            
            TicketsDB.delete(id);
            
            return { success: true };
        } catch (error) {
            console.error('Delete ticket error:', error);
            return { success: false, error: 'Failed to delete ticket' };
        }
    });
    
    // Assign ticket
    ipcMain.handle('tickets:assignTo', async (event, ticketId, userId) => {
        try {
            if (!checkPermission('ticket_assign')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const ticket = TicketsDB.getById(ticketId);
            if (!ticket) {
                return { success: false, error: 'Ticket not found' };
            }
            
            if (userId) {
                const user = UsersDB.getById(userId);
                if (!user) {
                    return { success: false, error: 'User not found' };
                }
            }
            
            const session = getCurrentSession();
            const updates = {
                assignedTo: userId,
                status: ticket.status === 'new' ? 'open' : ticket.status
            };
            
            const updatedTicket = TicketsDB.update(ticketId, updates);
            
            const assignedUser = userId ? UsersDB.getById(userId) : null;
            createHistoryEntry(ticketId, 'assigned', 
                userId ? `Assigned to ${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned',
                session.user.id);
            
            return { success: true, ticket: enrichTicket(updatedTicket) };
        } catch (error) {
            console.error('Assign ticket error:', error);
            return { success: false, error: 'Failed to assign ticket' };
        }
    });
    
    // Change ticket status
    ipcMain.handle('tickets:changeStatus', async (event, ticketId, status) => {
        try {
            if (!checkPermission('ticket_edit')) {
                return { success: false, error: 'Permission denied' };
            }
            
            if (!TICKET_STATUSES.includes(status)) {
                return { success: false, error: 'Invalid status' };
            }
            
            const ticket = TicketsDB.getById(ticketId);
            if (!ticket) {
                return { success: false, error: 'Ticket not found' };
            }
            
            const session = getCurrentSession();
            const updates = { status };
            
            if (status === 'resolved') {
                updates.resolvedAt = new Date().toISOString();
            } else if (status === 'closed') {
                updates.closedAt = new Date().toISOString();
            }
            
            const updatedTicket = TicketsDB.update(ticketId, updates);
            
            createHistoryEntry(ticketId, 'status_changed', 
                `Status changed from ${ticket.status} to ${status}`,
                session.user.id);
            
            return { success: true, ticket: enrichTicket(updatedTicket) };
        } catch (error) {
            console.error('Change status error:', error);
            return { success: false, error: 'Failed to change ticket status' };
        }
    });
    
    // Add comment
    ipcMain.handle('tickets:addComment', async (event, ticketId, commentText) => {
        try {
            if (!checkPermission('ticket_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const ticket = TicketsDB.getById(ticketId);
            if (!ticket) {
                return { success: false, error: 'Ticket not found' };
            }
            
            if (!commentText || commentText.trim().length < 1) {
                return { success: false, error: 'Comment cannot be empty' };
            }
            
            const session = getCurrentSession();
            const comment = {
                id: uuidv4(),
                ticketId,
                userId: session.user.id,
                userName: `${session.user.firstName} ${session.user.lastName}`,
                content: commentText.trim(),
                isInternal: false,
                createdAt: new Date().toISOString()
            };
            
            TicketCommentsDB.create(comment);
            
            createHistoryEntry(ticketId, 'comment_added', 'Comment added', session.user.id);
            
            return { success: true, comment };
        } catch (error) {
            console.error('Add comment error:', error);
            return { success: false, error: 'Failed to add comment' };
        }
    });
    
    // Get comments
    ipcMain.handle('tickets:getComments', async (event, ticketId) => {
        try {
            if (!checkPermission('ticket_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const comments = TicketCommentsDB.getByTicket(ticketId);
            comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return { success: true, comments };
        } catch (error) {
            console.error('Get comments error:', error);
            return { success: false, error: 'Failed to retrieve comments' };
        }
    });
    
    // Get ticket history
    ipcMain.handle('tickets:getHistory', async (event, ticketId) => {
        try {
            if (!checkPermission('ticket_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const history = TicketHistoryDB.getByTicket(ticketId);
            
            // Enrich with user names
            const enrichedHistory = history.map(entry => {
                const user = UsersDB.getById(entry.userId);
                return {
                    ...entry,
                    userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
                };
            });
            
            enrichedHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return { success: true, history: enrichedHistory };
        } catch (error) {
            console.error('Get history error:', error);
            return { success: false, error: 'Failed to retrieve history' };
        }
    });
    
    // Get statistics
    ipcMain.handle('tickets:getStatistics', async () => {
        try {
            if (!checkPermission('ticket_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const stats = generateStatistics();
            return { success: true, statistics: stats };
        } catch (error) {
            console.error('Get statistics error:', error);
            return { success: false, error: 'Failed to get statistics' };
        }
    });
    
    // Get tickets by user
    ipcMain.handle('tickets:getByUser', async (event, userId) => {
        try {
            if (!checkPermission('ticket_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const tickets = TicketsDB.getByUser(userId).map(enrichTicket);
            return { success: true, tickets };
        } catch (error) {
            console.error('Get tickets by user error:', error);
            return { success: false, error: 'Failed to retrieve tickets' };
        }
    });
    
    // Search tickets
    ipcMain.handle('tickets:search', async (event, query) => {
        try {
            if (!checkPermission('ticket_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const tickets = TicketsDB.search(query).map(enrichTicket);
            return { success: true, tickets };
        } catch (error) {
            console.error('Search tickets error:', error);
            return { success: false, error: 'Failed to search tickets' };
        }
    });
    
    // Bulk update
    ipcMain.handle('tickets:bulkUpdate', async (event, ticketIds, updates) => {
        try {
            if (!checkPermission('ticket_bulk_update')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const session = getCurrentSession();
            let updated = 0;
            
            for (const ticketId of ticketIds) {
                const ticket = TicketsDB.getById(ticketId);
                if (ticket) {
                    TicketsDB.update(ticketId, updates);
                    createHistoryEntry(ticketId, 'bulk_updated', 'Bulk update applied', session.user.id);
                    updated++;
                }
            }
            
            return { success: true, updated };
        } catch (error) {
            console.error('Bulk update error:', error);
            return { success: false, error: 'Failed to perform bulk update' };
        }
    });
    
    // Export tickets
    ipcMain.handle('tickets:export', async (event, filters, format) => {
        try {
            if (!checkPermission('ticket_export')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const tickets = filters 
                ? TicketsDB.getFiltered(filters).map(enrichTicket)
                : TicketsDB.getAll().map(enrichTicket);
            
            let data;
            if (format === 'json') {
                data = JSON.stringify(tickets, null, 2);
            } else if (format === 'csv') {
                const headers = ['Ticket Number', 'Title', 'Status', 'Priority', 'Category', 'Assigned To', 'Created By', 'Created At', 'Due Date'];
                const rows = tickets.map(t => [
                    t.ticketNumber, t.title, t.status, t.priority, t.category,
                    t.assignedToName, t.createdByName, t.createdAt, t.dueDate
                ]);
                data = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
            } else {
                return { success: false, error: 'Invalid export format' };
            }
            
            return { success: true, data, format };
        } catch (error) {
            console.error('Export tickets error:', error);
            return { success: false, error: 'Failed to export tickets' };
        }
    });
}

module.exports = { registerTicketHandlers };
