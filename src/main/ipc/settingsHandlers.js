/**
 * Settings IPC Handlers
 * Handles application settings management
 */

const { ipcMain } = require('electron');
const { SettingsDB } = require('../database/dbService');
const { checkPermission } = require('./authHandlers');

/**
 * Gets default settings structure
 */
function getDefaultSettings() {
    return {
        general: {
            companyName: 'Customer Support Agency',
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
            timeFormat: '24h'
        },
        tickets: {
            defaultPriority: 'medium',
            autoAssign: false,
            slaEnabled: true,
            slaLow: 72,
            slaMedium: 24,
            slaHigh: 8,
            slaCritical: 2
        },
        quality: {
            passingScore: 80,
            requireComments: true,
            allowSelfEvaluation: false
        },
        notifications: {
            emailEnabled: false,
            desktopEnabled: true
        },
        integrations: {
            sharepoint: {
                enabled: false,
                siteUrl: '',
                clientId: '',
                clientSecret: ''
            },
            jira: {
                enabled: false,
                baseUrl: '',
                email: '',
                apiToken: ''
            }
        }
    };
}

/**
 * Registers settings IPC handlers
 */
function registerSettingsHandlers() {
    // Get a specific setting
    ipcMain.handle('settings:get', async (event, key) => {
        try {
            if (!checkPermission('settings_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const value = SettingsDB.get(key);
            return { success: true, value };
        } catch (error) {
            console.error('Get setting error:', error);
            return { success: false, error: 'Failed to get setting' };
        }
    });
    
    // Set a specific setting
    ipcMain.handle('settings:set', async (event, key, value) => {
        try {
            if (!checkPermission('settings_edit')) {
                return { success: false, error: 'Permission denied' };
            }
            
            // Validate key format
            if (!key || typeof key !== 'string') {
                return { success: false, error: 'Invalid setting key' };
            }
            
            SettingsDB.set(key, value);
            return { success: true };
        } catch (error) {
            console.error('Set setting error:', error);
            return { success: false, error: 'Failed to update setting' };
        }
    });
    
    // Get all settings
    ipcMain.handle('settings:getAll', async () => {
        try {
            if (!checkPermission('settings_view')) {
                return { success: false, error: 'Permission denied' };
            }
            
            const settings = SettingsDB.getAll();
            return { success: true, settings };
        } catch (error) {
            console.error('Get all settings error:', error);
            return { success: false, error: 'Failed to get settings' };
        }
    });
    
    // Reset to default settings
    ipcMain.handle('settings:resetToDefault', async () => {
        try {
            if (!checkPermission('admin_access')) {
                return { success: false, error: 'Admin access required' };
            }
            
            const defaults = getDefaultSettings();
            // This would need to be implemented in SettingsDB
            // For now, we'll set each section
            Object.keys(defaults).forEach(section => {
                SettingsDB.set(section, defaults[section]);
            });
            
            return { success: true, settings: defaults };
        } catch (error) {
            console.error('Reset settings error:', error);
            return { success: false, error: 'Failed to reset settings' };
        }
    });
    
    // Export settings
    ipcMain.handle('settings:export', async () => {
        try {
            if (!checkPermission('admin_access')) {
                return { success: false, error: 'Admin access required' };
            }
            
            const settings = SettingsDB.getAll();
            
            // Remove sensitive data before export
            const exportData = JSON.parse(JSON.stringify(settings));
            if (exportData.integrations) {
                if (exportData.integrations.sharepoint) {
                    exportData.integrations.sharepoint.clientSecret = '';
                }
                if (exportData.integrations.jira) {
                    exportData.integrations.jira.apiToken = '';
                }
            }
            
            return { 
                success: true, 
                data: JSON.stringify(exportData, null, 2) 
            };
        } catch (error) {
            console.error('Export settings error:', error);
            return { success: false, error: 'Failed to export settings' };
        }
    });
    
    // Import settings
    ipcMain.handle('settings:import', async (event, data) => {
        try {
            if (!checkPermission('admin_access')) {
                return { success: false, error: 'Admin access required' };
            }
            
            let importedSettings;
            try {
                importedSettings = JSON.parse(data);
            } catch {
                return { success: false, error: 'Invalid JSON format' };
            }
            
            // Validate structure
            const requiredSections = ['general', 'tickets', 'quality'];
            for (const section of requiredSections) {
                if (!importedSettings[section]) {
                    return { success: false, error: `Missing required section: ${section}` };
                }
            }
            
            // Preserve sensitive data from current settings
            const currentSettings = SettingsDB.getAll();
            if (importedSettings.integrations) {
                if (importedSettings.integrations.sharepoint && !importedSettings.integrations.sharepoint.clientSecret) {
                    importedSettings.integrations.sharepoint.clientSecret = 
                        currentSettings.integrations?.sharepoint?.clientSecret || '';
                }
                if (importedSettings.integrations.jira && !importedSettings.integrations.jira.apiToken) {
                    importedSettings.integrations.jira.apiToken = 
                        currentSettings.integrations?.jira?.apiToken || '';
                }
            }
            
            // Update all settings
            Object.keys(importedSettings).forEach(section => {
                SettingsDB.set(section, importedSettings[section]);
            });
            
            return { success: true };
        } catch (error) {
            console.error('Import settings error:', error);
            return { success: false, error: 'Failed to import settings' };
        }
    });
}

module.exports = { registerSettingsHandlers };
