/**
 * Ticket Routes - TicketSystem
 * Handles ticket management operations
 */

const express = require('express');
const router = express.Router();

const { TicketSystem, UserSystem } = require('../database');
const { authenticate, requirePermission, hasPermission, canAccessResource } = require('../middleware/auth');

router.use(authenticate);

/**
 * Formats a ticket for API response (snake_case to camelCase)
 */
function formatTicket(ticket) {
    if (!ticket) return null;
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
        createdByName: ticket.created_by_name,
        dueDate: ticket.due_date,
        resolvedAt: ticket.resolved_at,
        closedAt: ticket.closed_at,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at
    };
}

/**
 * Formats a comment for API response
 */
function formatComment(comment) {
    if (!comment) return null;
    return {
        id: comment.id,
        ticketId: comment.ticket_id,
        userId: comment.user_id,
        userName: comment.user_name,
        content: comment.content,
        createdAt: comment.created_at
    };
}

/**
 * Formats a history entry for API response
 */
function formatHistory(entry) {
    if (!entry) return null;
    return {
        id: entry.id,
        ticketId: entry.ticket_id,
        userId: entry.user_id,
        userName: entry.user_name,
        action: entry.action,
        details: entry.details,
        createdAt: entry.created_at
    };
}

/**
 * GET /api/tickets
 */
router.get('/', requirePermission('ticket_view'), (req, res) => {
    try {
        let tickets;
        
        if (hasPermission(req.user, 'ticket_view_all')) {
            tickets = TicketSystem.getAll(req.query);
        } else {
            tickets = TicketSystem.getByUser(req.user.id);
        }
        
        res.json({ success: true, tickets: tickets.map(formatTicket) });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
    }
});

/**
 * GET /api/tickets/statistics
 */
router.get('/statistics', requirePermission('ticket_view'), (req, res) => {
    try {
        res.json({ success: true, statistics: TicketSystem.getStatistics() });
    } catch (error) {
        console.error('Get ticket stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

/**
 * GET /api/tickets/export - Export tickets
 */
router.get('/export', requirePermission('ticket_view'), (req, res) => {
    try {
        let tickets;
        
        if (hasPermission(req.user, 'ticket_view_all')) {
            tickets = TicketSystem.getAll(req.query);
        } else {
            tickets = TicketSystem.getByUser(req.user.id);
        }
        
        const formattedTickets = tickets.map(formatTicket);
        
        // Generate CSV
        const headers = ['Ticket #', 'Title', 'Status', 'Priority', 'Category', 'Assigned To', 'Customer', 'Created', 'Due Date'];
        const rows = formattedTickets.map(t => [
            t.ticketNumber,
            (t.title || '').replace(/"/g, '""'),
            t.status,
            t.priority,
            t.category,
            t.assignedToName || 'Unassigned',
            t.customerName || '',
            t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '',
            t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        res.json({ success: true, data: csv });
    } catch (error) {
        console.error('Export tickets error:', error);
        res.status(500).json({ success: false, error: 'Failed to export tickets' });
    }
});

/**
 * GET /api/tickets/:id
 */
router.get('/:id', requirePermission('ticket_view'), (req, res) => {
    try {
        const ticket = TicketSystem.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        if (!canAccessResource(req.user, 'ticket', ticket.assigned_to || ticket.created_by)) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const formatted = formatTicket(ticket);
        formatted.comments = TicketSystem.getComments(req.params.id).map(formatComment);
        formatted.history = TicketSystem.getHistory(req.params.id).map(formatHistory);
        
        res.json({ success: true, ticket: formatted });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch ticket' });
    }
});

/**
 * POST /api/tickets
 */
router.post('/', requirePermission('ticket_create'), (req, res) => {
    try {
        const ticket = TicketSystem.create(req.body, req.user.id);
        res.status(201).json({ success: true, ticket: formatTicket(ticket) });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to create ticket' });
    }
});

/**
 * PUT /api/tickets/:id
 */
router.put('/:id', requirePermission('ticket_edit'), (req, res) => {
    try {
        const ticket = TicketSystem.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        if (!canAccessResource(req.user, 'ticket', ticket.assigned_to || ticket.created_by)) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const updated = TicketSystem.update(req.params.id, req.body, req.user.id);
        res.json({ success: true, ticket: formatTicket(updated) });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to update ticket' });
    }
});

/**
 * PUT /api/tickets/:id/status
 */
router.put('/:id/status', requirePermission('ticket_edit'), (req, res) => {
    try {
        const ticket = TicketSystem.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const { status } = req.body;
        if (!['new', 'open', 'in_progress', 'pending', 'resolved', 'closed'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const updated = TicketSystem.changeStatus(req.params.id, status, req.user.id);
        res.json({ success: true, ticket: formatTicket(updated) });
    } catch (error) {
        console.error('Change status error:', error);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});

/**
 * PUT /api/tickets/:id/assign
 */
router.put('/:id/assign', requirePermission('ticket_assign'), (req, res) => {
    try {
        const ticket = TicketSystem.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const { assignedTo } = req.body;
        if (assignedTo && !UserSystem.getById(assignedTo)) {
            return res.status(400).json({ success: false, error: 'Invalid user' });
        }

        const updated = TicketSystem.assign(req.params.id, assignedTo, req.user.id);
        res.json({ success: true, ticket: formatTicket(updated) });
    } catch (error) {
        console.error('Assign ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to assign ticket' });
    }
});

/**
 * GET /api/tickets/:id/comments
 */
router.get('/:id/comments', requirePermission('ticket_view'), (req, res) => {
    try {
        const ticket = TicketSystem.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const comments = TicketSystem.getComments(req.params.id);
        res.json({ success: true, comments: comments.map(formatComment) });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch comments' });
    }
});

/**
 * POST /api/tickets/:id/comments
 */
router.post('/:id/comments', requirePermission('ticket_view'), (req, res) => {
    try {
        const ticket = TicketSystem.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        const comment = TicketSystem.addComment(req.params.id, req.user.id, content);
        res.status(201).json({ success: true, comment: formatComment(comment) });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, error: 'Failed to add comment' });
    }
});

/**
 * GET /api/tickets/:id/history
 */
router.get('/:id/history', requirePermission('ticket_view'), (req, res) => {
    try {
        const ticket = TicketSystem.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const history = TicketSystem.getHistory(req.params.id);
        res.json({ success: true, history: history.map(formatHistory) });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});

/**
 * DELETE /api/tickets/:id
 */
router.delete('/:id', requirePermission('ticket_delete'), (req, res) => {
    try {
        const ticket = TicketSystem.getById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        TicketSystem.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete ticket' });
    }
});

module.exports = router;
