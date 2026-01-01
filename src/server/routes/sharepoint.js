/**
 * SharePoint Routes
 * API endpoints for Microsoft SharePoint integration
 */

const express = require('express');
const router = express.Router();

const sharepointService = require('../services/sharepointService');
const { IntegrationCredentialsModel } = require('../database');
const encryptionService = require('../services/encryptionService');
const { authenticate, requirePermission } = require('../middleware/auth');

// All SharePoint routes require authentication and integration permission
router.use(authenticate);
router.use(requirePermission('integration_sharepoint'));

/**
 * Helper to get decrypted credentials
 */
function getCredentials() {
    const record = IntegrationCredentialsModel.get('sharepoint');
    if (!record) return null;

    try {
        if (record.encrypted) {
            return encryptionService.decrypt(record.credentials);
        }
        return JSON.parse(record.credentials);
    } catch (error) {
        console.error('Failed to get SharePoint credentials:', error);
        return null;
    }
}

/**
 * POST /api/sharepoint/connect
 * Connects to SharePoint using stored or provided credentials
 */
router.post('/connect', async (req, res) => {
    try {
        // Use provided credentials or fall back to stored ones
        let config = req.body;
        if (!config.siteUrl || !config.tenantId || !config.clientId || !config.clientSecret) {
            config = getCredentials();
        }

        if (!config) {
            return res.status(400).json({ 
                success: false, 
                error: 'SharePoint is not configured. Please add credentials in Settings.' 
            });
        }

        const result = await sharepointService.connect(config);
        
        // Update connection status in database
        IntegrationCredentialsModel.setConnectionStatus('sharepoint', true);
        
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('SharePoint connect error:', error);
        IntegrationCredentialsModel.setConnectionStatus('sharepoint', false);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sharepoint/disconnect
 * Disconnects from SharePoint
 */
router.post('/disconnect', (req, res) => {
    try {
        sharepointService.disconnect();
        IntegrationCredentialsModel.setConnectionStatus('sharepoint', false);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sharepoint/status
 * Returns connection status
 */
router.get('/status', (req, res) => {
    const serviceStatus = sharepointService.getStatus();
    const hasCredentials = !!getCredentials();
    
    res.json({ 
        success: true, 
        ...serviceStatus,
        configured: hasCredentials
    });
});

/**
 * GET /api/sharepoint/lists
 * Returns all lists from SharePoint
 */
router.get('/lists', async (req, res) => {
    try {
        const lists = await sharepointService.getLists();
        res.json({ success: true, lists });
    } catch (error) {
        console.error('Get lists error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sharepoint/lists/:listTitle/items
 * Returns items from a specific list
 */
router.get('/lists/:listTitle/items', async (req, res) => {
    try {
        const { listTitle } = req.params;
        const options = {
            top: parseInt(req.query.top) || 100,
            skip: parseInt(req.query.skip) || 0,
            filter: req.query.filter || '',
            select: req.query.select || '*',
            orderBy: req.query.orderBy || ''
        };
        const items = await sharepointService.getListItems(listTitle, options);
        res.json({ success: true, items });
    } catch (error) {
        console.error('Get list items error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sharepoint/lists/:listTitle/items
 * Creates a new item in a list
 */
router.post('/lists/:listTitle/items', async (req, res) => {
    try {
        const { listTitle } = req.params;
        const item = await sharepointService.createListItem(listTitle, req.body);
        res.json({ success: true, item });
    } catch (error) {
        console.error('Create list item error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/sharepoint/lists/:listTitle/items/:itemId
 * Updates a list item
 */
router.put('/lists/:listTitle/items/:itemId', async (req, res) => {
    try {
        const { listTitle, itemId } = req.params;
        const result = await sharepointService.updateListItem(listTitle, parseInt(itemId), req.body);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Update list item error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/sharepoint/lists/:listTitle/items/:itemId
 * Deletes a list item
 */
router.delete('/lists/:listTitle/items/:itemId', async (req, res) => {
    try {
        const { listTitle, itemId } = req.params;
        await sharepointService.deleteListItem(listTitle, parseInt(itemId));
        res.json({ success: true });
    } catch (error) {
        console.error('Delete list item error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sharepoint/documents/upload
 * Uploads a document
 */
router.post('/documents/upload', async (req, res) => {
    try {
        const { libraryName, fileName, fileContent } = req.body;
        const fileBuffer = Buffer.from(fileContent, 'base64');
        const result = await sharepointService.uploadDocument(libraryName, fileName, fileBuffer);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sharepoint/documents/download
 * Downloads a document
 */
router.get('/documents/download', async (req, res) => {
    try {
        const { serverRelativeUrl } = req.query;
        const fileBuffer = await sharepointService.downloadDocument(serverRelativeUrl);
        res.json({ 
            success: true, 
            fileContent: fileBuffer.toString('base64') 
        });
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sharepoint/search
 * Searches SharePoint content
 */
router.post('/search', async (req, res) => {
    try {
        const { queryText, rowLimit, startRow, selectProperties } = req.body;
        const results = await sharepointService.search(queryText, { rowLimit, startRow, selectProperties });
        res.json({ success: true, results });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
