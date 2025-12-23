/**
 * Toast Component
 * Handles toast notifications
 */

const Toast = {
    container: null,
    defaultDuration: 4000,

    /**
     * Initializes the toast component
     */
    init() {
        this.container = document.getElementById('toast-container');
    },

    /**
     * Shows a toast notification
     */
    show(options = {}) {
        const {
            type = 'info',
            title = '',
            message = '',
            duration = this.defaultDuration
        } = options;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${Helpers.escapeHtml(title)}</div>` : ''}
                <div class="toast-message">${Helpers.escapeHtml(message)}</div>
            </div>
            <button class="toast-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        // Close button handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismiss(toast));

        // Add to container
        this.container.appendChild(toast);

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(toast);
            }, duration);
        }

        return toast;
    },

    /**
     * Dismisses a toast
     */
    dismiss(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.style.animation = 'slideOutRight 0.25s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 250);
    },

    /**
     * Shows a success toast
     */
    success(message, title = 'Success') {
        return this.show({ type: 'success', title, message });
    },

    /**
     * Shows an error toast
     */
    error(message, title = 'Error') {
        return this.show({ type: 'error', title, message, duration: 6000 });
    },

    /**
     * Shows a warning toast
     */
    warning(message, title = 'Warning') {
        return this.show({ type: 'warning', title, message });
    },

    /**
     * Shows an info toast
     */
    info(message, title = 'Info') {
        return this.show({ type: 'info', title, message });
    },

    /**
     * Clears all toasts
     */
    clearAll() {
        const toasts = this.container.querySelectorAll('.toast');
        toasts.forEach(toast => this.dismiss(toast));
    }
};

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Export for use in other modules
window.Toast = Toast;
