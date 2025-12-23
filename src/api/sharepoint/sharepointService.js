/**
 * SharePoint API Service
 * Provides integration with Microsoft SharePoint Online
 * 
 * Features:
 * - OAuth 2.0 authentication with client credentials
 * - List operations (CRUD)
 * - Document library operations (upload/download)
 * - Site and subsites access
 * - Search functionality
 */

const axios = require('axios');

class SharePointService {
    constructor() {
        this.baseUrl = null;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.config = {
            siteUrl: '',
            tenantId: '',
            clientId: '',
            clientSecret: '',
            resource: ''
        };
        this.isConnected = false;
    }

    /**
     * Configures the SharePoint connection
     * @param {Object} config - Configuration object
     */
    configure(config) {
        this.config = {
            siteUrl: config.siteUrl,
            tenantId: config.tenantId,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            resource: config.siteUrl ? new URL(config.siteUrl).origin : ''
        };
        this.baseUrl = config.siteUrl;
    }

    /**
     * Authenticates with SharePoint using client credentials
     * @returns {Promise<boolean>} Success status
     */
    async authenticate() {
        try {
            const tokenUrl = `https://accounts.accesscontrol.windows.net/${this.config.tenantId}/tokens/OAuth/2`;
            
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', `${this.config.clientId}@${this.config.tenantId}`);
            params.append('client_secret', this.config.clientSecret);
            params.append('resource', `${this.config.resource}@${this.config.tenantId}`);

            const response = await axios.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.accessToken = response.data.access_token;
            this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
            this.isConnected = true;

            return true;
        } catch (error) {
            console.error('SharePoint authentication failed:', error.message);
            this.isConnected = false;
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Ensures valid authentication before making requests
     */
    async ensureAuthenticated() {
        if (!this.accessToken || new Date() >= this.tokenExpiry) {
            await this.authenticate();
        }
    }

    /**
     * Gets request headers with authentication
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json;odata=verbose',
            'Content-Type': 'application/json;odata=verbose'
        };
    }

    /**
     * Connects to SharePoint with the provided configuration
     * @param {Object} config - SharePoint configuration
     */
    async connect(config) {
        this.configure(config);
        await this.authenticate();
        return { success: true, message: 'Connected to SharePoint' };
    }

    /**
     * Disconnects from SharePoint
     */
    disconnect() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.isConnected = false;
        return { success: true, message: 'Disconnected from SharePoint' };
    }

    /**
     * Gets the current connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            siteUrl: this.config.siteUrl,
            tokenValid: this.tokenExpiry ? new Date() < this.tokenExpiry : false
        };
    }

    // ============================================
    // LIST OPERATIONS
    // ============================================

    /**
     * Gets all lists from the site
     * @returns {Promise<Array>} List of SharePoint lists
     */
    async getLists() {
        await this.ensureAuthenticated();

        try {
            const url = `${this.baseUrl}/_api/web/lists?$filter=Hidden eq false`;
            const response = await axios.get(url, { headers: this.getHeaders() });
            
            return response.data.d.results.map(list => ({
                id: list.Id,
                title: list.Title,
                description: list.Description,
                itemCount: list.ItemCount,
                created: list.Created,
                lastModified: list.LastItemModifiedDate,
                baseTemplate: list.BaseTemplate
            }));
        } catch (error) {
            throw new Error(`Failed to get lists: ${error.message}`);
        }
    }

    /**
     * Gets items from a specific list
     * @param {string} listName - Name of the list
     * @param {Object} options - Query options (top, filter, orderBy)
     */
    async getListItems(listName, options = {}) {
        await this.ensureAuthenticated();

        try {
            let url = `${this.baseUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')/items`;
            
            const queryParams = [];
            if (options.top) queryParams.push(`$top=${options.top}`);
            if (options.filter) queryParams.push(`$filter=${encodeURIComponent(options.filter)}`);
            if (options.orderBy) queryParams.push(`$orderby=${encodeURIComponent(options.orderBy)}`);
            if (options.select) queryParams.push(`$select=${options.select}`);
            
            if (queryParams.length > 0) {
                url += '?' + queryParams.join('&');
            }

            const response = await axios.get(url, { headers: this.getHeaders() });
            
            return response.data.d.results.map(item => ({
                id: item.Id,
                title: item.Title,
                created: item.Created,
                modified: item.Modified,
                authorId: item.AuthorId,
                editorId: item.EditorId,
                ...this.extractCustomFields(item)
            }));
        } catch (error) {
            throw new Error(`Failed to get list items: ${error.message}`);
        }
    }

    /**
     * Creates a new item in a list
     * @param {string} listName - Name of the list
     * @param {Object} data - Item data
     */
    async createListItem(listName, data) {
        await this.ensureAuthenticated();

        try {
            // Get list item entity type
            const listUrl = `${this.baseUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')`;
            const listResponse = await axios.get(listUrl, { headers: this.getHeaders() });
            const entityType = listResponse.data.d.ListItemEntityTypeFullName;

            const url = `${this.baseUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')/items`;
            
            const itemData = {
                '__metadata': { 'type': entityType },
                ...data
            };

            const response = await axios.post(url, itemData, { headers: this.getHeaders() });
            
            return {
                success: true,
                id: response.data.d.Id,
                item: response.data.d
            };
        } catch (error) {
            throw new Error(`Failed to create list item: ${error.message}`);
        }
    }

    /**
     * Updates an existing list item
     * @param {string} listName - Name of the list
     * @param {number} itemId - Item ID
     * @param {Object} data - Updated data
     */
    async updateListItem(listName, itemId, data) {
        await this.ensureAuthenticated();

        try {
            // Get list item entity type
            const listUrl = `${this.baseUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')`;
            const listResponse = await axios.get(listUrl, { headers: this.getHeaders() });
            const entityType = listResponse.data.d.ListItemEntityTypeFullName;

            const url = `${this.baseUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')/items(${itemId})`;
            
            const itemData = {
                '__metadata': { 'type': entityType },
                ...data
            };

            await axios.post(url, itemData, {
                headers: {
                    ...this.getHeaders(),
                    'IF-MATCH': '*',
                    'X-HTTP-Method': 'MERGE'
                }
            });
            
            return { success: true, itemId };
        } catch (error) {
            throw new Error(`Failed to update list item: ${error.message}`);
        }
    }

    /**
     * Deletes a list item
     * @param {string} listName - Name of the list
     * @param {number} itemId - Item ID
     */
    async deleteListItem(listName, itemId) {
        await this.ensureAuthenticated();

        try {
            const url = `${this.baseUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listName)}')/items(${itemId})`;
            
            await axios.post(url, null, {
                headers: {
                    ...this.getHeaders(),
                    'IF-MATCH': '*',
                    'X-HTTP-Method': 'DELETE'
                }
            });
            
            return { success: true, itemId };
        } catch (error) {
            throw new Error(`Failed to delete list item: ${error.message}`);
        }
    }

    // ============================================
    // DOCUMENT LIBRARY OPERATIONS
    // ============================================

    /**
     * Uploads a document to a library
     * @param {string} libraryName - Name of the document library
     * @param {string} fileName - Name of the file
     * @param {Buffer} fileContent - File content as buffer
     */
    async uploadDocument(libraryName, fileName, fileContent) {
        await this.ensureAuthenticated();

        try {
            const url = `${this.baseUrl}/_api/web/getfolderbyserverrelativeurl('${libraryName}')/files/add(url='${encodeURIComponent(fileName)}',overwrite=true)`;
            
            const response = await axios.post(url, fileContent, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/json;odata=verbose',
                    'Content-Type': 'application/octet-stream'
                }
            });
            
            return {
                success: true,
                fileName: response.data.d.Name,
                serverRelativeUrl: response.data.d.ServerRelativeUrl,
                timeCreated: response.data.d.TimeCreated
            };
        } catch (error) {
            throw new Error(`Failed to upload document: ${error.message}`);
        }
    }

    /**
     * Downloads a document from a library
     * @param {string} libraryName - Name of the document library
     * @param {string} fileName - Name of the file
     */
    async downloadDocument(libraryName, fileName) {
        await this.ensureAuthenticated();

        try {
            const url = `${this.baseUrl}/_api/web/getfilebyserverrelativeurl('/${libraryName}/${fileName}')/$value`;
            
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                responseType: 'arraybuffer'
            });
            
            return {
                success: true,
                fileName,
                content: response.data,
                contentType: response.headers['content-type']
            };
        } catch (error) {
            throw new Error(`Failed to download document: ${error.message}`);
        }
    }

    /**
     * Gets files from a document library
     * @param {string} libraryName - Name of the document library
     */
    async getDocuments(libraryName) {
        await this.ensureAuthenticated();

        try {
            const url = `${this.baseUrl}/_api/web/getfolderbyserverrelativeurl('${libraryName}')/files`;
            
            const response = await axios.get(url, { headers: this.getHeaders() });
            
            return response.data.d.results.map(file => ({
                name: file.Name,
                serverRelativeUrl: file.ServerRelativeUrl,
                length: file.Length,
                timeCreated: file.TimeCreated,
                timeLastModified: file.TimeLastModified,
                checkOutType: file.CheckOutType
            }));
        } catch (error) {
            throw new Error(`Failed to get documents: ${error.message}`);
        }
    }

    // ============================================
    // SEARCH OPERATIONS
    // ============================================

    /**
     * Searches SharePoint content
     * @param {string} query - Search query
     * @param {Object} options - Search options
     */
    async search(query, options = {}) {
        await this.ensureAuthenticated();

        try {
            const url = `${this.baseUrl}/_api/search/query?querytext='${encodeURIComponent(query)}'`;
            
            const response = await axios.get(url, { headers: this.getHeaders() });
            
            const results = response.data.d.query.PrimaryQueryResult?.RelevantResults?.Table?.Rows?.results || [];
            
            return results.map(row => {
                const cells = row.Cells.results;
                const item = {};
                cells.forEach(cell => {
                    item[cell.Key] = cell.Value;
                });
                return item;
            });
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    // ============================================
    // USER OPERATIONS
    // ============================================

    /**
     * Gets current user information
     */
    async getCurrentUser() {
        await this.ensureAuthenticated();

        try {
            const url = `${this.baseUrl}/_api/web/currentuser`;
            const response = await axios.get(url, { headers: this.getHeaders() });
            
            return {
                id: response.data.d.Id,
                loginName: response.data.d.LoginName,
                title: response.data.d.Title,
                email: response.data.d.Email,
                isSiteAdmin: response.data.d.IsSiteAdmin
            };
        } catch (error) {
            throw new Error(`Failed to get current user: ${error.message}`);
        }
    }

    /**
     * Gets site users
     */
    async getSiteUsers() {
        await this.ensureAuthenticated();

        try {
            const url = `${this.baseUrl}/_api/web/siteusers`;
            const response = await axios.get(url, { headers: this.getHeaders() });
            
            return response.data.d.results.map(user => ({
                id: user.Id,
                loginName: user.LoginName,
                title: user.Title,
                email: user.Email,
                isSiteAdmin: user.IsSiteAdmin
            }));
        } catch (error) {
            throw new Error(`Failed to get site users: ${error.message}`);
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Extracts custom fields from list item (excludes system fields)
     */
    extractCustomFields(item) {
        const systemFields = [
            'Id', 'Title', 'Created', 'Modified', 'AuthorId', 'EditorId',
            '__metadata', 'ContentTypeId', 'FileSystemObjectType', 'OData__UIVersionString',
            'Attachments', 'GUID', 'FirstUniqueAncestorSecurableObject', 'RoleAssignments',
            'AttachmentFiles', 'ContentType', 'GetDlpPolicyTip', 'FieldValuesAsHtml',
            'FieldValuesAsText', 'FieldValuesForEdit', 'File', 'Folder', 'LikedByInformation',
            'ParentList', 'Properties', 'Versions'
        ];

        const customFields = {};
        for (const key of Object.keys(item)) {
            if (!systemFields.includes(key) && !key.startsWith('OData_')) {
                customFields[key] = item[key];
            }
        }
        return customFields;
    }
}

// Create singleton instance
const sharepointService = new SharePointService();

module.exports = { sharepointService, SharePointService };
