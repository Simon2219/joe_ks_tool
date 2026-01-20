/**
 * Template Loader Utility
 * Handles dynamic loading and caching of view templates
 */

const TemplateLoader = {
    // Cache loaded templates
    cache: new Map(),

    // Base path for templates
    basePath: 'templates',

    /**
     * Loads a template from file
     * @param {string} name - Template name (e.g., 'dashboard', 'users')
     * @returns {Promise<string>} The template HTML content
     */
    async load(name) {
        // Return from cache if available
        if (this.cache.has(name)) {
            return this.cache.get(name);
        }

        try {
            const response = await fetch(`${this.basePath}/${name}.html`);
            
            if (!response.ok) {
                throw new Error(`Failed to load template: ${name} (${response.status})`);
            }

            const html = await response.text();
            
            // Cache the template
            this.cache.set(name, html);
            
            return html;
        } catch (error) {
            console.error(`Template load error for '${name}':`, error);
            throw error;
        }
    },

    /**
     * Loads and renders a template into a container
     * @param {string} name - Template name
     * @param {HTMLElement} container - Container element
     * @returns {Promise<HTMLElement>} The rendered element
     */
    async render(name, container) {
        const html = await this.load(name);
        
        // Create a temporary container to parse the HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Get the actual view element
        const viewElement = temp.firstElementChild;
        
        // Clear container and append new content
        container.innerHTML = '';
        container.appendChild(viewElement);
        
        return viewElement;
    },

    /**
     * Preloads multiple templates
     * @param {string[]} names - Array of template names to preload
     */
    async preload(names) {
        const promises = names.map(name => this.load(name).catch(err => {
            console.warn(`Failed to preload template '${name}':`, err);
            return null;
        }));
        
        await Promise.all(promises);
    },

    /**
     * Clears the template cache
     */
    clearCache() {
        this.cache.clear();
    },

    /**
     * Removes a specific template from cache
     * @param {string} name - Template name to remove
     */
    invalidate(name) {
        this.cache.delete(name);
    }
};

// Export for use in other modules
window.TemplateLoader = TemplateLoader;
