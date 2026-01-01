/**
 * Electron Preload Script
 * Exposes safe APIs to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronBridge', {
    // Platform info
    platform: process.platform,
    
    // App info
    getVersion: () => ipcRenderer.invoke('get-version'),
    
    // Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    
    // Notifications
    showNotification: (title, body) => {
        ipcRenderer.send('show-notification', { title, body });
    }
});
