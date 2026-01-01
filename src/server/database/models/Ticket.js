/**
 * Ticket Model
 * Database operations for tickets
 */

const { getDatabase } = require('../sqlite');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique ticket number
 */
function generateTicketNumber() {
    const prefix = 'TKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Calculate due date based on priority
 */
function calculateDueDate(priority) {
    const hours = { critical: 2, high: 8, medium: 24, low: 72 };
    return new Date(Date.now() + (hours[priority] || 24) * 60 * 60 * 1000).toISOString();
}

const TicketModel = {
    /**
     * Gets all tickets with user info
     */
    getAll(filters = {}) {
        const db = getDatabase();
        let sql = `
            SELECT t.*,
                   ua.first_name || ' ' || ua.last_name as assigned_to_name,
                   uc.first_name || ' ' || uc.last_name as created_by_name
            FROM tickets t
            LEFT JOIN users ua ON t.assigned_to = ua.id
            LEFT JOIN users uc ON t.created_by = uc.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.status) {
            sql += ' AND t.status = ?';
            params.push(filters.status);
        }
        if (filters.priority) {
            sql += ' AND t.priority = ?';
            params.push(filters.priority);
        }
        if (filters.assignedTo) {
            sql += ' AND t.assigned_to = ?';
            params.push(filters.assignedTo);
        }
        if (filters.createdBy) {
            sql += ' AND t.created_by = ?';
            params.push(filters.createdBy);
        }
        if (filters.category) {
            sql += ' AND t.category = ?';
            params.push(filters.category);
        }

        sql += ' ORDER BY t.created_at DESC';

        const tickets = db.prepare(sql).all(...params);
        
        // Get tags for each ticket
        return tickets.map(ticket => ({
            ...ticket,
            tags: this.getTicketTags(ticket.id)
        }));
    },

    /**
     * Gets tickets for a specific user (assigned to them)
     */
    getByUser(userId) {
        const db = getDatabase();
        const tickets = db.prepare(`
            SELECT t.*,
                   ua.first_name || ' ' || ua.last_name as assigned_to_name,
                   uc.first_name || ' ' || uc.last_name as created_by_name
            FROM tickets t
            LEFT JOIN users ua ON t.assigned_to = ua.id
            LEFT JOIN users uc ON t.created_by = uc.id
            WHERE t.assigned_to = ? OR t.created_by = ?
            ORDER BY t.created_at DESC
        `).all(userId, userId);

        return tickets.map(ticket => ({
            ...ticket,
            tags: this.getTicketTags(ticket.id)
        }));
    },

    /**
     * Gets a ticket by ID
     */
    getById(id) {
        const db = getDatabase();
        const ticket = db.prepare(`
            SELECT t.*,
                   ua.first_name || ' ' || ua.last_name as assigned_to_name,
                   uc.first_name || ' ' || uc.last_name as created_by_name
            FROM tickets t
            LEFT JOIN users ua ON t.assigned_to = ua.id
            LEFT JOIN users uc ON t.created_by = uc.id
            WHERE t.id = ?
        `).get(id);

        if (!ticket) return null;

        return {
            ...ticket,
            tags: this.getTicketTags(id)
        };
    },

    /**
     * Gets tags for a ticket
     */
    getTicketTags(ticketId) {
        const db = getDatabase();
        return db.prepare('SELECT tag FROM ticket_tags WHERE ticket_id = ?')
            .all(ticketId).map(t => t.tag);
    },

    /**
     * Creates a new ticket
     */
    create(ticketData, userId) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const id = uuidv4();
        const priority = ticketData.priority || 'medium';

        const transaction = db.transaction(() => {
            db.prepare(`
                INSERT INTO tickets (
                    id, ticket_number, title, description, status, priority, category,
                    customer_name, customer_email, customer_phone, assigned_to, created_by,
                    due_date, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                generateTicketNumber(),
                ticketData.title.trim(),
                ticketData.description.trim(),
                'new',
                priority,
                ticketData.category || 'general',
                ticketData.customerName || '',
                ticketData.customerEmail || '',
                ticketData.customerPhone || '',
                ticketData.assignedTo || null,
                userId,
                calculateDueDate(priority),
                now,
                now
            );

            // Insert tags
            if (ticketData.tags && ticketData.tags.length > 0) {
                const insertTag = db.prepare('INSERT INTO ticket_tags (ticket_id, tag) VALUES (?, ?)');
                for (const tag of ticketData.tags) {
                    insertTag.run(id, tag);
                }
            }

            // Create history entry
            this.createHistoryEntry(id, 'created', 'Ticket created', userId);
        });

        transaction();
        return this.getById(id);
    },

    /**
     * Updates a ticket
     */
    update(id, updates, userId) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const existing = this.getById(id);
        if (!existing) return null;

        const transaction = db.transaction(() => {
            const fields = [];
            const values = [];

            if (updates.title !== undefined) {
                fields.push('title = ?');
                values.push(updates.title);
            }
            if (updates.description !== undefined) {
                fields.push('description = ?');
                values.push(updates.description);
            }
            if (updates.priority !== undefined) {
                fields.push('priority = ?');
                values.push(updates.priority);
                if (updates.priority !== existing.priority) {
                    fields.push('due_date = ?');
                    values.push(calculateDueDate(updates.priority));
                }
            }
            if (updates.category !== undefined) {
                fields.push('category = ?');
                values.push(updates.category);
            }
            if (updates.customerName !== undefined) {
                fields.push('customer_name = ?');
                values.push(updates.customerName);
            }
            if (updates.customerEmail !== undefined) {
                fields.push('customer_email = ?');
                values.push(updates.customerEmail);
            }
            if (updates.customerPhone !== undefined) {
                fields.push('customer_phone = ?');
                values.push(updates.customerPhone);
            }
            if (updates.jiraKey !== undefined) {
                fields.push('jira_key = ?');
                values.push(updates.jiraKey);
            }

            if (fields.length > 0) {
                fields.push('updated_at = ?');
                values.push(now);
                values.push(id);
                db.prepare(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
            }

            // Update tags if provided
            if (updates.tags !== undefined) {
                db.prepare('DELETE FROM ticket_tags WHERE ticket_id = ?').run(id);
                const insertTag = db.prepare('INSERT INTO ticket_tags (ticket_id, tag) VALUES (?, ?)');
                for (const tag of updates.tags) {
                    insertTag.run(id, tag);
                }
            }

            this.createHistoryEntry(id, 'updated', 'Ticket updated', userId);
        });

        transaction();
        return this.getById(id);
    },

    /**
     * Changes ticket status
     */
    changeStatus(id, status, userId) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const existing = this.getById(id);
        if (!existing) return null;

        const updates = { status, updated_at: now };
        if (status === 'resolved') updates.resolved_at = now;
        if (status === 'closed') updates.closed_at = now;

        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id];

        db.prepare(`UPDATE tickets SET ${fields} WHERE id = ?`).run(...values);
        this.createHistoryEntry(id, 'status_changed', `Status changed from ${existing.status} to ${status}`, userId);

        return this.getById(id);
    },

    /**
     * Assigns ticket to user
     */
    assign(id, assignedTo, userId) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const existing = this.getById(id);
        if (!existing) return null;

        const status = existing.status === 'new' ? 'open' : existing.status;

        db.prepare(`
            UPDATE tickets SET assigned_to = ?, status = ?, updated_at = ? WHERE id = ?
        `).run(assignedTo || null, status, now, id);

        const detail = assignedTo ? `Assigned to user` : 'Unassigned';
        this.createHistoryEntry(id, 'assigned', detail, userId);

        return this.getById(id);
    },

    /**
     * Deletes a ticket
     */
    delete(id) {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
        return result.changes > 0;
    },

    /**
     * Gets comments for a ticket
     */
    getComments(ticketId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT tc.*, u.first_name || ' ' || u.last_name as user_name
            FROM ticket_comments tc
            LEFT JOIN users u ON tc.user_id = u.id
            WHERE tc.ticket_id = ?
            ORDER BY tc.created_at DESC
        `).all(ticketId);
    },

    /**
     * Adds a comment to a ticket
     */
    addComment(ticketId, userId, content) {
        const db = getDatabase();
        const now = new Date().toISOString();
        const id = uuidv4();

        db.prepare(`
            INSERT INTO ticket_comments (id, ticket_id, user_id, content, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, ticketId, userId, content.trim(), now);

        this.createHistoryEntry(ticketId, 'comment_added', 'Comment added', userId);

        return db.prepare(`
            SELECT tc.*, u.first_name || ' ' || u.last_name as user_name
            FROM ticket_comments tc
            LEFT JOIN users u ON tc.user_id = u.id
            WHERE tc.id = ?
        `).get(id);
    },

    /**
     * Gets history for a ticket
     */
    getHistory(ticketId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT th.*, u.first_name || ' ' || u.last_name as user_name
            FROM ticket_history th
            LEFT JOIN users u ON th.user_id = u.id
            WHERE th.ticket_id = ?
            ORDER BY th.created_at DESC
        `).all(ticketId);
    },

    /**
     * Creates a history entry
     */
    createHistoryEntry(ticketId, action, details, userId) {
        const db = getDatabase();
        const now = new Date().toISOString();

        db.prepare(`
            INSERT INTO ticket_history (id, ticket_id, user_id, action, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), ticketId, userId, action, details, now);
    },

    /**
     * Gets ticket statistics
     */
    getStatistics() {
        const db = getDatabase();
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const total = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;
        
        const byStatus = {};
        const statusCounts = db.prepare(`
            SELECT status, COUNT(*) as count FROM tickets GROUP BY status
        `).all();
        for (const row of statusCounts) {
            byStatus[row.status] = row.count;
        }

        const byPriority = {};
        const priorityCounts = db.prepare(`
            SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority
        `).all();
        for (const row of priorityCounts) {
            byPriority[row.priority] = row.count;
        }

        const openTickets = db.prepare(`
            SELECT COUNT(*) as count FROM tickets WHERE status NOT IN ('resolved', 'closed')
        `).get().count;

        const resolvedThisWeek = db.prepare(`
            SELECT COUNT(*) as count FROM tickets WHERE resolved_at >= ?
        `).get(weekAgo).count;

        const createdThisWeek = db.prepare(`
            SELECT COUNT(*) as count FROM tickets WHERE created_at >= ?
        `).get(weekAgo).count;

        return {
            total,
            byStatus,
            byPriority,
            openTickets,
            resolvedThisWeek,
            createdThisWeek
        };
    },

    /**
     * Searches tickets
     */
    search(query) {
        const db = getDatabase();
        const searchTerm = `%${query.toLowerCase()}%`;
        return db.prepare(`
            SELECT t.*,
                   ua.first_name || ' ' || ua.last_name as assigned_to_name,
                   uc.first_name || ' ' || uc.last_name as created_by_name
            FROM tickets t
            LEFT JOIN users ua ON t.assigned_to = ua.id
            LEFT JOIN users uc ON t.created_by = uc.id
            WHERE LOWER(t.title) LIKE ?
               OR LOWER(t.description) LIKE ?
               OR LOWER(t.ticket_number) LIKE ?
            ORDER BY t.created_at DESC
        `).all(searchTerm, searchTerm, searchTerm);
    }
};

module.exports = TicketModel;
