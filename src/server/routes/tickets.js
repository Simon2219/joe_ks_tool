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
        
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
    }
});

/**
 * GET /api/tickets/stats
 */
router.get('/stats', requirePermission('ticket_view'), (req, res) => {
    try {
        res.json({ success: true, stats: TicketSystem.getStatistics() });
    } catch (error) {
        console.error('Get ticket stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
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

        ticket.comments = TicketSystem.getComments(req.params.id);
        ticket.history = TicketSystem.getHistory(req.params.id);
        
        res.json({ success: true, ticket });
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
        res.status(201).json({ success: true, ticket });
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
        res.json({ success: true, ticket: updated });
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
        if (!['new', 'open', 'pending', 'resolved', 'closed'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const updated = TicketSystem.changeStatus(req.params.id, status, req.user.id);
        res.json({ success: true, ticket: updated });
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
        res.json({ success: true, ticket: updated });
    } catch (error) {
        console.error('Assign ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to assign ticket' });
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
        res.status(201).json({ success: true, comment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, error: 'Failed to add comment' });
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
