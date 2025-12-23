/**
 * Modal Component
 * Handles modal dialogs for forms and confirmations
 */

const Modal = {
    overlay: null,
    modal: null,
    titleEl: null,
    contentEl: null,
    footerEl: null,
    closeBtn: null,
    isOpen: false,
    onCloseCallback: null,

    /**
     * Initializes the modal component
     */
    init() {
        this.overlay = document.getElementById('modal-overlay');
        this.modal = document.getElementById('modal');
        this.titleEl = document.getElementById('modal-title');
        this.contentEl = document.getElementById('modal-content');
        this.footerEl = document.getElementById('modal-footer');
        this.closeBtn = document.getElementById('modal-close');

        // Event listeners
        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },

    /**
     * Opens the modal with content
     */
    open(options = {}) {
        const {
            title = 'Modal',
            content = '',
            footer = '',
            size = 'default', // 'sm', 'default', 'lg'
            onClose = null
        } = options;

        this.titleEl.textContent = title;
        
        // Set content (can be HTML string or element)
        if (typeof content === 'string') {
            this.contentEl.innerHTML = content;
        } else {
            this.contentEl.innerHTML = '';
            this.contentEl.appendChild(content);
        }

        // Set footer
        if (typeof footer === 'string') {
            this.footerEl.innerHTML = footer;
        } else if (footer) {
            this.footerEl.innerHTML = '';
            this.footerEl.appendChild(footer);
        } else {
            this.footerEl.innerHTML = '';
        }

        // Set size class
        this.modal.className = 'modal';
        if (size === 'sm') this.modal.classList.add('modal-sm');
        if (size === 'lg') this.modal.classList.add('modal-lg');

        // Store callback
        this.onCloseCallback = onClose;

        // Show modal
        this.overlay.classList.remove('hidden');
        this.isOpen = true;

        // Focus first input
        setTimeout(() => {
            const firstInput = this.contentEl.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    },

    /**
     * Closes the modal
     */
    close() {
        this.overlay.classList.add('hidden');
        this.isOpen = false;

        if (this.onCloseCallback) {
            this.onCloseCallback();
            this.onCloseCallback = null;
        }

        // Clear content after animation
        setTimeout(() => {
            this.contentEl.innerHTML = '';
            this.footerEl.innerHTML = '';
        }, 250);
    },

    /**
     * Shows a confirmation dialog
     */
    confirm(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Confirm',
                message = 'Are you sure?',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                confirmClass = 'btn-danger'
            } = options;

            const content = `<p style="margin-bottom: var(--spacing-md);">${Helpers.escapeHtml(message)}</p>`;
            
            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.gap = 'var(--spacing-sm)';
            footer.style.justifyContent = 'flex-end';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = cancelText;
            cancelBtn.addEventListener('click', () => {
                this.close();
                resolve(false);
            });

            const confirmBtn = document.createElement('button');
            confirmBtn.className = `btn ${confirmClass}`;
            confirmBtn.textContent = confirmText;
            confirmBtn.addEventListener('click', () => {
                this.close();
                resolve(true);
            });

            footer.appendChild(cancelBtn);
            footer.appendChild(confirmBtn);

            this.open({
                title,
                content,
                footer,
                size: 'sm',
                onClose: () => resolve(false)
            });
        });
    },

    /**
     * Shows a form modal
     */
    form(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Form',
                fields = [],
                data = {},
                submitText = 'Save',
                cancelText = 'Cancel',
                validate = null,
                size = 'default'
            } = options;

            // Build form HTML
            let formHtml = '<form id="modal-form" class="modal-form">';
            
            for (const field of fields) {
                formHtml += this.buildFieldHtml(field, data);
            }
            
            formHtml += '</form>';

            // Footer buttons
            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.gap = 'var(--spacing-sm)';
            footer.style.justifyContent = 'flex-end';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = cancelText;
            cancelBtn.type = 'button';
            cancelBtn.addEventListener('click', () => {
                this.close();
                resolve(null);
            });

            const submitBtn = document.createElement('button');
            submitBtn.className = 'btn btn-primary';
            submitBtn.textContent = submitText;
            submitBtn.type = 'submit';
            submitBtn.form = 'modal-form';

            footer.appendChild(cancelBtn);
            footer.appendChild(submitBtn);

            this.open({
                title,
                content: formHtml,
                footer,
                size,
                onClose: () => resolve(null)
            });

            // Handle form submission
            const form = document.getElementById('modal-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = Helpers.getFormData(form);
                
                // Process checkboxes (unchecked ones aren't included in FormData)
                for (const field of fields) {
                    if (field.type === 'checkbox' && formData[field.name] === undefined) {
                        formData[field.name] = false;
                    } else if (field.type === 'checkbox') {
                        formData[field.name] = formData[field.name] === 'on' || formData[field.name] === true;
                    }
                }

                // Validate if function provided
                if (validate) {
                    const error = validate(formData);
                    if (error) {
                        Toast.error(error);
                        return;
                    }
                }

                this.close();
                resolve(formData);
            });
        });
    },

    /**
     * Builds HTML for a form field
     */
    buildFieldHtml(field, data = {}) {
        const {
            name,
            label,
            type = 'text',
            placeholder = '',
            required = false,
            options = [],
            rows = 3,
            min,
            max,
            step,
            readonly = false,
            hint = ''
        } = field;

        const value = data[name] !== undefined ? data[name] : (field.default || '');
        const requiredAttr = required ? 'required' : '';
        const readonlyAttr = readonly ? 'readonly' : '';
        let html = `<div class="form-group">`;
        
        if (label && type !== 'checkbox') {
            html += `<label for="${name}">${Helpers.escapeHtml(label)}${required ? ' *' : ''}</label>`;
        }

        switch (type) {
            case 'textarea':
                html += `<textarea 
                    id="${name}" 
                    name="${name}" 
                    class="form-textarea" 
                    placeholder="${Helpers.escapeHtml(placeholder)}"
                    rows="${rows}"
                    ${requiredAttr}
                    ${readonlyAttr}
                >${Helpers.escapeHtml(value)}</textarea>`;
                break;

            case 'select':
                html += `<select id="${name}" name="${name}" class="form-select" ${requiredAttr}>`;
                if (placeholder) {
                    html += `<option value="">${Helpers.escapeHtml(placeholder)}</option>`;
                }
                for (const opt of options) {
                    const optValue = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    const selected = optValue === value ? 'selected' : '';
                    html += `<option value="${optValue}" ${selected}>${Helpers.escapeHtml(optLabel)}</option>`;
                }
                html += `</select>`;
                break;

            case 'checkbox':
                const checked = value === true || value === 'true' || value === 1 ? 'checked' : '';
                html += `
                    <label class="form-checkbox">
                        <input type="checkbox" id="${name}" name="${name}" ${checked}>
                        <span>${Helpers.escapeHtml(label)}</span>
                    </label>`;
                break;

            case 'number':
                html += `<input 
                    type="number" 
                    id="${name}" 
                    name="${name}" 
                    class="form-input"
                    value="${Helpers.escapeHtml(String(value))}"
                    placeholder="${Helpers.escapeHtml(placeholder)}"
                    ${min !== undefined ? `min="${min}"` : ''}
                    ${max !== undefined ? `max="${max}"` : ''}
                    ${step !== undefined ? `step="${step}"` : ''}
                    ${requiredAttr}
                    ${readonlyAttr}
                >`;
                break;

            case 'date':
                html += `<input 
                    type="date" 
                    id="${name}" 
                    name="${name}" 
                    class="form-input"
                    value="${value ? value.split('T')[0] : ''}"
                    ${requiredAttr}
                    ${readonlyAttr}
                >`;
                break;

            case 'password':
                html += `<input 
                    type="password" 
                    id="${name}" 
                    name="${name}" 
                    class="form-input"
                    placeholder="${Helpers.escapeHtml(placeholder)}"
                    ${requiredAttr}
                >`;
                break;

            case 'email':
                html += `<input 
                    type="email" 
                    id="${name}" 
                    name="${name}" 
                    class="form-input"
                    value="${Helpers.escapeHtml(value)}"
                    placeholder="${Helpers.escapeHtml(placeholder)}"
                    ${requiredAttr}
                    ${readonlyAttr}
                >`;
                break;

            default:
                html += `<input 
                    type="${type}" 
                    id="${name}" 
                    name="${name}" 
                    class="form-input"
                    value="${Helpers.escapeHtml(value)}"
                    placeholder="${Helpers.escapeHtml(placeholder)}"
                    ${requiredAttr}
                    ${readonlyAttr}
                >`;
        }

        if (hint) {
            html += `<small class="form-hint" style="color: var(--text-muted); font-size: 0.75rem;">${Helpers.escapeHtml(hint)}</small>`;
        }

        html += `</div>`;
        return html;
    },

    /**
     * Shows an alert dialog
     */
    alert(title, message) {
        return new Promise((resolve) => {
            const content = `<p>${Helpers.escapeHtml(message)}</p>`;
            
            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.justifyContent = 'flex-end';

            const okBtn = document.createElement('button');
            okBtn.className = 'btn btn-primary';
            okBtn.textContent = 'OK';
            okBtn.addEventListener('click', () => {
                this.close();
                resolve();
            });

            footer.appendChild(okBtn);

            this.open({
                title,
                content,
                footer,
                size: 'sm',
                onClose: () => resolve()
            });
        });
    }
};

// Export for use in other modules
window.Modal = Modal;
