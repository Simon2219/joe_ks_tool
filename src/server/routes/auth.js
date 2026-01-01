/**
 * Authentication Routes
 * Handles login, logout, token refresh, and password changes
 */

const express = require('express');
const router = express.Router();

const { UserSystem, TokenSystem } = require('../database');
const JwtService = require('../services/jwtService');
const { authenticate, loginRateLimit } = require('../middleware/auth');

/**
 * POST /api/auth/login
 */
router.post('/login', loginRateLimit, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }

        const user = UserSystem.getByUsername(username);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        if (!user.is_active) {
            return res.status(401).json({ success: false, error: 'Account is deactivated' });
        }

        const isValid = await UserSystem.validatePassword(user, password);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        await UserSystem.update(user.id, { lastLogin: new Date().toISOString() });

        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;
        const tokens = JwtService.generateTokens(user, userAgent, ipAddress);
        const userData = JwtService.getUserForToken(user.id);

        res.json({ success: true, user: userData, ...tokens });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'An error occurred during login' });
    }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            JwtService.revokeToken(refreshToken);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: 'An error occurred during logout' });
    }
});

/**
 * POST /api/auth/logout-all
 */
router.post('/logout-all', authenticate, (req, res) => {
    try {
        const count = JwtService.revokeAllUserTokens(req.user.id);
        res.json({ success: true, message: `Logged out from ${count} device(s)` });
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({ success: false, error: 'An error occurred' });
    }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ success: false, error: 'Refresh token is required' });
        }

        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;
        const result = await JwtService.refreshTokens(refreshToken, userAgent, ipAddress);

        if (!result.success) {
            return res.status(401).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ success: false, error: 'An error occurred during token refresh' });
    }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, (req, res) => {
    res.json({ success: true, user: req.user });
});

/**
 * GET /api/auth/validate
 */
router.get('/validate', authenticate, (req, res) => {
    res.json({ valid: true, user: req.user });
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
        }

        const user = UserSystem.getByUsername(req.user.username);
        const isValid = await UserSystem.validatePassword(user, currentPassword);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        await UserSystem.update(user.id, { password: newPassword });
        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: 'An error occurred while changing password' });
    }
});

module.exports = router;
