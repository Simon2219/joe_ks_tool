/**
 * Ticket System Routes
 * CRUD operations for tickets
 */

const express = require('express');
const router = express.Router();

const { TicketModel, UserModel } = require('../database');
const { authenticate, requirePermission, hasPermission } = require('../middleware/auth');

/**
 * Formats ticket for response
 */
function formatTicket(ticket) {
    return {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        customerName: ticket.customer_name,
        customerEmail: ticket.customer_email,
        customerPhone: ticket.customer_phone,
        assignedTo: ticket.assigned_to,
        assignedToName: ticket.assigned_to_name || 'Unassigned',
        createdBy: ticket.created_by,
        createdByName: ticket.created_by_name || 'Unknown',
        dueDate: ticket.due_date,
        resolvedAt: ticket.resolved_at,
        closedAt: ticket.closed_at,
        jiraKey: ticket.jira_key,
        tags: ticket.tags || [],
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at
    };
}

/**
 * GET /api/tickets
 * Returns tickets (filtered by permissions)
 */
router.get('/', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        let tickets;
        const { status, priority, assignedTo } = req.query;

        // Check if user can view all tickets
        if (hasPermission(req.user, 'ticket_view_all')) {
            tickets = TicketModel.getAll({ status, priority, assignedTo });
        } else {
            // User can only see their own tickets
            tickets = TicketModel.getByUser(req.user.id);
            // Apply filters
            if (status) tickets = tickets.filter(t => t.status === status);
            if (priority) tickets = tickets.filter(t => t.priority === priority);
        }

        res.json({ 
            success: true, 
            tickets: tickets.map(formatTicket) 
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve tickets' });
    }
});

/**
 * GET /api/tickets/statistics
 * Returns ticket statistics
 */
router.get('/statistics', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        const statistics = TicketModel.getStatistics();
        res.json({ success: true, statistics });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ success: false, error: 'Failed to get statistics' });
    }
});

/**
 * GET /api/tickets/:id
 * Returns a specific ticket
 */
router.get('/:id', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        const ticket = TicketModel.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        // Check if user can view this ticket
        if (!hasPermission(req.user, 'ticket_view_all')) {
            if (ticket.assigned_to !== req.user.id && ticket.created_by !== req.user.id) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'You can only view your own tickets' 
                });
            }
        }

        res.json({ success: true, ticket: formatTicket(ticket) });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve ticket' });
    }
});

/**
 * POST /api/tickets
 * Creates a new ticket
 */
router.post('/', authenticate, requirePermission('ticket_create'), (req, res) => {
    try {
        const ticketData = req.body;

        // Validation
        if (!ticketData.title || ticketData.title.length < 5) {
            return res.status(400).json({ 
                success: false, 
                error: 'Title must be at least 5 characters' 
            });
        }
        if (!ticketData.description || ticketData.description.length < 10) {
            return res.status(400).json({ 
                success: false, 
                error: 'Description must be at least 10 characters' 
            });
        }

        // Validate assignee if provided
        if (ticketData.assignedTo) {
            const assignee = UserModel.getById(ticketData.assignedTo);
            if (!assignee) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid assignee' 
                });
            }
        }

        const newTicket = TicketModel.create(ticketData, req.user.id);
        res.status(201).json({ success: true, ticket: formatTicket(newTicket) });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to create ticket' });
    }
});

/**
 * PUT /api/tickets/:id
 * Updates a ticket
 */
router.put('/:id', authenticate, requirePermission('ticket_edit'), (req, res) => {
    try {
        const { id } = req.params;
        const ticketData = req.body;

        const existingTicket = TicketModel.getById(id);
        if (!existingTicket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const updatedTicket = TicketModel.update(id, ticketData, req.user.id);
        res.json({ success: true, ticket: formatTicket(updatedTicket) });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to update ticket' });
    }
});

/**
 * PUT /api/tickets/:id/status
 * Changes ticket status
 */
router.put('/:id/status', authenticate, requirePermission('ticket_edit'), (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['new', 'open', 'in_progress', 'pending', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const ticket = TicketModel.getById(id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const updatedTicket = TicketModel.changeStatus(id, status, req.user.id);
        res.json({ success: true, ticket: formatTicket(updatedTicket) });
    } catch (error) {
        console.error('Change status error:', error);
        res.status(500).json({ success: false, error: 'Failed to change status' });
    }
});

/**
 * PUT /api/tickets/:id/assign
 * Assigns ticket to user
 */
router.put('/:id/assign', authenticate, requirePermission('ticket_assign'), (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const ticket = TicketModel.getById(id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        // Validate assignee if provided
        if (userId) {
            const user = UserModel.getById(userId);
            if (!user) {
                return res.status(400).json({ success: false, error: 'User not found' });
            }
        }

        const updatedTicket = TicketModel.assign(id, userId, req.user.id);
        res.json({ success: true, ticket: formatTicket(updatedTicket) });
    } catch (error) {
        console.error('Assign ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to assign ticket' });
    }
});

/**
 * DELETE /api/tickets/:id
 * Deletes a ticket
 */
router.delete('/:id', authenticate, requirePermission('ticket_delete'), (req, res) => {
    try {
        const ticket = TicketModel.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        TicketModel.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete ticket' });
    }
});

/**
 * GET /api/tickets/:id/comments
 * Returns comments for a ticket
 */
router.get('/:id/comments', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        const ticket = TicketModel.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const comments = TicketModel.getComments(req.params.id);
        res.json({ 
            success: true, 
            comments: comments.map(c => ({
                id: c.id,
                ticketId: c.ticket_id,
                userId: c.user_id,
                userName: c.user_name,
                content: c.content,
                createdAt: c.created_at
            }))
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, error: 'Failed to get comments' });
    }
});

/**
 * POST /api/tickets/:id/comments
 * Adds a comment to a ticket
 */
router.post('/:id/comments', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        const { content } = req.body;
        const ticketId = req.params.id;

        if (!content || content.trim().length < 1) {
            return res.status(400).json({ success: false, error: 'Comment cannot be empty' });
        }

        const ticket = TicketModel.getById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const comment = TicketModel.addComment(ticketId, req.user.id, content);
        res.status(201).json({ 
            success: true, 
            comment: {
                id: comment.id,
                ticketId: comment.ticket_id,
                userId: comment.user_id,
                userName: comment.user_name,
                content: comment.content,
                createdAt: comment.created_at
            }
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, error: 'Failed to add comment' });
    }
});

/**
 * GET /api/tickets/:id/history
 * Returns history for a ticket
 */
router.get('/:id/history', authenticate, requirePermission('ticket_view'), (req, res) => {
    try {
        const ticket = TicketModel.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const history = TicketModel.getHistory(req.params.id);
        res.json({ 
            success: true, 
            history: history.map(h => ({
                id: h.id,
                ticketId: h.ticket_id,
                userId: h.user_id,
                userName: h.user_name,
                action: h.action,
                details: h.details,
                createdAt: h.created_at
            }))
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, error: 'Failed to get history' });
    }
});

module.exports = router;
