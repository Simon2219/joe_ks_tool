/**
 * Helper Utilities
 * Common utility functions used throughout the application
 */

const Helpers = {
    /**
     * Formats a date string to a readable format
     */
    formatDate(dateString, options = {}) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        };
        
        return date.toLocaleDateString('en-US', defaultOptions);
    },

    /**
     * Formats a date string to include time
     */
    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Returns relative time string (e.g., "2 hours ago")
     */
    timeAgo(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }
        
        return 'Just now';
    },

    /**
     * Gets initials from a name
     */
    getInitials(firstName, lastName) {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return first + last || '??';
    },

    /**
     * Capitalizes first letter of each word
     */
    capitalize(str) {
        if (!str) return '';
        return str.replace(/\b\w/g, char => char.toUpperCase());
    },

    /**
     * Converts underscore/hyphen to readable format
     */
    formatStatus(status) {
        if (!status) return '';
        return status.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    },

    /**
     * Truncates text to specified length
     */
    truncate(text, length = 50) {
        if (!text || text.length <= length) return text;
        return text.substring(0, length) + '...';
    },

    /**
     * Debounces a function call
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Escapes HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Creates an element with attributes and children
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                for (const [dataKey, dataValue] of Object.entries(value)) {
                    element.dataset[dataKey] = dataValue;
                }
            } else if (key.startsWith('on')) {
                const event = key.substring(2).toLowerCase();
                element.addEventListener(event, value);
            } else {
                element.setAttribute(key, value);
            }
        }
        
        for (const child of children) {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child) {
                element.appendChild(child);
            }
        }
        
        return element;
    },

    /**
     * Gets form data as an object
     */
    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            // Handle arrays (multiple values with same name)
            if (data[key]) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }
        
        return data;
    },

    /**
     * Shows/hides an element
     */
    toggleElement(element, show) {
        if (typeof show === 'boolean') {
            element.classList.toggle('hidden', !show);
        } else {
            element.classList.toggle('hidden');
        }
    },

    /**
     * Generates a random color based on string
     */
    stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = hash % 360;
        return `hsl(${hue}, 65%, 50%)`;
    },

    /**
     * Downloads data as a file
     */
    downloadFile(data, filename, mimeType = 'text/plain') {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Validates email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Formats number with separators
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return num.toLocaleString();
    },

    /**
     * Gets priority badge class
     */
    getPriorityClass(priority) {
        return `badge priority-${priority}`;
    },

    /**
     * Gets status badge class
     */
    getStatusClass(status) {
        return `badge status-${status.replace('_', '-')}`;
    },

    /**
     * Creates SVG icon element
     */
    createIcon(iconName) {
        const icons = {
            edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
            delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
            view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
            plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
            check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
            user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
            ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
            quality: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        };
        
        const span = document.createElement('span');
        span.className = 'icon';
        span.innerHTML = icons[iconName] || '';
        return span;
    },

    /**
     * Shows a dropdown menu near an element
     * @param {HTMLElement} anchorEl - Element to position the dropdown near
     * @param {Array} items - Menu items [{label, icon, action, danger}]
     * @returns {Function} - Function to close the dropdown
     */
    showDropdownMenu(anchorEl, items) {
        // Remove any existing dropdown
        const existingDropdown = document.querySelector('.dropdown-menu');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-menu';
        
        items.forEach(item => {
            if (item.divider) {
                const divider = document.createElement('div');
                divider.className = 'dropdown-menu-divider';
                dropdown.appendChild(divider);
                return;
            }

            const btn = document.createElement('button');
            btn.className = `dropdown-menu-item${item.danger ? ' danger' : ''}`;
            btn.innerHTML = `
                ${item.icon || ''}
                <span>${item.label}</span>
            `;
            btn.addEventListener('click', () => {
                closeDropdown();
                if (item.action) item.action();
            });
            dropdown.appendChild(btn);
        });

        document.body.appendChild(dropdown);

        // Position dropdown
        const rect = anchorEl.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left}px`;

        // Adjust if off screen
        setTimeout(() => {
            const dropdownRect = dropdown.getBoundingClientRect();
            if (dropdownRect.right > window.innerWidth) {
                dropdown.style.left = `${rect.right - dropdownRect.width}px`;
            }
            if (dropdownRect.bottom > window.innerHeight) {
                dropdown.style.top = `${rect.top - dropdownRect.height - 4}px`;
            }
        }, 0);

        // Show dropdown with animation
        requestAnimationFrame(() => {
            dropdown.classList.add('show');
        });

        // Close on click outside
        const closeDropdown = () => {
            dropdown.classList.remove('show');
            setTimeout(() => dropdown.remove(), 150);
            document.removeEventListener('click', handleOutsideClick);
        };

        const handleOutsideClick = (e) => {
            if (!dropdown.contains(e.target) && e.target !== anchorEl) {
                closeDropdown();
            }
        };

        // Delay attaching click listener to avoid immediate close
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 0);

        return closeDropdown;
    },

    /**
     * Shows a reusable move dialog for moving items between categories
     * @param {Object} options - Dialog options
     * @param {string} options.title - Dialog title
     * @param {string} options.itemLabel - Label for the item (e.g., "Test", "Frage")
     * @param {string} options.itemName - Name of the item being moved
     * @param {string} options.currentCategoryName - Current category name
     * @param {Array} options.categories - Available categories [{id, name}]
     * @param {string} options.currentCategoryId - Current category ID
     * @param {Function} options.onSubmit - Callback with new category ID
     */
    async showMoveDialog(options) {
        const {
            title = 'Verschieben',
            itemLabel = 'Element',
            itemName = '',
            currentCategoryName = 'Keine Kategorie',
            categories = [],
            currentCategoryId = null,
            onSubmit
        } = options;

        return new Promise((resolve) => {
            const formHtml = `
                <div class="move-dialog">
                    <div class="move-dialog-item">
                        <span class="move-dialog-label">${this.escapeHtml(itemLabel)}:</span>
                        <strong>${this.escapeHtml(itemName)}</strong>
                    </div>
                    <div class="move-dialog-content">
                        <div class="move-dialog-from">
                            <span class="move-dialog-label">Von:</span>
                            <div class="move-dialog-category">${this.escapeHtml(currentCategoryName)}</div>
                        </div>
                        <div class="move-dialog-arrow">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </div>
                        <div class="move-dialog-to">
                            <span class="move-dialog-label">Nach:</span>
                            <select id="move-dialog-select" class="form-select">
                                <option value="">Keine Kategorie</option>
                                ${categories.map(c => `
                                    <option value="${c.id}" ${c.id === currentCategoryId ? 'disabled' : ''}>
                                        ${this.escapeHtml(c.name)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
            `;

            const template = document.createElement('template');
            template.innerHTML = formHtml.trim();
            const content = template.content.firstElementChild;

            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.gap = 'var(--space-sm)';
            footer.style.justifyContent = 'flex-end';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = 'Abbrechen';
            cancelBtn.addEventListener('click', () => {
                Modal.close();
                resolve(null);
            });

            const submitBtn = document.createElement('button');
            submitBtn.className = 'btn btn-primary';
            submitBtn.textContent = 'Verschieben';
            submitBtn.addEventListener('click', async () => {
                const newCategoryId = document.getElementById('move-dialog-select')?.value || null;
                Modal.close();
                if (onSubmit) {
                    await onSubmit(newCategoryId);
                }
                resolve(newCategoryId);
            });

            footer.appendChild(cancelBtn);
            footer.appendChild(submitBtn);

            Modal.open({
                title,
                content,
                footer,
                size: 'default'
            });
        });
    }
};

// Export for use in other modules
window.Helpers = Helpers;
