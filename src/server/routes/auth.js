/**
 * Authentication Routes
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const { UsersDB } = require('../database/dbService');
const { createSession, getSession, deleteSession, sanitizeUser, authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.json({ success: false, error: 'Username and password are required' });
        }

        const user = UsersDB.getByUsername(username.toLowerCase());
        if (!user) {
            return res.json({ success: false, error: 'Invalid username or password' });
        }

        if (!user.isActive) {
            return res.json({ success: false, error: 'Account is deactivated' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.json({ success: false, error: 'Invalid username or password' });
        }

        // Update last login
        UsersDB.update(user.id, { lastLogin: new Date().toISOString() });

        // Create session
        const session = createSession(user);

        res.json({
            success: true,
            user: session.user,
            token: session.token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, error: 'An error occurred during login' });
    }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
    try {
        const token = req.headers.authorization?.substring(7);
        if (token) {
            deleteSession(token);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.json({ success: false, error: 'An error occurred during logout' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    res.json({ success: true, user: req.user });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.json({ success: false, error: 'Current and new passwords are required' });
        }

        if (newPassword.length < 8) {
            return res.json({ success: false, error: 'New password must be at least 8 characters' });
        }

        const user = UsersDB.getById(req.user.id);
        const isValid = await bcrypt.compare(currentPassword, user.password);

        if (!isValid) {
            return res.json({ success: false, error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        UsersDB.update(user.id, { password: hashedPassword });

        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.json({ success: false, error: 'An error occurred while changing password' });
    }
});

// GET /api/auth/validate
router.get('/validate', authenticate, (req, res) => {
    res.json({ valid: true, user: req.user });
});

module.exports = router;
