/**
 * Settings Routes
 */

const express = require('express');
const router = express.Router();

const { SettingsDB } = require('../database/dbService');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/settings
router.get('/', authenticate, requirePermission('settings_view'), (req, res) => {
    try {
        const settings = SettingsDB.getAll();
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.json({ success: false, error: 'Failed to get settings' });
    }
});

// GET /api/settings/:key
router.get('/:key', authenticate, requirePermission('settings_view'), (req, res) => {
    try {
        const value = SettingsDB.get(req.params.key);
        res.json({ success: true, value });
    } catch (error) {
        console.error('Get setting error:', error);
        res.json({ success: false, error: 'Failed to get setting' });
    }
});

// PUT /api/settings/:key
router.put('/:key', authenticate, requirePermission('settings_edit'), (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        SettingsDB.set(key, value);
        res.json({ success: true });
    } catch (error) {
        console.error('Set setting error:', error);
        res.json({ success: false, error: 'Failed to update setting' });
    }
});

module.exports = router;
