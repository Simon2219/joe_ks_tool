/**
 * Main Electron Process
 * Handles application lifecycle and window management
 */

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

// Import IPC handlers
const { registerAuthHandlers } = require('./ipc/authHandlers');
const { registerUserHandlers } = require('./ipc/userHandlers');
const { registerTicketHandlers } = require('./ipc/ticketHandlers');
const { registerQualityHandlers } = require('./ipc/qualityHandlers');
const { registerRoleHandlers } = require('./ipc/roleHandlers');
const { registerSettingsHandlers } = require('./ipc/settingsHandlers');

// Import API integration handlers
const { registerSharePointHandlers } = require('../api/sharepoint/sharepointHandlers');
const { registerJiraHandlers } = require('../api/jira/jiraHandlers');

// Import database initialization
const { initializeDatabase } = require('./database/dbInit');

let mainWindow = null;

// Get the correct base path (works both in dev and production)
function getBasePath() {
    // In development, app.getAppPath() returns the project root
    // __dirname is the directory of this file (src/main/)
    return path.join(__dirname, '..');
}

/**
 * Creates the main application window
 */
function createMainWindow() {
    const basePath = getBasePath();
    
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'Customer Support Tool',
        icon: path.join(basePath, '../assets/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false,
        backgroundColor: '#1a1a2e',
        // Native window frame for proper Windows look
        frame: true,
        // Enable Windows-style controls
        autoHideMenuBar: true
    });

    // Build the correct path to index.html
    const indexPath = path.join(basePath, 'renderer', 'index.html');
    console.log('Loading HTML from:', indexPath);
    
    // Load the main HTML file
    mainWindow.loadFile(indexPath).catch(err => {
        console.error('Failed to load index.html:', err);
        // Fallback: try alternative path
        const altPath = path.join(__dirname, '..', 'renderer', 'index.html');
        console.log('Trying alternative path:', altPath);
        mainWindow.loadFile(altPath);
    });

    // Show window when ready and maximize for better experience
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Page failed to load:', errorCode, errorDescription);
    });

    // Open DevTools in development to see errors (remove in production)
    // mainWindow.webContents.openDevTools();

    // Remove default menu for cleaner look (keeps native title bar)
    Menu.setApplicationMenu(null);
}

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        // Initialize database
        await initializeDatabase();
        
        // Register all IPC handlers
        registerAuthHandlers();
        registerUserHandlers();
        registerTicketHandlers();
        registerQualityHandlers();
        registerRoleHandlers();
        registerSettingsHandlers();
        
        // Register API integration handlers
        registerSharePointHandlers();
        registerJiraHandlers();
        
        // Create the main window
        createMainWindow();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        app.quit();
    }
}

// App ready event
app.whenReady().then(initializeApp);

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Re-create window on macOS when dock icon is clicked
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

module.exports = { mainWindow };
