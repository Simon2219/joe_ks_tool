/**
 * Customer Support Tool - Express Server
 * A web-based application server that replaces Electron
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import API routes
const authRoutes = require('./src/server/routes/auth');
const userRoutes = require('./src/server/routes/users');
const ticketRoutes = require('./src/server/routes/tickets');
const qualityRoutes = require('./src/server/routes/quality');
const roleRoutes = require('./src/server/routes/roles');
const settingsRoutes = require('./src/server/routes/settings');
const sharepointRoutes = require('./src/server/routes/sharepoint');
const jiraRoutes = require('./src/server/routes/jira');

// Import database initialization
const { initializeDatabase } = require('./src/server/database/dbInit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/renderer/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Initialize and start server
async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();
        console.log('Database initialized');

        // Start the server
        app.listen(PORT, () => {
            console.log('');
            console.log('============================================');
            console.log('   Customer Support Tool is running!');
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
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
