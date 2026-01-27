/**
 * Modal Component
 * Handles Modal dialogs for forms and confirmations
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
    clearContentTimeout: null,


    /**
     * Modal Component Initialization
     */
    init() 
    {
        this.overlay = document.getElementById('modal-overlay');
        this.modal = document.getElementById('modal');
        this.titleEl = document.getElementById('modal-title');
        this.contentEl = document.getElementById('modal-content');
        this.footerEl = document.getElementById('modal-footer');
        this.closeBtn = document.getElementById('modal-close');


        // Event Listener - Close Button
        this.closeBtn.addEventListener('click', () => this.close());


        // Event Listener -> Click outside of Modal Window
        /* this.overlay.addEventListener('click', (e) => 
        {
            const modal = this.overlay.querySelector('#modal');
            if (!modal.contains(e.target)) {
              debug.log('outside click -> close');
              this.close();
            }

        }); */


        // Event Listener - Escape
        document.addEventListener('keydown', (e) => 
        {
            if (e.key === 'Escape' && this.isOpen) 
            {
                this.close();
            }
        });
    },


    
    /**
     * Opens the modal with content
     */
    open(options = {})
    {
        const 
        {
            title = 'Modal',
            content = null,   // DOM Node or null
            footer  = null,   // DOM Node or null
            size = 'default', // 'sm', 'default', 'lg'
            onClose = null
        } = options;


        if(!content) throw new TypeError('Modal needs useable Content to be provided')
        if(!footer) throw new TypeError('Modal needs useable Footer to be provided')

        // Cancel any pending content clear from previous modal close
        if (this.clearContentTimeout) {
            clearTimeout(this.clearContentTimeout);
            this.clearContentTimeout = null;
        }

        this.titleEl.textContent = title;
        

        SetContainerContent(this.contentEl, content)
        SetContainerContent(this.footerEl, footer)

        
        this.modal.classList.remove('modal-sm', 'modal-lg', 'modal-xl', 'modal-full');
        if (size === 'sm') this.modal.classList.add('modal-sm');
        else if (size === 'lg') this.modal.classList.add('modal-lg');
        else if (size === 'xl') this.modal.classList.add('modal-xl');
        else if (size === 'full') this.modal.classList.add('modal-full');
        // default -> no extra class


        // Store callback
        this.onCloseCallback = onClose;

        // Show modal
        this.overlay.classList.remove('hidden');
        this.isOpen = true;

        // Focus first input
        setTimeout(() => 
        {
            const firstInput = this.contentEl.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    },



    /**
     * Closes the modal
     */
    close() 
    {
        this.overlay.classList.add('hidden');
        this.isOpen = false;

        if (this.onCloseCallback)
        {
            this.onCloseCallback();
            this.onCloseCallback = null;
        }

        // Clear content after animation (but allow cancellation if reopened)
        this.clearContentTimeout = setTimeout(() => 
        {
            // Only clear if modal is still closed
            if (!this.isOpen) {
                this.contentEl.innerHTML = '';
                this.footerEl.innerHTML = '';
            }
            this.clearContentTimeout = null;
        }, 250);
    },



    confirm(options = {}) 
    {
        return new Promise((resolve) => {
            let settled = false;
            const done = (val) => { if (settled) return; settled = true; resolve(val); };
    
            const {
                title = 'Confirm',
                message = 'Are you sure?',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                confirmClass = 'btn-danger'
            } = options;
    
            // Content as DOM node (no HTML parsing)
            const p = document.createElement('p');
            p.style.marginBottom = 'var(--space-md)';
            p.textContent = String(message); // safe text
    
            // Footer as DOM node
            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.gap = 'var(--space-sm)';
            footer.style.justifyContent = 'flex-end';
    
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.type = 'button';
            cancelBtn.textContent = cancelText;
            cancelBtn.addEventListener('click', () => {
                done(false);
                this.close();
            });
    
            const confirmBtn = document.createElement('button');
            confirmBtn.className = `btn ${confirmClass}`;
            confirmBtn.type = 'button';
            confirmBtn.textContent = confirmText;
            confirmBtn.addEventListener('click', () => {
                done(true);
                this.close();
            });
    
            footer.append(cancelBtn, confirmBtn);
    
            this.open({
                title,
                content: p,
                footer,
                size: 'sm',
                onClose: () => done(false)
            });
        });
    },
    
    form(options = {}) {
        return new Promise((resolve) => {
            let settled = false;
            const done = (val) => { if (settled) return; settled = true; resolve(val); };
    
            const {
                title = 'Form',
                fields = [],
                data = {},
                submitText = 'Save',
                cancelText = 'Cancel',
                validate = null,
                size = 'default'
            } = options;
    
            // Build form HTML (you already have buildFieldHtml)
            let formHtml = '<form id="modal-form" class="modal-form">';
            for (const field of fields) {
                formHtml += this.buildFieldHtml(field, data);
            }
            formHtml += '</form>';
    
            // Convert HTML -> DOM Node ONCE here (caller still doesn't pass markup)
            const tpl = document.createElement('template');
            tpl.innerHTML = formHtml.trim();
            const formEl = tpl.content.firstElementChild; // the <form>
    
            if (!formEl) {
                console.error('[Modal] Failed to build form DOM');
                done(null);
                return;
            }
    
            // Footer buttons (DOM)
            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.gap = 'var(--space-sm)';
            footer.style.justifyContent = 'flex-end';
    
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.type = 'button';
            cancelBtn.textContent = cancelText;
            cancelBtn.addEventListener('click', () => {
                done(null);
                this.close();
            });
    
            const submitBtn = document.createElement('button');
            submitBtn.className = 'btn btn-primary';
            submitBtn.type = 'button';
            submitBtn.id = 'modal-submit-btn';
            submitBtn.textContent = submitText;
    
            footer.append(cancelBtn, submitBtn);
    
            this.open({
                title,
                content: formEl,   // <-- DOM node now
                footer,
                size,
                onClose: () => done(null)
            });
    
            // After open(), the form is now in the DOM
            const form = document.getElementById('modal-form');
            if (!form) {
                console.error('[Modal] Form element not found');
                done(null);
                return;
            }

            // Setup event handlers for special field types
            this.setupFormEventHandlers(form);

            const handleSubmit = async () => {
                const formData = Helpers.getFormData(form);
    
                // Normalize checkboxes
                for (const field of fields) {
                    if (field.type === 'checkbox') {
                        if (formData[field.name] === undefined) formData[field.name] = false;
                        else formData[field.name] = (formData[field.name] === 'on' || formData[field.name] === true);
                    }
                }
    
                if (validate) {
                    const error = validate(formData);
                    if (error) {
                        Toast.error(error);
                        return;
                    }
                }
    
                // IMPORTANT: Resolve with formData BEFORE closing to prevent
                // onCloseCallback from resolving with null first
                done(formData);
                this.close();
            };
    
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handleSubmit();
            });
    
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleSubmit();
            });
    
            form.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    handleSubmit();
                }
            });
        });
    },
    
    alert(title, message) {
        return new Promise((resolve) => {
            let settled = false;
            const done = () => { if (settled) return; settled = true; resolve(); };
    
            // Content as DOM node (no HTML parsing)
            const p = document.createElement('p');
            p.textContent = String(message);
    
            const footer = document.createElement('div');
            footer.style.display = 'flex';
            footer.style.justifyContent = 'flex-end';
    
            const okBtn = document.createElement('button');
            okBtn.className = 'btn btn-primary';
            okBtn.type = 'button';
            okBtn.textContent = 'OK';
            okBtn.addEventListener('click', () => {
                this.close();
                done();
            });
    
            footer.appendChild(okBtn);
    
            this.open({
                title,
                content: p,
                footer,
                size: 'sm',
                onClose: () => done()
            });
        });
    },
    
    /**
     * Shows a modal with HTML content and custom buttons
     * This is a convenience method for showing modals with button configurations
     * Used by Quality System and other views
     */
    show(options = {}) {
        const {
            title = 'Modal',
            content = '',    // HTML string or DOM node
            size = 'default', // 'small', 'medium', 'large', 'full'
            buttons = [],     // Array of { text, className, action, permission }
            onClose = null
        } = options;
        
        // Convert size names
        let modalSize = size;
        if (size === 'small') modalSize = 'sm';
        if (size === 'medium') modalSize = 'default';
        if (size === 'large') modalSize = 'lg';
        
        // Build content as DOM node
        let contentNode;
        if (typeof content === 'string') {
            const template = document.createElement('template');
            template.innerHTML = content.trim();
            contentNode = template.content.cloneNode(true);
            // Wrap in a div if it's a fragment with multiple children
            if (contentNode.childNodes.length > 1 || contentNode.firstChild?.nodeType === Node.TEXT_NODE) {
                const wrapper = document.createElement('div');
                wrapper.appendChild(contentNode);
                contentNode = wrapper;
            } else {
                contentNode = contentNode.firstElementChild || document.createElement('div');
            }
        } else if (content instanceof Node) {
            contentNode = content;
        } else {
            contentNode = document.createElement('div');
        }
        
        // Build footer with buttons
        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.gap = 'var(--space-sm)';
        footer.style.justifyContent = 'flex-end';
        
        for (const btn of buttons) {
            // Check permission if specified
            if (btn.permission && typeof Permissions !== 'undefined' && !Permissions.hasPermission(btn.permission)) {
                continue;
            }
            
            const button = document.createElement('button');
            button.className = `btn ${btn.className || 'btn-secondary'}`;
            button.type = 'button';
            button.textContent = btn.text || 'Button';
            
            if (btn.action === 'close') {
                button.addEventListener('click', () => this.close());
            } else if (typeof btn.action === 'function') {
                button.addEventListener('click', () => btn.action());
            }
            
            footer.appendChild(button);
        }
        
        // If no buttons, add a close button
        if (footer.childNodes.length === 0) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-secondary';
            closeBtn.type = 'button';
            closeBtn.textContent = 'Schließen';
            closeBtn.addEventListener('click', () => this.close());
            footer.appendChild(closeBtn);
        }
        
        this.open({
            title,
            content: contentNode,
            footer,
            size: modalSize,
            onClose
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

            case 'range':
                // Slider with min/max/value display
                html += `<div class="form-range-wrapper">
                    <input 
                        type="range" 
                        id="${name}" 
                        name="${name}" 
                        class="form-range"
                        value="${Helpers.escapeHtml(String(value || min || 0))}"
                        ${min !== undefined ? `min="${min}"` : 'min="0"'}
                        ${max !== undefined ? `max="${max}"` : 'max="100"'}
                        ${step !== undefined ? `step="${step}"` : ''}
                    >
                    <span class="form-range-value">${value || min || 0}</span>
                </div>`;
                break;

            case 'radio':
                html += `<div class="form-radio-group">`;
                for (const opt of options) {
                    const optValue = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    const checked = optValue === value ? 'checked' : '';
                    html += `
                        <label class="form-radio">
                            <input type="radio" name="${name}" value="${optValue}" ${checked}>
                            <span>${Helpers.escapeHtml(optLabel)}</span>
                        </label>`;
                }
                html += `</div>`;
                break;

            case 'scale':
                // Visual scale selector (1-N buttons)
                const scaleMax = max || 5;
                const scaleInverted = field.inverted || false;
                html += `<div class="form-scale" data-inverted="${scaleInverted}">`;
                for (let i = 1; i <= scaleMax; i++) {
                    const selected = parseInt(value) === i ? 'selected' : '';
                    const label = scaleInverted ? (scaleMax - i + 1) : i;
                    html += `<button type="button" class="scale-btn ${selected}" data-value="${i}">${label}</button>`;
                }
                html += `<input type="hidden" name="${name}" value="${value || ''}">`;
                html += `</div>`;
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
     * Sets up event handlers for dynamic form elements
     * Called after form is inserted into DOM
     */
    setupFormEventHandlers(formEl) {
        // Range slider value display
        formEl.querySelectorAll('.form-range').forEach(range => {
            const display = range.parentElement.querySelector('.form-range-value');
            if (display) {
                range.addEventListener('input', () => {
                    display.textContent = range.value;
                });
            }
        });

        // Scale selector buttons
        formEl.querySelectorAll('.form-scale').forEach(scaleContainer => {
            const hiddenInput = scaleContainer.querySelector('input[type="hidden"]');
            const buttons = scaleContainer.querySelectorAll('.scale-btn');
            
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove selected from all
                    buttons.forEach(b => b.classList.remove('selected'));
                    // Add to clicked
                    btn.classList.add('selected');
                    // Update hidden input
                    if (hiddenInput) {
                        hiddenInput.value = btn.dataset.value;
                    }
                });
            });
        });
    },

    /**
     * Helper: Creates common field configurations
     * Reduces repetitive field definition code
     */
    fieldConfig: {
        text(name, label, opts = {}) {
            return { name, label, type: 'text', ...opts };
        },
        
        email(name, label, opts = {}) {
            return { name, label, type: 'email', required: true, ...opts };
        },
        
        password(name, label, opts = {}) {
            return { name, label, type: 'password', ...opts };
        },
        
        number(name, label, opts = {}) {
            return { name, label, type: 'number', ...opts };
        },
        
        select(name, label, options, opts = {}) {
            return { name, label, type: 'select', options, ...opts };
        },
        
        textarea(name, label, opts = {}) {
            return { name, label, type: 'textarea', rows: 3, ...opts };
        },
        
        checkbox(name, label, opts = {}) {
            return { name, label, type: 'checkbox', ...opts };
        },
        
        date(name, label, opts = {}) {
            return { name, label, type: 'date', ...opts };
        },
        
        range(name, label, min, max, opts = {}) {
            return { name, label, type: 'range', min, max, ...opts };
        },
        
        scale(name, label, max = 5, opts = {}) {
            return { name, label, type: 'scale', max, ...opts };
        },
        
        radio(name, label, options, opts = {}) {
            return { name, label, type: 'radio', options, ...opts };
        }
    }
};



function SetContainerContent(container, content)
{
    container.replaceChildren();

    if (!(typeof content === 'object' && typeof content.nodeType === 'number'))
    {
        throw new TypeError('Modal content must be a DOM Node (Element/Fragment/Text) or null.');
    }

    container.append(content);
}



// Export for use in other modules
window.Modal = Modal;
