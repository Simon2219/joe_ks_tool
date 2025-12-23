/**
 * Table Component
 * Handles data table rendering and interactions
 */

const Table = {
    /**
     * Renders table rows
     */
    render(tbody, data, columns, options = {}) {
        const { emptyMessage = 'No data available' } = options;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${columns.length}" class="empty-state">
                        ${Helpers.escapeHtml(emptyMessage)}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => this.renderRow(item, columns)).join('');
    },

    /**
     * Renders a single table row
     */
    renderRow(item, columns) {
        const cells = columns.map(col => {
            let value = item[col.key];
            
            if (col.render) {
                value = col.render(value, item);
            } else if (col.format) {
                value = this.formatValue(value, col.format);
            } else {
                value = Helpers.escapeHtml(value || '');
            }
            
            return `<td>${value}</td>`;
        }).join('');

        return `<tr data-id="${item.id}">${cells}</tr>`;
    },

    /**
     * Formats a value based on format type
     */
    formatValue(value, format) {
        switch (format) {
            case 'date':
                return Helpers.formatDate(value);
            case 'datetime':
                return Helpers.formatDateTime(value);
            case 'timeago':
                return Helpers.timeAgo(value);
            case 'status':
                return `<span class="${Helpers.getStatusClass(value)}">${Helpers.formatStatus(value)}</span>`;
            case 'priority':
                return `<span class="${Helpers.getPriorityClass(value)}">${Helpers.capitalize(value)}</span>`;
            case 'boolean':
                return value ? 
                    '<span class="badge badge-success">Yes</span>' : 
                    '<span class="badge badge-secondary">No</span>';
            case 'active':
                return value ? 
                    '<span class="badge badge-success">Active</span>' : 
                    '<span class="badge badge-secondary">Inactive</span>';
            default:
                return Helpers.escapeHtml(value || '');
        }
    },

    /**
     * Creates action buttons for a row
     */
    createActions(actions) {
        const container = document.createElement('div');
        container.className = 'table-actions';

        for (const action of actions) {
            if (action.show === false) continue;
            
            const btn = document.createElement('button');
            btn.className = `btn-icon ${action.className || ''}`;
            btn.title = action.title || '';
            btn.innerHTML = action.icon;
            
            if (action.onClick) {
                btn.addEventListener('click', action.onClick);
            }
            
            container.appendChild(btn);
        }

        return container.outerHTML;
    },

    /**
     * Creates a user cell with avatar
     */
    createUserCell(firstName, lastName, username) {
        const initials = Helpers.getInitials(firstName, lastName);
        const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
        
        return `
            <div class="user-cell">
                <div class="avatar">${Helpers.escapeHtml(initials)}</div>
                <div class="user-info">
                    <span class="name">${Helpers.escapeHtml(fullName)}</span>
                    ${username ? `<span class="username">@${Helpers.escapeHtml(username)}</span>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Creates a score display
     */
    createScoreDisplay(score, passing = 80) {
        const passed = score >= passing;
        const className = passed ? 'score-pass' : 'score-fail';
        return `<span class="score-display ${className}">${score}%</span>`;
    },

    /**
     * Adds click handlers to table rows
     */
    addRowClickHandler(tbody, onClick) {
        tbody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row && row.dataset.id) {
                // Don't trigger if clicking on an action button
                if (e.target.closest('.table-actions') || e.target.closest('button')) {
                    return;
                }
                onClick(row.dataset.id);
            }
        });
    },

    /**
     * Sorts data by a column
     */
    sortData(data, column, direction = 'asc') {
        return [...data].sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle null/undefined
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';

            // Handle dates
            if (column.includes('date') || column.includes('At')) {
                aVal = new Date(aVal).getTime() || 0;
                bVal = new Date(bVal).getTime() || 0;
            }

            // Handle numbers
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // Handle strings
            const comparison = String(aVal).localeCompare(String(bVal));
            return direction === 'asc' ? comparison : -comparison;
        });
    },

    /**
     * Filters data by a search query
     */
    filterData(data, query, searchFields) {
        if (!query) return data;
        
        const lowerQuery = query.toLowerCase();
        return data.filter(item => {
            return searchFields.some(field => {
                const value = item[field];
                if (value == null) return false;
                return String(value).toLowerCase().includes(lowerQuery);
            });
        });
    }
};

// Export for use in other modules
window.Table = Table;
