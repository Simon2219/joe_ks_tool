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

/**
 * Creates the main application window
 */
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'Customer Support Tool',
        icon: path.join(__dirname, '../../assets/icon.png'),
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

    // Load the main HTML file
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Show window when ready and maximize for better experience
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // Optionally maximize on start
        // mainWindow.maximize();
    });

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

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
