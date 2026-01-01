/**
 * Customer Support Tool - Express Server
 * Main entry point for the application
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load centralized configuration
const Config = require('./config/Config');

// Import services
const encryptionService = require('./src/server/services/encryptionService');

// Import database
const { initializeDatabase, shutdown: shutdownDatabase } = require('./src/server/database');

// Import API routes
const authRoutes = require('./src/server/routes/auth');
const userRoutes = require('./src/server/routes/users');
const ticketRoutes = require('./src/server/routes/tickets');
const qualityRoutes = require('./src/server/routes/quality');
const roleRoutes = require('./src/server/routes/roles');
const settingsRoutes = require('./src/server/routes/settings');
const sharepointRoutes = require('./src/server/routes/sharepoint');
const jiraRoutes = require('./src/server/routes/jira');
const adminRoutes = require('./src/server/routes/admin');

const app = express();
const PORT = Config.getPort();

// Trust proxy (for rate limiting behind reverse proxy)
if (Config.get('server.trustProxy')) {
    app.set('trust proxy', 1);
}

// CORS configuration
const corsOptions = {
    origin: Config.get('server.corsOrigin', '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Request logging
if (Config.get('logging.logRequests') && Config.isDevelopment()) {
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            if (!req.url.includes('/api/')) return;
            console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
        });
        next();
    });
}

// Serve static files from the renderer directory
app.use(express.static(path.join(__dirname, 'src/renderer')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sharepoint', sharepointRoutes);
app.use('/api/jira', jiraRoutes);
app.use('/api/admin', adminRoutes);

// Config endpoint (for frontend)
app.get('/api/config', (req, res) => {
    res.json({
        success: true,
        config: {
            app: Config.app,
            tickets: { slaDurations: Config.get('tickets.slaDurations') },
            quality: { passingScore: Config.get('quality.passingScore') }
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: Config.get('app.version')
    });
});

// Serve the main HTML file for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/renderer/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (Config.get('logging.logErrors')) {
        console.error('Server error:', err);
    }
    
    const message = Config.isProduction() ? 'Internal server error' : err.message;
    res.status(err.status || 500).json({ success: false, error: message });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Graceful shutdown handler
function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    shutdownDatabase();
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize and start server
async function startServer() {
    try {
        console.log('');
        console.log('============================================');
        console.log(`   ${Config.get('app.name')} - Starting...`);
        console.log('============================================');
        console.log('');

        // Initialize encryption service
        encryptionService.initialize();

        // Initialize database
        await initializeDatabase();

        // Start the server
        const server = app.listen(PORT, () => {
            console.log('');
            console.log('============================================');
            console.log(`   ${Config.get('app.name')} is running!`);
            console.log('============================================');
            console.log('');
            console.log(`   Open in your browser:`);
            console.log(`   http://localhost:${PORT}`);
            console.log('');
            console.log('   Default login:');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('');
            console.log('   Press Ctrl+C to stop the server');
            console.log('============================================');
            console.log('');
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use`);
                process.exit(1);
            }
            throw error;
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Export for testing
module.exports = app;
