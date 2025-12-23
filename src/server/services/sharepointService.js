/**
 * SharePoint Service
 * Handles integration with Microsoft SharePoint Online
 * Uses OAuth 2.0 client credentials flow
 */

const axios = require('axios');

class SharePointService {
    constructor() {
        this.config = null;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.isConnected = false;
    }

    /**
     * Connects to SharePoint with the provided configuration
     */
    async connect(config) {
        const { siteUrl, tenantId, clientId, clientSecret } = config;

        if (!siteUrl || !tenantId || !clientId || !clientSecret) {
            throw new Error('Missing required SharePoint configuration');
        }

        this.config = {
            siteUrl: siteUrl.replace(/\/$/, ''), // Remove trailing slash
            tenantId,
            clientId,
            clientSecret,
            resource: `${siteUrl.replace(/\/$/, '')}/.default`
        };

        // Get access token
        await this.authenticate();
        this.isConnected = true;

        return { success: true, siteUrl: this.config.siteUrl };
    }

    /**
     * Disconnects from SharePoint
     */
    disconnect() {
        this.config = null;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.isConnected = false;
        return { success: true };
    }

    /**
     * Gets the connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            siteUrl: this.config?.siteUrl || null
        };
    }

    /**
     * Authenticates with Azure AD to get access token
     */
    async authenticate() {
        const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', this.config.clientId);
        params.append('client_secret', this.config.clientSecret);
        params.append('scope', `https://graph.microsoft.com/.default`);

        try {
            const response = await axios.post(tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            return true;
        } catch (error) {
            console.error('SharePoint authentication failed:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with SharePoint');
        }
    }

    /**
     * Ensures we have a valid access token
     */
    async ensureAuthenticated() {
        if (!this.isConnected) {
            throw new Error('Not connected to SharePoint');
        }

        // Refresh token if expired or about to expire (5 min buffer)
        if (!this.accessToken || Date.now() >= this.tokenExpiry - 300000) {
            await this.authenticate();
        }
    }

    /**
     * Makes an authenticated request to SharePoint
     */
    async request(method, endpoint, data = null) {
        await this.ensureAuthenticated();

        const url = endpoint.startsWith('http') 
            ? endpoint 
            : `${this.config.siteUrl}/_api${endpoint}`;

        const config = {
            method,
            url,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json;odata=verbose',
                'Content-Type': 'application/json;odata=verbose'
            }
        };

        if (data) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error('SharePoint request failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message?.value || 'SharePoint request failed');
        }
    }

    /**
     * Gets all lists from the SharePoint site
     */
    async getLists() {
        const response = await this.request('GET', '/web/lists');
        return response.d.results.map(list => ({
            id: list.Id,
            title: list.Title,
            description: list.Description,
            itemCount: list.ItemCount,
            created: list.Created,
            lastModified: list.LastItemModifiedDate
        }));
    }

    /**
     * Gets items from a specific list
     */
    async getListItems(listTitle, options = {}) {
        const { top = 100, skip = 0, filter = '', select = '*', orderBy = '' } = options;

        let endpoint = `/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items?$top=${top}&$skip=${skip}`;
        if (filter) endpoint += `&$filter=${encodeURIComponent(filter)}`;
        if (select !== '*') endpoint += `&$select=${select}`;
        if (orderBy) endpoint += `&$orderby=${orderBy}`;

        const response = await this.request('GET', endpoint);
        return response.d.results;
    }

    /**
     * Creates a new item in a list
     */
    async createListItem(listTitle, itemData) {
        // Get list item entity type
        const listInfo = await this.request('GET', `/web/lists/getbytitle('${encodeURIComponent(listTitle)}')?$select=ListItemEntityTypeFullName`);
        const entityType = listInfo.d.ListItemEntityTypeFullName;

        const data = {
            __metadata: { type: entityType },
            ...itemData
        };

        const response = await this.request('POST', `/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items`, data);
        return response.d;
    }

    /**
     * Updates an existing list item
     */
    async updateListItem(listTitle, itemId, itemData) {
        const listInfo = await this.request('GET', `/web/lists/getbytitle('${encodeURIComponent(listTitle)}')?$select=ListItemEntityTypeFullName`);
        const entityType = listInfo.d.ListItemEntityTypeFullName;

        const data = {
            __metadata: { type: entityType },
            ...itemData
        };

        await this.ensureAuthenticated();

        const url = `${this.config.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items(${itemId})`;

        await axios({
            method: 'POST',
            url,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json;odata=verbose',
                'Content-Type': 'application/json;odata=verbose',
                'IF-MATCH': '*',
                'X-HTTP-Method': 'MERGE'
            },
            data
        });

        return { success: true, itemId };
    }

    /**
     * Deletes a list item
     */
    async deleteListItem(listTitle, itemId) {
        await this.ensureAuthenticated();

        const url = `${this.config.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items(${itemId})`;

        await axios({
            method: 'POST',
            url,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json;odata=verbose',
                'IF-MATCH': '*',
                'X-HTTP-Method': 'DELETE'
            }
        });

        return { success: true };
    }

    /**
     * Uploads a document to a document library
     */
    async uploadDocument(libraryName, fileName, fileBuffer) {
        await this.ensureAuthenticated();

        const url = `${this.config.siteUrl}/_api/web/getfolderbyserverrelativeurl('${libraryName}')/files/add(url='${fileName}',overwrite=true)`;

        const response = await axios({
            method: 'POST',
            url,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json;odata=verbose',
                'Content-Type': 'application/octet-stream'
            },
            data: fileBuffer
        });

        return {
            success: true,
            fileName: response.data.d.Name,
            serverRelativeUrl: response.data.d.ServerRelativeUrl
        };
    }

    /**
     * Downloads a document from a document library
     */
    async downloadDocument(serverRelativeUrl) {
        await this.ensureAuthenticated();

        const url = `${this.config.siteUrl}/_api/web/getfilebyserverrelativeurl('${serverRelativeUrl}')/$value`;

        const response = await axios({
            method: 'GET',
            url,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            },
            responseType: 'arraybuffer'
        });

        return response.data;
    }

    /**
     * Searches SharePoint content
     */
    async search(queryText, options = {}) {
        const { rowLimit = 50, startRow = 0, selectProperties = [] } = options;

        const searchQuery = {
            request: {
                Querytext: queryText,
                RowLimit: rowLimit,
                StartRow: startRow,
                SelectProperties: {
                    results: selectProperties.length > 0 
                        ? selectProperties 
                        : ['Title', 'Path', 'Author', 'LastModifiedTime', 'Size']
                }
            }
        };

        const response = await this.request('POST', '/search/postquery', searchQuery);

        const results = response.d.postquery.PrimaryQueryResult.RelevantResults.Table.Rows.results;

        return results.map(row => {
            const item = {};
            row.Cells.results.forEach(cell => {
                item[cell.Key] = cell.Value;
            });
            return item;
        });
    }
}

// Export singleton instance
module.exports = new SharePointService();
