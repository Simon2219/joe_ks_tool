/**
 * Electron Main Process
 * Handles window management, system tray, and application lifecycle
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, shell, dialog } = require('electron');
const path = require('path');

// Keep references to prevent garbage collection
let mainWindow = null;
let tray = null;
let serverProcess = null;

// Configuration
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Creates the main application window
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        title: 'Customer Support Tool',
        icon: getAppIcon(),
        backgroundColor: '#1a1a2e',
        show: false, // Don't show until ready
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        }
    });

    // Load the app
    mainWindow.loadURL(`http://localhost:${PORT}`);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Handle window close - minimize to tray instead
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            
            // Show notification on first minimize
            if (tray && !app.minimizedBefore) {
                tray.displayBalloon({
                    title: 'Customer Support Tool',
                    content: 'Application is still running in the system tray.',
                    iconType: 'info'
                });
                app.minimizedBefore = true;
            }
        }
        return false;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Handle navigation (prevent going to external sites)
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith(`http://localhost:${PORT}`)) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });
}

/**
 * Gets the application icon
 */
function getAppIcon() {
    // In production, icons would be in resources folder
    // For now, create a simple icon
    const iconPath = path.join(__dirname, 'icon.png');
    
    try {
        return nativeImage.createFromPath(iconPath);
    } catch {
        // Return empty icon if file doesn't exist
        return nativeImage.createEmpty();
    }
}

/**
 * Creates the system tray
 */
function createTray() {
    const icon = getAppIcon();
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open Customer Support Tool',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Dashboard',
            click: () => {
                showAndNavigate('dashboard');
            }
        },
        {
            label: 'Tickets',
            click: () => {
                showAndNavigate('tickets');
            }
        },
        {
            label: 'Users',
            click: () => {
                showAndNavigate('users');
            }
        },
        { type: 'separator' },
        {
            label: 'Settings',
            click: () => {
                showAndNavigate('settings');
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Customer Support Tool');
    tray.setContextMenu(contextMenu);

    // Double-click to show window
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

/**
 * Shows the window and navigates to a view
 */
function showAndNavigate(view) {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.executeJavaScript(`
            if (window.App && window.App.navigateTo) {
                window.App.navigateTo('${view}');
            }
        `);
    }
}

/**
 * Starts the Express server
 */
async function startServer() {
    return new Promise((resolve, reject) => {
        console.log('Starting server...');
        
        // In packaged app, the server runs in the same process
        // For development, we can run it separately or together
        try {
            // Set environment variables
            process.env.NODE_ENV = isDev ? 'development' : 'production';
            
            // Import and start the server
            const server = require('../server');
            
            // Wait a moment for server to start
            setTimeout(() => {
                console.log('Server started successfully');
                resolve();
            }, 1000);
        } catch (error) {
            console.error('Failed to start server:', error);
            reject(error);
        }
    });
}

/**
 * Creates the application menu
 */
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Refresh',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.reload();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.isQuitting = true;
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Dashboard',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => showAndNavigate('dashboard')
                },
                {
                    label: 'Tickets',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => showAndNavigate('tickets')
                },
                {
                    label: 'Users',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => showAndNavigate('users')
                },
                {
                    label: 'Quality',
                    accelerator: 'CmdOrCtrl+4',
                    click: () => showAndNavigate('quality')
                },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Customer Support Tool',
                            message: 'Customer Support Tool',
                            detail: `Version: ${require('../package.json').version}\n\nA comprehensive customer support application.`
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Developer Tools',
                    accelerator: 'CmdOrCtrl+Shift+I',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.toggleDevTools();
                        }
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * Application ready handler
 */
app.whenReady().then(async () => {
    console.log('Electron app starting...');

    try {
        // Start the Express server first
        await startServer();

        // Create window and tray
        createWindow();
        createTray();
        createMenu();

        // macOS: Re-create window when dock icon is clicked
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            } else if (mainWindow) {
                mainWindow.show();
            }
        });
    } catch (error) {
        console.error('Failed to start application:', error);
        dialog.showErrorBox('Startup Error', `Failed to start the application: ${error.message}`);
        app.quit();
    }
});

/**
 * All windows closed handler
 */
app.on('window-all-closed', () => {
    // On macOS, apps stay open until explicitly quit
    if (process.platform !== 'darwin') {
        // Don't quit - we have a system tray
    }
});

/**
 * Before quit handler
 */
app.on('before-quit', () => {
    app.isQuitting = true;
});

/**
 * Quit handler
 */
app.on('quit', () => {
    console.log('Application quitting...');
    
    // Cleanup
    if (tray) {
        tray.destroy();
    }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Focus the existing window
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
        }
    });
}
