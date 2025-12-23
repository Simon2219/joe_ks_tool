/**
 * Ticket System Routes
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { TicketsDB, TicketCommentsDB, TicketHistoryDB, UsersDB } = require('../database/dbService');
const { authenticate, requirePermission, hasPermission } = require('../middleware/auth');

const TICKET_STATUSES = ['new', 'open', 'in_progress', 'pending', 'resolved', 'closed'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'];

// Generate ticket number
function generateTicketNumber() {
    const prefix = 'TKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// Enrich ticket with user names
function enrichTicket(ticket) {
    const assignedUser = ticket.assignedTo ? UsersDB.getById(ticket.assignedTo) : null;
    const createdByUser = UsersDB.getById(ticket.createdBy);
    return {
        ...ticket,
        assignedToName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned',
        createdByName: createdByUser ? `${createdByUser.firstName} ${createdByUser.lastName}` : 'Unknown'
    };
}

// Calculate SLA due date
function calculateDueDate(priority) {
    const hours = { critical: 2, high: 8, medium: 24, low: 72 };
    return new Date(Date.now() + (hours[priority] || 24) * 60 * 60 * 1000).toISOString();
}

// Create history entry
function createHistoryEntry(ticketId, action, details, userId) {
    TicketHistoryDB.create({
        id: uuidv4(),
        ticketId,
        action,
        details,
        userId,
        createdAt: new Date().toISOString()
    });
}

// GET /api/tickets
router.get('/', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        let tickets;
        const { status, priority, assignedTo } = req.query;

        if (hasPermission(req.user, 'ticket_view_all')) {
            tickets = TicketsDB.getAll();
        } else {
            tickets = TicketsDB.getByUser(req.user.id);
        }

        // Apply filters
        if (status) tickets = tickets.filter(t => t.status === status);
        if (priority) tickets = tickets.filter(t => t.priority === priority);
        if (assignedTo) tickets = tickets.filter(t => t.assignedTo === assignedTo);

        tickets = tickets.map(enrichTicket);
        tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.json({ success: false, error: 'Failed to retrieve tickets' });
    }
});

// GET /api/tickets/statistics
router.get('/statistics', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        const tickets = TicketsDB.getAll();
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const byStatus = {};
        TICKET_STATUSES.forEach(s => byStatus[s] = tickets.filter(t => t.status === s).length);

        const byPriority = {};
        TICKET_PRIORITIES.forEach(p => byPriority[p] = tickets.filter(t => t.priority === p).length);

        res.json({
            success: true,
            statistics: {
                total: tickets.length,
                byStatus,
                byPriority,
                openTickets: tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length,
                resolvedThisWeek: tickets.filter(t => t.resolvedAt && new Date(t.resolvedAt) >= weekAgo).length,
                createdThisWeek: tickets.filter(t => new Date(t.createdAt) >= weekAgo).length
            }
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.json({ success: false, error: 'Failed to get statistics' });
    }
});

// GET /api/tickets/:id
router.get('/:id', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        const ticket = TicketsDB.getById(req.params.id);
        if (!ticket) {
            return res.json({ success: false, error: 'Ticket not found' });
        }
        res.json({ success: true, ticket: enrichTicket(ticket) });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.json({ success: false, error: 'Failed to retrieve ticket' });
    }
});

// POST /api/tickets
router.post('/', authenticate, requirePermission('ticket_create'), (req, res) => {
    try {
        const ticketData = req.body;

        if (!ticketData.title || ticketData.title.length < 5) {
            return res.json({ success: false, error: 'Title must be at least 5 characters' });
        }
        if (!ticketData.description || ticketData.description.length < 10) {
            return res.json({ success: false, error: 'Description must be at least 10 characters' });
        }

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
            createdBy: req.user.id,
            dueDate: calculateDueDate(priority),
            tags: ticketData.tags || [],
            resolvedAt: null,
            closedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        TicketsDB.create(newTicket);
        createHistoryEntry(newTicket.id, 'created', 'Ticket created', req.user.id);

        res.json({ success: true, ticket: enrichTicket(newTicket) });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.json({ success: false, error: 'Failed to create ticket' });
    }
});

// PUT /api/tickets/:id
router.put('/:id', authenticate, requirePermission('ticket_edit'), (req, res) => {
    try {
        const { id } = req.params;
        const ticketData = req.body;

        const existingTicket = TicketsDB.getById(id);
        if (!existingTicket) {
            return res.json({ success: false, error: 'Ticket not found' });
        }

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

        if (ticketData.priority && ticketData.priority !== existingTicket.priority) {
            updates.dueDate = calculateDueDate(ticketData.priority);
        }

        const updatedTicket = TicketsDB.update(id, updates);
        createHistoryEntry(id, 'updated', 'Ticket updated', req.user.id);

        res.json({ success: true, ticket: enrichTicket(updatedTicket) });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.json({ success: false, error: 'Failed to update ticket' });
    }
});

// PUT /api/tickets/:id/status
router.put('/:id/status', authenticate, requirePermission('ticket_edit'), (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!TICKET_STATUSES.includes(status)) {
            return res.json({ success: false, error: 'Invalid status' });
        }

        const ticket = TicketsDB.getById(id);
        if (!ticket) {
            return res.json({ success: false, error: 'Ticket not found' });
        }

        const updates = { status };
        if (status === 'resolved') updates.resolvedAt = new Date().toISOString();
        if (status === 'closed') updates.closedAt = new Date().toISOString();

        const updatedTicket = TicketsDB.update(id, updates);
        createHistoryEntry(id, 'status_changed', `Status changed from ${ticket.status} to ${status}`, req.user.id);

        res.json({ success: true, ticket: enrichTicket(updatedTicket) });
    } catch (error) {
        console.error('Change status error:', error);
        res.json({ success: false, error: 'Failed to change status' });
    }
});

// PUT /api/tickets/:id/assign
router.put('/:id/assign', authenticate, requirePermission('ticket_assign'), (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const ticket = TicketsDB.getById(id);
        if (!ticket) {
            return res.json({ success: false, error: 'Ticket not found' });
        }

        if (userId) {
            const user = UsersDB.getById(userId);
            if (!user) {
                return res.json({ success: false, error: 'User not found' });
            }
        }

        const updates = {
            assignedTo: userId || null,
            status: ticket.status === 'new' ? 'open' : ticket.status
        };

        const updatedTicket = TicketsDB.update(id, updates);
        const assignedUser = userId ? UsersDB.getById(userId) : null;
        createHistoryEntry(id, 'assigned',
            userId ? `Assigned to ${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned',
            req.user.id);

        res.json({ success: true, ticket: enrichTicket(updatedTicket) });
    } catch (error) {
        console.error('Assign ticket error:', error);
        res.json({ success: false, error: 'Failed to assign ticket' });
    }
});

// DELETE /api/tickets/:id
router.delete('/:id', authenticate, requirePermission('ticket_delete'), (req, res) => {
    try {
        const ticket = TicketsDB.getById(req.params.id);
        if (!ticket) {
            return res.json({ success: false, error: 'Ticket not found' });
        }

        // Delete related data
        const comments = TicketCommentsDB.getByTicket(req.params.id);
        comments.forEach(c => TicketCommentsDB.delete(c.id));

        TicketsDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.json({ success: false, error: 'Failed to delete ticket' });
    }
});

// GET /api/tickets/:id/comments
router.get('/:id/comments', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        const comments = TicketCommentsDB.getByTicket(req.params.id);
        comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ success: true, comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.json({ success: false, error: 'Failed to get comments' });
    }
});

// POST /api/tickets/:id/comments
router.post('/:id/comments', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        const { content } = req.body;
        const ticketId = req.params.id;

        if (!content || content.trim().length < 1) {
            return res.json({ success: false, error: 'Comment cannot be empty' });
        }

        const ticket = TicketsDB.getById(ticketId);
        if (!ticket) {
            return res.json({ success: false, error: 'Ticket not found' });
        }

        const comment = {
            id: uuidv4(),
            ticketId,
            userId: req.user.id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            content: content.trim(),
            createdAt: new Date().toISOString()
        };

        TicketCommentsDB.create(comment);
        createHistoryEntry(ticketId, 'comment_added', 'Comment added', req.user.id);

        res.json({ success: true, comment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.json({ success: false, error: 'Failed to add comment' });
    }
});

// GET /api/tickets/:id/history
router.get('/:id/history', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        const history = TicketHistoryDB.getByTicket(req.params.id);

        const enrichedHistory = history.map(entry => {
            const user = UsersDB.getById(entry.userId);
            return {
                ...entry,
                userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
            };
        });

        enrichedHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ success: true, history: enrichedHistory });
    } catch (error) {
        console.error('Get history error:', error);
        res.json({ success: false, error: 'Failed to get history' });
    }
});

module.exports = router;
