/**
 * SharePoint Routes
 * API endpoints for Microsoft SharePoint integration
 */

const express = require('express');
const router = express.Router();

const sharepointService = require('../services/sharepointService');
const { authenticate, requirePermission } = require('../middleware/auth');

// All SharePoint routes require authentication and integration permission
router.use(authenticate);
router.use(requirePermission('integration_sharepoint'));

// POST /api/sharepoint/connect
router.post('/connect', async (req, res) => {
    try {
        const result = await sharepointService.connect(req.body);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('SharePoint connect error:', error);
        res.json({ success: false, error: error.message });
    }
});

// POST /api/sharepoint/disconnect
router.post('/disconnect', (req, res) => {
    try {
        sharepointService.disconnect();
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// GET /api/sharepoint/status
router.get('/status', (req, res) => {
    res.json({ success: true, ...sharepointService.getStatus() });
});

// GET /api/sharepoint/lists
router.get('/lists', async (req, res) => {
    try {
        const lists = await sharepointService.getLists();
        res.json({ success: true, lists });
    } catch (error) {
        console.error('Get lists error:', error);
        res.json({ success: false, error: error.message });
    }
});

// GET /api/sharepoint/lists/:listTitle/items
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
        res.json({ success: false, error: error.message });
    }
});

// POST /api/sharepoint/lists/:listTitle/items
router.post('/lists/:listTitle/items', async (req, res) => {
    try {
        const { listTitle } = req.params;
        const item = await sharepointService.createListItem(listTitle, req.body);
        res.json({ success: true, item });
    } catch (error) {
        console.error('Create list item error:', error);
        res.json({ success: false, error: error.message });
    }
});

// PUT /api/sharepoint/lists/:listTitle/items/:itemId
router.put('/lists/:listTitle/items/:itemId', async (req, res) => {
    try {
        const { listTitle, itemId } = req.params;
        const result = await sharepointService.updateListItem(listTitle, parseInt(itemId), req.body);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Update list item error:', error);
        res.json({ success: false, error: error.message });
    }
});

// DELETE /api/sharepoint/lists/:listTitle/items/:itemId
router.delete('/lists/:listTitle/items/:itemId', async (req, res) => {
    try {
        const { listTitle, itemId } = req.params;
        await sharepointService.deleteListItem(listTitle, parseInt(itemId));
        res.json({ success: true });
    } catch (error) {
        console.error('Delete list item error:', error);
        res.json({ success: false, error: error.message });
    }
});

// POST /api/sharepoint/documents/upload
router.post('/documents/upload', async (req, res) => {
    try {
        const { libraryName, fileName, fileContent } = req.body;
        const fileBuffer = Buffer.from(fileContent, 'base64');
        const result = await sharepointService.uploadDocument(libraryName, fileName, fileBuffer);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Upload document error:', error);
        res.json({ success: false, error: error.message });
    }
});

// GET /api/sharepoint/documents/download
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
        res.json({ success: false, error: error.message });
    }
});

// POST /api/sharepoint/search
router.post('/search', async (req, res) => {
    try {
        const { queryText, rowLimit, startRow, selectProperties } = req.body;
        const results = await sharepointService.search(queryText, { rowLimit, startRow, selectProperties });
        res.json({ success: true, results });
    } catch (error) {
        console.error('Search error:', error);
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;
