/**
 * SharePoint IPC Handlers
 * Bridges the SharePoint service with the Electron IPC system
 */

const { ipcMain } = require('electron');
const { sharepointService } = require('./sharepointService');
const { checkPermission } = require('../../main/ipc/authHandlers');

/**
 * Registers SharePoint IPC handlers
 */
function registerSharePointHandlers() {
    // Connect to SharePoint
    ipcMain.handle('sharepoint:connect', async (event, config) => {
        try {
            if (!checkPermission('integration_sharepoint')) {
                return { success: false, error: 'Permission denied' };
            }
            
            if (!config.siteUrl || !config.clientId || !config.clientSecret) {
                return { success: false, error: 'Missing required configuration' };
            }
            
            const result = await sharepointService.connect(config);
            return { success: true, ...result };
        } catch (error) {
            console.error('SharePoint connect error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Disconnect from SharePoint
    ipcMain.handle('sharepoint:disconnect', async () => {
        try {
            const result = sharepointService.disconnect();
            return { success: true, ...result };
        } catch (error) {
            console.error('SharePoint disconnect error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Get connection status
    ipcMain.handle('sharepoint:getStatus', async () => {
        try {
            const status = sharepointService.getStatus();
            return { success: true, ...status };
        } catch (error) {
            console.error('SharePoint status error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Get lists
    ipcMain.handle('sharepoint:getLists', async () => {
        try {
            if (!checkPermission('integration_sharepoint')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const lists = await sharepointService.getLists();
            return { success: true, lists };
        } catch (error) {
            console.error('SharePoint get lists error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Get list items
    ipcMain.handle('sharepoint:getListItems', async (event, listName, options) => {
        try {
            if (!checkPermission('integration_sharepoint')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const items = await sharepointService.getListItems(listName, options);
            return { success: true, items };
        } catch (error) {
            console.error('SharePoint get list items error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Create list item
    ipcMain.handle('sharepoint:createListItem', async (event, listName, data) => {
        try {
            if (!checkPermission('integration_sharepoint')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await sharepointService.createListItem(listName, data);
            return { success: true, ...result };
        } catch (error) {
            console.error('SharePoint create list item error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Update list item
    ipcMain.handle('sharepoint:updateListItem', async (event, listName, itemId, data) => {
        try {
            if (!checkPermission('integration_sharepoint')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await sharepointService.updateListItem(listName, itemId, data);
            return { success: true, ...result };
        } catch (error) {
            console.error('SharePoint update list item error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Delete list item
    ipcMain.handle('sharepoint:deleteListItem', async (event, listName, itemId) => {
        try {
            if (!checkPermission('integration_sharepoint')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await sharepointService.deleteListItem(listName, itemId);
            return { success: true, ...result };
        } catch (error) {
            console.error('SharePoint delete list item error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Upload document
    ipcMain.handle('sharepoint:uploadDocument', async (event, libraryName, file) => {
        try {
            if (!checkPermission('integration_sharepoint')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await sharepointService.uploadDocument(
                libraryName, 
                file.name, 
                Buffer.from(file.content)
            );
            return { success: true, ...result };
        } catch (error) {
            console.error('SharePoint upload document error:', error);
            return { success: false, error: error.message };
        }
    });
    
    // Download document
    ipcMain.handle('sharepoint:downloadDocument', async (event, libraryName, fileName) => {
        try {
            if (!checkPermission('integration_sharepoint')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const result = await sharepointService.downloadDocument(libraryName, fileName);
            return { 
                success: true, 
                fileName: result.fileName,
                content: result.content.toString('base64'),
                contentType: result.contentType
            };
        } catch (error) {
            console.error('SharePoint download document error:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = { registerSharePointHandlers };
